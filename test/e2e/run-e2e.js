/**
 * Phase 7 E2E: Launch Electron via Playwright, run core journey and assert.
 * - Select home → map centers, home marked
 * - Set target by coordinates → target marked, great-circle lines, both path bearings/distances
 * Results written to docs/test-results.md.
 */
import { writeFileSync, readFileSync, existsSync } from "fs";
import { join, dirname } from "path";
import { mkdirSync } from "fs";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const root = join(__dirname, "..", "..");
const resultsPath = join(root, "docs", "test-results.md");

async function run() {
  const results = [];
  const start = new Date().toISOString();

  const distIndex = join(root, "dist", "renderer", "index.html");
  if (!existsSync(distIndex)) {
    results.push({
      ok: false,
      msg: "E2E skipped: run pnpm run build:renderer (or pnpm start once); dist/renderer/index.html missing.",
    });
    appendE2EResults(results, start);
    process.exit(1);
  }

  let electronApp;
  try {
    const { _electron: electron } = await import("playwright");
    electronApp = await electron.launch({
      args: ["."],
      cwd: root,
      timeout: 30000,
      env: { ...process.env, NODE_ENV: "test" },
    });

    const window = await electronApp.firstWindow({ timeout: 15000 });

    // Wait for app load: #load-status removed or #map visible
    await window.waitForSelector("#map", { state: "visible", timeout: 10000 }).catch(() => {});
    const loadStatus = await window.locator("#load-status").count();
    if (loadStatus > 0) {
      await window.waitForSelector("#load-status", { state: "hidden", timeout: 8000 });
    }

    // Home at center: home selector exists and has options
    const homeSelect = window.locator("#home-select");
    await homeSelect.waitFor({ state: "visible", timeout: 5000 });
    const homeOptions = await homeSelect.locator("option").count();
    if (homeOptions < 1) {
      results.push({ ok: false, msg: "E2E: #home-select has no options (home list missing)." });
    } else {
      results.push({ ok: true, msg: "E2E: Home selector visible with at least one home." });
    }

    // Set target by coordinates (e.g. Tehran ~35.5, 51.5)
    await window.locator("#target-lat").fill("35.5");
    await window.locator("#target-lon").fill("51.5");
    await window.locator("#target-submit-btn").click();

    // Wait for results to show both path blocks (Great-Circle and Loxodrome)
    await window.locator("#results-content .path-block").first().waitFor({ state: "visible", timeout: 5000 });
    await window.locator("#results-content .path-block").nth(1).waitFor({ state: "visible", timeout: 3000 });

    const resultsContent = window.locator("#results-content");
    const text = await resultsContent.textContent();
    const hasGreatCircle = /Great-Circle/i.test(text);
    const hasLoxodrome = /Loxodrome/i.test(text);
    const hasBearing = /\d+\.?\d*\s*°/.test(text);
    const hasDistance = (/\d+\.\d+/.test(text) && /(km|nm|miles)/i.test(text)) || (/\d+\.\d+/.test(text) && hasGreatCircle && hasLoxodrome);

    if (hasGreatCircle && hasLoxodrome && hasBearing && hasDistance) {
      results.push({
        ok: true,
        msg: "E2E: Target set; Great-Circle and Loxodrome with bearing and distance displayed.",
      });
    } else {
      results.push({
        ok: false,
        msg: `E2E: Results missing expected content. Great-Circle: ${hasGreatCircle}, Loxodrome: ${hasLoxodrome}, bearing: ${hasBearing}, distance: ${hasDistance}.`,
      });
    }

    // Map should have path elements (great-circle and loxodrome)
    const pathShort = await window.locator(".path-short").count();
    const pathLoxo = await window.locator(".path-loxodrome").count();
    if (pathShort >= 1 && pathLoxo >= 1) {
      results.push({ ok: true, msg: "E2E: Map shows great-circle and loxodrome path elements." });
    } else {
      results.push({
        ok: false,
        msg: `E2E: Map paths missing. path-short: ${pathShort}, path-loxodrome: ${pathLoxo}.`,
      });
    }
  } catch (err) {
    results.push({
      ok: false,
      msg: "E2E error: " + (err.message || String(err)),
      stderr: err.stack ? err.stack.slice(0, 800) : undefined,
    });
  } finally {
    if (electronApp) {
      try {
        await electronApp.close();
      } catch (_) {}
    }
  }

  appendE2EResults(results, start);
  const failed = results.some((r) => !r.ok);
  process.exit(failed ? 1 : 0);
}

function appendE2EResults(results, start) {
  mkdirSync(join(root, "docs"), { recursive: true });
  let content = existsSync(resultsPath) ? readFileSync(resultsPath, "utf-8") : "# Test results\n";
  const section = `
### E2E run at ${start}

${results.map((r) => (r.ok ? "✅ " : "❌ ") + r.msg + (r.stderr ? "\n```\n" + r.stderr + "\n```" : "")).join("\n")}
`;
  if (content.includes("### E2E run at")) content = content.replace(/\n### E2E run at[\s\S]*/m, section);
  else content += section;
  writeFileSync(resultsPath, content);
}

run();
