const { ActionRowBuilder, ModalBuilder, TextInputBuilder, TextInputStyle, EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const { getGuild, save } = require('../database');
const { embed } = require('../utils/helpers');

module.exports = {
  name: 'interactionCreate',
  async execute(i, client) {
    // ── Self-role toggle button (`rr:ROLE_ID`) ──
    if (i.isButton() && i.customId.startsWith('rr:')) {
      if (!i.guild) return i.reply({ content: '❌ Self-roles only work in a server.', ephemeral: true });
      const roleId = i.customId.slice(3);
      const role = i.guild.roles.cache.get(roleId);
      if (!role) return i.reply({ content: '❌ That role no longer exists.', ephemeral: true });
      try {
        const member = await i.guild.members.fetch(i.user.id);
        if (member.roles.cache.has(roleId)) {
          await member.roles.remove(role);
          return i.reply({ content: `➖ Removed **${role.name}** from you.`, ephemeral: true });
        }
        await member.roles.add(role);
        return i.reply({ content: `➕ Gave you **${role.name}**.`, ephemeral: true });
      } catch {
        return i.reply({ content: '❌ I couldn\'t change that role (check my role position).', ephemeral: true });
      }
    }

    // ── Giveaway enter button (`gw_enter_ID`) ──
    if (i.isButton() && i.customId.startsWith('gw_enter_')) {
      if (!i.guild) return i.reply({ content: '❌ Giveaways only work in a server.', ephemeral: true });
      const id = i.customId.slice('gw_enter_'.length);
      const cfg = getGuild(i.guildId);
      const gw = (cfg.giveaways || []).find(g => g.id === id);
      if (!gw || gw.ended || Date.now() > gw.endsAt) {
        return i.reply({ content: '❌ This giveaway has ended.', ephemeral: true });
      }
      gw.entries = gw.entries || [];
      if (gw.entries.includes(i.user.id)) {
        gw.entries = gw.entries.filter(e => e !== i.user.id);
        save();
        return i.reply({ content: '🎟️ Removed from the giveaway.', ephemeral: true });
      }
      gw.entries.push(i.user.id);
      save();
      return i.reply({ content: `🎉 You're in! Entries: **${new Set(gw.entries).size}**`, ephemeral: true });
    }

    // ── Verify button ──
    if (i.isButton() && i.customId === 'verify_me') {
      if (!i.guild) return i.reply({ content: '❌ Verify only works in a server.', ephemeral: true });
      const cfg = getGuild(i.guildId);
      cfg.verify = cfg.verify || { role: null, minAge: 7, verified: {} };
      if (!cfg.verify.role) return i.reply({ content: '❌ Verification not setup. Ask staff to run `/verify setup`.', ephemeral: true });
      if (cfg.verify.verified?.[i.user.id]) return i.reply({ content: '✅ You are already verified.', ephemeral: true });
      const { checkAlts } = require('../commands/verify');
      const rep = await checkAlts(i.guild, i.user, cfg);
      const member = await i.guild.members.fetch(i.user.id).catch(() => null);
      if (rep.risk === 'high') {
        // Flag, don't auto-role — staff reviews
        if (cfg.verify.log) {
          const lc = await i.guild.channels.fetch(cfg.verify.log).catch(() => null);
          if (lc) lc.send({ embeds: [embed({ title: '🚨 Verify BLOCKED (suspected alt)', description: `${i.user} \`${i.user.id}\`\n\n${rep.text}`, color: 0xED4245 })] });
        }
        return i.reply({ content: `🚨 Verification flagged for manual review.\n${rep.text}`, ephemeral: true });
      }
      try { await member.roles.add(cfg.verify.role); } catch { return i.reply({ content: '❌ I cannot give the role (check my role position).', ephemeral: true }); }
      cfg.verify.verified[i.user.id] = { at: Date.now(), createdAt: i.user.createdTimestamp, joinedAt: member?.joinedTimestamp || Date.now() };
      save();
      if (rep.risk === 'medium' && cfg.verify.log) {
        const lc = await i.guild.channels.fetch(cfg.verify.log).catch(() => null);
        if (lc) lc.send({ embeds: [embed({ title: '⚠️ Verified with warning', description: `${i.user}\n\n${rep.text}`, color: 0xFEE75C })] });
      }
      return i.reply({ content: `✅ Verified!${rep.risk === 'medium' ? '\n⚠️ Note: ' + rep.flags.join(' / ') : ''}`, ephemeral: true });
    }

    // ── Ticket open → Q&A modal ──
    if (i.isButton() && i.customId === 'ticket_open') {
      const cfg = getGuild(i.guildId);
      if (!cfg.tickets.enabled) return i.reply({ content: '❌ Tickets not setup.', ephemeral: true });
      const existing = i.guild.channels.cache.find(c => c.name === `ticket-${i.user.username.toLowerCase().replace(/[^a-z0-9]/g, '')}`);
      if (existing) return i.reply({ content: `❌ You already have ${existing}`, ephemeral: true });
      const modal = new ModalBuilder().setCustomId('ticket_modal').setTitle('Open a ticket');
      cfg.tickets.questions.slice(0, 5).forEach((q, n) => {
        modal.addComponents(new ActionRowBuilder().addComponents(
          new TextInputBuilder().setCustomId(`q${n}`).setLabel(q.slice(0, 45)).setStyle(TextInputStyle.Paragraph).setRequired(n === 0).setMaxLength(1000)
        ));
      });
      // pad modal to at least 1 input
      if (!cfg.tickets.questions.length) modal.addComponents(new ActionRowBuilder().addComponents(
        new TextInputBuilder().setCustomId('q0').setLabel('Describe your issue').setStyle(TextInputStyle.Paragraph).setRequired(true)
      ));
      return i.showModal(modal);
    }
    if (i.isModalSubmit() && i.customId === 'ticket_modal') {
      const cfg = getGuild(i.guildId);
      const answers = cfg.tickets.questions.map((q, n) => `**${n + 1}. ${q}**\n${i.fields.getTextInputValue(`q${n}`) || '*skipped*'}`).join('\n\n');
      const ch = await i.guild.channels.create({
        name: `ticket-${i.user.username.toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 10)}`,
        parent: cfg.tickets.category,
        permissionOverwrites: [
          { id: i.guild.id, deny: ['ViewChannel'] },
          { id: i.user.id, allow: ['ViewChannel', 'SendMessages'] },
          ...(cfg.tickets.staffRole ? [{ id: cfg.tickets.staffRole, allow: ['ViewChannel', 'SendMessages'] }] : []),
        ],
      });
      await ch.send({ content: `${i.user} ${cfg.tickets.staffRole ? `<@&${cfg.tickets.staffRole}>` : ''}`, embeds: [embed({ title: `🎫 Ticket — ${i.user.tag}`, description: answers.slice(0, 4000) || 'No answers.' })] });
      return i.reply({ content: `✅ Ticket created: ${ch}`, ephemeral: true });
    }

    // ── Event buttons ──
    if (i.isButton() && (i.customId.startsWith('event_join_') || i.customId.startsWith('event_leave_') || i.customId.startsWith('event_list_'))) {
      const cfg = getGuild(i.guildId);
      const [,, evId] = [null, null, null]; // placeholder
      const id = i.customId.replace('event_join_', '').replace('event_leave_', '').replace('event_list_', '');
      const ev = cfg.events.find(e => e.id === id);
      if (!ev) return i.reply({ content: '❌ Event not found.', ephemeral: true });
      if (i.customId.startsWith('event_join_')) {
        if (ev.signups.includes(i.user.id)) return i.reply({ content: '✅ Already signed up.', ephemeral: true });
        if (ev.slots && ev.signups.length >= ev.slots) return i.reply({ content: '❌ Event is full.', ephemeral: true });
        ev.signups.push(i.user.id); save();
        // update count in original message
        const e = EmbedBuilder.from(i.message.embeds[0]).setDescription(
          `${ev.description}\n\n🕒 **When:** ${ev.time}\n👥 **Slots:** ${ev.slots || 'Unlimited'}\n✅ **Signed up:** ${ev.signups.length}`
        );
        await i.message.edit({ embeds: [e] }).catch(() => {});
        return i.reply({ content: `✅ Signed up for **${ev.title}**!`, ephemeral: true });
      }
      if (i.customId.startsWith('event_leave_')) {
        ev.signups = ev.signups.filter(x => x !== i.user.id); save();
        const e = EmbedBuilder.from(i.message.embeds[0]).setDescription(
          `${ev.description}\n\n🕒 **When:** ${ev.time}\n👥 **Slots:** ${ev.slots || 'Unlimited'}\n✅ **Signed up:** ${ev.signups.length}`
        );
        await i.message.edit({ embeds: [e] }).catch(() => {});
        return i.reply({ content: `❌ Removed from **${ev.title}**.`, ephemeral: true });
      }
      if (i.customId.startsWith('event_list_')) {
        return i.reply({ content: ev.signups.length ? ev.signups.map(s => `<@${s}>`).join('\n') : 'Nobody signed up yet.', ephemeral: true });
      }
    }
  }
};
