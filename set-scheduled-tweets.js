import { promisify } from "util";

import Twitter from "twitter";
import dotenv from "dotenv";
import { Octokit } from "@octokit/core";
import dayjs from "dayjs";
import customParseFormat from "dayjs/plugin/customParseFormat.js";

dayjs.extend(customParseFormat);
dotenv.config();

const ANNOUNCEMENT_TWEET = `📯  Starting in 30 minutes

💁🏻  Automatically manage scheduled tweets for my Helpdesk shows using GitHub Actions
🔴  Watch live at https://twitch.tv/gregorcodes

{URL}`;

setScheduledTweets({
  status: process.env.TEXT,
}).then(console.log, (error) => {
  console.error(error);
  process.exit(1);
});

async function setScheduledTweets(options) {
  const octokit = new Octokit({
    auth: process.env.GITHUB_TOKEN,
  });

  const { data: showIssues } = await octokit.request(
    "GET /repos/{owner}/{repo}/issues",
    {
      owner: "gr2m",
      repo: "helpdesk",
      labels: "show",
      state: "open",
    }
  );

  const scheduledFutureShows = showIssues
    .map((issue) => {
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

      // Monday, May 17th, 2021 12:00pm
      const time = dayjs(
        [dayString, timeString].join(" "),
        "MMMM D, YYYY H:mma",
        true
      );

      // ignore open issues for shows that are in the past
      if (time.toISOString() < dayjs().toISOString()) return;

      return {
        number: issue.number,
        scheduledAt: time.toISOString(),
        issue,
      };
    })
    .filter(Boolean);

  const twitter = new Twitter({
    consumer_key: process.env.TWITTER_CONSUMER_KEY,
    consumer_secret: process.env.TWITTER_CONSUMER_SECRET,
    access_token_key: process.env.TWITTER_ACCESS_TOKEN_KEY,
    access_token_secret: process.env.TWITTER_ACCESS_TOKEN_SECRET,
  });

  const getScheduledTweets = promisify(twitter.get).bind(twitter);

  const { data } = await getScheduledTweets(
    `https://ads-api.twitter.com/9/accounts/${process.env.TWITTER_ACCOUNT_ID}/scheduled_tweets`
  );

  const scheduledTweets = data
    .map((tweet) => {
      if (tweet.completed_at) return;

      const showUrl = tweet.text.split("\n").pop();
      if (!/gr2m\/helpdesk\/issues\/\d+/.test(showUrl)) return;

      const type = /Starting in 30 minutes/.test(tweet.text)
        ? "announcement"
        : "live_now";

      return {
        tweet,
        type,
        scheduledAt: dayjs(tweet.scheduled_at).toISOString(),
        showIssueNr: Number(showUrl.split("/").pop()),
      };
    })
    .filter(Boolean);

  for (const scheduledShow of scheduledFutureShows) {
    const scheduledAnnouncementTweet = scheduledTweets.find(
      (scheduledTweet) => {
        return (
          scheduledTweet.showIssueNr === scheduledShow.number &&
          scheduledTweet.type === "announcement"
        );
      }
    );
    const scheduledLiveNowTweet = scheduledTweets.find((scheduledTweet) => {
      return (
        scheduledTweet.showIssueNr === scheduledShow.number &&
        scheduledTweet.type === "live_now"
      );
    });

    console.log('show: "%s"', scheduledShow.issue.title);

    if (scheduledAnnouncementTweet) {
      console.log(
        "TODO: update scheduled_at and text for announcement tweet in case it changed"
      );
    } else {
      console.log("TODO: schedule announcement tweet");
    }

    if (scheduledLiveNowTweet) {
      console.log(
        "TODO: update scheduled_at and text for live now tweet in case it changed"
      );
    } else {
      console.log("TODO: schedule live now tweet");
    }
  }

  for (const scheduledTweet of scheduledTweets) {
    const scheduledShow = scheduledFutureShows.find(
      ({ number }) => number === scheduledTweet.showIssueNr
    );

    if (!scheduledShow) {
      console.log("TODO: delete scheduled tweet (%j)", scheduledTweet);
    }
  }
}

console.log("done.");
