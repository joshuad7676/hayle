// GLOBAL commands — work in DMs, GCs, all servers (no guild requirement)
const { SlashCommandBuilder } = require('discord.js');
const config = require('../config');
const { embed } = require('../utils/helpers');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('ask')
    .setDescription('Ask the AI a question (works in DMs too)')
    .addStringOption(o => o.setName('question').setDescription('Your question').setRequired(true))
    .setDMPermission(true),
  async execute(i) {
    const q = i.options.getString('question');
    await i.deferReply();
    if (!config.openaiKey) {
      return i.editReply('⚠️ AI not configured. Owner: set `OPENAI_API_KEY` in `.env` to enable `/ask`.');
    }
    try {
      const { default: OpenAI } = await import('openai');
      const ai = new OpenAI({ apiKey: config.openaiKey });
      const r = await ai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [{ role: 'user', content: q }],
        max_tokens: 800,
      });
      const ans = r.choices[0]?.message?.content || 'No answer.';
      return i.editReply({ embeds: [embed({ title: '🤖 ' + q.slice(0, 200), description: ans.slice(0, 4000) })] });
    } catch (e) {
      return i.editReply('❌ AI error: ' + e.message.slice(0, 500));
    }
  }
};
