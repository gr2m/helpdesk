import { readFile } from "fs/promises";
import { dirname, join } from "path";
import { fileURLToPath } from "url";
import { deepEqual } from "assert/strict";

import { test } from "uvu";

import { run } from "../parse-new-show-issue.js";

const __dirname = dirname(fileURLToPath(import.meta.url));

test("parse-new-show-issue.js", async () => {
  const mockEnv = {
    GITHUB_EVENT_PATH: join(__dirname, "fixtures", "issues.opened.json"),
    PARSED_ISSUE_JSON: await readFile(
      join(__dirname, "fixtures", "parsed-issue.json"),
      "utf-8"
    ),
  };

  const expectedBody = await readFile(
    join(__dirname, "fixtures/new-issue-body.md"),
    "utf-8"
  );

  const mockOctokit = {
    request(route, parameters) {
      if (route === "PATCH /repos/{owner}/{repo}/issues/{issue_number}") {
        deepEqual(parameters, {
          owner: "gr2m",
          repo: "helpdesk",
          issue_number: 1,
          title: "📅 8/12 @ 10:00am PT - Automating gr2m/helpdesk: Test show",
          body: expectedBody,
          labels: ["show"],
        });
        return {};
      }

      throw new Error("Unexpected route: " + route);
    },
  };

  run(mockEnv, mockOctokit);
});

test.run();
