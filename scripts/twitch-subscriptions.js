import { URL } from "node:url";
import { inspect } from "node:util";

import fetch from "node-fetch";
import dotenv from "dotenv";
dotenv.config();

const SUPPORTED_COMMANDS = ["list", "create", "delete"];

run();

async function run() {
  const [command, ...args] = process.argv.slice(2);

  if (!SUPPORTED_COMMANDS.includes(command)) {
    console.log("command %s not supported", command);
    return;
  }

  const { access_token } = await authenticate();

  if (command === "list") {
    const subscriptions = await getSubscriptions(access_token);
    console.log(inspect(subscriptions, { depth: Infinity }));

    return;
  }

  if (command === "create") {
    const callback = args[0];

    if (!callback) {
      console.log("You must set a callback URL as 2nd argument");
      console.log(
        "node scripts/twitch-subscriptions.js create https://admiring-fermat-27876f-01e5b8.netlify.live"
      );
      return;
    }

    const baseBody = {
      version: "1",
      condition: {
        broadcaster_user_id: process.env.TWITCH_GREGORCODES_USER_ID,
      },
      transport: {
        method: "webhook",
        callback: callback + "/.netlify/functions/twitch",
        secret: process.env.TWITCH_APP_EVENTSUB_SECRET,
      },
    };

    const headers = {
      authorization: `Bearer ${access_token}`,
      "client-id": process.env.TWITCH_APP_CLIENT_ID,
      "content-type": "application/json",
    };

    await fetch("https://api.twitch.tv/helix/eventsub/subscriptions", {
      method: "POST",
      headers,
      body: JSON.stringify({
        ...baseBody,
        type: "stream.online",
      }),
    });
    await fetch("https://api.twitch.tv/helix/eventsub/subscriptions", {
      method: "POST",
      headers,
      body: JSON.stringify({
        ...baseBody,
        type: "stream.offline",
      }),
    });

    console.log("Subscriptions created");
    return;
  }

  if (command === "delete") {
    const callback = args[0];

    if (!callback) {
      console.log("You must set a callback URL as 2nd argument");
      console.log(
        "node scripts/twitch-subscriptions.js delete https://admiring-fermat-27876f-01e5b8.netlify.live"
      );
      return;
    }

    const subscriptions = await getSubscriptions(access_token);

    const subscriptionsForUrl = subscriptions.filter((subscription) =>
      subscription.transport.callback.startsWith(callback)
    );

    if (subscriptionsForUrl.length === 0) {
      console.log("No subscriptions found for %s", callback);
      return;
    }

    for (const subscription of subscriptionsForUrl) {
      const url = new URL("https://api.twitch.tv/helix/eventsub/subscriptions");
      url.searchParams.append("id", subscription.id);
      await fetch(url, {
        method: "DELETE",
        headers: {
          authorization: `Bearer ${access_token}`,
          "client-id": process.env.TWITCH_APP_CLIENT_ID,
        },
      });

      console.log("Deleted subscription: %s", subscription.type);
    }
    return;
  }

  throw new Error("Unknown command: " + command);
  //   curl -X GET 'https://api.twitch.tv/helix/eventsub/subscriptions' \
  // -H 'Authorization: Bearer 2gbdx6oar67tqtcmt49t3wpcgycthx' \
  // -H 'Client-Id: wbmytr93xzw8zbg0p1izqyzzc5mbiz'
}

// twitch api post eventsub/subscriptions -b '{
//   "type": "stream.online",
//   "version": "1",
//   "condition": {
//       "broadcaster_user_id": "YOUR_BROADCASTER_ID"
//   },
//   "transport": {
//       "method": "webhook",
//       "callback": "https://EXTERNAL_URL/webhook/callback",
//       "secret": "YOUR_SECRET"
//   }
// }'

async function authenticate() {
  const url = new URL("https://id.twitch.tv/oauth2/token");
  url.searchParams.append("client_id", process.env.TWITCH_APP_CLIENT_ID);
  url.searchParams.append(
    "client_secret",
    process.env.TWITCH_APP_CLIENT_SECRET
  );
  url.searchParams.append("grant_type", "client_credentials");
  const response = await fetch(url, {
    method: "POST",
  });
  return response.json();
}

async function getSubscriptions(token) {
  const response = await fetch(
    "https://api.twitch.tv/helix/eventsub/subscriptions",
    {
      headers: {
        authorization: `Bearer ${token}`,
        "client-id": process.env.TWITCH_APP_CLIENT_ID,
      },
    }
  );

  const { data: subscriptions } = await response.json();
  return subscriptions;
}
