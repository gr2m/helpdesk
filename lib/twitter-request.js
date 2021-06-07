import crypto from "crypto";
import OAuth from "oauth-1.0a";
import dotenv from "dotenv";
import fetch from "node-fetch";

dotenv.config();

// EXAMPLE
//
// const auth = {
//   consumerKey: process.env.TWITTER_CONSUMER_KEY,
//   consumerSecret: process.env.TWITTER_CONSUMER_SECRET,
//   accessTokenKey: process.env.TWITTER_ACCESS_TOKEN_KEY,
//   accessTokenSecret: process.env.TWITTER_ACCESS_TOKEN_SECRET,
// }

// const scheduledTweets = await twitterRequest(
//   "GET accounts/:account_id/scheduled_tweets",
//   {
//     auth,
//     account_id: process.env.TWITTER_ACCOUNT_ID,
//   }
// );

// await twitterRequest(
//   "DELETE accounts/:account_id/scheduled_tweets/:scheduled_tweet_id",
//   {
//     auth,
//     account_id: process.env.TWITTER_ACCOUNT_ID,
//     scheduled_tweet_id: scheduledTweets[0].id_str, // 1394340865699504000
//   }
// );

const DEFAULTS = {
  subdomain: "ads-api",
  version: 9,
  auth: {},
};

export async function twitterRequest(route, options = {}) {
  const {
    subdomain,
    version,
    auth: { consumerKey, consumerSecret, accessTokenKey, accessTokenSecret },
    ...parameters
  } = { ...DEFAULTS, ...options };

  const [method, pathTemplate] = route.split(" ");

  const path = pathTemplate.replace(/:\w+/g, (match) => {
    const key = match.substr(1);
    if (!parameters[key]) {
      throw new Error(`${match} option not set for ${route} request`);
    }

    const value = parameters[key];
    delete parameters[key];

    return value;
  });

  const url = withQueryParameters(
    `https://${subdomain}.twitter.com/${version}/${path}`,
    parameters
  );

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

  const text = await response.text();

  try {
    const { data, error, errors } = JSON.parse(text);

    if (error || errors) {
      throw new Error(
        JSON.stringify(
          {
            error: error || errors,
            method,
            url,
            parameters,
          },
          null,
          2
        )
      );
    }

    return data;
  } catch (error) {
    error.response = {
      headers: Object.fromEntries(response.headers.entries()),
      body: text,
    };
    throw error;
  }
}

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

function withQueryParameters(url, parameters) {
  const separator = /\?/.test(url) ? "&" : "?";
  const names = Object.keys(parameters);

  if (names.length === 0) {
    return url;
  }

  return (
    url +
    separator +
    names
      .map((name) => {
        const encoded = encodeURIComponent(parameters[name])
          .replace(/\(/g, "%28")
          .replace(/\)/g, "%29");
        return `${name}=${encoded}`;
      })
      .join("&")
  );
}
