// Draws the hackathon map: India as a purple dot matrix, pins on the host cities, one card per win.
// Usage: node src/hackathonMap.js   (writes src/images/hackathons-dark.svg and -light.svg)
const assert = require("assert");
const fs = require("fs");
const dots = require("./data/india-dots.json");

// venues from the events' Luma and Devfolio pages; at this scale one pin covers a city
const PLACES = [
  {
    name: "Panchkula",
    lon: 76.8551,
    lat: 30.6975,
    side: "right",
    wins: [["🥈", "Choices", "Feb 2024", "1st Runner-up · National Haryana Police Hackathon"]],
  },
  {
    name: "Mumbai",
    lon: 72.8777,
    lat: 19.076,
    side: "left",
    wins: [
      ["🥇", "Invocta", "Oct 2026", "Best Use of Gemma 4 & Best Open-Source AI · Hack Day × FAIR"],
      ["🎖️", "MelodyPay", "Jun 2026", "Consolation Prize · Monad Blitz Mumbai V3"],
      ["🥈", "Web3Ads", "Mar 2026", "1st Runner-up, HeyElsa AI track · ETHMumbai 2026"],
    ],
  },
  {
    name: "Online",
    wins: [
      ["🥇", "Myference", "2026", "Winner · Monad Blitz Online 2026"],
      ["🥇", "fheENV", "2026", "Winner · Fhenix Buildathon"],
    ],
  },
];

const THEMES = {
  dark: { bg: "#161B22", border: "#30363D", card: "#0D1117", land: "#262C36", ink: "#8B5CF6", text: "#E6EDF3", muted: "#9198A1" },
  light: { bg: "#F6F8FA", border: "#D1D9E0", card: "#FFFFFF", land: "#DDE3E9", ink: "#8B5CF6", text: "#1F2328", muted: "#59636E" },
};

const W = 840;
const PITCH_X = 5.2; // narrower than tall: a degree of longitude is shorter than one of latitude this far south
const PITCH_Y = 5.6;
const DOT = 3.6;
const CARD_X = 404;
const CARD_W = W - 28 - CARD_X;
const TOP = 96;
const MAP_X = 46; // room for the Mumbai label west of the coast

const escape = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

function genMapSvg(theme) {
  const C = THEMES[theme];

  // cards first: their stack sets the height, and the map is centred beside it
  const cards = [];
  let y = TOP;
  for (const place of PLACES) {
    const count = place.wins.length;
    cards.push(`<rect x="${CARD_X}" y="${y + 3}" width="7" height="7" fill="${C.ink}"/>
  <text x="${CARD_X + 14}" y="${y + 11}" class="label">${escape(place.name.toUpperCase())} · ${count} ${count === 1 ? "WIN" : "WINS"}</text>`);
    y += 22;
    for (const [medal, project, date, detail] of place.wins) {
      cards.push(`<g class="card"><rect x="${CARD_X}" y="${y}" width="${CARD_W}" height="44" rx="6" fill="${C.card}" stroke="${C.border}"/>
  <text x="${CARD_X + 12}" y="${y + 19}" class="project">${medal} ${escape(project)}</text>
  <text x="${CARD_X + CARD_W - 12}" y="${y + 19}" class="date" text-anchor="end">${escape(date)}</text>
  <text x="${CARD_X + 12}" y="${y + 35}" class="detail">${escape(detail)}</text></g>`);
      y += 52;
    }
    y += 8;
  }
  const H = y + 12;

  const mapH = dots.rows.length * PITCH_Y;
  const mapY = TOP + Math.max(0, (y - TOP - mapH) / 2);
  const project = (lon, lat) => [
    MAP_X + ((lon - dots.lon0) / dots.step) * PITCH_X + DOT / 2,
    mapY + ((dots.lat1 - lat) / dots.step) * PITCH_Y + DOT / 2,
  ];
  const paths = { I: [], L: [] };
  dots.rows.forEach((row, r) => {
    [...row].forEach((c, col) => {
      if (paths[c]) paths[c].push(`M${(MAP_X + col * PITCH_X).toFixed(1)} ${(mapY + r * PITCH_Y).toFixed(1)}h${DOT}v${DOT}h-${DOT}z`);
    });
  });

  const pins = PLACES.filter((p) => p.lon).map((p) => {
    const [x, yy] = project(p.lon, p.lat);
    const lx = p.side === "left" ? x - 16 : x + 16;
    const anchor = p.side === "left" ? "end" : "start";
    return `<circle cx="${x.toFixed(1)}" cy="${yy.toFixed(1)}" r="9" fill="none" stroke="${C.text}" stroke-width="1.5">
    <animate attributeName="r" values="9;22" dur="2.4s" repeatCount="indefinite"/>
    <animate attributeName="opacity" values="0.8;0" dur="2.4s" repeatCount="indefinite"/>
  </circle>
  <circle cx="${x.toFixed(1)}" cy="${yy.toFixed(1)}" r="9" fill="none" stroke="${C.text}" stroke-width="1.5"/>
  <circle cx="${x.toFixed(1)}" cy="${yy.toFixed(1)}" r="4.5" fill="${C.text}"/>
  <text x="${lx.toFixed(1)}" y="${(yy + 4).toFixed(1)}" class="pin" text-anchor="${anchor}">${escape(p.name)} <tspan class="pin-count">×${p.wins.length}</tspan></text>`;
  });

  const inPerson = PLACES.filter((p) => p.lon).reduce((n, p) => n + p.wins.length, 0);
  const online = PLACES.filter((p) => !p.lon).reduce((n, p) => n + p.wins.length, 0);

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" role="img" aria-labelledby="title desc">
  <title id="title">Hackathon Map</title>
  <desc id="desc">Map of India marking where the hackathon wins happened: ${PLACES.map((p) => `${p.name}: ${p.wins.map((w) => w[1]).join(", ")}`).join("; ")}.</desc>
  <style>
    text { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Noto Sans', Helvetica, Arial, sans-serif; }
    .title { font-size: 20px; font-weight: 600; fill: ${C.text}; }
    .sub, .label, .date, .detail, .pin-count { fill: ${C.muted}; }
    .sub { font-size: 13px; }
    .label { font-size: 11px; font-weight: 600; letter-spacing: 1px; }
    .project { font-size: 14px; font-weight: 600; fill: ${C.text}; }
    .date, .detail { font-size: 12px; }
    .pin { font-size: 13px; font-weight: 600; fill: ${C.text}; paint-order: stroke; stroke: ${C.bg}; stroke-width: 4px; stroke-linejoin: round; }
  </style>
  <rect x="0.5" y="0.5" width="${W - 1}" height="${H - 1}" rx="6" fill="${C.bg}" stroke="${C.border}"/>
  <text x="28" y="44" class="title">Hackathon Map</text>
  <text x="28" y="66" class="sub">${inPerson} wins in person across India, ${online} online</text>
  <g shape-rendering="crispEdges">
    <path d="${paths.L.join("")}" fill="${C.land}"/>
    <path d="${paths.I.join("")}" fill="${C.ink}"/>
  </g>
  ${pins.join("\n  ")}
  ${cards.join("\n  ")}
</svg>
`;
}

for (const theme of Object.keys(THEMES)) {
  const svg = genMapSvg(theme);
  assert.strictEqual(svg.split('class="card"').length - 1, PLACES.reduce((n, p) => n + p.wins.length, 0));
  fs.writeFileSync(`src/images/hackathons-${theme}.svg`, svg);
  console.log(`Wrote src/images/hackathons-${theme}.svg (${svg.length} bytes)`);
}
