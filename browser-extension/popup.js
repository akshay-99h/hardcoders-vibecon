// Popup script — RakshaAI Browser Extension

const views = {
  idle: document.getElementById('idle-view'),
  permission: document.getElementById('permission-view'),
  running: document.getElementById('running-view'),
  human: document.getElementById('human-view'),
  done: document.getElementById('done-view'),
};

const statusPill = document.getElementById('status-pill');

function showView(name) {
  Object.entries(views).forEach(([key, el]) => {
    el.classList.toggle('hidden', key !== name);
  });
}

function setStatus(connected, running) {
  if (running) {
    statusPill.textContent = 'Running';
    statusPill.className = 'status-pill running';
  } else if (connected) {
    statusPill.textContent = 'Connected';
    statusPill.className = 'status-pill connected';
  } else {
    statusPill.textContent = 'Offline';
    statusPill.className = 'status-pill disconnected';
  }
}

function setProgress(current, total) {
  const pct = total > 0 ? Math.round((current / total) * 100) : 0;
  document.getElementById('progress-bar').style.width = pct + '%';
  document.getElementById('step-current').textContent = current;
  document.getElementById('step-total').textContent = total;
}

// ─── Message handlers ────────────────────────────────────────────────────────

function handleMsg(msg) {
  if (!msg) return;

  switch (msg.type) {
    case 'WS_CONNECTED':
      setStatus(true, false);
      if (views.idle.classList.contains('hidden') === false) {
        // already showing idle, just update pill
      }
      break;

    case 'WS_DISCONNECTED':
      setStatus(false, false);
      showView('idle');
      break;

    case 'REQUEST_PERMISSION': {
      const mission = msg.mission || {};
      document.getElementById('perm-title').textContent = mission.mission_title || 'New Automation Task';
      document.getElementById('perm-desc').textContent = mission.mission_description || '';
      const count = (msg.steps || []).length;
      document.getElementById('perm-steps').textContent = `${count} step${count !== 1 ? 's' : ''} planned`;
      setStatus(true, false);
      showView('permission');

      // Store mission data for Allow button
      document.getElementById('btn-allow')._pendingMsg = msg;
      break;
    }

    case 'EXECUTING_STEP': {
      const step = msg.step || {};
      const prog = msg.progress || {};
      document.getElementById('step-label').innerHTML =
        `<span class="spinner"></span> ${step.title || step.label || 'Executing step...'}`;
      document.getElementById('step-hint').textContent = step.hint || step.description || '';
      if (prog.current && prog.total) setProgress(prog.current, prog.total);
      setStatus(true, true);
      showView('running');
      break;
    }

    case 'WAITING_HUMAN': {
      document.getElementById('human-label').textContent = msg.label || 'Action required';
      document.getElementById('human-hint').textContent = msg.hint || 'Complete this step on the page, then click Done.';
      document.getElementById('btn-done')._stepId = msg.step_id;
      setStatus(true, true);
      showView('human');
      break;
    }

    case 'STEP_COMPLETE':
    case 'STEP_SKIPPED': {
      const prog = msg.progress || {};
      if (prog.current && prog.total) setProgress(prog.current, prog.total);
      break;
    }

    case 'AUTOMATION_DONE': {
      document.getElementById('done-summary').textContent = msg.summary || 'All steps completed successfully.';
      setStatus(true, false);
      showView('done');
      // Auto-return to idle after 4s
      setTimeout(() => showView('idle'), 4000);
      break;
    }

    case 'AUTOMATION_ERROR': {
      document.getElementById('done-summary').textContent = 'Error: ' + (msg.error || 'Unknown error');
      document.getElementById('done-view').querySelector('.done-icon').textContent = '✕';
      document.getElementById('done-view').querySelector('.done-msg').style.color = '#f87171';
      document.getElementById('done-view').querySelector('.done-msg').textContent = 'Automation Failed';
      setStatus(true, false);
      showView('done');
      setTimeout(() => showView('idle'), 5000);
      break;
    }
  }
}

// ─── Init ────────────────────────────────────────────────────────────────────

// Ask background for current state
chrome.runtime.sendMessage({ type: 'GET_STATE' }, (res) => {
  if (chrome.runtime.lastError) return;
  if (!res) return;
  setStatus(res.connected, res.automationState === 'running' || res.automationState === 'waiting_human');

  if (res.automationState === 'awaiting_permission' || res.automationState === 'running' || res.automationState === 'waiting_human') {
    // Read last popup message from storage
    chrome.storage.local.get(['lastPopupMsg', 'pendingPermission', 'pendingHuman'], (data) => {
      if (data.pendingPermission) {
        handleMsg(data.pendingPermission);
      } else if (data.pendingHuman) {
        handleMsg(data.pendingHuman);
      } else if (data.lastPopupMsg) {
        handleMsg(data.lastPopupMsg);
      }
    });
  }
});

// Listen for real-time messages from background
chrome.runtime.onMessage.addListener((msg) => {
  handleMsg(msg);
});

// ─── Button handlers ─────────────────────────────────────────────────────────

document.getElementById('btn-allow').addEventListener('click', () => {
  const msg = document.getElementById('btn-allow')._pendingMsg || {};
  chrome.runtime.sendMessage({
    type: 'PERMISSION_GRANTED',
    firstUrl: (msg.steps && msg.steps[0] && msg.steps[0].url) || msg.firstUrl,
    mission_id: (msg.mission || {}).mission_id,
  }, () => {});
  showView('running');
  setProgress(0, (msg.steps || []).length);
});

document.getElementById('btn-deny').addEventListener('click', () => {
  chrome.runtime.sendMessage({ type: 'PERMISSION_DENIED' }, () => {});
  showView('idle');
  setStatus(true, false);
});

document.getElementById('btn-stop').addEventListener('click', () => {
  chrome.runtime.sendMessage({ type: 'STOP' }, () => {});
  showView('idle');
  setStatus(true, false);
});

document.getElementById('btn-done').addEventListener('click', () => {
  const stepId = document.getElementById('btn-done')._stepId;
  chrome.runtime.sendMessage({ type: 'HUMAN_DONE', step_id: stepId }, () => {});
  document.getElementById('step-label').innerHTML = '<span class="spinner"></span> Continuing...';
  document.getElementById('step-hint').textContent = '';
  showView('running');
});

document.getElementById('btn-stop-human').addEventListener('click', () => {
  chrome.runtime.sendMessage({ type: 'STOP' }, () => {});
  showView('idle');
  setStatus(true, false);
});
