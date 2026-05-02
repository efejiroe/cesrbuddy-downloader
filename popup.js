const btnPng = document.getElementById("btn-png");
const btnPdf = document.getElementById("btn-pdf");
const statusEl = document.getElementById("status");

// Original button labels (restored after capture)
const LABELS = {
  png: btnPng.innerHTML,
  pdf: btnPdf.innerHTML,
};

// ─── helpers ─────────────────────────────────────────────────────────────────

function setStatus(text, type = "") {
  statusEl.className = type;
  statusEl.textContent = text;
}

function setLoading(format, loading) {
  if (format === "png") {
    btnPng.disabled = loading;
    btnPng.innerHTML = loading ? "Capturing…" : LABELS.png;
    btnPdf.disabled = loading; // disable the other button while busy
  } else {
    btnPdf.disabled = loading;
    btnPdf.innerHTML = loading ? "Generating…" : LABELS.pdf;
    btnPng.disabled = loading;
  }
}

// ─── progress listener ────────────────────────────────────────────────────────

chrome.runtime.onMessage.addListener((message) => {
  if (message.action !== "captureProgress") return;
  setStatus(message.message);
});

// ─── capture trigger ─────────────────────────────────────────────────────────

function triggerCapture(format) {
  setLoading(format, true);
  setStatus(format === "pdf" ? "Preparing PDF…" : "Preparing screenshot…");

  chrome.runtime.sendMessage({ action: "startCapture", format }, (response) => {
    setLoading(format, false);

    if (chrome.runtime.lastError) {
      setStatus("Error: " + chrome.runtime.lastError.message, "error");
      return;
    }

    if (!response || response.status === "error") {
      setStatus("Error: " + (response?.message ?? "Unknown error"), "error");
    } else {
      const label = format.toUpperCase();
      setStatus(`✓ ${label} saved — check your Downloads folder.`, "success");
    }
  });
}

btnPng.addEventListener("click", () => triggerCapture("png"));
btnPdf.addEventListener("click", () => triggerCapture("pdf"));
