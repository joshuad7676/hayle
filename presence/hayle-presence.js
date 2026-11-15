// Hayle — Rich Presence companion.
// Shows "Playing Hayle — Helpful Assistant, Your Loyal Expert" on YOUR Discord profile.
// Local-only: Rich Presence talks to the Discord desktop app over IPC, so it can't run on Render.
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
const { Client } = require('@xhayper/discord-rpc');

const clientId = process.env.CLIENT_ID;
if (!clientId) {
  console.error('Missing CLIENT_ID — set it in the parent .env or in the environment.');
  process.exit(1);
}

const inviteUrl = process.env.BOT_INVITE_URL
  || `https://discord.com/oauth2/authorize?client_id=${clientId}&permissions=8&scope=bot%20applications.commands`;

const client = new Client({ clientId });
const startedAt = Date.now();

client.on('ready', async () => {
  const activity = {
    details: 'Helpful Assistant',
    state: 'Your Loyal Expert',
    startTimestamp: startedAt,
    buttons: [
      { label: 'Add Hayle', url: inviteUrl },
    ],
    instance: false,
  };
  // Upload an image asset named e.g. "hayle" on the app's Rich Presence page to use it:
  if (process.env.HAYLE_RP_IMAGE) {
    activity.largeImageKey = process.env.HAYLE_RP_IMAGE;
    activity.largeImageText = 'Hayle — Helpful Assistant';
  }
  await client.user?.setActivity(activity);
  console.log('✅ Rich Presence is live. Press Ctrl+C to clear it.');
});

client.login().catch(e => {
  console.error('Could not connect to Discord — is the desktop app running?', e.message);
  process.exit(1);
});
