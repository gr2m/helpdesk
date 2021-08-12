# helpdesk

Answering all your (and some of my own) GitHub API/automation questions live at [twitch.tv/gregorcodes](https://www.twitch.tv/gregorcodes)

Got any questions or ideas? You can

- Ping me on twitter: [@gr2m](https://twitter.com/gr2m)
- [Create an issue in this repository](https://github.com/gr2m/helpdesk/issues/new)

<!--START_SECTION:helpdesk-shows-->


## Upcoming shows

- 📅 8/19 @ 10:00am PT — [Creating tests for actions for faster iteration](https://github.com/gr2m/helpdesk/issues/46)
- 📅 8/12 @ 10:00am PT — [Automating gr2m/helpdesk: Issue Forms part III](https://github.com/gr2m/helpdesk/issues/45)

## Past shows

- [Automating gr2m/helpdesk: issue forms part II](https://github.com/gr2m/helpdesk/issues/42)
- [Running scheduled GitHub App tasks using Actions](https://github.com/gr2m/helpdesk/issues/38)
- [Automating gr2m/helpdesk: issue forms](https://github.com/gr2m/helpdesk/issues/34)
- [How to update lock files silently (Part III)](https://github.com/gr2m/helpdesk/issues/32)
- [Automating gr2m/helpdesk: comment on issue when show begins](https://github.com/gr2m/helpdesk/issues/31)
- [Advanced TypeScript for the future Octokit SDK](https://github.com/gr2m/helpdesk/issues/29) with [@orta](https://github.com/orta)
- [Automating gr2m/helpdesk, Episode VI](https://github.com/gr2m/helpdesk/issues/27)
- [Automating gr2m/helpdesk, Episode V](https://github.com/gr2m/helpdesk/issues/25)
- [How to update lock files silently (Part II)](https://github.com/gr2m/helpdesk/issues/24)
- [How to update lock files silently](https://github.com/gr2m/helpdesk/issues/22)
- [Automating gr2m/helpdesk, Episode IV](https://github.com/gr2m/helpdesk/issues/21)
- [transfer issues + comments between repositories while retaining authorship, labels, and milestones](https://github.com/gr2m/helpdesk/issues/20)
- [30 Minutes to Merge: Automating nose booping using Actions](https://github.com/gr2m/helpdesk/issues/18) with [@github](https://github.com/github)
- [Automating gr2m/helpdesk, Episode III](https://github.com/gr2m/helpdesk/issues/17)
- [copy GitHub repositories with issues, labels, milestones, and assignees](https://github.com/gr2m/helpdesk/issues/16)
- [Automating gr2m/helpdesk, Episode II](https://github.com/gr2m/helpdesk/issues/14)
- [Slash commands & rebasing pull requests](https://github.com/gr2m/helpdesk/issues/13) with [@davidguttman](https://github.com/davidguttman)
- [Learn with Jason: GitHub Automation with Octokit](https://github.com/gr2m/helpdesk/issues/11) with [@jlengstorf](https://github.com/jlengstorf)
- [Automating gr2m/helpdesk, Episode I](https://github.com/gr2m/helpdesk/issues/10)
- [Script Kit meets Octokit](https://github.com/gr2m/helpdesk/issues/8) with [@johnlindquist](https://github.com/johnlindquist)
- [GitHub Action Artifacts](https://github.com/gr2m/helpdesk/issues/7) with [@reconbot](https://github.com/reconbot)
- [Octokit automation: OpenAPI](https://github.com/gr2m/helpdesk/issues/5)
- [Create a `cowsay` GitHub Action with JavaScript](https://github.com/gr2m/helpdesk/issues/4)
- [GitHub Enterprise repository auditing](https://github.com/gr2m/helpdesk/issues/1) with [@jeffwilcox](https://github.com/jeffwilcox)


<!--END_SECTION:helpdesk-shows-->

## How I use this repository

I keep track of how I use this repository over time as I hope to automate most of it eventually 😂

A show usually starts out with an idea on twitter, such as [the idea to audit repository access using GitHub Actions](https://mobile.twitter.com/jeffwilcox/status/1385711936541663233). If we agree to make a show about it, I turn it into an issue with a `🏷 show` label such as [📅 4/29 @ 1pm PT - GitHub Enterprise repository auditing with @jeffwilcox](https://github.com/gr2m/helpdesk/issues/1). If the idea needs some more research, I turn it into an an issue with an `🏷 idea` label such as [💡 How to use Environments + Secrets](https://github.com/gr2m/helpdesk/issues/6).

I add all `🏷 show` issues to this README as well as on https://github.com/gr2m/gr2m.

I use the issue for preparation, to make sure the guests (if any) and I are on the same page, and to have a rough outline of steps I want to go through during the show. I try to keep the shows to 30 minutes and getting stuck in an unforeseen problem could blow that time limit very quickly, so I like to be prepared. I invite everyone interested in the show to subscribe to the issue.

When the show goes live, I add a comment with a link to [twitch.tv/gregorcodes](https://www.twitch.tv/gregorcodes), and also send a tweet that the show is going live shortly.

After the show I add a comment to the Twitch recording for people who missed the live show. I also add notes from the show.

Then I upload the recording to YouTube and add another comment with a link to the video on YouTube, as this one won't be removed after 14 days.

After that, I close the issue, and move the show to the "Past" section in this README as well as on https://github.com/gr2m/gr2m

## Progress on automating this repository

My goal is to automate everything about my helpdesk show that can be automated. You can find a list of past and upcoming shows about automating helpdesk at https://github.com/gr2m/helpdesk/issues?q=label%3A%22automating+helpdesk%22

- [x] automate "Upcoming shows" / "Past shows" sections in the repository README — [#10](https://github.com/gr2m/helpdesk/issues/10)
- [x] automate "Upcoming shows" / "Past shows" sections on [my profile page](https://github.com/gr2m/) — [#10](https://github.com/gr2m/helpdesk/issues/10)
- [x] add a comment to the issue when I go live on twitch
- [x] Schedule tweet 30 minutes before the show goes live
- [x] Schedule tweet when the show goes live
- [ ] add comment with a link to the twitch recording once it's available
- [ ] Send out tweet when the video is available on YouTube
- [ ] add a comment with a link to the video on YouTube once it's available in maximal resolution
- [ ] figure out a way to populate show notes from twitch comments
