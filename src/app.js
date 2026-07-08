import { LABELS, CATEGORIES, compassDirection, topMixEntries, cleanShare, fossilShare, pickCountriesForTier, tierForCountry, energyContext, formatTwh } from "./game_logic.mjs";

const DATA = window.ENERGY_MIX_DATA;
const CATS = DATA.categories || CATEGORIES;
const MAX_GUESSES = 6;
let target, guesses, finished;

const $ = (id) => document.getElementById(id);
const norm = (s) => String(s || "").trim().toLowerCase();
const km = (n) => `${Math.round(n).toLocaleString()} km`;
const pct = (n) => `${n.toFixed(1)}%`;

function seedIndex(countries = DATA.countries) {
  const d = new Date();
  const key = Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()) / 86400000;
  return Math.abs(Math.floor(Math.sin(key) * 1000000)) % countries.length;
}
function cssName(cat) { return getComputedStyle(document.documentElement).getPropertyValue(`--${cat}`).trim(); }
function distanceKm(a, b) {
  const R = 6371, toRad = x => x * Math.PI / 180;
  const dLat = toRad(b.lat - a.lat), dLng = toRad(b.lng - a.lng);
  const la1 = toRad(a.lat), la2 = toRad(b.lat);
  const h = Math.sin(dLat/2)**2 + Math.cos(la1)*Math.cos(la2)*Math.sin(dLng/2)**2;
  return 2 * R * Math.asin(Math.sqrt(h));
}
function mixDistance(a, b) {
  return CATS.reduce((sum, c) => sum + Math.abs(a.mix[c] - b.mix[c]), 0) / 2;
}
function similarityBadge(d) {
  if (d <= 10) return ["Excellent", "good"];
  if (d <= 22) return ["Close", "good"];
  if (d <= 38) return ["Warm", "mid"];
  return ["Cold", "bad"];
}
function currentTier() {
  return $("tier-select")?.value || "all";
}
function tierLabel(tier) {
  return tier === "easy" ? "Easy mode" : tier === "surprise" ? "Surprise me" : "Daily mix";
}
function candidateCountries(tier = currentTier()) {
  const candidates = pickCountriesForTier(DATA.countries, tier);
  return candidates.length ? candidates : DATA.countries;
}
function renderTierCounts() {
  const easy = pickCountriesForTier(DATA.countries, "easy").length;
  const surprise = pickCountriesForTier(DATA.countries, "surprise").length;
  $("tier-note").textContent = `Easy has ${easy} familiar/high-generation grids. Surprise me pulls from ${surprise} smaller, weirder-to-guess grids.`;
}
function renderMixChart() {
  const top = topMixEntries(target, 4);
  const fingerprintSegments = CATS.filter(c => target.mix[c] > 0.05).map(c => `
    <span class="fingerprint-segment" title="${LABELS[c]} ${pct(target.mix[c])}" style="width:${Math.max(target.mix[c], 1.2)}%;background:${cssName(c)}"></span>`).join("");
  const topCards = top.map(x => `
    <div class="top-source" style="--accent:${cssName(x.cat)}">
      <span>${x.label}</span>
      <strong>${pct(x.value)}</strong>
    </div>`).join("");
  const clean = cleanShare(target);
  const fossil = fossilShare(target);
  $("mix-chart").innerHTML = `
    <div class="fingerprint-card">
      <div class="fingerprint-head">
        <span>Unknown country</span>
        <b>${target.year}</b>
      </div>
      <div class="fingerprint-stack" aria-label="Stacked electricity mix fingerprint">${fingerprintSegments}</div>
      <div class="fingerprint-stats">
        <span>Clean-ish: <b>${pct(clean)}</b></span>
        <span>Fossil: <b>${pct(fossil)}</b></span>
        <span>Size: <b>${formatTwh(target.generationTwh)}</b></span>
      </div>
    </div>
    <div class="top-grid">${topCards}</div>
    <details class="fine-print">
      <summary>Show exact source bars</summary>
      <div class="bar-list">${CATS.map(c => `
        <div class="bar">
          <span>${LABELS[c]}</span>
          <span class="bar-track"><span class="bar-fill" style="width:${target.mix[c]}%;background:${cssName(c)}"></span></span>
          <b>${pct(target.mix[c])}</b>
        </div>`).join("")}</div>
    </details>`;
  $("source-note").textContent = `Latest available standardized electricity data: ${target.year}; ${formatTwh(target.generationTwh)} generation. The country stays hidden until solved.`;
}
function renderBoard() {
  $("guess-board").innerHTML = guesses.map((g, i) => {
    const d = mixDistance(g, target);
    const [txt, cls] = similarityBadge(d);
    const geo = distanceKm(g, target);
    const dir = compassDirection(g, target);
    return `<div class="guess"><strong>${i + 1}. ${g.name}</strong><span>${g.region}</span><span class="geo-chip">${dir.arrow} ${dir.label} · ${km(geo)}</span><span class="badge ${cls}">${txt} · ${d.toFixed(1)} pts</span></div>`;
  }).join("") || `<p class="message">No guesses yet.</p>`;
}
function renderHints(last) {
  if (!last) return;
  const d = distanceKm(last, target);
  const dir = compassDirection(last, target);
  const sameRegion = last.region === target.region;
  const sameSub = last.subregion === target.subregion;
  $("geo-hint").innerHTML = `Head <b>${dir.arrow} ${dir.label}</b> from ${last.name}: the target is about <b>${km(d)}</b> away. Region: <b>${sameRegion ? "same" : "different"}</b>. Subregion: <b>${sameSub ? "same" : target.subregion}</b>.`;
  const deltas = CATS.map(c => ({ cat: c, delta: +(target.mix[c] - last.mix[c]).toFixed(1) })).sort((a,b) => Math.abs(b.delta)-Math.abs(a.delta)).slice(0,5);
  $("mix-hint").innerHTML = `Compared with ${last.name}, target needs:<div class="delta-list">` + deltas.map(x => `<span class="delta"><b>${LABELS[x.cat]}</b><span>${x.delta > 0 ? "+" : ""}${x.delta.toFixed(1)} pp</span></span>`).join("") + `</div>`;
}
function end(win) {
  finished = true;
  $("message").innerHTML = win ? `✅ Correct: <b>${target.name}</b>.` : `❌ Out of guesses. It was <b>${target.name}</b>.`;
  $("answer-card").hidden = false;
  $("answer-title").textContent = `${target.name}: grid gossip unlocked`;
  $("answer-context").textContent = energyContext(target);
  $("guess-button").disabled = true;
  $("guess-input").disabled = true;
}
function submitGuess() {
  if (finished) return;
  const v = norm($("guess-input").value);
  const guess = DATA.countries.find(c => norm(c.name) === v || norm(c.iso) === v || norm(c.restName) === v);
  if (!guess) { $("message").textContent = "Pick a country from the list."; return; }
  if (guesses.some(g => g.iso === guess.iso)) { $("message").textContent = "Already guessed."; return; }
  guesses.push(guess); $("guess-input").value = "";
  renderBoard(); renderHints(guess);
  if (guess.iso === target.iso) return end(true);
  if (guesses.length >= MAX_GUESSES) return end(false);
  $("message").textContent = `${MAX_GUESSES - guesses.length} guesses left.`;
}
function start(random = false) {
  const candidates = candidateCountries();
  target = candidates[random ? Math.floor(Math.random() * candidates.length) : seedIndex(candidates)];
  guesses = []; finished = false;
  $("guess-button").disabled = false; $("guess-input").disabled = false;
  $("answer-card").hidden = true;
  $("message").textContent = `${tierLabel(currentTier())}: six guesses. Lower mix-distance is better.`;
  $("geo-hint").textContent = "Make a guess to reveal compass direction, distance, region, and subregion proximity.";
  $("mix-hint").textContent = "After each guess, see which sources are too high or too low versus the target.";
  renderMixChart(); renderBoard();
}
function init() {
  $("country-list").innerHTML = DATA.countries.map(c => `<option value="${c.name}"></option>`).join("");
  DATA.countries.forEach(c => c.tier = tierForCountry(c));
  renderTierCounts();
  $("guess-button").addEventListener("click", submitGuess);
  $("guess-input").addEventListener("keydown", e => { if (e.key === "Enter") submitGuess(); });
  $("new-game").addEventListener("click", () => start(true));
  $("tier-select").addEventListener("change", () => start(true));
  start(false);
}
init();
