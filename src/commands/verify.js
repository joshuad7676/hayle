const { SlashCommandBuilder, PermissionFlagsBits, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { getGuild, save } = require('../database');
const { embed } = require('../utils/helpers');
const config = require('../config');

const MIN_AGE_DAYS_DEFAULT = 7;

module.exports = {
  data: new SlashCommandBuilder()
    .setName('verify')
    .setDescription('Verification with alt / Double-Counter style checks')
    .addSubcommand(s => s.setName('setup').setDescription('Setup verification')
      .addRoleOption(o => o.setName('role').setDescription('Verified role to give').setRequired(true))
      .addChannelOption(o => o.setName('log').setDescription('Alt-flag log channel'))
      .addIntegerOption(o => o.setName('minage').setDescription('Min account age in days (default 7)')))
    .addSubcommand(s => s.setName('panel').setDescription('Post verify embed + button')
      .addChannelOption(o => o.setName('channel').setDescription('Channel to post in'))
      .addStringOption(o => o.setName('title').setDescription('Embed title'))
      .addStringOption(o => o.setName('description').setDescription('Embed text')))
    .addSubcommand(s => s.setName('check').setDescription('Check a user for alts')
      .addUserOption(o => o.setName('user').setDescription('User').setRequired(true)))
    .addSubcommand(s => s.setName('unverify').setDescription('Remove verified status')
      .addUserOption(o => o.setName('user').setDescription('User').setRequired(true)))
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
    .setDMPermission(false),
  async execute(i) {
    const cfg = getGuild(i.guildId);
    cfg.verify = cfg.verify || { role: null, log: null, minAge: MIN_AGE_DAYS_DEFAULT, verified: {} };
    const sub = i.options.getSubcommand();

    if (sub === 'setup') {
      cfg.verify.role = i.options.getRole('role').id;
      if (i.options.getChannel('log')) cfg.verify.log = i.options.getChannel('log').id;
      if (i.options.getInteger('minage') !== null) cfg.verify.minAge = i.options.getInteger('minage');
      save();
      return i.reply({ embeds: [embed({ title: '✅ Verify setup', description: `Role: <@&${cfg.verify.role}>\nMin account age: **${cfg.verify.minAge} days**\nLog: ${cfg.verify.log ? `<#${cfg.verify.log}>` : 'none'}\n\nUse \`/verify panel\` to post the button.` })] });
    }

    if (sub === 'panel') {
      const ch = i.options.getChannel('channel') || i.channel;
      const link = `${config.dashboardUrl}/verify.html?guild=${i.guildId}`;
      const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId('verify_me').setLabel('Quick Verify').setStyle(ButtonStyle.Success).setEmoji('✅'),
        new ButtonBuilder().setLabel('Full Verify (alt-proof)').setStyle(ButtonStyle.Link).setURL(link).setEmoji('🔗'),
      );
      await ch.send({ embeds: [embed({
        title: i.options.getString('title') || '✅ Verification',
        description: (i.options.getString('description') || 'Click **Quick Verify** for instant check.\nClick **Full Verify** to link your browser (IP + device fingerprint — catches alts like Double Counter).') + `\n\n🔒 Min account age: **${cfg.verify.minAge ?? 7} days**\n🔗 ${link}`,
      })], components: [row] });
      return i.reply({ content: `✅ Panel posted in ${ch}`, ephemeral: true });
    }

    if (sub === 'check') {
      const u = i.options.getUser('user');
      const rep = await checkAlts(i.guild, u, cfg);
      return i.reply({ embeds: [embed({ title: `🔍 ${u.tag}`, description: rep.text, color: rep.risk === 'high' ? 0xED4245 : rep.risk === 'medium' ? 0xFEE75C : 0x57F287 })], ephemeral: true });
    }

    if (sub === 'unverify') {
      const u = i.options.getUser('user');
      delete cfg.verify.verified[u.id]; save();
      const m = await i.guild.members.fetch(u.id).catch(() => null);
      if (m && cfg.verify.role) await m.roles.remove(cfg.verify.role).catch(() => {});
      return i.reply({ content: `✅ ${u.tag} unverified.`, ephemeral: true });
    }
  }
};

// Shared alt-check used by button + /verify check — src/events/interactionCreate.js requires this file
async function checkAlts(guild, user, cfg) {
  const v = cfg.verify || { minAge: 7, verified: {}, records: {} };
  const ageMs = Date.now() - user.createdTimestamp;
  const ageDays = Math.floor(ageMs / 86400000);
  const flags = [];
  if (v.verified?.[user.id]) flags.push('⚠️ Already verified (possible re-verify / alt hop)');
  if (ageDays < (v.minAge ?? 7)) flags.push(`🆕 Account age only **${ageDays}d** (min ${v.minAge}d) — likely alt`);
  if (!user.avatar) flags.push('🖼️ No avatar (default) — common on alts');
  if (user.discriminator === '0' && ageDays < 30) flags.push('📛 New username-system account under 30d');
  // ── Linked-browser records (IP + device fingerprint from /verify.html) ──
  const records = v.records || {};
  const mine = records[user.id];
  if (mine) {
    const sameIp = Object.entries(records).filter(([id, r]) => id !== user.id && r.ip && r.ip === mine.ip);
    if (sameIp.length) flags.push(`🌐 Same IP as ${sameIp.length} other account(s): ${sameIp.slice(0, 5).map(([id]) => `<@${id}>`).join(', ')}`);
    const sameFp = Object.entries(records).filter(([id, r]) => id !== user.id && r.fp && r.fp === mine.fp);
    if (sameFp.length) flags.push(`💻 Same device as ${sameFp.length} other account(s): ${sameFp.slice(0, 5).map(([id]) => `<@${id}>`).join(', ')} — **confirmed alt**`);
  }
  // Same-created-day cluster: other verified users created within 48h window
  const verified = v.verified || {};
  const cluster = Object.entries(verified).filter(([id, rec]) =>
    id !== user.id && Math.abs((rec.createdAt || 0) - user.createdTimestamp) < 48 * 3600000
  );
  if (cluster.length) flags.push(`🔗 Created within 48h of ${cluster.length} other verified user(s): ${cluster.slice(0, 5).map(([id]) => `<@${id}>`).join(', ')}`);
  // Rapid-join cluster
  let joinCluster = [];
  try {
    const member = await guild.members.fetch(user.id).catch(() => null);
    if (member?.joinedTimestamp) {
      joinCluster = Object.entries(verified).filter(([id, rec]) =>
        id !== user.id && rec.joinedAt && Math.abs(rec.joinedAt - member.joinedTimestamp) < 3600000
      );
      if (joinCluster.length >= 2) flags.push(`⏱️ Joined within 1h of ${joinCluster.length} other(s) — raid/alt pattern`);
    }
  } catch {}
  const risk = flags.length >= 2 ? 'high' : flags.length === 1 ? 'medium' : 'low';
  const text = `**Account created:** <t:${Math.floor(user.createdTimestamp / 1000)}:R> (${ageDays}d old)\n**ID:** \`${user.id}\`\n\n` +
    (flags.length ? `**Flags (${flags.length}):**\n${flags.join('\n')}` : '✅ No alt indicators found.');
  return { flags, risk, ageDays, text };
}

module.exports.checkAlts = checkAlts;
