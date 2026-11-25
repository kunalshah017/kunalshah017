// Builds the dithered contribution heatmap and the README's "Recently Merged" list from the GitHub API.
// Usage: GITHUB_TOKEN=... node src/contributions.js <cards dir>
// Writes <dir>/dark/contributions.svg and <dir>/light/contributions.svg, and rewrites the list in README.md.
const fs = require("fs");
const { genHeatmapSvg } = require("./helpers/genHeatmapSvg");
const { pickPrs, formatPrs, replaceList } = require("./helpers/recentPrs");

const USER = "kunalshah017";
const outDir = process.argv[2] || "dist";
const headers = { Authorization: `Bearer ${process.env.GITHUB_TOKEN}`, "User-Agent": "profile-cards" };

async function github(path, body) {
  const res = await fetch(`https://api.github.com${path}`, {
    method: body ? "POST" : "GET",
    headers,
    body: body && JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`GitHub API ${path}: ${res.status} ${await res.text()}`);
  return res.json();
}

async function main() {
  const query = `query($login: String!) { user(login: $login) { contributionsCollection { contributionCalendar {
    weeks { contributionDays { date contributionCount contributionLevel } } } } } }`;
  const { data, errors } = await github("/graphql", { query, variables: { login: USER } });
  if (errors) throw new Error(JSON.stringify(errors));
  const weeks = data.user.contributionsCollection.contributionCalendar.weeks;
  for (const theme of ["dark", "light"]) {
    fs.mkdirSync(`${outDir}/${theme}`, { recursive: true });
    fs.writeFileSync(`${outDir}/${theme}/contributions.svg`, genHeatmapSvg(weeks, theme));
    console.log(`Wrote ${outDir}/${theme}/contributions.svg`);
  }

  // public PRs merged into repos outside this account: team projects, hackathons, open source
  const q = encodeURIComponent(`is:pr is:merged is:public author:${USER} -user:${USER}`);
  const { items } = await github(`/search/issues?q=${q}&sort=updated&order=desc&per_page=50`);
  fs.writeFileSync("README.md", replaceList(fs.readFileSync("README.md", "utf8"), formatPrs(pickPrs(items))));
  console.log("Updated the Recently Merged list in README.md");
}

main().catch((err) => {
  console.error(err.message);
  process.exit(1);
});
