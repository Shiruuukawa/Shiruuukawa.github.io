'use strict';

function addReminder() {
  if (!State.currentUser) return showToast('Sign in to use reminders', '⚠️');
  const text      = document.getElementById('reminderText').value.trim();
  const dateVal   = document.getElementById('reminderDate').value;
  const timeVal   = document.getElementById('reminderTimeInput').value;
  const fileInput = document.getElementById('reminderFile');

  if (!text)    return showToast('Please enter a reminder message', '⚠️');
  if (!dateVal) return showToast('Please pick a date', '⚠️');
  if (!timeVal) return showToast('Please pick a time', '⚠️');

  const dueMs = new Date(`${dateVal}T${timeVal}`).getTime();
  if (isNaN(dueMs)) return showToast('Invalid date/time', '⚠️');

  const reminders = State.reminders();
  reminders.push({
    id:        Date.now(),
    text,
    dateVal,
    timeVal,
    dueMs,
    fileName:  fileInput.files[0] ? fileInput.files[0].name : null,
    triggered: false,
  });
  reminders.sort((a, b) => a.dueMs - b.dueMs);
  State.saveReminders(reminders);

  document.getElementById('reminderText').value      = '';
  document.getElementById('reminderDate').value      = '';
  document.getElementById('reminderTimeInput').value = '';
  fileInput.value = '';
  _updateFileLabel(fileInput);
  renderReminders();
  showToast('Reminder set 🔔');
}

function deleteReminder(id) {
  State.saveReminders(State.reminders().filter(r => r.id !== id));
  renderReminders();
  showToast('Reminder removed');
}

function renderReminders() {
  const list = document.getElementById('reminderList');

  if (!State.currentUser) {
    list.innerHTML = `<div class="empty-state">
      <div class="empty-icon">🔒</div>
      <p>Sign in to view your personal reminders.</p>
    </div>`;
    return;
  }

  const reminders = State.reminders();
  const now       = Date.now();

  if (reminders.length === 0) {
    list.innerHTML = '<div class="empty-state"><div class="empty-icon">🔔</div><p>No reminders yet. Set one above!</p></div>';
    return;
  }

  list.innerHTML = reminders.map(r => {
    const diff      = r.dueMs - now;
    const isActive  = diff > 0 && !r.triggered;
    const isOverdue = diff <= 0 && !r.triggered;
    let badge = '';
    if (r.triggered) {
      badge = `<span class="countdown-badge" style="background:rgba(255,255,255,0.06);color:var(--text-mute)">Done</span>`;
    } else if (isOverdue) {
      badge = `<span class="countdown-badge overdue">Overdue</span>`;
    } else if (diff < 3600000) {
      badge = `<span class="countdown-badge">${Math.ceil(diff / 60000)}m left</span>`;
    } else if (diff < 86400000) {
      badge = `<span class="countdown-badge">${Math.ceil(diff / 3600000)}h left</span>`;
    } else {
      const d = new Date(r.dueMs);
      badge = `<span class="countdown-badge">${d.toLocaleDateString('en-PH',{month:'short',day:'numeric'})}</span>`;
    }

    const dueLabel = new Date(r.dueMs).toLocaleString('en-PH', {
      month:'short', day:'numeric', year:'numeric',
      hour:'numeric', minute:'2-digit', hour12:true,
    });

    return `<div class="reminder-item ${isActive ? 'active' : ''} ${r.triggered ? 'triggered' : ''}">
      <div class="reminder-content">
        <div class="reminder-text">${escapeHtml(r.text)}</div>
        <div class="reminder-time-label">🕐 ${dueLabel}${isOverdue ? ' <span style="color:#f87171">(Overdue)</span>' : ''}</div>
        ${r.fileName ? `<div class="reminder-attachment">📎 ${escapeHtml(r.fileName)}</div>` : ''}
      </div>
      <div class="reminder-actions">
        ${badge}
        <button class="btn btn-danger btn-sm" onclick="deleteReminder(${r.id})">✕</button>
      </div>
    </div>`;
  }).join('');
}

function checkReminders() {
  if (!State.currentUser) return;
  const reminders = State.reminders();
  const now       = Date.now();
  let updated     = false;
  reminders.forEach(r => {
    if (!r.triggered && r.dueMs <= now) {
      r.triggered = true;
      updated = true;
      _playDing();
      showToast(`🔔 ${r.text.substring(0, 45)}${r.text.length > 45 ? '...' : ''}`, '🔔');
    }
  });
  if (updated) {
    State.saveReminders(reminders);
    renderReminders();
  }
}

function _playDing() {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    [[800, 0], [600, 0.22]].forEach(([freq, delay]) => {
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.connect(g); g.connect(ctx.destination);
      o.frequency.value = freq; o.type = 'sine';
      g.gain.setValueAtTime(0, ctx.currentTime + delay);
      g.gain.linearRampToValueAtTime(0.3, ctx.currentTime + delay + 0.02);
      g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + delay + 0.55);
      o.start(ctx.currentTime + delay);
      o.stop(ctx.currentTime + delay + 0.6);
    });
  } catch(e) {}
}

function _updateFileLabel(input) {
  const label = document.getElementById('fileLabel');
  if (input.files && input.files[0]) {
    label.textContent = `📎 ${input.files[0].name}`;
    label.style.borderColor = 'var(--accent)';
    label.style.color = 'var(--accent)';
  } else {
    label.textContent = '📎 Attach File (Optional)';
    label.style.borderColor = 'var(--glass-border)';
    label.style.color = 'var(--text-secondary)';
  }
}

document.addEventListener('DOMContentLoaded', () => {
  document.getElementById('reminderFile')?.addEventListener('change', function () { _updateFileLabel(this); });
  document.getElementById('reminderDate').value = todayStr();
});
