// Background Service Worker - Mission-Mode Browser Assistant
// Manages WebSocket connection to backend, coordinates automation tasks

const BACKEND_URL = 'https://rti-helper-bot.preview.emergentagent.com';
let sessionToken = null;
let currentMission = null;
let automationState = 'idle'; // idle | awaiting_permission | running | paused | waiting_human
let automationTabId = null; // tab used for automation
let missionSteps = []; // all steps for current mission
let currentStepIndex = 0; // which step we're on

function setAutomationState(newState) {
  automationState = newState;
  chrome.storage.local.set({ automationState: newState });
}
function setAutomationTabId(tabId) {
  automationTabId = tabId;
  chrome.storage.local.set({ automationTabId: tabId });
}
let pollingInterval = null;
let isConnected = false;

// ─── HTTP Polling Connection ─────────────────────────────────────────────────

async function connectPolling(token) {
  if (!token) {
    console.log('[Mission] No token, skipping polling registration');
    return;
  }
  if (isConnected) return;

  try {
    const res = await fetch(`${BACKEND_URL}/api/automation/extension/register`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
    if (res.ok) {
      isConnected = true;
      console.log('[Mission] Extension registered via HTTP polling');
      broadcastToPopup({ type: 'WS_CONNECTED' });
      startPolling(token);
    } else {
      console.error('[Mission] Registration failed:', res.status);
      // Retry in 5s
      setTimeout(() => connectPolling(token), 5000);
    }
  } catch (err) {
    console.error('[Mission] Registration error:', err);
    setTimeout(() => connectPolling(token), 5000);
  }
}

const ALARM_NAME = 'automation_poll';

function startPolling(token) {
  // chrome.alarms survives service worker suspension (min period = 0.5 min for repeating)
  // For fast polling, we use a one-shot alarm that re-creates itself
  chrome.alarms.clear(ALARM_NAME);
  const delaySec = (automationState !== 'idle') ? 3 : 10;
  chrome.alarms.create(ALARM_NAME, { delayInMinutes: delaySec / 60 });
  console.log(`[Mission] Polling alarm set (${delaySec}s)`);
}

function adjustPollingSpeed() {
  if (!sessionToken) return;
  startPolling(sessionToken);
}

function stopPolling() {
  chrome.alarms.clear(ALARM_NAME);
  pollingInterval = null;
  isConnected = false;
  broadcastToPopup({ type: 'WS_DISCONNECTED' });
}

// Alarm handler — wakes up service worker
chrome.alarms.onAlarm.addListener(async (alarm) => {
  if (alarm.name !== ALARM_NAME) return;
  if (!sessionToken) return;
  await pollCommands(sessionToken);
  // Re-schedule next poll
  if (isConnected) {
    const delaySec = (automationState !== 'idle') ? 3 : 10;
    chrome.alarms.create(ALARM_NAME, { delayInMinutes: delaySec / 60 });
  }
});

async function pollCommands(token) {
  try {
    const res = await fetch(`${BACKEND_URL}/api/automation/extension/poll`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    if (!res.ok) {
      if (res.status === 401) { stopPolling(); return; }
      return;
    }
    const data = await res.json();
    if (data.commands && data.commands.length > 0) {
      for (const cmd of data.commands) {
        console.log('[Mission] Polled command:', cmd);
        handleBackendMessage(cmd);
      }
    }
  } catch (err) {
    console.error('[Mission] Poll error:', err);
  }
}

// ─── Handle Messages from Backend ───────────────────────────────────────────

async function handleBackendMessage(msg) {
  console.log('[Mission] Backend message:', msg);

  switch (msg.type) {

    case 'start_automation': {
      // Ignore if we're already handling a mission
      if (automationState !== 'idle') break;
      // Check if we already processed this mission (survives SW restart)
      const mId = msg.mission_id;
      const { lastReceivedMissionId } = await chrome.storage.local.get('lastReceivedMissionId');
      if (lastReceivedMissionId === mId) {
        console.log('[Mission] Ignoring duplicate start_automation for:', mId);
        break;
      }
      chrome.storage.local.set({ lastReceivedMissionId: mId });

      // Convert string steps to step objects
      const rawSteps = msg.mission_steps || [];
      const stepObjects = rawSteps.map((s, i) => {
        // If already an object, use it
        if (typeof s === 'object' && s.action) return s;
        // Convert string to step object
        const title = typeof s === 'string' ? s : (s.title || s.description || `Step ${i + 1}`);
        const isSensitive = /aadhaar|pan|password|otp|dob|date of birth|mobile|phone|login|sign in|credentials|fill|enter|upload|pay|payment/i.test(title);
        return {
          step_id: `step_${Date.now()}_${i}`,
          action: 'human_required',
          title: title,
          description: title,
          label: title,
          sensitive: isSensitive,
          url: msg.portal_url,
          hint: isSensitive
            ? 'This step involves personal data. Please do it manually, then click Done.'
            : `Complete this step on the page: "${title}", then click Done.`
        };
      });

      const mappedMsg = {
        type: 'AUTOMATION_START',
        mission: {
          mission_id: msg.mission_id,
          mission_title: msg.mission_title,
          mission_description: msg.mission_description,
        },
        steps: stepObjects,
        first_url: msg.portal_url
      };
      handleBackendMessage(mappedMsg);
      break;
    }

    case 'AUTOMATION_START': {
      currentMission = msg.mission;
      missionSteps = msg.steps || [];
      currentStepIndex = 0;
      setAutomationState('awaiting_permission');
      const permMsg = {
        type: 'REQUEST_PERMISSION',
        mission: msg.mission,
        steps: msg.steps,
        firstUrl: msg.first_url
      };
      // Store so popup reads it on open
      chrome.storage.local.set({ lastPopupMsg: permMsg, pendingPermission: permMsg });
      broadcastToPopup(permMsg);
      // Flash the extension badge to alert user
      chrome.action.setBadgeText({ text: '!' });
      chrome.action.setBadgeBackgroundColor({ color: '#f97316' });
      break;
    }

    case 'EXECUTE_STEP': {
      // Accept steps in running or awaiting_permission state (backend may send before popup acks)
      if (automationState === 'waiting_human' || automationState === 'idle') break;
      setAutomationState('running');
      await executeStep(msg.step);
      break;
    }

    case 'HIGHLIGHT_ELEMENT': {
      // Ask content script to highlight an element needing human input
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (tab) {
        chrome.tabs.sendMessage(tab.id, {
          type: 'HIGHLIGHT_FOR_HUMAN',
          selector: msg.selector,
          label: msg.label,
          hint: msg.hint
        });
      }
      setAutomationState('waiting_human');
      broadcastToPopup({ type: 'WAITING_HUMAN', label: msg.label, hint: msg.hint });
      break;
    }

    case 'STEP_COMPLETE': {
      broadcastToPopup({ type: 'STEP_COMPLETE', step: msg.step, progress: msg.progress });
      break;
    }

    case 'AUTOMATION_DONE': {
      setAutomationState('idle');
      adjustPollingSpeed(); // switch to slow polling
      chrome.action.setBadgeText({ text: '✓' });
      chrome.action.setBadgeBackgroundColor({ color: '#22c55e' });
      broadcastToPopup({ type: 'AUTOMATION_DONE', summary: msg.summary });
      chrome.storage.local.remove('pendingPermission');
      // Clear highlights in automation tab
      if (automationTabId) {
        chrome.tabs.sendMessage(automationTabId, { type: 'CLEAR_HIGHLIGHTS' }).catch(() => {});
        automationTabId = null;
      }
      setTimeout(() => chrome.action.setBadgeText({ text: '' }), 5000);
      break;
    }

    case 'AUTOMATION_ERROR': {
      setAutomationState('idle');
      broadcastToPopup({ type: 'AUTOMATION_ERROR', error: msg.error });
      break;
    }

    }
}

// ─── Step-by-Step Runner ────────────────────────────────────────────────────

async function runNextStep() {
  if (currentStepIndex >= missionSteps.length) {
    // All steps done
    setAutomationState('idle');
    adjustPollingSpeed();
    chrome.action.setBadgeText({ text: '✓' });
    chrome.action.setBadgeBackgroundColor({ color: '#22c55e' });
    broadcastToPopup({ type: 'AUTOMATION_DONE', summary: 'All steps completed!' });
    chrome.storage.local.remove(['pendingPermission', 'pendingHuman']);
    sendWsMessage({ type: 'done', automation_state: { status: 'done' } });
    if (automationTabId) {
      chrome.tabs.sendMessage(automationTabId, { type: 'CLEAR_HIGHLIGHTS' }).catch(() => {});
    }
    return;
  }

  const step = missionSteps[currentStepIndex];
  console.log(`[Mission] Running step ${currentStepIndex + 1}/${missionSteps.length}:`, step.title || step.action);
  broadcastToPopup({ type: 'EXECUTING_STEP', step, progress: { current: currentStepIndex + 1, total: missionSteps.length } });

  setAutomationState('running');
  await executeStep(step);

  // If step is human_required, don't auto-advance — doAdvance() inside executeStep will call advanceToNextStep()
  // For other steps, advance immediately
  if (step.action !== 'human_required') {
    currentStepIndex++;
    await sleep(1000);
    runNextStep();
  }
}

function advanceToNextStep() {
  currentStepIndex++;
  runNextStep();
}

// ─── Execute a Single Automation Step ───────────────────────────────────────

async function executeStep(step) {
  // Use the dedicated automation tab, fall back to active tab
  let tab;
  if (automationTabId) {
    try {
      tab = await chrome.tabs.get(automationTabId);
    } catch (_) {
      automationTabId = null;
    }
  }
  if (!tab) {
    const [activeTab] = await chrome.tabs.query({ active: true, currentWindow: true });
    tab = activeTab;
  }
  if (!tab) return;

  broadcastToPopup({ type: 'EXECUTING_STEP', step });

  try {
    switch (step.action) {

      case 'navigate': {
        // Navigate within the automation tab (already opened as new tab)
        await chrome.tabs.update(tab.id, { url: step.url });
        await waitForTabLoad(tab.id);
        await sleep(1000);
        sendWsMessage({ type: 'STEP_RESULT', step_id: step.step_id, success: true });
        break;
      }

      case 'click': {
        const result = await chrome.scripting.executeScript({
          target: { tabId: tab.id },
          func: clickElement,
          args: [step.selector]
        });
        const success = result[0]?.result?.success ?? false;
        await sleep(1200); // pause so user sees the click effect
        sendWsMessage({ type: 'STEP_RESULT', step_id: step.step_id, success, error: result[0]?.result?.error });
        break;
      }

      case 'type': {
        // Sensitive fields — pause and ask human
        if (step.sensitive) {
          chrome.tabs.sendMessage(tab.id, {
            type: 'HIGHLIGHT_FOR_HUMAN',
            selector: step.selector,
            label: step.label || 'Enter your information',
            hint: step.hint || 'This field requires your personal data. Please fill it manually.'
          });
          setAutomationState('waiting_human');
          broadcastToPopup({ type: 'WAITING_HUMAN', label: step.label, hint: step.hint, step_id: step.step_id });
        } else {
          const result = await chrome.scripting.executeScript({
            target: { tabId: tab.id },
            func: typeInElement,
            args: [step.selector, step.value]
          });
          const success = result[0]?.result?.success ?? false;
          await sleep(1000);
          sendWsMessage({ type: 'STEP_RESULT', step_id: step.step_id, success });
        }
        break;
      }

      case 'wait_for_element': {
        const result = await chrome.scripting.executeScript({
          target: { tabId: tab.id },
          func: waitForElement,
          args: [step.selector, step.timeout || 10000]
        });
        sendWsMessage({ type: 'STEP_RESULT', step_id: step.step_id, success: result[0]?.result?.success ?? false });
        break;
      }

      case 'screenshot': {
        const dataUrl = await chrome.tabs.captureVisibleTab(tab.windowId, { format: 'png' });
        sendWsMessage({ type: 'SCREENSHOT', step_id: step.step_id, image: dataUrl });
        break;
      }

      case 'extract_text': {
        const result = await chrome.scripting.executeScript({
          target: { tabId: tab.id },
          func: extractText,
          args: [step.selector]
        });
        sendWsMessage({ type: 'EXTRACTED_TEXT', step_id: step.step_id, text: result[0]?.result });
        break;
      }

      case 'human_required': {
        setAutomationState('waiting_human');
        const stepId = step.step_id;
        const stepLabel = step.label || step.title;

        // Show immediately with default hint
        const defaultHumanMsg = { type: 'WAITING_HUMAN', label: stepLabel, hint: '🔍 Analyzing page...', step_id: stepId };
        chrome.storage.local.set({ pendingHuman: defaultHumanMsg });
        chrome.action.setBadgeText({ text: '✋' });
        chrome.action.setBadgeBackgroundColor({ color: '#f97316' });
        broadcastToPopup(defaultHumanMsg);
        // Show toast on page immediately
        chrome.tabs.sendMessage(tab.id, { type: 'HIGHLIGHT_FOR_HUMAN', label: stepLabel, hint: '🔍 Analyzing page...' }).catch(() => {});

        // Simple client-side DOM matching only
        try {
          const result = await chrome.scripting.executeScript({
            target: { tabId: tab.id },
            func: (stepTitle) => {
              const candidates = Array.from(document.querySelectorAll(
                'a, button, [role="button"], input[type="submit"], input[type="button"]'
              )).filter(el => {
                const t = (el.innerText || el.textContent || el.value || '').trim();
                return t && t.length > 1 && t.length < 80;
              });

              // Priority 1: language selector
              const pageText = document.body.innerText.toLowerCase();
              const langKeywords = ['english', 'hindi', 'हिंदी', 'select language', 'choose language', 'भाषा'];
              const isLangPage = langKeywords.some(k => pageText.includes(k));
              if (isLangPage) {
                const engEl = candidates.find(el => {
                  const t = (el.innerText || el.textContent || '').trim().toLowerCase();
                  return t === 'english' || t.startsWith('english');
                });
                if (engEl) return (engEl.innerText || engEl.textContent || '').trim();
              }

              // Priority 2: keyword matching
              const stepWords = stepTitle.toLowerCase().split(/\s+/).filter(w => w.length > 3);
              let bestMatch = null, bestScore = 0;
              for (const el of candidates) {
                const t = (el.innerText || el.textContent || el.value || '').trim();
                const tl = t.toLowerCase();
                let score = 0;
                for (const w of stepWords) if (tl.includes(w)) score++;
                if (score > bestScore) { bestScore = score; bestMatch = t; }
              }
              return bestScore >= 1 ? bestMatch : null;
            },
            args: [stepLabel]
          });
          const elementText = result[0]?.result || '';
          const aiHint = elementText ? `Click "${elementText}" to proceed with this step.` : `Complete this step on the page, then click Done.`;

          // Update popup
          const humanMsg = { type: 'WAITING_HUMAN', label: stepLabel, hint: aiHint, step_id: stepId };
          chrome.storage.local.set({ pendingHuman: humanMsg });
          broadcastToPopup(humanMsg);
          chrome.tabs.sendMessage(tab.id, { type: 'UPDATE_HINT', hint: aiHint }).catch(() => {});

          // Highlight element on page
          if (elementText) {
            await chrome.scripting.executeScript({
              target: { tabId: tab.id },
              func: (elText) => {
                document.querySelectorAll('[data-mm-highlight]').forEach(el => {
                  el.style.outline = '';
                  el.style.boxShadow = '';
                  el.removeAttribute('data-mm-highlight');
                });
                if (!elText) return;
                const lower = elText.toLowerCase().trim();
                const all = Array.from(document.querySelectorAll(
                  'a, button, input[type="submit"], input[type="button"], [role="button"], [role="menuitem"], [role="option"], li, option, span, div'
                ));
                const match = all.find(el => {
                  const t = (el.innerText || el.value || el.textContent || '').trim().toLowerCase();
                  return t === lower;
                }) || all.find(el => {
                  const t = (el.innerText || el.value || el.textContent || '').trim().toLowerCase();
                  return t.includes(lower) || lower.includes(t.slice(0, 20));
                });
                if (match) {
                  match.setAttribute('data-mm-highlight', 'true');
                  match.style.outline = '3px solid #f97316';
                  match.style.boxShadow = '0 0 0 6px rgba(249,115,22,0.4)';
                  match.style.borderRadius = '4px';
                  match.scrollIntoView({ behavior: 'smooth', block: 'center' });
                  let on = true;
                  const iv = setInterval(() => {
                    if (!document.querySelector('[data-mm-highlight]')) { clearInterval(iv); return; }
                    on = !on;
                    match.style.boxShadow = on ? '0 0 0 6px rgba(249,115,22,0.4)' : '0 0 0 2px rgba(249,115,22,0.15)';
                  }, 500);
                }
              },
              args: [elementText]
            }).catch(() => {});
          }

          // ── Background-side auto-advance watcher ──────────────────────────
          // Watch for URL change in the automation tab — no content script needed
          const startUrl = (await chrome.tabs.get(tab.id).catch(() => ({url:''})))?.url || '';
          let advanced = false;

          function doAdvance() {
            if (advanced) return;
            advanced = true;
            chrome.storage.local.remove('pendingHuman');
            setAutomationState('running');
            chrome.action.setBadgeText({ text: '▶' });
            chrome.action.setBadgeBackgroundColor({ color: '#3b82f6' });
            sendWsMessage({ type: 'HUMAN_DONE', step_id: stepId });
            broadcastToPopup({ type: 'EXECUTING_STEP', step: { title: 'Resuming...', description: '' } });
            // Advance to next step after clearing highlights
            setTimeout(() => advanceToNextStep(), 1500);
            // Clear highlights
            chrome.scripting.executeScript({
              target: { tabId: tab.id },
              func: () => {
                document.querySelectorAll('[data-mm-highlight]').forEach(el => {
                  el.style.outline = ''; el.style.boxShadow = ''; el.removeAttribute('data-mm-highlight');
                });
                const t = document.getElementById('mm-toast');
                if (t) t.remove();
              }
            }).catch(() => {});
          }

          const watchTabId = automationTabId || tab.id;

          // Inject click tracker into page
          chrome.scripting.executeScript({
            target: { tabId: watchTabId },
            func: () => {
              if (window.__mmClickTracking) return;
              window.__mmClickTracking = true;
              window.__mmLastClick = 0;
              document.addEventListener('click', () => { window.__mmLastClick = Date.now(); }, true);
              document.addEventListener('submit', () => { window.__mmLastClick = Date.now() + 500; }, true);
            }
          }).catch(() => {});

          // Poll tab URL every 800ms — if it changes, user navigated → advance
          const urlPoller = setInterval(async () => {
            if (advanced) { clearInterval(urlPoller); return; }
            try {
              const t = await chrome.tabs.get(watchTabId);
              if (t.url && t.url !== startUrl && !t.url.startsWith('chrome')) {
                clearInterval(urlPoller);
                setTimeout(doAdvance, 600);
              }
            } catch (_) { clearInterval(urlPoller); }
          }, 600);

          // Poll for clicks on the page
          let lastClickTime = 0;
          const clickPoller = setInterval(async () => {
            if (advanced) { clearInterval(clickPoller); return; }
            try {
              const res = await chrome.scripting.executeScript({
                target: { tabId: watchTabId },
                func: () => window.__mmLastClick || 0
              });
              const clickT = res[0]?.result || 0;
              if (clickT > lastClickTime && clickT > 0) {
                lastClickTime = clickT;
                // Wait to see if it caused a navigation (urlPoller will catch that)
                // If no navigation after 2s, advance anyway
                setTimeout(async () => {
                  if (advanced) return;
                  try {
                    const t2 = await chrome.tabs.get(watchTabId);
                    if (t2.url === startUrl) {
                      // No navigation, but user clicked — advance
                      clearInterval(clickPoller);
                      doAdvance();
                    }
                  } catch (_) {}
                }, 2000);
              }
            } catch (_) { clearInterval(clickPoller); }
          }, 500);

          // Stop pollers after 10 minutes
          setTimeout(() => { clearInterval(urlPoller); clearInterval(clickPoller); }, 600000);

          // Update toast on page with AI hint
          chrome.tabs.sendMessage(tab.id, { type: 'UPDATE_HINT', hint: aiHint }).catch(() => {});

          const aiHumanMsg = { type: 'WAITING_HUMAN', label: stepLabel, hint: aiHint, step_id: stepId };
          chrome.storage.local.set({ pendingHuman: aiHumanMsg });
          broadcastToPopup(aiHumanMsg);

        } catch (e) {
          console.error('[Mission] Page analysis error:', e);
          const fallbackMsg = { type: 'WAITING_HUMAN', label: stepLabel, hint: step.hint || `Complete this step, then click Done.`, step_id: stepId };
          chrome.storage.local.set({ pendingHuman: fallbackMsg });
          broadcastToPopup(fallbackMsg);
        }
        break;
      }
    }
  } catch (err) {
    console.error('[Mission] Step execution error:', err);
    sendWsMessage({ type: 'STEP_RESULT', step_id: step.step_id, success: false, error: err.message });
  }
}

// ─── DOM Functions (injected into page) ─────────────────────────────────────

function clickElement(selector) {
  try {
    const el = document.querySelector(selector);
    if (!el) return { success: false, error: `Element not found: ${selector}` };
    el.click();
    return { success: true };
  } catch (e) {
    return { success: false, error: e.message };
  }
}

function typeInElement(selector, value) {
  try {
    const el = document.querySelector(selector);
    if (!el) return { success: false, error: `Element not found: ${selector}` };
    el.focus();
    el.value = value;
    el.dispatchEvent(new Event('input', { bubbles: true }));
    el.dispatchEvent(new Event('change', { bubbles: true }));
    return { success: true };
  } catch (e) {
    return { success: false, error: e.message };
  }
}

function waitForElement(selector, timeout) {
  return new Promise((resolve) => {
    const el = document.querySelector(selector);
    if (el) return resolve({ success: true });
    const observer = new MutationObserver(() => {
      if (document.querySelector(selector)) {
        observer.disconnect();
        resolve({ success: true });
      }
    });
    observer.observe(document.body, { childList: true, subtree: true });
    setTimeout(() => { observer.disconnect(); resolve({ success: false }); }, timeout);
  });
}

function extractText(selector) {
  const el = selector ? document.querySelector(selector) : document.body;
  return el ? el.innerText : null;
}

function highlightElementByText(text) {
  // Remove any previous highlights
  document.querySelectorAll('[data-mission-highlight]').forEach(el => {
    el.style.outline = '';
    el.style.boxShadow = '';
    el.style.animation = '';
    el.removeAttribute('data-mission-highlight');
  });

  if (!text) return;

  // Find element by exact or partial text match
  const candidates = Array.from(document.querySelectorAll(
    'a, button, input, select, label, li, span, div, td, th, option, [role="button"], [role="menuitem"], [role="option"]'
  ));

  const lower = text.toLowerCase().trim();
  const match = candidates.find(el => {
    const t = (el.innerText || el.value || el.placeholder || el.textContent || '').toLowerCase().trim();
    return t === lower || t.includes(lower) || lower.includes(t);
  });

  if (match) {
    match.setAttribute('data-mission-highlight', 'true');
    match.style.outline = '3px solid #f97316';
    match.style.boxShadow = '0 0 0 6px rgba(249,115,22,0.35)';
    match.style.borderRadius = '4px';
    match.style.transition = 'box-shadow 0.3s ease';
    match.scrollIntoView({ behavior: 'smooth', block: 'center' });

    // Pulse animation
    let visible = true;
    const pulse = setInterval(() => {
      if (!document.querySelector('[data-mission-highlight]')) { clearInterval(pulse); return; }
      visible = !visible;
      match.style.boxShadow = visible
        ? '0 0 0 6px rgba(249,115,22,0.35)'
        : '0 0 0 2px rgba(249,115,22,0.15)';
    }, 600);
  }
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function waitForTabLoad(tabId) {
  return new Promise((resolve) => {
    const listener = (id, info) => {
      if (id === tabId && info.status === 'complete') {
        chrome.tabs.onUpdated.removeListener(listener);
        resolve();
      }
    };
    chrome.tabs.onUpdated.addListener(listener);
    setTimeout(resolve, 10000); // max wait 10s
  });
}

function sendWsMessage(msg) {
  if (!sessionToken) return;
  fetch(`${BACKEND_URL}/api/automation/extension/message`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${sessionToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(msg)
  }).catch(err => console.error('[Mission] Send message error:', err));
}

function broadcastToPopup(msg) {
  // Store last state so popup can read it when opened
  chrome.storage.local.set({ lastPopupMsg: msg });
  chrome.runtime.sendMessage(msg).catch(() => {}); // popup may not be open
}

// ─── Messages from Popup ─────────────────────────────────────────────────────

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  switch (msg.type) {

    case 'SET_TOKEN': {
      if (msg.token && msg.token !== sessionToken) {
        sessionToken = msg.token;
        chrome.storage.local.set({ sessionToken: msg.token });
        connectPolling(sessionToken);
      }
      sendResponse({ ok: true });
      break;
    }

    case 'CHECK_COOKIE': {
      // Read httpOnly session_token cookie via chrome.cookies API
      readSessionCookie().then(token => {
        if (token && token !== sessionToken) {
          sessionToken = token;
          connectPolling(sessionToken);
          chrome.storage.local.set({ sessionToken: token });
        }
      });
      sendResponse({ ok: true });
      break;
    }

    case 'GET_STATE': {
      sendResponse({ automationState, currentMission, connected: isConnected });
      break;
    }

    case 'PERMISSION_GRANTED': {
      setAutomationState('running');
      adjustPollingSpeed(); // switch to fast polling
      chrome.action.setBadgeText({ text: '▶' });
      chrome.action.setBadgeBackgroundColor({ color: '#3b82f6' });
      chrome.storage.local.remove('pendingPermission');
      // Open automation in a NEW tab, then start running steps
      const firstUrl = msg.firstUrl || 'https://uidai.gov.in';
      chrome.tabs.create({ url: firstUrl, active: true }, (newTab) => {
        setAutomationTabId(newTab.id);
        sendWsMessage({ type: 'PERMISSION_GRANTED', mission_id: currentMission?.mission_id });
        // Wait for tab to load, then start step-by-step execution
        waitForTabLoad(newTab.id).then(() => {
          sleep(1500).then(() => runNextStep());
        });
      });
      sendResponse({ ok: true });
      break;
    }

    case 'PERMISSION_DENIED': {
      setAutomationState('idle');
      sendWsMessage({ type: 'PERMISSION_DENIED', mission_id: currentMission?.mission_id });
      sendResponse({ ok: true });
      break;
    }

    case 'HUMAN_DONE': {
      setAutomationState('running');
      sendWsMessage({ type: 'HUMAN_DONE', step_id: msg.step_id });
      // Clear highlights in automation tab
      if (automationTabId) {
        chrome.scripting.executeScript({
          target: { tabId: automationTabId },
          func: () => {
            document.querySelectorAll('[data-mission-highlight]').forEach(el => {
              el.style.outline = '';
              el.style.boxShadow = '';
              el.removeAttribute('data-mission-highlight');
            });
          }
        }).catch(() => {});
      }
      // Advance to next step
      setTimeout(() => advanceToNextStep(), 1000);
      sendResponse({ ok: true });
      break;
    }

    case 'PAUSE': {
      setAutomationState('paused');
      sendWsMessage({ type: 'PAUSE' });
      sendResponse({ ok: true });
      break;
    }

    case 'RESUME': {
      setAutomationState('running');
      sendWsMessage({ type: 'RESUME' });
      sendResponse({ ok: true });
      break;
    }

    case 'STOP': {
      setAutomationState('idle');
      sendWsMessage({ type: 'STOP' });
      chrome.tabs.query({ active: true, currentWindow: true }, ([tab]) => {
        if (tab) chrome.tabs.sendMessage(tab.id, { type: 'CLEAR_HIGHLIGHTS' });
      });
      sendResponse({ ok: true });
      break;
    }
  }
  return true; // keep channel open for async
});

// ─── Read session_token from httpOnly cookie ────────────────────────────────

async function readSessionCookie() {
  try {
    // Try backend domain first
    const cookie = await chrome.cookies.get({ url: BACKEND_URL, name: 'session_token' });
    if (cookie?.value) return cookie.value;
    // Try frontend domain
    const cookie2 = await chrome.cookies.get({ url: 'https://rti-helper-bot.preview.emergentagent.com', name: 'session_token' });
    if (cookie2?.value) return cookie2.value;
  } catch (_) {}
  return null;
}

// ─── Init: restore token and state from cookie/storage ──────────────────────

(async () => {
  console.log('[Mission] Service worker init...');

  // Restore automation state from storage (survives SW suspension)
  const stored = await chrome.storage.local.get(['sessionToken', 'automationState', 'automationTabId']);
  if (stored.automationState) automationState = stored.automationState;
  if (stored.automationTabId) automationTabId = stored.automationTabId;

  // Try reading the httpOnly cookie directly
  const cookieToken = await readSessionCookie();
  if (cookieToken) {
    sessionToken = cookieToken;
    chrome.storage.local.set({ sessionToken: cookieToken });
    connectPolling(sessionToken);
    return;
  }
  // Fall back to stored token
  if (stored.sessionToken) {
    sessionToken = stored.sessionToken;
    connectPolling(sessionToken);
  } else {
    console.log('[Mission] No token found, extension idle');
  }
})();
