// MEE6-style leveling math shared by /level and messageCreate
function xpNeeded(level) {
  return 5 * Math.pow(level + 1, 2) + 50 * (level + 1) + 100;
}

function levelFromXp(xp) {
  let level = 0;
  let remaining = Math.max(0, Math.floor(xp));
  while (remaining >= xpNeeded(level)) {
    remaining -= xpNeeded(level);
    level++;
  }
  return { level, into: remaining, need: xpNeeded(level) };
}

// [█████░░░░░░] bar for embeds
function progressBar(into, need, size = 16) {
  const filled = Math.round((into / need) * size);
  return '█'.repeat(filled) + '░'.repeat(Math.max(0, size - filled));
}

module.exports = { xpNeeded, levelFromXp, progressBar };
