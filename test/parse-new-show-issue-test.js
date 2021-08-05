import { dirname, join } from "path";
import { fileURLToPath } from "url";
import { deepEqual } from "assert/strict";

import { run } from "../parse-new-show-issue.js";

const mockEnv = {
  GITHUB_EVENT_PATH: join(
    dirname(fileURLToPath(import.meta.url)),
    "fixtures",
    "issues.opened.json"
  ),
  PARSED_ISSUE_JSON: JSON.stringify(
    {
      title: "Issue Forms part III",
      type: "automating helpdesk",
      date: "2021-08-12",
      time: "10:00",
      guests: "",
      location: "https://www.twitch.tv/gregorcodes",
      tags: "Automation",
      summary:
        "3rd and (hopefully) final part about the issue form automation. see the first two episodse\r\n\r\n- https://github.com/gr2m/helpdesk/issues/34\r\n- https://github.com/gr2m/helpdesk/issues/42",
      outline: "_tbd_",
      todos: "",
    },
    null,
    2
  ),
};

const mockOctokit = {
  request(route, parameters) {
    if (route === "PATCH /repos/{owner}/{repo}/issues/{issue_number}") {
      deepEqual(parameters, {
        owner: "gr2m",
        repo: "helpdesk",
        issue_number: 1,
        title:
          "📅 8/12 @ 10:00am PT - Automating gr2m/helpdesk: Issue Forms part III",
        body: `💁🏻 **Automating gr2m/helpdesk: Issue Forms part III**
📅 Thursday, August 12, 2021
🕐 10:00am Pacific Time
🎙️ _no guests_
📍 https://www.twitch.tv/gregorcodes
🏷️ Automation

---

Subscribe to this issues to get a notification before the show begins and a summary after the show concludes.

### Automating gr2m/helpdesk: Issue Forms part III

3rd and (hopefully) final part about the issue form automation. see the first two episodse\r\n\r\n- https://github.com/gr2m/helpdesk/issues/34\r\n- https://github.com/gr2m/helpdesk/issues/42

#### Outline

_tbd_

#### TODOs

Before the show


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

_will be added after the show_`,
        labels: ["show"],
      });
      return {};
    }

    throw new Error("Unexpected route: " + route);
  },
};

run(mockEnv, mockOctokit);
