const axios = require("axios");

// shortcut: first 100 followers only, paginate past 100
const url = "https://api.github.com/user/followers?per_page=100";
const args = process.argv.slice(2);
const apiKey = args[0];

async function getFollowers() {
  const { data } = await axios.get(url, {
    headers: {
      Authorization: `token ${apiKey}`,
    },
  });
  return data;
}

module.exports = getFollowers;
