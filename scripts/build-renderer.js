import * as esbuild from "esbuild";
import { copyFileSync, mkdirSync, cpSync, existsSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = fileURLToPath(new URL(".", import.meta.url));
const root = join(__dirname, "..");
const outDir = join(root, "dist", "renderer");
mkdirSync(outDir, { recursive: true });

await esbuild.build({
  entryPoints: [join(root, "src", "renderer", "map.js")],
  bundle: true,
  format: "iife",
  globalName: "AZIMUTH_APP",
  outfile: join(outDir, "map.js"),
  platform: "browser",
});

await esbuild.build({
  entryPoints: [join(root, "src", "renderer", "capacitor-bridge-entry.js")],
  bundle: true,
  format: "iife",
  outfile: join(outDir, "capacitor-bridge.js"),
  platform: "browser",
});

const leafletDist = join(root, "node_modules", "leaflet", "dist");
if (existsSync(leafletDist)) {
  cpSync(leafletDist, join(outDir, "leaflet"), { recursive: true });
}

copyFileSync(join(root, "src", "renderer", "index.html"), join(outDir, "index.html"));
copyFileSync(join(root, "src", "renderer", "about.html"), join(outDir, "about.html"));
copyFileSync(join(root, "src", "renderer", "license.html"), join(outDir, "license.html"));
copyFileSync(join(root, "src", "renderer", "logging.html"), join(outDir, "logging.html"));
copyFileSync(join(root, "src", "renderer", "maps-preferences.html"), join(outDir, "maps-preferences.html"));
