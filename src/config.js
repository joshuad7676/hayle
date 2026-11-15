require('dotenv').config();
module.exports = {
  token: process.env.DISCORD_TOKEN,
  clientId: process.env.CLIENT_ID,
  guildId: process.env.GUILD_ID || null,
  openaiKey: process.env.OPENAI_API_KEY || null,
  dashboardUrl: process.env.DASHBOARD_URL || 'http://localhost:3000',
  port: process.env.DASHBOARD_PORT || 3000,
  // Hayle — Helpful Assistant, Your Loyal Expert
  botName: 'Hayle',
  tagline: 'Helpful Assistant, Your Loyal Expert',
  embedColor: 0xE8B339, // loyal gold
};
