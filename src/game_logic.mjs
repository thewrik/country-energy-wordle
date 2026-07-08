export const LABELS = {
  coal: "Coal",
  gas: "Gas",
  oil: "Oil",
  nuclear: "Nuclear",
  hydro: "Hydro",
  wind: "Wind",
  solar: "Solar",
  biofuel: "Biofuel",
  otherRenewables: "Other renewables",
};

export const CATEGORIES = Object.keys(LABELS);

const EASY_NAMES = new Set([
  "China", "United States", "India", "Russia", "Japan", "Germany", "France", "Brazil", "Canada", "United Kingdom",
  "Italy", "Spain", "Australia", "South Korea", "Mexico", "Indonesia", "Saudi Arabia", "Turkey", "South Africa", "Norway",
]);

export function formatTwh(n) {
  if (n >= 1000) return `${(n / 1000).toFixed(n >= 10000 ? 0 : 1)}k TWh`;
  if (n >= 10) return `${Math.round(n).toLocaleString()} TWh`;
  return `${Number(n).toFixed(1)} TWh`;
}

export function compassDirection(from, to) {
  const latDelta = to.lat - from.lat;
  const lngDelta = to.lng - from.lng;
  if (Math.abs(latDelta) < 2 && Math.abs(lngDelta) < 2) return { label: "nearby", arrow: "•" };
  const ns = latDelta > 2 ? "north" : latDelta < -2 ? "south" : "";
  const ew = lngDelta > 2 ? "east" : lngDelta < -2 ? "west" : "";
  const label = [ns, ew].filter(Boolean).join("") || ns || ew || "nearby";
  const arrows = { north: "↑", northeast: "↗", east: "→", southeast: "↘", south: "↓", southwest: "↙", west: "←", northwest: "↖", nearby: "•" };
  return { label, arrow: arrows[label] || "•" };
}

export function topMixEntries(country, limit = 3) {
  return CATEGORIES.map((cat) => ({ cat, label: LABELS[cat], value: country.mix[cat] || 0 }))
    .sort((a, b) => b.value - a.value)
    .slice(0, limit);
}

export function cleanShare(country) {
  return ["nuclear", "hydro", "wind", "solar", "biofuel", "otherRenewables"].reduce((sum, cat) => sum + (country.mix[cat] || 0), 0);
}

export function fossilShare(country) {
  return ["coal", "gas", "oil"].reduce((sum, cat) => sum + (country.mix[cat] || 0), 0);
}

export function tierForCountry(country) {
  if (EASY_NAMES.has(country.name) || country.generationTwh >= 250) return "easy";
  if (country.generationTwh < 25 && !EASY_NAMES.has(country.name)) return "surprise";
  return "all";
}

export function pickCountriesForTier(countries, tier) {
  if (tier === "easy") return countries.filter((c) => tierForCountry(c) === "easy");
  if (tier === "surprise") return countries.filter((c) => tierForCountry(c) === "surprise");
  return countries;
}

function vibe(country) {
  const top = topMixEntries(country, 1)[0];
  const clean = cleanShare(country);
  const fossil = fossilShare(country);
  if (top.cat === "hydro") return "a mountain-river battery: rain, snowmelt, dams, and gravity are doing the heavy lifting";
  if (top.cat === "nuclear") return "a steady reactor heartbeat: lots of always-on nuclear baseload underneath the grid";
  if (top.cat === "coal") return "a coal-heavy industrial throwback: big thermal plants still set the grid's tempo";
  if (top.cat === "gas") return "a gas-flex grid: turbines that can ramp quickly are starring in the mix";
  if (top.cat === "wind") return "a breezy overachiever: wind is doing more than just decorating the horizon";
  if (top.cat === "solar") return "a sunshine grid: midday electrons are clearly part of the national personality";
  if (clean >= 75) return "a low-carbon flex: most electricity comes from non-fossil sources";
  if (fossil >= 75) return "a fossil-fuel furnace: dispatchable thermal power dominates the scoreboard";
  return "a proper grid smoothie: no single source gets to hog the aux cable";
}

export function energyContext(country) {
  const top = topMixEntries(country, 3);
  const clean = cleanShare(country);
  const fossil = fossilShare(country);
  const topText = top.map((x) => `${x.label.toLowerCase()} ${x.value.toFixed(1)}%`).join(", ");
  return `${country.name}'s ${country.year} grid is ${vibe(country)}. The leading ingredients are ${topText}; clean sources add up to ${clean.toFixed(1)}% while fossil fuels sit at ${fossil.toFixed(1)}%. Total generation in this dataset: ${formatTwh(country.generationTwh)}.`;
}
