/**
 * Converts build/icon.svg to build/icon.png (256x256) for electron-builder.
 * Run: node scripts/build-icon.js
 */
import sharp from "sharp";
import { readFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");
const svgPath = join(root, "build", "icon.svg");
const pngPath = join(root, "build", "icon.png");

const svg = readFileSync(svgPath);
await sharp(svg)
  .resize(256, 256)
  .png()
  .toFile(pngPath);

console.log("Wrote build/icon.png (256x256)");
