import dotenv from "dotenv";
import dayjs from "dayjs";
import customParseFormat from "dayjs/plugin/customParseFormat.js";

import { twitterRequest } from "./lib/twitter-request.js";

dayjs.extend(customParseFormat);
dotenv.config();

updateTwitterProfile().then(console.log, (error) => {
  console.error(error);
  process.exit(1);
});

async function updateTwitterProfile() {
  const auth = {
    consumerKey: process.env.TWITTER_CONSUMER_KEY,
    consumerSecret: process.env.TWITTER_CONSUMER_SECRET,
    accessTokenKey: process.env.TWITTER_ACCESS_TOKEN_KEY,
    accessTokenSecret: process.env.TWITTER_ACCESS_TOKEN_SECRET,
  };

  // https://developer.twitter.com/en/docs/twitter-api/v1/accounts-and-users/manage-account-settings/api-reference/post-account-update_profile
  await twitterRequest(`POST account/update_profile.json`, {
    auth,
    name: "🔴 Gregor is now live on twitch.tv/gregorcodes",
    url: "https://twitch.tv/gregorcodes",
  });

  console.log("done.");
}
