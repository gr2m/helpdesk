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
  // load open issues with the `show` label
  const showIssues = await octokit.paginate(
    "GET /repos/{owner}/{repo}/issues",
    {
      owner: "gr2m",
      repo: "helpdesk",
      labels: "show",
      state: "open",
      per_page: 100,
    }
  );

  const currentShowIssue = showIssues.find((issue) => {
    const dayString = issue.body
      .match(/📅.*/)
      .pop()
      .replace(/📅\s*/, "")
      .replace(/^\w+, /, "")
      .trim();
    const timeString = issue.body
      .match(/🕐[^(\r\n]+/)
      .pop()
      .replace(/🕐\s*/, "")
      .replace("Pacific Time", "")
      .trim();

    // workaround: cannot parse "June 3, 2021 1:00pm" but can parse "June 3, 2021 12:00pm"
    // workaround: cannot set default timezone, so parse the date/time string first, then use `.tz()` with the expected date/time format
    let timeStringWithoutAmPm = timeString.replace(/(am|pm)\b/, "");

    let hours = parseInt(timeStringWithoutAmPm, 10);

    if (hours < 9) {
      timeStringWithoutAmPm = timeStringWithoutAmPm.replace(hours, hours + 12);
    }

    const tmp = dayjs(
      [dayString, timeStringWithoutAmPm].join(" "),
      // "MMMM D, YYYY H:mma", // see workaround
      "MMMM D, YYYY H:mm",
      true
    );

    let time = dayjs.tz(tmp.format("YYYY-MM-DD HH:mm"), "America/Los_Angeles");

    const showIsWithinRange =
      time < dayjs().add(5, "hours") && time > dayjs().subtract(15, "minutes");

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
