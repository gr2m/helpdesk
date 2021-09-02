import { dirname, join } from "path";
import { fileURLToPath } from "url";

import { deepEqual } from "assert/strict";

import { test } from "uvu";

import { run } from "../handle-show-done.js";

const __dirname = dirname(fileURLToPath(import.meta.url));

test("handle-show-done.js", async () => {
  // mock environment variables
  const mockEnv = {
    GITHUB_EVENT_PATH: join(__dirname, "fixtures/issues.closed.json"),
    TWITTER_CONSUMER_KEY: "twitter_consumer_key",
    TWITTER_CONSUMER_SECRET: "twitter_consumer_secret",
    TWITTER_ACCESS_TOKEN_KEY: "twitter_access_token_key",
    TWITTER_ACCESS_TOKEN_SECRET: "twitter_access_token_secret",
  };

  // mock octokit
  const mockOctokit = {
    request: async (route, parameters) => {
      if (
        route === "POST /repos/{owner}/{repo}/issues/{issue_number}/comments"
      ) {
        deepEqual(parameters, {
          owner: "gr2m",
          repo: "helpdesk",
          issue_number: 1,
          body: "Show is done for today, thank you all! Recording is coming up in a moment",
        });
        return {
          data: { html_url: "<comment url>" },
        };
      }

      if (route === "PATCH /repos/{owner}/{repo}/issues/{issue_number}") {
        deepEqual(parameters, {
          body: "- [x] <!-- todo:twitter-profile-reset --> reset twitter profile (https://twitter.com/gr2m)\n",
          issue_number: 1,
          owner: "gr2m",
          repo: "helpdesk",
        });
        return;
      }

      throw new Error("Unexpected route: " + route);
    },
  };

  // mock twitterRequest
  const mockTwitterRequest = (route, parameters) => {
    if (route === "POST account/update_profile.json") {
      deepEqual(parameters, {
        auth: {
          consumerKey: "twitter_consumer_key",
          consumerSecret: "twitter_consumer_secret",
          accessTokenKey: "twitter_access_token_key",
          accessTokenSecret: "twitter_access_token_secret",
        },
        name: "Gregor",
        url: "https://github.com/gr2m/",
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
    "Comment created at <comment url>",
    "Twitter profile reverted to default",
    "TODOs in issue updated: <issue url>",
  ]);
});

test.run();
