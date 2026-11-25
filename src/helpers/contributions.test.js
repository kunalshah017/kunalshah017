const test = require("node:test");
const assert = require("node:assert");
const { summarizeCalendar, genHeatmapSvg } = require("./genHeatmapSvg");
const { pickPrs, formatPrs, replaceList } = require("./recentPrs");

const day = (date, contributionCount, contributionLevel = contributionCount ? "FIRST_QUARTILE" : "NONE") => ({ date, contributionCount, contributionLevel });

test("summarizeCalendar keeps a streak current when today is still empty", () => {
  const days = [day("2026-11-20", 2), day("2026-11-21", 0), day("2026-11-22", 1), day("2026-11-23", 5), day("2026-11-24", 3), day("2026-11-25", 0)];
  assert.deepStrictEqual(summarizeCalendar(days), { total: 11, current: 3, longest: 3, best: days[3] });
  assert.strictEqual(summarizeCalendar([...days, day("2026-11-26", 0)]).current, 0);
});

test("genHeatmapSvg draws one tile per day on its weekday row", () => {
  const weeks = [{ contributionDays: [day("2026-11-22", 1), day("2026-11-23", 9, "FOURTH_QUARTILE")] }];
  const svg = genHeatmapSvg(weeks, "light");
  assert.match(svg, /<use href="#l1" x="60.0" y="196.0"\/>/); // Sunday, first row
  assert.match(svg, /<use href="#l4" x="60.0" y="210.0"\/>/); // Monday, second row
  assert.match(svg, /9 on 23 Nov/);
});

const pr = (repo, title, merged) => ({ title, html_url: `https://github.com/${repo}/pull/1`, repository_url: `https://api.github.com/repos/${repo}`, pull_request: { merged_at: merged } });

test("pickPrs drops housekeeping, keeps the newest and caps each repo", () => {
  const items = [pr("a/x", "feat: one", "2026-11-01"), pr("a/x", "release: dev to main", "2026-11-09"), pr("a/x", "feat: two", "2026-11-03"),
    pr("a/x", "feat: three", "2026-11-05"), pr("b/y", "fix: [edge] <case>", "2026-11-04")];
  const picked = pickPrs(items, 6, 2);
  assert.deepStrictEqual(picked.map((p) => p.title), ["feat: three", "fix: [edge] <case>", "feat: two"]);
  assert.match(formatPrs(picked), /\[fix: \\\[edge\\\] \\<case\\>\]/);
  assert.strictEqual(replaceList("a\n<!-- recent-prs:start -->\nold\n<!-- recent-prs:end -->\nb", "new"),
    "a\n<!-- recent-prs:start -->\nnew\n<!-- recent-prs:end -->\nb");
});
