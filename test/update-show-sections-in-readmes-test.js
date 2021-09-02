import { equal, deepEqual, ok } from "assert/strict";

import { test } from "uvu";

import { run } from "../update-show-sections-in-readmes.js";

test("update-show-sections-in-readmes.js without any issues", async () => {
  // mock environment variables
  const mockEnv = {
    GITHUB_TOKEN: "secret",
  };

  // mock octokit
  const mockOctokit = {
    paginate: async (route, parameters) => {
      if (route === "GET /repos/{owner}/{repo}/issues") {
        deepEqual(parameters, {
          owner: "gr2m",
          repo: "helpdesk",
          labels: "show",
          state: "all",
          per_page: 100,
        });
        return [];
      }

      throw new Error("Unexpected route: " + route);
    },
    request: async (route, parameters) => {
      throw new Error("Unexpected route: " + route);
    },
  };

  // mock twitterRequest
  const mockReadmeBox = {
    async updateSection(newContent, parameters) {
      equal(
        newContent,
        `

## Upcoming shows



## Past shows



`
      );
      const { repo, ...rest } = parameters;
      ok(["helpdesk", "gr2m"].includes(repo), `${repo} could not be matched`);
      deepEqual(rest, {
        token: "secret",
        owner: "gr2m",
        section: "helpdesk-shows",
        branch: "main",
        message: "docs(README): update helpdesk shows",
      });
      return;
    },
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
  await run(mockEnv, mockCore, mockOctokit, mockReadmeBox);

  // assertions
  deepEqual(outputLogs, [
    "README updated in gr2m/helpdesk",
    "README updated in gr2m/gr2m",
  ]);
});

test.run();
