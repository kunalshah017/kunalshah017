// Builds the "Intern Timesheet" card from local AI agent logs (Claude Code, Codex, OpenCode) via ccusage.
// Usage: node src/aiUsage.js [--push] [saved-ccusage-report.json]
const { execFileSync } = require("child_process");
const fs = require("fs");
const { summarizeUsage } = require("./helpers/summarizeUsage");
const { genUsageSvg } = require("./helpers/genUsageSvg");

const DAYS = 30;
const REPO = "kunalshah017/kunalshah017";

const args = process.argv.slice(2);
const reportFile = args.find((arg) => arg !== "--push");

const since = new Date(Date.now() - (DAYS - 1) * 864e5).toLocaleDateString("en-CA").replaceAll("-", "");
const json = reportFile
  ? fs.readFileSync(reportFile, "utf8")
  : execFileSync("npx", ["-y", "ccusage@20.0.51", "daily", "--by-agent", "--json", "--since", since], {
      encoding: "utf8",
      maxBuffer: 64 * 1024 * 1024,
    });

const summary = summarizeUsage(JSON.parse(json), DAYS);

for (const theme of ["dark", "light"]) {
  const out = `src/images/ai-usage-${theme}.svg`;
  const svg = genUsageSvg(summary, theme);
  fs.writeFileSync(out, svg);
  console.log(`Wrote ${out}`);

  // Commits straight to main through the API, so the local checkout and its branch don't matter
  if (args.includes("--push")) {
    let sha;
    try {
      sha = execFileSync("gh", ["api", `repos/${REPO}/contents/${out}`, "--jq", ".sha"], { encoding: "utf8" }).trim();
    } catch {
      // first upload: the file doesn't exist on main yet
    }
    execFileSync("gh", [
      "api", "-X", "PUT", `repos/${REPO}/contents/${out}`,
      "-f", "message=Updated AI usage",
      "-f", `content=${Buffer.from(svg).toString("base64")}`,
      ...(sha ? ["-f", `sha=${sha}`] : []),
    ]);
    console.log(`Pushed ${out} to ${REPO}`);
  }
}
