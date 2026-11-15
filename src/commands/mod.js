const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { embed } = require('../utils/helpers');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('mod')
    .setDescription('Kick / ban / timeout members')
    .addSubcommand(s => s.setName('kick').setDescription('Kick a member')
      .addUserOption(o => o.setName('user').setDescription('User').setRequired(true))
      .addStringOption(o => o.setName('reason').setDescription('Reason')))
    .addSubcommand(s => s.setName('ban').setDescription('Ban a member')
      .addUserOption(o => o.setName('user').setDescription('User').setRequired(true))
      .addStringOption(o => o.setName('reason').setDescription('Reason'))
      .addIntegerOption(o => o.setName('days').setDescription('Delete messages from last X days (0-7)')))
    .addSubcommand(s => s.setName('unban').setDescription('Unban by ID')
      .addStringOption(o => o.setName('userid').setDescription('User ID').setRequired(true)))
    .addSubcommand(s => s.setName('timeout').setDescription('Timeout a member')
      .addUserOption(o => o.setName('user').setDescription('User').setRequired(true))
      .addIntegerOption(o => o.setName('minutes').setDescription('Minutes').setRequired(true))
      .addStringOption(o => o.setName('reason').setDescription('Reason')))
    .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers)
    .setDMPermission(false),
  async execute(i) {
    const sub = i.options.getSubcommand();
    const reason = i.options.getString('reason') || `By ${i.user.tag}`;
    if (sub === 'kick') {
      const m = await i.guild.members.fetch(i.options.getUser('user').id).catch(() => null);
      if (!m) return i.reply({ content: '❌ Member not found.', ephemeral: true });
      if (!m.kickable) return i.reply({ content: '❌ I cannot kick them (role hierarchy?).', ephemeral: true });
      await m.kick(reason);
      await logMod(i, `👢 Kick`, `${m.user.tag} — ${reason}`);
      return i.reply({ embeds: [embed({ title: '👢 Kicked', description: `${m.user.tag}\nReason: ${reason}` })] });
    }
    if (sub === 'ban') {
      const u = i.options.getUser('user');
      const days = Math.min(Math.max(i.options.getInteger('days') || 0, 0), 7);
      if (!i.guild.members.me.permissions.has(PermissionFlagsBits.BanMembers)) return i.reply({ content: '❌ Missing BanMembers permission.', ephemeral: true });
      await i.guild.members.ban(u.id, { reason, deleteMessageSeconds: days * 86400 }).catch(e => { throw new Error('Ban failed: ' + e.message); });
      await logMod(i, `🔨 Ban`, `${u.tag} — ${reason}`);
      return i.reply({ embeds: [embed({ title: '🔨 Banned', description: `${u.tag}\nReason: ${reason}`, color: 0xED4245 })] });
    }
    if (sub === 'unban') {
      await i.guild.members.unban(i.options.getString('userid'));
      return i.reply({ embeds: [embed({ title: '✅ Unbanned' })] });
    }
    if (sub === 'timeout') {
      const m = await i.guild.members.fetch(i.options.getUser('user').id);
      await m.timeout(i.options.getInteger('minutes') * 60000, reason);
      return i.reply({ embeds: [embed({ title: '⏱️ Timed out', description: `${m} for ${i.options.getInteger('minutes')}m\n${reason}` })] });
    }
  }
};

async function logMod(i, title, desc) {
  try {
    const { getGuild } = require('../database');
    const { fmt } = require('../utils/helpers');
    const cfg = getGuild(i.guildId);
    if (cfg.logs.enabled && cfg.logs.channel) {
      const ch = await i.guild.channels.fetch(cfg.logs.channel).catch(() => null);
      if (ch) ch.send({ embeds: [embed({ title, description: desc, color: 0xED4245, footer: `Mod: ${i.user.tag}` })] });
    }
  } catch {}
}
