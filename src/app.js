import { countryAliases, createGuessGame } from "../vendor/country-guess-kit/core.mjs";
import { $, bindGuessForm, setDisabled } from "../vendor/country-guess-kit/dom.mjs";
import { compassDirection, haversineKm } from "../vendor/country-guess-kit/geo.mjs";
import { LABELS, CATEGORIES, topMixEntries, cleanShare, fossilShare, pickCountriesForTier, tierForCountry, energyContext, formatTwh, mixDistance, similarityBadge } from "./game_logic.mjs";

const DATA = window.ENERGY_MIX_DATA;
const CATS = DATA.categories || CATEGORIES;
const MAX_GUESSES = 6;
let game, target, lastResult;

const km = (n) => `${Math.round(n).toLocaleString()} km`;
const pct = (n) => `${n.toFixed(1)}%`;
const cssName = (cat) => getComputedStyle(document.documentElement).getPropertyValue(`--${cat}`).trim();

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
  $("guess-board").innerHTML = game.guesses.map((g, i) => {
    const d = mixDistance(g, target);
    const [txt, cls] = similarityBadge(d);
    const geo = haversineKm(g, target);
    const dir = compassDirection(g, target);
    return `<div class="guess"><strong>${i + 1}. ${g.name}</strong><span>${g.region}</span><span class="geo-chip">${dir.arrow} ${dir.label} · ${km(geo)}</span><span class="badge ${cls}">${txt} · ${d.toFixed(1)} pts</span></div>`;
  }).join("") || `<p class="message">No guesses yet.</p>`;
}

function renderHints(last) {
  if (!last) return;
  const d = haversineKm(last, target);
  const dir = compassDirection(last, target);
  const sameRegion = last.region === target.region;
  const sameSub = last.subregion === target.subregion;
  $("geo-hint").innerHTML = `Head <b>${dir.arrow} ${dir.label}</b> from ${last.name}: the target is about <b>${km(d)}</b> away. Region: <b>${sameRegion ? "same" : "different"}</b>. Subregion: <b>${sameSub ? "same" : target.subregion}</b>.`;
  const deltas = CATS.map(c => ({ cat: c, delta: +(target.mix[c] - last.mix[c]).toFixed(1) })).sort((a,b) => Math.abs(b.delta)-Math.abs(a.delta)).slice(0,5);
  $("mix-hint").innerHTML = `Compared with ${last.name}, target needs:<div class="delta-list">` + deltas.map(x => `<span class="delta"><b>${LABELS[x.cat]}</b><span>${x.delta > 0 ? "+" : ""}${x.delta.toFixed(1)} pp</span></span>`).join("") + `</div>`;
}

function end(win) {
  $("message").innerHTML = win ? `✅ Correct: <b>${target.name}</b>.` : `❌ Out of guesses. It was <b>${target.name}</b>.`;
  $("answer-card").hidden = false;
  $("answer-title").textContent = `${target.name}: grid lesson unlocked`;
  $("answer-context").textContent = energyContext(target);
  setDisabled([$("guess-button"), $("guess-input")], true);
}

function submitGuess() {
  const res = game.guess($("guess-input").value);
  lastResult = res;
  if (!res.ok) {
    $("message").textContent = res.reason === "not_found" ? "Pick a country from the list." : res.reason === "duplicate" ? "Already guessed." : "This round is over.";
    return;
  }
  $("guess-input").value = "";
  renderBoard();
  renderHints(res.guess);
  if (res.win) return end(true);
  if (res.lose) return end(false);
  $("message").textContent = `${res.guessesLeft} guesses left. Follow the arrows and shrink the distance.`;
}

function start(random = false) {
  const candidates = candidateCountries();
  if (!game) {
    game = createGuessGame({
      items: DATA.countries,
      maxGuesses: MAX_GUESSES,
      getId: c => c.iso,
      aliases: c => countryAliases(c),
      evaluateGuess: ({ guess, target }) => ({
        mixDistance: mixDistance(guess, target),
        geoKm: haversineKm(guess, target),
        direction: compassDirection(guess, target),
      }),
    });
  }
  target = game.start({ random, candidates });
  lastResult = null;
  setDisabled([$("guess-button"), $("guess-input")], false);
  $("answer-card").hidden = true;
  $("message").textContent = `${tierLabel(currentTier())}: six guesses. Lower mix-distance is better.`;
  $("geo-hint").textContent = "Make a guess to reveal compass direction, distance, region, and subregion proximity.";
  $("mix-hint").textContent = "After each guess, see which sources are too high or too low versus the target.";
  renderMixChart();
  renderBoard();
}

function populateCountryList() {
  const values = [...new Set(DATA.countries.flatMap(countryAliases))].sort((a, b) => a.localeCompare(b));
  $("country-list").innerHTML = values.map(v => `<option value="${v.replaceAll('"', '&quot;')}"></option>`).join("");
}

function init() {
  DATA.countries.forEach(c => c.tier = tierForCountry(c));
  populateCountryList();
  renderTierCounts();
  bindGuessForm({ input: $("guess-input"), button: $("guess-button"), onSubmit: submitGuess });
  $("new-game").addEventListener("click", () => start(true));
  $("tier-select").addEventListener("change", () => start(true));
  start(false);
}

init();
