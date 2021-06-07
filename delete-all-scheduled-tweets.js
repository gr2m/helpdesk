import dotenv from "dotenv";
import dayjs from "dayjs";
import customParseFormat from "dayjs/plugin/customParseFormat.js";

import { twitterRequest } from "./lib/twitter-request.js";

dayjs.extend(customParseFormat);
dotenv.config();

deleteScheduledTweets({}).then(console.log, (error) => {
  console.error(error);
  process.exit(1);
});

async function deleteScheduledTweets(options) {
  const auth = {
    consumerKey: process.env.TWITTER_CONSUMER_KEY,
    consumerSecret: process.env.TWITTER_CONSUMER_SECRET,
    accessTokenKey: process.env.TWITTER_ACCESS_TOKEN_KEY,
    accessTokenSecret: process.env.TWITTER_ACCESS_TOKEN_SECRET,
  };

  const scheduledTweets = await twitterRequest(
    `GET accounts/:account_id/scheduled_tweets`,
    {
      auth,
      account_id: process.env.TWITTER_ACCOUNT_ID,
    }
  );

  for (const scheduledTweet of scheduledTweets) {
    await twitterRequest(
      "DELETE accounts/:account_id/scheduled_tweets/:scheduled_tweet_id",
      {
        auth,
        account_id: process.env.TWITTER_ACCOUNT_ID,
        scheduled_tweet_id: scheduledTweet.id_str,
      }
    );
    console.log("tweet deleted: %s", scheduledTweet.text);
  }

  console.log("done.");
}
