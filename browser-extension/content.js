// Content Script - RakshaAI Assistant
// Injected into all pages to handle highlight overlays and user interaction hints

(function () {
  'use strict';

  let toastEl = null;
  let highlightedEls = [];

  // ─── Toast Notification ───────────────────────────────────────────────────

  function showToast(label, hint) {
    removeToast();

    toastEl = document.createElement('div');
    toastEl.id = 'mm-toast';
    toastEl.style.cssText = `
      position: fixed;
      bottom: 24px;
      right: 24px;
      z-index: 2147483647;
      background: #1a2744;
      color: #fff;
      border: 1px solid #f97316;
      border-radius: 12px;
      padding: 14px 18px;
      max-width: 340px;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      font-size: 14px;
      line-height: 1.5;
      box-shadow: 0 8px 32px rgba(249,115,22,0.25), 0 2px 8px rgba(0,0,0,0.4);
      transition: opacity 0.3s ease;
      pointer-events: none;
    `;

    const header = document.createElement('div');
    header.style.cssText = 'font-weight: 700; color: #f97316; margin-bottom: 6px; font-size: 12px; text-transform: uppercase; letter-spacing: 0.05em;';
    header.textContent = 'RakshaAI — Action Required';

    const labelEl = document.createElement('div');
    labelEl.style.cssText = 'font-weight: 600; margin-bottom: 4px;';
    labelEl.textContent = label || 'Complete this step';

    const hintEl = document.createElement('div');
    hintEl.id = 'mm-toast-hint';
    hintEl.style.cssText = 'color: #94a3b8; font-size: 13px;';
    hintEl.textContent = hint || '';

    toastEl.appendChild(header);
    toastEl.appendChild(labelEl);
    toastEl.appendChild(hintEl);
    document.body.appendChild(toastEl);
  }

  function updateToastHint(hint) {
    if (!toastEl) return;
    const hintEl = document.getElementById('mm-toast-hint');
    if (hintEl) hintEl.textContent = hint;
  }

  function removeToast() {
    if (toastEl) {
      toastEl.remove();
      toastEl = null;
    }
  }

  // ─── Element Highlighting ─────────────────────────────────────────────────

  function clearHighlights() {
    document.querySelectorAll('[data-mm-highlight]').forEach(el => {
      el.style.outline = '';
      el.style.boxShadow = '';
      el.style.borderRadius = '';
      el.removeAttribute('data-mm-highlight');
      el.removeAttribute('data-mm-rank');
    });
    highlightedEls = [];
    removeToast();
  }

  function highlightForHuman(selector, label, hint) {
    clearHighlights();
    showToast(label, hint);

    if (!selector) return;

    let el = null;
    try {
      el = document.querySelector(selector);
    } catch (_) {}

    if (!el) {
      // Try text-based fallback
      const all = document.querySelectorAll('a, button, [role="button"], input, select, textarea, label');
      const labelLower = (label || '').toLowerCase();
      for (const candidate of all) {
        const text = (candidate.innerText || candidate.textContent || candidate.placeholder || '').trim().toLowerCase();
        if (labelLower && text.includes(labelLower.split(' ')[0])) {
          el = candidate;
          break;
        }
      }
    }

    if (el) {
      el.setAttribute('data-mm-highlight', 'best');
      el.style.outline = '3px solid #f97316';
      el.style.boxShadow = '0 0 0 6px rgba(249,115,22,0.3)';
      el.style.borderRadius = '4px';
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      highlightedEls.push(el);

      // Pulse animation
      let on = true;
      const iv = setInterval(() => {
        if (!el.hasAttribute('data-mm-highlight')) { clearInterval(iv); return; }
        on = !on;
        el.style.boxShadow = on
          ? '0 0 0 6px rgba(249,115,22,0.4)'
          : '0 0 0 2px rgba(249,115,22,0.15)';
      }, 600);
    }
  }

  // ─── Message Listener ────────────────────────────────────────────────────

  chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
    switch (msg.type) {
      case 'HIGHLIGHT_FOR_HUMAN':
        highlightForHuman(msg.selector, msg.label, msg.hint);
        sendResponse({ ok: true });
        break;

      case 'CLEAR_HIGHLIGHTS':
        clearHighlights();
        sendResponse({ ok: true });
        break;

      case 'UPDATE_HINT':
        updateToastHint(msg.hint);
        sendResponse({ ok: true });
        break;

      default:
        break;
    }
    return true;
  });

})();
