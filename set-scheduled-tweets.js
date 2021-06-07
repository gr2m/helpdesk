import dotenv from "dotenv";
import { Octokit } from "@octokit/core";
import dayjs from "dayjs";
import customParseFormat from "dayjs/plugin/customParseFormat.js";
import utc from "dayjs/plugin/utc.js";
import timezone from "dayjs/plugin/timezone.js";

import { twitterRequest } from "./lib/twitter-request.js";

dotenv.config();

dayjs.extend(customParseFormat);
dayjs.extend(utc);
dayjs.extend(timezone);
dayjs.tz.setDefault("America/Los_Angeles");

const ANNOUNCEMENT_TWEET_TEMPLATE = `📯  Starting in 30 minutes

💁🏻‍♂️  {TITLE}
🔴  Watch live at https://twitch.tv/gregorcodes

{URL}`;

const LIVE_NOW_TWEET_TEMPLATE = `🔴  Now live at https://twitch.tv/gregorcodes

💁🏻‍♂️  {TITLE}

{URL}`;

setScheduledTweets().catch((error) => {
  console.error(error);
  process.exit(1);
});

async function setScheduledTweets() {
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
      const timeStringWithoutAmPm = timeString.replace(/(am|pm)\b/, "");
      let time = dayjs(
        [dayString, timeStringWithoutAmPm].join(" "),
        // "MMMM D, YYYY H:mma", // see workaround
        "MMMM D, YYYY H:mm",
        true
      );

      // see workaround above. Parsing am/pm is not working
      if (time.get("hour") < 8) {
        time = time.add(12, "hours");
      }

      if (time.toISOString() < dayjs().toISOString())
        // ignore open issues for shows that are in the past
        return;

      const [datetime, , title, , guest] = issue.title.split(/ (- |with @)/g);

      return {
        title,
        number: issue.number,
        scheduledAt: time.toISOString().replace(".000", ""),
        issue,
      };
    })
    .filter(Boolean);

  const auth = {
    consumerKey: process.env.TWITTER_CONSUMER_KEY,
    consumerSecret: process.env.TWITTER_CONSUMER_SECRET,
    accessTokenKey: process.env.TWITTER_ACCESS_TOKEN_KEY,
    accessTokenSecret: process.env.TWITTER_ACCESS_TOKEN_SECRET,
  };

  const data = await twitterRequest(
    `GET accounts/:account_id/scheduled_tweets`,
    {
      auth,
      account_id: process.env.TWITTER_ACCOUNT_ID,
    }
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

    console.log(`dayjs.tz.guess()`);
    console.log(dayjs.tz.guess());

    console.log(`scheduledShow.scheduledAt`);
    console.log(scheduledShow.scheduledAt);

    if (scheduledAnnouncementTweet) {
      console.log(`scheduledAnnouncementTweet.scheduledAt`);
      console.log(scheduledAnnouncementTweet.scheduledAt);
      console.log(`announcementScheduledAt`);
      console.log(announcementScheduledAt);

      if (
        scheduledAnnouncementTweet.scheduledAt !== announcementScheduledAt ||
        announcementText.trim() !== scheduledAnnouncementTweet.tweet.text.trim()
      ) {
        const options = {
          auth,
          account_id: process.env.TWITTER_ACCOUNT_ID,
          scheduled_tweet_id: scheduledAnnouncementTweet.tweet.id_str,
          scheduled_at: announcementScheduledAt,
          text: announcementText,
        };
        await twitterRequest(
          `PUT accounts/:account_id/scheduled_tweets/:scheduled_tweet_id`,
          options
        );

        console.log("Announcement tweet updated");
      } else {
        console.log("Announcement tweet is already set");
      }
    } else {
      const options = {
        auth,
        account_id: process.env.TWITTER_ACCOUNT_ID,
        scheduled_at: announcementScheduledAt,
        text: announcementText,
        as_user_id: process.env.TWITTER_USER_ID,
      };
      await twitterRequest(
        `POST accounts/:account_id/scheduled_tweets`,
        options
      );
      console.log("Announcement tweet scheduled.");
    }

    if (scheduledLiveNowTweet) {
      console.log(`scheduledLiveNowTweet.scheduledAt`);
      console.log(scheduledLiveNowTweet.scheduledAt);
      console.log(`liveNowScheduledAt`);
      console.log(liveNowScheduledAt);

      if (
        scheduledLiveNowTweet.scheduledAt !== liveNowScheduledAt ||
        liveNowText.trim() !== scheduledLiveNowTweet.tweet.text.trim()
      ) {
        const options = {
          auth,
          account_id: process.env.TWITTER_ACCOUNT_ID,
          scheduled_tweet_id: scheduledLiveNowTweet.tweet.id_str,
          scheduled_at: liveNowScheduledAt,
          text: liveNowText,
        };
        await twitterRequest(
          `PUT accounts/:account_id/scheduled_tweets/:scheduled_tweet_id`,
          options
        );

        console.log("Live now tweet updated");
      } else {
        console.log("Live now tweet is already set");
      }
    } else {
      const options = {
        auth,
        account_id: process.env.TWITTER_ACCOUNT_ID,
        scheduled_at: liveNowScheduledAt,
        text: liveNowText,
        as_user_id: process.env.TWITTER_USER_ID,
      };
      await twitterRequest(
        `POST accounts/:account_id/scheduled_tweets`,
        options
      );
      console.log("Live tweet scheduled.");
    }
  }

  for (const scheduledTweet of scheduledTweets) {
    const scheduledShow = scheduledFutureShows.find(
      ({ number }) => number === scheduledTweet.showIssueNr
    );

    if (!scheduledShow) {
      await twitterRequest(
        "PUT accounts/:account_id/scheduled_tweets/:scheduled_tweet_id",
        {
          auth,
          account_id: process.env.TWITTER_ACCOUNT_ID,
          scheduled_tweet_id: scheduledTweet.tweet.id_str,
        }
      );
      console.log("tweet deleted: %s", scheduledTweet.tweet.text);
    }
  }

  console.log("done.");
}
