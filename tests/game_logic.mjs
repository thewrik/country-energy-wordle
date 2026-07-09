import assert from "node:assert/strict";
import { compassDirection } from "../vendor/country-guess-kit/geo.mjs";
import { tierForCountry, pickCountriesForTier, energyContext, topMixEntries, mixDistance, similarityBadge } from "../src/game_logic.mjs";

const cats = ["coal", "gas", "oil", "nuclear", "hydro", "wind", "solar", "biofuel", "otherRenewables"];
const mix = (values) => Object.fromEntries(cats.map((c) => [c, values[c] ?? 0]));
const country = (overrides) => ({
  name: "Testland",
  iso: "TST",
  region: "Test Region",
  subregion: "Test Subregion",
  lat: 0,
  lng: 0,
  generationTwh: 10,
  year: 2024,
  mix: mix({ coal: 40, gas: 30, hydro: 20, wind: 10 }),
  ...overrides,
});

assert.equal(compassDirection(country({ lat: 0, lng: 0 }), country({ lat: 10, lng: 10 })).label, "northeast");
assert.equal(compassDirection(country({ lat: 5, lng: 5 }), country({ lat: 5.4, lng: 5.5 })).label, "nearby");
assert.equal(compassDirection(country({ lat: 10, lng: 0 }), country({ lat: 0, lng: -10 })).arrow, "↙");

const easy = country({ name: "United States", iso: "USA", generationTwh: 4300 });
const surprise = country({ name: "Hidden Hydro Island", iso: "HHI", generationTwh: 2.3 });
assert.equal(tierForCountry(easy), "easy");
assert.equal(tierForCountry(surprise), "surprise");
assert.deepEqual(pickCountriesForTier([easy, surprise], "easy"), [easy]);
assert.deepEqual(pickCountriesForTier([easy, surprise], "surprise"), [surprise]);
assert.equal(pickCountriesForTier([easy, surprise], "all").length, 2);

assert.deepEqual(topMixEntries(country({ mix: mix({ hydro: 70, wind: 20, solar: 10 }) }), 2).map((x) => x.cat), ["hydro", "wind"]);
assert.equal(mixDistance(country({ mix: mix({ coal: 80, gas: 20 }) }), country({ mix: mix({ coal: 60, wind: 40 }) })), 40);
assert.deepEqual(similarityBadge(8), ["Excellent", "good"]);

const context = energyContext(country({
  name: "Norway",
  generationTwh: 150,
  year: 2024,
  mix: mix({ hydro: 88, wind: 8, gas: 2, solar: 2 }),
}));
assert.match(context, /Norway/);
assert.match(context, /hydro/i);
assert.match(context, /150 TWh/);
assert.match(context, /2024/);
assert.match(context, /Surprise:/);

console.log("game logic tests passed");
