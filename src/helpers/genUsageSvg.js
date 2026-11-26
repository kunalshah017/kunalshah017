// Colors follow GitHub's own dark and light themes, so the card sits naturally on the profile
const THEMES = {
  dark: {
    bg: "#161B22",
    border: "#30363D",
    track: "#21262D",
    accent: "#58A6FF",
    text: "#E6EDF3",
    muted: "#9198A1",
    agents: { claude: "#D97757", codex: "#58A6FF", opencode: "#9198A1" },
  },
  light: {
    bg: "#F6F8FA",
    border: "#D1D9E0",
    track: "#E6EAEF",
    accent: "#0969DA",
    text: "#1F2328",
    muted: "#59636E",
    agents: { claude: "#D97757", codex: "#0969DA", opencode: "#59636E" },
  },
};

const escape = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

function formatTokens(n) {
  if (n >= 1e9) return `${(n / 1e9).toFixed(2)}B`;
  if (n >= 1e6) return `${(n / 1e6).toFixed(1)}M`;
  if (n >= 1e3) return `${(n / 1e3).toFixed(1)}K`;
  return String(n);
}

function genUsageSvg(summary, theme = "dark", updated = new Date()) {
  const C = THEMES[theme];
  const W = 840;
  // the README's own heading names the card, so it opens with the subtitle
  const H = 268;
  const updatedText = updated.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });

  const stats = [
    ["TOKENS PROCESSED", formatTokens(summary.totalTokens), 26],
    ["API-EQUIVALENT COST", `$${Math.round(summary.totalCost).toLocaleString("en-US")}`, 26],
    ["ACTIVE DAYS", `${summary.activeDays}/${summary.days}`, 26],
    ["TOP MODEL", summary.topModel, 16],
  ]
    .map(([label, value, size], i) => {
      const x = 28 + i * 200;
      return `<text x="${x}" y="112" class="label">${label}</text>
  <text x="${x}" y="${size > 20 ? 144 : 138}" class="value" font-size="${size}">${escape(value)}</text>`;
    })
    .join("\n  ");

  const agents = summary.agents
    .slice(0, 4)
    .map((agent, i) => {
      const y = 196 + i * 24;
      const color = C.agents[agent.id] || C.accent;
      return `<text x="28" y="${y + 4}" class="agent">${escape(agent.name)}</text>
  <rect x="128" y="${y - 4}" width="220" height="8" rx="4" fill="${C.track}"/>
  <rect x="128" y="${y - 4}" width="${Math.max(2, agent.share * 220).toFixed(1)}" height="8" rx="4" fill="${color}"/>
  <text x="358" y="${y + 4}" class="pct">${agent.share < 0.01 ? "&lt;1" : Math.round(agent.share * 100)}%</text>`;
    })
    .join("\n  ");

  const chartX = 440;
  const chartW = W - 28 - chartX;
  const chartBottom = 252;
  const chartH = 70;
  const step = chartW / summary.daily.length;
  const max = Math.max(...summary.daily.map((d) => d.tokens), 1);
  const bars = summary.daily
    .map((day, i) => {
      const h = day.tokens ? Math.max(3, (day.tokens / max) * chartH) : 2;
      const fill = day.tokens ? C.accent : C.track;
      return `<rect x="${(chartX + i * step).toFixed(1)}" y="${(chartBottom - h).toFixed(1)}" width="${(step - 3).toFixed(1)}" height="${h.toFixed(1)}" rx="2" fill="${fill}"><title>${day.date}: ${formatTokens(day.tokens)} tokens</title></rect>`;
    })
    .join("\n  ");

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" role="img" aria-labelledby="title desc">
  <title id="title">AI Agent Usage</title>
  <desc id="desc">AI agent usage over the last ${summary.days} days: ${formatTokens(summary.totalTokens)} tokens across ${summary.agents.map((a) => a.name).join(", ")}.</desc>
  <style>
    text { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Noto Sans', Helvetica, Arial, sans-serif; }
    .sub, .label, .axis, .pct { fill: ${C.muted}; }
    .sub { font-size: 13px; }
    .label { font-size: 11px; font-weight: 600; letter-spacing: 1px; }
    .value { font-weight: 600; fill: ${C.text}; }
    .agent { font-size: 13px; font-weight: 600; fill: ${C.text}; }
    .pct { font-size: 12px; }
    .axis { font-size: 11px; }
  </style>
  <rect x="0.5" y="0.5" width="${W - 1}" height="${H - 1}" rx="6" fill="${C.bg}" stroke="${C.border}"/>
  <text x="28" y="42" class="sub">Coding agents I work with · last ${summary.days} days</text>
  <text x="${W - 28}" y="42" class="sub" text-anchor="end">updated ${updatedText}</text>
  <g transform="translate(0 -22)">
  ${stats}
  <text x="28" y="176" class="label">BY AGENT</text>
  ${agents}
  <text x="${chartX}" y="176" class="label">TOKENS PER DAY</text>
  ${bars}
  <text x="${chartX}" y="270" class="axis">${summary.days} days ago</text>
  <text x="${W - 28}" y="270" class="axis" text-anchor="end">today</text>
  </g>
</svg>
`;
}

module.exports = { genUsageSvg, formatTokens };
