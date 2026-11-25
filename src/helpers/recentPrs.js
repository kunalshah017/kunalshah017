// Picks recent merged PRs for the README's "Recently Merged" list
const START = "<!-- recent-prs:start -->";
const END = "<!-- recent-prs:end -->";
// housekeeping PRs (releases, merges, CI) say nothing about the work
const NOISE = /^(release|merge|chore|ci|sync)\b/i;

const escape = (s) => s.replace(/[\\[\]<>*_`|]/g, (c) => `\\${c}`);

// items: GitHub search results; keeps the newest, at most `perRepo` from one repo
function pickPrs(items, limit = 6, perRepo = 2) {
  const perRepoCount = {};
  return items
    .filter((pr) => !NOISE.test(pr.title))
    .map((pr) => ({ ...pr, mergedAt: pr.pull_request?.merged_at || pr.closed_at, repo: pr.repository_url.split("/repos/")[1] }))
    .sort((a, b) => b.mergedAt.localeCompare(a.mergedAt))
    .filter((pr) => (perRepoCount[pr.repo] = (perRepoCount[pr.repo] || 0) + 1) <= perRepo)
    .slice(0, limit);
}

function formatPrs(prs) {
  return prs
    .map((pr) => {
      const date = new Date(pr.mergedAt).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" });
      return `- **[${pr.repo.split("/")[1]}](https://github.com/${pr.repo})** · [${escape(pr.title)}](${pr.html_url}) · ${date}`;
    })
    .join("\n");
}

function replaceList(readme, list) {
  const start = readme.indexOf(START);
  const end = readme.indexOf(END);
  if (start < 0 || end < start) throw new Error(`README needs ${START} and ${END} markers`);
  return `${readme.slice(0, start + START.length)}\n${list}\n${readme.slice(end)}`;
}

module.exports = { pickPrs, formatPrs, replaceList };
