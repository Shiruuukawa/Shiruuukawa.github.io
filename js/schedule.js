'use strict';

const SCHED_TIMES = (() => {
  const s = [];
  for (let h = 7; h < 22; h++) {
    s.push(`${String(h).padStart(2,'0')}:00`);
    s.push(`${String(h).padStart(2,'0')}:30`);
  }
  return s;
})();

const SCHED_DAYS      = ['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
const SCHED_DAY_SHORT = ['Mon','Tue','Wed','Thu','Fri','Sat'];

const SUBJECT_COLORS = [
  '#0f5a32','#1a4a6e','#4a1942','#422006',
  '#1e3a5f','#3b1f00','#073d22','#2d0f3c',
  '#0c2a4a','#1a1f00','#3d0f0f','#1a3a2a',
];

// const DEFAULT_SCHEDULE = {
//   'Mon|07:30|10:30': { name:'CSPC63 – FUNDAMENTALS OF BUSINESS ANALYTICS', short:'CSPC63\nADCUDIAMAT', room:'RM409', color:'#0f5a32' },
//   'Mon|10:30|12:30': { name:'COSC27 – INFORMATION MANAGEMENT',             short:'COSC27\nJACHAVEZ',   room:'RM411', color:'#1a4a6e' },
//   'Mon|14:00|17:00': { name:'EDUC1a – ETHICS',                             short:'EDUC1a\nS.ABELLANA', room:'',     color:'#422006' },
//   'Tue|08:00|10:00': { name:'PHED2 – PHYSICAL ACTIVITIES TOWARDS HEALTH & FITNESS', short:'PATHFIT4\nV.NUESTRO', room:'', color:'#3b1f00' },
//   'Tue|10:30|14:00': { name:'STSO1a – SCIENCE, TECHNOLOGY & SOCIETY',      short:'STSO1a\nB.ARTUZ',    room:'',     color:'#1e3a5f' },
//   'Thu|07:30|10:30': { name:'HUMA1a – ART APPRECIATION',                   short:'HUMA1a\nM.ZAFRA',    room:'',     color:'#4a1942' },
//   'Fri|10:00|13:00': { name:'COSC27 – INFORMATION MANAGEMENT',             short:'COSC27\nJACHAVEZ',   room:'CLAB2',color:'#1a4a6e' },
//   'Sat|07:30|10:30': { name:'CSPC24 – ALGORITHM & COMPLEXITY',             short:'CSPC24\nMBORSAL',    room:'CLAB2',color:'#0c2a4a' },
//   'Sat|10:30|12:30': { name:'CSPC24 – ALGORITHM & COMPLEXITY',             short:'CSPC24\nMBORSAL',    room:'RM411',color:'#0c2a4a' },
//   'Sat|14:00|17:00': { name:'FILI4 – MASINING NA PAGPAPAHAYAG',            short:'FILI4\nM.ARCEBUCHE', room:'',     color:'#2d0f3c' },
// };

let _isAdmin   = false;
let _editKey   = null;
let _colorPick = SUBJECT_COLORS[0];

function fmtTime(slot) {
  const [h, m] = slot.split(':').map(Number);
  const h12 = h % 12 || 12;
  return `${h12}:${String(m).padStart(2,'0')} ${h < 12 ? 'AM' : 'PM'}`;
}
function slotIndex(slot) { return SCHED_TIMES.indexOf(slot); }

function initSchedule() {
  if (Object.keys(State.schedule()).length === 0) {
    State.saveSchedule(DEFAULT_SCHEDULE);
  }
}

function renderSchedule() {
  const sched = State.schedule();

  document.getElementById('scheduleHead').innerHTML = `<tr>
    <th style="min-width:68px">Time</th>
    ${SCHED_DAY_SHORT.map(d => `<th>${d}</th>`).join('')}
  </tr>`;

  const occupied = {};
  SCHED_DAYS.forEach((_, di) => { occupied[di] = {}; });
  const blocks = {};

  Object.entries(sched).forEach(([key, subj]) => {
    const [dayShort, startSlot, endSlot] = key.split('|');
    const di   = SCHED_DAY_SHORT.indexOf(dayShort);
    if (di < 0) return;
    const si   = slotIndex(startSlot);
    const ei   = slotIndex(endSlot);
    const span = ei > si ? ei - si : 1;
    blocks[`${di}-${si}`] = { key, subj, span, startSlot, endSlot };
    for (let r = si + 1; r < si + span; r++) occupied[di][r] = true;
  });

  let html = '';
  SCHED_TIMES.forEach((slot, si) => {
    html += `<tr><td class="time-col">${fmtTime(slot)}</td>`;
    SCHED_DAYS.forEach((_, di) => {
      if (occupied[di][si]) return;
      const block = blocks[`${di}-${si}`];
      if (block) {
        const { subj, span, startSlot, endSlot, key } = block;
        const textColor = _isLightColor(subj.color) ? '#111' : '#fff';
        const lines     = (subj.short || subj.name).split('\n');
        html += `<td rowspan="${span}" style="padding:0;vertical-align:top">
          <div class="subj-block${_isAdmin ? ' admin-cell' : ''}"
               style="background:${subj.color};color:${textColor}"
               ${_isAdmin ? `onclick="openEditBlock('${key}')"` : ''}>
            ${lines.map((l, i) => `<span class="${i === 0 ? 'sb-name' : 'sb-room'}">${escapeHtml(l)}</span>`).join('')}
            <span class="sb-time">${fmtTime(startSlot)}–${fmtTime(endSlot)}</span>
          </div>
        </td>`;
      } else {
        html += `<td class="${_isAdmin ? 'admin-cell' : ''}"
                    ${_isAdmin ? `onclick="openNewBlock(${di},'${slot}')"` : ''}>
          ${_isAdmin ? '<div class="add-hint">+</div>' : ''}
        </td>`;
      }
    });
    html += `</tr>`;
  });

  document.getElementById('scheduleBody').innerHTML = html;
  document.getElementById('adminBtn').textContent = _isAdmin ? '🔒 Lock' : '✏️ Admin';
  document.getElementById('saveSchedBtn').style.display = _isAdmin ? 'inline-flex' : 'none';
  renderSummary();
}

function _isLightColor(hex) {
  if (!hex || !hex.startsWith('#')) return false;
  const r = parseInt(hex.slice(1,3),16);
  const g = parseInt(hex.slice(3,5),16);
  const b = parseInt(hex.slice(5,7),16);
  return (r*299 + g*587 + b*114) / 1000 > 145;
}

function renderSummary() {
  const sched    = State.schedule();
  const seen     = {};
  const subjects = [];
  Object.values(sched).forEach(subj => {
    if (!seen[subj.name]) {
      seen[subj.name] = true;
      subjects.push(subj);
    }
  });

  const tbody = document.getElementById('summaryBody');
  if (subjects.length === 0) {
    tbody.innerHTML = '<tr><td colspan="2" style="color:var(--text-mute);text-align:center;padding:12px">No subjects in schedule.</td></tr>';
    return;
  }
  tbody.innerHTML = subjects.map((s, i) => `
    <tr>
      <td class="sub-num">${i + 1}</td>
      <td><span class="summary-swatch" style="background:${s.color}"></span>${escapeHtml(s.name)}</td>
    </tr>`).join('');
}

function toggleAdminMode() {
  if (!_isAdmin) {
    document.getElementById('adminModal').classList.add('active');
    document.getElementById('adminPassword').value = '';
    setTimeout(() => document.getElementById('adminPassword').focus(), 100);
  } else {
    _isAdmin = false;
    renderSchedule();
    showToast('Admin mode off');
  }
}
function closeAdminModal() { document.getElementById('adminModal').classList.remove('active'); }

function verifyAdmin() {
  if (document.getElementById('adminPassword').value === 'adminonlyplease69') {
    _isAdmin = true;
    closeAdminModal();
    renderSchedule();
    showToast('Admin mode enabled');
  } else {
    showToast('Wrong password!', '⚠️');
  }
}

function saveScheduleChanges() {
  _isAdmin = false;
  renderSchedule();
  showToast('Schedule saved');
}

function openEditBlock(key) {
  if (!_isAdmin) return;
  _editKey = key;
  const subj = State.schedule()[key];
  const [dayShort, startSlot, endSlot] = key.split('|');
  document.getElementById('editDayLabel').textContent  = SCHED_DAYS[SCHED_DAY_SHORT.indexOf(dayShort)];
  document.getElementById('editSubjName').value        = subj.name || '';
  document.getElementById('editSubjShort').value       = (subj.short || '').replace(/\n/g, ' / ');
  document.getElementById('editSubjRoom').value        = subj.room || '';
  document.getElementById('editStartSlot').value       = startSlot;
  document.getElementById('editEndSlot').value         = endSlot;
  _colorPick = subj.color || SUBJECT_COLORS[0];
  _renderColorPicker();
  document.getElementById('deleteBlockBtn').style.display = 'inline-flex';
  document.getElementById('schedEditModal').classList.add('active');
}

function openNewBlock(di, slot) {
  if (!_isAdmin) return;
  _editKey = `NEW|${SCHED_DAY_SHORT[di]}|${slot}`;
  document.getElementById('editDayLabel').textContent  = SCHED_DAYS[di];
  document.getElementById('editSubjName').value        = '';
  document.getElementById('editSubjShort').value       = '';
  document.getElementById('editSubjRoom').value        = '';
  document.getElementById('editStartSlot').value       = slot;
  document.getElementById('editEndSlot').value         = SCHED_TIMES[Math.min(slotIndex(slot) + 3, SCHED_TIMES.length - 1)];
  _colorPick = SUBJECT_COLORS[0];
  _renderColorPicker();
  document.getElementById('deleteBlockBtn').style.display = 'none';
  document.getElementById('schedEditModal').classList.add('active');
}

function closeSchedEditModal() {
  document.getElementById('schedEditModal').classList.remove('active');
  _editKey = null;
}

function _renderColorPicker() {
  document.getElementById('colorPicker').innerHTML = SUBJECT_COLORS.map(c => `
    <div class="color-opt ${c === _colorPick ? 'selected' : ''}"
         style="background:${c}" onclick="pickColor('${c}')"></div>`).join('');
}

function pickColor(c) {
  _colorPick = c;
  _renderColorPicker();
}

function saveBlock() {
  const name = document.getElementById('editSubjName').value.trim();
  if (!name) return showToast('Subject name required', '⚠️');
  const shortRaw = document.getElementById('editSubjShort').value.trim();
  const short    = shortRaw ? shortRaw.replace(/ \/ /g, '\n') : name.split('–')[0].trim();
  const room     = document.getElementById('editSubjRoom').value.trim();
  const start    = document.getElementById('editStartSlot').value;
  const end      = document.getElementById('editEndSlot').value;
  if (slotIndex(end) <= slotIndex(start)) return showToast('End time must be after start', '⚠️');

  const sched    = State.schedule();
  const isNew    = _editKey.startsWith('NEW');
  const dayShort = _editKey.split('|')[isNew ? 1 : 0];
  if (!isNew) delete sched[_editKey];
  sched[`${dayShort}|${start}|${end}`] = { name, short, room, color: _colorPick };
  State.saveSchedule(sched);
  closeSchedEditModal();
  renderSchedule();
  showToast('Subject saved');
}

function deleteBlock() {
  if (!_editKey || _editKey.startsWith('NEW')) return;
  const sched = State.schedule();
  delete sched[_editKey];
  State.saveSchedule(sched);
  closeSchedEditModal();
  renderSchedule();
  showToast('Subject removed');
}

document.addEventListener('DOMContentLoaded', () => {
  const opts = SCHED_TIMES.map(s => `<option value="${s}">${fmtTime(s)}</option>`).join('');
  document.getElementById('editStartSlot').innerHTML = opts;
  document.getElementById('editEndSlot').innerHTML   = opts;
});
