const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { createGiveaway, armTimer, makeButton } = require('../utils/giveaway');
const { getGuild, save } = require('../database');
const { embed } = require('../utils/helpers');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('giveaway')
    .setDescription('Start a giveaway with a button to enter')
    .addSubcommand(s => s.setName('start').setDescription('Start a giveaway')
      .addStringOption(o => o.setName('prize').setDescription('What are you giving away?').setRequired(true))
      .addIntegerOption(o => o.setName('minutes').setDescription('Duration in minutes').setRequired(true).setMinValue(1).setMaxValue(10080))
      .addIntegerOption(o => o.setName('winners').setDescription('Number of winners (default 1)').setMinValue(1).setMaxValue(20))
      .addChannelOption(o => o.setName('channel').setDescription('Where to post (default: here)')))
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
    .setDMPermission(false),
  async execute(i, client) {
    const sub = i.options.getSubcommand();
    if (sub !== 'start') return;

    const prize = i.options.getString('prize').slice(0, 200);
    const minutes = i.options.getInteger('minutes');
    const winners = i.options.getInteger('winners') ?? 1;
    const channel = i.options.getChannel('channel') || i.channel;
    const endsAt = Date.now() + minutes * 60000;

    const gw = createGiveaway(client, i.guildId, { prize, winners, minutes });
    gw.channelId = channel.id;
    save();

    const message = await channel.send({
      embeds: [embed({
        title: '🎉 GIVEAWAY',
        description:
          `**${prize}**\n\n` +
          `🏆 Winners: **${gw.winners}**\n` +
          `⏰ Ends: <t:${Math.floor(endsAt / 1000)}:R> (<t:${Math.floor(endsAt / 1000)}:f>)\n\n` +
          `Press the button below to enter!`,
        footer: 'Giveaway • Hayle',
      })],
      components: [makeButton(gw.id)],
    });

    gw.messageId = message.id;
    save();
    armTimer(client, i.guildId, gw);

    return i.reply({ content: `🎉 Giveaway started in ${channel} — ends <t:${Math.floor(endsAt / 1000)}:R>.`, ephemeral: true });
  },
};
