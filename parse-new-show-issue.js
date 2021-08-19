import { readFile } from "fs/promises";

import { Octokit } from "@octokit/core";
import dayjs from "dayjs";
import prettier from "prettier";

if (process.env.GITHUB_ACTIONS) {
  const octokit = new Octokit({
    auth: process.env.GITHUB_TOKEN,
  });

  delete process.env.GITHUB_TOKEN;
  run(process.env, octokit);
}

/**
 * @param {object} env
 * @param {Octokit} octokit
 */
export async function run(env, octokit) {
  const event = JSON.parse(await readFile(env.GITHUB_EVENT_PATH));
  const [owner, repo] = event.repository.full_name.split("/");
  const parsedIssue = JSON.parse(env.PARSED_ISSUE_JSON);
  const [year, month, day] = parsedIssue.date.split("-");
  const [hoursString, minutes] = parsedIssue.time.split(":");
  const isoHours = parseInt(hoursString, 10);

  const hours = isoHours > 12 ? isoHours - 12 : isoHours;
  const amOrPm = isoHours > 11 ? "pm" : "am";
  const isAutomatingHelpdesk = parsedIssue.type === "automating helpdesk";
  const titlePrefix = isAutomatingHelpdesk ? "Automating gr2m/helpdesk: " : "";
  const showTitle = titlePrefix + parsedIssue.title;
  const guests = parsedIssue.guests
    ? parsedIssue.guests
        .split(/,\s+/)
        .map((guest) => `@${guest}`)
        .join(", ")
    : "_no guests_";

  const title = `📅 ${parseInt(month)}/${parseInt(
    day
  )} @ ${hours}:${minutes}${amOrPm} PT - ${showTitle}`;
  const body = `💁🏻 **${showTitle}**
📅 ${dayjs(parsedIssue.date).format("dddd, MMMM D, YYYY")}
🕐 ${hours}:${minutes}am Pacific Time
🎙️ ${guests}
📍 ${parsedIssue.location}
🏷️ ${parsedIssue.tags}

---

Subscribe to this issues to get a notification before the show begins and a summary after the show concludes.

### ${showTitle}

${parsedIssue.summary}

#### Outline

${parsedIssue.outline}

#### TODOs

Before the show

${parsedIssue.todos}
- [ ] <!-- todo:announcement-tweet --> 30 minute announcement tweet
- [ ] <!-- todo:announcement-issue-comment --> 30 minute announcement comment

When show begins

- [ ] <!-- todo:start-tweet -->    start of show tweet
- [ ] <!-- todo:start-issue-comment --> comment on issue
- [ ] <!-- todo:twitter-profile-show-mode --> Set twitter profile url

After the show

- [ ] <!-- todo:twitter-profile-reset --> Reset twitter profile after the show
- [ ] <!-- todo:recording-tweet --> recording available tweet

<a name="recording"></a>
#### Recording

_will be added after the show_

<a name="shownotes"></a>
#### Shownotes

_will be added after the show_`;

  octokit.request("PATCH /repos/{owner}/{repo}/issues/{issue_number}", {
    owner,
    repo,
    issue_number: event.issue.number,
    title,
    body: prettier.format(body, { parser: "markdown" }),
    labels: ["show"],
  });
}
