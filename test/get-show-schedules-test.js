import { readFile } from "fs/promises";
import { dirname, join } from "path";
import { fileURLToPath } from "url";
import { deepEqual } from "assert/strict";

import MockDate from "mockdate";

import { run } from "../get-schow-schedules.js";

const __dirname = dirname(fileURLToPath(import.meta.url));

// mock date
MockDate.set("2021-08-20");

// mock environment variables
const mockEnv = {};

// mock octokit
const mockOctokit = {
  async paginate(route, parameters) {
    if (route === "GET /repos/{owner}/{repo}/issues") {
      deepEqual(parameters, {
        owner: "gr2m",
        repo: "helpdesk",
        labels: "show",
        state: "open",
        per_page: 100,
      });
      return JSON.parse(
        await readFile(
          join(__dirname, "fixtures/open-show-issues.json"),
          "utf8"
        )
      );
    }

    throw new Error("Unexpected route: " + route);
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
};

// run action
await run(mockEnv, mockOctokit, mockCore);

// assertions
deepEqual(outputLogs, [
  "CRON schedule for upcoming shows is: [ { start: '57 16 26 8 *', announcement: '27 16 26 8 *' } ]",
]);
deepEqual(outputs, {
  schedule_announcement: "27 16 26 8 *",
  schedule_start: "57 16 26 8 *",
});
