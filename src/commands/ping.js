const { SlashCommandBuilder } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('ping')
    .setDescription('Check the bot\'s latency')
    .setDMPermission(true),
  async execute(i) {
    const sent = await i.reply({ content: '🏓 Pinging...', fetchReply: true, ephemeral: true });
    const ws = Math.round(i.client.ws.ping);
    const roundtrip = sent.createdTimestamp - i.createdTimestamp;
    return i.editReply(`🏓 Pong!\n• WebSocket: **${ws}ms**\n• Roundtrip: **${roundtrip}ms**`);
  }
};
