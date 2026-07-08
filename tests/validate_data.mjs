import fs from "node:fs";
import vm from "node:vm";

const code = fs.readFileSync("src/energy_mix_data.js", "utf8");
const sandbox = { window: {} };
vm.createContext(sandbox);
vm.runInContext(code, sandbox);
const data = sandbox.window.ENERGY_MIX_DATA;

if (!data || !Array.isArray(data.countries)) throw new Error("missing data payload");
if (data.countries.length < 100) throw new Error(`too few countries: ${data.countries.length}`);
for (const c of data.countries) {
  for (const key of ["name", "iso", "year", "region", "lat", "lng", "generationTwh", "mix"]) {
    if (c[key] === undefined || c[key] === null || c[key] === "") throw new Error(`${c.name || c.iso} missing ${key}`);
  }
  const sum = Object.values(c.mix).reduce((a, b) => a + b, 0);
  if (Math.abs(sum - 100) > 0.2) throw new Error(`${c.name} mix sums to ${sum}`);
}
console.log(`validated ${data.countries.length} countries; generated ${data.generatedAt}`);
