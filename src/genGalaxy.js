// Generates the animated "AI agents orbiting my terminal" scene shown beside the intro.
// Transparent background, so it blends into GitHub's page in both themes. Usage: node src/genGalaxy.js
const fs = require("fs");

// drawn on a 480x340 canvas and shown 400px wide in the README
const W = 480;
const H = 340;
const CX = 240;
const CY = 170;
const ICON = 44;
const PX = 3; // art pixel size, matches the chunky dither of the section headers
const TILT = -18; // degrees, shared by the milky way band and the orbits

// 4x4 Bayer matrix: same ordered dithering as the headers, so the art stays stable while animating
const BAYER = [
  [0, 8, 2, 10],
  [12, 4, 14, 6],
  [3, 11, 1, 9],
  [15, 7, 13, 5],
].map((row) => row.map((v) => (v + 0.5) / 16));

const THEMES = {
  dark: {
    band: ["#16204A", "#1B2F66", "#3A2E6E", "#7A2A8C"],
    stars: ["#BDB4C8", "#5C9AF5", "#EE35F3", "#FFFFFF"],
    orbit: "#2A3A75",
    glow: "#EE35F3",
  },
  light: {
    band: ["#F1EAFA", "#E4D6F5", "#D3BEEE", "#C39BE6"],
    stars: ["#B620C9", "#1B51A1", "#7A2A8C", "#3A2E6E"],
    orbit: "#D9CBEE",
    glow: "#B620C9",
  },
};
const PLANET = ["#1B1440", "#3A2E6E", "#7A2A8C", "#C02BD0", "#EE35F3", "#F7B6FA"];

// [rx, ry, seconds per lap, agents spread evenly along it]; the inner orbit clears the planet, the outer one the canvas
const ORBITS = [
  [112, 68, 12, ["claude-code", "gemini-cli"]],
  [166, 96, 20, ["codex", "cursor", "github-copilot"]],
  [218, 124, 30, ["opencode", "herdr", "deepseek", "vscode"]],
];

// mulberry32: seeded so every run draws the same sky
function rng(seed) {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const px = (x, y) => `M${x} ${y}h${PX}v${PX}h-${PX}z`;

function milkyWay(theme) {
  const paths = theme.band.map(() => []);
  const a = (TILT * Math.PI) / 180;
  for (let y = 0; y < H; y += PX) {
    for (let x = 0; x < W; x += PX) {
      const dx = x - CX;
      const dy = y - CY;
      const across = -dx * Math.sin(a) + dy * Math.cos(a); // distance from the band's center line
      const along = dx * Math.cos(a) + dy * Math.sin(a);
      const clumps =
        0.5 + 0.2 * Math.sin(x * 0.045 + y * 0.02) + 0.15 * Math.sin(x * 0.013 - y * 0.07) + 0.15 * Math.sin(x * 0.11 + y * 0.09);
      // fade toward the image border too, so the transparent scene never shows a rectangular edge
      const edgeFade = Math.min(1, Math.min(x, W - x, y, H - y) / 60) * Math.max(0, 1 - (Math.abs(along) / (W * 0.55)) ** 4);
      const density = Math.exp(-((across / 56) ** 2)) * clumps * edgeFade * 0.8;
      const threshold = BAYER[(y / PX) % 4][(x / PX) % 4];
      if (density > threshold) {
        paths[Math.min(theme.band.length - 1, Math.floor(density * theme.band.length))].push(px(x, y));
      }
    }
  }
  return paths.map((d, i) => (d.length ? `<path fill="${theme.band[i]}" d="${d.join("")}"/>` : "")).join("\n  ");
}

function stars(theme) {
  const rand = rng(17);
  const out = [];
  for (let i = 0; i < 95; i++) {
    const x = Math.floor((rand() * W) / PX) * PX;
    const y = Math.floor((rand() * H) / PX) * PX;
    if (Math.hypot(x - CX, y - CY) < 60) continue; // keep the planet clear
    const color = theme.stars[Math.floor(rand() * theme.stars.length)];
    const sparkle = rand() < 0.15; // a few bigger pixel-plus stars
    const d = sparkle ? px(x, y) + px(x - PX, y) + px(x + PX, y) + px(x, y - PX) + px(x, y + PX) : px(x, y);
    const twinkle = rand() < 0.4
      ? ` class="tw" style="animation-duration:${(2 + rand() * 3).toFixed(1)}s;animation-delay:-${(rand() * 4).toFixed(1)}s"`
      : "";
    out.push(`<path fill="${color}" d="${d}"${twinkle}/>`);
  }
  return out.join("\n  ");
}

function planet() {
  const R = 40;
  const light = [-0.5, -0.6, 0.62];
  const norm = Math.hypot(...light);
  const paths = PLANET.map(() => []);
  for (let y = CY - R; y < CY + R; y += PX) {
    for (let x = CX - R; x < CX + R; x += PX) {
      const nx = (x + PX / 2 - CX) / R;
      const ny = (y + PX / 2 - CY) / R;
      const r2 = nx * nx + ny * ny;
      if (r2 > 1) continue;
      const nz = Math.sqrt(1 - r2);
      const shade = Math.max(0, (nx * light[0] + ny * light[1] + nz * light[2]) / norm) * 0.85 + 0.1;
      const level = shade * (PLANET.length - 1) + BAYER[((y - CY + R) / PX) % 4][((x - CX + R) / PX) % 4] - 0.5;
      paths[Math.max(0, Math.min(PLANET.length - 1, Math.round(level)))].push(px(x, y));
    }
  }
  return paths.map((d, i) => (d.length ? `<path fill="${PLANET[i]}" d="${d.join("")}"/>` : "")).join("\n  ");
}

// ">" and a blinking "_" drawn in art pixels on the planet
function prompt() {
  const caret = ["1....", ".1...", "..1..", ".1...", "1...."];
  const ox = CX - 17;
  const oy = CY - 7;
  const d = [];
  caret.forEach((row, r) => [...row].forEach((c, col) => c === "1" && d.push(px(ox + col * PX, oy + r * PX))));
  return `<path fill="#FFFFFF" d="${d.join("")}"/>
  <rect class="cur" x="${ox + 6 * PX}" y="${oy + 4 * PX}" width="${4 * PX}" height="${PX}" fill="#FFFFFF"/>`;
}

function ellipsePath(rx, ry) {
  const a = (TILT * Math.PI) / 180;
  const x1 = CX + rx * Math.cos(a);
  const y1 = CY + rx * Math.sin(a);
  const x2 = CX - rx * Math.cos(a);
  const y2 = CY - rx * Math.sin(a);
  return `M${x1.toFixed(1)} ${y1.toFixed(1)}A${rx} ${ry} ${TILT} 1 1 ${x2.toFixed(1)} ${y2.toFixed(1)}A${rx} ${ry} ${TILT} 1 1 ${x1.toFixed(1)} ${y1.toFixed(1)}`;
}

// reuse the tech-stack tiles, with their ids made unique inside this file
function tile(name, theme) {
  const svg = fs.readFileSync(`${__dirname}/images/icons/${name}-${theme}.svg`, "utf8").trim();
  const inner = svg.replace(/^<svg[^>]*>/, "").replace(/<\/svg>\s*$/, "");
  return inner.replace(/id="(\w+)"/g, `id="${name}-$1"`).replace(/url\(#(\w+)\)/g, `url(#${name}-$1)`);
}

function genGalaxy(themeName) {
  const theme = THEMES[themeName];
  const orbits = ORBITS.map(
    ([rx, ry]) =>
      `<ellipse cx="${CX}" cy="${CY}" rx="${rx}" ry="${ry}" transform="rotate(${TILT} ${CX} ${CY})" fill="none" stroke="${theme.orbit}" stroke-dasharray="3 5"/>`,
  ).join("\n  ");
  // outer orbits first, so inner agents pass in front
  const agents = [...ORBITS]
    .reverse()
    .flatMap(([rx, ry, dur, names]) =>
      names.map(
        (name, i) => `<g>
    <animateMotion dur="${dur}s" begin="-${((dur * i) / names.length).toFixed(2)}s" repeatCount="indefinite" path="${ellipsePath(rx, ry)}"/>
    <circle r="${ICON / 2 + 2}" fill="${theme.glow}" opacity="0.25" filter="url(#blur)"/>
    <svg x="${-ICON / 2}" y="${-ICON / 2}" width="${ICON}" height="${ICON}" viewBox="0 0 256 256">${tile(name, themeName)}</svg>
  </g>`,
      ),
    )
    .join("\n  ");

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" role="img" aria-labelledby="title">
  <title id="title">AI coding agents orbiting my terminal in the Milky Way</title>
  <style>
    .tw { animation: tw 3s ease-in-out infinite; }
    .cur { animation: blink 1s steps(1) infinite; }
    .shoot { animation: shoot 9s linear infinite; opacity: 0; }
    @keyframes tw { 50% { opacity: 0.15; } }
    @keyframes blink { 50% { opacity: 0; } }
    @keyframes shoot {
      0% { transform: translate(460px, 24px); opacity: 0; }
      2% { opacity: 1; }
      12% { transform: translate(310px, 100px); opacity: 0; }
      100% { transform: translate(310px, 100px); opacity: 0; }
    }
  </style>
  <defs>
    <filter id="blur" x="-1" y="-1" width="3" height="3"><feGaussianBlur stdDeviation="5"/></filter>
    <radialGradient id="atmo"><stop offset="0.6" stop-color="${theme.glow}" stop-opacity="0.35"/><stop offset="1" stop-color="${theme.glow}" stop-opacity="0"/></radialGradient>
    <linearGradient id="tail" x1="0" x2="1"><stop stop-color="${theme.stars[3]}" stop-opacity="0"/><stop offset="1" stop-color="${theme.stars[3]}"/></linearGradient>
  </defs>
  ${milkyWay(theme)}
  ${stars(theme)}
  <g class="shoot"><path d="M0 0l24 -12" stroke="url(#tail)" stroke-width="2"/></g>
  ${orbits}
  <circle cx="${CX}" cy="${CY}" r="62" fill="url(#atmo)"/>
  ${planet()}
  ${prompt()}
  ${agents}
</svg>
`;
}

for (const theme of ["dark", "light"]) {
  const out = `${__dirname}/images/galaxy-${theme}.svg`;
  fs.writeFileSync(out, genGalaxy(theme));
  console.log(`Wrote ${out}`);
}
