import { readFile } from "fs/promises";
import { dirname, join } from "path";
import { fileURLToPath } from "url";

import { deepEqual } from "assert/strict";

import { test } from "uvu";
import MockDate from "mockdate";

import { run } from "../handle-show-start.js";

const __dirname = dirname(fileURLToPath(import.meta.url));

test("handle-show-start.js", async () => {
  const issues = JSON.parse(
    await readFile(join(__dirname, "fixtures/list-issues.json"))
  );

  // mock date (time of the show)
  MockDate.set("2021-08-19T17:00:00.000Z");

  // mock environment variables
  const mockEnv = {
    TWITTER_CONSUMER_KEY: "twitter_consumer_key",
    TWITTER_CONSUMER_SECRET: "twitter_consumer_secret",
    TWITTER_ACCESS_TOKEN_KEY: "twitter_access_token_key",
    TWITTER_ACCESS_TOKEN_SECRET: "twitter_access_token_secret",
  };

  // mock octokit
  const mockOctokit = {
    paginate: async (route, parameters) => {
      if (route === "GET /repos/{owner}/{repo}/issues") {
        deepEqual(parameters, {
          owner: "gr2m",
          repo: "helpdesk",
          labels: "show",
          state: "open",
          per_page: 100,
        });
        return issues;
      }

      throw new Error("Unexpected route: " + route);
    },

    request: async (route, parameters) => {
      if (
        route === "POST /repos/{owner}/{repo}/issues/{issue_number}/comments"
      ) {
        deepEqual(parameters, {
          owner: "gr2m",
          repo: "helpdesk",
          issue_number: 1,
          body: "I'm now live on https://twitch.tv/gregorcodes",
        });

        return {
          data: {
            html_url: "<new comment url>",
          },
        };
      }

      if (route === `PATCH /repos/{owner}/{repo}/issues/{issue_number}`) {
        const body = `📅 Thursday, August 19, 2021
🕐 10:00am Pacific Time
- [ ] <!-- todo:announcement-tweet --> 30 minute announcement tweet
- [ ] <!-- todo:announcement-issue-comment --> 30 minute announcement comment
- [x] <!-- todo:start-tweet -->  start of show tweet (https://twitter.com/gr2m/status/<twitter id_str>)
- [x] <!-- todo:start-issue-comment --> comment on issue (<new comment url>)
- [x] <!-- todo:twitter-profile-show-mode --> Set twitter profile url (https://twitter.com/gr2m)
`;

        deepEqual(parameters.body, body);

        deepEqual(parameters, {
          owner: "gr2m",
          repo: "helpdesk",
          issue_number: 1,
          body,
        });
        return;
      }

      throw new Error("Unexpected route: " + route);
    },
  };

  // mock twitterRequest
  const mockTwitterRequest = (route, parameters) => {
    if (route === "POST statuses/update.json") {
      deepEqual(parameters, {
        auth: {
          accessTokenKey: "twitter_access_token_key",
          accessTokenSecret: "twitter_access_token_secret",
          consumerKey: "twitter_consumer_key",
          consumerSecret: "twitter_consumer_secret",
        },
        status: `🔴  Now live at https://twitch.tv/gregorcodes

💁🏻‍♂️  Creating tests

<show url #1>`,
      });

      return {
        id_str: "<twitter id_str>",
      };
    }

    if (route === "POST account/update_profile.json") {
      deepEqual(parameters, {
        auth: {
          accessTokenKey: "twitter_access_token_key",
          accessTokenSecret: "twitter_access_token_secret",
          consumerKey: "twitter_consumer_key",
          consumerSecret: "twitter_consumer_secret",
        },
        name: "🔴 Gregor is now live on twitch.tv/gregorcodes",
        url: "https://twitch.tv/gregorcodes",
      });
      return;
    }

    throw new Error("Unexpected route: " + route);
  };

  // mock core
  const outputLogs = [];
  const outputs = {};
  const mockCore = {
    info(message) {
      outputLogs.push(message);
    },
    setOutput(name, value) {
      outputs[name] = value;
    },
    setFailed(message) {
      throw new Error(message);
    },
  };

  // run action
  await run(mockEnv, mockCore, mockOctokit, mockTwitterRequest);

  // assertions
  deepEqual(outputLogs, [
    "Comment created at <new comment url>",
    "Tweeted at https://twitter.com/gr2m/status/<twitter id_str>",
    "Twitter profile updated to link to twitch.tv/gregorcodes",
    "TODOs in issue updated: <show url #1>",
  ]);
});

test.run();
