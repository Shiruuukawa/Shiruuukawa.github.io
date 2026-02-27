'use strict';

const State = {
  currentUser:        localStorage.getItem('bscs_user') || null,
  selectedProfileIdx: null,
  currentTaskFilter:  'all',

  profiles:  () => JSON.parse(localStorage.getItem('bscs_profiles') || '[]'),
  tasks:     () => JSON.parse(localStorage.getItem('bscs_tasks_shared') || '[]'),
  reminders: () => {
    const u = State.currentUser;
    if (!u) return [];
    return JSON.parse(localStorage.getItem('bscs_rem_' + u) || '[]');
  },
  schedule: () => JSON.parse(localStorage.getItem('bscs_schedule') || '{}'),

  saveProfiles(v)  { localStorage.setItem('bscs_profiles',     JSON.stringify(v)); },
  saveTasks(v)     { localStorage.setItem('bscs_tasks_shared', JSON.stringify(v)); },
  saveReminders(v) {
    if (!State.currentUser) return;
    localStorage.setItem('bscs_rem_' + State.currentUser, JSON.stringify(v));
  },
  saveSchedule(v)  { localStorage.setItem('bscs_schedule', JSON.stringify(v)); },
};

function showPage(pageId) {
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('.nav-links a').forEach(a => a.classList.remove('active'));
  const el  = document.getElementById(pageId);
  const nav = document.getElementById('nav-' + pageId);
  if (el)  el.classList.add('active');
  if (nav) nav.classList.add('active');
  if (pageId === 'tasks')     renderTasks();
  if (pageId === 'calendar')  renderCalendar();
  if (pageId === 'schedule')  renderSchedule();
  if (pageId === 'reminders') renderReminders();
  window.scrollTo(0, 0);
}

let _toastTimer = null;
function showToast(message, icon) {
  icon = icon || '✓';
  document.getElementById('toastIcon').textContent    = icon;
  document.getElementById('toastMessage').textContent = message;
  const t = document.getElementById('toast');
  t.classList.add('show');
  clearTimeout(_toastTimer);
  _toastTimer = setTimeout(() => t.classList.remove('show'), 3200);
}

function escapeHtml(text) {
  if (!text) return '';
  const d = document.createElement('div');
  d.textContent = text;
  return d.innerHTML;
}

function formatDateLabel(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr + 'T00:00:00');
  return d.toLocaleDateString('en-PH', { weekday:'short', month:'short', day:'numeric' });
}

function todayStr() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
}

function openProfileModal() {
  _renderProfilesList();
  document.getElementById('nicknameInput').value = '';
  document.getElementById('profileModal').classList.add('active');
}
function closeProfileModal() { document.getElementById('profileModal').classList.remove('active'); }

function _renderProfilesList() {
  const profiles = State.profiles();
  const list = document.getElementById('profilesList');
  if (profiles.length === 0) {
    list.innerHTML = '<div style="color:var(--text-mute);font-size:0.83rem;text-align:center;padding:0.75rem">No profiles yet. Add one below!</div>';
    return;
  }
  list.innerHTML = profiles.map((p, i) => `
    <div class="profile-item ${State.selectedProfileIdx === i ? 'selected' : ''}" onclick="selectProfileItem(${i})">
      <div class="profile-avatar">${p[0].toUpperCase()}</div>
      <span style="font-weight:500;font-size:0.88rem;flex:1">${escapeHtml(p)}</span>
      <button class="btn btn-danger btn-sm" onclick="event.stopPropagation();removeProfile(${i})">✕</button>
    </div>`).join('');
}

function selectProfileItem(i) {
  State.selectedProfileIdx = i;
  _renderProfilesList();
}

function saveProfile() {
  const name = document.getElementById('nicknameInput').value.trim();
  if (!name) return showToast('Please enter a nickname', '⚠️');
  const profiles = State.profiles();
  if (profiles.includes(name)) return showToast('Profile already exists!', '⚠️');
  profiles.push(name);
  State.saveProfiles(profiles);
  State.selectedProfileIdx = profiles.length - 1;
  document.getElementById('nicknameInput').value = '';
  _renderProfilesList();
  showToast(`Profile "${name}" created!`);
}

function removeProfile(i) {
  const profiles = State.profiles();
  const name = profiles[i];
  profiles.splice(i, 1);
  State.saveProfiles(profiles);
  if (State.currentUser === name) {
    State.currentUser = null;
    localStorage.removeItem('bscs_user');
    updateUserSection();
  }
  if (State.selectedProfileIdx === i) State.selectedProfileIdx = null;
  _renderProfilesList();
}

function selectProfile() {
  const profiles = State.profiles();
  if (State.selectedProfileIdx === null || !profiles[State.selectedProfileIdx])
    return showToast('Please select a profile!', '⚠️');
  State.currentUser = profiles[State.selectedProfileIdx];
  localStorage.setItem('bscs_user', State.currentUser);
  updateUserSection();
  closeProfileModal();
  showToast(`Welcome, ${State.currentUser}! 👋`);
  renderTasks();
  renderReminders();
}

function updateUserSection() {
  const section      = document.getElementById('userSection');
  const inputSection = document.getElementById('taskInputSection');
  if (State.currentUser) {
    section.innerHTML = `
      <div style="display:flex;align-items:center;gap:10px">
        <div class="user-avatar">${State.currentUser.charAt(0).toUpperCase()}</div>
        <div>
          <div style="color:var(--accent);font-weight:600;font-size:0.88rem">${escapeHtml(State.currentUser)}</div>
          <button class="btn btn-secondary btn-sm" style="margin-top:4px" onclick="logoutUser()">Change User</button>
        </div>
      </div>`;
    inputSection.style.display = 'block';
  } else {
    section.innerHTML = `<button class="btn" onclick="openProfileModal()">👤 Sign In</button>`;
    inputSection.style.display = 'none';
  }
}

function logoutUser() {
  State.currentUser = null;
  localStorage.removeItem('bscs_user');
  updateUserSection();
  renderReminders();
  showToast('Logged out');
}

document.addEventListener('DOMContentLoaded', () => {
  document.querySelectorAll('.modal-overlay').forEach(m => {
    m.addEventListener('click', e => { if (e.target === m) m.classList.remove('active'); });
  });
  document.getElementById('nicknameInput')?.addEventListener('keypress', e => { if (e.key === 'Enter') saveProfile(); });
  document.getElementById('adminPassword')?.addEventListener('keypress', e => { if (e.key === 'Enter') verifyAdmin(); });

  updateUserSection();
  renderTasks();
  renderReminders();
  initSchedule();
  checkReminders();
  setInterval(checkReminders, 5000);
});
