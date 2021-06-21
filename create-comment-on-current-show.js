import core from "@actions/core";
import { Octokit } from "@octokit/core";
import { paginateRest } from "@octokit/plugin-paginate-rest";
import dayjs from "dayjs";
import customParseFormat from "dayjs/plugin/customParseFormat.js";
import utc from "dayjs/plugin/utc.js";
import timezone from "dayjs/plugin/timezone.js";

import { twitterRequest } from "./lib/twitter-request.js";

dayjs.extend(customParseFormat);
dayjs.extend(utc);
dayjs.extend(timezone);

// Create Octokit constructor with .paginate API and custom user agent
const MyOctokit = Octokit.plugin(paginateRest).defaults({
  userAgent: "gr2m-helpdesk",
});
const octokit = new MyOctokit({
  auth: process.env.GITHUB_TOKEN,
});

// load open issues with the `show` label
const showIssues = await octokit.paginate("GET /repos/{owner}/{repo}/issues", {
  owner: "gr2m",
  repo: "helpdesk",
  labels: "show",
  state: "open",
  per_page: 100,
});

const currentShowIssue = showIssues.find((issue) => {
  const dayString = issue.body
    .match(/📅.*/)
    .pop()
    .replace(/📅\s*/, "")
    .replace(/^\w+, /, "")
    .trim();
  const timeString = issue.body
    .match(/🕐[^(]+/)
    .pop()
    .replace(/🕐\s*/, "")
    .replace("Pacific Time", "")
    .trim();

  // workaround: cannot parse "June 3, 2021 1:00pm" but can parse "June 3, 2021 12:00pm"
  // workaround: cannot set default timezone, so parse the date/time string first, then use `.tz()` with the expected date/time format
  const timeStringWithoutAmPm = timeString.replace(/(am|pm)\b/, "");
  const tmp = dayjs(
    [dayString, timeStringWithoutAmPm].join(" "),
    // "MMMM D, YYYY H:mma", // see workaround
    "MMMM D, YYYY H:mm",
    true
  );

  let time = dayjs.tz(tmp.format("YYYY-MM-DD HH:mm"), "America/Los_Angeles");

  const showIsWithinRange =
    time < dayjs().add(15, "minutes") && time > dayjs().subtract(15, "minutes");
  return showIsWithinRange;
});

if (!currentShowIssue) {
  core.setFailed("No current issue found to comment on");
  process.exit(1);
}

const [, , title, , guest] = currentShowIssue.title.split(/ (- |with @)/g);

const currentShow = {
  title,
  number: currentShowIssue.number,
  issue: currentShowIssue,
  guest,
  url: currentShowIssue.html_url,
};

// add comment on issue
const {
  data: { html_url: commentUrl },
} = await octokit.request(
  "POST /repos/{owner}/{repo}/issues/{issue_number}/comments",
  {
    owner: "gr2m",
    repo: "helpdesk",
    issue_number: currentShow.number,
    body: "I'm now live on https://twitch.tv/gregorcodes\n\nSorry for the double comment, I'm just testing",
  }
);
console.log("Comment created at %s", commentUrl);

// Tweet out that the show is live:
const auth = {
  consumerKey: process.env.TWITTER_CONSUMER_KEY,
  consumerSecret: process.env.TWITTER_CONSUMER_SECRET,
  accessTokenKey: process.env.TWITTER_ACCESS_TOKEN_KEY,
  accessTokenSecret: process.env.TWITTER_ACCESS_TOKEN_SECRET,
};

const tweetText = `🔴  Now live at https://twitch.tv/gregorcodes

💁🏻‍♂️  ${currentShow.title}

(sorry for the double tweet, I'm testing)

${currentShow.url}`;

const data = await twitterRequest(`POST statuses/update.json`, {
  subdomain: "api",
  version: 1.1,
  auth,
  status: tweetText,
});

console.log("Tweeted at https://twitter.com/gr2m/status/%s", data.id_str);

// update TODOs in issue
const {
  data: { html_url: issueUrl },
} = await octokit.request("PATCH /repos/{owner}/{repo}/issues/{issue_number}", {
  owner: "gr2m",
  repo: "helpdesk",
  issue_number: currentShow.number,
  body: currentShow.issue.body
    .replace(/- \[ \] <!-- todo:start-tweet --> ([^\n]+)/, "- [x] $1")
    .replace(/- \[ \] <!-- todo:issue-comment --> ([^\n]+)/, "- [x] $1"),
});

console.log("TODO in issue updated: %s", issueUrl);
