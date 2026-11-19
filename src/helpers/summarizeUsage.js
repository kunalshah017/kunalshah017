const AGENT_NAMES = { claude: "Claude Code", codex: "Codex", opencode: "OpenCode", antigravity: "Antigravity" };

const dayKey = (date) => date.toLocaleDateString("en-CA"); // YYYY-MM-DD in local time, like ccusage

// Turns `ccusage daily --by-agent --json` into the numbers the timesheet card shows
function summarizeUsage(report, days, today = new Date()) {
  const tokensByDay = {};
  for (let i = days - 1; i >= 0; i--) {
    tokensByDay[dayKey(new Date(today.getFullYear(), today.getMonth(), today.getDate() - i))] = 0;
  }
  const tokensByAgent = {};
  const tokensByModel = {};
  let totalCost = 0;

  for (const row of report.daily) {
    const date = row.period || row.date;
    if (!(date in tokensByDay)) continue;
    tokensByDay[date] += row.totalTokens;
    totalCost += row.totalCost || 0;
    for (const agent of row.agents || []) {
      tokensByAgent[agent.agent] = (tokensByAgent[agent.agent] || 0) + agent.totalTokens;
    }
    for (const model of row.modelBreakdowns || []) {
      const name = model.modelName.replace(/-\d{8}$/, "");
      const tokens = model.inputTokens + model.outputTokens + model.cacheCreationTokens + model.cacheReadTokens;
      tokensByModel[name] = (tokensByModel[name] || 0) + tokens;
    }
  }

  const daily = Object.entries(tokensByDay).map(([date, tokens]) => ({ date, tokens }));
  const totalTokens = daily.reduce((sum, day) => sum + day.tokens, 0);
  const agents = Object.entries(tokensByAgent)
    .filter(([, tokens]) => tokens > 0)
    .sort((a, b) => b[1] - a[1])
    .map(([id, tokens]) => ({ id, name: AGENT_NAMES[id] || id, tokens, share: tokens / totalTokens }));
  const topModel = Object.entries(tokensByModel).sort((a, b) => b[1] - a[1])[0];

  return {
    days,
    daily,
    totalTokens,
    totalCost,
    activeDays: daily.filter((day) => day.tokens > 0).length,
    agents,
    topModel: topModel ? topModel[0] : "-",
  };
}

module.exports = { summarizeUsage };
