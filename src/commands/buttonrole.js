const { SlashCommandBuilder, PermissionFlagsBits, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { embed } = require('../utils/helpers');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('buttonrole')
    .setDescription('Carl-bot style self-roles — post a message with a toggle button')
    .addSubcommand(s => s.setName('create').setDescription('Create a self-role button message')
      .addRoleOption(o => o.setName('role').setDescription('Role to toggle').setRequired(true))
      .addStringOption(o => o.setName('label').setDescription('Button label').setRequired(true))
      .addStringOption(o => o.setName('title').setDescription('Embed title (default: Self Roles)'))
      .addStringOption(o => o.setName('description').setDescription('Embed description'))
      .addChannelOption(o => o.setName('channel').setDescription('Where to post (default: here)')))
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
    .setDMPermission(false),
  async execute(i) {
    const role = i.options.getRole('role');
    const label = i.options.getString('label').slice(0, 80);
    const channel = i.options.getChannel('channel') || i.channel;

    // Safety: only roles the bot can actually hand out
    const me = i.guild.members.me;
    if (role.managed) return i.reply({ content: '❌ That role is managed by an integration — can\'t self-assign it.', ephemeral: true });
    if (role.position >= me.roles.highest.position) {
      return i.reply({ content: '❌ That role is above my highest role. Move my role higher first.', ephemeral: true });
    }

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId(`rr:${role.id}`).setLabel(label).setStyle(ButtonStyle.Secondary).setEmoji('🎭'),
    );
    await channel.send({
      embeds: [embed({
        title: i.options.getString('title') || '🎭 Self Roles',
        description: i.options.getString('description') || 'Click the button below to toggle your role.',
      })],
      components: [row],
    });
    return i.reply({ content: `✅ Self-role button posted in ${channel}.`, ephemeral: true });
  },
};
