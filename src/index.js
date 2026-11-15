const { Client, GatewayIntentBits, Partials, Collection, EmbedBuilder } = require('discord.js');
const fs = require('fs');
const path = require('path');
const config = require('./config');

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.GuildMessageReactions,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.DirectMessages,
  ],
  partials: [Partials.Channel, Partials.Message, Partials.GuildMember, Partials.Reaction],
});

client.commands = new Collection();
client.joinTimestamps = new Collection(); // guildId -> [timestamps] for raid protect

// Load commands
const cmdsPath = path.join(__dirname, 'commands');
for (const file of fs.readdirSync(cmdsPath).filter(f => f.endsWith('.js'))) {
  const cmd = require(path.join(cmdsPath, file));
  if (cmd.data && cmd.execute) client.commands.set(cmd.data.name, cmd);
}

// Load events
const evtsPath = path.join(__dirname, 'events');
for (const file of fs.readdirSync(evtsPath).filter(f => f.endsWith('.js'))) {
  const evt = require(path.join(evtsPath, file));
  if (evt.once) client.once(evt.name, (...a) => evt.execute(...a, client));
  else client.on(evt.name, (...a) => evt.execute(...a, client));
}

client.on('interactionCreate', async (interaction) => {
  // Buttons / modals / selects handled in events/interactionCreate.js via separate listener?
  // Slash commands here:
  if (!interaction.isChatInputCommand()) return;
  const cmd = client.commands.get(interaction.commandName);
  if (!cmd) return;
  try {
    await cmd.execute(interaction, client);
  } catch (e) {
    console.error(e);
    const msg = { content: '❌ Error: ' + String(e.message || e).slice(0, 1500), ephemeral: true };
    if (interaction.replied || interaction.deferred) await interaction.followUp(msg);
    else await interaction.reply(msg);
  }
});

// Render runs this as a free web service, which requires an open HTTP port.
// Responding 200 keeps the service alive (pair with a pinger like UptimeRobot).
if (process.env.PORT) {
  const http = require('http');
  http.createServer((req, res) => {
    res.writeHead(200, { 'Content-Type': 'text/plain' });
    res.end('Hayle — Helpful Assistant, Your Loyal Expert');
  }).listen(process.env.PORT, () => console.log(`Health endpoint listening on :${process.env.PORT}`));
}

client.login(config.token);
