const { load } = require('../database');
const { armTimer } = require('../utils/giveaway');
const { refreshCounters } = require('../utils/counters');
const { ActivityType } = require('discord.js');
const config = require('../config');

module.exports = {
  name: 'ready',
  once: true,
  execute(client) {
    console.log(`✅ ${config.botName} is online as ${client.user.tag} — ${client.commands.size} commands loaded`);

    // Re-arm giveaway timers that survived a restart
    try {
      const db = load();
      let rearmed = 0;
      for (const [gid, gcfg] of Object.entries(db.guilds || {})) {
        for (const gw of gcfg.giveaways || []) {
          if (!gw.ended) { armTimer(client, gid, gw); rearmed++; }
        }
      }
      if (rearmed) console.log(`🎉 Re-armed ${rearmed} giveaway timer(s)`);
    } catch (e) {
      console.error('Giveaway re-arm failed:', e);
    }

    // Rotating activity — this is the bot's "status", seen in every server sidebar
    const activities = [
      { name: config.tagline, type: ActivityType.Playing },
      { name: '/help', type: ActivityType.Listening },
      { name: 'over your server', type: ActivityType.Watching },
      { name: 'your questions', type: ActivityType.Listening },
    ];
    let idx = 0;
    const rotate = () => client.user.setPresence({ activities: [activities[idx++ % activities.length]], status: 'online' });
    rotate();
    setInterval(rotate, 30_000);

    // Counters refresh now + every 10 minutes
    const tick = () => client.guilds.cache.forEach(g => refreshCounters(g).catch(() => {}));
    tick();
    setInterval(tick, 10 * 60 * 1000);
  },
};
