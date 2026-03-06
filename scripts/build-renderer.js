import * as esbuild from "esbuild";
import { copyFileSync, mkdirSync } from "fs";
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

copyFileSync(join(root, "src", "renderer", "index.html"), join(outDir, "index.html"));
copyFileSync(join(root, "src", "renderer", "about.html"), join(outDir, "about.html"));
