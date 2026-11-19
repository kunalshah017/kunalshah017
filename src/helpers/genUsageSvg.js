// Colors come from the profile banner; light mode uses darker shades for contrast on white
const THEMES = {
  dark: {
    bg: "#07122E",
    border: "#1D2A5A",
    track: "#16204A",
    purple: "#EE35F3",
    blue: "#5C9AF5",
    text: "#E6E1F0",
    muted: "#8B93B8",
    agents: { claude: "#D97757", codex: "#7A9DFF", opencode: "#BDB4C8" },
  },
  light: {
    bg: "#FCFAFF",
    border: "#E7DDF3",
    track: "#EEE6F7",
    purple: "#B620C9",
    blue: "#1B51A1",
    text: "#1F1A2E",
    muted: "#6B6485",
    agents: { claude: "#D97757", codex: "#3941FF", opencode: "#4B4B4B" },
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
  const H = 290;
  const updatedText = updated.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });

  const stats = [
    ["TOKENS PROCESSED", formatTokens(summary.totalTokens), C.text, 26],
    ["SALARY (API VALUE)", `$${Math.round(summary.totalCost).toLocaleString("en-US")}`, C.purple, 26],
    ["DAYS ON SHIFT", `${summary.activeDays}/${summary.days}`, C.blue, 26],
    ["STAR INTERN MODEL", summary.topModel, C.text, 16],
  ]
    .map(([label, value, color, size], i) => {
      const x = 28 + i * 200;
      return `<text x="${x}" y="112" class="label">${label}</text>
  <text x="${x}" y="${size > 20 ? 144 : 138}" class="value" fill="${color}" font-size="${size}">${escape(value)}</text>`;
    })
    .join("\n  ");

  const agents = summary.agents
    .slice(0, 4)
    .map((agent, i) => {
      const y = 196 + i * 24;
      const color = C.agents[agent.id] || C.purple;
      return `<text x="28" y="${y + 4}" class="agent">${escape(agent.name)}</text>
  <rect x="128" y="${y - 4}" width="220" height="8" rx="4" fill="${C.track}"/>
  <rect x="128" y="${y - 4}" width="${Math.max(2, agent.share * 220).toFixed(1)}" height="8" rx="4" fill="${color}" class="share" style="animation-delay:${0.2 + i * 0.15}s"/>
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
      const fill = day.tokens ? "url(#barGradient)" : C.track;
      return `<rect x="${(chartX + i * step).toFixed(1)}" y="${(chartBottom - h).toFixed(1)}" width="${(step - 3).toFixed(1)}" height="${h.toFixed(1)}" rx="2" fill="${fill}" class="bar" style="animation-delay:${(i * 0.02).toFixed(2)}s"><title>${day.date}: ${formatTokens(day.tokens)} tokens</title></rect>`;
    })
    .join("\n  ");

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" role="img" aria-labelledby="title desc">
  <title id="title">Intern Timesheet</title>
  <desc id="desc">AI agent usage over the last ${summary.days} days: ${formatTokens(summary.totalTokens)} tokens across ${summary.agents.map((a) => a.name).join(", ")}.</desc>
  <style>
    text { font-family: 'Segoe UI', Ubuntu, 'Helvetica Neue', sans-serif; }
    .title { font-size: 22px; font-weight: 700; fill: ${C.purple}; }
    .sub, .label, .axis, .pct { fill: ${C.muted}; }
    .sub { font-size: 13px; }
    .label { font-size: 11px; font-weight: 600; letter-spacing: 1px; }
    .value { font-weight: 700; }
    .agent { font-size: 13px; font-weight: 600; fill: ${C.text}; }
    .pct { font-size: 12px; }
    .axis { font-size: 11px; }
    .bar { transform-box: fill-box; transform-origin: bottom; animation: grow 0.6s ease-out both; }
    .share { transform-box: fill-box; transform-origin: left; animation: grow-x 0.8s ease-out both; }
    @keyframes grow { from { transform: scaleY(0); } }
    @keyframes grow-x { from { transform: scaleX(0); } }
  </style>
  <defs>
    <linearGradient id="barGradient" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="${C.purple}"/>
      <stop offset="1" stop-color="${C.blue}"/>
    </linearGradient>
  </defs>
  <rect x="0.5" y="0.5" width="${W - 1}" height="${H - 1}" rx="10" fill="${C.bg}" stroke="${C.border}"/>
  <text x="28" y="44" class="title">Intern Timesheet</text>
  <text x="28" y="66" class="sub">My AI interns shipping with me · last ${summary.days} days</text>
  <text x="${W - 28}" y="44" class="sub" text-anchor="end">updated ${updatedText}</text>
  ${stats}
  <text x="28" y="176" class="label">WHO DID THE WORK</text>
  ${agents}
  <text x="${chartX}" y="176" class="label">TOKENS PER DAY</text>
  ${bars}
  <text x="${chartX}" y="270" class="axis">${summary.days} days ago</text>
  <text x="${W - 28}" y="270" class="axis" text-anchor="end">today</text>
</svg>
`;
}

module.exports = { genUsageSvg, formatTokens };
