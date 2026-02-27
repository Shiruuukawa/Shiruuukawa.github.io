'use strict';

let _calYear         = new Date().getFullYear();
let _calMonth        = new Date().getMonth();
let _calSelectedDate = null;

const CAL_DAYS   = ['SUN','MON','TUE','WED','THU','FRI','SAT'];
const CAL_MONTHS = ['January','February','March','April','May','June',
                    'July','August','September','October','November','December'];

function calPrev() {
  _calMonth--;
  if (_calMonth < 0) { _calMonth = 11; _calYear--; }
  renderCalendar();
}
function calNext() {
  _calMonth++;
  if (_calMonth > 11) { _calMonth = 0; _calYear++; }
  renderCalendar();
}
function calGoToday() {
  _calYear  = new Date().getFullYear();
  _calMonth = new Date().getMonth();
  renderCalendar();
}

function renderCalendar() {
  document.getElementById('calMonthLabel').textContent = `${CAL_MONTHS[_calMonth]} ${_calYear}`;

  const today    = new Date();
  const todayKey = `${today.getFullYear()}-${String(today.getMonth()+1).padStart(2,'0')}-${String(today.getDate()).padStart(2,'0')}`;
  const taskMap  = {};
  State.tasks().forEach(t => {
    if (t.date) {
      if (!taskMap[t.date]) taskMap[t.date] = [];
      taskMap[t.date].push(t);
    }
  });

  const firstDay    = new Date(_calYear, _calMonth, 1).getDay();
  const daysInMonth = new Date(_calYear, _calMonth + 1, 0).getDate();
  let html = '';

  CAL_DAYS.forEach(d => { html += `<div class="cal-day-header">${d}</div>`; });
  for (let i = 0; i < firstDay; i++) html += `<div class="cal-cell empty"></div>`;

  for (let day = 1; day <= daysInMonth; day++) {
    const key      = `${_calYear}-${String(_calMonth+1).padStart(2,'0')}-${String(day).padStart(2,'0')}`;
    const dayTasks = taskMap[key] || [];
    const dow      = new Date(_calYear, _calMonth, day).getDay();
    const cls = [
      'cal-cell',
      key === todayKey        ? 'today'    : '',
      key === _calSelectedDate ? 'selected' : '',
      dayTasks.length          ? 'has-tasks': '',
      dow === 0                ? 'sunday'   : '',
      dow === 6                ? 'saturday' : '',
    ].filter(Boolean).join(' ');

    const dots = dayTasks.length
      ? `<div class="cal-dots">${dayTasks.slice(0,5).map(() => `<span class="cal-dot"></span>`).join('')}</div>`
      : '';

    html += `<div class="${cls}" onclick="calSelectDay('${key}')">
      <div class="cal-date">${day}</div>${dots}
    </div>`;
  }

  document.getElementById('calGrid').innerHTML = html;
  _renderCalPanel();
}

function calSelectDay(key) {
  _calSelectedDate = (_calSelectedDate === key) ? null : key;
  renderCalendar();
}

function _renderCalPanel() {
  const panel = document.getElementById('calTasksPanel');
  if (!_calSelectedDate) { panel.style.display = 'none'; return; }

  const dayTasks = State.tasks().filter(t => t.date === _calSelectedDate);
  const d        = new Date(_calSelectedDate + 'T00:00:00');
  const label    = d.toLocaleDateString('en-PH', { weekday:'long', year:'numeric', month:'long', day:'numeric' });
  panel.style.display = 'block';

  if (dayTasks.length === 0) {
    panel.innerHTML = `<div class="cal-tasks-panel">
      <h4>📅 ${label}</h4>
      <div class="empty-state" style="padding:20px 0">
        <div class="empty-icon" style="font-size:2rem">📭</div>
        <p style="font-size:0.84rem">No tasks on this day.</p>
      </div>
    </div>`;
    return;
  }

  const rows = dayTasks.map(t => `
    <div class="cal-task-row ${t.completed ? 'done' : ''}">
      <div class="checkbox ${t.completed ? 'checked' : ''}" onclick="toggleTask(${t.id});renderCalendar()"></div>
      <div style="flex:1;min-width:0">
        <div class="cal-task-author">@${escapeHtml(t.author)}</div>
        <div class="cal-task-text">${escapeHtml(t.text)}</div>
      </div>
      ${t.author === State.currentUser
        ? `<button class="btn btn-danger btn-sm" onclick="deleteTask(${t.id});renderCalendar()">✕</button>`
        : ''}
    </div>`).join('');

  panel.innerHTML = `<div class="cal-tasks-panel">
    <h4>📅 ${label}
      <span style="background:var(--g3);border-radius:20px;padding:2px 10px;font-size:0.78rem;color:var(--text-dim)">
        ${dayTasks.length} task${dayTasks.length > 1 ? 's' : ''}
      </span>
    </h4>
    ${rows}
  </div>`;
}
