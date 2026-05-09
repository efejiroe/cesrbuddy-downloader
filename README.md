# CESR Buddy Downloader

A Chrome extension that saves a FourteenFish Learning Outcome (LO) assessment
page as a **PNG screenshot** or a **searchable PDF**, with the LO codes,
entry title, and entry type baked into the filename — so your CESR evidence
folder is self-organising.

> Example output filename:
> `CA1_CC2_Bilateral_Optic_Atrophy_Casebased_Discussion.png`

---

## Features

- **One-click PNG capture** — full-page, pixel-perfect screenshot at
  1920 px wide (1280 px logical viewport × 1.5 device scale).
- **One-click searchable PDF** — uses Chrome's native print engine, so every
  word in the PDF is real selectable / copy-pasteable text, not a flat image.
  The output is optimally scaled to fit all essential information — including
  the assessor's full name — on a single page.
- **Smart filenames** — automatically pulls the Learning Outcome codes
  (e.g. `CA1`, `CC2`), the entry title, and the entry type from the page
  and joins them into the saved filename.
- **Strictly scoped** — refuses to run anywhere except a Learning Outcome
  page on `www.fourteenfish.com`, so it can't accidentally screenshot
  unrelated tabs.

---

## How it works

1. You open a FourteenFish assessment entry (CbD, Mini-CEX, MSF, etc.) that
   shows a *Learning Outcome* section with codes.
2. You click the extension icon and choose **Download PNG** or
   **Searchable PDF**.
3. The extension reads three small pieces of text from the visible page:
   - the entry type (the `<h1>` at the top of the page),
   - the value of the *Title* row,
   - the codes inside the *Learning Outcome* row (e.g. `(CA1)`).
4. It builds a filename from those values and triggers a normal browser
   download to your default Downloads folder.

If the open tab isn't on `www.fourteenfish.com`, or is a FourteenFish page
that isn't an LO entry, the extension will refuse to capture and tell you
why — nothing is read, attached, or saved.

---

## Privacy

**Short version: this extension does not transmit, collect, store, sell, or
share any of your data. Everything happens locally in your browser.**

### What the extension reads
When — and only when — you click *Download PNG* or *Searchable PDF* on a
qualifying FourteenFish LO page, the extension reads:

- The active tab's URL (to confirm it's `www.fourteenfish.com`).
- The text content of the open page, specifically:
  - the page's `<h1>` heading,
  - the value next to a row labelled *Title*,
  - the value next to a row labelled *Learning Outcome*, from which it
    extracts codes matching the pattern `(LETTERS+DIGITS)`.
- A pixel-level rendering of the page (for the PNG / PDF itself).

### What the extension does NOT do
- It does **not** send any data to any remote server. There are no network
  requests, analytics, telemetry, or third-party SDKs.
- It does **not** read any other tab, window, or browser profile data.
- It does **not** store any of the extracted text, screenshots, PDFs, or
  URLs anywhere except the file the browser saves to your Downloads folder
  at your explicit request.
- It does **not** run on any site other than `www.fourteenfish.com`.
- It does **not** read login credentials, cookies, or local storage.
- It does **not** persist anything between popup sessions.

### Permissions, and why each is required
| Permission     | Why it is needed |
| -------------- | ---------------- |
| `activeTab`    | Read the title / LO codes from the FourteenFish page you're currently looking at, only when you click the extension. |
| `tabs`         | Check the active tab's URL before doing anything, so the extension can refuse to run on non-FourteenFish sites. |
| `downloads`    | Save the PNG / PDF file to your Downloads folder. |
| `scripting`    | Inject the small content script that extracts the title and LO codes. |
| `debugger`     | Use Chrome's DevTools Protocol to capture a full-page screenshot (`Page.captureScreenshot`) or a searchable PDF (`Page.printToPDF`). This is the **only** reliable way to capture beyond the visible viewport with crisp text — no other API exposes it. The debugger session is opened, used, and detached within a single capture, and is never used to inspect or modify the page beyond rendering it. |
| Host access to `https://www.fourteenfish.com/*` | Restrict where the content script may run. The extension cannot read or run on any other site. |

### Data retention
None. Everything the extension reads lives only in memory for the few
seconds a capture takes, then is discarded when the popup closes.

---

## Installation (development / unpacked)

> ⚠ **Before publishing to the Chrome Web Store:** replace every occurrence of
> `efejiroe` in `manifest.json` and `background.js` with your
> actual GitHub username.

1. Download or clone this folder.
2. Visit `chrome://extensions` in Chrome.
3. Enable **Developer mode** (top-right toggle).
4. Click **Load unpacked** and select this folder.
5. Pin the extension to your toolbar for quick access.

## Usage

1. Open any FourteenFish assessment entry that lists Learning Outcome codes.
2. Click the **CESR Buddy Downloader** icon in the toolbar.
3. Click **Download PNG** for a screenshot, or **Searchable PDF** for a
   text-searchable PDF.
4. Find the file in your Downloads folder, named with the LO codes, title,
   and entry type.

## File layout

```
manifest.json      Extension manifest (Manifest V3)
popup.html         Toolbar popup UI
popup.js           Popup button handlers and status reporting
content.js         Reads title / entry type / LO codes from the page
background.js      Service worker — handles capture and download
icons/             Toolbar and store-listing icons (16/32/48/128 px)
test-fixtures/     Static HTML pages for Chrome Web Store review (see below)
README.md          This file
PRIVACY.md         Standalone privacy policy (same content as the section above)
```

## Test fixtures

The `test-fixtures/` directory contains static HTML files that reproduce the
FourteenFish assessment page DOM structure. They exist solely for Chrome Web
Store reviewers, who cannot access FourteenFish (a paid UK medical platform),
and for local development without a live account.

The fixtures contain only **synthetic data** — no real patient, assessor, or
user information. They are served via GitHub Pages and are listed in
`manifest.json` as an allowed host so the extension's content script runs on
them during review.

## Author

Built by a doctor, for doctors collating CESR evidence on FourteenFish.

## Licence

Private / personal use. Not affiliated with FourteenFish Ltd.
