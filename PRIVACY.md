# Privacy Policy — CESR Buddy Downloader

_Last updated: 2026-05-02_

**CESR Buddy Downloader does not collect, transmit, store, sell, or share
any user data.** Everything the extension does happens locally inside your
own browser.

## What the extension reads

The extension only reads data from a tab when you actively click
*Download PNG* or *Searchable PDF*, and only if that tab is a Learning
Outcome page on `https://www.fourteenfish.com`. When you click, it reads:

- The active tab's URL — used solely to verify it is on
  `www.fourteenfish.com`.
- Text on the open page, specifically:
  - the `<h1>` heading (entry type),
  - the value next to a row labelled *Title*,
  - codes inside the *Learning Outcome* row matching the pattern
    `(LETTERS+DIGITS)`, e.g. `(CA1)`.
- A rendered image of the open page, in order to produce the PNG or PDF
  file you requested.

## What the extension does NOT do

- It makes **no network requests** of any kind. There are no analytics,
  telemetry, error reporting, or third-party SDKs.
- It does **not** send any data to any remote server, including the
  developer's.
- It does **not** read any other tab or window.
- It does **not** read cookies, login credentials, browser history, or
  local storage.
- It does **not** persist any data between popup sessions.
- It does **not** run on any site other than `www.fourteenfish.com`.

## Where your data goes

The only output is the PNG or PDF file the browser saves to your local
Downloads folder, at your explicit request. The extension does not retain
copies.

## Permissions, justified

| Permission     | Purpose |
| -------------- | ------- |
| `activeTab`    | Read the title and LO codes from the page you're viewing, only when you click the action. |
| `tabs`         | Inspect the active tab's URL to confirm it is on `www.fourteenfish.com`. |
| `downloads`    | Save the generated PNG / PDF file to your Downloads folder. |
| `scripting`    | Inject the small content script that extracts the title and LO codes. |
| `debugger`     | Use the Chrome DevTools Protocol to render a full-page screenshot or searchable PDF. The session is attached, used, and detached within a single capture. |
| Host access to `https://www.fourteenfish.com/*` | Limit content-script execution to FourteenFish only. |

## Children's privacy

The extension is intended for medical professionals. It collects no data
from anyone, including children.

## Changes to this policy

If the extension's data handling ever changes, this file will be updated
in the same release.

## Contact

For privacy questions, contact the developer at the email address listed
on the Chrome Web Store listing page.
