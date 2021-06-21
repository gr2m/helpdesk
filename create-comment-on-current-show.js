import core from "@actions/core";
import { Octokit } from "@octokit/core";
import { paginateRest } from "@octokit/plugin-paginate-rest";
import dayjs from "dayjs";
import customParseFormat from "dayjs/plugin/customParseFormat.js";
import utc from "dayjs/plugin/utc.js";
import timezone from "dayjs/plugin/timezone.js";

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

  if (
    time < dayjs().add(15, "minutes") &&
    time > dayjs().subtract(15, "minutes")
  ) {
    return issue;
  }
});

if (!currentShowIssue) {
  core.setFailed("No current issue found to comment on");
}

const {
  data: { html_url: commentUrl },
} = await octokit.request(
  "POST /repos/{owner}/{repo}/issues/{issue_number}/comments",
  {
    owner: "gr2m",
    repo: "helpdesk",
    issue_number: currentShowIssue.number,
    body: "I'm now live on https://twitch.tv/gregorcodes",
  }
);
console.log("Comment created at %s", commentUrl);

// update todo in issue description
const {
  data: { body: issueBody },
} = await octokit.request("GET /repos/{owner}/{repo}/issues/{issue_number}", {
  owner: "gr2m",
  repo: "helpdesk",
  issue_number: currentShowIssue.number,
});

const {
  data: { html_url: issueUrl },
} = await octokit.request("PATCH /repos/{owner}/{repo}/issues/{issue_number}", {
  owner: "gr2m",
  repo: "helpdesk",
  issue_number: currentShowIssue.number,
  body: issueBody.replace(
    /- \[ \] <!-- todo:issue-comment --> ([^\n]+)/,
    "- [x] $1"
  ),
});

console.log("TODO in issue updated: %s", issueUrl);
