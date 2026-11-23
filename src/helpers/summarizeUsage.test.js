const test = require("node:test");
const assert = require("node:assert");
const { summarizeUsage } = require("./summarizeUsage");
const { genUsageSvg, formatTokens } = require("./genUsageSvg");

const breakdown = (modelName, tokens) => ({
  modelName,
  inputTokens: tokens,
  outputTokens: 0,
  cacheCreationTokens: 0,
  cacheReadTokens: 0,
});

// shape of `ccusage daily --by-agent --json`, newest day first
const report = {
  daily: [
    {
      period: "2026-11-19",
      totalTokens: 300,
      totalCost: 2.5,
      agents: [{ agent: "claude", totalTokens: 200 }, { agent: "codex", totalTokens: 100 }],
      modelBreakdowns: [breakdown("claude-opus-4-5-20251101", 200), breakdown("gpt-5", 100)],
    },
    {
      period: "2026-11-17",
      totalTokens: 100,
      totalCost: 0.5,
      agents: [{ agent: "claude", totalTokens: 100 }],
      modelBreakdowns: [breakdown("claude-opus-4-5-20251101", 100)],
    },
    // outside the 3-day window, must not count towards totals
    {
      period: "2026-11-01",
      totalTokens: 999,
      totalCost: 9,
      agents: [{ agent: "opencode", totalTokens: 999 }],
      modelBreakdowns: [breakdown("big-old-model", 999)],
    },
  ],
};

test("summarizeUsage fills gaps, ranks agents and strips model dates", () => {
  const s = summarizeUsage(report, 3, new Date(2026, 10, 19));
  assert.deepStrictEqual(s.daily, [
    { date: "2026-11-17", tokens: 100 },
    { date: "2026-11-18", tokens: 0 },
    { date: "2026-11-19", tokens: 300 },
  ]);
  assert.strictEqual(s.totalTokens, 400);
  assert.strictEqual(s.totalCost, 3);
  assert.strictEqual(s.activeDays, 2);
  assert.deepStrictEqual(s.agents.map((a) => [a.name, a.share]), [["Claude Code", 0.75], ["Codex", 0.25]]);
  assert.strictEqual(s.topModel, "claude-opus-4-5");
});

test("genUsageSvg renders escaped, well-formed text", () => {
  const s = summarizeUsage(report, 3, new Date(2026, 10, 19));
  s.topModel = "a<b&c";
  assert.match(genUsageSvg(s, "dark"), /a&lt;b&amp;c/);
  assert.match(genUsageSvg(s, "light"), /fill="#F6F8FA"/);
  assert.strictEqual(formatTokens(1_234_000_000), "1.23B");
});
