const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { getGuild, save } = require('../database');
const { embed } = require('../utils/helpers');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('snipe')
    .setDescription('See recently deleted / edited messages')
    .addSubcommand(s => s.setName('deleted').setDescription('Show last deleted message in channel'))
    .addSubcommand(s => s.setName('edited').setDescription('Show last edited message in channel'))
    .addSubcommand(s => s.setName('clear').setDescription('Clear snipe cache'))
    .setDMPermission(false),
  async execute(i) {
    const cfg = getGuild(i.guildId);
    const sub = i.options.getSubcommand();
    const data = cfg.snipes?.[i.channelId];
    if (sub === 'clear') {
      if (cfg.snipes) delete cfg.snipes[i.channelId];
      save();
      return i.reply({ content: '🧹 Snipe cache cleared.', ephemeral: true });
    }
    if (!data) return i.reply({ content: '❌ Nothing to snipe here yet.', ephemeral: true });
    if (sub === 'deleted') {
      if (!data.deleted) return i.reply({ content: '❌ No deleted message cached.', ephemeral: true });
      return i.reply({ embeds: [embed({ title: '🗑️ Last deleted', description: data.deleted.content || '*[no text]*', footer: `Author: ${data.deleted.author} • ${data.deleted.at}`, color: 0xED4245 })] });
    }
    if (sub === 'edited') {
      if (!data.edited) return i.reply({ content: '❌ No edited message cached.', ephemeral: true });
      return i.reply({ embeds: [embed({ title: '✏️ Last edited', description: `**Before:**\n${data.edited.before}\n\n**After:**\n${data.edited.after}`, footer: `Author: ${data.edited.author}` })] });
    }
  }
};
