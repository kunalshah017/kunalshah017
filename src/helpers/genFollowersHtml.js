// Few rows and many columns: GitHub scrolls tables wider than the page sideways
const ROWS = 2;

function genFollowersHtml(followers) {
  const perRow = Math.ceil(followers.length / ROWS);
  let html = "\n<table>\n";
  followers.forEach((follower, index) => {
    const name = follower.login;
    const img = follower.avatar_url;
    if (index % perRow === 0) {
      if (index !== 0) {
        html += "  </tr>\n";
      }
      html += "  <tr>\n";
    }
    html += `
<td align="center">
     <a href="https://github.com/${name}">
       <img src="${img}" width="100px;" alt="${name}"/>
     </a>
     <br />
     <a href="https://github.com/${name}">${name}</a>
  </td>
    `;
  });
  html += "  </tr>\n</table>\n";
  return html;
}

module.exports = { genFollowersHtml };
