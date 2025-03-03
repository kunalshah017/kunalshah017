const { config } = require("dotenv");
config();
const fs = require("fs");

// Try multiple ways to get the function
let getFollowersModule = require("./helpers/getFollowers");
// If it's an object with a default property, use that
let getFollowers = typeof getFollowersModule === 'function' 
    ? getFollowersModule 
    : (getFollowersModule.default || getFollowersModule);

const { genFollowersHtml } = require("./helpers/genFollowersHtml");
const matchBetween = new RegExp(
  /(?<=<!-- FOLLOWER-LIST:START -->).*(?=<!-- FOLLOWER-LIST:END -->)/,
  "gs"
);
const file = fs.readFileSync("README.md");
const content = file.toString();
const doChanges = async () => {
  const followers = await getFollowers();
  const cards = genFollowersHtml(followers);
  const updatedFile = content.replace(matchBetween, cards);
  fs.writeFileSync("README.md", updatedFile);
};
doChanges();
