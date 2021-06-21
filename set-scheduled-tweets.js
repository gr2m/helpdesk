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

const ANNOUNCEMENT_TWEET_TEMPLATE = `📯  Starting in 30 minutes

💁🏻‍♂️  {TITLE}
🔴  Watch live at https://twitch.tv/gregorcodes

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

      // workaround: cannot parse "June 3, 2021 1:00pm" but can parse "June 3, 2021 12:00pm"
      // workaround: cannot set default timezone, so parse the date/time string first, then use `.tz()` with the expected date/time format
      const timeStringWithoutAmPm = timeString.replace(/(am|pm)\b/, "");
      const tmp = dayjs(
        [dayString, timeStringWithoutAmPm].join(" "),
        // "MMMM D, YYYY H:mma", // see workaround
        "MMMM D, YYYY H:mm",
        true
      );

      let time = dayjs.tz(
        tmp.format("YYYY-MM-DD HH:mm"),
        "America/Los_Angeles"
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

    console.log('show: "%s"', scheduledShow.issue.title);

    const announcementText = ANNOUNCEMENT_TWEET_TEMPLATE.replace(
      "{TITLE}",
      scheduledShow.title
    ).replace("{URL}", scheduledShow.issue.html_url);
    const announcementScheduledAt = dayjs(scheduledShow.scheduledAt)
      .subtract(30, "minutes")
      .toISOString()
      .replace(".000", "");

    if (scheduledAnnouncementTweet) {
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
