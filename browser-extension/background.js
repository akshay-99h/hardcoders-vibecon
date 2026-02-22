// Background Service Worker - Mission-Mode Browser Assistant
// Manages WebSocket connection to backend, coordinates automation tasks

const BACKEND_URL = 'https://raksha-govt-portal.preview.emergentagent.com';
let sessionToken = null;
let currentMission = null;
let automationState = 'idle'; // idle | awaiting_permission | running | paused | waiting_human
let automationTabId = null; // tab used for automation
let pollingInterval = null;
let isConnected = false;

// ─── Mission step runner state ───────────────────────────────────────────────
let missionSteps = [];
let currentStepIndex = 0;

function setAutomationState(newState) {
  automationState = newState;
  chrome.storage.local.set({ automationState: newState });
}

function adjustPollingSpeed() {
  // Slow poll when idle, fast poll when active
  if (!sessionToken) return;
  const isActive = automationState !== 'idle';
  if (pollingInterval) clearInterval(pollingInterval);
  pollingInterval = setInterval(() => pollCommands(sessionToken), isActive ? 2000 : 10000);
}

// ─── HTTP Polling Connection ─────────────────────────────────────────────────

async function connectPolling(token) {
  if (!token) {
    console.log('[Mission] No token, skipping polling registration');
    return;
  }
  if (isConnected && pollingInterval) return;

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

function startPolling(token) {
  if (pollingInterval) clearInterval(pollingInterval);
  pollingInterval = setInterval(() => pollCommands(token), 2000);
  console.log('[Mission] Polling started (every 2s)');
}

function stopPolling() {
  if (pollingInterval) {
    clearInterval(pollingInterval);
    pollingInterval = null;
  }
  isConnected = false;
  broadcastToPopup({ type: 'WS_DISCONNECTED' });
}

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

      let stepObjects = [];
      let stepCounter = 0;
      const plan = msg.machine_plan;

      if (plan && plan.steps && plan.steps.length > 0) {
        // ── Machine plan mode: structured steps with selectors, conditions, verify ──
        console.log('[Mission] Using machine_plan with', plan.steps.length, 'structured steps');
        for (const s of plan.steps) {
          stepObjects.push({
            step_id: s.id ? `step_${s.id}` : `step_${Date.now()}_${stepCounter}`,
            action: s.human_required ? 'human_required' : (s.action || 'click'),
            machine_action: s.action, // original action type: navigate/click/type/select/wait/scroll
            title: s.goal || s.title || `Step ${stepCounter + 1}`,
            description: s.goal || s.title || '',
            label: s.goal || s.title || '',
            selectors: s.selectors || {},
            condition: s.condition || 'always',
            fallback: s.fallback || 'skip',
            verify: s.verify || {},
            url: s.url || msg.portal_url,
            sensitive: s.human_required || false,
            hint: s.human_required
              ? 'This step involves personal data. Please complete it manually, then it will auto-advance.'
              : `Auto-executing: ${s.goal || s.title || ''}`,
            value: s.value || null,
            domain_whitelist: plan.domain_whitelist || []
          });
          stepCounter++;
        }
      } else {
        // ── Legacy mode: convert string steps to step objects ──
        console.log('[Mission] Using legacy text steps');
        const rawSteps = msg.mission_steps || [];
        for (const s of rawSteps) {
          if (typeof s === 'object' && s.action) { stepObjects.push(s); stepCounter++; continue; }
          const raw = typeof s === 'string' ? s : (s.title || s.description || '');
          if (!raw) continue;
          const parts = raw.split(/(?<=[.!?])\s+|\s*###\s*|\s*\*\*Step\s+\d+/i).filter(Boolean);
          for (const part of parts) {
            const cleaned = part.replace(/\*\*/g, '').replace(/#{1,6}\s*/g, '').replace(/\[([^\]]+)\]\([^)]+\)/g, '$1').trim();
            if (cleaned.length < 5) continue;
            if (/^(step \d|method|option|after update|note:|security|privacy|important|valid address|offline method)/i.test(cleaned)) continue;
            const title = cleaned.slice(0, 120);
            const isSensitive = /aadhaar|pan|password|otp|dob|date of birth|mobile|phone|login|sign in|credentials|fill|enter|upload|pay|payment/i.test(title);
            stepObjects.push({
              step_id: `step_${Date.now()}_${stepCounter}`,
              action: 'human_required',
              title, description: title, label: title,
              sensitive: isSensitive,
              url: msg.portal_url,
              hint: isSensitive
                ? 'This step involves personal data. Please do it manually, then click Done.'
                : `Complete this step on the page: "${title}", then click Done.`
            });
            stepCounter++;
          }
        }
      }

      const mappedMsg = {
        type: 'AUTOMATION_START',
        mission: {
          mission_id: msg.mission_id,
          mission_title: msg.mission_title,
          mission_description: msg.mission_description,
        },
        steps: stepObjects,
        first_url: plan?.start_url || msg.portal_url
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
      // Try to open popup automatically
      if (chrome.action.openPopup) {
        chrome.action.openPopup().catch(() => {});
      }
      broadcastToPopup(permMsg);
      // Flash the extension badge to alert user
      chrome.action.setBadgeText({ text: '!' });
      chrome.action.setBadgeBackgroundColor({ color: '#f97316' });
      break;
    }

    case 'EXECUTE_STEP': {
      // Accept steps in running or awaiting_permission state (backend may send before popup acks)
      if (automationState === 'waiting_human' || automationState === 'idle') break;
      automationState = 'running';
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
      automationState = 'waiting_human';
      broadcastToPopup({ type: 'WAITING_HUMAN', label: msg.label, hint: msg.hint });
      break;
    }

    case 'STEP_COMPLETE': {
      broadcastToPopup({ type: 'STEP_COMPLETE', step: msg.step, progress: msg.progress });
      break;
    }

    case 'AUTOMATION_DONE': {
      automationState = 'idle';
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
      automationState = 'idle';
      broadcastToPopup({ type: 'AUTOMATION_ERROR', error: msg.error });
      break;
    }

    }
}

// ─── Step-by-Step Runner (Observe → Decide → Execute → Verify) ──────────────

let _resolveHumanStep = null; // resolve callback for current human_required step

// Check if a step's condition is met on the page
async function checkCondition(tabId, condition) {
  if (!condition || condition === 'always') return true;
  if (typeof condition === 'object' && condition.element_exists) {
    try {
      const result = await chrome.scripting.executeScript({
        target: { tabId },
        func: (selector) => !!document.querySelector(selector),
        args: [condition.element_exists]
      });
      return result[0]?.result === true;
    } catch (_) { return false; }
  }
  if (typeof condition === 'object' && condition.url_contains) {
    try {
      const tab = await chrome.tabs.get(tabId);
      return tab.url && tab.url.includes(condition.url_contains);
    } catch (_) { return false; }
  }
  return true; // unknown condition type → proceed
}

// Verify a step succeeded
async function verifyStep(tabId, verify) {
  if (!verify || Object.keys(verify).length === 0) return true;
  try {
    if (verify.url_contains) {
      const tab = await chrome.tabs.get(tabId);
      return tab.url && tab.url.includes(verify.url_contains);
    }
    if (verify.page_changed) return true; // we check URL change separately
    if (verify.element_exists) {
      const result = await chrome.scripting.executeScript({
        target: { tabId },
        func: (sel) => !!document.querySelector(sel),
        args: [verify.element_exists]
      });
      return result[0]?.result === true;
    }
    if (verify.element_has_value) return true; // trust that typing worked
  } catch (_) {}
  return true; // if we can't verify, assume success
}

// Execute a machine plan step automatically (click/type/select using selectors)
async function executeMachineStep(tabId, step) {
  const action = step.machine_action || step.action;

  if (action === 'navigate') {
    const url = step.url;
    if (url) {
      await chrome.tabs.update(tabId, { url });
      await waitForTabLoad(tabId);
      await sleep(1500);
    }
    return true;
  }

  if (action === 'wait') {
    await sleep(3000);
    return true;
  }

  if (action === 'scroll') {
    await chrome.scripting.executeScript({
      target: { tabId },
      func: () => window.scrollBy(0, 400)
    }).catch(() => {});
    await sleep(500);
    return true;
  }

  // click / type / select — find element using selectors
  const sel = step.selectors || {};
  const result = await chrome.scripting.executeScript({
    target: { tabId },
    func: (selectors, actionType, value) => {
      // Try multiple selector strategies in priority order
      let el = null;

      // 1. CSS selector
      if (selectors.css) {
        const parts = selectors.css.split(',').map(s => s.trim());
        for (const s of parts) {
          try { el = document.querySelector(s); } catch (_) {}
          if (el) break;
        }
      }

      // 2. aria-label
      if (!el && selectors.aria_label) {
        el = document.querySelector(`[aria-label="${selectors.aria_label}"]`)
          || document.querySelector(`[aria-label*="${selectors.aria_label}" i]`);
      }

      // 3. Role + text
      if (!el && selectors.role && selectors.text) {
        const candidates = document.querySelectorAll(`[role="${selectors.role}"], ${selectors.role === 'button' ? 'button' : selectors.role === 'link' ? 'a' : `[role="${selectors.role}"]`}`);
        const textLower = selectors.text.toLowerCase();
        for (const c of candidates) {
          const t = (c.innerText || c.textContent || '').trim().toLowerCase();
          if (t === textLower || t.includes(textLower)) { el = c; break; }
        }
      }

      // 4. Text match (broad — search all interactive elements)
      if (!el && selectors.text) {
        const textLower = selectors.text.toLowerCase();
        const all = document.querySelectorAll('a, button, [role="button"], input[type="submit"], input[type="button"], [role="menuitem"], [role="option"], [role="tab"], label, summary');
        for (const c of all) {
          const t = (c.innerText || c.textContent || c.value || '').trim().toLowerCase();
          if (t === textLower || t.includes(textLower)) { el = c; break; }
        }
      }

      // 5. Placeholder (for inputs)
      if (!el && selectors.placeholder) {
        el = document.querySelector(`input[placeholder*="${selectors.placeholder}" i], textarea[placeholder*="${selectors.placeholder}" i]`);
      }

      if (!el) return { found: false };

      // Highlight briefly
      el.style.outline = '3px solid #22c55e';
      el.style.boxShadow = '0 0 0 6px rgba(34,197,94,0.3)';
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });

      if (actionType === 'click') {
        el.click();
        setTimeout(() => { el.style.outline = ''; el.style.boxShadow = ''; }, 1500);
        return { found: true, clicked: true, text: (el.innerText || '').trim().slice(0, 60) };
      }

      if (actionType === 'type') {
        el.focus();
        // Don't auto-type if value is a placeholder like {{user_input}}
        if (value && !value.startsWith('{{')) {
          el.value = value;
          el.dispatchEvent(new Event('input', { bubbles: true }));
          el.dispatchEvent(new Event('change', { bubbles: true }));
        }
        setTimeout(() => { el.style.outline = ''; el.style.boxShadow = ''; }, 1500);
        return { found: true, typed: true };
      }

      if (actionType === 'select') {
        if (el.tagName === 'SELECT' && value) {
          el.value = value;
          el.dispatchEvent(new Event('change', { bubbles: true }));
        } else {
          el.click();
        }
        setTimeout(() => { el.style.outline = ''; el.style.boxShadow = ''; }, 1500);
        return { found: true, selected: true };
      }

      // Default: just click
      el.click();
      setTimeout(() => { el.style.outline = ''; el.style.boxShadow = ''; }, 1500);
      return { found: true, clicked: true };
    },
    args: [sel, action, step.value]
  }).catch(() => [{ result: { found: false } }]);

  return result[0]?.result?.found === true;
}

async function runNextStep() {
  while (currentStepIndex < missionSteps.length) {
    // Bail out if automation was stopped
    if (automationState === 'idle' && missionSteps.length === 0) return;

    const step = missionSteps[currentStepIndex];
    const isMachinePlan = !!step.selectors && Object.keys(step.selectors).length > 0;
    console.log(`[Mission] Step ${currentStepIndex + 1}/${missionSteps.length} [${isMachinePlan ? 'machine' : 'legacy'}]:`, step.title || step.action);
    broadcastToPopup({ type: 'EXECUTING_STEP', step, progress: { current: currentStepIndex + 1, total: missionSteps.length } });

    setAutomationState('running');

    // Get the automation tab
    let tabId = automationTabId;
    if (!tabId) {
      const [activeTab] = await chrome.tabs.query({ active: true, currentWindow: true });
      tabId = activeTab?.id;
    }

    if (isMachinePlan && step.action !== 'human_required') {
      // ── Machine plan: Observe → Decide → Execute → Verify ──

      // OBSERVE: Check condition
      const conditionMet = await checkCondition(tabId, step.condition);
      if (!conditionMet) {
        console.log(`[Mission] Condition not met for step ${currentStepIndex + 1}, fallback: ${step.fallback}`);
        if (step.fallback === 'skip') {
          broadcastToPopup({ type: 'STEP_SKIPPED', step, reason: 'Condition not met' });
          currentStepIndex++;
          continue;
        }
        // retry: wait and try once more
        await sleep(2000);
        const retryMet = await checkCondition(tabId, step.condition);
        if (!retryMet) {
          console.log(`[Mission] Condition still not met after retry, skipping step ${currentStepIndex + 1}`);
          broadcastToPopup({ type: 'STEP_SKIPPED', step, reason: 'Condition not met after retry' });
          currentStepIndex++;
          continue;
        }
      }

      // EXECUTE
      const success = await executeMachineStep(tabId, step);
      await sleep(1500); // let page settle

      if (!success) {
        console.log(`[Mission] Step ${currentStepIndex + 1} failed to find element, fallback: ${step.fallback}`);
        if (step.fallback === 'skip') {
          broadcastToPopup({ type: 'STEP_SKIPPED', step, reason: 'Element not found' });
          currentStepIndex++;
          continue;
        }
        // retry once
        await sleep(2000);
        const retrySuccess = await executeMachineStep(tabId, step);
        if (!retrySuccess) {
          // Fall through to human mode for this step
          console.log(`[Mission] Retry failed, falling through to human mode for step ${currentStepIndex + 1}`);
          step.action = 'human_required';
          // Don't increment — re-process as human step
          continue;
        }
      }

      // VERIFY
      const verified = await verifyStep(tabId, step.verify);
      if (!verified) {
        console.log(`[Mission] Verification failed for step ${currentStepIndex + 1}`);
        // Continue anyway — verification is best-effort
      }

      sendWsMessage({ type: 'STEP_RESULT', step_id: step.step_id, success: true });

    } else if (step.action === 'human_required') {
      // ── Human-required step: wait for user interaction ──
      await new Promise((resolve) => {
        _resolveHumanStep = resolve;
        executeStep(step);
      });
      _resolveHumanStep = null;

    } else {
      // ── Legacy step (no selectors, non-human) ──
      await executeStep(step);
      await sleep(1000);
    }

    // Check again after step — STOP may have cleared missionSteps
    if (automationState === 'idle' || missionSteps.length === 0) return;

    currentStepIndex++;
  }

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
}

function advanceToNextStep() {
  // Resolve the waiting promise so runNextStep loop continues
  if (_resolveHumanStep) {
    _resolveHumanStep();
  }
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
          automationState = 'waiting_human';
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
        automationState = 'waiting_human';
        const stepId = step.step_id;
        const stepLabel = step.label || step.title;

        // Show immediately with analyzing hint
        const defaultHumanMsg = { type: 'WAITING_HUMAN', label: stepLabel, hint: '🔍 Analyzing page...', step_id: stepId };
        chrome.storage.local.set({ pendingHuman: defaultHumanMsg });
        if (chrome.action.openPopup) chrome.action.openPopup().catch(() => {});
        chrome.action.setBadgeText({ text: '✋' });
        chrome.action.setBadgeBackgroundColor({ color: '#f97316' });
        broadcastToPopup(defaultHumanMsg);
        chrome.tabs.sendMessage(tab.id, { type: 'HIGHLIGHT_FOR_HUMAN', label: stepLabel, hint: '🔍 Analyzing page...' }).catch(() => {});

        // ── Deep page analysis ──────────────────────────────────────────────
        try {
          const analysisResult = await chrome.scripting.executeScript({
            target: { tabId: tab.id },
            func: (stepTitle) => {
              // ── Gather all interactive elements with rich metadata ──
              const INTERACTIVE = 'a, button, [role="button"], [role="link"], [role="menuitem"], [role="option"], [role="tab"], input, select, textarea, [onclick], [tabindex], summary, details, label';
              const allEls = Array.from(document.querySelectorAll(INTERACTIVE));

              // Helper: get all text signals for an element
              function getSignals(el) {
                const text = (el.innerText || el.textContent || '').trim().slice(0, 200);
                const value = (el.value || '').trim();
                const ariaLabel = (el.getAttribute('aria-label') || '').trim();
                const title = (el.getAttribute('title') || '').trim();
                const placeholder = (el.getAttribute('placeholder') || '').trim();
                const href = (el.getAttribute('href') || '').trim();
                const alt = (el.getAttribute('alt') || '').trim();
                const name = (el.getAttribute('name') || '').trim();
                const id = (el.id || '').trim();
                const className = (el.className || '').toString().trim();
                // Nearby label (for inputs)
                let labelText = '';
                if (el.id) {
                  const lbl = document.querySelector(`label[for="${el.id}"]`);
                  if (lbl) labelText = lbl.innerText.trim();
                }
                // Parent context (section heading, card title)
                let parentContext = '';
                let p = el.parentElement;
                for (let i = 0; i < 5 && p; i++) {
                  const h = p.querySelector('h1, h2, h3, h4, h5, h6, .title, .heading, .card-title');
                  if (h && h !== el) { parentContext = h.innerText.trim().slice(0, 100); break; }
                  p = p.parentElement;
                }
                return { text, value, ariaLabel, title, placeholder, href, alt, name, id, className, labelText, parentContext, tagName: el.tagName.toLowerCase(), type: (el.type || '').toLowerCase() };
              }

              // ── Score each element against the step ──
              const stepLower = stepTitle.toLowerCase().replace(/\*\*/g, '');
              const stopWords = new Set(['the','a','an','to','on','in','for','and','or','of','is','it','this','that','with','from','your','click','step','please','proceed','button','select','enter','type','go','open','visit','navigate','choose','find','look']);
              const stepWords = stepLower.split(/\s+/).filter(w => w.length > 2 && !stopWords.has(w));

              // Detect step intent
              const isInputStep = /enter|type|fill|input|write|provide|number|code|otp|password|captcha/i.test(stepTitle);
              const isClickStep = /click|press|tap|select|choose|open|download|login|submit|send|sign|agree|check|review/i.test(stepTitle);
              const isNavStep = /go to|visit|navigate|open.*page|open.*site/i.test(stepTitle);

              const scored = [];
              for (const el of allEls) {
                // Skip invisible elements
                const rect = el.getBoundingClientRect();
                if (rect.width === 0 && rect.height === 0) continue;
                const style = window.getComputedStyle(el);
                if (style.display === 'none' || style.visibility === 'hidden' || style.opacity === '0') continue;

                const sig = getSignals(el);
                // Combine all text signals into one searchable string
                const allText = [sig.text, sig.value, sig.ariaLabel, sig.title, sig.placeholder, sig.alt, sig.labelText, sig.name, sig.id, sig.parentContext].join(' ').toLowerCase();

                let score = 0;

                // Word match scoring
                for (const w of stepWords) {
                  if (sig.text.toLowerCase().includes(w)) score += 3;
                  if (sig.ariaLabel.toLowerCase().includes(w)) score += 3;
                  if (sig.title.toLowerCase().includes(w)) score += 2;
                  if (sig.href.toLowerCase().includes(w)) score += 2;
                  if (sig.placeholder.toLowerCase().includes(w)) score += 2;
                  if (sig.labelText.toLowerCase().includes(w)) score += 2;
                  if (sig.parentContext.toLowerCase().includes(w)) score += 1;
                  if (sig.id.toLowerCase().includes(w)) score += 1;
                  if (sig.name.toLowerCase().includes(w)) score += 1;
                }

                // Exact phrase bonus
                const keyPhrase = stepWords.join(' ');
                if (keyPhrase && sig.text.toLowerCase().includes(keyPhrase)) score += 10;
                if (keyPhrase && sig.ariaLabel.toLowerCase().includes(keyPhrase)) score += 8;

                // Element type bonus based on step intent
                if (isInputStep && (sig.tagName === 'input' || sig.tagName === 'textarea' || sig.tagName === 'select')) score += 5;
                if (isClickStep && (sig.tagName === 'a' || sig.tagName === 'button' || el.getAttribute('role') === 'button')) score += 3;

                // Penalize very generic/short text
                if (sig.text.length < 3 && !sig.ariaLabel && !sig.placeholder) score -= 2;
                // Penalize hidden-ish elements (very small)
                if (rect.width < 10 || rect.height < 10) score -= 5;

                if (score > 0) {
                  scored.push({
                    score,
                    text: sig.text || sig.ariaLabel || sig.placeholder || sig.value || sig.title || `[${sig.tagName}]`,
                    tagName: sig.tagName,
                    type: sig.type,
                    isInput: sig.tagName === 'input' || sig.tagName === 'textarea' || sig.tagName === 'select',
                    rect: { top: rect.top, left: rect.left, width: rect.width, height: rect.height },
                    index: allEls.indexOf(el)
                  });
                }
              }

              // Sort by score descending
              scored.sort((a, b) => b.score - a.score);
              return scored.slice(0, 5); // return top 5 candidates
            },
            args: [stepLabel]
          });

          const candidates = analysisResult[0]?.result || [];
          const best = candidates[0];
          let aiHint = '';

          if (best) {
            const displayText = best.text.slice(0, 60);
            if (best.isInput) {
              aiHint = `Enter your information in the "${displayText}" field.`;
            } else {
              aiHint = `Click "${displayText}" to proceed.`;
            }

            // Highlight the best matching element on the page
            await chrome.scripting.executeScript({
              target: { tabId: tab.id },
              func: (bestIndex, allCandidateIndices) => {
                // Clear old highlights
                document.querySelectorAll('[data-mm-highlight]').forEach(el => {
                  el.style.outline = ''; el.style.boxShadow = ''; el.style.position = '';
                  el.removeAttribute('data-mm-highlight'); el.removeAttribute('data-mm-rank');
                });

                const INTERACTIVE = 'a, button, [role="button"], [role="link"], [role="menuitem"], [role="option"], [role="tab"], input, select, textarea, [onclick], [tabindex], summary, details, label';
                const allEls = Array.from(document.querySelectorAll(INTERACTIVE));

                // Highlight best match (orange pulse)
                const bestEl = allEls[bestIndex];
                if (bestEl) {
                  bestEl.setAttribute('data-mm-highlight', 'best');
                  bestEl.setAttribute('data-mm-rank', '1');
                  bestEl.style.outline = '3px solid #f97316';
                  bestEl.style.boxShadow = '0 0 0 6px rgba(249,115,22,0.4)';
                  bestEl.style.borderRadius = '4px';
                  bestEl.scrollIntoView({ behavior: 'smooth', block: 'center' });

                  // Pulse animation
                  let on = true;
                  const iv = setInterval(() => {
                    if (!bestEl.hasAttribute('data-mm-highlight')) { clearInterval(iv); return; }
                    on = !on;
                    bestEl.style.boxShadow = on ? '0 0 0 6px rgba(249,115,22,0.4)' : '0 0 0 2px rgba(249,115,22,0.15)';
                  }, 600);
                }

                // Subtle highlight on 2nd/3rd candidates (light blue, no pulse)
                for (let i = 1; i < Math.min(allCandidateIndices.length, 3); i++) {
                  const el = allEls[allCandidateIndices[i]];
                  if (el) {
                    el.setAttribute('data-mm-highlight', 'alt');
                    el.setAttribute('data-mm-rank', String(i + 1));
                    el.style.outline = '2px dashed #60a5fa';
                    el.style.borderRadius = '4px';
                  }
                }
              },
              args: [best.index, candidates.map(c => c.index)]
            }).catch(() => {});
          } else {
            aiHint = step.hint || `Complete this step on the page, then click Done.`;
          }

          // Update popup and toast
          const humanMsg = { type: 'WAITING_HUMAN', label: stepLabel, hint: aiHint, step_id: stepId };
          chrome.storage.local.set({ pendingHuman: humanMsg });
          broadcastToPopup(humanMsg);
          chrome.tabs.sendMessage(tab.id, { type: 'UPDATE_HINT', hint: aiHint }).catch(() => {});

          // ── Smart auto-advance: watch clicks, form submits, URL changes ──
          const startUrl = (await chrome.tabs.get(tab.id).catch(() => ({url:''})))?.url || '';
          let advanced = false;

          function doAdvance() {
            if (advanced) return;
            advanced = true;
            clearInterval(urlPoller);
            clearInterval(interactionPoller);
            chrome.storage.local.remove('pendingHuman');
            automationState = 'running';
            chrome.action.setBadgeText({ text: '▶' });
            chrome.action.setBadgeBackgroundColor({ color: '#3b82f6' });
            sendWsMessage({ type: 'HUMAN_DONE', step_id: stepId });
            broadcastToPopup({ type: 'EXECUTING_STEP', step: { title: 'Moving to next step...', description: '' } });
            chrome.scripting.executeScript({
              target: { tabId: tab.id },
              func: () => {
                document.querySelectorAll('[data-mm-highlight]').forEach(el => {
                  el.style.outline = ''; el.style.boxShadow = ''; el.removeAttribute('data-mm-highlight'); el.removeAttribute('data-mm-rank');
                });
                const t = document.getElementById('mm-toast');
                if (t) t.remove();
                // Clean up interaction tracker
                delete window.__mmInteraction;
              }
            }).catch(() => {});
            setTimeout(() => advanceToNextStep(), 2000);
          }

          const watchTabId = automationTabId || tab.id;

          // Inject interaction tracker into the page
          await chrome.scripting.executeScript({
            target: { tabId: watchTabId },
            func: () => {
              if (window.__mmInteraction) return; // already injected
              window.__mmInteraction = { type: null, time: 0 };

              // Click on highlighted element → immediate signal
              document.addEventListener('click', (e) => {
                const target = e.target.closest('[data-mm-highlight]');
                if (target) {
                  window.__mmInteraction = { type: 'highlight_click', time: Date.now() };
                  return;
                }
                // Click on any interactive element → delayed signal
                const interactive = e.target.closest('a, button, [role="button"], input[type="submit"], input[type="button"], select, [onclick]');
                if (interactive) {
                  window.__mmInteraction = { type: 'interactive_click', time: Date.now() };
                }
              }, true);

              // Form submit → immediate signal
              document.addEventListener('submit', () => {
                window.__mmInteraction = { type: 'form_submit', time: Date.now() };
              }, true);

              // Input change (for dropdowns, checkboxes, file uploads) → delayed signal
              document.addEventListener('change', (e) => {
                if (e.target.matches('select, input[type="file"], input[type="checkbox"], input[type="radio"]')) {
                  window.__mmInteraction = { type: 'input_change', time: Date.now() };
                }
              }, true);
            }
          }).catch(() => {});

          // Poll for user interactions
          let lastInteractionTime = 0;
          const interactionPoller = setInterval(async () => {
            if (advanced) { clearInterval(interactionPoller); return; }
            try {
              const res = await chrome.scripting.executeScript({
                target: { tabId: watchTabId },
                func: () => window.__mmInteraction || { type: null, time: 0 }
              });
              const interaction = res[0]?.result;
              if (!interaction || !interaction.time || interaction.time <= lastInteractionTime) return;
              lastInteractionTime = interaction.time;

              if (interaction.type === 'highlight_click' || interaction.type === 'form_submit') {
                // User clicked the highlighted element or submitted a form → advance quickly
                clearInterval(interactionPoller);
                setTimeout(doAdvance, 1500);
              } else if (interaction.type === 'interactive_click' || interaction.type === 'input_change') {
                // User clicked some other interactive element → wait 3s to see if URL changes first
                setTimeout(() => {
                  if (!advanced) doAdvance();
                }, 3000);
              }
            } catch (_) { clearInterval(interactionPoller); }
          }, 500);

          // URL change watcher
          const urlPoller = setInterval(async () => {
            if (advanced) { clearInterval(urlPoller); return; }
            try {
              const t = await chrome.tabs.get(watchTabId);
              if (t.url && t.url !== startUrl && !t.url.startsWith('chrome')) {
                clearInterval(urlPoller);
                setTimeout(doAdvance, 1500);
              }
            } catch (_) { clearInterval(urlPoller); }
          }, 800);

          // Stop watchers after 10 minutes
          setTimeout(() => { clearInterval(urlPoller); clearInterval(interactionPoller); }, 600000);

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
      sessionToken = msg.token;
      connectPolling(sessionToken);
      chrome.storage.local.set({ sessionToken: msg.token });
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
      automationState = 'running';
      chrome.action.setBadgeText({ text: '▶' });
      chrome.action.setBadgeBackgroundColor({ color: '#3b82f6' });
      chrome.storage.local.remove('pendingPermission');
      // Open automation in a NEW tab, then tell backend to start
      const firstUrl = msg.firstUrl || 'https://uidai.gov.in';
      chrome.tabs.create({ url: firstUrl, active: true }, (newTab) => {
        automationTabId = newTab.id;
        // Notify backend AFTER tab is created so automationTabId is ready
        sendWsMessage({ type: 'PERMISSION_GRANTED', mission_id: currentMission?.mission_id });
      });
      sendResponse({ ok: true });
      break;
    }

    case 'PERMISSION_DENIED': {
      automationState = 'idle';
      sendWsMessage({ type: 'PERMISSION_DENIED', mission_id: currentMission?.mission_id });
      sendResponse({ ok: true });
      break;
    }

    case 'HUMAN_DONE': {
      automationState = 'running';
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
      sendResponse({ ok: true });
      break;
    }

    case 'PAUSE': {
      automationState = 'paused';
      sendWsMessage({ type: 'PAUSE' });
      sendResponse({ ok: true });
      break;
    }

    case 'RESUME': {
      automationState = 'running';
      sendWsMessage({ type: 'RESUME' });
      sendResponse({ ok: true });
      break;
    }

    case 'STOP': {
      setAutomationState('idle');
      missionSteps = [];
      currentStepIndex = 0;
      // Resolve any pending human step so the loop exits
      if (_resolveHumanStep) { _resolveHumanStep(); _resolveHumanStep = null; }
      // Notify backend that automation was stopped (backend matches 'stop' type)
      sendWsMessage({ type: 'stop', automation_state: { status: 'idle' } });
      adjustPollingSpeed(); // switch to slow polling
      chrome.action.setBadgeText({ text: '' });
      chrome.storage.local.remove(['pendingPermission', 'pendingHuman', 'lastReceivedMissionId']);
      broadcastToPopup({ type: 'AUTOMATION_DONE', summary: 'Automation stopped.' });
      // Clear highlights in automation tab
      if (automationTabId) {
        chrome.scripting.executeScript({
          target: { tabId: automationTabId },
          func: () => {
            document.querySelectorAll('[data-mm-highlight]').forEach(el => {
              el.style.outline = ''; el.style.boxShadow = '';
              el.removeAttribute('data-mm-highlight'); el.removeAttribute('data-mm-rank');
            });
            const t = document.getElementById('mm-toast');
            if (t) t.remove();
            delete window.__mmInteraction;
          }
        }).catch(() => {});
      }
      chrome.tabs.query({ active: true, currentWindow: true }, ([tab]) => {
        if (tab && tab.id !== automationTabId) {
          chrome.tabs.sendMessage(tab.id, { type: 'CLEAR_HIGHLIGHTS' }).catch(() => {});
        }
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
    // Try frontend domain (same origin as backend in this deployment)
    const cookie2 = await chrome.cookies.get({ url: 'https://raksha-govt-portal.preview.emergentagent.com', name: 'session_token' });
    if (cookie2?.value) return cookie2.value;
  } catch (_) {}
  return null;
}

// ─── Init: restore token from cookie or storage ────────────────────────────

(async () => {
  // First try reading the httpOnly cookie directly
  const cookieToken = await readSessionCookie();
  if (cookieToken) {
    sessionToken = cookieToken;
    chrome.storage.local.set({ sessionToken: cookieToken });
    connectPolling(sessionToken);
    return;
  }
  // Fall back to stored token
  chrome.storage.local.get(['sessionToken'], (result) => {
    if (result.sessionToken) {
      sessionToken = result.sessionToken;
      connectPolling(sessionToken);
    } else {
      console.log('[Mission] No token found, extension idle');
    }
  });
})();
