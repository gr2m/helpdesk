import crypto from "crypto";
import OAuth from "oauth-1.0a";
import dotenv from "dotenv";
import fetch from "node-fetch";

dotenv.config();

// EXAMPLE
//
// const request = twitterRequest.bind(null, {
//   subdomain: "ads-api",
//   version: 9,
//   auth: {
//     consumerKey: process.env.TWITTER_CONSUMER_KEY,
//     consumerSecret: process.env.TWITTER_CONSUMER_SECRET,
//     accessTokenKey: process.env.TWITTER_ACCESS_TOKEN_KEY,
//     accessTokenSecret: process.env.TWITTER_ACCESS_TOKEN_SECRET,
//   },
// });
//
// const scheduledTweets = await request(
//   "GET accounts/:account_id/scheduled_tweets",
//   {
//     account_id: process.env.TWITTER_ACCOUNT_ID,
//   }
// );
//
// await request(
//   "DELETE accounts/:account_id/scheduled_tweets/:scheduled_tweet_id",
//   {
//     account_id: process.env.TWITTER_ACCOUNT_ID,
//     scheduled_tweet_id: scheduledTweets[0].id_str, // 1394340865699504000
//   }
// );

function createOAuthClient({ key, secret }) {
  const client = OAuth({
    consumer: { key, secret },
    signature_method: "HMAC-SHA1",
    hash_function(baseString, key) {
      return crypto.createHmac("sha1", key).update(baseString).digest("base64");
    },
  });

  return client;
}

export async function twitterRequest(defaults, route, options = {}) {
  const {
    subdomain = "api",
    version = 9,
    auth: { consumerKey, consumerSecret, accessTokenKey, accessTokenSecret },
  } = { ...defaults, ...options };

  const [method, pathTemplate] = route.split(" ");

  const path = pathTemplate.replace(/:\w+/g, (match) => {
    if (!options[match.substr(1)]) {
      throw new Error(`${match} option not set for ${route} request`);
    }

    return options[match.substr(1)];
  });

  const url = `https://${subdomain}.twitter.com/${version}/${path}`;

  const client = createOAuthClient({
    key: consumerKey,
    secret: consumerSecret,
  });

  const authHeaders = client.toHeader(
    client.authorize(
      {
        method,
        url,
      },
      {
        key: accessTokenKey,
        secret: accessTokenSecret,
      }
    )
  );

  const response = await fetch(url, {
    method,
    headers: {
      ...options.headers,
      ...authHeaders,
    },
  });

  const { data, error } = await response.json();

  if (error) {
    throw new Error(JSON.stringify(error, null, 2));
  }

  return data;
}
