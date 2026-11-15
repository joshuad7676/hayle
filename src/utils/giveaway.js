// Giveaway engine — used by /giveaway and re-armed on bot ready
const crypto = require('crypto');
const { ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder } = require('discord.js');
const { getGuild, save } = require('../database');
const { embed } = require('./helpers');

function pickWinners(entries, count) {
  const pool = [...new Set(entries)];
  const winners = [];
  while (pool.length && winners.length < count) {
    winners.push(pool.splice(Math.floor(Math.random() * pool.length), 1)[0]);
  }
  return winners;
}

function makeButton(id) {
  return new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId(`gw_enter_${id}`).setLabel('Enter Giveaway').setEmoji('🎉').setStyle(ButtonStyle.Primary),
  );
}

async function endGiveaway(client, guildId, giveawayId) {
  const cfg = getGuild(guildId);
  const gw = (cfg.giveaways || []).find(g => g.id === giveawayId);
  if (!gw || gw.ended) return;
  gw.ended = true;

  const guild = client.guilds.cache.get(guildId);
  const channel = guild ? await guild.channels.fetch(gw.channelId).catch(() => null) : null;
  const winners = pickWinners(gw.entries, gw.winners);

  // Edit the original giveaway message to show results
  if (channel) {
    const msg = await channel.messages.fetch(gw.messageId).catch(() => null);
    if (msg) {
      const result = EmbedBuilder.from(msg.embeds[0] ?? embed())
        .setDescription(
          `🏆 **Prize:** ${gw.prize}\n` +
          `🎉 **Winner${winners.length === 1 ? '' : 's'}:** ${winners.length ? winners.map(id => `<@${id}>`).join(', ') : 'None — no entries!'}\n` +
          `👥 **Entries:** ${new Set(gw.entries).size}`
        )
        .setFooter({ text: 'Giveaway ended • Hayle' });
      await msg.edit({ embeds: [result], components: [] }).catch(() => {});
    }
    await channel.send({
      content: winners.length
        ? `🎊 Congratulations ${winners.map(id => `<@${id}>`).join(', ')}! You won **${gw.prize}**!`
        : `😔 No entries for **${gw.prize}** — better luck next time.`,
    }).catch(() => {});
  }

  // Trim old ended giveaways, keep config tidy
  cfg.giveaways = cfg.giveaways.filter(g => !g.ended || Date.now() - g.createdAt < 30 * 86400000);
  save();
}

function armTimer(client, guildId, giveaway) {
  if (giveaway.ended) return;
  const delay = giveaway.endsAt - Date.now();
  if (delay <= 0) return endGiveaway(client, guildId, giveaway.id);
  setTimeout(() => endGiveaway(client, guildId, giveaway.id).catch(console.error), delay);
}

function createGiveaway(client, guildId, { prize, winners, minutes }) {
  const cfg = getGuild(guildId);
  cfg.giveaways = cfg.giveaways || [];
  const gw = {
    id: crypto.randomBytes(6).toString('hex'),
    prize,
    winners: Math.max(1, Math.min(20, winners)),
    endsAt: Date.now() + minutes * 60000,
    createdAt: Date.now(),
    channelId: null,
    messageId: null,
    entries: [],
    ended: false,
  };
  cfg.giveaways.push(gw);
  return gw;
}

module.exports = { createGiveaway, armTimer, endGiveaway, makeButton, pickWinners };
