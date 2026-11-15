require('dotenv').config();
const { REST, Routes } = require('discord.js');
const fs = require('fs');
const path = require('path');
const config = require('./config');

const commands = [];
for (const file of fs.readdirSync(path.join(__dirname, 'commands')).filter(f => f.endsWith('.js'))) {
  const cmd = require(path.join(__dirname, 'commands', file));
  if (cmd.data) commands.push(cmd.data.toJSON());
}

const rest = new REST({ version: '10' }).setToken(config.token);
(async () => {
  // Global deploy — works in DMs, GCs, all servers (may take ~1hr to propagate)
  await rest.put(Routes.applicationCommands(config.clientId), { body: commands });
  console.log(`Deployed ${commands.length} GLOBAL commands.`);
  if (config.guildId) {
    await rest.put(Routes.applicationGuildCommands(config.clientId, config.guildId), { body: commands });
    console.log('Also deployed to test guild (instant).');
  }
})().catch(console.error);
