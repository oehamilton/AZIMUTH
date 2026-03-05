/**
 * One-time script: fetch Natural Earth 110m populated places and write
 * src/data/major-cities.json with { n, lat, lon, p } (name, lat, lon, pop thousands).
 * Run: node scripts/fetch-major-cities.js
 */
import { writeFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const outPath = join(__dirname, "..", "src", "data", "major-cities.json");
const url = "https://raw.githubusercontent.com/nvkelso/natural-earth-vector/master/geojson/ne_110m_populated_places.geojson";

const res = await fetch(url);
if (!res.ok) throw new Error(`Fetch failed: ${res.status}`);
const geojson = await res.json();
const cities = geojson.features
  .map((f) => {
    const [lon, lat] = f.geometry?.coordinates ?? [];
    const props = f.properties ?? {};
    const name = props.NAME ?? props.NAMEASCII ?? "";
    const pop = Math.max(0, Number(props.POP_MAX) || 0);
    if (!name || lat == null || lon == null) return null;
    return { n: name, lat, lon, p: Math.round(pop / 1000) };
  })
  .filter(Boolean);
writeFileSync(outPath, JSON.stringify(cities), "utf8");
console.log(`Wrote ${cities.length} cities to ${outPath}`);
