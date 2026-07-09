export function normalizeGuess(value) {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/&/g, ' and ')
    .replace(/[^a-zA-Z0-9]+/g, ' ')
    .trim()
    .toLowerCase()
    .replace(/^the\s+/, '');
}

export function uniqueAliases(values) {
  const seen = new Set();
  return values
    .flat()
    .filter(Boolean)
    .map(String)
    .filter(value => {
      const key = normalizeGuess(value);
      if (!key || seen.has(key)) return false;
      seen.add(key);
      return true;
    });
}

export function countryAliases(item) {
  const base = [
    item.name,
    item.restName,
    item.officialName,
    item.iso,
    item.cca2,
    item.cca3,
    item.fifa,
    ...(item.aliases || []),
    ...(item.altSpellings || []),
  ];
  const manual = {
    'United States': ['USA', 'US', 'U.S.', 'U.S.A.', 'America', 'United States of America'],
    'United Kingdom': ['UK', 'U.K.', 'Britain', 'Great Britain'],
    'South Korea': ['Korea', 'Republic of Korea', 'ROK'],
    'North Korea': ['DPRK', 'Democratic People\'s Republic of Korea'],
    'Russia': ['Russian Federation'],
    'Turkey': ['Türkiye', 'Turkiye'],
    'Czechia': ['Czech Republic'],
    'Iran': ['Islamic Republic of Iran'],
    'Syria': ['Syrian Arab Republic'],
    'Vietnam': ['Viet Nam'],
    'Laos': ['Lao PDR', 'Lao People\'s Democratic Republic'],
    'Bolivia': ['Plurinational State of Bolivia'],
    'Tanzania': ['United Republic of Tanzania'],
    'Moldova': ['Republic of Moldova'],
    'Venezuela': ['Bolivarian Republic of Venezuela'],
    'Ivory Coast': ['Cote d Ivoire', "Côte d'Ivoire"],
    'Cape Verde': ['Cabo Verde'],
    'Eswatini': ['Swaziland'],
    'Myanmar': ['Burma'],
    'Timor-Leste': ['East Timor'],
    'Democratic Republic of Congo': ['DRC', 'Congo Kinshasa'],
    'Republic of Congo': ['Congo Brazzaville'],
  };
  return uniqueAliases([...base, ...(manual[item.name] || [])]);
}

export function dailySeedIndex(items, date = new Date(), { utc = true } = {}) {
  const count = Array.isArray(items) ? items.length : Number(items || 0);
  if (!count) return 0;
  const y = utc ? date.getUTCFullYear() : date.getFullYear();
  const m = utc ? date.getUTCMonth() : date.getMonth();
  const d = utc ? date.getUTCDate() : date.getDate();
  const dayNumber = Date.UTC(y, m, d) / 86400000;
  return Math.abs(Math.floor(Math.sin(dayNumber) * 1000000)) % count;
}

export function createGuessGame({
  items,
  maxGuesses = 6,
  getId = item => item.name,
  aliases = item => [item.name],
  pickDailyIndex = dailySeedIndex,
  evaluateGuess = () => ({}),
} = {}) {
  if (!Array.isArray(items) || items.length === 0) throw new Error('createGuessGame requires a non-empty items array');

  let target = items[0];
  let guesses = [];
  let finished = false;
  let activeItems = items;

  function resolve(input) {
    const q = normalizeGuess(input);
    return activeItems.find(item => aliases(item).some(alias => normalizeGuess(alias) === q));
  }

  function start({ random = false, candidates = items, target: explicitTarget, date = new Date() } = {}) {
    activeItems = candidates && candidates.length ? candidates : items;
    if (explicitTarget) target = explicitTarget;
    else if (random) target = activeItems[Math.floor(Math.random() * activeItems.length)];
    else target = activeItems[pickDailyIndex(activeItems, date)];
    guesses = [];
    finished = false;
    return target;
  }

  function guess(input) {
    if (finished) return { ok: false, reason: 'over' };
    const item = resolve(input);
    if (!item) return { ok: false, reason: 'not_found' };
    const itemId = getId(item);
    if (guesses.some(existing => getId(existing) === itemId)) return { ok: false, reason: 'duplicate', guess: item };

    const evaluation = evaluateGuess({ guess: item, target, guesses: guesses.slice() });
    guesses.push(item);
    const win = itemId === getId(target);
    const lose = !win && guesses.length >= maxGuesses;
    if (win || lose) finished = true;

    return {
      ok: true,
      guess: item,
      evaluation,
      win,
      lose,
      guessesUsed: guesses.length,
      guessesLeft: Math.max(0, maxGuesses - guesses.length),
      answer: finished ? target : null,
    };
  }

  start();

  return {
    start,
    guess,
    resolve,
    maxGuesses,
    get target() { return target; },
    get guesses() { return guesses.slice(); },
    get finished() { return finished; },
  };
}
