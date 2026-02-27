'use strict';

function addTask() {
  const input = document.getElementById('taskInput');
  const text  = input.value.trim();
  if (!text) return showToast('Please enter a task', '⚠️');
  if (!State.currentUser) return showToast('Please sign in first!', '⚠️');
  const task = {
    id:        Date.now(),
    text,
    author:    State.currentUser,
    date:      document.getElementById('taskDate').value || null,
    completed: false,
    time:      new Date().toLocaleString('en-PH'),
  };
  const tasks = State.tasks();
  tasks.unshift(task);
  State.saveTasks(tasks);
  input.value = '';
  document.getElementById('taskDate').value = '';
  renderTasks();
  if (document.getElementById('calendar').classList.contains('active')) renderCalendar();
  showToast('Task added');
}

function toggleTask(id) {
  const tasks = State.tasks();
  const t = tasks.find(x => x.id === id);
  if (!t) return;
  t.completed = !t.completed;
  State.saveTasks(tasks);
  renderTasks();
  if (document.getElementById('calendar').classList.contains('active')) renderCalendar();
}

function deleteTask(id) {
  State.saveTasks(State.tasks().filter(x => x.id !== id));
  renderTasks();
  if (document.getElementById('calendar').classList.contains('active')) renderCalendar();
  showToast('Task deleted');
}

function filterTasks(f, btn) {
  State.currentTaskFilter = f;
  document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  renderTasks();
}

function renderTasks() {
  const list = document.getElementById('taskList');
  let tasks  = State.tasks();
  const f    = State.currentTaskFilter;
  if (f === 'pending') tasks = tasks.filter(t => !t.completed);
  if (f === 'done')    tasks = tasks.filter(t =>  t.completed);

  if (tasks.length === 0) {
    const msg = f === 'done' ? 'No completed tasks yet!'
              : f === 'pending' ? 'No pending tasks!'
              : 'No tasks yet. Add the first one!';
    list.innerHTML = `<div class="empty-state"><div class="empty-icon">📝</div><p>${msg}</p></div>`;
    return;
  }

  list.innerHTML = tasks.map(t => `
    <div class="task-item ${t.completed ? 'completed' : ''}">
      <div class="task-left">
        <div class="checkbox ${t.completed ? 'checked' : ''}" onclick="toggleTask(${t.id})"></div>
        <div class="task-content">
          <div class="task-author">@${escapeHtml(t.author)}</div>
          <div class="task-text">${escapeHtml(t.text)}</div>
          ${t.date ? `<span class="task-date-badge">📅 ${formatDateLabel(t.date)}</span>` : ''}
        </div>
      </div>
      <div class="task-meta">
        <span class="task-time">${t.time}</span>
        ${t.author === State.currentUser
          ? `<button class="btn btn-danger btn-sm" onclick="deleteTask(${t.id})">✕</button>`
          : ''}
      </div>
    </div>`).join('');
}

document.addEventListener('DOMContentLoaded', () => {
  document.getElementById('taskInput')?.addEventListener('keypress', e => {
    if (e.key === 'Enter') addTask();
  });
});
