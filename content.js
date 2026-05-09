/**
 * Extracts structured page data from a FourteenFish assessment page.
 * Returns: { title, entryType, learningOutcomeCodes }
 */
function extractPageData() {
  const data = {
    title: "",
    entryType: "",
    learningOutcomeCodes: [],
  };

  // --- Entry type: the <h1> at the top of the page (e.g. "Case-based Discussion") ---
  const h1 = document.querySelector("h1");
  if (h1) {
    data.entryType = h1.textContent.trim();
  }

  // --- Title: look for a row whose label is "Title" ---
  // FourteenFish renders rows as pairs of elements; the label and value sit
  // inside the same container row, e.g.:
  //   <div class="row">
  //     <div class="label">Title</div>
  //     <div class="value">Bilateral Optic Atrophy</div>
  //   </div>
  // We try several strategies so the extension is resilient to markup changes.

  // Strategy 1: find any element whose trimmed text is exactly "Title" and
  // grab its next sibling's text.
  const allElements = Array.from(document.querySelectorAll("*"));

  for (const el of allElements) {
    const text = el.childNodes.length === 1 &&
      el.childNodes[0].nodeType === Node.TEXT_NODE
      ? el.textContent.trim()
      : "";

    if (text === "Title") {
      const sibling = el.nextElementSibling;
      if (sibling) {
        data.title = sibling.textContent.trim();
        break;
      }
      // Some layouts use the parent's next sibling
      const parentSibling = el.parentElement && el.parentElement.nextElementSibling;
      if (parentSibling) {
        data.title = parentSibling.textContent.trim();
        break;
      }
    }
  }

  // Fallback: document <title> tag often contains the entry type and page name
  if (!data.title && document.title) {
    // e.g. "Bilateral Optic Atrophy | FourteenFish"
    data.title = document.title.split("|")[0].trim();
  }

  // --- Learning Outcome codes ---
  // Each LO appears as "Some description (CODE)" e.g. "Clinical history (CA1)"
  // We find labels that say "Learning Outcome" and extract the code from the
  // associated value using a regex.
  const codePattern = /\(([A-Z]{1,5}\d+)\)/g;

  for (const el of allElements) {
    const text = el.childNodes.length === 1 &&
      el.childNodes[0].nodeType === Node.TEXT_NODE
      ? el.textContent.trim()
      : "";

    if (text === "Learning Outcome") {
      // Try next sibling first, then parent's next sibling
      const candidates = [
        el.nextElementSibling,
        el.parentElement && el.parentElement.nextElementSibling,
      ].filter(Boolean);

      for (const candidate of candidates) {
        const valueText = candidate.textContent;
        let match;
        while ((match = codePattern.exec(valueText)) !== null) {
          const code = match[1];
          if (!data.learningOutcomeCodes.includes(code)) {
            data.learningOutcomeCodes.push(code);
          }
        }
        // Reset lastIndex after global regex use on the same string
        codePattern.lastIndex = 0;
        if (data.learningOutcomeCodes.length > 0) break;
      }
    }
  }

  return data;
}

/**
 * Returns an array of positioned text items from all visible text nodes.
 * Each item: { text, x, y, h, size } in CSS pixels, relative to the
 * document origin (works correctly when the devtools viewport override
 * has expanded the viewport to full page height, so scroll is zero).
 */
function extractTextLayer() {
  const items = [];
  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT, null);
  let node;
  while ((node = walker.nextNode())) {
    const text = node.textContent;
    if (!text.trim()) continue;
    const parent = node.parentElement;
    if (!parent) continue;
    const tag = parent.tagName.toLowerCase();
    if (tag === "script" || tag === "style" || tag === "noscript") continue;
    const cs = window.getComputedStyle(parent);
    if (cs.display === "none" || cs.visibility === "hidden") continue;
    const range = document.createRange();
    range.selectNodeContents(node);
    const br = range.getBoundingClientRect();
    if (br.width < 1 || br.height < 1) continue;
    items.push({ text, x: br.left, y: br.top, h: br.height, size: parseFloat(cs.fontSize) || 10 });
  }
  return items;
}

// Listen for messages from the popup / background script
chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message.action === "getPageData") {
    sendResponse(extractPageData());
  } else if (message.action === "getTextLayer") {
    sendResponse(extractTextLayer());
  }
  return false; // synchronous response is fine here
});
