import core from "@actions/core";
import { Octokit } from "@octokit/core";
import { paginateRest } from "@octokit/plugin-paginate-rest";
import dayjs from "dayjs";
import customParseFormat from "dayjs/plugin/customParseFormat.js";
import utc from "dayjs/plugin/utc.js";
import timezone from "dayjs/plugin/timezone.js";

dayjs.extend(customParseFormat);
dayjs.extend(utc);
dayjs.extend(timezone);

// Create Octokit constructor with .paginate API and custom user agent
const MyOctokit = Octokit.plugin(paginateRest).defaults({
  userAgent: "gr2m-helpdesk",
});
const octokit = new MyOctokit({
  auth: process.env.GITHUB_TOKEN,
});

// load open issues with the `show` label
const showIssues = await octokit.paginate("GET /repos/{owner}/{repo}/issues", {
  owner: "gr2m",
  repo: "helpdesk",
  labels: "show",
  state: "open",
  per_page: 100,
});

const upcomingShowsCrons = showIssues
  .map((issue) => {
    const dayString = issue.body
      .match(/📅.*/)
      .pop()
      .replace(/📅\s*/, "")
      .replace(/^\w+, /, "")
      .trim();
    const timeString = issue.body
      .match(/🕐[^(\r\n]+/)
      .pop()
      .replace(/🕐\s*/, "")
      .replace("Pacific Time", "")
      .trim();

    // workaround: cannot parse "June 3, 2021 1:00pm" but can parse "June 3, 2021 12:00pm"
    // workaround: cannot set default timezone, so parse the date/time string first, then use `.tz()` with the expected date/time format
    let timeStringWithoutAmPm = timeString.replace(/(am|pm)\b/, "");

    const tmp = dayjs(
      [dayString, timeStringWithoutAmPm].join(" "),
      // "MMMM D, YYYY H:mma", // see workaround
      "MMMM D, YYYY H:mm",
      true
    );

    let hours = parseInt(timeStringWithoutAmPm, 10);

    if (hours < 9) {
      timeStringWithoutAmPm = timeStringWithoutAmPm.replace(hours, hours + 12);
    }

    let time = dayjs.tz(tmp.format("YYYY-MM-DD HH:mm"), "America/Los_Angeles");

    // see workaround above. Parsing am/pm is not working
    if (time.get("hour") < 8) {
      time = time.add(12, "hours");
    }

    if (time.toISOString() < dayjs().toISOString())
      // ignore open issues for shows that are in the past
      return;

    return {
      start: time
        .subtract(time.utcOffset() + 3, "minutes")
        .format("m H D M [*]"),
      announcement: time
        .subtract(time.utcOffset() + 33, "minutes")
        .format("m H D M [*]"),
    };
  })
  .filter(Boolean);

console.log("CRON schedule for upcoming shows is: %j", upcomingShowsCrons);
core.setOutput(
  "schedule_start",
  upcomingShowsCrons.map((schedule) => schedule.start).join("\n")
);
core.setOutput(
  "schedule_announcement",
  upcomingShowsCrons.map((schedule) => schedule.announcement).join("\n")
);
