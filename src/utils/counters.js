// ServerStats-style voice-channel counters
const { ChannelType, PermissionFlagsBits } = require('discord.js');
const { getGuild, save } = require('../database');

const TYPES = {
  members: { label: 'Members', value: g => g.memberCount },
  bots: { label: 'Bots', value: g => g.members.cache.filter(m => m.user.bot).size },
  boosts: { label: 'Boosts', value: g => g.premiumSubscriptionCount || 0 },
  channels: { label: 'Channels', value: g => g.channels.cache.size },
  roles: { label: 'Roles', value: g => g.roles.cache.size },
};

function counterText(type, label, value) {
  return `${label || TYPES[type]?.label || 'Counter'}: ${value}`;
}

async function refreshCounters(guild) {
  const cfg = getGuild(guild.id);
  const counters = cfg.counters || [];
  if (!counters.length) return;
  // Bots count needs the member cache — best effort
  if (counters.some(c => c.type === 'bots')) {
    await guild.members.fetch().catch(() => {});
  }
  for (const c of counters) {
    const type = TYPES[c.type];
    if (!type) continue;
    const channel = await guild.channels.fetch(c.channelId).catch(() => null);
    if (!channel) continue;
    const name = counterText(c.type, c.label, type.value(guild));
    if (channel.name !== name) await channel.setName(name).catch(() => {});
  }
}

async function createCounter(guild, type, customLabel) {
  const t = TYPES[type];
  if (!t) throw new Error('Unknown counter type');
  const cfg = getGuild(guild.id);
  cfg.counters = cfg.counters || [];
  const name = counterText(type, customLabel, t.value(guild));
  const channel = await guild.channels.create({
    name,
    type: ChannelType.GuildVoice,
    permissionOverwrites: [
      { id: guild.id, deny: [PermissionFlagsBits.Connect] }, // locked — stat only
    ],
    reason: 'Hayle counter setup',
  });
  const entry = { id: channel.id, channelId: channel.id, type, label: customLabel || t.label };
  cfg.counters.push(entry);
  save();
  return { channel, entry };
}

async function removeCounter(guild, channelId) {
  const cfg = getGuild(guild.id);
  cfg.counters = (cfg.counters || []).filter(c => c.channelId !== channelId);
  save();
  const channel = await guild.channels.fetch(channelId).catch(() => null);
  if (channel) await channel.delete('Hayle counter removed').catch(() => {});
}

module.exports = { TYPES, refreshCounters, createCounter, removeCounter };
