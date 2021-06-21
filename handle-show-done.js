import { readFile } from "fs/promises";

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

const event = JSON.parse(await readFile(process.env.GITHUB_EVENT_PATH));

// Create Octokit constructor with .paginate API and custom user agent
const MyOctokit = Octokit.plugin(paginateRest).defaults({
  userAgent: "gr2m-helpdesk",
});
const octokit = new MyOctokit({
  auth: process.env.GITHUB_TOKEN,
});

const currentShowIssue = event.issue;

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
    body: "Show is done for today, thank you all! Recording is coming up in a moment",
  }
);
console.log("Comment created at %s", commentUrl);

// update twitter profile
// https://developer.twitter.com/en/docs/twitter-api/v1/accounts-and-users/manage-account-settings/api-reference/post-account-update_profile
const auth = {
  consumerKey: process.env.TWITTER_CONSUMER_KEY,
  consumerSecret: process.env.TWITTER_CONSUMER_SECRET,
  accessTokenKey: process.env.TWITTER_ACCESS_TOKEN_KEY,
  accessTokenSecret: process.env.TWITTER_ACCESS_TOKEN_SECRET,
};

await twitterRequest(`POST account/update_profile.json`, {
  auth,
  name: "Gregor",
  url: "https://github.com/gr2m/",
});

console.log("Twitter profile reverted to default");
