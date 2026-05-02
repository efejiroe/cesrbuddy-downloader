/**
 * Background service worker.
 *
 * Supports two capture formats triggered from the popup:
 *
 *   PNG  — full-page pixel-perfect screenshot.
 *          Uses Page.captureScreenshot with a 1280-px logical viewport at
 *          1.5× device scale (crisp 1920-px-wide image).
 *
 *   PDF  — searchable / copy-pasteable PDF.
 *          Uses Page.printToPDF (Chrome's native print engine) so every
 *          character is a real text glyph, not a rasterised pixel.
 *          Rendered at A4 landscape with backgrounds preserved.
 */

const VIEWPORT_WIDTH = 1280; // logical CSS px for PNG capture
const DEVICE_SCALE   = 1.5;  // → 1920 px physical width

// A4 landscape in inches (Chrome DevTools Protocol unit)
const PDF_PAPER_W = 11.69;
const PDF_PAPER_H =  8.27;

// ─── shared helpers ──────────────────────────────────────────────────────────

function dbgSend(tabId, method, params = {}) {
  return new Promise((resolve, reject) => {
    chrome.debugger.sendCommand({ tabId }, method, params, (result) => {
      if (chrome.runtime.lastError) reject(new Error(chrome.runtime.lastError.message));
      else resolve(result);
    });
  });
}

function dbgAttach(tabId) {
  return new Promise((resolve, reject) => {
    chrome.debugger.attach({ tabId }, "1.3", () => {
      if (chrome.runtime.lastError) reject(new Error(chrome.runtime.lastError.message));
      else resolve();
    });
  });
}

function dbgDetach(tabId) {
  return new Promise((resolve) => {
    chrome.debugger.detach({ tabId }, () => resolve());
  });
}

function download(url, filename) {
  return new Promise((resolve, reject) => {
    chrome.downloads.download({ url, filename }, (id) => {
      if (chrome.runtime.lastError) reject(new Error(chrome.runtime.lastError.message));
      else resolve(id);
    });
  });
}

function slugify(text) {
  return (text ?? "")
    .trim()
    .replace(/[^a-zA-Z0-9\s]/g, "")
    .replace(/\s+/g, "_");
}

function buildFilename(pageData, ext) {
  const codes = pageData.learningOutcomeCodes.join("_") || "Unknown_LO";
  const title  = slugify(pageData.title)     || "Untitled";
  const type   = slugify(pageData.entryType) || "Entry";
  return `${codes}_${title}_${type}.${ext}`;
}

async function ensureContentScript(tabId) {
  try {
    await chrome.scripting.executeScript({ target: { tabId }, files: ["content.js"] });
  } catch (_) { /* already injected */ }
}

async function getPageData(tabId) {
  return new Promise((resolve, reject) => {
    chrome.tabs.sendMessage(tabId, { action: "getPageData" }, (response) => {
      if (chrome.runtime.lastError) reject(new Error(chrome.runtime.lastError.message));
      else if (!response) reject(new Error("No response from page. Is this a FourteenFish page?"));
      else resolve(response);
    });
  });
}

// ─── PNG capture ─────────────────────────────────────────────────────────────

async function captureAsPng(tabId, pageData, sendProgress) {
  const filename = buildFilename(pageData, "png");
  sendProgress({ status: "capturing", message: `Capturing screenshot…\n${filename}` });

  await dbgAttach(tabId);
  try {
    // Set viewport to our desired width; temporary height
    await dbgSend(tabId, "Emulation.setDeviceMetricsOverride", {
      width: VIEWPORT_WIDTH, height: 900,
      deviceScaleFactor: DEVICE_SCALE, mobile: false,
    });
    await new Promise((r) => setTimeout(r, 600)); // wait for reflow

    const metrics = await dbgSend(tabId, "Page.getLayoutMetrics");
    const w = Math.ceil(metrics.cssContentSize.width);
    const h = Math.ceil(metrics.cssContentSize.height);

    // Expand to full content height for a one-shot capture
    await dbgSend(tabId, "Emulation.setDeviceMetricsOverride", {
      width: w, height: h,
      deviceScaleFactor: DEVICE_SCALE, mobile: false,
    });
    await new Promise((r) => setTimeout(r, 400)); // wait for lazy content

    const { data } = await dbgSend(tabId, "Page.captureScreenshot", {
      format: "png",
      captureBeyondViewport: true,
      clip: { x: 0, y: 0, width: w, height: h, scale: 1 },
    });

    await dbgSend(tabId, "Emulation.clearDeviceMetricsOverride");

    sendProgress({ status: "downloading", message: "Saving PNG…" });
    await download("data:image/png;base64," + data, filename);
    sendProgress({ status: "done", message: `Saved:\n${filename}`, filename });
  } finally {
    await dbgDetach(tabId);
  }
}

// ─── PDF capture ─────────────────────────────────────────────────────────────
//
// Page.printToPDF uses Chrome's native print engine.  Every word is a real
// text glyph — the resulting PDF is fully searchable and copy-pasteable.
//
// Strategy:
//   1. Override viewport to 1122 px (A4 landscape at 96 DPI → exactly 11.69 in)
//      so the page layout reflowed for screen CSS maps 1:1 to the paper width.
//   2. Call printToPDF with matching paper dimensions, no extra scaling.
//   3. Restore metrics and detach.

const PDF_VIEWPORT_W = Math.round(PDF_PAPER_W * 96); // 1122 px

async function captureAsPdf(tabId, pageData, sendProgress) {
  const filename = buildFilename(pageData, "pdf");
  sendProgress({ status: "capturing", message: `Generating PDF…\n${filename}` });

  await dbgAttach(tabId);
  try {
    // Reflow page to match the PDF paper width
    await dbgSend(tabId, "Emulation.setDeviceMetricsOverride", {
      width: PDF_VIEWPORT_W, height: 900,
      deviceScaleFactor: 1, mobile: false,
    });
    await new Promise((r) => setTimeout(r, 700)); // wait for reflow + fonts

    const { data } = await dbgSend(tabId, "Page.printToPDF", {
      landscape:            true,
      printBackground:      true,   // preserve brand colours / backgrounds
      scale:                1,      // 1:1 — viewport already matches paper
      paperWidth:           PDF_PAPER_W,
      paperHeight:          PDF_PAPER_H,
      marginTop:            0.39,   // ~1 cm margins all round
      marginBottom:         0.39,
      marginLeft:           0.39,
      marginRight:          0.39,
      displayHeaderFooter:  false,  // clean output — no "Page 1 of N" clutter
      transferMode:         "ReturnAsBase64",
    });

    await dbgSend(tabId, "Emulation.clearDeviceMetricsOverride");

    sendProgress({ status: "downloading", message: "Saving PDF…" });
    await download("data:application/pdf;base64," + data, filename);
    sendProgress({ status: "done", message: `Saved:\n${filename}`, filename });
  } finally {
    await dbgDetach(tabId);
  }
}

// ─── message listener ────────────────────────────────────────────────────────

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message.action !== "startCapture") return false;

  const format = message.format === "pdf" ? "pdf" : "png";

  chrome.tabs.query({ active: true, currentWindow: true }, async ([tab]) => {
    if (!tab) {
      sendResponse({ status: "error", message: "No active tab found." });
      return;
    }

    let hostname = "";
    try {
      hostname = new URL(tab.url ?? "").hostname;
    } catch (_) { /* invalid URL falls through to the check below */ }

    if (hostname !== "www.fourteenfish.com") {
      sendResponse({
        status: "error",
        message: "This extension only works on www.fourteenfish.com.",
      });
      return;
    }

    const sendProgress = (progress) => {
      chrome.runtime.sendMessage({ action: "captureProgress", format, ...progress })
        .catch(() => {});
    };

    try {
      await ensureContentScript(tab.id);
      const pageData = await getPageData(tab.id);

      if (!pageData.isLearningOutcomePage) {
        sendResponse({
          status: "error",
          message:
            "This doesn't look like a Learning Outcome page. Open an assessment entry that lists Learning Outcome codes and try again.",
        });
        return;
      }

      if (format === "pdf") {
        await captureAsPdf(tab.id, pageData, sendProgress);
      } else {
        await captureAsPng(tab.id, pageData, sendProgress);
      }

      sendResponse({ status: "done" });
    } catch (err) {
      sendResponse({ status: "error", message: err.message });
    }
  });

  return true; // keep message channel open for async response
});
