// @ts-check

const crypto = require("crypto");

const { Octokit } = require("@octokit/core");
const dotenv = require("dotenv");
dotenv.config();

const SUPPORTED_EVENT_TYPES = ["stream.online", "stream.offline"];

// Some useful twitch commands to test the glitch function:
//
// - First, install the Twitch CLI: https://github.com/twitchdev/twitch-cli#readme
// - Send request to test subscription verification
//   ```
//   twitch event verify-subscription subscribe -F http://localhost:8888/.netlify/functions/glitch
//   ```
// - Get user account ID by login
//   ```
//   twitch api get users -q login=gregorcodes
//   ```
// - Trigger a "stream.online" event
//   ```
//   twitch event trigger streamup -F http://localhost:8888/.netlify/functions/glitch -s secret -t 581268875
//   ```
// - Trigger a "stream.offline" event
//   ```
//   twitch event trigger streamdown -F http://localhost:8888/.netlify/functions/glitch -s secret -t 581268875
//   ```

/**
 * @param {import("@netlify/functions").HandlerEvent} event
 * @param {import("@netlify/functions").HandlerContext} context
 *
 * @returns {Promise<import("@netlify/functions").HandlerResponse>}
 */
exports.handler = async function handler(event, context) {
  if (event.httpMethod !== "POST") {
    return {
      statusCode: 405,
      body: `Method Not Allowed: ${event.httpMethod}`,
    };
  }

  const body = JSON.parse(event.body);

  // responde to twitch subscribe challenge
  const messageType = event.headers["twitch-eventsub-message-type"];
  if (messageType === "webhook_callback_verification") {
    console.log("Verifying Webhook");
    return {
      statusCode: 200,
      body: body.challenge,
    };
  }

  const messageId = event.headers["twitch-eventsub-message-id"];
  const timestamp = event.headers["twitch-eventsub-message-timestamp"];
  const signature = event.headers["twitch-eventsub-message-signature"];

  if (
    !signatureIsValid({
      messageId,
      timestamp,
      signature,
      body: event.body,
      secret: process.env.TWITCH_APP_EVENTSUB_SECRET,
    })
  ) {
    console.log("Signature could not be verified");
    return {
      statusCode: 401,
      body: "Unauthorized",
    };
  }
  console.log("Signature verified");

  const { type } = body.subscription;

  if (!SUPPORTED_EVENT_TYPES.includes(type)) {
    console.log(
      `Received ${type} event, but only supporting: ${SUPPORTED_EVENT_TYPES.join(
        ", "
      )}`
    );
    return { statusCode: 404, body: "unsupported event type" };
  }

  if (
    body.event.broadcaster_user_id !== process.env.TWITCH_GREGORCODES_USER_ID
  ) {
    console.log(
      `Received event for user @${body.event.broadcaster_user_login} (#${body.event.broadcaster_user_id}), which is not @gregorcodes`
    );
    return { statusCode: 404, body: "unsupported user account" };
  }

  const octokit = new Octokit({
    auth: process.env.GITHUB_TOKEN,
  });

  await octokit.request("POST /repos/{owner}/{repo}/dispatches", {
    owner: "gr2m",
    repo: "helpdesk",
    event_type: "glitch",
    client_payload: {
      type,
    },
  });

  console.log("Gregor is %s", type === "stream.online" ? "online" : "offline");

  return {
    statusCode: 200,
    body: "ok",
  };
};

function signatureIsValid({ messageId, timestamp, signature, body, secret }) {
  if (!secret) {
    throw new Error("Twitch signing secret is empty.");
  }

  if (Math.abs(Date.now() - timestamp) > 600) {
    throw new Error("Timestamp is older than 10 minutes.");
  }

  const computedSignature =
    "sha256=" +
    crypto
      .createHmac("sha256", secret)
      .update(messageId + timestamp + body)
      .digest("hex");

  return signature === computedSignature;
}
