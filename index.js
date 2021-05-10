import { Octokit } from "@octokit/core";
import { paginateRest } from "@octokit/plugin-paginate-rest";
import { ReadmeBox } from "readme-box";

const MyOctokit = Octokit.plugin(paginateRest).defaults({
  userAgent: "gr2m-helpdesk/1.0.0",
});

const octokit = new MyOctokit({
  auth: process.env.GITHUB_TOKEN,
});

const issues = await octokit.paginate("GET /repos/{owner}/{repo}/issues", {
  owner: "gr2m",
  repo: "helpdesk",
  labels: "show",
  state: "all",
  per_page: 100,
});

const upcomingShows = [];
const pastShows = [];

for (const issue of issues) {
  const [datetime, , title, , guest] = issue.title.split(/ (- |with @)/g);

  if (issue.state === "open") {
    upcomingShows.push({
      datetime,
      title,
      guest,
      url: issue.html_url,
    });
  } else {
    pastShows.push({
      datetime,
      title,
      guest,
      url: issue.html_url,
    });
  }
}

const upcomingShowsText = upcomingShows
  .map(({ datetime, title, url, guest }) => {
    if (guest) {
      return `- ${datetime} — [${title}](${url}) with [${guest}](https://github.com/${guest.substr(
        1
      )})`;
    }

    return `- ${datetime} — [${title}](${url})`;
  })
  .join("\n");

const pastShowsText = pastShows
  .map(({ title, url, guest }) => {
    if (guest) {
      return `- [${title}](${url}) with [@${guest}](https://github.com/${guest})`;
    }

    return `- [${title}](${url})`;
  })
  .join("\n");

const markdown = `

## Upcoming shows

${upcomingShowsText}

## Past shows

${pastShowsText}

`;

await ReadmeBox.updateSection(markdown, {
  owner: "gr2m",
  repo: "helpdesk",
  token: process.env.GITHUB_TOKEN,
  section: "helpdesk-shows",
  branch: "main",
  message: "docs(README): update helpdesk shows",
});

console.log("README updated in gr2m/helpdesk");

await ReadmeBox.updateSection(markdown, {
  owner: "gr2m",
  repo: "gr2m",
  token: process.env.GITHUB_TOKEN,
  section: "helpdesk-shows",
  branch: "main",
  message: "docs(README): update helpdesk shows",
});

console.log("README updated in gr2m/gr2m");
