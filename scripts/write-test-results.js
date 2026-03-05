import { spawn } from "child_process";
import { writeFileSync, readFileSync, existsSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = fileURLToPath(new URL(".", import.meta.url));
const root = join(__dirname, "..");
const resultsPath = join(root, "docs", "test-results.md");

const child = spawn(process.execPath, ["--test", "test/geo.test.js"], {
  cwd: root,
  stdio: ["ignore", "pipe", "pipe"],
});
let stdout = "";
let stderr = "";
child.stdout.on("data", (c) => (stdout += c.toString()));
child.stderr.on("data", (c) => (stderr += c.toString()));
child.on("close", (code) => {
  const out = stdout + stderr;
  const section = `
## Unit test run — ${new Date().toISOString()}

\`\`\`
${out}
\`\`\`

**Exit code:** ${code}
`;
  let content = existsSync(resultsPath) ? readFileSync(resultsPath, "utf-8") : "# Test results\n";
  const marker = "## Unit test run —";
  if (content.includes(marker)) {
    const i = content.indexOf(marker);
    content = content.slice(0, i) + section.trimStart();
  } else {
    content += section;
  }
  writeFileSync(resultsPath, content);
  process.exit(code ?? 0);
});
