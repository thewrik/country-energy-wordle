# GridGuessr — Country Energy Mix Wordle

A static browser game: guess the hidden country from its latest electricity generation mix. Wrong guesses unlock two hint layers, and the reveal gives a short story about why the grid looks that way.

1. **Geographic hinting** — compass arrow, direction, distance, region, and subregion proximity.
2. **Energy-mix difference hinting** — percentage-point differences by electricity source versus the hidden country.

Game modes:

- **Daily mix** — the full country pool.
- **Easy** — familiar/high-generation countries that are easier to reason about.
- **Surprise me** — smaller, weirder-to-guess grids for energy nerd chaos.

## Data

- Electricity mix: [Our World in Data energy dataset](https://github.com/owid/energy-data), latest available country-year.
- Geography: [mledoze/countries](https://github.com/mledoze/countries), used for coordinates/region/subregion.
- The build script normalizes source shares to 100% for gameplay and excludes very small systems below 2 TWh/year to reduce noisy edge cases.

## Run locally

```bash
python3 scripts/build_data.py
python3 -m http.server 8000
# open http://127.0.0.1:8000
```

## Verify

```bash
python3 scripts/build_data.py
node tests/validate_data.mjs
node tests/game_logic.mjs
python3 -m http.server 8000
```

No framework or build step is required. The app is plain HTML/CSS/JS.
