// Contribution heatmap in the banner's one-colour dither: each day is a 4x4 Bayer tile that fills up on busier days
const THEMES = {
  dark: { bg: "#161B22", border: "#30363D", track: "#21262D", ink: "#8B5CF6", text: "#E6EDF3", muted: "#9198A1" },
  light: { bg: "#F6F8FA", border: "#D1D9E0", track: "#E6EAEF", ink: "#8B5CF6", text: "#1F2328", muted: "#59636E" },
};
const BAYER = [[0, 8, 2, 10], [12, 4, 14, 6], [3, 11, 1, 9], [15, 7, 13, 5]];
// GitHub's own quartiles, so the busy days match its graph
const LEVELS = { NONE: 0, FIRST_QUARTILE: 1, SECOND_QUARTILE: 2, THIRD_QUARTILE: 3, FOURTH_QUARTILE: 4 };
const PX = 3;
const CELL = PX * 4;

const utc = (iso) => new Date(`${iso}T00:00:00Z`);
const dayMonth = (iso) => utc(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short", timeZone: "UTC" });

// days: [{ date, contributionCount }], oldest first, ending today
function summarizeCalendar(days) {
  let longest = 0;
  let run = 0;
  let best = days[0];
  for (const day of days) {
    run = day.contributionCount ? run + 1 : 0;
    longest = Math.max(longest, run);
    if (day.contributionCount > best.contributionCount) best = day;
  }
  // today can still be empty, so a streak that ran until yesterday is still current
  let i = days.length - 1;
  if (!days[i].contributionCount) i--;
  let current = 0;
  while (i >= 0 && days[i].contributionCount) {
    current++;
    i--;
  }
  const total = days.reduce((sum, day) => sum + day.contributionCount, 0);
  return { total, current, longest, best };
}

function tile(level, C) {
  const lit = [];
  for (let y = 0; y < 4; y++) {
    for (let x = 0; x < 4; x++) if (BAYER[y][x] < level * 4) lit.push(`M${x * PX} ${y * PX}h${PX}v${PX}h-${PX}z`);
  }
  const ink = lit.length ? `<path d="${lit.join("")}" fill="${C.ink}"/>` : "";
  return `<g id="l${level}"><rect width="${CELL}" height="${CELL}" fill="${C.track}"/>${ink}</g>`;
}

function genHeatmapSvg(weeks, theme = "dark", updated = new Date()) {
  const C = THEMES[theme];
  const W = 840;
  const H = 336;
  const days = weeks.flatMap((week) => week.contributionDays);
  const s = summarizeCalendar(days);
  const plural = (n, word) => `${n.toLocaleString("en-US")} ${word}${n === 1 ? "" : "s"}`;
  const updatedText = updated.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });

  const stats = [
    ["CONTRIBUTIONS", s.total.toLocaleString("en-US")],
    ["CURRENT STREAK", plural(s.current, "day")],
    ["LONGEST STREAK", plural(s.longest, "day")],
    ["BUSIEST DAY", `${s.best.contributionCount} on ${dayMonth(s.best.date)}`],
  ]
    .map(([label, value], i) => `<text x="${28 + i * 200}" y="108" class="label">${label}</text>
  <text x="${28 + i * 200}" y="140" class="value">${value}</text>`)
    .join("\n  ");

  const x0 = 60;
  const y0 = 196;
  const pitch = Math.min(14, (W - 28 - x0) / weeks.length);
  const cells = [];
  const months = [];
  let lastMonth = -1;
  let lastLabelX = -Infinity;
  weeks.forEach((week, wi) => {
    const x = x0 + wi * pitch;
    const month = utc(week.contributionDays[0].date).getUTCMonth();
    if (month !== lastMonth && x - lastLabelX > 30) {
      months.push(`<text x="${x.toFixed(1)}" y="${y0 - 8}" class="axis">${utc(week.contributionDays[0].date).toLocaleDateString("en-US", { month: "short", timeZone: "UTC" })}</text>`);
      lastLabelX = x;
    }
    lastMonth = month;
    for (const day of week.contributionDays) {
      const y = y0 + utc(day.date).getUTCDay() * pitch;
      cells.push(`<use href="#l${LEVELS[day.contributionLevel] ?? 0}" x="${x.toFixed(1)}" y="${y.toFixed(1)}"/>`);
    }
  });
  const weekdays = [[1, "Mon"], [3, "Wed"], [5, "Fri"]]
    .map(([row, name]) => `<text x="28" y="${y0 + row * pitch + CELL - 2}" class="axis">${name}</text>`)
    .join("");
  const legendX = W - 28 - 5 * 16 - 30;
  const legend = [0, 1, 2, 3, 4].map((level) => `<use href="#l${level}" x="${legendX + level * 16}" y="${H - 36}"/>`).join("");

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" role="img" aria-labelledby="title desc">
  <title id="title">Contributions</title>
  <desc id="desc">${s.total} contributions on GitHub in the last 12 months; current streak ${s.current} days, longest ${s.longest} days.</desc>
  <style>
    text { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Noto Sans', Helvetica, Arial, sans-serif; }
    .title { font-size: 20px; font-weight: 600; fill: ${C.text}; }
    .sub, .label, .axis { fill: ${C.muted}; }
    .sub { font-size: 13px; }
    .label { font-size: 11px; font-weight: 600; letter-spacing: 1px; }
    .value { font-size: 24px; font-weight: 600; fill: ${C.text}; }
    .axis { font-size: 11px; }
  </style>
  <defs>${[0, 1, 2, 3, 4].map((level) => tile(level, C)).join("")}</defs>
  <rect x="0.5" y="0.5" width="${W - 1}" height="${H - 1}" rx="6" fill="${C.bg}" stroke="${C.border}"/>
  <text x="28" y="44" class="title">Contributions</text>
  <text x="28" y="66" class="sub">Last 12 months on GitHub</text>
  <text x="${W - 28}" y="44" class="sub" text-anchor="end">updated ${updatedText}</text>
  ${stats}
  ${months.join("")}
  ${weekdays}
  <g shape-rendering="crispEdges">${cells.join("")}</g>
  <text x="${legendX - 8}" y="${H - 26}" class="axis" text-anchor="end">Less</text>
  <g shape-rendering="crispEdges">${legend}</g>
  <text x="${legendX + 5 * 16 + 4}" y="${H - 26}" class="axis">More</text>
</svg>
`;
}

module.exports = { genHeatmapSvg, summarizeCalendar };
