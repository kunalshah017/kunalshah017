const axios = require("axios");

const url = "https://api.github.com/user/followers";
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
