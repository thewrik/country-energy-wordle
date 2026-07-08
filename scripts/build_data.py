#!/usr/bin/env python3
from __future__ import annotations

import csv
import io
import json
import math
import urllib.request
from pathlib import Path

OWID_URL = "https://raw.githubusercontent.com/owid/energy-data/master/owid-energy-data.csv"
COUNTRIES_URL = "https://raw.githubusercontent.com/mledoze/countries/master/countries.json"
OUT = Path(__file__).resolve().parents[1] / "src" / "energy_mix_data.js"
RAW_OUT = Path(__file__).resolve().parents[1] / "data" / "sources.json"

MIX_COLUMNS = {
    "coal": "coal_share_elec",
    "gas": "gas_share_elec",
    "oil": "oil_share_elec",
    "nuclear": "nuclear_share_elec",
    "hydro": "hydro_share_elec",
    "wind": "wind_share_elec",
    "solar": "solar_share_elec",
    "biofuel": "biofuel_share_elec",
    "otherRenewables": "other_renewables_share_elec_exc_biofuel",
}
MIN_GENERATION_TWH = 2.0


def fetch_text(url: str) -> str:
    req = urllib.request.Request(url, headers={"User-Agent": "country-energy-wordle/1.0"})
    with urllib.request.urlopen(req, timeout=90) as r:
        return r.read().decode("utf-8")


def f(value: str | None) -> float | None:
    if value in (None, ""):
        return None
    try:
        x = float(value)
    except ValueError:
        return None
    if math.isnan(x):
        return None
    return x


def clean_mix(row: dict[str, str]) -> dict[str, float] | None:
    mix = {k: max(0.0, f(row.get(col)) or 0.0) for k, col in MIX_COLUMNS.items()}
    total = sum(mix.values())
    if total <= 0:
        return None
    mix = {k: round(v * 100.0 / total, 1) for k, v in mix.items()}
    drift = round(100.0 - sum(mix.values()), 1)
    if abs(drift) >= 0.1:
        biggest = max(mix, key=mix.get)
        mix[biggest] = round(mix[biggest] + drift, 1)
    return mix


def main() -> None:
    countries = json.loads(fetch_text(COUNTRIES_URL))
    geo = {}
    for c in countries:
        code = c.get("cca3")
        latlng = c.get("latlng") or []
        if code and len(latlng) == 2:
            geo[code] = {
                "region": c.get("region") or "",
                "subregion": c.get("subregion") or "",
                "lat": float(latlng[0]),
                "lng": float(latlng[1]),
                "restName": ((c.get("name") or {}).get("common") or ""),
            }

    text = fetch_text(OWID_URL)
    latest: dict[str, dict] = {}
    for row in csv.DictReader(io.StringIO(text)):
        iso = row.get("iso_code") or ""
        if len(iso) != 3 or iso not in geo:
            continue
        generation = f(row.get("electricity_generation"))
        if generation is None or generation < MIN_GENERATION_TWH:
            continue
        mix = clean_mix(row)
        if not mix:
            continue
        year = int(row["year"])
        if iso not in latest or year > latest[iso]["year"]:
            latest[iso] = {
                "name": row["country"],
                "iso": iso,
                "year": year,
                "generationTwh": round(generation, 1),
                "mix": mix,
                **geo[iso],
            }

    data = sorted(latest.values(), key=lambda x: x["name"])
    payload = {
        "generatedAt": __import__("datetime").datetime.utcnow().replace(microsecond=0).isoformat() + "Z",
        "source": {
            "energy": OWID_URL,
            "geography": COUNTRIES_URL,
            "note": "Latest available electricity-generation source shares per country from OWID energy data; geography from REST Countries. Shares normalized to 100% for gameplay.",
            "minGenerationTwh": MIN_GENERATION_TWH,
        },
        "categories": list(MIX_COLUMNS.keys()),
        "countries": data,
    }
    OUT.write_text("window.ENERGY_MIX_DATA = " + json.dumps(payload, ensure_ascii=False, indent=2) + ";\n")
    RAW_OUT.write_text(json.dumps(payload["source"], indent=2) + "\n")
    years = sorted({d["year"] for d in data})
    print(f"wrote {OUT.relative_to(OUT.parents[1])}: {len(data)} countries, latest years {years[-5:]} generatedAt={payload['generatedAt']}")


if __name__ == "__main__":
    main()
