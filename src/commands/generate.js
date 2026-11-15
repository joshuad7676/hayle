const { SlashCommandBuilder } = require('discord.js');
const config = require('../config');
const { embed } = require('../utils/helpers');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('generate')
    .setDescription('Generate an image with AI (works in DMs)')
    .addStringOption(o => o.setName('prompt').setDescription('Image prompt').setRequired(true))
    .setDMPermission(true),
  async execute(i) {
    const prompt = i.options.getString('prompt');
    await i.deferReply();
    if (!config.openaiKey) return i.editReply('⚠️ Set `OPENAI_API_KEY` in `.env` to enable image gen.');
    try {
      const { default: OpenAI } = await import('openai');
      const ai = new OpenAI({ apiKey: config.openaiKey });
      const r = await ai.images.generate({ model: 'dall-e-3', prompt: prompt.slice(0, 1000), size: '1024x1024', n: 1 });
      const url = r.data[0]?.url;
      if (!url) throw new Error('No image returned');
      return i.editReply({ embeds: [embed({ title: '🎨 ' + prompt.slice(0, 200), description: `Requested by ${i.user}`, image: url })] });
    } catch (e) {
      return i.editReply('❌ Image error: ' + e.message.slice(0, 500));
    }
  }
};
