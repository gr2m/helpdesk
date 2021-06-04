import { promisify } from "util";

import Twitter from "twitter-lite";
import dotenv from "dotenv";
import { Octokit } from "@octokit/core";
import dayjs from "dayjs";
import customParseFormat from "dayjs/plugin/customParseFormat.js";

dayjs.extend(customParseFormat);
dotenv.config();

const ANNOUNCEMENT_TWEET_TEMPLATE = `📯  Starting in 30 minutes

💁🏻‍♂️  {TITLE}
🔴  Watch live at https://twitch.tv/gregorcodes

{URL}`;

const LIVE_NOW_TWEET_TEMPLATE = `🔴  Now live at https://twitch.tv/gregorcodes

💁🏻‍♂️  {TITLE}

{URL}`;

setScheduledTweets({}).then(console.log, (error) => {
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
      // workaround: cannot parse "June 3, 2021 1:00pm" but can parse "June 3, 2021 12:00pm"
      const timeStringWithAmPm = timeString.replace(/(am|pm)\b/, "");
      const time = dayjs(
        [dayString, timeStringWithAmPm].join(" "),
        // "MMMM D, YYYY H:mma", // see workaround
        "MMMM D, YYYY H:mm",
        true
      );

      // ignore open issues for shows that are in the past
      if (time.toISOString() < dayjs().toISOString()) return;

      const [datetime, , title, , guest] = issue.title.split(/ (- |with @)/g);

      return {
        title,
        number: issue.number,
        scheduledAt: time.toISOString().replace(".000", ""),
        issue,
      };
    })
    .filter(Boolean);

  const twitter = new Twitter({
    consumer_key: process.env.TWITTER_CONSUMER_KEY,
    consumer_secret: process.env.TWITTER_CONSUMER_SECRET,
    access_token_key: process.env.TWITTER_ACCESS_TOKEN_KEY,
    access_token_secret: process.env.TWITTER_ACCESS_TOKEN_SECRET,
    subdomain: "ads-api",
    version: 9,
  });

  const { data } = await twitter.get(
    `accounts/${process.env.TWITTER_ACCOUNT_ID}/scheduled_tweets`
  );

  const scheduledTweets = data
    .map((tweet) => {
      if (tweet.completed_at) return;

      const showUrl = tweet.text.trim().split("\n").pop();
      if (!/gr2m\/helpdesk\/issues\/\d+/.test(showUrl)) return;

      const type = /Starting in 30 minutes/.test(tweet.text)
        ? "announcement"
        : "live_now";

      return {
        tweet,
        type,
        scheduledAt: dayjs(tweet.scheduled_at)
          .toISOString()
          .replace(".000", ""),
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

    const announcementText = ANNOUNCEMENT_TWEET_TEMPLATE.replace(
      "{TITLE}",
      scheduledShow.title
    ).replace("{URL}", scheduledShow.issue.html_url);
    const announcementScheduledAt = dayjs(scheduledShow.scheduledAt)
      .subtract(30, "minutes")
      .toISOString()
      .replace(".000", "");

    const liveNowText = LIVE_NOW_TWEET_TEMPLATE.replace(
      "{TITLE}",
      scheduledShow.title
    ).replace("{URL}", scheduledShow.issue.html_url);
    const liveNowScheduledAt = scheduledShow.scheduledAt;

    if (scheduledAnnouncementTweet) {
      if (
        scheduledAnnouncementTweet.scheduledAt !== announcementScheduledAt ||
        announcementText.trim() !== scheduledAnnouncementTweet.tweet.text.trim()
      ) {
        await twitter.put(
          `accounts/${process.env.TWITTER_ACCOUNT_ID}/scheduled_tweets/${scheduledAnnouncementTweet.tweet.id}`,
          {
            scheduled_at: announcementScheduledAt,
            text: announcementText,
          }
        );

        console.log("Announcement tweet updated");
      } else {
        console.log("Announcement tweet is already set");
      }
    } else {
      await twitter.post(
        `accounts/${process.env.TWITTER_ACCOUNT_ID}/scheduled_tweets`,
        {
          scheduled_at: announcementScheduledAt,
          text: announcementText,
          as_user_id: process.env.TWITTER_USER_ID,
        }
      );
      console.log("Announcement tweet scheduled.");
    }

    if (scheduledLiveNowTweet) {
      if (
        scheduledLiveNowTweet.scheduledAt !== liveNowScheduledAt ||
        liveNowText !== scheduledLiveNowTweet.tweet.text.trim()
      ) {
        await updateScheduledTweet(
          `accounts/${process.env.TWITTER_ACCOUNT_ID}/scheduled_tweets/${scheduledLiveNowTweet.tweet.id}`,
          {
            scheduled_at: liveNowScheduledAt,
            text: liveNowText,
          }
        );

        console.log("Live now tweet updated");
      } else {
        console.log("Live now tweet is already set");
      }
    } else {
      await twitter.post(
        `accounts/${process.env.TWITTER_ACCOUNT_ID}/scheduled_tweets`,
        {
          scheduled_at: liveNowText,
          text: liveNowScheduledAt,
          as_user_id: process.env.TWITTER_USER_ID,
        }
      );
      console.log("Live tweet scheduled.");
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

  console.log("done.");
}
