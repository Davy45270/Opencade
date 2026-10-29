# Security policy

Opencade is a static site with no backend, accounts or data collection. Scores,
unlocked levels and preferences are stored locally in the browser's
`localStorage`.

## Reporting a vulnerability

Please **do not open a public issue**. Use GitHub's private reporting feature:
open the repository's **Security** tab and select **Report a vulnerability**
([direct link](https://github.com/Davy45270/Opencade/security/advisories/new)).

Include the affected version or commit, your browser and steps to reproduce.
We will respond as soon as possible. This is a volunteer-maintained project,
so no response time is guaranteed.

## Supported versions

Only the latest version on `main`, published on GitHub Pages, receives fixes.

## Out of scope

The test hooks enabled by `?test=1` intentionally allow changes to a local game's
state. This is expected behavior, not a vulnerability.
