import axios from "axios";

const url = "https://api.github.com/user/followers";
const args = process.argv.slice(2);
const apiKey = args[0];

async function getFollowers(): Promise<any> {
  const { data } = await axios.get(url, {
    headers: {
      Authorization: `token ${apiKey}`,
    },
  });
  return data;
}

// Use both export methods to cover all bases
module.exports = getFollowers;
// Add this line to make TypeScript correctly recognize the exports
module.exports.default = getFollowers;
