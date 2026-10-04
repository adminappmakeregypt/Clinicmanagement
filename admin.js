// ============ Admin Page Script ============
const ADMIN_KEY = clinicKey('clinic_admin_v1');
const DOCTORS_KEY = clinicKey('clinic_doctors_v1');
const DEFAULT_ADMIN = {
  start: '09:00', end: '17:00',
  breakStart: '12:30', breakEnd: '14:00',
  slotMinutes: 30, days: [0,1,2,3,4],
};

const $ = (s) => document.querySelector(s);
const $$ = (s) => document.querySelectorAll(s);

let adminSettings = Object.assign({}, DEFAULT_ADMIN, JSON.parse(localStorage.getItem(ADMIN_KEY) || '{}'));
let doctors = JSON.parse(localStorage.getItem(DOCTORS_KEY) || '[]');
// Stable doctor ID (used by website booking). Deterministic from the name at
// creation time, then stored — renaming a doctor later keeps the same ID.
function makeDoctorId(name) {
  let h = 2166136261;
  const s = String(name || '').trim().replace(/\s+/g, ' ');
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
  return 'doc' + (h >>> 0).toString(36);
}
if (doctors.some(d => d && d.name && !d.id)) {
  doctors.forEach(d => { if (d && d.name && !d.id) d.id = makeDoctorId(d.name); });
  localStorage.setItem(DOCTORS_KEY, JSON.stringify(doctors));
}
let selectedDoctorName = null;

// التخصصات لم تعد تُدار يدوياً: القائمة مشتقة من تخصص العيادة (specialties.js)
const MAJORS_KEY = clinicKey('clinic_majors_v1');

function clinicServices() {
  try { return JSON.parse(localStorage.getItem(MAJORS_KEY) || '[]'); }
  catch { return []; }
}

function populateSpecialtyDatalist() {
  const dl = $('#specialtySuggestions');
  if (!dl) return;
  dl.innerHTML = clinicServices().map(m => `<option value="${escape(m)}"></option>`).join('');
}

document.addEventListener('clinic-specialty-changed', populateSpecialtyDatalist);


function escape(s) {
  return String(s ?? '').replace(/[&<>"']/g, c => ({
    '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'
  }[c]));
}

function toast(msg) {
  let el = document.querySelector('.toast');
  if (!el) { el = document.createElement('div'); el.className = 'toast'; document.body.appendChild(el); }
  el.textContent = msg; el.classList.add('show');
  clearTimeout(window._toastT);
  window._toastT = setTimeout(() => el.classList.remove('show'), 2500);
}

function saveDoctors() { localStorage.setItem(DOCTORS_KEY, JSON.stringify(doctors)); document.dispatchEvent(new Event('doctors-saved')); }
// Hours changed on the website (or on another device) → reload doctors on this page
document.addEventListener('cloud-sync-updated', (e) => {
  if (e.detail && e.detail.key && !/doctors/.test(e.detail.key)) return;
  doctors = JSON.parse(localStorage.getItem(DOCTORS_KEY) || '[]');
  refreshDoctorsUI();
  if (selectedDoctorName) selectDoctor(selectedDoctorName);
});

// ===== Doctors table =====
const DAY_NAMES_SHORT = ['أحد','إثنين','ثلاثاء','أربعاء','خميس','جمعة','سبت'];
function scheduleSummary(d) {
  const s = d.schedule;
  if (!s) return '<span class="muted">افتراضي</span>';
  const days = (s.days || []).map(x => DAY_NAMES_SHORT[x]).join('، ');
  const brk = (s.breakStart && s.breakEnd) ? ` (استراحة ${s.breakStart}-${s.breakEnd})` : '';
  return `${s.start}-${s.end} • ${s.slotMinutes}د${brk}<br><small class="muted">${days}</small>`;
}
// v38: per-doctor specialties (stored on the same clinic_doctors_v1 record)
function specList() { return window.ClinicSpecialty ? window.ClinicSpecialty.list() : []; }
function specCheckboxes(selected) {
  return specList().map(s => `<label class="sx-check"><input type="checkbox" value="${s.id}"${selected.includes(s.id) ? ' checked' : ''} /> ${s.icon} ${escape(s.label)}</label>`).join('');
}
function specBadges(d) {
  const ids = d.specialtyIds || [];
  if (!ids.length) return '';
  const all = specList();
  return '<br><small class="muted">🩺 ' + ids.map(id => { const s = all.find(x => x.id === id); return s ? escape(s.label) : ''; }).filter(Boolean).join('، ') + '</small>';
}
function renderNewDoctorSpecs() {
  const box = document.getElementById('newDoctorSpecs');
  if (box) box.innerHTML = specCheckboxes([]);
}
document.addEventListener('clinic-specialties-registered', () => { renderNewDoctorSpecs(); renderDoctorsTable(); });

function renderDoctorsTable() {
  const tbody = $('#doctorsTable tbody');
  const empty = $('#emptyDoctorsMsg');
  tbody.innerHTML = doctors.map((d, i) => `
    <tr>
      <td>${escape(d.name)}</td>
      <td>${escape(d.specialty || '-')}${specBadges(d)}</td>
      <td>${scheduleSummary(d)}</td>
      <td>
        <button class="btn small ghost" data-edit="${i}">✏️ تعديل الساعات</button>
        <button class="btn small ghost" data-spec="${i}">🩺 التخصصات</button>
        <button class="btn small danger" data-idx="${i}">🗑️ حذف</button>
      </td>
    </tr>`).join('');
  empty.style.display = doctors.length ? 'none' : '';
  $('#doctorsTable').style.display = doctors.length ? '' : 'none';
  tbody.querySelectorAll('button[data-idx]').forEach(btn => {
    btn.addEventListener('click', () => {
      if (!confirm('حذف هذا الطبيب؟')) return;
      const removed = doctors.splice(Number(btn.dataset.idx), 1)[0];
      if (removed && removed.name === selectedDoctorName) {
        selectedDoctorName = null;
        $('#docSchedSection').style.display = 'none';
      }
      saveDoctors();
      refreshDoctorsUI();
    });
  });
  tbody.querySelectorAll('button[data-spec]').forEach(btn => {
    btn.addEventListener('click', () => {
      const tr = btn.closest('tr');
      const next = tr.nextElementSibling;
      if (next && next.classList.contains('spec-edit-row')) { next.remove(); return; }
      const d = doctors[Number(btn.dataset.spec)];
      if (!d) return;
      const row = document.createElement('tr');
      row.className = 'spec-edit-row';
      row.innerHTML = `<td colspan="4"><div class="sx-checks">${specCheckboxes(d.specialtyIds || [])}</div>
        <div class="actions"><button type="button" class="btn small primary">💾 حفظ التخصصات</button></div></td>`;
      tr.after(row);
      row.querySelector('button').addEventListener('click', () => {
        d.specialtyIds = [...row.querySelectorAll('input:checked')].map(i => i.value);
        saveDoctors();
        refreshDoctorsUI();
        toast('تم حفظ تخصصات الطبيب');
      });
    });
  });
  tbody.querySelectorAll('button[data-edit]').forEach(btn => {
    btn.addEventListener('click', () => {
      const d = doctors[Number(btn.dataset.edit)];
      if (!d) return;
      selectDoctor(d.name);
      const sec = $('#docSchedSection');
      if (sec) sec.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  });
}

function renderDoctorChips() {
  const wrap = $('#doctorChips');
  if (!doctors.length) {
    wrap.innerHTML = '<span class="muted">أضف طبيب أولاً</span>';
    return;
  }
  wrap.innerHTML = doctors.map(d => {
    const active = d.name === selectedDoctorName ? ' active' : '';
    const dot = d.schedule ? '<span class="sched-dot">●</span>' : '';
    return `<button type="button" class="doc-chip${active}" data-name="${escape(d.name)}">${dot}${escape(d.name)}</button>`;
  }).join('');
  wrap.querySelectorAll('.doc-chip').forEach(btn => {
    btn.addEventListener('click', () => selectDoctor(btn.dataset.name));
  });
}

function selectDoctor(name) {
  selectedDoctorName = name;
  const d = doctors.find(x => x.name === name);
  if (!d) return;
  const s = d.schedule || adminSettings;
  $('#docSchedTitle').textContent = `إعدادات ساعات العمل  للطبيب ${name}`;
  $('#docSchedStart').value = s.start || '09:00';
  $('#docSchedEnd').value = s.end || '17:00';
  $('#docSchedBreakStart').value = s.breakStart || '';
  $('#docSchedBreakEnd').value = s.breakEnd || '';
  $('#docSchedSlot').value = String(s.slotMinutes || 30);
  $$('#docSchedDays input').forEach(cb => { cb.checked = (s.days || []).includes(Number(cb.value)); });
  $('#docSchedSection').style.display = '';
  renderDoctorChips();
}

function refreshDoctorsUI() {
  renderDoctorsTable();
  renderDoctorChips();
}

$('#addDoctorBtn').addEventListener('click', () => {
  const name = $('#newDoctorName').value.trim();
  let specialty = $('#newDoctorSpecialty').value.trim();
  if (!specialty) {
    const first = document.querySelector('#newDoctorSpecs input:checked');
    const sp = first && specList().find(x => x.id === first.value);
    if (sp) specialty = sp.label;
  }
  if (!name) { toast('أدخل اسم الطبيب'); return; }
  if (!specialty) { toast('أدخل التخصص'); return; }
  let id = makeDoctorId(name);
  while (doctors.some(d => d.id === id)) id = makeDoctorId(name + Math.random());
  const specialtyIds = [...document.querySelectorAll('#newDoctorSpecs input:checked')].map(i => i.value);
  doctors.push({ id, name, specialty, specialtyIds });
  document.querySelectorAll('#newDoctorSpecs input').forEach(i => { i.checked = false; });
  saveDoctors();
  $('#newDoctorName').value = '';
  $('#newDoctorSpecialty').value = '';
  refreshDoctorsUI();
  toast('تمت إضافة الطبيب');
});

$('#saveDocSchedBtn').addEventListener('click', () => {
  if (!selectedDoctorName) { toast('اختر طبيب أولاً'); return; }
  const d = doctors.find(x => x.name === selectedDoctorName);
  if (!d) return;
  const days = Array.from($$('#docSchedDays input:checked')).map(c => Number(c.value));
  const start = $('#docSchedStart').value || '09:00';
  const end = $('#docSchedEnd').value || '17:00';
  const breakStart = $('#docSchedBreakStart').value || '';
  const breakEnd = $('#docSchedBreakEnd').value || '';
  if (start >= end) { toast('وقت النهاية يجب أن يكون بعد وقت البداية'); return; }
  if ((breakStart || breakEnd) && (!breakStart || !breakEnd || breakStart >= breakEnd || breakStart < start || breakEnd > end)) {
    toast('وقت الاستراحة يجب أن يكون كاملًا وداخل ساعات العمل'); return;
  }
  d.schedule = {
    start, end, breakStart, breakEnd,
    slotMinutes: Number($('#docSchedSlot').value) || 30,
    days: days.length ? days : DEFAULT_ADMIN.days,
  };
  // Keep this schedule on this doctor only. Never overwrite every doctor's fallback.
  saveDoctors();
  refreshDoctorsUI();
  toast(`تم حفظ إعدادات ${selectedDoctorName}`);
});

$('#clearDocSchedBtn').addEventListener('click', () => {
  if (!selectedDoctorName) { toast('اختر طبيب أولاً'); return; }
  if (!confirm('إزالة الجدول المخصص لهذا الطبيب؟ (سيستخدم الإعداد الافتراضي)')) return;
  const d = doctors.find(x => x.name === selectedDoctorName);
  if (d) { delete d.schedule; saveDoctors(); }
  selectDoctor(selectedDoctorName);
  refreshDoctorsUI();
  toast('تمت الإزالة');
});

// init
// (قائمة التخصصات صارت مشتقة من تخصص العيادة)
populateSpecialtyDatalist();
refreshDoctorsUI();
renderNewDoctorSpecs();
