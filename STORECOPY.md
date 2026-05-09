# Chrome Web Store — Submission Copy
## CESR Buddy Downloader v1.0.2

---

## 1. Store Listing

### Name
```
CESR Buddy Downloader
```

### Short Description
*(max 132 characters — currently 118)*
```
Save FourteenFish assessments as searchable PDFs or PNGs, named automatically by case title and assessment type.
```

### Detailed Description
*(plain text — no markdown)*
```
CESR Buddy Downloader is a one-click tool for doctors building a Certificate of Eligibility for Specialist Registration (CESR) portfolio on FourteenFish.

Open any FourteenFish assessment entry — DOPS, CbD, EPA, CRS, OSATS, Mini-CEX, or MSF — click the extension icon, and save the full page as either a PNG screenshot or a searchable PDF. No copying, no manual renaming, no scrolling.

KEY FEATURES

One-click capture
Download the full assessment page — including the assessor's name, all ratings, and free-text comments — as a single-page PDF or a high-resolution PNG. Nothing is cropped.

Searchable PDF
The PDF contains an invisible text layer built directly from the page, so you can search, highlight, and copy text in any PDF viewer without any OCR.

Self-describing filenames
Files are named automatically from the case title and assessment type:
  Non-contact biometry_DOPS.pdf
  Clinic discussion of patient_CbD.pdf
  Left optic neuritis_CRS.pdf

Every file is identifiable at a glance. No need to open it to know what it contains. Sorting and compiling your CESR evidence by assessment type becomes straightforward.

Assessment types recognised: DOPS, CbD, EPA1/2/…, CRS, OSATS, Mini-CEX, MSF. Any other type uses the full type name.

Strictly scoped
The extension only activates on www.fourteenfish.com assessment pages. It cannot read, access, or screenshot any other site or tab.

PRIVACY
No data is collected, transmitted, or stored. Everything happens locally in your browser. The only output is the file saved to your Downloads folder at your explicit request. See the full privacy policy for details.

Built by a doctor, for doctors.
```

### Category
```
Productivity
```

### Language
```
English (United Kingdom)
```

---

## 2. Privacy Practices

### Single Purpose Description
*(Describe what the extension's single purpose is)*
```
Capture and save FourteenFish assessment pages as named PDF or PNG files for CESR portfolio evidence.
```

### Data Use — Permissions Justification

**activeTab**
```
Used solely to read the case title and assessment type from the FourteenFish page the user is currently viewing, and to capture a screenshot of that page when the user clicks the button. Only activated on user click.
```

**tabs**
```
Used to check the active tab's URL before doing anything, so the extension can refuse to run on non-FourteenFish pages. No tab data is stored or transmitted.
```

**downloads**
```
Used to save the generated PNG or PDF file to the user's local Downloads folder. No file content is transmitted externally.
```

**scripting**
```
Used to inject the small content script that reads the case title and assessment type text from the page. Only runs on www.fourteenfish.com.
```

**debugger**
```
Used to invoke the Chrome DevTools Protocol (Page.captureScreenshot) to render a full-page screenshot, including content that extends below the visible viewport. The debugger session is attached, used for a single capture, and immediately detached. It is never used to inspect, modify, or intercept page data.
```

### Host Permission Justification

**https://www.fourteenfish.com/***
```
This is the only site the extension operates on. Host access is required to inject the content script that reads the case title and assessment type from the page, and to attach the Chrome DevTools Protocol debugger for full-page screenshot capture. The extension cannot run on any other site.
```

**https://efejiroe.github.io/cesrbuddy-downloader/***
```
This host is a static test fixture that reproduces the FourteenFish page structure using entirely synthetic data. It exists solely to allow Chrome Web Store reviewers to verify the extension's functionality without needing a paid FourteenFish account. It is not used in normal operation.
```

### Does the extension collect any user data?
```
No.
```

### Privacy Policy URL
```
https://github.com/efejiroe/cesrbuddy-downloader/blob/main/PRIVACY.md
```

---

## 3. Distribution

### Visibility
```
Public
```

### Regions
```
All regions (or restrict to: United Kingdom, Ireland, Australia, New Zealand, Canada, South Africa — markets with FourteenFish users)
```

### Pricing
```
Free
```

### Who can install
```
Anyone
```

---

## 4. Reviewer Test Instructions

*(Paste into the "Notes for reviewer" field)*

```
Thank you for reviewing CESR Buddy Downloader.

FourteenFish (www.fourteenfish.com) is a paid UK medical portfolio platform that reviewers cannot access. A static test fixture replicating the exact page structure is available at:

  https://efejiroe.github.io/cesrbuddy-downloader/entry.html
  https://efejiroe.github.io/cesrbuddy-downloader/entry2.html

HOW TO TEST

1. Install the extension in developer mode (Load unpacked) or from the store.
2. Open either fixture URL above in a new tab.
3. Click the CESR Buddy Downloader icon in the toolbar.
4. Click "Download PNG".
   - Expected: a full-page PNG is saved to Downloads, named e.g.
     "Bilateral Optic Atrophy_Casebased Discussion.png"
5. Click "Searchable PDF".
   - Expected: a single-page PDF is saved to Downloads, named e.g.
     "Bilateral Optic Atrophy_Casebased Discussion.pdf"
   - Open the PDF and use Ctrl+F to search for "Bilateral" — it should
     be found, confirming the text layer is present.
6. Navigate to any other website (e.g. google.com) and open the popup.
   - Expected: the extension displays an error and refuses to capture.

All test data in the fixtures is synthetic. No real patient or clinician information is used.
```
