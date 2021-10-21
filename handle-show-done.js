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

if (process.env.GITHUB_ACTIONS && process.env.NODE_ENV !== "test") {
  // Create Octokit constructor with .paginate API and custom user agent
  const MyOctokit = Octokit.plugin(paginateRest).defaults({
    userAgent: "gr2m-helpdesk",
  });
  const octokit = new MyOctokit({
    auth: process.env.GITHUB_TOKEN,
  });
  run(process.env, core, octokit, twitterRequest);
}

/**
 *
 * @param {NodeJS.ProcessEnv} env
 * @param {core} core
 * @param {Octokit} octokit
 * @param {any} twitterRequest
 */
export async function run(env, core, octokit, twitterRequest) {
  const event = JSON.parse(await readFile(env.GITHUB_EVENT_PATH));
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
  core.info(`Comment created at ${commentUrl}`);

  // update twitter profile
  // https://developer.twitter.com/en/docs/twitter-api/v1/accounts-and-users/manage-account-settings/api-reference/post-account-update_profile
  const auth = {
    consumerKey: env.TWITTER_CONSUMER_KEY,
    consumerSecret: env.TWITTER_CONSUMER_SECRET,
    accessTokenKey: env.TWITTER_ACCESS_TOKEN_KEY,
    accessTokenSecret: env.TWITTER_ACCESS_TOKEN_SECRET,
  };

  await twitterRequest(`POST account/update_profile.json`, {
    auth,
    name: "Gregor",
    url: "https://github.com/gr2m/",
  });

  core.info("Twitter profile reverted to default");

  // update TODOs in issue
  await octokit.request("PATCH /repos/{owner}/{repo}/issues/{issue_number}", {
    owner: "gr2m",
    repo: "helpdesk",
    issue_number: currentShow.number,
    body: currentShow.issue.body.replace(
      /- \[ \] <!-- todo:twitter-profile-reset --> ([^\n]+)/,
      "- [x] <!-- todo:twitter-profile-reset --> $1 (https://twitter.com/gr2m)"
    ),
    state: "closed",
  });

  core.info(`TODOs in issue updated, issue closed: ${currentShow.url}`);
}
