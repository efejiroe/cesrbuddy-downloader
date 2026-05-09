/**
 * Background service worker.
 *
 * Supports two capture formats triggered from the popup:
 *
 *   PNG  — full-page pixel-perfect screenshot.
 *          Uses Page.captureScreenshot with a 1280-px logical viewport at
 *          1.5× device scale (crisp 1920-px-wide image).
 *
 *   PDF  — single-page image PDF.
 *          Takes the same full-page screenshot as the PNG path, re-encodes it
 *          as JPEG, then wraps it in a minimal hand-built PDF sized to A4
 *          landscape.  One page, guaranteed — and the full viewport width
 *          means wide multi-column layouts (assessor column etc.) are never
 *          clipped.
 */

const VIEWPORT_WIDTH = 1280; // logical CSS px
const DEVICE_SCALE   = 1.5;  // → 1920 px physical width

// Hosts the extension is allowed to capture from.
// The github.io entry is a static test fixture for Chrome Web Store review
// and is not used in normal operation.
// ⚠ Replace efejiroe with your actual GitHub username before publishing.
const ALLOWED_HOSTS = new Set([
  "www.fourteenfish.com",
  "efejiroe.github.io",
]);

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
  const title = slugify(pageData.title)     || "Untitled";
  const type  = slugify(pageData.entryType) || "Entry";
  if (pageData.learningOutcomeCodes.length > 0) {
    const codes = pageData.learningOutcomeCodes.join("_");
    return `${codes}_${title}_${type}.${ext}`;
  }
  return `${title}_${type}.${ext}`;
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
// Takes a full-page screenshot (identical to the PNG path), re-encodes it as
// JPEG, then hand-builds a minimal single-page PDF around the image bytes.
// This sidesteps Chrome's print engine entirely — the result is always exactly
// one page and uses the same 1920-px-wide viewport as the PNG capture, so
// wide layouts (assessor column etc.) are never clipped.

function uint8ToBase64(bytes) {
  let s = "";
  const SZ = 0x8000;
  for (let i = 0; i < bytes.length; i += SZ)
    s += String.fromCharCode(...bytes.subarray(i, i + SZ));
  return btoa(s);
}

function buildImagePdf(jpegBytes, imgW, imgH) {
  // Scale image to fill A4 landscape (841.89 × 595.28 pt), centred
  const PW = 841.89, PH = 595.28;
  const sc = Math.min(PW / imgW, PH / imgH);
  const dW = (imgW * sc).toFixed(2);
  const dH = (imgH * sc).toFixed(2);
  const dX = ((PW - imgW * sc) / 2).toFixed(2);
  const dY = ((PH - imgH * sc) / 2).toFixed(2);

  const stream4 = `q\n${dW} 0 0 ${dH} ${dX} ${dY} cm\n/Im1 Do\nQ\n`;
  const enc = new TextEncoder();
  const chunks = [];
  let pos = 0;
  const off = [];

  const ws = (s) => { const b = enc.encode(s); chunks.push(b); pos += b.length; };
  const wb = (b) => {                           chunks.push(b); pos += b.length; };
  const mk = (n) => { off[n] = pos; };

  ws("%PDF-1.4\n");
  mk(1); ws("1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n");
  mk(2); ws("2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n");
  mk(3); ws(`3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${PW} ${PH}] /Contents 4 0 R /Resources << /XObject << /Im1 5 0 R >> >> >>\nendobj\n`);
  mk(4); ws(`4 0 obj\n<< /Length ${enc.encode(stream4).length} >>\nstream\n`);
         ws(stream4); ws("endstream\nendobj\n");
  mk(5); ws(`5 0 obj\n<< /Type /XObject /Subtype /Image /Width ${imgW} /Height ${imgH} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${jpegBytes.length} >>\nstream\n`);
         wb(jpegBytes); ws("\nendstream\nendobj\n");

  const xrefPos = pos;
  ws("xref\n0 6\n0000000000 65535 f \n");
  for (let i = 1; i <= 5; i++) ws(`${String(off[i]).padStart(10, "0")} 00000 n \n`);
  ws(`trailer\n<< /Size 6 /Root 1 0 R >>\nstartxref\n${xrefPos}\n%%EOF`);

  const out = new Uint8Array(chunks.reduce((s, c) => s + c.length, 0));
  let at = 0;
  for (const c of chunks) { out.set(c, at); at += c.length; }
  return out;
}

async function captureAsPdf(tabId, pageData, sendProgress) {
  const filename = buildFilename(pageData, "pdf");
  sendProgress({ status: "capturing", message: `Capturing page…\n${filename}` });

  await dbgAttach(tabId);
  try {
    // Same capture path as PNG
    await dbgSend(tabId, "Emulation.setDeviceMetricsOverride", {
      width: VIEWPORT_WIDTH, height: 900,
      deviceScaleFactor: DEVICE_SCALE, mobile: false,
    });
    await new Promise((r) => setTimeout(r, 600));

    const metrics = await dbgSend(tabId, "Page.getLayoutMetrics");
    const w = Math.ceil(metrics.cssContentSize.width);
    const h = Math.ceil(metrics.cssContentSize.height);

    await dbgSend(tabId, "Emulation.setDeviceMetricsOverride", {
      width: w, height: h,
      deviceScaleFactor: DEVICE_SCALE, mobile: false,
    });
    await new Promise((r) => setTimeout(r, 400));

    const { data: pngB64 } = await dbgSend(tabId, "Page.captureScreenshot", {
      format: "png",
      captureBeyondViewport: true,
      clip: { x: 0, y: 0, width: w, height: h, scale: 1 },
    });

    await dbgSend(tabId, "Emulation.clearDeviceMetricsOverride");

    // Re-encode as JPEG and wrap in a hand-built single-page PDF
    sendProgress({ status: "capturing", message: "Building PDF…" });
    const pngBytes  = Uint8Array.from(atob(pngB64), (c) => c.charCodeAt(0));
    const img       = await createImageBitmap(new Blob([pngBytes], { type: "image/png" }));
    const canvas    = new OffscreenCanvas(img.width, img.height);
    canvas.getContext("2d").drawImage(img, 0, 0);
    const jpegBytes = new Uint8Array(
      await (await canvas.convertToBlob({ type: "image/jpeg", quality: 0.92 })).arrayBuffer()
    );
    const pdfBytes = buildImagePdf(jpegBytes, img.width, img.height);

    sendProgress({ status: "downloading", message: "Saving PDF…" });
    await download("data:application/pdf;base64," + uint8ToBase64(pdfBytes), filename);
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

    if (!ALLOWED_HOSTS.has(hostname)) {
      sendResponse({
        status: "error",
        message: "This extension only works on www.fourteenfish.com.",
      });
      return;
    }

    if (hostname === "www.fourteenfish.com") {
      const pathname = new URL(tab.url ?? "").pathname;
      if (!pathname.startsWith("/trainer/view/")) {
        sendResponse({
          status: "error",
          message:
            "This doesn't look like an assessment entry. Navigate to a FourteenFish assessment entry (CBD, DOPS, Mini-CEX, etc.) and try again.",
        });
        return;
      }
    }

    const sendProgress = (progress) => {
      chrome.runtime.sendMessage({ action: "captureProgress", format, ...progress })
        .catch(() => {});
    };

    try {
      await ensureContentScript(tab.id);
      const pageData = await getPageData(tab.id);

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
