// specialties-bundle.js — merged from: egypt-growth-data.js, clinic-care.js, dental-odo.js, dental.js, dental-plus.js, ophthalmology.js, eye-map.js, oph-plus.js, pediatrics.js, dermatology.js, orthopedics.js, orthopedics-plus.js, ent-plus.js, derm-plus.js, aesthetic-map.js
// Each part keeps its own try/catch so one failing part cannot stop the others (same as separate files).

/* ==== BEGIN egypt-growth-data.js ==== */
try {
// Egyptian pediatric growth references (0–60 months). Values copied verbatim from published sources — not generated.
// 1) Weight-for-age & Length/height-for-age: El Shafie AM et al. "Development of LMS and Z Score Growth References
//    for Egyptian Children From Birth Up to 5 Years". Front Pediatr 2021;8:598499. doi:10.3389/fped.2020.598499 — Table 2
//    (−3SD…+3SD cut-offs per one-year age band). Boys 49–60 m +3SD height printed as 111.71 (below +2SD = obvious
//    misprint in the source) — left out (null) rather than guessed.
// 2) Head circumference-for-age: Zaki ME, Hassan NE, El-Masry SA. "Head circumference reference data for Egyptian
//    children and adolescents". East Mediterr Health J 2008;14(1):69–81 — Table 1 (mean, SD; Egyptian Growth Curve
//    Project 2002, Cairo).
window.EG_GROWTH = {
  bands: [[0, 12], [12, 24], [24, 36], [36, 48], [48, 60]],
  // [−3, −2, −1, median, +1, +2, +3]
  wfa_m: [[5.36,6.06,6.75,7.63,8.50,9.50,10.64],[7.94,8.96,9.93,11.49,12.66,14.50,15.92],[9.52,10.70,12.03,13.75,15.39,17.66,19.55],[10.75,12.18,13.93,15.73,17.90,20.36,22.98],[11.95,13.59,15.55,17.71,20.45,23.37,26.73]],
  wfa_f: [[4.82,5.44,6.17,7.0,7.96,9.08,10.30],[7.32,8.25,9.34,10.67,11.94,13.59,15.92],[9.0,10.35,11.65,13.38,14.79,17.02,19.67],[10.43,12.16,13.90,15.89,17.80,20.24,23.50],[11.65,13.55,15.72,17.95,20.67,24.05,27.81]],
  hfa_m: [[58.73,60.86,63.06,65.23,67.60,69.72,71.88],[73.60,76.31,79.07,81.90,84.86,87.55,90.32],[81.15,84.60,87.96,91.50,95.17,98.53,101.95],[87.39,91.32,95.29,99.45,103.60,107.63,111.51],[92.87,97.32,101.71,106.28,110.88,115.34,null]],
  hfa_f: [[56.71,58.99,61.26,63.78,66.03,68.33,70.56],[71.48,74.38,77.34,80.15,83.45,86.45,89.36],[79.57,83.07,86.62,90.22,94.06,97.60,101.17],[86.23,90.37,94.43,98.61,102.91,106.98,111.10],[91.95,96.47,101.12,105.69,110.48,115.04,119.61]],
  // [age months, mean, SD]
  hcfa_m: [[1,37.07,1.44],[2,38.95,1.27],[3,40.27,1.32],[4,41.58,1.14],[5,42.26,1.37],[6,43.28,1.30],[7,44.06,1.64],[8,44.45,1.58],[9,44.81,1.31],[10,45.10,1.27],[11,45.96,1.33],[12,45.90,1.45],[15,46.50,1.23],[18,47.48,1.33],[24,48.04,1.34],[36,49.36,1.34],[48,49.87,1.35],[60,50.31,1.35]],
  hcfa_f: [[1,36.13,1.56],[2,37.95,1.07],[3,39.19,1.24],[4,40.27,1.44],[5,40.97,1.26],[6,42.02,1.26],[7,42.96,1.36],[8,43.23,1.41],[9,43.74,1.26],[10,44.20,1.41],[11,44.93,1.42],[12,44.71,1.19],[15,45.39,1.08],[18,45.71,1.37],[24,46.90,1.51],[36,48.28,1.23],[48,48.89,1.36],[60,49.48,1.40]],
  source: {
    wh: 'El Shafie AM et al., Front Pediatr 2021 (Egyptian children 0–5 y, Menoufia University) — Table 2',
    hc: 'Zaki ME et al., East Mediterr Health J 2008 — Egyptian Growth Curve Project 2002 — Table 1'
  }
};
} catch (e) { console.error('[specialties-bundle] egypt-growth-data.js failed:', e); }
/* ==== END egypt-growth-data.js ==== */

/* ==== BEGIN clinic-care.js ==== */
try {
// ============ Clinic Care helpers (v51) ============
// Shared, additive helpers — nothing existing is changed:
//   • collapsible boxes (+ / −) that remember open/closed state (localStorage "cm_collapse_v1")
//   • patient "Allergies & Medical Background"  -> localStorage clinicKey('clinic_patient_bg_v1')
//   • follow-ups & WhatsApp reminders            -> localStorage clinicKey('clinic_followups_v1')
//   • current patient (with birthDate / gender looked up from the bookings)
// Both new keys are mirrored to Firebase by cloud-sync.js (same appData pattern).
(function () {
  var ck = window.clinicKey || function (n) { return n; };
  var BG_KEY = ck('clinic_patient_bg_v1');
  var FU_KEY = ck('clinic_followups_v1');
  var BK_KEY = ck('clinic_bookings_v1');
  var RX_KEY = ck('clinic_prescriptions_v1');
  var REC_KEY = ck('clinic_patient_records_v1');
  var CS_KEY = 'cm_collapse_v1';

  function esc(s) {
    return (s == null ? '' : String(s)).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
  function getJSON(k, fb) { try { var v = JSON.parse(localStorage.getItem(k)); return v == null ? fb : v; } catch (e) { return fb; } }
  function setJSON(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} }
  function normPhone(p) {
    var d = (p || '').toString().replace(/\D/g, '');
    if (d.indexOf('00') === 0) d = d.slice(2);
    if (d.length === 12 && d.indexOf('20') === 0) d = d.slice(2);
    if (d.length === 11 && d.charAt(0) === '0') d = d.slice(1);
    return d;
  }
  function patKey(p) {
    if (!p) return '';
    var ph = normPhone(p.phone || p.patientPhone);
    return ph ? 'tel:' + ph : '|' + ((p.fullName || p.patientName || '').trim().toLowerCase());
  }
  function todayStr() { var d = new Date(); d.setMinutes(d.getMinutes() - d.getTimezoneOffset()); return d.toISOString().slice(0, 10); }
  function daysBetween(a, b) { return Math.round((new Date(b + 'T00:00:00') - new Date(a + 'T00:00:00')) / 86400000); }

  /* ---------- collapsible boxes ---------- */
  function isOpen(id) { return !!getJSON(CS_KEY, {})[id]; }
  function setOpenState(id, open) { var s = getJSON(CS_KEY, {}); if (open) s[id] = 1; else delete s[id]; setJSON(CS_KEY, s); }
  function box(id, title, summary, body, cls) {
    var open = isOpen(id);
    return '<div class="cc-box' + (open ? ' open' : '') + (cls ? ' ' + cls : '') + '" data-cc="' + esc(id) + '">' +
      '<button type="button" class="cc-head" aria-expanded="' + open + '">' +
      '<span class="cc-pm">' + (open ? '−' : '+') + '</span>' +
      '<span class="cc-title">' + title + '</span>' +
      '<span class="cc-sum">' + esc(summary || '') + '</span></button>' +
      '<div class="cc-body"><div class="cc-inner">' + body + '</div></div></div>';
  }
  function setBoxOpen(b, open) {
    b.classList.toggle('open', open);
    var h = b.querySelector(':scope > .cc-head');
    h.setAttribute('aria-expanded', open);
    h.querySelector('.cc-pm').textContent = open ? '−' : '+';
    setOpenState(b.dataset.cc, open);
    b.dispatchEvent(new CustomEvent('cc-toggle', { bubbles: true, detail: { open: open } }));
  }
  function setSummary(b, text) {
    if (!b) return;
    var s = b.querySelector(':scope > .cc-head .cc-sum');
    if (s) s.textContent = text || '';
  }
  document.addEventListener('click', function (e) {
    var h = e.target.closest && e.target.closest('.cc-head');
    if (!h) return;
    e.preventDefault();
    var b = h.parentNode;
    setBoxOpen(b, !b.classList.contains('open'));
  });

  /* ---------- patient profile ---------- */
  var current = null;
  function profileFor(p) {
    if (!p) return null;
    var out = Object.assign({}, p), key = patKey(p);
    getJSON(BK_KEY, []).forEach(function (b) {
      if (patKey(b) !== key) return;
      ['birthDate', 'gender', 'idNumber', 'email'].forEach(function (f) { if (!out[f] && b[f]) out[f] = b[f]; });
    });
    out.ccKey = key;
    return out;
  }
  function setPatient(p) {
    current = profileFor(p);
    renderBadges();
    document.dispatchEvent(new CustomEvent('clinic-patient-changed', { detail: current }));
    return current;
  }
  function getPatient() { return current; }
  function genderCode(g) {
    var t = (g || '').toString().toLowerCase();
    if (/أنث|انث|female|^f|بنت|girl/.test(t)) return 'f';
    if (/ذكر|male|^m|ولد|boy/.test(t)) return 'm';
    return '';
  }
  function ageParts(birth, at) {
    if (!birth) return null;
    var b = new Date(birth + 'T00:00:00'), a = new Date((at || todayStr()) + 'T00:00:00');
    if (isNaN(b) || a < b) return null;
    var y = a.getFullYear() - b.getFullYear(), m = a.getMonth() - b.getMonth(), d = a.getDate() - b.getDate();
    if (d < 0) { m--; d += new Date(a.getFullYear(), a.getMonth(), 0).getDate(); }
    if (m < 0) { y--; m += 12; }
    return { y: y, m: m, d: d, totalMonths: y * 12 + m, exactMonths: (a - b) / 86400000 / 30.4375 };
  }
  function ageText(p) {
    if (!p) return '';
    return p.y + ' سنة ' + p.m + ' شهر ' + p.d + ' يوم';
  }

  /* ---------- all visits of a patient (prescriptions + doctor records, local copies) ---------- */
  function visitsFor(p) {
    if (!p) return [];
    var key = patKey(p), out = [];
    getJSON(RX_KEY, []).forEach(function (rx) {
      if (rx.deleted || !rx.exam) return;
      if ((rx.patientKey && rx.patientKey === p.key) || patKey({ phone: rx.patientPhone, fullName: rx.patientName }) === key)
        out.push({ id: rx.id, date: rx.visitDate || rx.issueDate || '', exam: rx.exam });
    });
    var recs = getJSON(REC_KEY, {});
    Object.keys(recs).forEach(function (id) {
      var d = recs[id] || {};
      if (patKey({ phone: d.phone, fullName: d.patientName }) !== key && !(d.patientKey && d.patientKey === p.key)) return;
      (d.records || []).forEach(function (r) { if (r.exam) out.push({ id: r.id, date: r.visitDate || '', exam: r.exam }); });
    });
    return out.sort(function (a, b) { return a.date.localeCompare(b.date); });
  }

  /* ---------- allergies & medical background ---------- */
  var BLOOD = ['', 'A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];
  function getBg(p) { var all = getJSON(BG_KEY, {}); return all[patKey(p)] || {}; }
  function saveBg(p, data) {
    var all = getJSON(BG_KEY, {});
    data.updatedAt = new Date().toISOString();
    data.patientName = (p && (p.fullName || p.patientName)) || '';
    all[patKey(p)] = data;
    setJSON(BG_KEY, all);
    renderBadges();
  }
  function allergyNames(p) {
    var bg = getBg(p), list = (bg.drugAllergies || []).slice();
    (bg.foodAllergies || '').split(/[,،\n]+/).forEach(function (x) { x = x.trim(); if (x) list.push(x); });
    return list;
  }
  function badgeHtml(p) {
    var a = p ? allergyNames(p) : [];
    if (!a.length) return '';
    return '<div class="cc-allergy" role="alert">⚠️ حساسية: <b>' + esc(a.join('، ')) + '</b></div>';
  }
  function renderBadges() {
    document.querySelectorAll('[data-cc-allergy]').forEach(function (el) {
      var p = el._ccPatient || current;
      el.innerHTML = badgeHtml(p);
    });
  }
  function checkDrug(name, p) {
    var n = (name || '').trim().toLowerCase();
    if (n.length < 3) return null;
    var hit = null;
    ((getBg(p || current).drugAllergies) || []).some(function (a) {
      var x = a.trim().toLowerCase();
      if (x.length >= 3 && (n.indexOf(x) >= 0 || x.indexOf(n) >= 0)) { hit = a; return true; }
      return false;
    });
    return hit;
  }
  function bgSummary(p) {
    var a = allergyNames(p);
    return a.length ? 'الحساسية: ' + a.join('، ') : 'لا توجد حساسية مسجلة';
  }
  function chip(t) { return '<span class="cc-chip" data-v="' + esc(t) + '">' + esc(t) + ' <button type="button" class="cc-chip-x" aria-label="حذف">✖</button></span>'; }
  function mountBackground(container, p) {
    if (!container) return;
    p = profileFor(p);
    if (!p) { container.innerHTML = ''; return; }
    var bg = getBg(p);
    var body =
      '<div class="field"><label>حساسية الأدوية (اكتب الاسم واضغط Enter)</label>' +
      '<div class="cc-tags">' + (bg.drugAllergies || []).map(chip).join('') +
      '<input class="cc-tag-in" placeholder="مثال: Penicillin" /></div></div>' +
      '<div class="grid-2">' +
      '<div class="field"><label>حساسية الطعام</label><input class="cc-food" value="' + esc(bg.foodAllergies || '') + '" placeholder="مثال: البيض، الفول السوداني" /></div>' +
      '<div class="field"><label>فصيلة الدم</label><select class="cc-blood">' + BLOOD.map(function (b) {
        return '<option value="' + b + '"' + (b === (bg.bloodGroup || '') ? ' selected' : '') + '>' + (b || '—') + '</option>';
      }).join('') + '</select></div>' +
      '<div class="field" style="grid-column:1 / -1;"><label>الأمراض المزمنة</label><input class="cc-chronic" value="' + esc(bg.chronic || '') + '" placeholder="سكر، ضغط، ربو..." /></div>' +
      '<div class="field" style="grid-column:1 / -1;"><label>الأدوية الحالية</label><textarea class="cc-meds" rows="2" placeholder="الأدوية التي يتناولها المريض حالياً">' + esc(bg.currentMeds || '') + '</textarea></div>' +
      '</div>' +
      '<div class="actions" style="margin-top:8px;align-items:center;gap:10px;"><button type="button" class="btn primary small cc-bg-save">💾 حفظ الخلفية الطبية</button><span class="muted cc-bg-status"></span></div>';
    container.innerHTML = box('bg', '🩹 الحساسية والخلفية الطبية', bgSummary(p), body, 'cc-bg');
    var b = container.querySelector('.cc-box');
    var tags = b.querySelector('.cc-tags'), inp = b.querySelector('.cc-tag-in');
    function addTag() {
      inp.value.split(/[,،]+/).forEach(function (v) {
        v = v.trim();
        if (!v) return;
        var exists = Array.prototype.some.call(tags.querySelectorAll('.cc-chip'), function (c) { return c.dataset.v.toLowerCase() === v.toLowerCase(); });
        if (!exists) inp.insertAdjacentHTML('beforebegin', chip(v));
      });
      inp.value = '';
    }
    inp.addEventListener('keydown', function (e) {
      if (e.key === 'Enter' || e.key === ',' || e.key === '،') { e.preventDefault(); addTag(); }
    });
    inp.addEventListener('blur', addTag);
    tags.addEventListener('click', function (e) {
      if (e.target.classList.contains('cc-chip-x')) e.target.parentNode.remove();
      else inp.focus();
    });
    b.querySelector('.cc-bg-save').addEventListener('click', function () {
      addTag();
      var data = {
        drugAllergies: Array.prototype.map.call(tags.querySelectorAll('.cc-chip'), function (c) { return c.dataset.v; }),
        foodAllergies: b.querySelector('.cc-food').value.trim(),
        chronic: b.querySelector('.cc-chronic').value.trim(),
        currentMeds: b.querySelector('.cc-meds').value.trim(),
        bloodGroup: b.querySelector('.cc-blood').value
      };
      saveBg(p, data);
      setSummary(b, bgSummary(p));
      var st = b.querySelector('.cc-bg-status');
      st.textContent = 'تم الحفظ ✔';
      setTimeout(function () { st.textContent = ''; }, 2000);
    });
  }

  /* ---------- follow-ups ---------- */
  function clinicName() {
    var s = getJSON(ck('clinic_admin_v1'), {});
    return (s && s.clinicName) || 'العيادة';
  }
  function listFollowups() { return getJSON(FU_KEY, []).filter(function (f) { return f && f.id; }); }
  function saveFollowupFromRx(rx) {
    if (!rx || !rx.id) return;
    var list = getJSON(FU_KEY, []), id = 'fu_' + rx.id, i = -1;
    list.forEach(function (f, k) { if (f && f.id === id) i = k; });
    var fu = rx.followUp || {};
    if (!fu.date) {
      if (i >= 0) { list[i] = Object.assign({}, list[i], { status: 'cancelled', updatedAt: new Date().toISOString() }); setJSON(FU_KEY, list); }
      return;
    }
    var entry = Object.assign({}, i >= 0 ? list[i] : { status: 'pending', createdAt: new Date().toISOString() }, {
      id: id, rxId: rx.id, rxNumber: rx.number || '',
      patientName: rx.patientName || '', phone: rx.patientPhone || '', patientKey: rx.patientKey || '',
      doctor: rx.doctor || '', date: fu.date, time: fu.time || '', reason: fu.reason || '',
      updatedAt: new Date().toISOString()
    });
    if (i >= 0 && list[i].date !== fu.date) entry.status = 'pending';
    if (i >= 0) list[i] = entry; else list.push(entry);
    setJSON(FU_KEY, list);
    document.dispatchEvent(new CustomEvent('clinic-followups-changed'));
  }
  // v52: dated items inside an exam (cast removal, suture removal) feed the same follow-up list.
  // items: [{key, kind, date, reason}]  -> ids "fu_<srcId>_<key>"; removed items are cancelled.
  function saveExamFollowups(src, items) {
    if (!src || !src.id) return;
    var list = getJSON(FU_KEY, []), pre = 'fu_' + src.id + '_', seen = {}, now = new Date().toISOString();
    (items || []).forEach(function (it) {
      if (!it.date) return;
      var id = pre + it.key, i = -1; seen[id] = 1;
      list.forEach(function (f, k) { if (f && f.id === id) i = k; });
      var old = i >= 0 ? list[i] : { status: 'pending', createdAt: now };
      var e = Object.assign({}, old, { id: id, rxId: src.id, kind: it.kind || '', patientName: src.patientName || '', phone: src.phone || '',
        patientKey: src.patientKey || '', doctor: src.doctor || '', date: it.date, time: '', reason: it.reason || '', updatedAt: now });
      if (i >= 0 && old.date !== it.date) e.status = 'pending';
      if (i >= 0) list[i] = e; else list.push(e);
    });
    list.forEach(function (f) { if (f && f.id && f.id.indexOf(pre) === 0 && !seen[f.id] && f.status === 'pending') { f.status = 'cancelled'; f.updatedAt = now; } });
    setJSON(FU_KEY, list);
    document.dispatchEvent(new CustomEvent('clinic-followups-changed'));
  }
  function setFollowupStatus(id, status) {
    var list = getJSON(FU_KEY, []);
    list.forEach(function (f) { if (f && f.id === id) { f.status = status; f.updatedAt = new Date().toISOString(); } });
    setJSON(FU_KEY, list);
    document.dispatchEvent(new CustomEvent('clinic-followups-changed'));
  }
  function waLink(f) {
    var d = normPhone(f.phone);
    var num = d.length === 10 ? '20' + d : d;
    var msg = 'مرحباً ' + (f.patientName || '') + '، نذكّرك بموعد المتابعة في ' + clinicName() +
      ' يوم ' + f.date + (f.time ? ' الساعة ' + f.time : '') +
      (f.doctor ? ' مع ' + f.doctor : '') + (f.reason ? ' (' + f.reason + ')' : '') + '. نتمنى لك دوام الصحة.';
    return 'https://wa.me/' + num + '?text=' + encodeURIComponent(msg);
  }
  function mountFollowups(container, filter) {
    if (!container) return;
    var t = todayStr();
    var pend = listFollowups().filter(function (f) { return f.status === 'pending' && f.date && (!filter || filter(f)); });
    var groups = [
      ['متأخرة', 'cc-late', pend.filter(function (f) { return f.date < t; })],
      ['اليوم', 'cc-today', pend.filter(function (f) { return f.date === t; })],
      ['هذا الأسبوع', 'cc-week', pend.filter(function (f) { var n = daysBetween(t, f.date); return n > 0 && n <= 7; })]
    ];
    var summary = 'اليوم: ' + groups[1][2].length + ' · هذا الأسبوع: ' + groups[2][2].length + ' · متأخرة: ' + groups[0][2].length;
    var body = groups.map(function (g) {
      var rows = g[2].sort(function (a, b) { return a.date.localeCompare(b.date); }).map(function (f) {
        return '<tr><td>' + esc(f.patientName) + '</td><td>' + esc(f.date) + (f.time ? ' ' + esc(f.time) : '') + '</td><td>' + esc(f.reason || '-') + '</td><td>' + esc(f.doctor || '-') + '</td>' +
          '<td class="cc-fu-act">' + (normPhone(f.phone) ? '<a class="btn small primary" target="_blank" rel="noopener" href="' + esc(waLink(f)) + '">📲 إرسال تذكير</a>' : '<span class="muted">لا يوجد رقم</span>') +
          ' <button type="button" class="btn ghost small" data-fu-done="' + esc(f.id) + '">✔ تمت</button></td></tr>';
      }).join('');
      return '<h4 class="cc-fu-h ' + g[1] + '">' + g[0] + ' (' + g[2].length + ')</h4>' +
        (rows ? '<div class="table-wrap"><table><thead><tr><th>المريض</th><th>الموعد</th><th>السبب</th><th>الطبيب</th><th>إجراء</th></tr></thead><tbody>' + rows + '</tbody></table></div>'
          : '<p class="muted">لا يوجد.</p>');
    }).join('');
    container.innerHTML = box('followups', '📅 المتابعات المستحقة', summary, body, 'cc-fu');
    container.querySelectorAll('[data-fu-done]').forEach(function (btn) {
      btn.addEventListener('click', function () { setFollowupStatus(btn.dataset.fuDone, 'done'); mountFollowups(container, filter); });
    });
    if (!container._ccFuWired) {
      container._ccFuWired = true;
      var re = function () { mountFollowups(container, filter); };
      document.addEventListener('clinic-followups-changed', re);
      document.addEventListener('cloud-sync-updated', function (e) { if (!e.detail || /followups/.test(e.detail.key || '')) re(); });
    }
  }

  window.ClinicCare = {
    escape: esc, normPhone: normPhone, patKey: patKey, today: todayStr, daysBetween: daysBetween,
    box: box, setBoxOpen: setBoxOpen, setSummary: setSummary, isOpen: isOpen,
    setPatient: setPatient, getPatient: getPatient, profileFor: profileFor, genderCode: genderCode,
    ageParts: ageParts, ageText: ageText, visitsFor: visitsFor,
    getBg: getBg, saveBg: saveBg, allergyNames: allergyNames, badgeHtml: badgeHtml, renderBadges: renderBadges,
    checkDrug: checkDrug, mountBackground: mountBackground,
    listFollowups: listFollowups, saveFollowupFromRx: saveFollowupFromRx, saveExamFollowups: saveExamFollowups, setFollowupStatus: setFollowupStatus,
    waLink: waLink, mountFollowups: mountFollowups
  };
  document.addEventListener('cloud-sync-updated', function () { renderBadges(); });
})();
} catch (e) { console.error('[specialties-bundle] clinic-care.js failed:', e); }
/* ==== END clinic-care.js ==== */

/* ==== BEGIN dental-odo.js ==== */
try {
// ============ Dentistry: Interactive Odontogram (v63) ============
// Replaces the UI of the existing 'odontogram' section of dental.js (same section id, same
// saved place: exam.sections.odontogram). Old keys are kept and still edited:
//   teeth:{n:cond}  surfaces:{n:'MOD'}  details:{n:{status,diagnosis,notes}}
// New keys (additive):
//   dentition: 'permanent'|'primary'|'mixed'
//   records:[{ id, tooth, surf:'MOB', cat, proc, procOther, status:''|'planned'|'completed'|'followup', date, follow, notes }]
// FDI storage keys; permanent FDI labels and primary Palmer labels. Nothing is confirmed or marked completed without the doctor choosing it.
(function () {
  var SP = window.ClinicSpecialty, CC = window.ClinicCare;
  if (!SP) return;
  var esc = SP.escape;

  var P_UP = ['18','17','16','15','14','13','12','11','21','22','23','24','25','26','27','28'];
  var P_LO = ['48','47','46','45','44','43','42','41','31','32','33','34','35','36','37','38'];
  var D_UP = ['55','54','53','52','51','61','62','63','64','65'];
  var D_LO = ['85','84','83','82','81','71','72','73','74','75'];
  var DENT = [['permanent', 'الأسنان الدائمة (Permanent)'], ['primary', 'الأسنان اللبنية (Primary)'], ['mixed', 'مختلطة (Mixed)']];
  function teethOf(d) { return d === 'primary' ? D_UP.concat(D_LO) : d === 'mixed' ? P_UP.concat(P_LO, D_UP, D_LO) : P_UP.concat(P_LO); }
  var ALL = P_UP.concat(P_LO, D_UP, D_LO);

  // legacy condition colours (dental.js) — kept so old charts look the same
  var LEG = { 'سليم': '#d1fae5', 'تسوس': '#fecaca', 'حشو': '#bfdbfe', 'كسر': '#fed7aa', 'مفقود': '#e5e7eb', 'خلع': '#fbcfe8', 'علاج عصب': '#ddd6fe',
    'تركيبة': '#fde68a', 'جسر': '#fcd34d', 'زراعة': '#c7d2fe', 'مطمور': '#cbd5e1', 'دعامة جسر': '#fef08a', 'حركة': '#fdba74', 'أخرى': '#f5d0fe' };
  var LEG_LIST = [''].concat(Object.keys(LEG));
  var TOOTH_STATUS = ['', 'موجود (Present)', 'مفقود (Missing)', 'لم يبزغ (Unerupted)', 'لبني (Primary)', 'مؤقت (Temporary restoration)'];

  // [key, label, colour, short code, surface-level?]
  var CATS = [
    ['healthy', 'سليم (Healthy)', '#16a34a', 'H', 0],
    ['caries', 'تسوس مشتبه/مؤكد (Caries)', '#dc2626', 'C', 1],
    ['restoration', 'حشو موجود (Restoration)', '#2563eb', 'R', 1],
    ['crown', 'تاج / جسر (Crown / Bridge)', '#ca8a04', 'Cr', 0],
    ['rct', 'علاج عصب (Root canal)', '#7c3aed', 'RCT', 0],
    ['missing', 'مفقود / مخلوع (Missing / Extracted)', '#6b7280', 'X', 0],
    ['implant', 'زراعة (Implant)', '#4f46e5', 'Imp', 0],
    ['fracture', 'كسر (Fracture)', '#ea580c', 'Fx', 1],
    ['perio', 'لثة / دواعم (Periodontal)', '#db2777', 'P', 0],
    ['other', 'أخرى (Other)', '#0891b2', 'O', 1]
  ];
  var STATUS = [['', 'نتيجة فحص (Finding)'], ['planned', 'مخطط (Planned)'], ['completed', 'تم (Completed)'], ['followup', 'يحتاج متابعة (Follow-up)']];
  var PROCS = ['', 'حشو (Filling)', 'علاج عصب (Root canal treatment)', 'تاج (Crown)', 'جسر (Bridge)', 'خلع (Extraction)', 'تنظيف وتسوية جذور (Scaling & root planing)',
    'زراعة (Implant placement)', 'دعامة/تاج على زراعة (Implant abutment / crown)', 'بطانة/Pulpotomy', 'فلورايد / سيلانت (Fluoride / Sealant)', 'تبييض (Whitening)', 'أخرى (Other)'];
  var CFG = 'cm_dental_odo_cfg_v1'; // { hiddenCats:[], procs:[] } per device

  function cfg() { try { return JSON.parse(localStorage.getItem(CFG) || '{}') || {}; } catch (e) { return {}; } }
  function setCfg(c) { try { localStorage.setItem(CFG, JSON.stringify(c)); } catch (e) {} }
  function procList() { var x = cfg().procs; return [''].concat(PROCS.slice(1, -1), x || [], ['أخرى (Other)']); }
  function catOf(k) { for (var i = 0; i < CATS.length; i++) if (CATS[i][0] === k) return CATS[i]; return CATS[CATS.length - 1]; }
  function label(list, k) { for (var i = 0; i < list.length; i++) if (list[i][0] === k) return list[i][1]; return k || ''; }
  function opts(list, v) {
    return list.map(function (o) {
      var val = Array.isArray(o) ? o[0] : o, t = Array.isArray(o) ? o[1] : o;
      return '<option value="' + esc(val) + '"' + (val === (v || '') ? ' selected' : '') + '>' + (t ? esc(t) : '—') + '</option>';
    }).join('');
  }
  function today() { return CC && CC.today ? CC.today() : new Date().toISOString().slice(0, 10); }

  /* ---------- FDI helpers ---------- */
  function quad(n) { return +n.charAt(0); }
  function pos(n) { return +n.charAt(1); }
  function isPrimary(n) { return quad(n) >= 5; }
  function isUpper(n) { var q = quad(n); return q === 1 || q === 2 || q === 5 || q === 6; }
  function isAnterior(n) { return pos(n) <= 3; }
  function viewerLeft(n) { var q = quad(n); return q === 1 || q === 4 || q === 5 || q === 8; } // patient's right side
  function validTooth(n) { return ALL.indexOf(String(n)) >= 0; }
  // Display only: never replace the persisted FDI tooth identifier.
  // Universal (US) numbering is a per-device display option (cfg().notation === 'universal'); stored keys stay FDI.
  function universalOf(n) {
    n = String(n); if (!validTooth(n)) return '';
    var q = quad(n), p = pos(n), i;
    if (!isPrimary(n)) { i = q === 1 ? 9 - p : q === 2 ? 8 + p : q === 3 ? 25 - p : 24 + p; return String(i); }
    i = q === 5 ? 6 - p : q === 6 ? 5 + p : q === 7 ? 16 - p : 15 + p; // A–J upper (UR→UL), K–T lower (LL→LR)
    return String.fromCharCode(64 + i);
  }
  function useUniversal() { return cfg().notation === 'universal'; }
  function toothNotation(n) {
    n = String(n);
    if (useUniversal() && validTooth(n)) { var u = universalOf(n); return { text: u, letter: u, corner: '', quadrant: '', fdi: n }; }
    if (!isPrimary(n) || !validTooth(n)) return { text: n, letter: n, corner: '', quadrant: '' };
    var q = quad(n), letter = 'ABCDE'.charAt(pos(n) - 1);
    var corner = { 5: '┘', 6: '└', 7: '┌', 8: '┐' }[q];
    return { text: viewerLeft(n) ? letter + corner : corner + letter, letter: letter, corner: corner,
      quadrant: { 5: 'UR', 6: 'UL', 7: 'LL', 8: 'LR' }[q] };
  }
  function toothText(n) { var t = toothNotation(n); return t.text + (t.quadrant ? ' (' + t.quadrant + ')' : '') + (t.fdi ? ' [FDI ' + t.fdi + ']' : ''); }
  function toothHtml(n) { return '<bdi dir="ltr" class="odx-tooth-label">' + esc(toothText(n)) + '</bdi>'; }
  function notationSvg(n, x, y, selected) {
    var t = toothNotation(n), cls = 'odx-n' + (selected ? ' odx-number-selected' : '');
    var out = '<g class="' + cls + '" data-t="' + n + '" transform="translate(' + x.toFixed(2) + ' ' + y.toFixed(2) + ')"><title>' + esc(toothText(n) + ' — ' + toothName(n)) + '</title>' +
      '<text text-anchor="middle" y="4" font-size="13" font-weight="600">' + t.letter + '</text>';
    if (t.corner) {
      var side = viewerLeft(n) ? 9 : -9, edge = isUpper(n) ? 8 : -10;
      out += '<path class="odx-palmer-corner" d="M' + (-side) + ' ' + edge + ' H' + side + ' V' + (isUpper(n) ? -10 : 8) + '"/>';
    }
    return out + '</g>';
  }
  function surfacesFor(n) { return ['M', 'D', isAnterior(n) ? 'I' : 'O', 'B', isUpper(n) ? 'P' : 'L']; }
  var SURF_L = { M: 'Mesial', D: 'Distal', O: 'Occlusal', I: 'Incisal', B: 'Buccal/Labial', L: 'Lingual', P: 'Palatal' };
  function cleanSurf(n, s) { var ok = surfacesFor(n); return (s || '').split('').filter(function (c, i, a) { return ok.indexOf(c) >= 0 && a.indexOf(c) === i; }).join(''); }
  function toothName(n) {
    var Q = { 1: 'علوي أيمن (UR)', 2: 'علوي أيسر (UL)', 3: 'سفلي أيسر (LL)', 4: 'سفلي أيمن (LR)' };
    var Pn = ['', 'قاطع أوسط (Central incisor)', 'قاطع جانبي (Lateral incisor)', 'ناب (Canine)', 'ضاحك أول (1st premolar)', 'ضاحك ثانٍ (2nd premolar)', 'ضرس أول (1st molar)', 'ضرس ثانٍ (2nd molar)', 'ضرس العقل (3rd molar)'];
    var Dn = ['', 'قاطع أوسط لبني (Primary central)', 'قاطع جانبي لبني (Primary lateral)', 'ناب لبني (Primary canine)', 'ضرس لبني أول (Primary 1st molar)', 'ضرس لبني ثانٍ (Primary 2nd molar)'];
    var q = quad(n), p = pos(n);
    return (isPrimary(n) ? Dn[p] : Pn[p]) + ' — ' + Q[isPrimary(n) ? q - 4 : q];
  }

  /* ---------- SVG tooth glyph: 5 clickable surfaces ---------- */
  var G = 30; // glyph size
  function glyphPolys(x, y, g, n) {
    var a = g * 0.3, b = g * 0.7;
    var top = [[x, y], [x + g, y], [x + b, y + a], [x + a, y + a]];
    var bot = [[x + a, y + b], [x + b, y + b], [x + g, y + g], [x, y + g]];
    var lft = [[x, y], [x + a, y + a], [x + a, y + b], [x, y + g]];
    var rgt = [[x + g, y], [x + g, y + g], [x + b, y + b], [x + b, y + a]];
    var cen = [[x + a, y + a], [x + b, y + a], [x + b, y + b], [x + a, y + b]];
    var up = isUpper(n), vl = viewerLeft(n), m = {};
    if (up) { m.B = top; m.P = bot; } else { m.L = top; m.B = bot; }
    m[vl ? 'D' : 'M'] = lft; m[vl ? 'M' : 'D'] = rgt;
    m[isAnterior(n) ? 'I' : 'O'] = cen;
    return m;
  }
  function pts(p) { return p.map(function (q) { return q[0].toFixed(1) + ',' + q[1].toFixed(1); }).join(' '); }

  function toothState(n, st) {
    var recs = (st.records || []).filter(function (r) { return r.tooth === n; });
    var surf = {}, whole = [], codes = [], planned = false, done = false, fu = false;
    recs.forEach(function (r) {
      var c = catOf(r.cat);
      if (r.surf && c[4]) r.surf.split('').forEach(function (s) { surf[s] = c[2]; }); else whole.push(r.cat);
      if (codes.indexOf(c[3]) < 0) codes.push(c[3]);
      if (r.status === 'planned') planned = true; if (r.status === 'completed') done = true; if (r.status === 'followup') fu = true;
    });
    var lc = st.teeth && st.teeth[n];
    if (lc && st.surfaces && st.surfaces[n]) st.surfaces[n].split('').forEach(function (s) { if (!surf[s]) surf[s] = LEG[lc] || '#999'; });
    return { recs: recs, surf: surf, whole: whole, codes: codes, planned: planned, done: done, fu: fu, legacy: lc };
  }
  function toothSvg(n, x, y, st, sel, selSurf, interactive, hist, angle) {
    var s = toothState(n, st), out = '', size = isAnterior(n) ? 29 : 36;
    var g = size, m = glyphPolys(-g / 2, -g / 2, g, n);
    var missing = s.whole.indexOf('missing') >= 0 || s.legacy === 'مفقود' || s.legacy === 'خلع';
    var crown = isAnterior(n) ? 'M-12 -15 Q0 -19 12 -15 L13 9 Q11 17 0 17 Q-11 17 -13 9 Z' :
      'M-14 -17 Q-7 -20 0 -17 Q8 -20 15 -15 Q20 -7 17 1 Q20 10 13 16 Q5 20 0 17 Q-10 20 -16 13 Q-20 5 -17 -3 Q-20 -11 -14 -17 Z';
    var clip = 'odx-crown-' + n + (interactive ? '-edit' : '-print');
    out += '<defs><clipPath id="' + clip + '"><path d="' + crown + '"/></clipPath></defs>';
    if (s.planned) out += '<path d="' + crown + '" class="odx-plan-ring" transform="scale(1.22)"/>';
    if (sel) out += '<path d="' + crown + '" class="odx-selection" transform="scale(1.32)"/>';
    out += '<path data-t="' + n + '" d="' + crown + '" class="odx-crown' + (missing ? ' odx-missing' : '') + '"/>';
    out += '<g clip-path="url(#' + clip + ')">';
    Object.keys(m).forEach(function (k) {
      var on = sel && selSurf.indexOf(k) >= 0;
      out += '<polygon data-t="' + n + '" data-s="' + k + '" points="' + pts(m[k]) + '" class="odx-s' + (on ? ' odx-sel-surface' : '') + '"><title>' + n + ' ' + SURF_L[k] + '</title></polygon>';
    });
    out += '</g>';
    if (!isAnterior(n)) out += '<path d="M-9 -5 Q0 0 9 -5 M0 -10 Q-3 0 0 10 M-9 6 Q0 2 9 6" class="odx-fissure"/>';
    else out += '<path d="M-8 10 Q0 13 8 10" class="odx-fissure"/>';
    Object.keys(s.surf).forEach(function (k) {
      if (!m[k]) return;
      var cx = 0, cy = 0; m[k].forEach(function (q) { cx += q[0] / 4; cy += q[1] / 4; });
      out += '<circle cx="' + cx + '" cy="' + cy + '" r="3.5" fill="' + s.surf[k] + '" class="odx-condition-dot"><title>' + n + ' ' + SURF_L[k] + '</title></circle>';
    });
    s.whole.forEach(function (k, i) {
      out += '<circle cx="' + ((i - (s.whole.length - 1) / 2) * 7) + '" cy="2" r="3.4" fill="' + catOf(k)[2] + '" class="odx-condition-dot"><title>' + esc(catOf(k)[1]) + '</title></circle>';
    });
    if (s.legacy && !Object.keys(s.surf).length) out += '<circle cx="0" cy="-7" r="4" fill="' + (LEG[s.legacy] || 'var(--muted)') + '" class="odx-condition-dot"><title>' + esc(s.legacy) + '</title></circle>';
    if (missing) out += '<path d="M-10 -10 L10 10 M10 -10 L-10 10" class="odx-missing-cross"/>';
    if (s.whole.indexOf('implant') >= 0) out += '<text y="13" text-anchor="middle" font-size="6" class="odx-status-label">IMP</text>';
    var badge = (s.done ? '✓' : '') + (s.fu ? '!' : '') + (hist ? '•' : '');
    if (badge) out += '<text y="29" transform="rotate(' + (-angle) + ')" text-anchor="middle" font-size="9" class="odx-status-label">' + badge + '</text>';
    return '<g transform="translate(' + x.toFixed(2) + ' ' + y.toFixed(2) + ') rotate(' + angle.toFixed(2) + ')">' + out + '</g>';
  }
  var WIDTH = 640;
  function archSvg(list, upper, offset, st, sel, selSurf, interactive, hist) {
    var cy = (upper ? 251 : 309) + offset, sign = upper ? -1 : 1;
    var outer = 'M112 ' + cy + ' C112 ' + (cy + sign * 235) + ' 528 ' + (cy + sign * 235) + ' 528 ' + cy;
    var out = '<path d="' + outer + ' Q320 ' + (cy + sign * 10) + ' 112 ' + cy + ' Z" class="odx-gum"/>';
    out += '<path d="M150 ' + (cy + sign * 10) + ' C150 ' + (cy + sign * 188) + ' 490 ' + (cy + sign * 188) + ' 490 ' + (cy + sign * 10) + '" class="odx-gum-ridge"/>';
    if (upper) {
      out += '<path d="M320 ' + (cy - 115) + ' L320 ' + (cy - 20) + '" class="odx-palate-line"/>';
      for (var r = 0; r < 4; r++) out += '<path d="M320 ' + (cy - 103 + r * 15) + ' q-30 -13 -53 1 M320 ' + (cy - 103 + r * 15) + ' q30 -13 53 1" class="odx-palate-line"/>';
    } else out += '<path d="M320 ' + (cy + 20) + ' Q320 ' + (cy + 65) + ' 320 ' + (cy + 109) + '" class="odx-palate-line"/>';
    list.forEach(function (n, i) {
      var t = -1.48 + 2.96 * i / (list.length - 1), sn = Math.sin(t), cs = Math.cos(t);
      var x = 320 + sn * 174, y = cy + sign * cs * 145;
      var rotation = (upper ? t : -t) * 180 / Math.PI;
      out += toothSvg(n, x, y, st, sel === n, sel === n ? selSurf : '', interactive, hist && hist[n], rotation);
      var nx = 320 + sn * 223, ny = cy + sign * cs * 186;
      out += notationSvg(n, nx, ny, sel === n);
    });
    out += '<text x="320" y="' + (upper ? cy - 55 : cy + 66) + '" text-anchor="middle" class="odx-jaw-label">' + (upper ? 'الفك العلوي · Upper' : 'الفك السفلي · Lower') + '</text>';
    return out;
  }
  function chartSvg(dent, st, sel, selSurf, interactive, hist) {
    var h = dent === 'mixed' ? 1100 : 560;
    var pairs = dent === 'mixed' ? [[P_UP, P_LO, 0], [D_UP, D_LO, 540]] : [[dent === 'primary' ? D_UP : P_UP, dent === 'primary' ? D_LO : P_LO, 0]];
    var body = pairs.map(function (p) {
      return archSvg(p[0], true, p[2], st, sel, selSurf, interactive, hist) + archSvg(p[1], false, p[2], st, sel, selSurf, interactive, hist);
    }).join('');
    return '<svg class="odx-svg" viewBox="0 0 ' + WIDTH + ' ' + h + '" style="direction:ltr" role="img" aria-label="Odontogram — upper and lower dental arches">' +
      '<text x="50" y="30" class="odx-side-label">يمين المريض · R</text><text x="590" y="30" text-anchor="end" class="odx-side-label">يسار المريض · L</text>' + body + '</svg>';
  }
  function focusSvg(n, st, selSurf) {
    var g = 120, x = 30, y = 26, m = glyphPolys(x, y, g, n), s = toothState(n, st), out = '';
    Object.keys(m).forEach(function (k) {
      var on = selSurf.indexOf(k) >= 0, c = m[k], cx = 0, cy = 0;
      c.forEach(function (q) { cx += q[0] / 4; cy += q[1] / 4; });
      out += '<polygon class="odx-fs" data-s="' + k + '" points="' + pts(c) + '" fill="' + (s.surf[k] || '#fff') + '" stroke="' + (on ? '#0d6efd' : '#7d8aa3') + '" stroke-width="' + (on ? 3 : 1.2) + '"/>' +
        '<text x="' + cx + '" y="' + (cy + 5) + '" text-anchor="middle" font-size="15" font-weight="700" fill="' + (on ? '#0d6efd' : '#2b3a67') + '" style="pointer-events:none">' + k + '</text>';
    });
    return '<svg class="odx-focus" viewBox="0 0 180 172" style="direction:ltr">' + out +
      '<text x="90" y="16" text-anchor="middle" font-size="10" fill="#6b7280">' + (isUpper(n) ? 'Buccal ▲' : 'Lingual ▲') + '</text>' +
      '<text x="90" y="166" text-anchor="middle" font-size="10" fill="#6b7280">' + (isUpper(n) ? 'Palatal ▼' : 'Buccal ▼') + '</text></svg>';
  }
  function legendHtml() {
    return '<div class="afm-legend odx-legend">' + CATS.map(function (c) { return '<span><i style="background:' + c[2] + '"></i><b>' + c[3] + '</b> ' + esc(c[1]) + '</span>'; }).join('') +
      '<span><i class="odx-lg-dash"></i>مخطط (Planned)</span><span>✓ تم (Completed)</span><span>! متابعة</span><span>✕ مفقود</span><span>• له سجل سابق</span></div>';
  }
  var HEAD = ['السن', 'الأسطح', 'الحالة / التصنيف', 'الإجراء', 'الحالة', 'التاريخ', 'متابعة', 'ملاحظات'];
  function procTxt(r) { return r.proc === 'أخرى (Other)' && r.procOther ? r.procOther : (r.proc || '—'); }
  function recRows(list) { return list.map(function (r) { return [toothText(r.tooth), r.surf || '—', catOf(r.cat)[1], procTxt(r), label(STATUS, r.status || ''), r.date || '—', r.follow || '—', r.notes || '—']; }); }
  function sortT(a, b) { return ALL.indexOf(a.tooth) - ALL.indexOf(b.tooth); }
  function groupTables(recs) {
    var G3 = [['نتائج الفحص (Findings)', function (r) { return !r.status || r.status === 'followup'; }],
      ['خطة العلاج المقترحة (Planned treatment)', function (r) { return r.status === 'planned'; }],
      ['إجراءات تمت (Completed treatment)', function (r) { return r.status === 'completed'; }]];
    var h = G3.map(function (g) { var l = recs.filter(g[1]).sort(sortT); return l.length ? '<h5 class="em-kind">' + g[0] + ' (' + l.length + ')</h5>' + SP.tableHtml(HEAD, recRows(l)) : ''; }).join('');
    return h || '<p class="muted">لا توجد سجلات مطابقة.</p>';
  }
  function legacyTable(st) {
    var keys = ALL.filter(function (k) { return (st.teeth || {})[k] || (st.surfaces || {})[k] || (st.details || {})[k]; });
    if (!keys.length) return '';
    return '<h5 class="em-kind">حالة السن العامة (Tooth condition)</h5>' + SP.tableHtml(['السن', 'الحالة', 'الأسطح', 'حالة السن', 'التشخيص', 'ملاحظات'], keys.map(function (k) {
      var x = (st.details || {})[k] || {}; return [toothText(k), (st.teeth || {})[k] || '', (st.surfaces || {})[k] || '', x.status || '', x.diagnosis || '', x.notes || ''];
    }));
  }
  function prevVisits() { try { var p = CC && CC.getPatient && CC.getPatient(); return p && CC.visitsFor ? CC.visitsFor(p) : []; } catch (e) { return []; } }
  function history() {
    var rows = [], map = {};
    prevVisits().forEach(function (v) {
      var o = v && v.exam && v.exam.specialty === 'dental' && v.exam.sections && v.exam.sections.odontogram;
      if (!o) return;
      (o.records || []).forEach(function (r) { map[r.tooth] = 1; rows.push([v.date || '—', toothText(r.tooth), r.surf || '—', catOf(r.cat)[1], procTxt(r), label(STATUS, r.status || '')]); });
      Object.keys(o.teeth || {}).forEach(function (t) { map[t] = 1; rows.push([v.date || '—', toothText(t), (o.surfaces || {})[t] || '—', o.teeth[t], '—', '—']); });
    });
    return { rows: rows, map: map };
  }

  /* ---------- section ---------- */
  function make() {
    return {
      id: 'odontogram',
      title: '🦷 خريطة الأسنان التفاعلية (Interactive Odontogram — FDI / Palmer)',
      html: function (v) {
        v = v || {};
        var data = { teeth: v.teeth || {}, surfaces: v.surfaces || {}, details: v.details || {}, records: v.records || [], dentition: v.dentition || '' };
        return '<div class="odx" data-saved="' + esc(JSON.stringify(data)) + '">' +
          '<div class="afm-tabs odx-tabs">' + DENT.map(function (d) { return '<button type="button" class="afm-tab" data-d="' + d[0] + '">' + esc(d[1]) + '</button>'; }).join('') + '</div>' +
          '<div class="odx-nt-row"><label class="muted">نظام الترقيم (لهذا الجهاز): <select class="odx-nt"><option value="fdi"' + (useUniversal() ? '' : ' selected') + '>FDI (الدائمة) / Palmer (اللبنية)</option><option value="universal"' + (useUniversal() ? ' selected' : '') + '>Universal (1–32 / A–T)</option></select></label></div>' +
          '<p class="muted afm-hint">اضغط على السن أو على سطح منه (M/D/O-I/B/L-P). الترقيم للعرض فقط — البيانات المحفوظة تبقى بنظام FDI. كل تسجيل يدوي — لا يُعتبر أي شيء مؤكداً أو منفذاً إلا باختيار الطبيب.</p>' +
          '<div class="odx-stage"></div>' + legendHtml() +
          '<div class="odx-panel"></div>' +
          '<details class="em-cfg odx-cfg"><summary>⚙️ إعدادات التصنيفات والإجراءات (لهذا الجهاز)</summary><div class="odx-cfg-b"></div></details>' +
          '<h4 class="afm-h">ملخص العلاج (Treatment Summary)</h4>' +
          '<div class="em-filters odx-filters"><select class="odx-ft"><option value="">كل الأسنان</option></select>' +
          '<select class="odx-fc"><option value="">كل التصنيفات</option>' + opts(CATS.map(function (c) { return [c[0], c[1]]; }), '') + '</select>' +
          '<select class="odx-fs2"><option value="">كل الحالات</option>' + opts(STATUS.map(function (s) { return [s[0] || 'finding', s[1]]; }), '') + '</select></div>' +
          '<div class="afm-table odx-table"></div><div class="odx-hist"></div></div>';
      },
      wire: function (el) {
        var root = el.querySelector('.odx'); if (!root) return;
        var st = { teeth: {}, surfaces: {}, details: {}, records: [], dentition: '' };
        try { st = Object.assign(st, JSON.parse(root.getAttribute('data-saved'))); } catch (e) {}
        st.records = (st.records || []).filter(function (r) { return r && validTooth(r.tooth); });
        el._odo = st;
        var ui = { sel: null, surf: '', edit: null, dent: st.dentition || '' };
        if (!ui.dent) {
          var p = CC && CC.getPatient && CC.getPatient(), age = null;
          try { var a = p && CC.ageParts && CC.ageParts(p); age = a && a.years != null ? a.years : null; } catch (e) {}
          var hasD = st.records.concat(Object.keys(st.teeth).map(function (t) { return { tooth: t }; })).some(function (r) { return isPrimary(r.tooth); });
          ui.dent = hasD ? 'mixed' : (age != null && age < 6 ? 'primary' : (age != null && age < 12 ? 'mixed' : 'permanent'));
        }
        var H = history();
        function fillHist() {
          H = history();
          var hb = root.querySelector('.odx-hist'); if (!H.rows.length) { hb.innerHTML = ''; return; }
          hb.innerHTML = '<details class="em-hist"><summary>🕘 سجل الأسنان في الزيارات السابقة (' + H.rows.length + ') — للاطلاع فقط، لا يتغير</summary>' +
          SP.tableHtml(['الزيارة', 'السن', 'الأسطح', 'الحالة', 'الإجراء', 'الحالة'], H.rows) + '</details>';
        }
        fillHist();
        var nid = 0;
        function drawTabs() { root.querySelectorAll('.odx-tabs .afm-tab').forEach(function (b) { b.classList.toggle('on', b.dataset.d === ui.dent); }); }
        function drawChart() { root.querySelector('.odx-stage').innerHTML = chartSvg(ui.dent, st, ui.sel, ui.surf, true, H.map); }
        function activeCats(cur) { var h = cfg().hiddenCats || []; return CATS.filter(function (c) { return h.indexOf(c[0]) < 0 || c[0] === cur; }); }
        function recForm(r) {
          var n = ui.sel;
          return '<div class="odx-form"><b>' + (r ? 'تعديل السجل' : '➕ سجل جديد لهذا السن') + '</b>' +
            '<div class="odx-surfs">' + surfacesFor(n).map(function (s) { return '<label class="odo-sbtn"><input type="checkbox" value="' + s + '"' + (ui.surf.indexOf(s) >= 0 ? ' checked' : '') + '/> ' + s + ' <small>' + SURF_L[s] + '</small></label>'; }).join('') + '</div>' +
            '<div class="grid-2 sx-grid">' +
            '<div class="field"><label>الحالة / التصنيف (Condition)</label><select data-r="cat">' + opts(activeCats(r && r.cat).map(function (c) { return [c[0], c[1]]; }), r ? r.cat : 'caries') + '</select></div>' +
            '<div class="field"><label>الإجراء (Procedure)</label><select data-r="proc">' + opts(procList(), r ? r.proc : '') + '</select></div>' +
            '<div class="field odx-po"' + (r && r.proc === 'أخرى (Other)' ? '' : ' style="display:none"') + '><label>إجراء آخر</label><input data-r="procOther" value="' + esc(r && r.procOther || '') + '"/></div>' +
            '<div class="field"><label>الحالة (Status)</label><select data-r="status">' + opts(STATUS, r ? r.status : '') + '</select></div>' +
            '<div class="field"><label>التاريخ</label><input type="date" data-r="date" value="' + esc(r ? r.date || '' : today()) + '"/></div>' +
            '<div class="field"><label>المتابعة المطلوبة (Follow-up)</label><input data-r="follow" value="' + esc(r && r.follow || '') + '" placeholder="مثال: مراجعة بعد أسبوعين"/></div>' +
            '<div class="field" style="grid-column:1 / -1"><label>ملاحظات إكلينيكية</label><textarea data-r="notes" rows="2">' + esc(r && r.notes || '') + '</textarea></div></div>' +
            '<div class="odx-actions"><button type="button" class="btn small primary odx-save">' + (r ? '💾 حفظ التعديل' : '➕ إضافة السجل') + '</button>' +
            (r ? '<button type="button" class="btn small odx-cancel">إلغاء</button>' : '') + '<span class="odx-msg muted"></span></div></div>';
        }
        function drawPanel() {
          var pnl = root.querySelector('.odx-panel'), n = ui.sel;
          if (!n) { pnl.innerHTML = '<p class="muted afm-hint">اختر سناً من الخريطة لعرض تفاصيله.</p>'; return; }
          var d = st.details[n] || {}, recs = st.records.filter(function (r) { return r.tooth === n; });
          var edit = ui.edit && recs.filter(function (r) { return r.id === ui.edit; })[0];
          pnl.innerHTML = '<div class="afm-ed odx-ed"><div class="afm-ed-h"><b>السن ' + toothHtml(n) + '</b> <span class="muted">' + esc(toothName(n)) + '</span></div>' +
            '<div class="odx-detail"><div class="odx-fwrap">' + focusSvg(n, st, ui.surf) + '<div class="muted odx-fhint">اضغط على السطح لاختياره</div></div><div class="odx-dright">' +
            '<div class="grid-2 sx-grid">' +
            '<div class="field"><label>الحالة الحالية (Current condition)</label><select data-l="cond">' + opts(LEG_LIST.map(function (x) { return [x, x || '— بدون —']; }), st.teeth[n] || '') + '</select></div>' +
            '<div class="field"><label>حالة السن (Tooth status)</label><select data-l="status">' + opts(TOOTH_STATUS, d.status || '') + '</select></div>' +
            '<div class="field"><label>التشخيص / النتائج (Findings)</label><input data-l="diagnosis" value="' + esc(d.diagnosis || '') + '"/></div>' +
            '<div class="field"><label>ملاحظات السن</label><input data-l="notes" value="' + esc(d.notes || '') + '"/></div></div>' +
            (recs.length ? '<div class="odx-recs">' + recs.map(function (r) {
              var c = catOf(r.cat);
              return '<div class="odx-rec' + (r.id === ui.edit ? ' on' : '') + '" style="border-inline-start:4px solid ' + c[2] + '"><span><b>' + esc(c[3]) + '</b> ' + esc(c[1]) + (r.surf ? ' — ' + esc(r.surf) : '') +
                (r.proc ? ' • ' + esc(procTxt(r)) : '') + ' • <i>' + esc(label(STATUS, r.status || '')) + '</i>' + (r.date ? ' • ' + esc(r.date) : '') + '</span>' +
                '<span><button type="button" class="btn small odx-e" data-id="' + esc(r.id) + '">✏️</button><button type="button" class="btn small danger odx-x" data-id="' + esc(r.id) + '">🗑</button></span></div>';
            }).join('') + '</div>' : '<p class="muted">لا توجد سجلات لهذا السن في هذه الزيارة.</p>') +
            recForm(edit) + '</div></div></div>';
        }
        function drawFilters() {
          var ft = root.querySelector('.odx-ft'), cur = ft.value, used = {};
          st.records.forEach(function (r) { used[r.tooth] = 1; });
          ft.innerHTML = '<option value="">كل الأسنان</option>' + ALL.filter(function (t) { return used[t]; }).map(function (t) { return '<option value="' + t + '" dir="ltr"' + (t === cur ? ' selected' : '') + '>' + esc(toothText(t)) + '</option>'; }).join('');
        }
        function drawTable() {
          var ft = root.querySelector('.odx-ft').value, fc = root.querySelector('.odx-fc').value, fs = root.querySelector('.odx-fs2').value;
          var l = st.records.filter(function (r) { return (!ft || r.tooth === ft) && (!fc || r.cat === fc) && (!fs || (fs === 'finding' ? !r.status : r.status === fs)); });
          root.querySelector('.odx-table').innerHTML = (st.records.length ? groupTables(l) : '<p class="muted">لا توجد سجلات بعد.</p>') + legacyTable(st);
        }
        function drawCfg() {
          var c = cfg(), h = c.hiddenCats || [];
          root.querySelector('.odx-cfg-b').innerHTML = CATS.map(function (k) {
            return '<label class="em-cfg-i"><input type="checkbox" data-hc="' + k[0] + '"' + (h.indexOf(k[0]) < 0 ? ' checked' : '') + '/> <i style="background:' + k[2] + '"></i>' + esc(k[1]) + '</label>';
          }).join('') + '<div class="field"><label>إجراءات إضافية خاصة بك (افصل بفاصلة)</label><input class="odx-cp" value="' + esc((c.procs || []).join('، ')) + '"/></div>';
        }
        function all() { drawTabs(); drawChart(); drawPanel(); drawFilters(); drawTable(); }
        function select(n, s) {
          if (ui.sel !== n) { ui.sel = n; ui.surf = ''; ui.edit = null; }
          if (s) ui.surf = ui.surf.indexOf(s) >= 0 ? ui.surf.replace(s, '') : ui.surf + s;
          ui.surf = cleanSurf(n, ui.surf);
          drawChart(); drawPanel();
          if (window.innerWidth < 760) { var p = root.querySelector('.odx-panel'); if (p.scrollIntoView) p.scrollIntoView({ behavior: 'smooth', block: 'start' }); }
        }
        root.querySelector('.odx-nt').addEventListener('change', function (e) {
          var c = cfg(); c.notation = e.target.value === 'universal' ? 'universal' : 'fdi'; setCfg(c);
          fillHist(); all();
        });
        root.querySelector('.odx-tabs').addEventListener('click', function (e) {
          var b = e.target.closest('.afm-tab'); if (!b) return;
          ui.dent = b.dataset.d; st.dentition = ui.dent;
          if (ui.sel && teethOf(ui.dent).indexOf(ui.sel) < 0) { ui.sel = null; ui.surf = ''; ui.edit = null; }
          all();
        });
        root.querySelector('.odx-stage').addEventListener('click', function (e) {
          var t = e.target.closest('[data-t]'); if (!t) return;
          var n = t.getAttribute('data-t'); if (teethOf(ui.dent).indexOf(n) < 0) return;
          select(n, t.getAttribute('data-s'));
        });
        var pnl = root.querySelector('.odx-panel');
        pnl.addEventListener('click', function (e) {
          var fs = e.target.closest('.odx-fs');
          if (fs) { select(ui.sel, fs.getAttribute('data-s')); return; }
          var eb = e.target.closest('.odx-e');
          if (eb) { ui.edit = eb.dataset.id; var r = st.records.filter(function (x) { return x.id === ui.edit; })[0]; ui.surf = r ? r.surf || '' : ''; drawChart(); drawPanel(); return; }
          var xb = e.target.closest('.odx-x');
          if (xb) { if (!confirm('حذف هذا السجل من الزيارة الحالية؟')) return; st.records = st.records.filter(function (x) { return x.id !== xb.dataset.id; }); ui.edit = null; all(); return; }
          if (e.target.closest('.odx-cancel')) { ui.edit = null; ui.surf = ''; drawChart(); drawPanel(); return; }
          if (e.target.closest('.odx-save')) {
            var f = pnl.querySelector('.odx-form'), msg = pnl.querySelector('.odx-msg'), v = {};
            f.querySelectorAll('[data-r]').forEach(function (i) { v[i.getAttribute('data-r')] = (i.value || '').trim(); });
            var n = ui.sel;
            if (!validTooth(n) || teethOf(ui.dent).indexOf(n) < 0) { msg.textContent = '⚠️ رقم السن غير صحيح لهذا النوع من الأسنان.'; return; }
            var c = catOf(v.cat), surf = c[4] ? cleanSurf(n, ui.surf) : '';
            if (c[4] && ui.surf && !surf) { msg.textContent = '⚠️ الأسطح المختارة لا تناسب هذا السن.'; return; }
            if (v.proc !== 'أخرى (Other)') v.procOther = '';
            var rec = { tooth: n, surf: surf, cat: v.cat, proc: v.proc, procOther: v.procOther, status: v.status, date: v.date, follow: v.follow, notes: v.notes };
            var dup = st.records.some(function (r) { return r.id !== ui.edit && r.tooth === n && (r.surf || '') === surf && r.cat === rec.cat && (r.proc || '') === rec.proc && (r.status || '') === rec.status && (r.date || '') === rec.date; });
            if (dup) { msg.textContent = '⚠️ يوجد سجل مطابق بالفعل لنفس السن والسطح والتاريخ.'; return; }
            if (ui.edit) { st.records.forEach(function (r, i) { if (r.id === ui.edit) st.records[i] = Object.assign({ id: r.id }, rec); }); }
            else { rec.id = 'd' + Date.now().toString(36) + (nid++); st.records.push(rec); }
            ui.edit = null; ui.surf = ''; all();
            var m2 = root.querySelector('.odx-msg'); if (m2) m2.textContent = '✔ تمت الإضافة — يُحفظ نهائياً عند حفظ الزيارة.';
          }
        });
        function onPanel(e) {
          var l = e.target.getAttribute && e.target.getAttribute('data-l'), n = ui.sel;
          if (l && n) {
            if (l === 'cond') { if (e.target.value) st.teeth[n] = e.target.value; else { delete st.teeth[n]; delete st.surfaces[n]; } }
            else { var d = Object.assign({}, st.details[n] || {}); d[l] = (e.target.value || '').trim(); if (d.status || d.diagnosis || d.notes) st.details[n] = d; else delete st.details[n]; }
            drawChart(); drawTable(); return;
          }
          if (e.target.getAttribute && e.target.getAttribute('data-r') === 'proc') { var po = pnl.querySelector('.odx-po'); if (po) po.style.display = e.target.value === 'أخرى (Other)' ? '' : 'none'; }
          if (e.target.closest && e.target.closest('.odx-surfs') && e.target.type === 'checkbox') {
            var s = ''; pnl.querySelectorAll('.odx-surfs input:checked').forEach(function (i) { s += i.value; }); ui.surf = cleanSurf(n, s);
            drawChart(); var fw = pnl.querySelector('.odx-fwrap'); if (fw) fw.firstChild.outerHTML = focusSvg(n, st, ui.surf);
          }
        }
        pnl.addEventListener('change', onPanel); pnl.addEventListener('input', function (e) { if (e.target.getAttribute('data-l') && e.target.tagName === 'INPUT') onPanel(e); });
        root.querySelector('.odx-filters').addEventListener('change', drawTable);
        root.querySelector('.odx-cfg').addEventListener('change', function (e) {
          var c = cfg();
          var hc = e.target.getAttribute('data-hc');
          if (hc) { var h = (c.hiddenCats || []).filter(function (x) { return x !== hc; }); if (!e.target.checked) h.push(hc); c.hiddenCats = h; }
          if (e.target.classList.contains('odx-cp')) c.procs = e.target.value.split(/[,،]/).map(function (x) { return x.trim(); }).filter(Boolean);
          setCfg(c); drawPanel();
        });
        drawCfg(); all();
      },
      collect: function (el) {
        var st = el._odo || {}, out = {};
        ['teeth', 'surfaces', 'details'].forEach(function (k) { if (st[k] && Object.keys(st[k]).length) out[k] = st[k]; });
        var recs = (st.records || []).filter(function (r) { return validTooth(r.tooth); }).map(function (r) {
          var o = {}; Object.keys(r).forEach(function (k) { if (r[k] !== '' && r[k] != null) o[k] = r[k]; }); return o;
        });
        if (recs.length) out.records = recs;
        if (!Object.keys(out).length) return null;
        if (st.dentition) out.dentition = st.dentition;
        return out;
      },
      render: function (v) {
        v = v || {};
        var st = { teeth: v.teeth || {}, surfaces: v.surfaces || {}, details: v.details || {}, records: v.records || [] };
        var any = st.records.length || Object.keys(st.teeth).length || Object.keys(st.surfaces).length || Object.keys(st.details).length;
        if (!any) return '';
        var dent = v.dentition || (st.records.concat(Object.keys(st.teeth).map(function (t) { return { tooth: t }; })).some(function (r) { return isPrimary(r.tooth); }) ? 'mixed' : 'permanent');
        return '<div class="odx-print">' + chartSvg(dent, st, null, '', false, null) + '</div>' + legendHtml() +
          (st.records.length ? groupTables(st.records) : '') + legacyTable(st);
      }
    };
  }
  window.ClinicDentalOdo = { wrap: function () { return make(); }, chartSvg: chartSvg, surfacesFor: surfacesFor, toothName: toothName, teethOf: teethOf, toothNotation: toothNotation, universalOf: universalOf };
})();
} catch (e) { console.error('[specialties-bundle] dental-odo.js failed:', e); }
/* ==== END dental-odo.js ==== */

/* ==== BEGIN dental.js ==== */
try {
// ============ Dental module (وحدة الأسنان) — v50 upgrade ============
// Built on the existing ClinicSpecialty sections (saved inside the visit's exam.sections).
// Old ids/keys are kept so v47–v49 records open unchanged:
//   odontogram: { teeth:{n:cond} }  + new: surfaces:{n:'MOD'}, details:{n:{status,diagnosis,notes}}
//   plan: [ {tooth,treatment,status,notes} ] + new: surface, diagnosis, price, discount, paid
//   files: [ {name,url,...} ] + new optional: category, tooth, procedure, date
// New sections: costs (totals, computed from plan), perio, procedures, anesthesia,
//   endo, crownsBridges, implants, diagnosis.

(function () {
  var SP = window.ClinicSpecialty;
  if (!SP) return;
  var esc = SP.escape;
  var S = 'dental';

  var UPPER = ['18','17','16','15','14','13','12','11','21','22','23','24','25','26','27','28'];
  var LOWER = ['48','47','46','45','44','43','42','41','31','32','33','34','35','36','37','38'];
  var ALL = UPPER.concat(LOWER);

  var CONDITIONS = [
    { v: '',          l: '— بدون —',                    c: '' },
    { v: 'سليم',       l: 'سليم (Sound)',               c: '#d1fae5' },
    { v: 'تسوس',       l: 'تسوس (Caries)',              c: '#fecaca', s: 1 },
    { v: 'حشو',        l: 'حشو (Filling)',              c: '#bfdbfe', s: 1 },
    { v: 'كسر',        l: 'كسر (Fracture)',             c: '#fed7aa', s: 1 },
    { v: 'مفقود',      l: 'مفقود (Missing)',            c: '#e5e7eb' },
    { v: 'خلع',        l: 'خلع (Extracted)',            c: '#fbcfe8' },
    { v: 'علاج عصب',   l: 'علاج عصب (Root canal treated)', c: '#ddd6fe' },
    { v: 'تركيبة',     l: 'تركيبة / تاج (Crown)',       c: '#fde68a' },
    { v: 'جسر',        l: 'جسر (Bridge)',               c: '#fcd34d' },
    { v: 'زراعة',      l: 'زراعة (Implant)',            c: '#c7d2fe' },
    { v: 'مطمور',      l: 'مطمور (Impacted)',           c: '#cbd5e1' },
    { v: 'دعامة جسر',  l: 'دعامة (Abutment)',           c: '#fef08a' },
    { v: 'حركة',       l: 'حركة السن (Mobility)',       c: '#fdba74' },
    { v: 'أخرى',       l: 'أخرى (Other)',               c: '#f5d0fe', s: 1 }
  ];
  function cond(v) { for (var i = 0; i < CONDITIONS.length; i++) if (CONDITIONS[i].v === v) return CONDITIONS[i]; return null; }
  function color(v) { var c = cond(v); return c ? c.c : ''; }
  function surfacesFor(n) { return ['M', 'D', 'O', 'B', n.charAt(0) === '1' || n.charAt(0) === '2' ? 'P' : 'L']; }
  var SURF_L = { M: 'Mesial', D: 'Distal', O: 'Occlusal', B: 'Buccal', L: 'Lingual', P: 'Palatal' };
  var TOOTH_STATUS = ['', 'موجود (Present)', 'مفقود (Missing)', 'لم يبزغ (Unerupted)', 'لبني (Primary)', 'مؤقت (Temporary restoration)'];

  function opts(list, v) {
    return list.map(function (o) {
      var val = typeof o === 'string' ? o : o.v, lab = typeof o === 'string' ? o : o.l;
      return '<option value="' + esc(val) + '"' + (val === v ? ' selected' : '') + '>' + (lab ? esc(lab) : '—') + '</option>';
    }).join('');
  }
  function num(v) { var n = parseFloat(String(v == null ? '' : v).replace(',', '.')); return isNaN(n) ? 0 : n; }
  function money(n) { return (Math.round(n * 100) / 100).toLocaleString('en-US'); }
  function rootOf(el) {
    var r = el;
    while (r && r.parentNode && !(r.querySelector && r.querySelector('.sp-section[data-sid="plan"]') && r !== el)) r = r.parentNode;
    return r || document;
  }

  /* ================= 1) Odontogram + tooth details ================= */
  function rowHtml(nums, teeth, surf) {
    return '<div class="odo-row">' + nums.map(function (n, i) {
      var v = teeth[n] || '', bg = color(v), sp = surf[n] || '';
      return '<button type="button" class="odo-tooth' + (i === 8 ? ' odo-sep' : '') + '" data-t="' + n + '"' +
        (bg ? ' style="background:' + bg + '"' : '') + ' title="' + esc(v) + '">' +
        '<span class="odo-num">' + n + '</span><span class="odo-surf">' + esc(sp) + '</span></button>';
    }).join('') + '</div>';
  }

  SP.addSection(S, (window.ClinicDentalOdo || { wrap: function (x) { return x; } }).wrap({
    id: 'odontogram',
    title: '🦷 خريطة الأسنان وتفاصيل السن (Odontogram / Tooth Details)',
    html: function (v) {
      v = v || {};
      var data = JSON.stringify({ teeth: v.teeth || {}, surfaces: v.surfaces || {}, details: v.details || {} });
      return '<p class="muted">اضغط على السن، ثم سجّل حالته والأسطح والتشخيص.</p>' +
        '<div class="odo-chart" data-saved="' + esc(data) + '">' + rowHtml(UPPER, v.teeth || {}, v.surfaces || {}) + rowHtml(LOWER, v.teeth || {}, v.surfaces || {}) + '</div>' +
        '<div class="odo-picker" hidden>' +
          '<div class="odo-picked">السن: —</div>' +
          '<div class="grid-2">' +
            '<div class="field"><label>حالة السن (Tooth status)</label><select class="odo-status">' + opts(TOOTH_STATUS) + '</select></div>' +
            '<div class="field"><label>الحالة (Condition)</label><select class="odo-cond">' + opts(CONDITIONS) + '</select></div>' +
            '<div class="field odo-surf-field" style="grid-column:1 / -1;"><label>الأسطح (Surfaces)</label><div class="odo-surfaces"></div></div>' +
            '<div class="field"><label>التشخيص (Diagnosis)</label><input class="odo-diag" placeholder="Reversible pulpitis..." /></div>' +
            '<div class="field"><label>ملاحظات السن (Notes)</label><input class="odo-notes" /></div>' +
          '</div>' +
        '</div>' +
        '<div class="odo-summary muted"></div>';
    },
    wire: function (el) {
      var chart = el.querySelector('.odo-chart');
      var st = { teeth: {}, surfaces: {}, details: {} };
      try { st = JSON.parse(chart.getAttribute('data-saved')) || st; } catch (e) {}
      el._odo = st;
      var picker = el.querySelector('.odo-picker'), picked = el.querySelector('.odo-picked');
      var cSel = el.querySelector('.odo-cond'), sSel = el.querySelector('.odo-status');
      var diag = el.querySelector('.odo-diag'), notes = el.querySelector('.odo-notes');
      var surfBox = el.querySelector('.odo-surfaces'), surfField = el.querySelector('.odo-surf-field');
      var summary = el.querySelector('.odo-summary');
      var active = null;

      function paint(b) {
        var t = b.dataset.t, v = st.teeth[t] || '';
        b.style.background = color(v);
        b.title = v;
        b.querySelector('.odo-surf').textContent = st.surfaces[t] || '';
      }
      function refresh() {
        var keys = ALL.filter(function (k) { return st.teeth[k] || st.surfaces[k] || st.details[k]; });
        summary.textContent = keys.length ? keys.map(function (k) {
          var d = st.details[k] || {};
          return k + ': ' + [st.teeth[k], st.surfaces[k], d.diagnosis].filter(Boolean).join(' ');
        }).join('  •  ') : 'لم يتم تسجيل أي سن بعد.';
      }
      function showSurfaces() {
        var t = active && active.dataset.t, c = cond(cSel.value);
        surfField.style.display = c && c.s ? '' : 'none';
        if (!t) return;
        var cur = st.surfaces[t] || '';
        surfBox.innerHTML = surfacesFor(t).map(function (s) {
          return '<label class="odo-sbtn"><input type="checkbox" value="' + s + '"' + (cur.indexOf(s) >= 0 ? ' checked' : '') + ' /> ' + s + ' <small>' + SURF_L[s] + '</small></label>';
        }).join('');
      }
      function save() {
        if (!active) return;
        var t = active.dataset.t, c = cond(cSel.value);
        if (cSel.value) st.teeth[t] = cSel.value; else delete st.teeth[t];
        var s = '';
        if (c && c.s) surfBox.querySelectorAll('input:checked').forEach(function (i) { s += i.value; });
        if (s) st.surfaces[t] = s; else delete st.surfaces[t];
        var d = { status: sSel.value, diagnosis: diag.value.trim(), notes: notes.value.trim() };
        if (d.status || d.diagnosis || d.notes) st.details[t] = d; else delete st.details[t];
        paint(active);
        refresh();
      }
      el.querySelectorAll('.odo-tooth').forEach(function (b) {
        b.addEventListener('click', function () {
          el.querySelectorAll('.odo-tooth').forEach(function (x) { x.classList.remove('active'); });
          b.classList.add('active');
          active = b;
          picker.hidden = false;
          var t = b.dataset.t, d = st.details[t] || {};
          picked.textContent = 'السن: ' + t;
          cSel.value = st.teeth[t] || '';
          sSel.value = d.status || '';
          diag.value = d.diagnosis || '';
          notes.value = d.notes || '';
          showSurfaces();
        });
      });
      cSel.addEventListener('change', function () { showSurfaces(); save(); });
      [sSel, surfBox].forEach(function (x) { x.addEventListener('change', save); });
      [diag, notes].forEach(function (x) { x.addEventListener('input', save); });
      refresh();
    },
    collect: function (el) {
      var st = el._odo || {}, out = {};
      ['teeth', 'surfaces', 'details'].forEach(function (k) { if (st[k] && Object.keys(st[k]).length) out[k] = st[k]; });
      return Object.keys(out).length ? out : null;
    },
    render: function (v) {
      v = v || {};
      var t = v.teeth || {}, s = v.surfaces || {}, d = v.details || {};
      var keys = ALL.filter(function (k) { return t[k] || s[k] || d[k]; });
      Object.keys(t).forEach(function (k) { if (keys.indexOf(k) < 0) keys.push(k); });
      if (!keys.length) return '';
      return SP.tableHtml(['السن', 'الحالة', 'الأسطح', 'حالة السن', 'التشخيص', 'ملاحظات'], keys.map(function (k) {
        var x = d[k] || {};
        return [k, t[k] || '', s[k] || '', x.status || '', x.diagnosis || '', x.notes || ''];
      }));
    }
  }));

  /* ================= generic repeatable cards ================= */
  function fieldInput(f, v) {
    v = v == null ? '' : v;
    var attr = ' class="dx-f" data-k="' + f.k + '"';
    if (f.opts) return '<select' + attr + '>' + opts(f.opts, v) + '</select>';
    if (f.area) return '<textarea' + attr + ' rows="2" placeholder="' + esc(f.ph || '') + '">' + esc(v) + '</textarea>';
    return '<input' + attr + ' type="' + (f.type || 'text') + '"' + (f.ro ? ' readonly tabindex="-1"' : '') + ' value="' + esc(v) + '" placeholder="' + esc(f.ph || '') + '" />';
  }
  function cardHtml(fields, r, label) {
    r = r || {};
    return '<div class="dx-card"><div class="dx-card-head"><span>' + esc(label) + '</span>' +
      '<button type="button" class="btn small danger dx-del">🗑</button></div><div class="dx-grid">' +
      fields.map(function (f) {
        return '<div class="field' + (f.area ? ' dx-wide' : '') + '"><label>' + esc(f.l) + '</label>' + fieldInput(f, r[f.k]) + '</div>';
      }).join('') + '</div></div>';
  }
  function readCard(card, fields) {
    var o = {}, any = false;
    fields.forEach(function (f) {
      if (f.ro) return;
      var i = card.querySelector('.dx-f[data-k="' + f.k + '"]');
      var v = i ? (i.value || '').trim() : '';
      if (v) { o[f.k] = v; if (!f.def || v !== f.def) any = true; }
    });
    return any ? o : null;
  }
  function cardsSection(id, title, hint, fields, label, opt) {
    opt = opt || {};
    return {
      id: id, title: title,
      html: function (v) {
        var rows = (v && v.length) ? v : [null];
        return (hint ? '<p class="muted">' + esc(hint) + '</p>' : '') +
          '<div class="dx-list">' + rows.map(function (r) { return cardHtml(fields, r, label); }).join('') + '</div>' +
          '<button type="button" class="btn ghost small dx-add">+ إضافة</button>' + (opt.extra || '');
      },
      wire: function (el) {
        var list = el.querySelector('.dx-list');
        el.querySelector('.dx-add').addEventListener('click', function () {
          list.insertAdjacentHTML('beforeend', cardHtml(fields, null, label));
          if (opt.onChange) opt.onChange(el);
        });
        list.addEventListener('click', function (e) {
          if (!e.target.classList.contains('dx-del')) return;
          var cards = list.querySelectorAll('.dx-card');
          if (cards.length === 1) cards[0].outerHTML = cardHtml(fields, null, label);
          else e.target.closest('.dx-card').remove();
          if (opt.onChange) opt.onChange(el);
        });
        if (opt.wire) opt.wire(el);
      },
      collect: function (el) {
        var out = [];
        el.querySelectorAll('.dx-list > .dx-card').forEach(function (c) { var o = readCard(c, fields); if (o) out.push(o); });
        return out.length ? out : null;
      },
      render: function (v) {
        if (!v || !v.length) return '';
        var used = fields.filter(function (f) { return !f.ro && v.some(function (r) { return r[f.k]; }); });
        return SP.tableHtml(used.map(function (f) { return f.l; }),
          v.map(function (r) { return used.map(function (f) { return r[f.k] || ''; }); }));
      }
    };
  }

  /* ================= 2) Treatment plan (old id 'plan', old keys kept) ================= */
  var TREATMENTS = ['', 'حشو', 'علاج عصب', 'خلع', 'تنظيف وتلميع', 'تركيبة / تاج', 'جسر', 'زراعة', 'تقويم', 'تبييض', 'علاج لثة', 'أخرى'];
  var STATUSES = [{ v: 'مخطط', l: 'مخطط (Planned)' }, { v: 'قيد التنفيذ', l: 'قيد التنفيذ (In progress)' },
                  { v: 'مكتمل', l: 'مكتمل (Completed)' }, { v: 'ملغي', l: 'ملغي (Cancelled)' }];
  var PLAN_F = [
    { k: 'tooth', l: 'السن (Tooth)', ph: '26' },
    { k: 'surface', l: 'السطح (Surface)', ph: 'MOD' },
    { k: 'treatment', l: 'الإجراء (Procedure)', opts: TREATMENTS },
    { k: 'diagnosis', l: 'التشخيص (Diagnosis)' },
    { k: 'status', l: 'الحالة (Status)', opts: STATUSES, def: 'مخطط' },
    { k: 'price', l: 'السعر (Price)', type: 'number' },
    { k: 'discount', l: 'الخصم (Discount)', type: 'number' },
    { k: 'paid', l: 'المدفوع (Paid)', type: 'number' },
    { k: 'notes', l: 'ملاحظات (Notes)', area: true }
  ];
  SP.addSection(S, cardsSection('plan', '📋 خطة العلاج (Treatment Plan)',
    'كل إجراء في بند منفصل — يمكن إضافة أكثر من إجراء لنفس السن. السعر والمدفوع يظهروا في قسم التكلفة.', PLAN_F, 'بند علاج'));

  /* ================= 3) Costs & payments (computed from plan — no second money store) ================= */
  function payStatus(net, paid) {
    if (net <= 0 && paid <= 0) return '';
    if (paid <= 0) return 'غير مدفوع (Unpaid)';
    if (paid < net) return 'مدفوع جزئياً (Partially paid)';
    return 'مدفوع (Paid)';
  }
  function costsFrom(plan) {
    var items = [], tot = { total: 0, discount: 0, paid: 0, remaining: 0 };
    (plan || []).forEach(function (r) {
      if (r.status === 'ملغي') return;
      var price = num(r.price), disc = num(r.discount), paid = num(r.paid);
      if (!price && !disc && !paid) return;
      var net = price - disc, rem = net - paid;
      items.push([r.treatment || '', r.tooth || '', money(price), money(disc), money(net), money(paid), money(rem), payStatus(net, paid)]);
      tot.total += price; tot.discount += disc; tot.paid += paid; tot.remaining += rem;
    });
    return { items: items, tot: tot };
  }
  function costsHtml(c) {
    if (!c.items.length) return '<p class="muted">لا توجد أسعار بعد — أضف السعر والمدفوع في بنود خطة العلاج.</p>';
    return SP.tableHtml(['الإجراء', 'السن', 'السعر', 'الخصم', 'الصافي (Net)', 'المدفوع', 'المتبقي', 'حالة الدفع'], c.items) +
      '<div class="dx-totals">' +
      '<div><span>إجمالي التكلفة</span><b>' + money(c.tot.total) + '</b></div>' +
      '<div><span>إجمالي الخصم</span><b>' + money(c.tot.discount) + '</b></div>' +
      '<div><span>إجمالي المدفوع</span><b>' + money(c.tot.paid) + '</b></div>' +
      '<div class="dx-rem"><span>إجمالي المتبقي</span><b>' + money(c.tot.remaining) + '</b></div></div>';
  }
  var planSec = null;
  SP.addSection(S, {
    id: 'costs',
    title: '💰 تكلفة العلاج والمدفوعات (Treatment Cost & Payments)',
    html: function () { return '<p class="muted">يُحسب تلقائياً: الصافي = السعر − الخصم، المتبقي = الصافي − المدفوع.</p><div class="dx-costs"></div>'; },
    wire: function (el) {
      var root = rootOf(el);
      var box = el.querySelector('.dx-costs');
      function upd() {
        var p = root.querySelector('.sp-section[data-sid="plan"]');
        el._costs = costsFrom(p && planSec ? planSec.collect(p) : []);
        box.innerHTML = costsHtml(el._costs);
      }
      root.addEventListener('input', function (e) { if (e.target.closest && e.target.closest('.sp-section[data-sid="plan"]')) upd(); });
      root.addEventListener('change', function (e) { if (e.target.closest && e.target.closest('.sp-section[data-sid="plan"]')) upd(); });
      root.addEventListener('click', function (e) { if (e.target.closest && e.target.closest('.sp-section[data-sid="plan"] .dx-del')) setTimeout(upd, 0); });
      upd();
    },
    collect: function (el) {
      var c = el._costs;
      if (!c || !c.items.length) return null;
      return { total: c.tot.total, discount: c.tot.discount, paid: c.tot.paid, remaining: c.tot.remaining };
    },
    render: function (v) {
      if (!v) return '';
      return SP.tableHtml(['إجمالي التكلفة', 'إجمالي الخصم', 'إجمالي المدفوع', 'إجمالي المتبقي'],
        [[money(v.total || 0), money(v.discount || 0), money(v.paid || 0), money(v.remaining || 0)]]);
    }
  });

  /* ================= 4) Periodontal examination ================= */
  var SITES = ['MB', 'B', 'DB', 'ML', 'L', 'DL'];
  var MOB = ['', '0', 'I', 'II', 'III'], FURC = ['', '0', 'I', 'II', 'III'], PQ = ['', 'None', 'Mild', 'Moderate', 'Heavy'];
  function perioGrid() {
    var c = function (cls) { return SITES.map(function (s, i) { return '<td><input class="' + cls + '" data-i="' + i + '" type="number" step="1" /></td>'; }).join(''); };
    return '<div class="dx-scroll"><table class="dx-perio"><thead><tr><th></th>' + SITES.map(function (s) { return '<th>' + s + '</th>'; }).join('') + '</tr></thead><tbody>' +
      '<tr><th>PD (mm)</th>' + c('pp-pd') + '</tr>' +
      '<tr><th>REC (mm)</th>' + c('pp-rec') + '</tr>' +
      '<tr><th>CAL (auto)</th>' + SITES.map(function (s, i) { return '<td><output class="pp-cal" data-i="' + i + '">—</output></td>'; }).join('') + '</tr>' +
      '<tr><th>BOP</th>' + SITES.map(function (s, i) { return '<td><input class="pp-bop" data-i="' + i + '" type="checkbox" /></td>'; }).join('') + '</tr>' +
      '</tbody></table></div>';
  }
  function calOf(pd, rec) { return (pd === '' || pd == null) ? '' : num(pd) + num(rec); }
  SP.addSection(S, {
    id: 'perio',
    title: '🦷 فحص اللثة (Periodontal Examination)',
    html: function (v) {
      v = v || {};
      return '<div class="dx-perio-data" data-saved="' + esc(JSON.stringify(v.teeth || {})) + '"></div>' +
        '<div class="grid-2"><div class="field"><label>اختر السن (Tooth)</label><select class="pp-tooth">' + opts([''].concat(ALL)) + '</select></div></div>' +
        '<div class="pp-edit" hidden>' + perioGrid() +
        '<div class="dx-grid">' +
        '<div class="field"><label>الحركة (Mobility)</label><select class="pp-mob">' + opts(MOB) + '</select></div>' +
        '<div class="field"><label>Furcation</label><select class="pp-furc">' + opts(FURC) + '</select></div>' +
        '<div class="field"><label>البلاك (Plaque)</label><select class="pp-plaque">' + opts(PQ) + '</select></div>' +
        '<div class="field"><label>الجير (Calculus)</label><select class="pp-calc">' + opts(PQ) + '</select></div>' +
        '</div></div>' +
        '<div class="pp-summary"></div>' +
        '<div class="dx-grid">' +
        '<div class="field dx-wide"><label>ملاحظات اللثة (Periodontal notes)</label><textarea class="pp-notes" rows="2">' + esc(v.notes || '') + '</textarea></div>' +
        '<div class="field dx-wide"><label>التشخيص العام (General periodontal diagnosis)</label><textarea class="pp-dx" rows="2">' + esc(v.diagnosis || '') + '</textarea></div>' +
        '<div class="field dx-wide"><label>التوصية العلاجية (Treatment recommendation)</label><textarea class="pp-rec-txt" rows="2">' + esc(v.recommendation || '') + '</textarea></div>' +
        '</div>';
    },
    wire: function (el) {
      var data = {};
      try { data = JSON.parse(el.querySelector('.dx-perio-data').getAttribute('data-saved')) || {}; } catch (e) {}
      el._perio = data;
      var sel = el.querySelector('.pp-tooth'), edit = el.querySelector('.pp-edit'), sum = el.querySelector('.pp-summary');
      var q = function (c) { return Array.prototype.slice.call(el.querySelectorAll(c)); };
      function calc() { q('.pp-cal').forEach(function (o, i) { var c = calOf(q('.pp-pd')[i].value, q('.pp-rec')[i].value); o.textContent = c === '' ? '—' : c; }); }
      function store() {
        var t = sel.value; if (!t) return;
        var r = { pd: q('.pp-pd').map(function (i) { return i.value; }), rec: q('.pp-rec').map(function (i) { return i.value; }),
          bop: q('.pp-bop').map(function (i) { return i.checked ? 1 : 0; }),
          mob: el.querySelector('.pp-mob').value, furc: el.querySelector('.pp-furc').value,
          plaque: el.querySelector('.pp-plaque').value, calc: el.querySelector('.pp-calc').value };
        var any = r.pd.concat(r.rec).some(Boolean) || r.bop.some(Boolean) || r.mob || r.furc || r.plaque || r.calc;
        if (any) data[t] = r; else delete data[t];
        summary();
      }
      function load(t) {
        edit.hidden = !t; if (!t) return;
        var r = data[t] || {};
        q('.pp-pd').forEach(function (i, k) { i.value = (r.pd || [])[k] || ''; });
        q('.pp-rec').forEach(function (i, k) { i.value = (r.rec || [])[k] || ''; });
        q('.pp-bop').forEach(function (i, k) { i.checked = !!(r.bop || [])[k]; });
        el.querySelector('.pp-mob').value = r.mob || ''; el.querySelector('.pp-furc').value = r.furc || '';
        el.querySelector('.pp-plaque').value = r.plaque || ''; el.querySelector('.pp-calc').value = r.calc || '';
        calc();
      }
      function summary() {
        var keys = ALL.filter(function (k) { return data[k]; });
        sum.innerHTML = keys.length ? '<p class="muted">الأسنان المسجلة (اضغط للتعديل):</p><div class="pp-chips">' + keys.map(function (k) {
          var r = data[k], mx = Math.max.apply(null, (r.pd || []).map(num).concat([0]));
          return '<button type="button" class="pp-chip' + (mx >= 5 ? ' deep' : '') + '" data-t="' + k + '">' + k + (mx ? ' · PD ' + mx : '') + ((r.bop || []).some(Boolean) ? ' · BOP' : '') + '</button>';
        }).join('') + '</div>' : '<p class="muted">لم تُسجل قياسات لثة بعد.</p>';
      }
      sel.addEventListener('change', function () { load(sel.value); });
      edit.addEventListener('input', function () { calc(); store(); });
      edit.addEventListener('change', function () { calc(); store(); });
      sum.addEventListener('click', function (e) { var b = e.target.closest('.pp-chip'); if (b) { sel.value = b.dataset.t; load(b.dataset.t); } });
      summary();
    },
    collect: function (el) {
      var out = {}, d = el._perio || {};
      if (Object.keys(d).length) out.teeth = d;
      [['notes', '.pp-notes'], ['diagnosis', '.pp-dx'], ['recommendation', '.pp-rec-txt']].forEach(function (p) {
        var v = (el.querySelector(p[1]).value || '').trim(); if (v) out[p[0]] = v;
      });
      return Object.keys(out).length ? out : null;
    },
    render: function (v) {
      if (!v) return '';
      var t = v.teeth || {}, keys = ALL.filter(function (k) { return t[k]; });
      var j = function (a) { return (a || []).map(function (x) { return x === '' || x == null ? '-' : x; }).join('/'); };
      var h = keys.length ? SP.tableHtml(['السن', 'PD (MB/B/DB/ML/L/DL)', 'REC', 'CAL', 'BOP', 'Mob', 'Furc', 'Plaque', 'Calculus'], keys.map(function (k) {
        var r = t[k];
        return [k, j(r.pd), j(r.rec), j((r.pd || []).map(function (p, i) { return calOf(p, (r.rec || [])[i]); })),
          (r.bop || []).map(function (b, i) { return b ? SITES[i] : ''; }).filter(Boolean).join(','), r.mob || '', r.furc || '', r.plaque || '', r.calc || ''];
      })) : '';
      var rows = [['ملاحظات', v.notes], ['التشخيص', v.diagnosis], ['التوصية', v.recommendation]].filter(function (r) { return r[1]; });
      return h + (rows.length ? SP.tableHtml(['', ''], rows) : '');
    }
  });

  /* ================= 5–9) clinical cards ================= */
  var YN = ['', 'نعم (Yes)', 'لا (No)'];
  SP.addSection(S, cardsSection('endo', '🦷 علاج العصب (Endodontic / Root Canal)', '', [
    { k: 'tooth', l: 'السن', ph: '36' }, { k: 'diagnosis', l: 'التشخيص (Diagnosis)', opts: ['', 'Reversible pulpitis', 'Irreversible pulpitis', 'Pulp necrosis', 'Apical periodontitis', 'Apical abscess', 'Previously treated', 'Other'] },
    { k: 'canals', l: 'عدد القنوات', type: 'number' }, { k: 'canalNames', l: 'أسماء القنوات', ph: 'MB, ML, D' },
    { k: 'workingLength', l: 'طول العمل (Working length)', ph: 'MB 21 / D 22 mm' }, { k: 'instrumentation', l: 'التحضير (Instrumentation)' },
    { k: 'irrigation', l: 'الغسيل (Irrigation)', ph: 'NaOCl 2.5%' }, { k: 'obturation', l: 'الحشو (Obturation)' },
    { k: 'tempFilling', l: 'حشو مؤقت' }, { k: 'finalRestoration', l: 'حشو نهائي' },
    { k: 'periapical', l: 'أشعة صغيرة (Periapical)', ph: 'وصف ظهر الأشعة المحيطة بالذروة' },
    { k: 'followUp', l: 'المتابعة', type: 'date' }, { k: 'notes', l: 'ملاحظات', area: true }], 'علاج عصب'));

  SP.addSection(S, cardsSection('crownsBridges', '👑 التيجان والجسور (Crown / Bridge)', 'للجسر اكتب كل الأسنان المشمولة مفصولة بفاصلة (مثلاً 14,15,16).', [
    { k: 'teeth', l: 'السن / الأسنان', ph: '14,15,16' }, { k: 'type', l: 'النوع (Type)', opts: ['', 'Crown', 'Bridge', 'Veneer', 'Inlay', 'Onlay', 'Post & core'] },
    { k: 'material', l: 'الخامة (Material)', opts: ['', 'Zirconia', 'E-max', 'PFM', 'Full metal', 'Composite', 'Other'] }, { k: 'shade', l: 'اللون (Shade)', ph: 'A2' },
    { k: 'prepDate', l: 'تاريخ التحضير', type: 'date' }, { k: 'impressionDate', l: 'تاريخ الطبعة', type: 'date' },
    { k: 'temporary', l: 'تاج مؤقت', opts: YN }, { k: 'insertionDate', l: 'التركيب النهائي', type: 'date' },
    { k: 'lab', l: 'المعمل (Laboratory)' }, { k: 'notes', l: 'ملاحظات', area: true }], 'تاج / جسر'));

  SP.addSection(S, cardsSection('implants', '🦿 الزراعة (Implant)', '', [
    { k: 'site', l: 'السن / الموقع', ph: '46' }, { k: 'brand', l: 'الشركة (Brand)' }, { k: 'size', l: 'المقاس (Size)' },
    { k: 'diameter', l: 'القطر (mm)', ph: '4.0' }, { k: 'length', l: 'الطول (mm)', ph: '10' },
    { k: 'placementDate', l: 'تاريخ الزرع', type: 'date' }, { k: 'boneGraft', l: 'ترقيع عظم (Bone graft)', opts: YN },
    { k: 'cbct', l: 'أشعة مقطعية مخروطية (Cone-beam CT)', ph: 'نتائج / رابط CBCT' },
    { k: 'healing', l: 'حالة الالتئام', opts: ['', 'Healing', 'Osseointegrated', 'Failed', 'Other'] },
    { k: 'abutment', l: 'الدعامة (Abutment)' }, { k: 'crown', l: 'التاج (Crown)' }, { k: 'notes', l: 'ملاحظات', area: true }], 'زراعة'));

  SP.addSection(S, cardsSection('anesthesia', '💉 التخدير (Anesthesia)', '', [
    { k: 'used', l: 'تخدير موضعي؟', opts: YN }, { k: 'type', l: 'النوع (Type)', opts: ['', 'Lidocaine 2% + Epinephrine', 'Articaine 4%', 'Mepivacaine 3%', 'Topical', 'Other'] },
    { k: 'site', l: 'المكان (Site)' }, { k: 'amount', l: 'الكمية / الأمبولات', ph: '1.5' },
    { k: 'technique', l: 'الطريقة', opts: ['', 'Infiltration', 'IANB', 'PSA', 'Intraligamentary', 'Palatal', 'Other'] }, { k: 'notes', l: 'ملاحظات', area: true }], 'تخدير'));

  SP.addSection(S, cardsSection('procedures', '📋 ملاحظات الإجراءات (Procedure Notes)', 'كل إجراء يتم في الزيارة — يبقى في سجل المريض.', [
    { k: 'date', l: 'التاريخ', type: 'date' }, { k: 'tooth', l: 'السن' }, { k: 'procedure', l: 'الإجراء (Procedure)' },
    { k: 'anesthesia', l: 'التخدير' }, { k: 'materials', l: 'الخامات (Materials)' }, { k: 'followUp', l: 'موعد المتابعة', type: 'date' },
    { k: 'findings', l: 'الملاحظات (Findings)', area: true }, { k: 'details', l: 'تفاصيل الإجراء', area: true },
    { k: 'complications', l: 'المضاعفات', area: true }, { k: 'instructions', l: 'تعليمات بعد الإجراء', area: true }], 'إجراء'));

  /* ================= 10) Attachments (old id 'files' + existing Storage) ================= */
  var CATS = ['', 'X-ray', 'Intraoral photo', 'Extraoral photo', 'Before treatment', 'After treatment', 'Periodontal chart', 'Implant', 'Endodontic', 'Crown/Bridge', 'Other'];
  var baseFiles = SP.filesSection({ id: 'files', title: '📎 مرفقات الأسنان', hint: 'أشعة، صور الأسنان، صور قبل/بعد.', folder: 'dental' });
  SP.addSection(S, {
    id: 'files', title: '📎 مرفقات الأسنان (Dental Attachments)',
    html: function (v) {
      return '<p class="muted">اختر بيانات الملف (اختياري) قبل الرفع — تُحفظ مع الملف.</p><div class="dx-grid">' +
        '<div class="field"><label>النوع (Category)</label><select class="fa-cat">' + opts(CATS) + '</select></div>' +
        '<div class="field"><label>السن</label><input class="fa-tooth" placeholder="26" /></div>' +
        '<div class="field"><label>الإجراء</label><input class="fa-proc" /></div>' +
        '<div class="field"><label>التاريخ</label><input class="fa-date" type="date" /></div></div>' + baseFiles.html(v);
    },
    wire: function (el) {
      baseFiles.wire(el);
      var list = el.querySelector('.sp-file-list');
      (el._files || []).forEach(function (f) { if (f) f._old = 1; });
      function decorate() {
        (el._files || []).forEach(function (f) {
          if (!f || f._old || f._tagged) return;
          f._tagged = 1;
          var m = { category: el.querySelector('.fa-cat').value, tooth: el.querySelector('.fa-tooth').value.trim(),
            procedure: el.querySelector('.fa-proc').value.trim(), date: el.querySelector('.fa-date').value };
          Object.keys(m).forEach(function (k) { if (m[k]) f[k] = m[k]; });
        });
        list.querySelectorAll('.sp-file-row').forEach(function (row, i) {
          var f = el._files[i];
          if (!f || row.querySelector('.oph-tag')) return;
          var t = [f.category, f.tooth && ('🦷 ' + f.tooth), f.procedure, f.date].filter(Boolean).join(' · ');
          if (t) row.insertAdjacentHTML('afterbegin', '<span class="oph-tag">' + esc(t) + '</span>');
        });
      }
      new MutationObserver(decorate).observe(list, { childList: true });
      decorate();
    },
    collect: function (el) {
      var f = el._files || [];
      return f.length ? f.map(function (x) { var o = {}; Object.keys(x).forEach(function (k) { if (k.charAt(0) !== '_') o[k] = x[k]; }); return o; }) : null;
    },
    render: function (v) {
      if (!v || !v.length) return '';
      return '<ul class="sp-files-view">' + v.map(function (f) {
        var t = [f.category, f.tooth && ('🦷 ' + f.tooth), f.procedure, f.date].filter(Boolean).join(' · ');
        return '<li>' + (t ? '<b>' + esc(t) + ':</b> ' : '') + '<a href="' + esc(f.url) + '" target="_blank" rel="noopener">' + esc(f.name) + '</a></li>';
      }).join('') + '</ul>';
    }
  });

  /* ================= 11) Diagnosis & notes (visit diagnosis stays in the main field) ================= */
  var DX_F = [{ k: 'tooth', l: 'السن' }, { k: 'procedure', l: 'الإجراء المرتبط' }, { k: 'diagnosis', l: 'التشخيص', area: true }];
  var dxCards = cardsSection('diagnosis', '📝 التشخيص والملاحظات (Diagnosis & Notes)',
    'تشخيص مرتبط بسن أو إجراء. التشخيص العام للزيارة يُكتب في خانة «التشخيص» الأساسية.', DX_F, 'تشخيص',
    { extra: '<div class="field" style="margin-top:8px"><label>ملاحظات عامة (Notes)</label><textarea class="dx-notes" rows="2"></textarea></div>' });
  var dxSec = {
    id: 'diagnosis', title: dxCards.title,
    html: function (v) {
      v = v || {};
      return dxCards.html(v.rows).replace('<textarea class="dx-notes" rows="2"></textarea>', '<textarea class="dx-notes" rows="2">' + esc(v.notes || '') + '</textarea>');
    },
    wire: dxCards.wire,
    collect: function (el) {
      var rows = dxCards.collect(el), n = (el.querySelector('.dx-notes').value || '').trim(), o = {};
      if (rows) o.rows = rows; if (n) o.notes = n;
      return Object.keys(o).length ? o : null;
    },
    render: function (v) {
      if (!v) return '';
      return dxCards.render(v.rows) + (v.notes ? '<p>' + esc(v.notes) + '</p>' : '');
    }
  };
  SP.addSection(S, dxSec);

  // the costs section reads plan rows through the plan section's own collect
  planSec = cardsSection('plan', '', '', PLAN_F, '');

  /* ================= collapsible groups (UI only — never touches values) ================= */
  var GROUPS = [
    ['d-odo', '🦷 خريطة الأسنان وتفاصيل السن — Odontogram / Tooth Details', ['odontogram']],
    ['d-perio', '🦷 فحص اللثة — Periodontal Examination', ['perio']],
    ['d-plan', '🩺 خطة العلاج — Treatment Plan', ['plan']],
    ['d-cost', '💰 التكلفة والمدفوعات — Treatment Cost & Payments', ['costs']],
    ['d-endo', '🦷 علاج العصب — Endodontic / Root Canal', ['endo']],
    ['d-crown', '👑 التيجان والجسور — Crown / Bridge', ['crownsBridges']],
    ['d-imp', '🦿 الزراعة — Implant', ['implants']],
    ['d-anes', '💉 التخدير — Anesthesia', ['anesthesia']],
    ['d-proc', '📋 ملاحظات الإجراءات — Procedure Notes', ['procedures']],
    ['d-att', '📎 مرفقات الأسنان — Dental Attachments', ['files']],
    ['d-dx', '📝 التشخيص والملاحظات — Diagnosis & Notes', ['diagnosis']]
  ];
  function refreshDots(box) {
    var saved = {};
    try { var r = SP.collect(box.parentNode, S); saved = (r && r.sections) || {}; } catch (e) {}
    box.querySelectorAll('.oph-group').forEach(function (g) {
      var ids = (g.dataset.ids || '').split(',');
      g.classList.toggle('has-data', ids.some(function (id) { return id && id !== 'costs' && saved[id]; }) || (ids[0] === 'costs' && !!saved.costs));
    });
  }
  function buildGroups(anchor) {
    var root = anchor.parentNode;
    if (!root || root.querySelector('.oph-groups')) return;
    var box = document.createElement('div');
    box.className = 'oph-groups dental-groups';
    box.innerHTML = '<div class="oph-groups-bar"><button type="button" data-oph-all="1">فتح الكل</button><span>|</span><button type="button" data-oph-all="0">إغلاق الكل</button></div>';
    root.insertBefore(box, root.querySelector('.sp-section'));
    GROUPS.forEach(function (gd) {
      var secs = gd[2].map(function (id) { return root.querySelector('.sp-section[data-sid="' + id + '"]'); }).filter(Boolean);
      if (!secs.length) return;
      var g = document.createElement('div');
      g.className = 'oph-group';
      g.dataset.ids = gd[2].join(',');
      g.innerHTML = '<button type="button" class="oph-group-head" aria-expanded="false"><span class="oph-pm">+</span><span class="oph-gt">' + gd[1] + '</span><span class="oph-dot" title="يحتوي على بيانات">●</span></button><div class="oph-group-body"><div class="oph-group-inner"></div></div>';
      var inner = g.querySelector('.oph-group-inner');
      secs.forEach(function (s) { inner.appendChild(s); });
      box.appendChild(g);
    });
    refreshDots(box);
    box.addEventListener('input', function () { refreshDots(box); });
    box.addEventListener('change', function () { refreshDots(box); setTimeout(function () { refreshDots(box); }, 800); });
    box.addEventListener('click', function () { setTimeout(function () { refreshDots(box); }, 50); });
  }
  if (!window.__clinicAccordion) {
    window.__clinicAccordion = true;
    var setOpen = function (g, open) {
      g.classList.toggle('open', open);
      var h = g.querySelector('.oph-group-head');
      h.setAttribute('aria-expanded', open ? 'true' : 'false');
      h.querySelector('.oph-pm').textContent = open ? '−' : '+';
    };
    document.addEventListener('click', function (e) {
      if (!e.target.closest) return;
      var h = e.target.closest('.oph-group-head');
      if (h) { e.preventDefault(); var g = h.parentNode; setOpen(g, !g.classList.contains('open')); return; }
      var a = e.target.closest('[data-oph-all]');
      if (a) { e.preventDefault(); a.closest('.oph-groups').querySelectorAll('.oph-group').forEach(function (g) { setOpen(g, a.dataset.ophAll === '1'); }); }
    });
  }
  var oldWire = dxSec.wire;
  dxSec.wire = function (el) {
    if (typeof oldWire === 'function') oldWire.apply(this, arguments);
    try { buildGroups(el); } catch (err) { console.warn(err); }
  };
})();
} catch (e) { console.error('[specialties-bundle] dental.js failed:', e); }
/* ==== END dental.js ==== */

/* ==== BEGIN dental-plus.js ==== */
try {
// ============ DENTAL PLUS (v64) — أقسام الأسنان التخصصية ============
// Additive module loaded AFTER dental.js. Nothing old changes: odontogram, plan, costs, files …
// keep their ids and keys. New sections save inside the same visit (exam.sections) with new keys:
//
//  جراحة الفم والفكين   dsSurgPre (preoperative) · dsSurgProc [cards] · dsSurgPost [cards]
//  تجميل الأسنان        dsCosAssess · dsCosTeeth [cards] · dsCosPhotos [files, Storage] · dsCosPlan
//  تقويم الأسنان        dsOrthoAssess · dsOrthoRecords [files + manual ceph] · dsOrthoPlan
//                       dsOrthoProgress [cards] · timeline (read-only, built from recorded dates)
//
// Tooth numbers use the existing odontogram keys (FDI 11–48 / 51–85). The «🦷 من الخريطة» button
// copies the tooth/surface currently selected on the odontogram. Nothing is auto-completed:
// every procedure starts as «مخطط» and only the doctor changes it.

(function () {
  var SP = window.ClinicSpecialty;
  if (!SP) return;
  var CC = window.ClinicCare;
  var esc = SP.escape;
  var S = 'dental';

  function gv(o, k) { return k.split('.').reduce(function (a, p) { return a == null ? undefined : a[p]; }, o); }
  function sv(o, k, x) { var ps = k.split('.'), c = o; for (var i = 0; i < ps.length - 1; i++) c = c[ps[i]] || (c[ps[i]] = {}); c[ps[ps.length - 1]] = x; }
  function prevVisits() { try { var p = CC && CC.getPatient && CC.getPatient(); return p && CC.visitsFor ? CC.visitsFor(p) : []; } catch (e) { return []; } }
  function opts(list, val) {
    return list.map(function (o) {
      return '<option value="' + esc(o) + '"' + (String(o) === String(val == null ? '' : val) ? ' selected' : '') + '>' + (o === '' ? '—' : esc(o)) + '</option>';
    }).join('');
  }
  var YN = ['', 'لا', 'نعم'];
  var STATUS = ['مخطط (Planned)', 'قيد التنفيذ (In progress)', 'مكتمل (Completed)', 'ملغي (Cancelled)'];
  var CONSENT = ['', 'لم يُناقش بعد', 'تمت المناقشة', 'موافقة شفهية', 'موافقة كتابية موقعة', 'رفض المريض'];

  /* ---------- field specs: [key, label, type, options]  s select · t text · n number · d date · a textarea · c checkboxes ---------- */
  function fieldHtml(f, v, cls) {
    var k = f[0], x = gv(v || {}, k), t = f[2], wide = t === 'a' || t === 'c';
    var inp;
    if (t === 's') inp = '<select class="' + cls + '" data-k="' + k + '">' + opts(f[3], x) + '</select>';
    else if (t === 'c') inp = '<div class="' + cls + '-c dp-checks" data-k="' + k + '">' + f[3].map(function (o) {
      return '<label class="ort-chip"><input type="checkbox" value="' + esc(o) + '"' + ((x || []).indexOf(o) >= 0 ? ' checked' : '') + ' /> ' + esc(o) + '</label>';
    }).join('') + '</div>';
    else if (t === 'a') inp = '<textarea class="' + cls + '" data-k="' + k + '" rows="2">' + esc(x || '') + '</textarea>';
    else inp = '<input class="' + cls + '" data-k="' + k + '" type="' + (t === 'n' ? 'number' : t === 'd' ? 'date' : 'text') + '"' + (t === 'n' ? ' step="any" inputmode="decimal"' : '') + ' value="' + esc(x == null ? '' : x) + '"' + (f[3] && t !== 's' ? ' placeholder="' + esc(f[3]) + '"' : '') + ' />';
    return '<div class="field"' + (wide ? ' style="grid-column:1 / -1;"' : '') + '><label>' + esc(f[1]) + '</label>' + inp + '</div>';
  }
  function readFields(scope, cls) {
    var out = {}, any = false;
    scope.querySelectorAll('.' + cls).forEach(function (i) {
      if (i.closest('.dp-card') && !scope.classList.contains('dp-card')) return;
      var x = (i.value || '').trim(); if (x !== '') { sv(out, i.dataset.k, x); any = true; }
    });
    scope.querySelectorAll('.' + cls + '-c').forEach(function (c) {
      if (c.closest('.dp-card') && !scope.classList.contains('dp-card')) return;
      var a = Array.prototype.map.call(c.querySelectorAll('input:checked'), function (i) { return i.value; });
      if (a.length) { sv(out, c.dataset.k, a); any = true; }
    });
    return any ? out : null;
  }
  function renderRows(fields, v) {
    var rows = [];
    fields.forEach(function (f) {
      var x = gv(v, f[0]);
      if (x == null || x === '' || (Array.isArray(x) && !x.length)) return;
      rows.push([f[1], Array.isArray(x) ? x.join('، ') : x]);
    });
    return rows;
  }

  /* ---------- 1) structured form section (groups of fields) ---------- */
  function formSection(cfg) {
    var all = [];
    cfg.groups.forEach(function (g) { all = all.concat(g.f); });
    return {
      id: cfg.id, title: cfg.title,
      html: function (v) {
        return (cfg.hint ? '<p class="muted">' + esc(cfg.hint) + '</p>' : '') + cfg.groups.map(function (g) {
          return (g.t ? '<h4 class="dp-sub">' + esc(g.t) + '</h4>' : '') + '<div class="grid-2">' + g.f.map(function (f) { return fieldHtml(f, v, 'dpf'); }).join('') + '</div>';
        }).join('') + (cfg.extraHtml ? cfg.extraHtml(v) : '');
      },
      wire: function (el) { if (cfg.wire) cfg.wire(el); },
      collect: function (el) {
        var o = readFields(el, 'dpf');
        if (cfg.extraCollect) o = cfg.extraCollect(el, o || {}) || o;
        return o && Object.keys(o).length ? o : null;
      },
      render: function (v) {
        if (!v) return '';
        var rows = renderRows(all, v);
        return (rows.length ? SP.tableHtml(['البند', 'القيمة'], rows) : '') + (cfg.extraRender ? cfg.extraRender(v) : '');
      }
    };
  }

  /* ---------- 2) repeatable cards section (planned vs completed kept apart) ---------- */
  function cardHtml(fields, r, label, toothBtn) {
    return '<div class="dp-card"><div class="dp-card-h"><b>' + esc(label) + '</b>' +
      (toothBtn ? '<button type="button" class="btn ghost small dp-from-chart" title="انسخ السن المختار في خريطة الأسنان">🦷 من الخريطة</button>' : '') +
      '<button type="button" class="btn small danger dp-del" title="حذف">🗑</button></div>' +
      '<div class="grid-2">' + fields.map(function (f) { return fieldHtml(f, r || {}, 'dpc'); }).join('') + '</div></div>';
  }
  function cardsSection(cfg) {
    return {
      id: cfg.id, title: cfg.title,
      html: function (v) {
        var rows = v && v.length ? v : [cfg.blank ? cfg.blank() : null];
        return (cfg.hint ? '<p class="muted">' + esc(cfg.hint) + '</p>' : '') +
          '<div class="dp-list">' + rows.map(function (r) { return cardHtml(cfg.fields, r, cfg.label, cfg.tooth); }).join('') + '</div>' +
          '<button type="button" class="btn ghost small dp-add">+ إضافة ' + esc(cfg.label) + '</button>' +
          '<div class="dp-split"></div>' + (cfg.history ? '<div class="dp-history"></div>' : '');
      },
      wire: function (el) {
        var list = el.querySelector('.dp-list');
        function refresh() {
          var box = el.querySelector('.dp-split'), rows = collect(el) || [];
          if (cfg.statusKey) {
            var planned = rows.filter(function (r) { return !/^مكتمل|^ملغي/.test(r[cfg.statusKey] || ''); });
            var done = rows.filter(function (r) { return /^مكتمل/.test(r[cfg.statusKey] || ''); });
            box.innerHTML = rows.length ? '<div class="dp-two"><div class="dp-col dp-planned"><b>🗓 مخطط / قيد التنفيذ (' + planned.length + ')</b>' + miniList(planned) + '</div>' +
              '<div class="dp-col dp-done"><b>✅ مكتمل (' + done.length + ')</b>' + miniList(done) + '</div></div>' : '';
          }
        }
        function miniList(rs) {
          return rs.length ? '<ul>' + rs.map(function (r) { return '<li>' + esc(cfg.line(r)) + '</li>'; }).join('') + '</ul>' : '<p class="muted">—</p>';
        }
        el.querySelector('.dp-add').addEventListener('click', function () {
          list.insertAdjacentHTML('beforeend', cardHtml(cfg.fields, cfg.blank ? cfg.blank() : null, cfg.label, cfg.tooth)); refresh();
        });
        list.addEventListener('click', function (e) {
          var t = e.target;
          if (t.classList.contains('dp-del')) {
            var cards = list.querySelectorAll('.dp-card');
            if (cards.length === 1) cards[0].outerHTML = cardHtml(cfg.fields, cfg.blank ? cfg.blank() : null, cfg.label, cfg.tooth);
            else t.closest('.dp-card').remove();
            refresh();
          } else if (t.classList.contains('dp-from-chart')) {
            var card = t.closest('.dp-card'), sel = lastTooth(el);
            if (!sel.t) { flash(t, 'اختر سناً من خريطة الأسنان أولاً'); return; }
            var ti = card.querySelector('.dpc[data-k="tooth"]'), si = card.querySelector('.dpc[data-k="surf"]');
            if (ti) ti.value = ti.value && ti.value.split(/[ ,،]+/).indexOf(sel.t) < 0 && cfg.multiTooth ? ti.value + ', ' + sel.t : sel.t;
            if (si && sel.s) si.value = sel.s;
            refresh();
          }
        });
        el.addEventListener('change', refresh);
        el.addEventListener('input', refresh);
        if (cfg.history) {
          var h = [];
          prevVisits().forEach(function (vis) {
            var s = vis && vis.exam && vis.exam.sections && vis.exam.sections[cfg.id];
            (s || []).forEach(function (r) { h.push([vis.date || '—'].concat(cfg.history.cols.map(function (k) { return r[k] || '—'; }))); });
          });
          if (h.length) el.querySelector('.dp-history').innerHTML = '<p><b>📜 ' + esc(cfg.history.title) + ' (للمقارنة — قراءة فقط)</b></p>' +
            SP.tableHtml(['تاريخ الزيارة'].concat(cfg.history.heads), h);
        }
        refresh();
      },
      collect: collect,
      render: function (v) {
        if (!v || !v.length) return '';
        var used = cfg.fields.filter(function (f) { return v.some(function (r) { return r[f[0]]; }); });
        return SP.tableHtml(used.map(function (f) { return f[1]; }), v.map(function (r) { return used.map(function (f) { return r[f[0]] || ''; }); }));
      }
    };
    function collect(el) {
      var out = [];
      el.querySelectorAll('.dp-list > .dp-card').forEach(function (c) {
        var o = readFields(c, 'dpc');
        if (!o) return;
        var meaningful = Object.keys(o).some(function (k) { return k !== cfg.statusKey && (!cfg.ignore || cfg.ignore.indexOf(k) < 0); });
        if (meaningful) out.push(o);
      });
      return out.length ? out : null;
    }
  }
  function flash(btn, msg) { var o = btn.textContent; btn.textContent = msg; setTimeout(function () { btn.textContent = o; }, 1800); }

  /* ---------- tooth picked on the existing odontogram ---------- */
  document.addEventListener('click', function (e) {
    var t = e.target.closest && e.target.closest('.sp-section[data-sid="odontogram"] [data-t]');
    if (!t) return;
    var form = t.closest('.sp-section').parentNode;
    while (form && form.parentNode && !(form.querySelector && form.querySelector('.sp-section[data-sid="dsSurgProc"]'))) form = form.parentNode;
    if (!form) return;
    form.dataset.dpTooth = t.getAttribute('data-t');
    form.dataset.dpSurf = t.getAttribute('data-s') || '';
  }, true);
  function lastTooth(el) {
    var f = el;
    while (f && !(f.dataset && f.dataset.dpTooth)) f = f.parentNode;
    return f ? { t: f.dataset.dpTooth, s: f.dataset.dpSurf } : {};
  }

  /* ---------- tagged photo/imaging section (reuses the existing upload + Storage) ---------- */
  function photoSection(cfg) {
    var base = SP.filesSection({ id: cfg.id, title: cfg.title, hint: cfg.hint, folder: 'dental' });
    return {
      id: cfg.id, title: cfg.title,
      html: function (v) {
        return '<div class="grid-2">' + cfg.tags.map(function (f) { return fieldHtml(f, {}, 'dp-tag'); }).join('') + '</div>' +
          '<p class="muted">اختر بيانات الصورة قبل الرفع — تُحفظ معها. الصور القديمة لا تُستبدل أبداً؛ كل صورة جديدة تُضاف.</p>' + base.html(v) +
          '<div class="dp-compare"><h4 class="dp-sub">↔ مقارنة جنباً إلى جنب (Side-by-side)</h4><div class="grid-2">' +
          '<div class="field"><label>الصورة الأولى</label><select class="dp-cmp-a"></select></div>' +
          '<div class="field"><label>الصورة الثانية</label><select class="dp-cmp-b"></select></div></div><div class="dp-cmp-view"></div></div>';
      },
      wire: function (el) {
        base.wire(el);
        var list = el.querySelector('.sp-file-list');
        (el._files || []).forEach(function (f) { if (f) f._old = 1; });
        var older = [];
        prevVisits().forEach(function (vis) {
          var s = vis && vis.exam && vis.exam.sections && vis.exam.sections[cfg.id];
          (s || []).forEach(function (f) { if (f && f.url) older.push({ f: f, d: vis.date }); });
        });
        function tagText(f) { return cfg.tags.map(function (t) { return f[t[0]]; }).filter(Boolean).join(' · '); }
        function fillCompare() {
          var pool = older.map(function (x) { return { f: x.f, lab: (x.d || '') + ' — ' + (tagText(x.f) || x.f.name) }; })
            .concat((el._files || []).map(function (f) { return { f: f, lab: 'هذه الزيارة — ' + (tagText(f) || f.name) }; }))
            .filter(function (x) { return /\.(jpe?g|png|gif|webp|heic)(\?|$)/i.test(x.f.name || '') || /^image\//.test(x.f.type || x.f.contentType || '') || !/\.pdf/i.test(x.f.name || ''); });
          ['a', 'b'].forEach(function (k, i) {
            var s = el.querySelector('.dp-cmp-' + k), cur = s.value;
            s.innerHTML = '<option value="">—</option>' + pool.map(function (x, j) { return '<option value="' + esc(x.f.url) + '">' + esc(x.lab) + '</option>'; }).join('');
            if (cur) s.value = cur; else if (pool.length > 1) s.value = pool[i === 0 ? 0 : pool.length - 1].f.url;
          });
          showCompare();
        }
        function showCompare() {
          var a = el.querySelector('.dp-cmp-a'), b = el.querySelector('.dp-cmp-b');
          el.querySelector('.dp-cmp-view').innerHTML = [a, b].map(function (s) {
            if (!s.value) return '<div class="dp-cmp-cell muted">—</div>';
            return '<figure class="dp-cmp-cell"><img src="' + esc(s.value) + '" alt="" loading="lazy" /><figcaption>' + esc(s.options[s.selectedIndex].text) + '</figcaption></figure>';
          }).join('');
        }
        function decorate() {
          (el._files || []).forEach(function (f) {
            if (!f || f._old || f._tagged) return;
            f._tagged = 1;
            el.querySelectorAll('.dp-tag').forEach(function (i) { if (i.value.trim()) f[i.dataset.k] = i.value.trim(); });
          });
          list.querySelectorAll('.sp-file-row').forEach(function (row, i) {
            var f = el._files[i];
            if (!f || row.querySelector('.oph-tag')) return;
            var t = tagText(f);
            if (t) row.insertAdjacentHTML('afterbegin', '<span class="oph-tag">' + esc(t) + '</span>');
          });
          fillCompare();
        }
        el.querySelector('.dp-cmp-a').addEventListener('change', showCompare);
        el.querySelector('.dp-cmp-b').addEventListener('change', showCompare);
        new MutationObserver(decorate).observe(list, { childList: true });
        decorate();
      },
      collect: function (el) {
        var f = el._files || [];
        return f.length ? f.map(function (x) { var o = {}; Object.keys(x).forEach(function (k) { if (k.charAt(0) !== '_') o[k] = x[k]; }); return o; }) : null;
      },
      render: function (v) {
        if (!v || !v.length) return '';
        return '<ul class="sp-files-view">' + v.map(function (f) {
          var t = cfg.tags.map(function (x) { return f[x[0]]; }).filter(Boolean).join(' · ');
          return '<li>' + (t ? '<b>' + esc(t) + ':</b> ' : '') + '<a href="' + esc(f.url) + '" target="_blank" rel="noopener">' + esc(f.name) + '</a></li>';
        }).join('') + '</ul>';
      }
    };
  }

  /* =====================================================================
     A) ORAL & MAXILLOFACIAL SURGERY — جراحة الفم والفكين
     ===================================================================== */
  SP.addSection(S, formSection({
    id: 'dsSurgPre', title: '🩺 التقييم قبل الجراحة (Preoperative Assessment)',
    hint: 'التاريخ المرضي العام والحساسية المسجلة في ملف المريض لا تُكرر هنا — سجّل فقط ما يخص هذه الجراحة.',
    groups: [
      { t: 'الشكوى والتاريخ', f: [['complaint', 'الشكوى الرئيسية (Chief complaint)', 't'], ['hpc', 'تاريخ الحالة الحالية (HPC)', 'a'],
        ['surgHx', 'تاريخ جراحي ذو صلة (Relevant surgical history)', 'a'], ['meds', 'أدوية ذات صلة بالجراحة (Anticoagulants, bisphosphonates…)', 't'],
        ['allergyCheck', 'تمت مراجعة الحساسية (Allergies reviewed)', 's', YN]] },
      { t: 'مخاطر النزيف والتخدير', f: [['bleed', 'تاريخ نزيف / سيولة (Bleeding history)', 's', ['', 'لا يوجد', 'نزيف مطوّل سابق', 'يتناول مضاد تجلط', 'اضطراب تجلط معروف']],
        ['inr', 'INR / تحاليل التجلط', 't', '1.1'], ['asa', 'تصنيف ASA', 's', ['', 'ASA I', 'ASA II', 'ASA III', 'ASA IV']],
        ['anesRisk', 'مخاطر التخدير (Anesthesia risks)', 't']] },
      { t: 'الفحص والتشخيص', f: [['site', 'الموقع التشريحي (Anatomical site)', 's', ['', 'سن / أسنان', 'الفك العلوي (Maxilla)', 'الفك السفلي (Mandible)', 'الجيب الفكي (Maxillary sinus)', 'قاع الفم (Floor of mouth)', 'اللسان (Tongue)', 'الحنك (Palate)', 'الشفة / الخد (Lip / Cheek)', 'المفصل الصدغي الفكي (TMJ)', 'أخرى']],
        ['siteDetail', 'تفاصيل الموقع / السن', 't', '38 / left mandibular body'],
        ['extraoral', 'الفحص خارج الفم (Extraoral)', 'a'], ['intraoral', 'الفحص داخل الفم (Intraoral)', 'a'],
        ['dx', 'التشخيص قبل الجراحة (Preoperative diagnosis)', 't'], ['ddx', 'التشخيص التفريقي (Differential)', 't']] },
      { t: 'الفحوصات والخطة', f: [['inv', 'الفحوصات والأشعة المطلوبة (Investigations / Imaging)', 'c', ['أشعة بانوراما (OPG)', 'أشعة مقطعية (CBCT)', 'أشعة صغيرة (Periapical)', 'تحاليل دم (CBC)', 'تحاليل تجلط', 'سكر', 'أخرى']],
        ['indication', 'مبررات العلاج (Indication)', 't'], ['proposed', 'الإجراء الجراحي المقترح', 't'],
        ['consent', 'حالة الموافقة (Consent)', 's', CONSENT], ['preInstr', 'تعليمات قبل الجراحة (Pre-op instructions)', 'a']] }
    ]
  }));

  var SURG_PROC = ['', 'خلع بسيط (Simple extraction)', 'خلع جراحي (Surgical extraction)', 'ضرس عقل / سن مطمور (Impacted / wisdom tooth)',
    'جراحة سنخية (Dentoalveolar surgery)', 'تقييم كيس / آفة (Cyst / lesion)', 'أخذ عينة (Biopsy)', 'إصابات الوجه والفكين (Trauma)', 'أخرى (Other)'];
  SP.addSection(S, cardsSection({
    id: 'dsSurgProc', title: '🔪 توثيق الإجراءات الجراحية (Surgical Procedures)', label: 'إجراء جراحي', tooth: true, statusKey: 'status',
    hint: 'كل إجراء في بطاقة منفصلة. يبدأ كل إجراء «مخطط» ولا يتحول إلى «مكتمل» إلا باختيار الطبيب.',
    blank: function () { return { status: STATUS[0] }; },
    fields: [['proc', 'الإجراء (Procedure)', 's', SURG_PROC], ['procOther', 'إجراء آخر / تفاصيل', 't'],
      ['indication', 'المبرر (Indication)', 't'], ['site', 'الموقع التشريحي', 't', 'Left mandible / floor of mouth'],
      ['tooth', 'السن (إن وجد)', 't', '38'], ['status', 'الحالة (Status)', 's', STATUS], ['date', 'التاريخ', 'd'],
      ['doctor', 'الطبيب المعالج', 't'], ['anesthesia', 'التخدير (Anesthesia)', 's', ['', 'موضعي (Local)', 'موضعي + تهدئة (Sedation)', 'كلي (General)']],
      ['opNotes', 'ملاحظات العملية (Operative notes)', 'a'], ['biopsy', 'العينة / الباثولوجي (Specimen / pathology)', 't'],
      ['complications', 'المضاعفات', 't'], ['postInstr', 'تعليمات بعد الجراحة', 'a'], ['followPlan', 'خطة المتابعة', 't']],
    line: function (r) { return [r.tooth && ('🦷 ' + r.tooth), (r.proc || '').split(' (')[0] || r.procOther, r.site, r.date].filter(Boolean).join(' · '); }
  }));

  SP.addSection(S, cardsSection({
    id: 'dsSurgPost', title: '🩹 المتابعة بعد الجراحة (Postoperative Follow-Up)', label: 'مراجعة',
    hint: 'كل مراجعة في بطاقة. المراجعات المحفوظة في الزيارات السابقة تظهر أسفلها للمقارنة.',
    fields: [['date', 'تاريخ المراجعة', 'd'], ['pain', 'الألم (0–10)', 's', ['', '0', '1', '2', '3', '4', '5', '6', '7', '8', '9', '10']],
      ['swelling', 'التورم', 's', ['', 'لا يوجد', 'خفيف', 'متوسط', 'شديد']], ['bleeding', 'النزيف', 's', ['', 'لا يوجد', 'بسيط', 'مستمر']],
      ['healing', 'التئام الجرح', 's', ['', 'جيد', 'متأخر', 'جاف (Dry socket)', 'انفتاح الجرح (Dehiscence)']],
      ['infection', 'علامات عدوى / مضاعفات', 's', ['', 'لا يوجد', 'احمرار', 'صديد', 'حرارة', 'تنميل (Paresthesia)', 'أخرى']],
      ['findings', 'نتائج الفحص', 'a'], ['actions', 'الإجراءات المتخذة', 't'], ['referral', 'علاج إضافي / تحويل', 't'], ['notes', 'ملاحظات', 'a']],
    history: { title: 'مراجعات سابقة', heads: ['التاريخ', 'الألم', 'التورم', 'الالتئام', 'العدوى'], cols: ['date', 'pain', 'swelling', 'healing', 'infection'] }
  }));

  /* =====================================================================
     B) COSMETIC DENTISTRY — تجميل الأسنان
     ===================================================================== */
  SP.addSection(S, formSection({
    id: 'dsCosAssess', title: '✨ التقييم التجميلي (Aesthetic Assessment)',
    groups: [
      { t: '', f: [['concerns', 'مخاوف المريض الجمالية', 'a'], ['expect', 'توقعات المريض', 't'],
        ['smileLine', 'خط الابتسامة (Smile line)', 's', ['', 'منخفض (Low)', 'متوسط (Average)', 'مرتفع (High)', 'ابتسامة لثوية (Gummy smile)']],
        ['midline', 'الخط المنتصف (Midline)', 's', ['', 'متطابق', 'منحرف لليمين', 'منحرف لليسار']],
        ['facial', 'تناسق الوجه (Facial proportions)', 't'], ['shade', 'لون الأسنان الحالي (Shade)', 't', 'A2 / VITA'],
        ['shape', 'شكل / حجم الأسنان', 't'], ['align', 'الاصطفاف (Alignment)', 't'], ['gum', 'مظهر اللثة', 't'],
        ['restos', 'حشوات / تركيبات ظاهرة', 't'], ['photosTaken', 'تم التصوير', 's', YN],
        ['findings', 'نتائج إكلينيكية أخرى', 'a'], ['goals', 'الأهداف الجمالية المقترحة', 'a']] }
    ]
  }));

  var COS_CAT = ['', 'تبييض (Whitening)', 'حشو تجميلي (Composite bonding)', 'فينير (Veneer)', 'تاج تجميلي (Cosmetic crown)',
    'تصميم ابتسامة (Smile makeover)', 'استبدال حشو / تركيبة تجميلية', 'تجميل لثة (Gingival contouring)', 'أخرى (Other)'];
  SP.addSection(S, cardsSection({
    id: 'dsCosTeeth', title: '🦷 خريطة الابتسامة والأسنان (Smile & Tooth Mapping)', label: 'سن تجميلي', tooth: true, statusKey: 'status', multiTooth: true,
    hint: 'اختر سناً (وسطحاً) من خريطة الأسنان بالأعلى ثم اضغط «🦷 من الخريطة». الترقيم نفس ترقيم الخريطة.',
    blank: function () { return { status: STATUS[0] }; },
    fields: [['tooth', 'السن / الأسنان', 't', '11, 21'], ['surf', 'السطح', 't', 'B'], ['current', 'الحالة الحالية', 't'],
      ['concern', 'المشكلة الجمالية', 't'], ['cat', 'نوع الإجراء التجميلي', 's', COS_CAT], ['catOther', 'إجراء آخر', 't'],
      ['proposal', 'التعديل / الترميم المقترح', 't'], ['material', 'المادة (Material)', 's', ['', 'Composite', 'E-max (Lithium disilicate)', 'Zirconia', 'Porcelain (Feldspathic)', 'PFM', 'Bleaching gel', 'أخرى']],
      ['shade', 'اللون المستهدف', 't', 'BL2'], ['status', 'الحالة', 's', STATUS], ['date', 'التاريخ', 'd'], ['notes', 'ملاحظات', 'a']],
    line: function (r) { return [r.tooth && ('🦷 ' + r.tooth), (r.cat || '').split(' (')[0] || r.catOther, r.material].filter(Boolean).join(' · '); }
  }));

  SP.addSection(S, photoSection({
    id: 'dsCosPhotos', title: '📸 صور قبل وبعد (Before & After Photography)', hint: 'صور قبل / أثناء / بعد العلاج.',
    tags: [['stage', 'المرحلة', 's', ['', 'قبل العلاج (Pre)', 'أثناء العلاج (Intermediate)', 'بعد العلاج (Post)']],
      ['shotDate', 'تاريخ التصوير', 'd'], ['procedure', 'الإجراء المرتبط', 't'], ['desc', 'الوصف', 't', 'Frontal smile']]
  }));

  SP.addSection(S, formSection({
    id: 'dsCosPlan', title: '📐 تصميم الابتسامة وخطة العلاج (Smile Design & Plan)',
    hint: 'النتيجة المقترحة منفصلة دائماً عن النتيجة الفعلية بعد العلاج.',
    groups: [
      { t: 'الخطة المقترحة', f: [['plan', 'خطة العلاج المقترحة', 'a'], ['teeth', 'الأسنان والإجراءات المختارة', 't'],
        ['stages', 'مراحل العلاج', 'a'], ['timeline', 'المدة المتوقعة', 't', '3 جلسات / 4 أسابيع'],
        ['mockup', 'وسيلة العرض (Mock-up)', 's', ['', 'لا يوجد', 'Wax-up', 'Mock-up في الفم', 'تصميم رقمي (DSD)']],
        ['proposedOutcome', 'النتيجة المقترحة (Proposed — ليست نتيجة فعلية)', 'a'], ['consent', 'موافقة المريض', 's', CONSENT]] },
      { t: 'بعد العلاج', f: [['actualOutcome', 'النتيجة الفعلية (Actual clinical result)', 'a'], ['completed', 'العلاجات المكتملة', 't'], ['followup', 'ملاحظات المتابعة', 'a']] }
    ]
  }));

  /* =====================================================================
     C) ORTHODONTICS — تقويم الأسنان
     ===================================================================== */
  var CLS = ['', 'Class I', 'Class II div 1', 'Class II div 2', 'Class III'];
  SP.addSection(S, formSection({
    id: 'dsOrthoAssess', title: '📏 التقييم المبدئي للتقويم (Initial Assessment)',
    groups: [
      { t: 'التاريخ', f: [['complaint', 'الشكوى الرئيسية', 't'], ['goals', 'أهداف العلاج', 't'], ['prevOrtho', 'تقويم سابق', 's', YN],
        ['prevDetail', 'تفاصيل التقويم السابق', 't'], ['habits', 'عادات فموية (Habits)', 'c', ['مص الإصبع', 'دفع اللسان', 'تنفس فموي', 'قضم الأظافر', 'صرير الأسنان', 'لا يوجد']],
        ['functional', 'مشاكل وظيفية (TMJ / مضغ / كلام)', 't']] },
      { t: 'الفحص خارج الفم', f: [['profile', 'البروفايل (Facial profile)', 's', ['', 'مستقيم (Straight)', 'محدب (Convex)', 'مقعر (Concave)']],
        ['lips', 'الشفاه (Lip competence)', 's', ['', 'متلامسة (Competent)', 'غير متلامسة (Incompetent)']], ['face', 'ملاحظات الوجه', 't']] },
      { t: 'الفحص داخل الفم', f: [['crowdU', 'ازدحام / فراغات — الفك العلوي', 's', ['', 'لا يوجد', 'ازدحام خفيف (<4mm)', 'ازدحام متوسط (4–8mm)', 'ازدحام شديد (>8mm)', 'فراغات (Spacing)']],
        ['crowdL', 'ازدحام / فراغات — الفك السفلي', 's', ['', 'لا يوجد', 'ازدحام خفيف (<4mm)', 'ازدحام متوسط (4–8mm)', 'ازدحام شديد (>8mm)', 'فراغات (Spacing)']],
        ['overjet', 'Overjet (mm)', 'n'], ['overbite', 'Overbite (mm أو %)', 't'],
        ['crossbite', 'عضة معكوسة (Crossbite)', 's', ['', 'لا يوجد', 'أمامية', 'خلفية يمين', 'خلفية يسار', 'خلفية ثنائية']],
        ['openbite', 'عضة مفتوحة (Open bite)', 's', ['', 'لا يوجد', 'أمامية', 'جانبية']],
        ['midline', 'الخط المنتصف (Midline)', 't', 'Upper +1mm R'],
        ['molarR', 'علاقة الضروس يمين', 's', CLS], ['molarL', 'علاقة الضروس يسار', 's', CLS],
        ['canineR', 'علاقة الأنياب يمين', 's', CLS], ['canineL', 'علاقة الأنياب يسار', 's', CLS],
        ['eruption', 'البزوغ / الأسنان المفقودة أو المطمورة', 't', '13 impacted, 35 missing'],
        ['perio', 'اللثة ونظافة الفم', 's', ['', 'جيدة', 'متوسطة', 'ضعيفة']], ['notes', 'ملاحظات إكلينيكية', 'a']] }
    ]
  }));

  var CEPH = [['SNA', '°'], ['SNB', '°'], ['ANB', '°'], ['FMA', '°'], ['IMPA', '°'], ['U1-SN', '°'], ['Wits', 'mm']];
  var orthoFiles = photoSection({
    id: 'dsOrthoRecords', title: '🗂 سجلات التقويم والأشعة (Records & Imaging)', hint: 'صور داخل/خارج الفم، بانوراما، سيفالومتري، نماذج دراسية أو مسح رقمي.',
    tags: [['category', 'نوع السجل', 's', ['', 'صورة داخل الفم (Intraoral)', 'صورة خارج الفم (Extraoral)', 'بانوراما (OPG)', 'سيفالومتري جانبي (Lateral ceph)', 'CBCT', 'نموذج دراسي / مسح رقمي', 'أخرى']],
      ['recDate', 'التاريخ', 'd'], ['desc', 'الوصف', 't']]
  });
  SP.addSection(S, {
    id: 'dsOrthoRecords', title: orthoFiles.title,
    html: function (v) {
      v = v || {};
      var files = Array.isArray(v) ? v : (v.files || []), ceph = (!Array.isArray(v) && v.ceph) || {};
      return orthoFiles.html(files) + '<h4 class="dp-sub">📐 قياسات السيفالومتري (إدخال يدوي — التطبيق لا يحسبها)</h4><div class="dp-ceph">' +
        CEPH.map(function (c) { return '<div class="field"><label>' + c[0] + ' (' + c[1] + ')</label><input class="dp-ceph-in" data-k="' + c[0] + '" type="number" step="any" inputmode="decimal" value="' + esc(ceph[c[0]] || '') + '" /></div>'; }).join('') +
        '<div class="field" style="grid-column:1 / -1;"><label>تحليل / ملاحظات</label><textarea class="dp-ceph-in" data-k="analysis" rows="2">' + esc(ceph.analysis || '') + '</textarea></div></div>';
    },
    wire: function (el) { orthoFiles.wire(el); },
    collect: function (el) {
      var files = orthoFiles.collect(el), ceph = {};
      el.querySelectorAll('.dp-ceph-in').forEach(function (i) { if (i.value.trim()) ceph[i.dataset.k] = i.value.trim(); });
      var o = {}; if (files) o.files = files; if (Object.keys(ceph).length) o.ceph = ceph;
      return Object.keys(o).length ? o : null;
    },
    render: function (v) {
      if (!v) return '';
      var h = orthoFiles.render(Array.isArray(v) ? v : v.files);
      if (v.ceph) h += SP.tableHtml(['القياس', 'القيمة'], Object.keys(v.ceph).map(function (k) { return [k, v.ceph[k]]; }));
      return h;
    }
  });

  SP.addSection(S, formSection({
    id: 'dsOrthoPlan', title: '🧭 التشخيص وخطة التقويم (Diagnosis & Treatment Plan)',
    hint: 'الخطة تخضع لتقييم أخصائي التقويم المعالج — لا يتم اقتراح أي علاج تلقائياً.',
    groups: [
      { t: 'التشخيص', f: [['dx', 'التشخيص التقويمي', 'a'], ['angle', 'تصنيف سوء الإطباق (Angle)', 's', CLS], ['skeletal', 'العلاقة الهيكلية', 's', ['', 'Skeletal I', 'Skeletal II', 'Skeletal III']]] },
      { t: 'الخطة', f: [['objectives', 'أهداف العلاج', 'a'], ['appliance', 'نوع الجهاز المقترح', 'c', ['تقويم ثابت (Fixed braces)', 'تقويم شفاف (Clear aligners)', 'جهاز متحرك (Removable)', 'جهاز وظيفي (Functional)', 'مثبت (Retainer)', 'أخرى']],
        ['stages', 'مراحل العلاج', 'a'], ['extraction', 'خلع مخطط (أسنان)', 't', '14, 24'], ['ipr', 'برد بين الأسنان (IPR)', 't'],
        ['retention', 'خطة التثبيت (Retention)', 't'], ['duration', 'المدة المتوقعة', 't', '18–24 شهر'], ['consent', 'موافقة المريض', 's', CONSENT]] },
      { t: 'تواريخ الخط الزمني (تُسجل فقط عند حدوثها)', f: [['approvalDate', 'تاريخ اعتماد الخطة', 'd'], ['startDate', 'تاريخ بدء العلاج', 'd'],
        ['endDate', 'تاريخ انتهاء العلاج النشط', 'd'], ['retentionDate', 'تاريخ بدء التثبيت', 'd']] }
    ]
  }));

  SP.addSection(S, cardsSection({
    id: 'dsOrthoProgress', title: '🔁 زيارات المتابعة (Progress Visits)', label: 'زيارة متابعة', tooth: true, multiTooth: true,
    hint: 'كل زيارة متابعة في بطاقة. الزيارات السابقة تظهر أسفلها للمقارنة.',
    fields: [['date', 'تاريخ الزيارة', 'd'], ['appliance', 'الجهاز الحالي', 't'], ['progress', 'التقدم الإكلينيكي', 'a'],
      ['hygiene', 'نظافة الفم', 's', ['', 'جيدة', 'متوسطة', 'ضعيفة']], ['compliance', 'الالتزام', 's', ['', 'ممتاز', 'جيد', 'ضعيف']],
      ['issues', 'شكوى المريض', 't'], ['findings', 'نتائج الفحص', 't'], ['tooth', 'أسنان معنية', 't', '13, 23'],
      ['adjust', 'التعديلات / الإجراءات', 't'], ['wire', 'السلك / تغيير الجهاز', 't', '0.016 NiTi → 0.018 SS'],
      ['elastics', 'الأستك / Attachments', 't', 'Class II 3/16"'], ['milestone', 'حدث مهم (Milestone)', 't'],
      ['next', 'موعد الزيارة القادمة', 'd'], ['instructions', 'تعليمات', 'a']],
    history: { title: 'زيارات تقويم سابقة', heads: ['التاريخ', 'الجهاز', 'السلك', 'الالتزام', 'التعديلات'], cols: ['date', 'appliance', 'wire', 'compliance', 'adjust'] }
  }));

  /* ---------- treatment timeline: only recorded events ---------- */
  function timelineEvents(cur) {
    var ev = [], visits = prevVisits().map(function (v) { return { date: v.date, s: (v.exam && v.exam.sections) || {} }; });
    visits.push({ date: CC && CC.today ? CC.today() : '', s: cur, current: true });
    visits.forEach(function (v) {
      var s = v.s, d = v.date;
      if (s.dsOrthoAssess) ev.push([d, '📏 التقييم المبدئي']);
      var rec = s.dsOrthoRecords, files = rec && (Array.isArray(rec) ? rec : rec.files);
      (files || []).forEach(function (f) { ev.push([f.recDate || d, '🗂 سجل تشخيصي: ' + (f.category || f.name || '')]); });
      if (rec && rec.ceph) ev.push([d, '📐 قياسات سيفالومتري']);
      var p = s.dsOrthoPlan || {};
      if (p.approvalDate) ev.push([p.approvalDate, '✅ اعتماد خطة العلاج']);
      if (p.startDate) ev.push([p.startDate, '🚀 بدء العلاج']);
      if (p.endDate) ev.push([p.endDate, '🏁 انتهاء العلاج النشط']);
      if (p.retentionDate) ev.push([p.retentionDate, '🔒 بدء التثبيت']);
      (s.dsOrthoProgress || []).forEach(function (r) {
        ev.push([r.date || d, '🔁 زيارة متابعة' + (r.wire ? ' — ' + r.wire : '')]);
        if (r.milestone) ev.push([r.date || d, '⭐ ' + r.milestone]);
      });
    });
    var seen = {};
    return ev.filter(function (e) { var k = e[0] + '|' + e[1]; if (seen[k]) return false; seen[k] = 1; return true; })
      .sort(function (a, b) { return String(a[0]).localeCompare(String(b[0])); });
  }
  function timelineHtml(ev) {
    if (!ev.length) return '<p class="muted">لا توجد أحداث مسجلة بعد. يظهر هنا فقط ما تم تسجيله فعلياً.</p>';
    return '<ol class="dp-timeline">' + ev.map(function (e) { return '<li><span class="dp-tl-date" dir="ltr">' + esc(e[0] || '—') + '</span><span>' + esc(e[1]) + '</span></li>'; }).join('') + '</ol>';
  }
  SP.addSection(S, {
    id: 'dsOrthoTimeline', title: '🕒 الخط الزمني للتقويم (Treatment Timeline)',
    html: function () { return '<div class="dp-tl-box"></div><button type="button" class="btn ghost small dp-tl-refresh">↻ تحديث</button>'; },
    wire: function (el) {
      function draw() {
        var root = el.parentNode;
        while (root && root.parentNode && !(root.querySelector && root.querySelector('.sp-section[data-sid="odontogram"]'))) root = root.parentNode;
        var cur = {};
        try { var r = SP.collect(root, S); cur = (r && r.sections) || {}; } catch (e) {}
        el.querySelector('.dp-tl-box').innerHTML = timelineHtml(timelineEvents(cur));
      }
      el.querySelector('.dp-tl-refresh').addEventListener('click', draw);
      setTimeout(draw, 0);
      setTimeout(buildDepartments.bind(null, el), 0);
    },
    collect: function () { return null; },
    render: function () { return ''; }
  });

  /* =====================================================================
     DEPARTMENT TABS inside the existing dental accordion (UI only — values untouched)
     ===================================================================== */
  var DEPTS = [
    { id: 'general', t: '🦷 الأسنان العامة' },
    { id: 'surg', t: '🔪 جراحة الفم والفكين', groups: [
      ['dp-sp', '🩺 التقييم قبل الجراحة — Preoperative', ['dsSurgPre']],
      ['dp-sc', '🔪 الإجراءات الجراحية — Surgical Procedures', ['dsSurgProc']],
      ['dp-so', '🩹 المتابعة بعد الجراحة — Post-op Follow-Up', ['dsSurgPost']]] },
    { id: 'cos', t: '✨ تجميل الأسنان', groups: [
      ['dp-ca', '✨ التقييم التجميلي — Aesthetic Assessment', ['dsCosAssess']],
      ['dp-ct', '🦷 خريطة الابتسامة والأسنان — Smile & Tooth Mapping', ['dsCosTeeth']],
      ['dp-cp', '📸 صور قبل وبعد — Before & After', ['dsCosPhotos']],
      ['dp-cd', '📐 تصميم الابتسامة والخطة — Smile Design & Plan', ['dsCosPlan']]] },
    { id: 'ortho', t: '📏 تقويم الأسنان', groups: [
      ['dp-oa', '📏 التقييم المبدئي — Initial Assessment', ['dsOrthoAssess']],
      ['dp-or', '🗂 السجلات والأشعة — Records & Imaging', ['dsOrthoRecords']],
      ['dp-op', '🧭 التشخيص والخطة — Diagnosis & Plan', ['dsOrthoPlan']],
      ['dp-ov', '🔁 زيارات المتابعة — Progress Visits', ['dsOrthoProgress']],
      ['dp-ot', '🕒 الخط الزمني — Timeline', ['dsOrthoTimeline']]] }
  ];
  function buildDepartments(anyEl) {
    var root = anyEl.parentNode;
    while (root && root.parentNode && !(root.querySelector && root.querySelector('.oph-groups'))) root = root.parentNode;
    var box = root && root.querySelector('.oph-groups');
    if (!box || box.querySelector('.dp-tabs')) return;
    box.querySelectorAll(':scope > .oph-group').forEach(function (g) { g.dataset.dept = 'general'; });
    DEPTS.forEach(function (d) {
      (d.groups || []).forEach(function (gd) {
        var secs = gd[2].map(function (id) { return root.querySelector('.sp-section[data-sid="' + id + '"]'); }).filter(Boolean);
        if (!secs.length) return;
        var g = document.createElement('div');
        g.className = 'oph-group';
        g.dataset.ids = gd[2].join(',');
        g.dataset.dept = d.id;
        g.innerHTML = '<button type="button" class="oph-group-head" aria-expanded="false"><span class="oph-pm">+</span><span class="oph-gt">' + gd[1] + '</span><span class="oph-dot" title="يحتوي على بيانات">●</span></button><div class="oph-group-body"><div class="oph-group-inner"></div></div>';
        var inner = g.querySelector('.oph-group-inner');
        secs.forEach(function (s) { inner.appendChild(s); });
        box.appendChild(g);
      });
    });
    var tabs = document.createElement('div');
    tabs.className = 'dp-tabs';
    tabs.setAttribute('role', 'tablist');
    tabs.innerHTML = DEPTS.map(function (d) { return '<button type="button" role="tab" class="dp-tab" data-dept="' + d.id + '">' + d.t + '<span class="dp-tab-dot">●</span></button>'; }).join('');
    var firstGroup = box.querySelector(':scope > .oph-group');
    box.insertBefore(tabs, firstGroup);
    var KEY = 'cm_dental_dept_v1';
    function show(id) {
      tabs.querySelectorAll('.dp-tab').forEach(function (b) { var on = b.dataset.dept === id; b.classList.toggle('active', on); b.setAttribute('aria-selected', on ? 'true' : 'false'); });
      box.querySelectorAll(':scope > .oph-group').forEach(function (g) { g.style.display = g.dataset.dept === id ? '' : 'none'; });
      try { localStorage.setItem(KEY, id); } catch (e) {}
    }
    function dots() {
      DEPTS.forEach(function (d) {
        var has = Array.prototype.some.call(box.querySelectorAll(':scope > .oph-group[data-dept="' + d.id + '"]'), function (g) { return g.classList.contains('has-data'); });
        tabs.querySelector('[data-dept="' + d.id + '"]').classList.toggle('has-data', has);
      });
    }
    tabs.addEventListener('click', function (e) { var b = e.target.closest('.dp-tab'); if (b) show(b.dataset.dept); });
    function refreshMine() {
      var saved = {};
      try { var r = SP.collect(root, S); saved = (r && r.sections) || {}; } catch (e) {}
      box.querySelectorAll(':scope > .oph-group[data-dept]:not([data-dept="general"])').forEach(function (g) {
        g.classList.toggle('has-data', (g.dataset.ids || '').split(',').some(function (id) { return saved[id]; }));
      });
      dots();
    }
    box.addEventListener('input', refreshMine);
    box.addEventListener('change', function () { refreshMine(); setTimeout(refreshMine, 800); });
    box.addEventListener('click', function () { setTimeout(refreshMine, 60); });
    var start = 'general';
    try { start = localStorage.getItem(KEY) || 'general'; } catch (e) {}
    show(DEPTS.some(function (d) { return d.id === start; }) ? start : 'general');
    refreshMine();
  }

  window.ClinicDentalPlus = { timelineEvents: timelineEvents, departments: DEPTS };
})();
} catch (e) { console.error('[specialties-bundle] dental-plus.js failed:', e); }
/* ==== END dental-plus.js ==== */

/* ==== BEGIN ophthalmology.js ==== */
try {
// ============ Ophthalmology module (وحدة الرمد والعيون) — v48 structured exam ============
// Uses the existing ClinicSpecialty.addSection architecture. All data is saved inside the
// visit's existing specialty exam object: exam.sections[<id>]. Old v47 fields
// (complaint, iopR, iopL, lens, cornea, exam) and old sections (refraction, files) are kept
// with the same ids/keys, so old records still open, edit and display correctly.

(function () {
  var SP = window.ClinicSpecialty;
  if (!SP) return;
  var esc = SP.escape;
  var EYES = [{ k: 'right', l: 'العين اليمنى (OD)' }, { k: 'left', l: 'العين اليسرى (OS)' }];
  function O(s) { return [''].concat(s.split('|')); }

  /* ---------- generic path helpers ---------- */
  function get(v, path) {
    return path.split('.').reduce(function (o, k) { return o == null ? undefined : o[k]; }, v);
  }
  function put(obj, path, val) {
    var ks = path.split('.'), o = obj;
    for (var i = 0; i < ks.length - 1; i++) { o = o[ks[i]] = o[ks[i]] || {}; }
    o[ks[ks.length - 1]] = val;
  }
  function input(f, path, v) {
    var val = get(v, path); val = val == null ? '' : String(val);
    var a = ' class="oph-f" data-p="' + path + '"';
    if (f.opts) return '<select' + a + '>' + f.opts.map(function (o) {
      return '<option value="' + esc(o) + '"' + (o === val ? ' selected' : '') + '>' + (o ? esc(o) : '—') + '</option>';
    }).join('') + '</select>';
    if (f.area) return '<textarea' + a + ' rows="2" placeholder="' + esc(f.ph || '') + '">' + esc(val) + '</textarea>';
    return '<input' + a + ' value="' + esc(val) + '" placeholder="' + esc(f.ph || '') + '"' + (f.type ? ' type="' + f.type + '"' : '') + ' />';
  }
  function collectInputs(el) {
    var out = {}, any = false;
    el.querySelectorAll('.oph-f').forEach(function (i) {
      var v = (i.value || '').trim();
      if (v) { put(out, i.dataset.p, v); any = true; }
    });
    return any ? out : null;
  }

  /* ---------- section builders ---------- */
  // OD/OS table: each row = structure with choice + note per eye
  function eyeSection(id, title, rows, extra) {
    var labels = {};
    rows.forEach(function (r) { labels[r.k] = r.l; });
    return {
      id: id, title: title,
      html: function (v) {
        v = v || {};
        var h = '<div class="table-wrap"><table class="oph-eye"><thead><tr><th>البند</th>' +
          EYES.map(function (e) { return '<th>' + esc(e.l) + '</th>'; }).join('') + '</tr></thead><tbody>' +
          rows.map(function (r) {
            return '<tr><td><b>' + esc(r.l) + '</b></td>' + EYES.map(function (e) {
              return '<td>' + input(r, e.k + '.' + r.k, v) +
                (r.opts ? input({ ph: 'ملاحظات / أخرى' }, e.k + '.' + r.k + '_note', v) : '') + '</td>';
            }).join('') + '</tr>';
          }).join('') +
          '<tr><td><b>تعليق</b></td>' + EYES.map(function (e) {
            return '<td>' + input({ area: true, ph: 'ملاحظات العين' }, e.k + '.comment', v) + '</td>';
          }).join('') + '</tr></tbody></table></div>';
        return h + (extra ? extra.html(v) : '');
      },
      collect: collectInputs,
      render: function (v) {
        var rs = [];
        rows.concat([{ k: 'comment', l: 'تعليق' }]).forEach(function (r) {
          var cells = EYES.map(function (e) {
            var a = get(v, e.k + '.' + r.k), n = get(v, e.k + '.' + r.k + '_note');
            return [a, n].filter(Boolean).join(' — ');
          });
          if (cells[0] || cells[1]) rs.push([r.l, cells[0] || '-', cells[1] || '-']);
        });
        var h = rs.length ? SP.tableHtml(['البند', 'OD', 'OS'], rs) : '';
        return h + (extra ? extra.render(v) : '');
      }
    };
  }

  // Grouped plain fields. groups: [{t: 'title', p: 'pathPrefix', fields:[...]}]
  function fieldsBlock(groups) {
    return {
      html: function (v) {
        return groups.map(function (g) {
          return (g.t ? '<h5 class="oph-sub">' + esc(g.t) + '</h5>' : '') + '<div class="grid-2 oph-grid">' +
            g.fields.map(function (f) {
              return '<div class="field"' + (f.area || f.wide ? ' style="grid-column:1 / -1;"' : '') + '><label>' +
                esc(f.l) + '</label>' + input(f, g.p + '.' + f.k, v) + '</div>';
            }).join('') + '</div>';
        }).join('');
      },
      render: function (v) {
        var rs = [];
        groups.forEach(function (g) {
          g.fields.forEach(function (f) {
            var x = get(v, g.p + '.' + f.k);
            if (x) rs.push([(g.t ? g.t + ' — ' : '') + f.l, x]);
          });
        });
        return rs.length ? SP.tableHtml(['البند', 'القيمة'], rs) : '';
      }
    };
  }
  function fieldSection(id, title, groups, pre) {
    var b = fieldsBlock(groups);
    return {
      id: id, title: title,
      html: function (v) { v = v || {}; return (pre ? pre.html(v) : '') + b.html(v); },
      collect: collectInputs,
      render: function (v) { return (pre ? pre.render(v) : '') + b.render(v); }
    };
  }

  // Repeating findings rows (diagram replacement): eye / location / finding / description / date
  function rowsSection(id, title, hint, locOpts) {
    var COLS = [
      { k: 'eye', l: 'العين', opts: ['OD', 'OS', 'OU'] },
      { k: 'loc', l: 'الموقع (Location)', opts: locOpts },
      { k: 'finding', l: 'الملاحظة (Finding)', ph: 'Ulcer / Hemorrhage...' },
      { k: 'desc', l: 'الوصف', ph: 'الحجم، العمق...' },
      { k: 'date', l: 'التاريخ', type: 'date' }
    ];
    function rowHtml(r) {
      r = r || {};
      return '<tr class="oph-row">' + COLS.map(function (c) {
        var tmp = {}; tmp[c.k] = r[c.k];
        return '<td>' + input(c, c.k, tmp).replace('class="oph-f"', 'class="oph-rf"') + '</td>';
      }).join('') + '<td><button type="button" class="btn small danger oph-del">🗑</button></td></tr>';
    }
    return {
      id: id, title: title,
      html: function (v) {
        var rows = (v && v.rows) || [];
        return '<p class="muted">' + esc(hint) + '</p><div class="table-wrap"><table class="oph-rows"><thead><tr>' +
          COLS.map(function (c) { return '<th>' + esc(c.l) + '</th>'; }).join('') + '<th></th></tr></thead><tbody>' +
          (rows.length ? rows : [{}]).map(rowHtml).join('') + '</tbody></table></div>' +
          '<button type="button" class="btn small oph-add">➕ إضافة ملاحظة</button>';
      },
      wire: function (el) {
        var tb = el.querySelector('tbody');
        el.querySelector('.oph-add').addEventListener('click', function () { tb.insertAdjacentHTML('beforeend', rowHtml()); });
        tb.addEventListener('click', function (e) {
          var b = e.target.closest('.oph-del'); if (b) b.closest('tr').remove();
        });
      },
      collect: function (el) {
        var rows = [];
        el.querySelectorAll('tr.oph-row').forEach(function (tr) {
          var r = {}, any = false;
          tr.querySelectorAll('.oph-rf').forEach(function (i) {
            var v = (i.value || '').trim();
            if (v) { r[i.dataset.p] = v; if (i.dataset.p !== 'eye') any = true; }
          });
          if (any) rows.push(r);
        });
        return rows.length ? { rows: rows } : null;
      },
      render: function (v) {
        if (!v || !v.rows || !v.rows.length) return '';
        return SP.tableHtml(COLS.map(function (c) { return c.l; }),
          v.rows.map(function (r) { return COLS.map(function (c) { return r[c.k] || '-'; }); }));
      }
    };
  }

  /* ---------- option lists ---------- */
  var OTHER = 'أخرى (Other)';
  var ANTERIOR = [
    { k: 'lids', l: 'الجفون والرموش (Lids / Lashes)', opts: O('Normal|Blepharitis|Meibomian gland dysfunction|Ptosis|Entropion|Ectropion|' + OTHER) },
    { k: 'conj', l: 'الملتحمة (Conjunctiva)', opts: O('Normal|White|Injection|Chemosis|Follicles|Papillae|' + OTHER) },
    { k: 'cornea', l: 'القرنية (Cornea)', opts: O('Clear|Epithelial defect|Ulcer|Edema|Scar|Keratitis|Neovascularization|' + OTHER) },
    { k: 'ac', l: 'الخزانة الأمامية (Anterior Chamber)', opts: O('Deep|Shallow|Cell|Flare|Hypopyon|' + OTHER) },
    { k: 'iris', l: 'القزحية (Iris)', opts: O('Normal|Atrophy|Synechiae|Irregular pupil|' + OTHER) },
    { k: 'lens', l: 'العدسة (Lens)', opts: O('Clear|Cataract|Nuclear sclerosis|Cortical|Posterior subcapsular|Aphakia|PCIOL|' + OTHER) }
  ];
  var POSTERIOR = [
    { k: 'disc', l: 'العصب البصري (Optic Disc)', opts: O('Normal|Pallor|Edema|Cupping|' + OTHER) },
    { k: 'cd', l: 'نسبة C/D', ph: '0.3' },
    { k: 'macula', l: 'الماكيولا (Macula)', opts: O('Normal|Edema|Hemorrhage|Exudates|Drusen|Scar|' + OTHER) },
    { k: 'vessels', l: 'الأوعية (Retinal Vessels)', opts: O('Normal|Attenuation|Tortuosity|Hemorrhage|' + OTHER) },
    { k: 'periphery', l: 'الشبكية الطرفية (Peripheral Retina)', opts: O('Normal|Break|Hole|Detachment|Degeneration|Lattice|' + OTHER) },
    { k: 'vitreous', l: 'الجسم الزجاجي (Vitreous)', opts: O('Clear|PVD|Hemorrhage|Cells|' + OTHER) }
  ];
  var MOTILITY = ['abduction|التبعيد (Abduction)', 'adduction|التقريب (Adduction)', 'elevation|الرفع (Elevation)', 'depression|الخفض (Depression)']
    .map(function (s) { var p = s.split('|'); return { k: p[0], l: p[1], opts: O('Full|Limited|Overaction|Underaction|Restriction|Pain|' + OTHER) }; });

  /* ---------- 2. Visual acuity & refraction (old id "refraction", old keys kept) ---------- */
  var RCOLS = [
    { k: 'va', l: 'VA (قديم/عام)', ph: '6/6' },
    { k: 'ucva', l: 'Unaided VA', ph: '6/12' },
    { k: 'ph', l: 'Pin-hole', ph: '6/9' },
    { k: 'bcva', l: 'BCVA', ph: '6/6' },
    { k: 'near', l: 'Near VA', ph: 'N5' },
    { k: 'sph', l: 'Sph', ph: '-1.25' },
    { k: 'cyl', l: 'Cyl', ph: '-0.50' },
    { k: 'axis', l: 'Axis', ph: '180' },
    { k: 'add', l: 'Add', ph: '+2.00' },
    { k: 'pd', l: 'PD', ph: '31' }
  ];
  var refraction = {
    id: 'refraction',
    title: '👓 حدة الإبصار والانكسار (Visual Acuity & Refraction)',
    html: function (v) {
      v = v || {};
      return '<div class="table-wrap"><table class="rfx"><thead><tr><th>العين</th>' +
        RCOLS.map(function (c) { return '<th>' + esc(c.l) + '</th>'; }).join('') + '</tr></thead><tbody>' +
        EYES.map(function (e) {
          return '<tr data-eye="' + e.k + '"><td>' + esc(e.l) + '</td>' + RCOLS.map(function (c) {
            var val = (v[e.k] && v[e.k][c.k]) || '';
            return '<td><input class="rfx-f" data-k="' + c.k + '" value="' + esc(val) + '" placeholder="' + esc(c.ph) + '" /></td>';
          }).join('') + '</tr>';
        }).join('') + '</tbody></table></div>';
    },
    collect: function (el) {
      var out = {};
      el.querySelectorAll('tr[data-eye]').forEach(function (tr) {
        var row = {};
        tr.querySelectorAll('.rfx-f').forEach(function (i) { var v = (i.value || '').trim(); if (v) row[i.dataset.k] = v; });
        if (Object.keys(row).length) out[tr.dataset.eye] = row;
      });
      return Object.keys(out).length ? out : null;
    },
    render: function (v) {
      var used = RCOLS.filter(function (c) { return EYES.some(function (e) { return v[e.k] && v[e.k][c.k]; }); });
      var rows = EYES.filter(function (e) { return v[e.k]; }).map(function (e) {
        return [e.l].concat(used.map(function (c) { return v[e.k][c.k] || '-'; }));
      });
      if (!rows.length) return '';
      return SP.tableHtml(['العين'].concat(used.map(function (c) { return c.l; })), rows);
    }
  };

  /* ---------- 9-gaze grid ---------- */
  var GAZE = [['ur', '↖ أعلى يمين (Up-right)'], ['up', '↑ أعلى (Up)'], ['ul', '↗ أعلى يسار (Up-left)'],
              ['r', '← يمين (Right)'], ['pp', '● الوضع الأساسي (Primary)'], ['l', '→ يسار (Left)'],
              ['dr', '↙ أسفل يمين (Down-right)'], ['down', '↓ أسفل (Down)'], ['dl', '↘ أسفل يسار (Down-left)']];
  var gazeBlock = {
    html: function (v) {
      return '<h5 class="oph-sub">فحص الاتجاهات التسعة (9 Gaze Positions)</h5><div class="oph-gaze">' +
        GAZE.map(function (g) {
          return '<div class="oph-gaze-cell"><label>' + esc(g[1]) + '</label>' + input({ ph: 'Normal / -2 / +1...' }, 'gaze.' + g[0], v) + '</div>';
        }).join('') + '</div>';
    },
    render: function (v) {
      var rs = GAZE.filter(function (g) { return get(v, 'gaze.' + g[0]); }).map(function (g) { return [g[1], get(v, 'gaze.' + g[0])]; });
      return rs.length ? SP.tableHtml(['الاتجاه', 'الملاحظة'], rs) : '';
    }
  };
  function devFields() {
    return [
      { k: 'method', l: 'الطريقة (Method)', opts: O('Cover test|Prism cover test|Hirschberg|Krimsky|' + OTHER) },
      { k: 'type', l: 'نوع الانحراف', opts: O('Orthophoria|ET|XT|RHT|LHT|' + OTHER) },
      { k: 'angle', l: 'الزاوية (Angle)', ph: '15°' },
      { k: 'pd', l: 'Prism diopters (PD)', ph: '30' }
    ];
  }
  function coverFields() {
    return [
      { k: 'result', l: 'النتيجة', opts: O('Orthophoria|Phoria|Tropia|Alternating|' + OTHER) },
      { k: 'side', l: 'الجهة', opts: O('Right|Left|Alternating') },
      { k: 'comment', l: 'تعليق', ph: '' }
    ];
  }
  function prismFields() {
    return [
      { k: 'amount', l: 'قوة المنشور (Prism)', ph: '20 PD' },
      { k: 'base', l: 'القاعدة (Base)', opts: O('IN|OUT|UP|DOWN') },
      { k: 'eye', l: 'العين', opts: O('OD|OS|Both') },
      { k: 'notes', l: 'ملاحظات', ph: '' }
    ];
  }

  /* ---------- IOP ---------- */
  var iopFields = function (p) {
    return [
      { k: p + 'Value', l: 'القيمة', ph: '15' },
      { k: p + 'Unit', l: 'الوحدة', opts: O('mmHg') },
      { k: p + 'Method', l: 'الطريقة (Method)', opts: O('Goldmann|Tonopen|Non-contact|' + OTHER) },
      { k: p + 'Time', l: 'وقت القياس', type: 'time' }
    ];
  };

  /* ---------- investigations ---------- */
  var INV = [['octMacula', 'OCT Macula'], ['octRnfl', 'OCT RNFL / Optic Nerve'], ['fundus', 'Fundus Photography'],
             ['vf', 'Visual Fields'], ['topo', 'Corneal Topography'], ['bscan', 'B-scan'],
             ['asOct', 'Anterior Segment OCT'], ['hess', 'Hess Chart']];

  /* ---------- attachments with optional classification (old id "files" kept) ---------- */
  var CATS = O('Anterior Segment|OCT|Fundus Photo|Visual Field|Corneal Topography|B-scan|Retinal Drawing|Hess Chart|' + OTHER);
  var baseFiles = SP.filesSection({
    id: 'files',
    title: '📎 المرفقات وصور العين (Attachments)',
    hint: 'اختر نوع الملف (اختياري) ثم ارفع: OCT، صور قاع العين، مجال الرؤية...',
    folder: 'ophthalmology'
  });
  var files = {
    id: 'files', title: baseFiles.title,
    html: function (v) {
      return '<div class="field"><label>نوع المرفق القادم (اختياري)</label><select class="oph-cat">' +
        CATS.map(function (c) { return '<option value="' + esc(c) + '">' + (c ? esc(c) : '—') + '</option>'; }).join('') +
        '</select></div>' + baseFiles.html(v);
    },
    wire: function (el) {
      baseFiles.wire(el);
      var cat = el.querySelector('.oph-cat'), list = el.querySelector('.sp-file-list');
      function decorate() {
        (el._files || []).forEach(function (f) { if (f && !('category' in f)) f.category = cat.value || ''; });
        list.querySelectorAll('.sp-file-row').forEach(function (row, i) {
          var f = el._files[i];
          if (!f || row.querySelector('.oph-tag')) return;
          row.insertAdjacentHTML('afterbegin', f.category ? '<span class="oph-tag">' + esc(f.category) + '</span>' : '');
        });
      }
      // tag only newly uploaded files: mark existing ones first
      (el._files || []).forEach(function (f) { if (f && !('category' in f)) f.category = f.category || ''; });
      new MutationObserver(decorate).observe(list, { childList: true });
      decorate();
    },
    collect: baseFiles.collect,
    render: function (v) {
      if (!v || !v.length) return '';
      return '<ul class="sp-files-view">' + v.map(function (f) {
        return '<li>' + (f.category ? '<b>' + esc(f.category) + ':</b> ' : '') +
          '<a href="' + esc(f.url) + '" target="_blank" rel="noopener">' + esc(f.name) + '</a></li>';
      }).join('') + '</ul>';
    }
  };

  /* ---------- register sections (order = display order) ---------- */
  var S = 'ophthalmology';
  SP.addSection(S, eyeSection('anteriorSegment', '👁️ الفحص الأمامي (Anterior Segment Examination)', ANTERIOR));
  SP.addSection(S, refraction);
  SP.addSection(S, fieldSection('iop', '🎯 ضغط العين (IOP)', [
    { t: 'العين اليمنى (OD)', p: 'right', fields: iopFields('') },
    { t: 'العين اليسرى (OS)', p: 'left', fields: iopFields('') }
  ]));
  SP.addSection(S, fieldSection('cornea', '🔵 فحص القرنية (Corneal Examination)', [
    { t: 'الصبغة (Staining)', p: 'staining', fields: [
      { k: 'fluorescein', l: 'Fluorescein', ph: 'OD: / OS:' },
      { k: 'lissamine', l: 'Lissamine green', ph: 'OD: / OS:' }] },
    { t: 'TBUT (ثانية)', p: 'tbut', fields: [{ k: 'right', l: 'يمين (OD)', ph: '10' }, { k: 'left', l: 'يسار (OS)', ph: '8' }] },
    { t: 'قرحة القرنية (Corneal Ulcer)', p: 'ulcer', fields: [
      { k: 'present', l: 'الحالة', opts: O('Absent|Present') },
      { k: 'eye', l: 'العين', opts: O('OD|OS|OU') },
      { k: 'location', l: 'الموقع (Location)', opts: O('Central|Paracentral|Peripheral|Superior|Inferior|Nasal|Temporal') },
      { k: 'size', l: 'الحجم (Size mm)', ph: '2x3' },
      { k: 'depth', l: 'العمق (Depth)', opts: O('Superficial|Mid-stromal|Deep|Descemetocele|Perforated') },
      { k: 'edge', l: 'الحافة (Edge)', opts: O('Regular|Irregular|Feathery|Satellite lesions') },
      { k: 'infiltrate', l: 'Infiltrate', opts: O('None|Mild|Moderate|Dense') },
      { k: 'hypopyon', l: 'Hypopyon', opts: O('Absent|Present') },
      { k: 'seidel', l: 'Seidel test', opts: O('Negative|Positive') },
      { k: 'comment', l: 'تعليق', area: true }] }
  ]));
  SP.addSection(S, rowsSection('cornealDiagram', '✏️ خريطة القرنية (Corneal Findings Map)',
    'سجّل كل ملاحظة: العين، موقعها على القرنية، والملاحظة. ويمكن إرفاق صورة رسم من قسم المرفقات.',
    O('Central|Superior|Inferior|Nasal|Temporal|Superonasal|Superotemporal|Inferonasal|Inferotemporal|Limbus')));
  SP.addSection(S, fieldSection('strabismus', '👀 فحص الحول (Strabismus / Squint)', [
    { t: 'الانحراف — بعيد (Distance)', p: 'dist', fields: devFields() },
    { t: 'الانحراف — قريب (Near)', p: 'near', fields: devFields() },
    { t: 'Cover test — بعيد', p: 'coverDist', fields: coverFields() },
    { t: 'Cover test — قريب', p: 'coverNear', fields: coverFields() },
    { t: 'Prism cover test — بعيد', p: 'prismDist', fields: prismFields() },
    { t: 'Prism cover test — قريب', p: 'prismNear', fields: prismFields() }
  ], gazeBlock));
  SP.addSection(S, eyeSection('ocularMotility', '↔️ حركة العين (Ocular Motility)', MOTILITY));
  SP.addSection(S, fieldSection('binocularFunction', '🧠 الرؤية الثنائية (Binocular Function)', [
    { t: 'Stereopsis', p: 'stereo', fields: [
      { k: 'result', l: 'النتيجة', opts: O('Normal|Reduced|None') },
      { k: 'test', l: 'الاختبار', opts: O('Titmus|TNO|Lang|Randot|' + OTHER) },
      { k: 'value', l: 'القيمة', ph: '40' }, { k: 'unit', l: 'الوحدة', opts: O('arc sec') }] },
    { t: 'Worth 4 Dot', p: 'w4d', fields: [{ k: 'result', l: 'النتيجة', opts: O('Normal|Diplopia|Suppression|' + OTHER) }] },
    { t: 'Fusion', p: 'fusion', fields: [{ k: 'result', l: 'النتيجة', opts: O('Normal|Reduced|None') }] },
    { t: 'ازدواج الرؤية (Diplopia)', p: 'diplopia', fields: [
      { k: 'present', l: 'الحالة', opts: O('Absent|Present') },
      { k: 'at', l: 'المسافة', opts: O('Distance|Near|Both') },
      { k: 'direction', l: 'الاتجاه', opts: O('Horizontal|Vertical|Oblique|Torsional|' + OTHER) },
      { k: 'notes', l: 'ملاحظات', ph: '' }] }
  ]));
  SP.addSection(S, fieldSection('headPosture', '🧍 وضع الرأس والرأرأة (Head Posture / Nystagmus)', [
    { t: 'وضع الرأس (Head Posture)', p: 'head', fields: [
      { k: 'posture', l: 'الوضع', opts: O('Normal|Face turn right|Face turn left|Chin up|Chin down|Head tilt right|Head tilt left') },
      { k: 'notes', l: 'ملاحظات', ph: '' }] },
    { t: 'الرأرأة (Nystagmus)', p: 'nystagmus', fields: [
      { k: 'present', l: 'الحالة', opts: O('Absent|Present') },
      { k: 'type', l: 'النوع', opts: O('Horizontal|Vertical|Torsional|Pendular|Jerk|' + OTHER) }] },
    { t: 'Ocular torticollis', p: 'torticollis', fields: [
      { k: 'present', l: 'الحالة', opts: O('Absent|Present') },
      { k: 'comment', l: 'تعليق', area: true }] }
  ]));
  SP.addSection(S, eyeSection('posteriorSegment', '🔴 فحص قاع العين والشبكية (Posterior Segment / Retina)', POSTERIOR));
  SP.addSection(S, rowsSection('retinalDrawing', '🩻 رسم ونتائج الشبكية (Retinal Drawing / Findings)',
    'سجّل كل ملاحظة على الشبكية. ولإرفاق رسم أو صورة اختر «Retinal Drawing» في قسم المرفقات.',
    O('Macula|Optic disc|Superior arcade|Inferior arcade|Superotemporal|Superonasal|Inferotemporal|Inferonasal|Periphery|Ora serrata')));
  SP.addSection(S, fieldSection('investigations', '📊 فحوصات وأشعة العين (Investigations & Imaging)', INV.map(function (x) {
    return { t: x[1], p: x[0], fields: [
      { k: 'od', l: 'OD', ph: '' }, { k: 'os', l: 'OS', ph: '' }, { k: 'findings', l: 'النتيجة (Findings)', area: true }] };
  })));
  SP.addSection(S, files);
  var comments = fieldSection('comments', '📝 الانطباع والخطة (Impression / Plan)', [
    { t: '', p: 'imp', fields: [
      { k: 'impression', l: 'الانطباع الإكلينيكي (Clinical impression)', area: true },
      { k: 'summary', l: 'ملخص النتائج (Findings summary)', area: true },
      { k: 'plan', l: 'الخطة والتوصيات (Plan / Recommendations)', area: true }] }
  ]);
  SP.addSection(S, comments);
  // Diagnosis stays in the visit's main «التشخيص» field (not duplicated here).

  /* ---------- collapsible groups (UI only — never touches field values) ---------- */
  var GROUPS = [
    ['g-ant', '👁️ الفحص الأمامي — Anterior Segment', ['anteriorSegment']],
    ['g-va', '👓 حدة الإبصار والانكسار — Visual Acuity & Refraction', ['refraction', 'iop']],
    ['g-cor', '🔵 فحص القرنية — Corneal Examination', ['cornea']],
    ['g-str', '👀 الحول والحركة — Strabismus / Ocular Motility', ['strabismus', 'ocularMotility']],
    ['g-bin', '🧠 الرؤية الثنائية — Binocular Function', ['binocularFunction']],
    ['g-head', '🧍 وضع الرأس والرأرأة — Head Posture / Nystagmus', ['headPosture']],
    ['g-post', '🔴 فحص قاع العين والشبكية — Posterior Segment / Retina', ['posteriorSegment']],
    ['g-draw', '🩻 الرسومات — Retinal / Corneal Drawings', ['cornealDiagram', 'retinalDrawing']],
    ['g-map', '🗺️ خريطة العين التفاعلية — Interactive Eye Mapping', ['ophEyeMap']],
    ['g-inv', '📊 الفحوصات والتصوير — Ophthalmology Investigations', ['investigations']],
    ['g-att', '📎 المرفقات — Attachments', ['files']],
    ['g-cl', '🔍 العدسات اللاصقة — Contact Lens', ['ophContactLens']],
    ['g-rx', '🖨️ وصفة النظارة — Glasses Prescription', ['ophGlassesRx']],
    ['g-cmp', '📈 مقارنة بالزيارات السابقة — Previous Visit Comparison', ['ophCompare']],
    ['g-plan', '📝 الانطباع والخطة — Impression / Plan', ['comments']]
  ];
  // a group "has data" exactly when one of its sections would be saved (same logic as Save)
  function refreshDots(box) {
    var saved = {};
    try { var r = SP.collect(box.parentNode, 'ophthalmology'); saved = (r && r.sections) || {}; } catch (e) {}
    box.querySelectorAll('.oph-group').forEach(function (g) {
      var ids = (g.dataset.ids || '').split(',');
      g.classList.toggle('has-data', ids.some(function (id) { return id && saved[id]; }));
    });
  }
  function buildGroups(anchor) {
    var root = anchor.parentNode;
    if (!root || root.querySelector('.oph-groups')) return;
    var box = document.createElement('div');
    box.className = 'oph-groups';
    box.innerHTML = '<div class="oph-groups-bar"><button type="button" data-oph-all="1">فتح الكل</button><span>|</span><button type="button" data-oph-all="0">إغلاق الكل</button></div>';
    var first = root.querySelector('.sp-section');
    root.insertBefore(box, first);
    GROUPS.forEach(function (gd) {
      var secs = gd[2].map(function (id) { return root.querySelector('.sp-section[data-sid="' + id + '"]'); }).filter(Boolean);
      if (!secs.length) return;
      var g = document.createElement('div');
      g.className = 'oph-group';
      g.dataset.ids = gd[2].join(',');
      g.innerHTML = '<button type="button" class="oph-group-head" aria-expanded="false"><span class="oph-pm">+</span><span class="oph-gt">' + gd[1] + '</span><span class="oph-dot" title="يحتوي على بيانات">●</span></button><div class="oph-group-body"><div class="oph-group-inner"></div></div>';
      var inner = g.querySelector('.oph-group-inner');
      secs.forEach(function (s) { inner.appendChild(s); });
      box.appendChild(g);
    });
    // any remaining (old-style) sections go after the groups, unchanged
    refreshDots(box);
    box.addEventListener('input', function () { refreshDots(box); });
    box.addEventListener('change', function () { refreshDots(box); setTimeout(function () { refreshDots(box); }, 800); });
    box.addEventListener('click', function () { setTimeout(function () { refreshDots(box); }, 50); });
  }
  function setOpen(g, open) {
    g.classList.toggle('open', open);
    var h = g.querySelector('.oph-group-head');
    h.setAttribute('aria-expanded', open ? 'true' : 'false');
    h.querySelector('.oph-pm').textContent = open ? '−' : '+';
  }
  if (!window.__clinicAccordion) { window.__clinicAccordion = true;
  document.addEventListener('click', function (e) {
    if (!e.target.closest) return;
    var h = e.target.closest('.oph-group-head');
    if (h) { e.preventDefault(); var g = h.parentNode; setOpen(g, !g.classList.contains('open')); return; }
    var a = e.target.closest('[data-oph-all]');
    if (a) {
      e.preventDefault();
      a.closest('.oph-groups').querySelectorAll('.oph-group').forEach(function (g) { setOpen(g, a.dataset.ophAll === '1'); });
    }
  });
  }
  // build the groups after the last section has been wired (all sections are on the page by then)
  var lastSec = comments;
  var oldWire = lastSec.wire;
  lastSec.wire = function (el) {
    if (typeof oldWire === 'function') oldWire.apply(this, arguments);
    try { buildGroups(el); } catch (err) { console.warn(err); }
  };
})();
} catch (e) { console.error('[specialties-bundle] ophthalmology.js failed:', e); }
/* ==== END ophthalmology.js ==== */

/* ==== BEGIN eye-map.js ==== */
try {
// ============ Ophthalmology: Interactive Eye Mapping (v58) ============
// Additive module for the existing "ophthalmology" specialty (ophthalmology.js).
// Same interaction style as the aesthetic facial map (aesthetic-map.js), but with eye anatomy.
// Saves inside the same visit: exam.sections.ophEyeMap — no new collection, no new rules.
// Data: { markers:[{ id, n, view:'both'|'od'|'os'|'lids', x, y (0..100 % of diagram),
//          eye:'OD'|'OS', region, cat, desc, date, status, notes }], notes }
// Documentation tool only: a marker is never treated as a confirmed diagnosis.
(function () {
  var SP = window.ClinicSpecialty, CC = window.ClinicCare;
  if (!SP) return;
  var esc = SP.escape;
  var ID = 'ophEyeMap', S = 'ophthalmology';
  var W = 300, H = 170;
  var VIEWS = [['both', 'العينان — أمامي (Both eyes)'], ['od', 'العين اليمنى (OD)'], ['os', 'العين اليسرى (OS)'], ['lids', 'الجفون وحول العين (Lids / Periocular)']];
  var REGIONS = [['cornea', 'القرنية (Cornea)'], ['iris', 'القزحية (Iris)'], ['pupil', 'الحدقة (Pupil)'], ['conjunctiva', 'الملتحمة (Conjunctiva)'],
    ['sclera', 'الصلبة (Sclera)'], ['upperLid', 'الجفن العلوي (Upper lid)'], ['lowerLid', 'الجفن السفلي (Lower lid)'], ['periocular', 'حول العين (Periocular)']];
  var CATS = [
    ['exam', 'نتيجة فحص (Exam finding)', '#2f6fe0'],
    ['inflam', 'التهاب / آفة (Inflammation / Lesion)', '#d6336c'],
    ['diag', 'ملاحظة تشخيصية (Diagnostic observation)', '#6b5bd2'],
    ['planned', 'إجراء مخطط (Planned procedure)', '#e8890c'],
    ['done', 'إجراء منفذ (Completed procedure)', '#12a17a'],
    ['follow', 'متابعة (Follow-up finding)', '#0e8fa8']
  ];
  var KINDS = [['f', 'نتائج الفحص (Findings)', ['exam', 'inflam', 'diag', 'follow']], ['p', 'خطة العلاج / إجراءات مخططة (Plan)', ['planned']], ['d', 'إجراءات منفذة (Completed)', ['done']]];
  var STATUS = [['', '—'], ['planned', 'مخطط (Planned)'], ['completed', 'تم (Completed)'], ['followup', 'يحتاج متابعة (Follow-up required)']];
  var CFG_KEY = 'cm_oph_map_cats_v1';

  function catOf(k) { for (var i = 0; i < CATS.length; i++) if (CATS[i][0] === k) return CATS[i]; return CATS[0]; }
  function label(list, k) { for (var i = 0; i < list.length; i++) if (list[i][0] === k) return list[i][1]; return k || ''; }
  function opts(list, v) {
    return list.map(function (o) { return '<option value="' + esc(o[0]) + '"' + (o[0] === (v || '') ? ' selected' : '') + '>' + esc(o[1]) + '</option>'; }).join('');
  }
  function today() { return CC && CC.today ? CC.today() : new Date().toISOString().slice(0, 10); }
  function hidden() { try { return JSON.parse(localStorage.getItem(CFG_KEY) || '[]'); } catch (e) { return []; } }
  function activeCats(cur) { var h = hidden(); return CATS.filter(function (c) { return h.indexOf(c[0]) < 0 || c[0] === cur; }); }
  function eyeTxt(e) { return e === 'OS' ? 'OS — اليسرى' : 'OD — اليمنى'; }

  /* ---------- SVG eye (anatomical regions are real clickable shapes) ---------- */
  function almond(cx, cy, s, k) {
    var w = 46 * s * k, t = 22 * s * k, b = 18 * s * k;
    return 'M' + (cx - w) + ' ' + cy + ' C' + (cx - w * 0.5) + ' ' + (cy - t * 1.5) + ' ' + (cx + w * 0.5) + ' ' + (cy - t * 1.5) + ' ' + (cx + w) + ' ' + cy +
      ' C' + (cx + w * 0.5) + ' ' + (cy + b * 1.5) + ' ' + (cx - w * 0.5) + ' ' + (cy + b * 1.5) + ' ' + (cx - w) + ' ' + cy + ' Z';
  }
  function eye(cx, cy, s, ek, mode) {
    // mode: 'all' | 'lids' (globe faded, only lids/periocular clickable)
    var g = mode === 'lids' ? ' style="pointer-events:none" opacity=".45"' : '';
    function R(r) { return ' class="em-r" data-region="' + r + '" data-eye="' + ek + '"'; }
    var w = 46 * s;
    // upper lid band: from brow-side curve to almond top
    var up = 'M' + (cx - w * 1.12) + ' ' + cy + ' C' + (cx - w * 0.6) + ' ' + (cy - 52 * s) + ' ' + (cx + w * 0.6) + ' ' + (cy - 52 * s) + ' ' + (cx + w * 1.12) + ' ' + cy +
      ' L' + (cx + w) + ' ' + cy + ' C' + (cx + w * 0.5) + ' ' + (cy - 33 * s) + ' ' + (cx - w * 0.5) + ' ' + (cy - 33 * s) + ' ' + (cx - w) + ' ' + cy + ' Z';
    var lo = 'M' + (cx - w * 1.12) + ' ' + cy + ' C' + (cx - w * 0.6) + ' ' + (cy + 42 * s) + ' ' + (cx + w * 0.6) + ' ' + (cy + 42 * s) + ' ' + (cx + w * 1.12) + ' ' + cy +
      ' L' + (cx + w) + ' ' + cy + ' C' + (cx + w * 0.5) + ' ' + (cy + 27 * s) + ' ' + (cx - w * 0.5) + ' ' + (cy + 27 * s) + ' ' + (cx - w) + ' ' + cy + ' Z';
    return '<g>' +
      '<ellipse' + R('periocular') + ' cx="' + cx + '" cy="' + cy + '" rx="' + (70 * s) + '" ry="' + (58 * s) + '" fill="#fbf1e9" stroke="#d9c7b8" stroke-width="1"/>' +
      '<path d="M' + (cx - w) + ' ' + (cy - 44 * s) + ' C' + (cx - w * 0.3) + ' ' + (cy - 60 * s) + ' ' + (cx + w * 0.4) + ' ' + (cy - 60 * s) + ' ' + (cx + w * 1.05) + ' ' + (cy - 46 * s) + '" fill="none" stroke="#8a7766" stroke-width="' + (4 * s) + '" stroke-linecap="round" style="pointer-events:none"/>' +
      '<path' + R('upperLid') + ' d="' + up + '" fill="#f3dccb" stroke="#b9a08c" stroke-width="1"/>' +
      '<path' + R('lowerLid') + ' d="' + lo + '" fill="#f3dccb" stroke="#b9a08c" stroke-width="1"/>' +
      '<g' + g + '>' +
      '<path' + R('conjunctiva') + ' d="' + almond(cx, cy, s, 1) + '" fill="#f9dede" stroke="#8a94a8" stroke-width="1.2"/>' +
      '<path' + R('sclera') + ' d="' + almond(cx, cy, s, 0.84) + '" fill="#ffffff" stroke="#e6c9c9" stroke-width=".8"/>' +
      '<circle' + R('cornea') + ' cx="' + cx + '" cy="' + cy + '" r="' + (18 * s) + '" fill="#e3efff" stroke="#9fb7d6" stroke-width=".8"/>' +
      '<circle' + R('iris') + ' cx="' + cx + '" cy="' + cy + '" r="' + (13.5 * s) + '" fill="#6f93b8" stroke="#46698e" stroke-width=".8"/>' +
      '<circle' + R('pupil') + ' cx="' + cx + '" cy="' + cy + '" r="' + (5.5 * s) + '" fill="#1f2430"/>' +
      '<circle cx="' + (cx + 3 * s) + '" cy="' + (cy - 3 * s) + '" r="' + (1.6 * s) + '" fill="#fff" style="pointer-events:none"/>' +
      '</g></g>';
  }
  function lab(x, y, t) { return '<text x="' + x + '" y="' + y + '" text-anchor="middle" font-size="9" fill="#46506a" style="pointer-events:none;font-family:sans-serif">' + esc(t) + '</text>'; }
  function drawing(view) {
    // Facing the patient: the patient's RIGHT eye (OD) appears on the viewer's LEFT.
    if (view === 'od') return eye(150, 88, 1.75, 'OD', 'all') + lab(150, 165, 'OD — العين اليمنى للمريض') + lab(272, 20, 'Nasal أنفي') + lab(28, 20, 'Temporal صدغي') ;
    if (view === 'os') return eye(150, 88, 1.75, 'OS', 'all') + lab(150, 165, 'OS — العين اليسرى للمريض') + lab(28, 20, 'Nasal أنفي') + lab(272, 20, 'Temporal صدغي');
    var m = view === 'lids' ? 'lids' : 'all';
    return eye(78, 80, 0.95, 'OD', m) + eye(222, 80, 0.95, 'OS', m) +
      '<path d="M150 70 C146 95 144 112 150 122" fill="none" stroke="#b9a08c" stroke-width="1.2" style="pointer-events:none"/>' +
      lab(78, 150, 'OD — يمين المريض') + lab(222, 150, 'OS — يسار المريض') + lab(150, 164, '(المنظر كأنك تواجه المريض)');
  }
  function svg(view, markers, sel, interactive) {
    var m = markers.filter(function (p) { return p.view === view; }).map(function (p) {
      var c = catOf(p.cat)[2], x = p.x * W / 100, y = p.y * H / 100, on = sel === p.id;
      return '<g class="em-mk" data-id="' + esc(p.id) + '"' + (interactive ? ' style="cursor:pointer"' : '') + '>' +
        (on ? '<circle cx="' + x + '" cy="' + y + '" r="10" fill="none" stroke="' + c + '" stroke-width="2" opacity=".6"/>' : '') +
        '<circle cx="' + x + '" cy="' + y + '" r="6.5" fill="' + c + '" stroke="#fff" stroke-width="1.5"/>' +
        '<text x="' + x + '" y="' + (y + 2.6) + '" text-anchor="middle" font-size="7.5" font-weight="700" fill="#fff" style="pointer-events:none;font-family:sans-serif">' + p.n + '</text></g>';
    }).join('');
    return '<svg class="afm-svg em-svg" viewBox="0 0 ' + W + ' ' + H + '" preserveAspectRatio="xMidYMid meet" role="img" aria-label="' + esc(label(VIEWS, view)) + '">' +
      '<rect width="' + W + '" height="' + H + '" fill="#f4f6fa"/>' + drawing(view) + m + '</svg>';
  }
  function legend() {
    return '<div class="afm-legend">' + CATS.map(function (t) { return '<span><i style="background:' + t[2] + '"></i>' + esc(t[1]) + '</span>'; }).join('') + '</div>';
  }
  var HEAD = ['#', 'العين', 'الموقع التشريحي', 'التصنيف', 'الوصف', 'التاريخ', 'الحالة', 'ملاحظات'];
  function rows(ms) {
    return ms.map(function (p) {
      return [String(p.n), p.eye || '—', label(REGIONS, p.region) || '—', catOf(p.cat)[1], p.desc || '—', p.date || '—', label(STATUS, p.status || '') , p.notes || '—'];
    });
  }
  function groupedTables(ms) {
    if (!ms.length) return '<p class="muted">لا توجد علامات مطابقة.</p>';
    return KINDS.map(function (k) {
      var list = ms.filter(function (p) { return k[2].indexOf(p.cat) >= 0; });
      return list.length ? '<h5 class="em-kind">' + esc(k[1]) + ' (' + list.length + ')</h5>' + SP.tableHtml(HEAD, rows(list)) : '';
    }).join('');
  }
  function summary(v) {
    var ms = (v && v.markers) || []; if (!ms.length) return '';
    var od = ms.filter(function (p) { return p.eye === 'OD'; }).length;
    return '● ' + ms.length + ' علامة • OD ' + od + ' • OS ' + (ms.length - od);
  }
  function prevVisits() { try { var p = CC && CC.getPatient && CC.getPatient(); return p && CC.visitsFor ? CC.visitsFor(p) : []; } catch (e) { return []; } }

  /* ---------- editor ---------- */
  function editorHtml(p) {
    if (!p) return '<p class="muted afm-hint">اضغط على جزء من العين (القرنية، القزحية، الحدقة، الملتحمة، الصلبة، الجفون، حول العين) لإضافة علامة، أو اختر علامة موجودة لتعديلها. العلامة توثيق فقط وليست تشخيصاً مؤكداً.</p>';
    return '<div class="afm-ed" style="border-inline-start:4px solid ' + catOf(p.cat)[2] + '">' +
      '<div class="afm-ed-h"><b>علامة رقم ' + p.n + '</b> <span class="muted">' + esc(eyeTxt(p.eye)) + '</span>' +
      '<button type="button" class="btn small danger em-del">🗑 حذف العلامة</button></div>' +
      '<div class="grid-2 sx-grid">' +
      '<div class="field"><label>العين (Eye)</label><select data-f="eye">' + opts([['OD', 'OD — اليمنى (Right)'], ['OS', 'OS — اليسرى (Left)']], p.eye) + '</select></div>' +
      '<div class="field"><label>الموقع التشريحي (Region)</label><select data-f="region">' + opts(REGIONS, p.region) + '</select></div>' +
      '<div class="field"><label>التصنيف (Category)</label><select data-f="cat">' + opts(activeCats(p.cat), p.cat) + '</select></div>' +
      '<div class="field"><label>الحالة (Status)</label><select data-f="status">' + opts(STATUS, p.status) + '</select></div>' +
      '<div class="field" style="grid-column:1 / -1"><label>الوصف الإكلينيكي (Description)</label><input data-f="desc" value="' + esc(p.desc || '') + '" placeholder="مثال: Corneal abrasion 2mm, inferior" /></div>' +
      '<div class="field"><label>تاريخ الفحص / الإجراء</label><input type="date" data-f="date" value="' + esc(p.date || '') + '" /></div>' +
      '<div class="field" style="grid-column:1 / -1"><label>ملاحظات</label><textarea data-f="notes" rows="2">' + esc(p.notes || '') + '</textarea></div>' +
      '</div></div>';
  }
  function cfgHtml() {
    var h = hidden();
    return '<details class="em-cfg"><summary>⚙️ التصنيفات الظاهرة في هذا الجهاز</summary>' + CATS.map(function (c) {
      return '<label class="em-cfg-i"><input type="checkbox" data-cat="' + c[0] + '"' + (h.indexOf(c[0]) < 0 ? ' checked' : '') + '/> <i style="background:' + c[2] + '"></i>' + esc(c[1]) + '</label>';
    }).join('') + '</details>';
  }
  function historyHtml() {
    var out = [];
    prevVisits().forEach(function (vis) {
      var s = vis && vis.exam && vis.exam.sections && vis.exam.sections[ID];
      (s && s.markers || []).forEach(function (p) {
        out.push([vis.date || '—', p.eye || '—', label(REGIONS, p.region), catOf(p.cat)[1], p.desc || '—', label(STATUS, p.status || '')]);
      });
    });
    if (!out.length) return '';
    return '<details class="em-hist"><summary>🕘 علامات الزيارات السابقة (' + out.length + ') — للاطلاع فقط</summary>' +
      SP.tableHtml(['الزيارة', 'العين', 'الموقع', 'التصنيف', 'الوصف', 'الحالة'], out) + '</details>';
  }

  var section = {
    id: ID,
    title: '🗺️ خريطة العين التفاعلية (Interactive Eye Mapping)',
    html: function (v) {
      v = v || {};
      return '<div class="afm em" data-val="' + esc(JSON.stringify(v)) + '">' +
        '<div class="afm-tabs">' + VIEWS.map(function (w, i) {
          return '<button type="button" class="afm-tab' + (i ? '' : ' on') + '" data-view="' + w[0] + '">' + esc(w[1]) + ' <span class="afm-c"></span></button>';
        }).join('') + '</div>' +
        '<div class="afm-main em-main"><div class="afm-stage em-stage"></div><div class="afm-side"><div class="afm-editor"></div></div></div>' +
        legend() + cfgHtml() +
        '<h4 class="afm-h">ملخص الفحص والإجراءات (Examination & Procedure Summary)</h4>' +
        '<div class="em-filters"><select class="em-fe"><option value="">كل العيون</option><option value="OD">OD — اليمنى</option><option value="OS">OS — اليسرى</option></select>' +
        '<select class="em-fc"><option value="">كل التصنيفات</option>' + opts(CATS.map(function (c) { return [c[0], c[1]]; }), '') + '</select></div>' +
        '<div class="afm-table em-table"></div>' +
        '<div class="field"><label>ملاحظات عامة على الخريطة</label><textarea class="em-notes" rows="2">' + esc(v.notes || '') + '</textarea></div>' +
        historyHtml() + '</div>';
    },
    wire: function (el) {
      var root = el.querySelector('.em');
      if (!root) return;
      var v = {}; try { v = JSON.parse(root.getAttribute('data-val') || '{}'); } catch (e) {}
      var st = root._st = { markers: (v.markers || []).map(function (p) { return Object.assign({}, p); }), view: 'both', sel: null };
      var nextId = 0;
      function find(id) { for (var i = 0; i < st.markers.length; i++) if (st.markers[i].id === id) return st.markers[i]; }
      function renumber() { st.markers.forEach(function (p, i) { p.n = i + 1; }); }
      function drawStage() { root.querySelector('.em-stage').innerHTML = svg(st.view, st.markers, st.sel, true); }
      function drawCounts() {
        root.querySelectorAll('.afm-tab').forEach(function (b) {
          var c = st.markers.filter(function (p) { return p.view === b.dataset.view; }).length;
          b.querySelector('.afm-c').textContent = c ? '(' + c + ')' : '';
          b.classList.toggle('on', b.dataset.view === st.view);
        });
      }
      function drawTable() {
        var fe = root.querySelector('.em-fe').value, fc = root.querySelector('.em-fc').value;
        var ms = st.markers.filter(function (p) { return (!fe || p.eye === fe) && (!fc || p.cat === fc); });
        root.querySelector('.em-table').innerHTML = st.markers.length ? groupedTables(ms) : '<p class="muted">لا توجد علامات بعد.</p>';
        var box = el.closest && el.closest('.oph-group');
        if (CC && CC.setSummary) CC.setSummary(el.querySelector('.cc-box[data-cc="' + ID + '"]'), summary({ markers: st.markers }));
        if (box) box.classList.toggle('has-data', !!st.markers.length || box.classList.contains('has-data'));
      }
      function drawEditor() { root.querySelector('.afm-editor').innerHTML = editorHtml(find(st.sel)); }
      function all() { drawStage(); drawCounts(); drawTable(); drawEditor(); }
      root.querySelector('.afm-tabs').addEventListener('click', function (e) {
        var b = e.target.closest('.afm-tab'); if (!b) return;
        st.view = b.dataset.view; var s = find(st.sel); if (s && s.view !== st.view) st.sel = null; all();
      });
      root.querySelector('.em-filters').addEventListener('change', drawTable);
      root.querySelector('.em-stage').addEventListener('click', function (e) {
        var mk = e.target.closest('.em-mk');
        if (mk) { st.sel = mk.dataset.id; drawStage(); drawEditor(); return; }
        var r = e.target.closest('.em-r'); if (!r) return; // only real anatomical regions add markers
        var s = e.target.closest('svg'), pt = s.createSVGPoint(); pt.x = e.clientX; pt.y = e.clientY;
        var m = s.getScreenCTM(); if (!m) return;
        var q = pt.matrixTransform(m.inverse());
        var last = st.markers[st.markers.length - 1], cats = activeCats('');
        var p = { id: 'm' + Date.now().toString(36) + (nextId++), view: st.view,
          x: Math.round(q.x / W * 1000) / 10, y: Math.round(q.y / H * 1000) / 10,
          eye: r.getAttribute('data-eye'), region: r.getAttribute('data-region'),
          cat: last && cats.some(function (c) { return c[0] === last.cat; }) ? last.cat : (cats[0] || CATS[0])[0],
          desc: '', date: today(), status: '', notes: '' };
        p.status = p.cat === 'planned' ? 'planned' : (p.cat === 'done' ? 'completed' : '');
        st.markers.push(p); renumber(); st.sel = p.id; all();
      });
      var ed = root.querySelector('.afm-editor');
      function onEdit(e) {
        var f = e.target.getAttribute && e.target.getAttribute('data-f'), p = find(st.sel);
        if (!f || !p) return;
        p[f] = e.target.value;
        if (f === 'cat') {
          if (p.cat === 'planned' && !p.status) p.status = 'planned';
          if (p.cat === 'done' && (!p.status || p.status === 'planned')) p.status = 'completed';
          var ss = ed.querySelector('[data-f="status"]'); if (ss) ss.value = p.status;
          ed.querySelector('.afm-ed').style.borderInlineStartColor = catOf(p.cat)[2];
        }
        if (f === 'eye') ed.querySelector('.afm-ed-h .muted').textContent = eyeTxt(p.eye);
        if (f === 'cat' || f === 'eye') drawStage();
        drawTable();
      }
      ed.addEventListener('input', onEdit); ed.addEventListener('change', onEdit);
      ed.addEventListener('click', function (e) {
        if (!e.target.closest('.em-del')) return;
        if (!confirm('حذف هذه العلامة؟')) return;
        st.markers = st.markers.filter(function (p) { return p.id !== st.sel; }); renumber(); st.sel = null; all();
      });
      root.querySelector('.em-cfg').addEventListener('change', function (e) {
        var k = e.target.getAttribute('data-cat'); if (!k) return;
        var h = hidden().filter(function (x) { return x !== k; }); if (!e.target.checked) h.push(k);
        try { localStorage.setItem(CFG_KEY, JSON.stringify(h)); } catch (er) {}
        drawEditor();
      });
      all();
    },
    collect: function (el) {
      var root = el.querySelector('.em'); if (!root || !root._st) return null;
      var ms = root._st.markers.map(function (p) {
        var o = {}; Object.keys(p).forEach(function (k) { if (p[k] !== '' && p[k] != null) o[k] = p[k]; }); return o;
      });
      var n = (root.querySelector('.em-notes').value || '').trim();
      if (!ms.length && !n) return null;
      var out = { markers: ms }; if (n) out.notes = n;
      return out;
    },
    render: function (v) {
      if (!v || !(v.markers || []).length && !v.notes) return '';
      var ms = v.markers || [];
      var views = VIEWS.filter(function (w) { return ms.some(function (p) { return p.view === w[0]; }); });
      return '<div class="afm-print">' + views.map(function (w) {
        return '<div class="afm-pv em-pv"><div class="muted">' + esc(w[1]) + '</div>' + svg(w[0], ms, null, false) + '</div>';
      }).join('') + '</div>' + (ms.length ? legend() + '<div class="afm-table">' + groupedTables(ms) + '</div>' : '') +
        (v.notes ? '<p><b>ملاحظات الخريطة:</b> ' + esc(v.notes) + '</p>' : '');
    }
  };
  SP.addSection(S, section);
  // place the map just before «الانطباع والخطة» (comments), keeping every other section's order
  try {
    var spec = SP.list().filter(function (x) { return x.id === S; })[0];
    var ids = (spec && spec.sections || []).map(function (x) { return x.id; }).filter(function (x) { return x !== ID; });
    var at = ids.indexOf('comments'); if (at < 0) at = ids.length;
    ids.splice(at, 0, ID);
    SP.orderSections(S, ids);
  } catch (e) { console.warn(e); }
  window.ClinicEyeMap = { section: section, svg: svg };
})();
} catch (e) { console.error('[specialties-bundle] eye-map.js failed:', e); }
/* ==== END eye-map.js ==== */

/* ==== BEGIN oph-plus.js ==== */
try {
// ============ Ophthalmology plus (v68) — Contact lens · Glasses prescription print · Previous visit comparison ============
// Additive only. Saves inside the same visit: exam.sections.ophContactLens / ophGlassesRx.
// Glasses SPH/CYL/Axis/ADD/PD are NOT duplicated: they are read live from the existing
// «refraction» section. Comparison is read-only and never saves or edits older visits.
// Nothing here calculates or recommends lens or glasses parameters.
(function () {
  var SP = window.ClinicSpecialty;
  if (!SP) return;
  var CC = window.ClinicCare;
  var esc = SP.escape;
  var S = 'ophthalmology';
  var NR = 'غير مسجل (Not recorded)';
  var EYES = [{ k: 'right', l: 'العين اليمنى (OD)' }, { k: 'left', l: 'العين اليسرى (OS)' }];

  function gv(o, k) { return k.split('.').reduce(function (a, p) { return a == null ? undefined : a[p]; }, o); }
  function sv(o, k, x) { var ps = k.split('.'), c = o; for (var i = 0; i < ps.length - 1; i++) c = c[ps[i]] || (c[ps[i]] = {}); c[ps[ps.length - 1]] = x; }
  function inp(f, path, v) {
    var x = gv(v || {}, path); x = x == null ? '' : String(x);
    var a = ' class="opx-f" data-p="' + path + '"';
    if (f.opts) return '<select' + a + '>' + f.opts.map(function (o) {
      return '<option value="' + esc(o) + '"' + (o === x ? ' selected' : '') + '>' + (o ? esc(o) : '—') + '</option>';
    }).join('') + '</select>';
    if (f.area) return '<textarea' + a + ' rows="2" placeholder="' + esc(f.ph || '') + '">' + esc(x) + '</textarea>';
    return '<input' + a + ' type="' + (f.type || 'text') + '" value="' + esc(x) + '" placeholder="' + esc(f.ph || '') + '" />';
  }
  function field(f, v) {
    return '<div class="field"' + (f.area ? ' style="grid-column:1 / -1;"' : '') + '><label>' + esc(f.l) + '</label>' + inp(f, f.k, v) + '</div>';
  }
  function collectAll(el) {
    var out = {}, any = false;
    el.querySelectorAll('.opx-f').forEach(function (i) { var x = (i.value || '').trim(); if (x) { sv(out, i.dataset.p, x); any = true; } });
    return any ? out : null;
  }
  function eyeTable(cols, v) {
    return '<div class="table-wrap"><table class="rfx"><thead><tr><th>العين</th>' +
      cols.map(function (c) { return '<th>' + esc(c.l) + '</th>'; }).join('') + '</tr></thead><tbody>' +
      EYES.map(function (e) {
        return '<tr><td>' + esc(e.l) + '</td>' + cols.map(function (c) { return '<td>' + inp(c, e.k + '.' + c.k, v) + '</td>'; }).join('') + '</tr>';
      }).join('') + '</tbody></table></div>';
  }
  function eyeRender(cols, v) {
    var used = cols.filter(function (c) { return EYES.some(function (e) { return gv(v, e.k + '.' + c.k); }); });
    if (!used.length) return '';
    return SP.tableHtml(['العين'].concat(used.map(function (c) { return c.l; })),
      EYES.map(function (e) { return [e.l].concat(used.map(function (c) { return gv(v, e.k + '.' + c.k) || '-'; })); }));
  }
  function fieldsRender(list, v) {
    var rows = list.filter(function (f) { return gv(v, f.k); }).map(function (f) { return [f.l, gv(v, f.k)]; });
    return rows.length ? SP.tableHtml(['البند', 'القيمة'], rows) : '';
  }

  /* ================= 1. Contact lens ================= */
  var CL_EYE = [
    { k: 'bc', l: 'BC (Base curve)', ph: '8.6' },
    { k: 'dia', l: 'DIA (Diameter)', ph: '14.2' },
    { k: 'sph', l: 'SPH', ph: '-2.00' },
    { k: 'cyl', l: 'CYL', ph: '-0.75' },
    { k: 'axis', l: 'Axis', ph: '180' }
  ];
  var CL_TOP = [
    { k: 'indication', l: 'سبب الاستخدام (Indication)', ph: 'Myopia / Keratoconus / Bandage...' },
    { k: 'lensType', l: 'نوع العدسة (Lens type)', opts: ['', 'Soft', 'Rigid Gas Permeable (RGP)', 'Toric', 'Multifocal', 'Therapeutic', 'أخرى (Other)'] },
    { k: 'lensTypeOther', l: 'نوع آخر (Other type)', ph: '' },
    { k: 'brand', l: 'الماركة / المنتج (Brand / product)', ph: '' }
  ];
  var CL_BOTTOM = [
    { k: 'schedule', l: 'نظام الارتداء (Wearing schedule)', ph: 'Daily wear 8h...' },
    { k: 'replacement', l: 'معدل التغيير (Replacement frequency)', ph: 'Monthly...' },
    { k: 'fitting', l: 'تقييم التركيب (Fitting assessment)', area: true },
    { k: 'comfort', l: 'الراحة (Comfort)', ph: '' },
    { k: 'cornealResponse', l: 'استجابة القرنية / المضاعفات (Corneal response / complications)', area: true },
    { k: 'instructions', l: 'تعليمات المريض (Patient instructions)', area: true },
    { k: 'followUp', l: 'موعد المتابعة (Follow-up date)', type: 'date' },
    { k: 'notes', l: 'ملاحظات إضافية (Additional notes)', area: true }
  ];
  SP.addSection(S, {
    id: 'ophContactLens',
    title: '🔍 العدسات اللاصقة (Contact Lens)',
    html: function (v) {
      v = v || {};
      return '<p class="muted">يدخل الطبيب كل القياسات ويؤكدها — لا يحسب البرنامج أي قيم.</p>' +
        '<div class="grid-2">' + CL_TOP.map(function (f) { return field(f, v); }).join('') + '</div>' +
        eyeTable(CL_EYE, v) +
        '<div class="grid-2">' + CL_BOTTOM.map(function (f) { return field(f, v); }).join('') + '</div>';
    },
    collect: collectAll,
    render: function (v) { return fieldsRender(CL_TOP, v) + eyeRender(CL_EYE, v) + fieldsRender(CL_BOTTOM, v); }
  });

  /* ================= 2. Glasses prescription (print) ================= */
  var GL_EYE = [{ k: 'prism', l: 'Prism', ph: '2Δ' }, { k: 'base', l: 'Base', opts: ['', 'IN', 'OUT', 'UP', 'DOWN'] }];
  var GL_TOP = [
    { k: 'date', l: 'تاريخ الوصفة (Prescription date)', type: 'date' },
    { k: 'expiry', l: 'المتابعة / الصلاحية (Follow-up / expiry)', type: 'date' },
    { k: 'doctor', l: 'اسم الطبيب (Doctor name)', ph: '' },
    { k: 'specialty', l: 'التخصص (Specialty)', ph: 'Ophthalmology' },
    { k: 'notes', l: 'ملاحظات الوصفة (Prescription notes)', area: true }
  ];
  function refrOf(form) {
    var out = {};
    var sec = form && form.querySelector('.sp-section[data-sid="refraction"]');
    if (!sec) return out;
    sec.querySelectorAll('tr[data-eye]').forEach(function (tr) {
      var row = {};
      tr.querySelectorAll('.rfx-f').forEach(function (i) { var x = (i.value || '').trim(); if (x) row[i.dataset.k] = x; });
      out[tr.dataset.eye] = row;
    });
    return out;
  }
  function rootOf(el) { var g = el.closest('.oph-groups'); return g ? g.parentNode : el.parentNode; }
  function doctorDefault() {
    var p = window.currentUserProfile || {};
    return p.name || p.fullName || p.displayName || '';
  }
  function rxHtml(d) {
    var p = d.patient || {}, cell = function (x) { return esc(x || '—'); };
    var rows = [['SPH', 'sph'], ['CYL', 'cyl'], ['Axis', 'axis'], ['ADD', 'add']].map(function (r) {
      return '<tr><th>' + r[0] + '</th><td>' + cell(gv(d.refr, 'right.' + r[1])) + '</td><td>' + cell(gv(d.refr, 'left.' + r[1])) + '</td></tr>';
    }).join('') + '<tr><th>Prism</th>' + EYES.map(function (e) {
      var pr = gv(d.v, e.k + '.prism'), b = gv(d.v, e.k + '.base');
      return '<td>' + cell(pr ? pr + (b ? ' base ' + b : '') : '') + '</td>';
    }).join('') + '</tr>';
    var pdR = gv(d.refr, 'right.pd'), pdL = gv(d.refr, 'left.pd');
    return '<div class="gx-rx" dir="ltr">' +
      '<h2>Glasses Prescription — وصفة نظارة</h2>' +
      '<table class="gx-meta"><tr><td><b>Patient:</b> ' + cell(p.fullName || p.patientName) + '</td><td><b>ID / Phone:</b> ' + cell(p.idNumber || p.phone) + '</td></tr>' +
      '<tr><td><b>Date:</b> ' + cell(d.v.date) + '</td><td><b>Follow-up / expiry:</b> ' + cell(d.v.expiry) + '</td></tr></table>' +
      '<table class="gx-tbl"><thead><tr><th></th><th>Right eye (OD)</th><th>Left eye (OS)</th></tr></thead><tbody>' + rows + '</tbody></table>' +
      '<p><b>PD:</b> ' + (pdR || pdL ? 'OD ' + cell(pdR) + ' / OS ' + cell(pdL) + ' mm' : '—') + '</p>' +
      (d.v.notes ? '<p><b>Notes:</b> ' + esc(d.v.notes) + '</p>' : '') +
      '<div class="gx-sign"><div><b>' + cell(d.v.doctor) + '</b><br>' + cell(d.v.specialty) + '</div><div>Signature: ____________</div></div></div>';
  }
  var RX_CSS = 'body{font-family:Arial,Tahoma,sans-serif;margin:24px;color:#111}.gx-rx h2{text-align:center;margin:0 0 16px;font-size:20px}' +
    '.gx-meta{width:100%;margin-bottom:14px;border-collapse:collapse}.gx-meta td{padding:4px 2px;font-size:14px}' +
    '.gx-tbl{width:100%;border-collapse:collapse;margin-bottom:12px}.gx-tbl th,.gx-tbl td{border:1px solid #333;padding:8px;text-align:center;font-size:15px}' +
    '.gx-tbl thead th{background:#eef2f7}.gx-sign{display:flex;justify-content:space-between;margin-top:40px;font-size:14px}';
  function printRx(html) {
    var f = document.createElement('iframe');
    f.style.cssText = 'position:fixed;width:0;height:0;border:0;right:0;bottom:0;';
    document.body.appendChild(f);
    var doc = f.contentWindow.document;
    doc.open();
    doc.write('<!doctype html><html><head><meta charset="utf-8"><title>Glasses Prescription</title><style>' + RX_CSS + '</style></head><body>' + html + '</body></html>');
    doc.close();
    setTimeout(function () { try { f.contentWindow.focus(); f.contentWindow.print(); } catch (e) {} setTimeout(function () { f.remove(); }, 1500); }, 250);
  }
  SP.addSection(S, {
    id: 'ophGlassesRx',
    title: '🖨️ وصفة النظارة (Glasses Prescription)',
    html: function (v) {
      v = v || {};
      var top = GL_TOP.map(function (f) {
        var vv = v;
        if (f.k === 'doctor' && !v.doctor) { vv = Object.assign({}, v, { doctor: doctorDefault() }); }
        return field(f, vv);
      }).join('');
      return '<p class="muted">قيم SPH / CYL / Axis / ADD / PD تؤخذ من جدول «حدة الإبصار والانكسار» نفسه (بدون تكرار). عدّلها هناك ثم راجع الوصفة.</p>' +
        '<div class="grid-2">' + top + '</div>' + eyeTable(GL_EYE, v) +
        '<div class="row" style="gap:8px;flex-wrap:wrap;margin-top:8px"><button type="button" class="btn small opx-preview">👁️ مراجعة الوصفة</button>' +
        '<button type="button" class="btn small primary opx-print">🖨️ طباعة الوصفة</button></div>' +
        '<div class="opx-rx-preview" hidden></div>';
    },
    wire: function (el) {
      function data() {
        var form = rootOf(el);
        var v = collectAll(el) || {};
        if (!v.doctor) v.doctor = doctorDefault();
        return { v: v, refr: refrOf(form), patient: (CC && CC.getPatient && CC.getPatient()) || {} };
      }
      var pv = el.querySelector('.opx-rx-preview');
      el.querySelector('.opx-preview').addEventListener('click', function () {
        pv.hidden = false;
        pv.innerHTML = '<style>' + RX_CSS.replace(/body\{[^}]*\}/, '') + '</style>' + rxHtml(data());
      });
      el.querySelector('.opx-print').addEventListener('click', function () { printRx(rxHtml(data())); });
    },
    collect: collectAll,
    render: function (v) { return fieldsRender(GL_TOP, v) + eyeRender(GL_EYE, v); }
  });

  /* ================= 3. Previous visit comparison (read-only) ================= */
  function ophOf(exam) {
    if (!exam) return null;
    var s = exam.sections || {};
    if (exam.specialty && exam.specialty !== S) return null;
    return (s.refraction || s.iop || s.anteriorSegment || s.posteriorSegment || s.investigations || s.comments || s.ophContactLens) ? s : null;
  }
  function num(x) { var m = String(x == null ? '' : x).trim().match(/^[+-]?\d+(\.\d+)?$/); return m ? parseFloat(m[0]) : null; }
  function snellen(x) { var m = String(x || '').trim().match(/^(\d+(?:\.\d+)?)\s*\/\s*(\d+(?:\.\d+)?)$/); return m ? m : null; }
  // returns '' (no highlight) unless both values are comparable and different
  function changed(a, b, kind) {
    if (a == null || a === '' || b == null || b === '') return false;
    if (kind === 'va') {
      var sa = snellen(a), sb = snellen(b);
      if (sa && sb) return sa[1] === sb[1] && sa[2] !== sb[2];   // same notation & test distance
      var na = num(a), nb = num(b);
      return na != null && nb != null && na !== nb;                 // both decimal
    }
    if (kind === 'num') { var x = num(a), y = num(b); return x != null && y != null && x !== y; }
    return String(a).trim() !== String(b).trim();
  }
  function vOr(x) { return x == null || x === '' ? '<span class="opx-nr">' + NR + '</span>' : '<bdi dir="ltr">' + esc(x) + '</bdi>'; }
  function iopText(e) {
    if (!e || !e.Value) return '';
    return e.Value + ' ' + (e.Unit || '') + (e.Method ? ' · ' + e.Method : '') + (e.Time ? ' · ' + e.Time : '');
  }
  function rowsFor(cur, old) {
    var R = [];
    function add(label, a, b, kind) { R.push([label, a, b, changed(a, b, kind)]); }
    var VA = [['ucva', 'Unaided VA'], ['ph', 'Pin-hole'], ['bcva', 'BCVA'], ['near', 'Near VA'], ['va', 'VA']];
    var RF = [['sph', 'Sph', 'num'], ['cyl', 'Cyl', 'num'], ['axis', 'Axis', 'num'], ['add', 'Add', 'num'], ['pd', 'PD', 'num']];
    EYES.forEach(function (e) {
      var eye = e.k === 'right' ? 'OD' : 'OS';
      VA.forEach(function (c) { add(c[1] + ' ' + eye, gv(cur, 'refraction.' + e.k + '.' + c[0]), gv(old, 'refraction.' + e.k + '.' + c[0]), 'va'); });
      RF.forEach(function (c) { add(c[1] + ' ' + eye, gv(cur, 'refraction.' + e.k + '.' + c[0]), gv(old, 'refraction.' + e.k + '.' + c[0]), 'num'); });
    });
    EYES.forEach(function (e) {
      var a = gv(cur, 'iop.' + e.k) || {}, b = gv(old, 'iop.' + e.k) || {};
      // pressure highlighted only when unit AND method are the same
      var same = (a.Unit || '') === (b.Unit || '') && (a.Method || '') === (b.Method || '');
      R.push(['IOP ' + (e.k === 'right' ? 'OD' : 'OS'), iopText(a), iopText(b), same && changed(a.Value, b.Value, 'num')]);
    });
    function textBlock(sec, label) {
      EYES.forEach(function (e) {
        function txt(s) {
          var o = gv(s, sec + '.' + e.k); if (!o) return '';
          return Object.keys(o).filter(function (k) { return o[k]; }).map(function (k) { return k + ': ' + o[k]; }).join(' · ');
        }
        add(label + ' ' + (e.k === 'right' ? 'OD' : 'OS'), txt(cur), txt(old), 'text');
      });
    }
    textBlock('anteriorSegment', 'Anterior segment');
    textBlock('posteriorSegment', 'Posterior / fundus');
    [['octMacula', 'OCT Macula'], ['octRnfl', 'OCT RNFL'], ['vf', 'Visual field'], ['fundus', 'Fundus photo'], ['topo', 'Topography'], ['bscan', 'B-scan'], ['asOct', 'AS-OCT']].forEach(function (x) {
      function t(s) { var o = gv(s, 'investigations.' + x[0]); if (!o) return ''; return ['od', 'os', 'findings'].filter(function (k) { return o[k]; }).map(function (k) { return k.toUpperCase() + ': ' + o[k]; }).join(' · '); }
      add(x[1], t(cur), t(old), 'text');
    });
    add('Impression', gv(cur, 'comments.imp.impression'), gv(old, 'comments.imp.impression'), 'text');
    add('Plan', gv(cur, 'comments.imp.plan'), gv(old, 'comments.imp.plan'), 'text');
    return R;
  }
  function compareTable(cur, old, oldDate) {
    var rows = rowsFor(cur, old).filter(function (r) { return r[1] || r[2]; });
    if (!rows.length) return '<p class="muted">لا توجد قيم مسجلة للمقارنة.</p>';
    return '<div class="table-wrap"><table class="opx-cmp"><thead><tr><th>البند</th><th>الزيارة الحالية (<bdi dir="ltr">' + esc(new Date().toISOString().slice(0, 10)) + '</bdi>)</th><th>الزيارة السابقة (<bdi dir="ltr">' + esc(oldDate || '—') + '</bdi>)</th></tr></thead><tbody>' +
      rows.map(function (r) { return '<tr' + (r[3] ? ' class="opx-chg"' : '') + '><td><b>' + esc(r[0]) + '</b>' + (r[3] ? ' <span class="opx-badge">تغيّر</span>' : '') + '</td><td>' + vOr(r[1]) + '</td><td>' + vOr(r[2]) + '</td></tr>'; }).join('') +
      '</tbody></table></div><p class="muted">عرض فقط — لا يغيّر الزيارات السابقة ولا يقدّم استنتاجات طبية. يُظلَّل التغيّر فقط عند تطابق نوع القياس والوحدة.</p>';
  }
  SP.addSection(S, {
    id: 'ophCompare',
    title: '📈 مقارنة بالزيارات السابقة (Previous Visit Comparison)',
    html: function () { return '<div class="opx-cmp-box"><div class="field"><label>اختر زيارة سابقة</label><select class="opx-visit"></select></div><div class="opx-cmp-out"></div><button type="button" class="btn small opx-refresh">🔄 تحديث المقارنة</button></div>'; },
    wire: function (el) {
      var sel = el.querySelector('.opx-visit'), out = el.querySelector('.opx-cmp-out');
      function visits() {
        var p = CC && CC.getPatient && CC.getPatient();
        var all = p && CC.visitsFor ? CC.visitsFor(p) : [];
        return all.filter(function (x) { return ophOf(x.exam); }).sort(function (a, b) { return String(b.date || '').localeCompare(String(a.date || '')); });
      }
      function current() {
        var root = rootOf(el);
        try { var r = SP.collect(root, S); return (r && r.sections) || {}; } catch (e) { return {}; }
      }
      function draw() {
        var list = visits(), keep = sel.value;
        sel.innerHTML = list.length ? list.map(function (x, i) { return '<option value="' + i + '">' + esc(x.date || '—') + '</option>'; }).join('') : '<option value="">لا توجد زيارات سابقة</option>';
        if (keep && list[keep]) sel.value = keep;
        var v = list[Number(sel.value || 0)];
        out.innerHTML = v ? compareTable(current(), ophOf(v.exam), v.date) : '<p class="muted">لا توجد زيارات عيون سابقة لهذا المريض.</p>';
      }
      sel.addEventListener('change', draw);
      el.querySelector('.opx-refresh').addEventListener('click', draw);
      document.addEventListener('clinic-patient-changed', function () { if (el.isConnected) draw(); });
      draw();
      el._opxDraw = draw;
    },
    collect: function () { return null; },
    render: function () { return ''; }
  });
  // redraw comparison when its group opens (values may have been typed since)
  document.addEventListener('click', function (e) {
    var h = e.target.closest && e.target.closest('.oph-group-head');
    if (!h) return;
    var s = h.parentNode.querySelector('.sp-section[data-sid="ophCompare"]');
    if (s && s._opxDraw) setTimeout(s._opxDraw, 0);
  });
})();
} catch (e) { console.error('[specialties-bundle] oph-plus.js failed:', e); }
/* ==== END oph-plus.js ==== */

/* ==== BEGIN pediatrics.js ==== */
try {
// ============ Pediatrics module (وحدة الأطفال) ============
// v51: age auto-calculation, weight-based dose calculator, Egyptian growth charts (v54),
// age-based vaccination schedule (editable), attachments.
// Saved data stays in exam.sections[...] — old vaccine records ({name,done,date}) still load.

(function () {
  var SP = window.ClinicSpecialty;
  if (!SP) return;
  var esc = SP.escape;
  var CC = window.ClinicCare || null;
  var ck = window.clinicKey || function (n) { return n; };
  var SCHED_KEY = ck('clinic_vaccine_schedule_v1');

  function wrap(id, title, summary, body) {
    return CC ? CC.box(id, title, summary, body, 'cc-sec') : body;
  }
  function root(el) { return el.closest('.rx-modal-body, #dpForm, .sp-root') || el.parentNode; }
  function fieldVal(el, k) { var f = root(el).querySelector('.sp-f[data-k="' + k + '"]'); return f ? (f.value || '').trim() : ''; }
  function num(v) { var n = parseFloat(String(v || '').replace(',', '.').replace(/[^\d.\-]/g, '')); return isNaN(n) ? null : n; }
  function patient() { return CC ? CC.getPatient() : null; }
  function visitDate(el) {
    var d = root(el).closest('.rx-modal') ? root(el).closest('.rx-modal').querySelector('#rxVisitDate') : document.querySelector('#dpVisitDate');
    return (d && d.value) || (CC ? CC.today() : new Date().toISOString().slice(0, 10));
  }

  /* ================= 1) Age ================= */
  SP.addSection('pediatrics', {
    id: 'age',
    title: '🎂 العمر',
    html: function () {
      return wrap('ped-age', '🎂 العمر (يُحسب من تاريخ الميلاد)', '',
        '<p class="ped-age-text">—</p><p class="muted">يُملأ حقل «العمر (شهور)» تلقائياً ويمكنك تعديله.</p>');
    },
    wire: function (el) {
      function run() {
        var p = patient(), parts = p && CC.ageParts(p.birthDate, visitDate(el));
        var txt = parts ? 'العمر: ' + CC.ageText(parts) : 'لا يوجد تاريخ ميلاد مسجّل للمريض';
        el.querySelector('.ped-age-text').textContent = txt;
        CC && CC.setSummary(el.querySelector('.cc-box'), parts ? CC.ageText(parts) : 'تاريخ الميلاد غير مسجّل');
        var f = root(el).querySelector('.sp-f[data-k="ageMonths"]');
        if (parts && f && (!f.value || f.dataset.auto === '1')) { f.value = String(parts.totalMonths); f.dataset.auto = '1'; }
      }
      var f = root(el).querySelector('.sp-f[data-k="ageMonths"]');
      if (f) f.addEventListener('input', function () { f.dataset.auto = '0'; });
      run();
      document.addEventListener('clinic-patient-changed', run);
    },
    collect: function () { return null; },
    render: function () { return ''; }
  });

  /* ================= 2) Dose calculator ================= */
  var lastMed = null;
  document.addEventListener('focusin', function (e) {
    var r = e.target.closest && e.target.closest('.rx-med');
    if (r) lastMed = r;
  });
  function doseCalc(i) {
    var w = num(i.weight), mgkg = num(i.mgkg), n = num(i.perDay), conc = num(i.conc), max = num(i.max);
    if (!w || !mgkg || !n) return null;
    var daily = w * mgkg, perDose = daily / n;
    var ml = conc ? perDose / (conc / 5) : null;
    return { daily: +daily.toFixed(1), perDose: +perDose.toFixed(1), ml: ml == null ? null : +ml.toFixed(1), over: max ? daily > max : false };
  }
  SP.addSection('pediatrics', {
    id: 'doseCalc',
    title: '🧮 حاسبة الجرعة',
    html: function (v) {
      v = v || {};
      var f = function (k, l, ph) { return '<div class="field"><label>' + l + '</label><input class="dc-' + k + '" value="' + esc(v[k] || '') + '" placeholder="' + esc(ph) + '" inputmode="decimal" /></div>'; };
      return wrap('ped-dose', '🧮 حاسبة الجرعة بالوزن (Dose Calculator)', v.drug ? v.drug : '',
        '<div class="grid-2">' +
        '<div class="field"><label>اسم الدواء</label><input class="dc-drug" value="' + esc(v.drug || '') + '" placeholder="مثال: Amoxicillin" /></div>' +
        f('weight', 'وزن الطفل (كجم)', '11') + f('mgkg', 'الجرعة (مجم/كجم/يوم)', '50') +
        f('perDay', 'عدد الجرعات في اليوم', '3') + f('conc', 'تركيز الشراب (مجم لكل 5 مل)', '250') +
        f('max', 'أقصى جرعة يومية (مجم) — اختياري', '1500') +
        '</div><div class="dc-out"></div>' +
        '<div class="actions" style="margin-top:8px;"><button type="button" class="btn primary small dc-insert">⤵️ إدراج في الروشتة</button></div>' +
        '<p class="cc-note">⚠️ يجب على الطبيب مراجعة الجرعة والتأكد منها.</p>');
    },
    wire: function (el) {
      var get = function (k) { var x = el.querySelector('.dc-' + k); return x ? x.value.trim() : ''; };
      var wIn = el.querySelector('.dc-weight');
      function prefill() { var w = fieldVal(el, 'weight'); if (w && (!wIn.value || wIn.dataset.auto === '1')) { wIn.value = w; wIn.dataset.auto = '1'; calc(); } }
      wIn.addEventListener('input', function () { wIn.dataset.auto = '0'; });
      var wf = root(el).querySelector('.sp-f[data-k="weight"]');
      if (wf) wf.addEventListener('input', prefill);
      function calc() {
        var r = doseCalc({ weight: get('weight'), mgkg: get('mgkg'), perDay: get('perDay'), conc: get('conc'), max: get('max') });
        var out = el.querySelector('.dc-out');
        if (!r) { out.innerHTML = '<p class="muted">أدخل الوزن والجرعة وعدد المرات لحساب الجرعة.</p>'; return null; }
        out.innerHTML = '<div class="dc-res"><div><span>الجرعة الواحدة</span><b>' + r.perDose + ' مجم</b></div>' +
          '<div><span>بالمللي</span><b>' + (r.ml == null ? '—' : r.ml + ' مل') + '</b></div>' +
          '<div><span>إجمالي اليوم</span><b>' + r.daily + ' مجم</b></div></div>' +
          (r.over ? '<div class="cc-warn">⚠️ الجرعة اليومية (' + r.daily + ' مجم) أكبر من أقصى جرعة أدخلتها (' + get('max') + ' مجم).</div>' : '');
        CC && CC.setSummary(el.querySelector('.cc-box'), (get('drug') ? get('drug') + ': ' : '') + r.perDose + ' مجم' + (r.ml != null ? ' = ' + r.ml + ' مل' : ''));
        return r;
      }
      el.addEventListener('input', calc);
      prefill(); calc();
      el.querySelector('.dc-insert').addEventListener('click', function () {
        var r = calc();
        if (!r) { alert('أكمل بيانات الحاسبة أولاً.'); return; }
        var modal = el.closest('.rx-modal');
        if (!modal) { alert('افتح «إنشاء روشتة جديدة» واستخدم الحاسبة من داخل الروشتة لإدراج الجرعة.'); return; }
        var rows = modal.querySelectorAll('.rx-med');
        var row = (lastMed && modal.contains(lastMed)) ? lastMed : null;
        if (!row) Array.prototype.some.call(rows, function (x) { if (!x.querySelector('.rx-dose').value) { row = x; return true; } return false; });
        if (!row) row = rows[rows.length - 1];
        if (!row) return;
        var n = num(get('perDay'));
        if (get('drug') && !row.querySelector('.rx-name').value) row.querySelector('.rx-name').value = get('drug');
        if (get('conc') && !row.querySelector('.rx-strength').value) row.querySelector('.rx-strength').value = get('conc') + ' مجم/5 مل';
        row.querySelector('.rx-dose').value = r.ml != null ? r.ml + ' مل (' + r.perDose + ' مجم)' : r.perDose + ' مجم';
        row.querySelector('.rx-freq').value = n + ' مرات يومياً' + (24 % n === 0 ? ' (كل ' + (24 / n) + ' ساعات)' : '');
        row.querySelector('.rx-name').dispatchEvent(new Event('input', { bubbles: true }));
        row.scrollIntoView({ behavior: 'smooth', block: 'center' });
        row.classList.add('cc-flash'); setTimeout(function () { row.classList.remove('cc-flash'); }, 1200);
      });
    },
    collect: function (el) {
      var o = {};
      ['drug', 'weight', 'mgkg', 'perDay', 'conc', 'max'].forEach(function (k) { var v = el.querySelector('.dc-' + k).value.trim(); if (v) o[k] = v; });
      if (!o.drug && !o.mgkg) return null;
      var r = doseCalc(o);
      if (r) { o.perDoseMg = r.perDose; o.perDoseMl = r.ml; o.dailyMg = r.daily; }
      return o;
    },
    render: function (v) {
      if (!v) return '';
      return '<h4>🧮 حاسبة الجرعة</h4>' + SP.tableHtml(['الدواء', 'الوزن', 'مجم/كجم/يوم', 'مرات', 'الجرعة', 'مل', 'اليوم'],
        [[v.drug || '-', v.weight || '-', v.mgkg || '-', v.perDay || '-', v.perDoseMg != null ? v.perDoseMg + ' مجم' : '-', v.perDoseMl != null ? v.perDoseMl + ' مل' : '-', v.dailyMg != null ? v.dailyMg + ' مجم' : '-']]);
    }
  });

  /* ================= 3) Egyptian growth charts (v54) ================= */
  // Reference data: egypt-growth-data.js (published Egyptian studies). WHO data is no longer used here.
  // Saved per visit in exam.sections.growth = { sex, delivery, feeding, birthWeight, method }.
  // Measurements themselves stay in the existing exam fields (weight / height / head) of each visit.
  var SDS = [-3, -2, -1, 0, 1, 2, 3];
  var IND = { wfa: { l: 'الوزن للعمر', e: 'Weight-for-age', u: 'كجم', k: 'weight' }, hfa: { l: 'الطول للعمر', e: 'Length/Height-for-age', u: 'سم', k: 'height' }, hcfa: { l: 'محيط الرأس للعمر', e: 'Head circumference-for-age', u: 'سم', k: 'head' } };
  var DELIV = [['', '—'], ['natural', 'ولادة طبيعية (Vaginal)'], ['cs', 'ولادة قيصرية (Cesarean)']];
  var FEED = [['', '—'], ['breast', 'رضاعة طبيعية (Breastfeeding)'], ['formula', 'لبن صناعي (Formula)'], ['mixed', 'رضاعة مختلطة: طبيعي وصناعي (Mixed)']];
  function lbl(list, v) { for (var i = 0; i < list.length; i++) if (list[i][0] === v) return list[i][1]; return v || '-'; }
  function EG() { return window.EG_GROWTH; }
  // cut-offs [-3..+3] at a given age (null outside data)
  function refAt(ind, sex, m) {
    var G = EG(); if (!G || !sex || m < 0 || m > 60) return null;
    var t = G[ind + '_' + sex]; if (!t) return null;
    if (ind === 'hcfa') {
      if (m < t[0][0]) return null;
      for (var i = 0; i < t.length - 1; i++) if (m <= t[i + 1][0]) {
        var a = t[i], b = t[i + 1], f = (m - a[0]) / (b[0] - a[0]);
        var mu = a[1] + (b[1] - a[1]) * f, sd = a[2] + (b[2] - a[2]) * f;
        return SDS.map(function (z) { return mu + z * sd; });
      }
      return SDS.map(function (z) { return t[t.length - 1][1] + z * t[t.length - 1][2]; });
    }
    var bi = Math.min(4, Math.floor(m / 12)); return t[bi];
  }
  // approximate SD position by linear interpolation between published cut-offs
  function sdOf(ref, x) {
    var r = [], z = [];
    ref.forEach(function (v, i) { if (v != null) { r.push(v); z.push(SDS[i]); } });
    if (x <= r[0]) return { z: z[0], out: x < r[0] ? -1 : 0 };
    if (x >= r[r.length - 1]) return { z: z[z.length - 1], out: x > r[r.length - 1] ? 1 : 0 };
    for (var i = 0; i < r.length - 1; i++) if (x <= r[i + 1]) return { z: z[i] + (z[i + 1] - z[i]) * (x - r[i]) / (r[i + 1] - r[i]), out: 0 };
  }
  function sdText(s) {
    if (!s) return '-';
    if (s.out < 0) return 'أقل من ' + s.z + ' SD';
    if (s.out > 0) return 'أعلى من +' + s.z + ' SD';
    return (s.z >= 0 ? '+' : '') + s.z.toFixed(1) + ' SD';
  }
  function growthPoints(el, birthWeight) {
    var p = patient(), pts = [];
    var push = function (date, fields) {
      var age = null;
      if (p && p.birthDate && date) { var a = CC.ageParts(p.birthDate, date); if (a) age = a.exactMonths; }
      if (age == null && fields.ageMonths) age = num(fields.ageMonths);
      if (age == null) return;
      pts.push({ age: age, date: date, weight: num(fields.weight), height: num(fields.height), head: num(fields.head) });
    };
    if (p && CC) CC.visitsFor(p).forEach(function (v) { if (v.exam && v.exam.specialty === 'pediatrics') push(v.date, v.exam.fields || {}); });
    var cur = {};
    ['ageMonths', 'weight', 'height', 'head'].forEach(function (k) { cur[k] = fieldVal(el, k); });
    if (cur.weight || cur.height || cur.head) push(visitDate(el), cur);
    var seen = {}, out = [];
    for (var i = pts.length - 1; i >= 0; i--) { var k = pts[i].date || ('a' + pts[i].age); if (!seen[k]) { seen[k] = 1; out.unshift(pts[i]); } }
    if (birthWeight && !out.some(function (q) { return q.age < 0.05 && q.weight != null; })) out.push({ age: 0, date: (p && p.birthDate) || '', weight: birthWeight, height: null, head: null, birth: true });
    return out.sort(function (a, b) { return a.age - b.age; });
  }
  function chartSvg(ind, sex, pts) {
    var key = IND[ind].k, mine = pts.filter(function (p) { return p[key] != null && p.age <= 60; });
    var maxA = Math.min(60, Math.max(24, Math.ceil(((mine.length ? mine[mine.length - 1].age : 0) + 6) / 12) * 12));
    var lo = Infinity, hi = -Infinity, m, q;
    for (m = 0; m <= maxA; m += 0.5) { q = refAt(ind, sex, m); if (q) q.forEach(function (v) { if (v != null) { lo = Math.min(lo, v); hi = Math.max(hi, v); } }); }
    mine.forEach(function (p) { lo = Math.min(lo, p[key]); hi = Math.max(hi, p[key]); });
    if (!isFinite(lo)) return '<p class="muted">لا توجد بيانات مرجعية.</p>';
    lo = Math.floor(lo); hi = Math.ceil(hi);
    var W = 560, H = 300, L = 40, R = 34, T = 12, B = 30;
    var X = function (a) { return L + (a / maxA) * (W - L - R); }, Y = function (v) { return T + (1 - (v - lo) / (hi - lo)) * (H - T - B); };
    var s = '<svg viewBox="0 0 ' + W + ' ' + H + '" class="gc-svg" role="img" aria-label="' + IND[ind].l + '" direction="ltr">';
    var stepY = Math.max(1, Math.round((hi - lo) / 6)), v, a;
    for (v = lo; v <= hi; v += stepY) s += '<line x1="' + L + '" x2="' + (W - R) + '" y1="' + Y(v) + '" y2="' + Y(v) + '" class="gc-grid"/><text x="' + (L - 4) + '" y="' + (Y(v) + 3) + '" class="gc-ax" text-anchor="end">' + v + '</text>';
    for (a = 0; a <= maxA; a += (maxA > 36 ? 6 : 3)) s += '<line y1="' + T + '" y2="' + (H - B) + '" x1="' + X(a) + '" x2="' + X(a) + '" class="gc-grid"/><text x="' + X(a) + '" y="' + (H - B + 14) + '" class="gc-ax" text-anchor="middle">' + a + '</text>';
    s += '<text x="' + (W / 2) + '" y="' + (H - 2) + '" class="gc-ax" text-anchor="middle">العمر بالشهور</text>';
    SDS.forEach(function (z, zi) {
      var d = '', lastY = null, pen = false;
      if (ind === 'hcfa') {
        for (var m2 = 1; m2 <= maxA; m2 += 0.5) { var r = refAt(ind, sex, m2); if (!r) continue; d += (pen ? 'L' : 'M') + X(m2).toFixed(1) + ' ' + Y(r[zi]).toFixed(1); pen = true; lastY = Y(r[zi]); }
      } else {
        // one-year age bands -> horizontal steps (the source publishes one value per year of age)
        EG().bands.forEach(function (b, bi) {
          if (b[0] >= maxA) return;
          var val = EG()[ind + '_' + sex][bi][zi];
          if (val == null) { pen = false; return; }
          d += (pen ? 'L' : 'M') + X(b[0]).toFixed(1) + ' ' + Y(val).toFixed(1) + 'L' + X(Math.min(b[1], maxA)).toFixed(1) + ' ' + Y(val).toFixed(1);
          pen = true; lastY = Y(val);
        });
      }
      if (d) s += '<path d="' + d + '" class="gc-line' + (z === 0 ? ' gc-mid' : '') + '"/>' + (lastY != null ? '<text x="' + (X(maxA) + 3) + '" y="' + (lastY + 3) + '" class="gc-pl">' + (z > 0 ? '+' : '') + z + '</text>' : '');
    });
    if (mine.length > 1) s += '<path class="gc-kid" d="' + mine.map(function (p, i) { return (i ? 'L' : 'M') + X(p.age).toFixed(1) + ' ' + Y(p[key]).toFixed(1); }).join('') + '"/>';
    mine.forEach(function (p) { s += '<circle cx="' + X(p.age) + '" cy="' + Y(p[key]) + '" r="4" class="gc-pt"><title>' + esc(p.date || '') + (p.birth ? ' (وزن الولادة)' : '') + ' — ' + p[key] + ' ' + IND[ind].u + '</title></circle>'; });
    return s + '</svg>';
  }
  function historyHtml(sex, pts) {
    var real = pts.filter(function (p) { return !p.birth; });
    if (!real.length) return '<p class="muted">لا توجد قياسات بعد. أدخل الوزن والطول ومحيط الرأس في خانات الفحص (كلها اختيارية).</p>';
    var rows = real.map(function (p) {
      var cell = function (ind) {
        var x = p[IND[ind].k]; if (x == null) return '-';
        var r = sex && refAt(ind, sex, p.age);
        return x + (r ? ' <small class="muted">(' + sdText(sdOf(r, x)) + ')</small>' : '');
      };
      return [esc(p.date || '-'), p.age.toFixed(1), cell('wfa'), cell('hfa'), cell('hcfa')];
    }).reverse();
    var t = '<table class="sp-table"><thead><tr><th>تاريخ القياس</th><th>العمر (شهور)</th><th>الوزن (كجم)</th><th>الطول (سم)</th><th>محيط الرأس (سم)</th></tr></thead><tbody>' +
      rows.map(function (r) { return '<tr><td>' + r.join('</td><td>') + '</td></tr>'; }).join('') + '</tbody></table>';
    return '<div class="table-wrap">' + t + '</div><p class="muted">موضع القياس بالنسبة للانحراف المعياري (SD) تقريبي، للمتابعة فقط — لا يُعدّ تشخيصاً لسوء تغذية أو تقزّم أو اضطراب نمو من قياس واحد.</p>';
  }
  function opts(list, v) { return list.map(function (o) { return '<option value="' + o[0] + '"' + (o[0] === v ? ' selected' : '') + '>' + o[1] + '</option>'; }).join(''); }
  function previousInfo() {
    var p = patient(), out = null;
    if (p && CC) CC.visitsFor(p).forEach(function (v) {
      var g = v.exam && v.exam.sections && v.exam.sections.growth;
      if (g && (!out || (v.date || '') >= out.d)) out = { d: v.date || '', g: g };
    });
    return out && out.g;
  }
  SP.addSection('pediatrics', {
    id: 'growth',
    title: '📈 منحنيات النمو المصرية للأطفال',
    html: function (v) {
      v = v || {};
      var G = EG();
      return wrap('ped-growth', '📈 منحنيات النمو المصرية للأطفال (Egyptian Growth Chart)', '',
        '<div class="grid-2 gc-info">' +
        '<div class="field"><label>الجنس (Sex) <b class="gc-req">*</b></label><select class="gc-sex gc-in" data-g="sex" required><option value="">— اختر —</option><option value="m"' + (v.sex === 'm' ? ' selected' : '') + '>ذكر (Male)</option><option value="f"' + (v.sex === 'f' ? ' selected' : '') + '>أنثى (Female)</option></select></div>' +
        '<div class="field"><label>طريقة الولادة (Delivery)</label><select class="gc-in" data-g="delivery">' + opts(DELIV, v.delivery || '') + '</select></div>' +
        '<div class="field"><label>نوع التغذية (Feeding)</label><select class="gc-in" data-g="feeding">' + opts(FEED, v.feeding || '') + '</select></div>' +
        '<div class="field"><label>وزن الطفل عند الولادة (Birth weight)</label><div class="gc-unit"><input type="number" class="gc-in" data-g="birthWeight" step="0.01" min="0.3" max="7" inputmode="decimal" placeholder="3.25" value="' + esc(v.birthWeight || '') + '"/><span>كجم (kg)</span></div><small class="gc-err" hidden>أدخل رقماً موجباً صحيحاً (مثال 3.25).</small></div>' +
        '<div class="field"><label>طريقة قياس الطول</label><select class="gc-in" data-g="method">' + opts([['', 'تلقائي حسب العمر'], ['length', 'مستلقٍ (Length) — أقل من سنتين'], ['height', 'واقف (Height) — من سنتين فأكثر']], v.method || '') + '</select></div>' +
        '<div class="field"><label>محيط الرأس الحالي (Head circumference)</label><div class="gc-unit"><input type="number" class="gc-head" step="0.1" min="20" max="65" inputmode="decimal" placeholder="47"/><span>سم (cm)</span></div><small class="muted">نفس خانة «محيط الرأس» في الفحص — تتحدث الاثنتان معاً.</small></div>' +
        '</div>' +
        '<p class="gc-sexwarn" hidden>⚠️ اختر جنس الطفل لعرض المنحنيات المناسبة.</p>' +
        '<div class="gc-bar"><div class="gc-tabs">' +
        Object.keys(IND).map(function (k, i) { return '<button type="button" class="btn small ' + (i ? 'ghost' : 'primary') + '" data-gc="' + k + '">' + IND[k].l + '</button>'; }).join('') +
        '</div></div>' +
        '<div class="gc-chart"></div><p class="gc-note muted"></p><h4>📋 القياسات السابقة</h4><div class="gc-latest"></div>' +
        '<p class="gc-src muted"><b>مصدر المنحنيات:</b> الوزن والطول: ' + esc(G ? G.source.wh : '-') + ' — محيط الرأس: ' + esc(G ? G.source.hc : '-') + '. الخطوط: −3 إلى +3 انحراف معياري (SD)، الأوسط = الوسيط. النقاط = زيارات الطفل.</p>');
    },
    wire: function (el) {
      var ind = 'wfa', sexSel = el.querySelector('.gc-sex'), bw = el.querySelector('[data-g="birthWeight"]');
      var hasSaved = !!sexSel.value || [].some.call(el.querySelectorAll('.gc-in'), function (i) { return i.value; });
      function prefill() {
        if (hasSaved) return;
        var prev = previousInfo() || {};
        el.querySelectorAll('.gc-in').forEach(function (i) { if (!i.value && prev[i.dataset.g]) i.value = prev[i.dataset.g]; });
        if (!sexSel.value) { var p = patient(), g = p && CC.genderCode(p.gender); if (g) sexSel.value = g; }
      }
      var headIn = el.querySelector('.gc-head');
      function examHead() { return root(el).querySelector('.sp-f[data-k="head"]'); }
      function syncHead() { var f = examHead(); if (f && headIn && headIn !== document.activeElement) headIn.value = f.value || ''; }
      if (headIn) headIn.addEventListener('input', function () {
        var f = examHead(); if (!f) return;
        f.value = headIn.value; f.dispatchEvent(new Event('change', { bubbles: true }));
      });
      var fh = examHead(); if (fh) fh.addEventListener('input', syncHead);
      syncHead();
      function bwValid() { var n = num(bw.value); var ok = !bw.value || (n != null && n > 0 && /^\d+([.,]\d+)?$/.test(bw.value.trim())); el.querySelector('.gc-err').hidden = ok; return ok ? n : null; }
      function draw() {
        syncHead();
        if (!EG()) { el.querySelector('.gc-chart').innerHTML = '<p class="muted">بيانات المنحنيات غير محمّلة.</p>'; return; }
        var sex = sexSel.value, pts = growthPoints(el, bwValid());
        el.querySelector('.gc-sexwarn').hidden = !!sex;
        el.querySelector('.gc-chart').innerHTML = sex ? chartSvg(ind, sex, pts) : '';
        el.querySelector('.gc-note').textContent = ind === 'hcfa' ? 'محيط الرأس: بيانات شهرية من عمر شهر حتى 24 شهراً ثم سنوية.' :
          (ind === 'hfa' ? 'المرجع ينشر قيمة واحدة لكل سنة عمرية لذلك تظهر المنحنيات كدرجات. الطول مستلقياً (Length) قبل سنتين وواقفاً (Height) بعدها — المرجع يجمعهما في جدول واحد.' : 'المرجع ينشر قيمة واحدة لكل سنة عمرية لذلك تظهر المنحنيات كدرجات.');
        el.querySelector('.gc-latest').innerHTML = historyHtml(sex, pts);
        var real = pts.filter(function (p) { return !p.birth; });
        CC && CC.setSummary(el.querySelector('.cc-box'), (sex === 'm' ? 'ذكر' : sex === 'f' ? 'أنثى' : 'الجنس غير محدد') + ' — ' + real.length + ' قياس');
      }
      el.querySelectorAll('[data-gc]').forEach(function (b) {
        b.addEventListener('click', function () {
          ind = b.dataset.gc;
          el.querySelectorAll('[data-gc]').forEach(function (x) { x.classList.toggle('primary', x === b); x.classList.toggle('ghost', x !== b); });
          draw();
        });
      });
      el.querySelectorAll('.gc-in').forEach(function (i) { i.addEventListener('change', function () { hasSaved = true; draw(); }); });
      bw.addEventListener('input', bwValid);
      ['weight', 'height', 'head', 'ageMonths'].forEach(function (k) {
        var f = root(el).querySelector('.sp-f[data-k="' + k + '"]');
        if (f) f.addEventListener('change', draw);
      });
      document.addEventListener('clinic-patient-changed', function () { prefill(); draw(); });
      prefill(); draw();
    },
    collect: function (el) {
      var out = {};
      el.querySelectorAll('.gc-in').forEach(function (i) {
        var v = (i.value || '').trim();
        if (i.dataset.g === 'birthWeight') { var n = num(v); if (!(n > 0)) v = ''; else v = String(n); }
        if (v) out[i.dataset.g] = v;
      });
      return Object.keys(out).length ? out : null;
    },
    render: function (v) {
      if (!v) return '';
      return SP.tableHtml(['الجنس', 'طريقة الولادة', 'نوع التغذية', 'وزن الولادة', 'قياس الطول'],
        [[v.sex === 'm' ? 'ذكر' : v.sex === 'f' ? 'أنثى' : '-', lbl(DELIV, v.delivery), lbl(FEED, v.feeding), v.birthWeight ? v.birthWeight + ' كجم' : '-', v.method === 'length' ? 'مستلقٍ' : v.method === 'height' ? 'واقف' : 'حسب العمر']]);
    }
  });
  /* ================= 4) Vaccination schedule ================= */
  // Default list — the clinic can edit it to match the Egyptian MoHP schedule.
  var DEFAULT_SCHED = [
    ['الالتهاب الكبدي B', 'جرعة الميلاد', 0], ['شلل الأطفال (OPV/IPV)', 'الجرعة الصفرية', 0], ['الدرن (BCG)', 'جرعة واحدة', 0],
    ['الخماسي (Pentavalent: DTP-HepB-Hib)', 'جرعة 1', 2], ['شلل الأطفال (OPV/IPV)', 'جرعة 1', 2], ['الروتا', 'جرعة 1', 2], ['المكورات الرئوية', 'جرعة 1', 2],
    ['الخماسي (Pentavalent: DTP-HepB-Hib)', 'جرعة 2', 4], ['شلل الأطفال (OPV/IPV)', 'جرعة 2', 4], ['الروتا', 'جرعة 2', 4], ['المكورات الرئوية', 'جرعة 2', 4],
    ['الخماسي (Pentavalent: DTP-HepB-Hib)', 'جرعة 3', 6], ['شلل الأطفال (OPV/IPV)', 'جرعة 3', 6], ['المكورات الرئوية', 'جرعة 3', 6], ['الإنفلونزا الموسمية', 'جرعة سنوية', 6],
    ['شلل الأطفال (OPV/IPV)', 'جرعة 4', 9], ['المكورات السحائية (Meningococcal)', 'جرعة 1', 9],
    ['الحصبة والنكاف والحصبة الألمانية (MMR)', 'جرعة 1', 12], ['شلل الأطفال (OPV/IPV)', 'جرعة 5', 12], ['المكورات الرئوية', 'جرعة منشطة', 12],
    ['الالتهاب الكبدي A', 'جرعة 1', 12], ['الجديري المائي', 'جرعة 1', 12], ['المكورات السحائية (Meningococcal)', 'جرعة 2', 12],
    ['الحصبة والنكاف والحصبة الألمانية (MMR)', 'جرعة 2', 18], ['الثلاثي (DTP)', 'جرعة منشطة', 18], ['شلل الأطفال (OPV/IPV)', 'جرعة منشطة', 18], ['الالتهاب الكبدي A', 'جرعة 2', 18],
    ['الثلاثي (DTP)', 'منشطة قبل المدرسة', 48], ['الجديري المائي', 'جرعة 2', 48]
  ];
  function schedule() {
    var s = null;
    try { s = JSON.parse(localStorage.getItem(SCHED_KEY)); } catch (e) {}
    var list = Array.isArray(s) && s.length ? s : DEFAULT_SCHED.map(function (r) { return { name: r[0], dose: r[1], months: r[2] }; });
    return list.map(function (r, i) { return { id: r.id || ('d' + i + '_' + r.name + '_' + r.dose), name: r.name, dose: r.dose || '', months: Number(r.months) || 0 }; });
  }
  function addMonths(date, m) {
    var d = new Date(date + 'T00:00:00'); if (isNaN(d)) return '';
    var whole = Math.floor(m); d.setMonth(d.getMonth() + whole); d.setDate(d.getDate() + Math.round((m - whole) * 30));
    d.setMinutes(d.getMinutes() - d.getTimezoneOffset()); return d.toISOString().slice(0, 10);
  }
  function ageLabel(m) { return m === 0 ? 'عند الولادة' : m < 24 ? m + ' شهر' : (m / 12) + ' سنة'; }
  function statusOf(done, due) {
    if (done) return ['done', 'تم ✔'];
    if (!due || !CC) return ['', '—'];
    var n = CC.daysBetween(CC.today(), due);
    if (n < 0) return ['late', 'متأخر ' + (-n) + ' يوم'];
    if (n <= 30) return ['soon', 'مستحق خلال ' + n + ' يوم'];
    return ['later', 'لاحقاً'];
  }
  function vacRow(d, s, custom) {
    s = s || {};
    return '<tr class="vac-row" data-id="' + esc(d.id) + '" data-name="' + esc(d.name) + '" data-dose="' + esc(d.dose || '') + '" data-months="' + (d.months == null ? '' : d.months) + '"' + (custom ? ' data-custom="1"' : '') + '>' +
      '<td><label><input type="checkbox" class="vac-done"' + (s.done ? ' checked' : '') + ' /> <b>' + esc(d.name) + '</b>' + (d.dose ? ' <span class="muted">' + esc(d.dose) + '</span>' : '') + '</label></td>' +
      '<td class="vac-age">' + (d.months == null || d.months === '' ? '—' : ageLabel(d.months)) + '</td>' +
      '<td class="vac-due">—</td>' +
      '<td><input type="date" class="vac-date" value="' + esc(s.date || '') + '" /></td>' +
      '<td><input class="vac-lot" value="' + esc(s.lot || '') + '" placeholder="رقم التشغيلة" /></td>' +
      '<td><span class="vac-st">—</span>' + (custom ? ' <button type="button" class="btn ghost small vac-del" title="حذف">✖</button>' : '') + '</td></tr>';
  }
  function vacBody(v) {
    var sched = schedule(), byId = {}, used = {}, custom = [];
    var saved = Array.isArray(v) ? v : [];
    saved.forEach(function (r) { if (r && r.doseId) byId[r.doseId] = r; });
    // backward compatibility: old entries {name, done, date} -> first dose of that vaccine
    saved.forEach(function (r) {
      if (!r || !r.name || r.doseId) return;
      var hit = null;
      sched.some(function (d) { if (!byId[d.id] && !used[d.id] && (d.name === r.name || d.name.indexOf(r.name) === 0 || r.name.indexOf(d.name) === 0)) { hit = d; return true; } return false; });
      if (hit && !r.custom) { byId[hit.id] = r; used[hit.id] = 1; } else custom.push(r);
    });
    var rows = sched.map(function (d) { return vacRow(d, byId[d.id], false); });
    custom.forEach(function (r, i) { rows.push(vacRow({ id: 'c' + i + '_' + r.name, name: r.name, dose: r.dose || '', months: r.months === undefined || r.months === '' ? null : Number(r.months) }, r, true)); });
    return '<p class="muted">تاريخ الاستحقاق يُحسب من تاريخ الميلاد. 🟢 تم · 🟠 مستحق خلال 30 يوم · 🔴 متأخر.</p>' +
      '<div class="table-wrap"><table class="vac-table"><thead><tr><th>التطعيم</th><th>العمر</th><th>تاريخ الاستحقاق</th><th>تاريخ الإعطاء</th><th>رقم التشغيلة (Lot)</th><th>الحالة</th></tr></thead><tbody class="vac-list">' + rows.join('') + '</tbody></table></div>' +
      '<div class="vac-add">' +
      '<input type="text" class="vac-new-name" placeholder="اسم تطعيم آخر…" />' +
      '<input type="number" class="vac-new-age" placeholder="العمر (شهور)" min="0" style="max-width:130px;" />' +
      '<button type="button" class="btn sm vac-add-btn">➕ إضافة تطعيم</button>' +
      '<button type="button" class="btn ghost sm vac-edit-sched">⚙️ تعديل جدول التطعيمات</button>' +
      '</div><div class="vac-sched-editor"></div>';
  }
  function collectVac(el) {
    var out = [];
    el.querySelectorAll('.vac-row').forEach(function (r) {
      var done = r.querySelector('.vac-done').checked, date = r.querySelector('.vac-date').value, lot = r.querySelector('.vac-lot').value.trim();
      if (!done && !date && !lot && !r.dataset.custom) return;
      var o = { name: r.dataset.name || '', done: done, date: date };
      if (r.dataset.dose) o.dose = r.dataset.dose;
      if (lot) o.lot = lot;
      if (r.dataset.custom) { o.custom = true; if (r.dataset.months !== '') o.months = Number(r.dataset.months); }
      else o.doseId = r.dataset.id;
      var due = r.querySelector('.vac-due').dataset.due; if (due) o.due = due;
      out.push(o);
    });
    return out.length ? out : null;
  }
  SP.addSection('pediatrics', {
    id: 'vaccines',
    title: '💉 سجل التطعيمات',
    html: function (v) { return wrap('ped-vac', '💉 جدول التطعيمات (Vaccination Schedule)', '', '<div class="vac-wrap">' + vacBody(v) + '</div>'); },
    wire: function (el) {
      if (el._vacWired) return; el._vacWired = true;
      function refresh() {
        var p = patient(), birth = p && p.birthDate, next = null, late = 0;
        el.querySelectorAll('.vac-row').forEach(function (r) {
          var m = r.dataset.months, due = birth && m !== '' ? addMonths(birth, Number(m)) : '';
          var dueEl = r.querySelector('.vac-due'); dueEl.textContent = due || '—'; dueEl.dataset.due = due;
          var done = r.querySelector('.vac-done').checked || !!r.querySelector('.vac-date').value;
          var st = statusOf(done, due), s = r.querySelector('.vac-st');
          s.textContent = st[1]; s.className = 'vac-st vac-' + st[0];
          if (st[0] === 'late') late++;
          if (!done && due && (st[0] === 'soon' || st[0] === 'later') && (!next || due < next.due)) next = { due: due, name: r.dataset.name };
        });
        var sum = birth ? (late ? 'متأخر: ' + late + ' جرعة' : '') + (next ? (late ? ' · ' : '') + 'التالي: ' + next.name.replace(/\s*\(.*\)/, '') + ' خلال ' + CC.daysBetween(CC.today(), next.due) + ' يوم' : (late ? '' : 'كل التطعيمات مسجّلة')) : 'تاريخ الميلاد غير مسجّل';
        CC && CC.setSummary(el.querySelector('.cc-box'), sum);
      }
      function rerender() {
        var keep = collectVac(el);
        el.querySelector('.vac-wrap').innerHTML = vacBody(keep);
        refresh();
      }
      el.addEventListener('change', function (e) {
        if (e.target.classList.contains('vac-date') && e.target.value) e.target.closest('.vac-row').querySelector('.vac-done').checked = true;
        refresh();
      });
      el.addEventListener('click', function (e) {
        var t = e.target;
        if (!t.classList) return;
        if (t.classList.contains('vac-add-btn')) {
          var inp = el.querySelector('.vac-new-name'), age = el.querySelector('.vac-new-age');
          var name = (inp.value || '').trim();
          if (!name) { inp.focus(); return; }
          var tmp = document.createElement('tbody');
          tmp.innerHTML = vacRow({ id: 'c' + Date.now(), name: name, dose: '', months: age.value === '' ? null : Number(age.value) }, {}, true);
          el.querySelector('.vac-list').appendChild(tmp.firstChild);
          inp.value = ''; age.value = '';
          refresh();
        } else if (t.classList.contains('vac-del')) {
          var row = t.closest('.vac-row'); if (row) row.remove(); refresh();
        } else if (t.classList.contains('vac-edit-sched')) {
          var ed = el.querySelector('.vac-sched-editor');
          if (ed.innerHTML) { ed.innerHTML = ''; return; }
          var line = function (d) { return '<div class="vs-row"><input class="vs-name" value="' + esc(d.name) + '" placeholder="اسم التطعيم" /><input class="vs-dose" value="' + esc(d.dose) + '" placeholder="الجرعة" /><input class="vs-m" type="number" min="0" step="0.5" value="' + d.months + '" placeholder="شهور" /><button type="button" class="btn ghost small vs-del">✖</button></div>'; };
          ed.innerHTML = '<h4>⚙️ جدول التطعيمات الخاص بالعيادة</h4><p class="muted">عدّل الأسماء والأعمار لتطابق جدول وزارة الصحة. التعديل يطبّق على كل الأطفال.</p>' +
            '<div class="vs-list">' + schedule().map(line).join('') + '</div>' +
            '<div class="actions" style="margin-top:8px;"><button type="button" class="btn ghost small vs-add">➕ سطر</button><button type="button" class="btn primary small vs-save">💾 حفظ الجدول</button><button type="button" class="btn ghost small vs-reset">↺ الجدول الافتراضي</button></div>';
          ed._line = line;
        } else if (t.classList.contains('vs-add')) {
          el.querySelector('.vs-list').insertAdjacentHTML('beforeend', el.querySelector('.vac-sched-editor')._line({ name: '', dose: '', months: 0 }));
        } else if (t.classList.contains('vs-del')) {
          t.closest('.vs-row').remove();
        } else if (t.classList.contains('vs-save')) {
          var old = schedule(), list = [];
          el.querySelectorAll('.vs-row').forEach(function (r) {
            var n = r.querySelector('.vs-name').value.trim(); if (!n) return;
            var d = r.querySelector('.vs-dose').value.trim(), m = Number(r.querySelector('.vs-m').value) || 0;
            var same = old.filter(function (o) { return o.name === n && o.dose === d; })[0];
            list.push({ id: same ? same.id : 'u' + Date.now().toString(36) + list.length, name: n, dose: d, months: m });
          });
          try { localStorage.setItem(SCHED_KEY, JSON.stringify(list)); } catch (e2) {}
          rerender();
        } else if (t.classList.contains('vs-reset')) {
          if (!confirm('الرجوع للجدول الافتراضي؟')) return;
          try { localStorage.removeItem(SCHED_KEY); } catch (e3) {}
          rerender();
        }
      });
      el.addEventListener('keydown', function (e) {
        if (e.key === 'Enter' && e.target.classList && e.target.classList.contains('vac-new-name')) {
          e.preventDefault(); el.querySelector('.vac-add-btn').click();
        }
      });
      document.addEventListener('clinic-patient-changed', refresh);
      refresh();
    },
    collect: collectVac,
    render: function (v) {
      if (!v || !v.length) return '';
      return SP.tableHtml(['التطعيم', 'تم', 'التاريخ', 'رقم التشغيلة'],
        v.map(function (r) { return [r.name + (r.dose ? ' — ' + r.dose : ''), r.done ? '✔' : '—', r.date || '-', r.lot || '-']; }));
    }
  });

  SP.addSection('pediatrics', SP.filesSection({
    id: 'files',
    title: '📎 مرفقات الطفل',
    hint: 'تقارير، تحاليل، كارت التطعيمات.',
    folder: 'pediatrics'
  }));
})();
} catch (e) { console.error('[specialties-bundle] pediatrics.js failed:', e); }
/* ==== END pediatrics.js ==== */

/* ==== BEGIN dermatology.js ==== */
try {
// ============ Dermatology module (وحدة الجلدية) ============
// v51: Fitzpatrick skin type, extended lesion map (color + distribution),
// severity scores (PASI, EASI, SCORAD, Acne/IGA, BSA, DLQI) with trend, photos.
// Old lesion records ({site,type,size,notes}) still load.

(function () {
  var SP = window.ClinicSpecialty;
  if (!SP) return;
  var esc = SP.escape;
  var CC = window.ClinicCare || null;

  // Fitzpatrick skin type field is defined in specialties.js (next to «نوع البشرة»).

  /* ---------- lesion map ---------- */
  var SITES = ['', 'فروة الرأس', 'الوجه', 'الرقبة', 'الصدر', 'الظهر', 'البطن', 'الذراع', 'اليد', 'الكفوف / الأخمص (Palms/Soles)', 'الثنيات (Flexures)', 'الإبط (Axilla)', 'الأربية (Groin)', 'الأرداف (Buttocks)', 'الأغشية المخاطية (Mucosa)', 'الأعضاء التناسلية (Genitals)', 'الساق', 'القدم', 'الأظافر', 'منطقة أخرى'];
  var TYPES = ['', 'بقعة (Macule)', 'رقعة (Patch)', 'حطاطة (Papule)', 'لويحة (Plaque)', 'بثرة (Pustule)', 'حويصلة (Vesicle)', 'فقاعة (Bulla)', 'عقدة (Nodule)', 'شرى (Wheal)', 'قشور (Scales)', 'قشرة (Crust)', 'تآكل (Erosion)', 'تقرح (Ulcer)', 'سحجة (Excoriation)', 'تحزز (Lichenification)', 'ندبة (Scar)', 'ضمور (Atrophy)', 'توسع شعيرات (Telangiectasia)', 'فرفرية (Purpura)', 'نفق الجرب (Burrow)', 'كيس (Cyst)', 'وحمة (Nevus)'];
  var COLORS = ['', 'أحمر (Erythematous)', 'وردي', 'بني', 'أسود', 'أبيض / ناقص الصبغة', 'أصفر', 'بنفسجي', 'بلون الجلد'];
  var DIST = ['', 'موضعي (Localized)', 'منتشر (Generalized)', 'متماثل (Symmetrical)', 'على الأسطح الباسطة (Extensor)', 'في الثنيات (Flexural)', 'خطي (Linear)', 'حلقي (Annular)', 'متجمع (Grouped)', 'جلدي قطعي (Dermatomal)', 'في المناطق المعرضة للشمس'];

  function opts(list, val, ph) {
    var has = !val || list.indexOf(val) >= 0;
    return (has ? list : list.concat([val])).map(function (s) {
      return '<option value="' + esc(s) + '"' + (s === (val || '') ? ' selected' : '') + '>' + (s ? esc(s) : ph) + '</option>';
    }).join('');
  }
  function row(r) {
    r = r || {};
    return '<div class="les-row">' +
      '<select class="l-site">' + opts(SITES, r.site, '— الموضع —') + '</select>' +
      '<select class="l-type">' + opts(TYPES, r.type, '— نوع الآفة —') + '</select>' +
      '<select class="l-color">' + opts(COLORS, r.color, '— اللون —') + '</select>' +
      '<select class="l-dist">' + opts(DIST, r.distribution, '— نمط التوزيع —') + '</select>' +
      '<input class="l-size" placeholder="الحجم (سم)" value="' + esc(r.size || '') + '" />' +
      '<input class="l-notes" placeholder="ملاحظات" value="' + esc(r.notes || '') + '" />' +
      '<button type="button" class="btn small danger l-del">🗑</button>' +
      '</div>';
  }

  SP.addSection('dermatology', {
    id: 'lesions',
    title: '🔎 خريطة الآفات الجلدية',
    html: function (v) {
      var list = Array.isArray(v) && v.length ? v : [null];
      return '<p class="muted">سجّل موضع ونوع ولون ونمط توزيع كل آفة.</p>' +
        '<div class="les-list">' + list.map(row).join('') + '</div>' +
        '<button type="button" class="btn ghost small les-add">+ إضافة آفة</button>';
    },
    wire: function (el) {
      var list = el.querySelector('.les-list');
      el.querySelector('.les-add').addEventListener('click', function () {
        list.insertAdjacentHTML('beforeend', row());
      });
      list.addEventListener('click', function (e) {
        if (!e.target.classList.contains('l-del')) return;
        var rows = list.querySelectorAll('.les-row');
        if (rows.length === 1) {
          rows[0].querySelectorAll('input').forEach(function (i) { i.value = ''; });
          rows[0].querySelectorAll('select').forEach(function (s) { s.value = ''; });
          return;
        }
        e.target.closest('.les-row').remove();
      });
    },
    collect: function (el) {
      var out = [];
      el.querySelectorAll('.les-row').forEach(function (r) {
        var site = r.querySelector('.l-site').value;
        var type = r.querySelector('.l-type').value;
        if (!site && !type) return;
        var o = {
          site: site, type: type,
          size: (r.querySelector('.l-size').value || '').trim(),
          notes: (r.querySelector('.l-notes').value || '').trim()
        };
        var c = r.querySelector('.l-color').value, d = r.querySelector('.l-dist').value;
        if (c) o.color = c;
        if (d) o.distribution = d;
        out.push(o);
      });
      return out.length ? out : null;
    },
    render: function (v) {
      if (!v || !v.length) return '';
      return SP.tableHtml(['الموضع', 'نوع الآفة', 'اللون', 'التوزيع', 'الحجم', 'ملاحظات'],
        v.map(function (r) { return [r.site, r.type, r.color || '', r.distribution || '', r.size, r.notes]; }));
    }
  });

  /* ---------- severity scores ---------- */
  var REG = [['head', 'الرأس والرقبة'], ['upper', 'الأطراف العلوية'], ['trunk', 'الجذع'], ['lower', 'الأطراف السفلية']];
  var W_ADULT = { head: 0.1, upper: 0.2, trunk: 0.3, lower: 0.4 };
  var W_CHILD = { head: 0.2, upper: 0.2, trunk: 0.3, lower: 0.3 };
  var AREA = ['0 — لا يوجد', '1 — أقل من 10%', '2 — 10–29%', '3 — 30–49%', '4 — 50–69%', '5 — 70–89%', '6 — 90–100%'];
  var PASI_S = [['e', 'الاحمرار (Erythema)'], ['i', 'السُمك (Induration)'], ['s', 'التقشر (Scaling)']];
  var EASI_S = [['e', 'الاحمرار'], ['p', 'الوذمة/الحطاطات'], ['x', 'السحجات'], ['l', 'التحزز']];
  var SCORAD_B = [['er', 'الاحمرار'], ['ed', 'الوذمة / الحطاطات'], ['oz', 'النزّ / القشور'], ['ex', 'السحجات'], ['li', 'التحزز'], ['dr', 'الجفاف']];
  var ACNE = ['', 'خفيف (Mild)', 'متوسط (Moderate)', 'شديد (Severe)'];
  var IGA = ['', '0 — جلد صافٍ', '1 — شبه صافٍ', '2 — خفيف', '3 — متوسط', '4 — شديد'];
  var DLQI_Q = [
    'خلال الأسبوع الماضي، ما مدى الحكة أو الألم أو الحرقان في الجلد؟',
    'ما مدى شعورك بالإحراج أو الخجل بسبب جلدك؟',
    'ما مدى تأثير جلدك على التسوق أو الاهتمام بالمنزل؟',
    'ما مدى تأثير جلدك على اختيار ملابسك؟',
    'ما مدى تأثير جلدك على أنشطتك الاجتماعية أو الترفيهية؟',
    'ما مدى صعوبة ممارسة الرياضة بسبب جلدك؟',
    'هل منعك جلدك من العمل أو الدراسة؟ (نعم = 3)',
    'ما مدى المشاكل مع شريك الحياة أو الأصدقاء أو الأقارب بسبب جلدك؟',
    'ما مدى تأثير جلدك على العلاقة الحميمة؟',
    'ما مدى مشكلة علاج جلدك (وقت، فوضى في المنزل)؟'];
  var DLQI_A = [['', '—'], ['3', 'كثيراً جداً'], ['2', 'كثيراً'], ['1', 'قليلاً'], ['0', 'لا على الإطلاق / لا ينطبق']];

  function sel(cls, pairs, val) {
    val = val == null ? '' : String(val);
    return '<select class="' + cls + '">' + pairs.map(function (o) {
      return '<option value="' + esc(o[0]) + '"' + (val === o[0] ? ' selected' : '') + '>' + esc(o[1]) + '</option>';
    }).join('') + '</select>';
  }
  function n03(cls, val, max) {
    var a = [['', '—']]; for (var i = 0; i <= max; i++) a.push([String(i), String(i)]);
    return sel(cls, a, val == null ? '' : String(val));
  }
  function regionTable(prefix, signs, v, max) {
    v = v || {};
    return '<div class="table-wrap"><table class="sev-t"><thead><tr><th>المنطقة</th>' + signs.map(function (s) { return '<th>' + s[1] + ' (0–' + max + ')</th>'; }).join('') + '<th>المساحة (0–6)</th></tr></thead><tbody>' +
      REG.map(function (r) {
        var rv = v[r[0]] || {};
        return '<tr data-reg="' + r[0] + '"><td>' + r[1] + '</td>' + signs.map(function (s) { return '<td>' + n03(prefix + '-' + s[0], rv[s[0]], max) + '</td>'; }).join('') +
          '<td>' + sel(prefix + '-a', [['', '—']].concat(AREA.map(function (t, i) { return [String(i), t]; })), rv.a == null ? '' : String(rv.a)) + '</td></tr>';
      }).join('') + '</tbody></table></div>';
  }
  function readRegions(el, wrap, prefix, signs) {
    var out = {}, any = false;
    el.querySelectorAll('.sev-' + wrap + ' tr[data-reg]').forEach(function (tr) {
      var o = {};
      signs.concat([['a']]).forEach(function (s) { var x = tr.querySelector('.' + prefix + '-' + s[0]).value; if (x !== '') { o[s[0]] = Number(x); any = true; } });
      out[tr.dataset.reg] = o;
    });
    return any ? out : null;
  }
  // v56: a region counts as complete only when every sign AND the area are entered.
  // Missing values are NOT zeros: incomplete scores are flagged on screen and in the report.
  function regionComplete(reg, signs) {
    if (!reg) return false;
    return REG.every(function (r) { var o = reg[r[0]]; return o && o.a != null && signs.every(function (x) { return o[x[0]] != null; }); });
  }
  function regionTotal(reg, signs, w) {
    if (!reg) return null;
    var t = 0;
    REG.forEach(function (r) {
      var o = reg[r[0]] || {}, s = 0;
      signs.forEach(function (x) { s += o[x[0]] || 0; });
      t += w[r[0]] * s * (o.a || 0);
    });
    return +t.toFixed(1);
  }
  function scoradComplete(sc) {
    return !!sc && ['extent', 'itch', 'sleep'].concat(SCORAD_B.map(function (x) { return x[0]; })).every(function (k) { return sc[k] != null; });
  }
  // DLQI (Finlay): one unanswered question scores 0; two or more unanswered → score invalid.
  function dlqiScore(ans) {
    var miss = 0, t = 0;
    for (var i = 0; i < 10; i++) { if (ans[i] == null) miss++; else t += ans[i]; }
    return miss > 1 ? null : t;
  }
  function easiBand(t) { return t == null ? '' : t === 0 ? 'صافٍ' : t <= 1 ? 'شبه صافٍ' : t <= 7 ? 'خفيف' : t <= 21 ? 'متوسط' : t <= 50 ? 'شديد' : 'شديد جداً'; }
  function bsaBand(t) { return t == null ? '' : t < 3 ? 'خفيف' : t <= 10 ? 'متوسط' : 'شديد'; }
  var INC = ' <span class="sev-inc">⚠️ غير مكتمل — بعض القيم لم تُدخل</span>';
  function incTxt(f) { return f ? ' (غير مكتمل)' : ''; }
  function scoradTotal(sc) {
    if (!sc) return null;
    var b = 0; SCORAD_B.forEach(function (x) { b += Number(sc[x[0]]) || 0; });
    return +((Number(sc.extent) || 0) / 5 + 3.5 * b + (Number(sc.itch) || 0) + (Number(sc.sleep) || 0)).toFixed(1);
  }
  function scoradBand(t) { return t == null ? '' : t < 25 ? 'خفيف' : t <= 50 ? 'متوسط' : 'شديد'; }
  function dlqiBand(t) { return t == null ? '' : t <= 1 ? 'لا تأثير' : t <= 5 ? 'تأثير بسيط' : t <= 10 ? 'تأثير متوسط' : t <= 20 ? 'تأثير كبير جداً' : 'تأثير بالغ'; }
  function pasiBand(t) { return t == null ? '' : t < 5 ? 'خفيف' : t <= 10 ? 'متوسط' : 'شديد'; }

  function sub(id, title, sum, body) { return CC ? CC.box(id, title, sum, body, 'cc-sub') : '<h4>' + title + '</h4>' + body; }

  function trendSvg(vals) {
    if (vals.length < 2) return '';
    var W = 140, H = 34, max = Math.max.apply(null, vals.map(function (v) { return v.v; })) || 1;
    var pts = vals.map(function (v, i) { return [(i / (vals.length - 1)) * (W - 8) + 4, H - 4 - (v.v / max) * (H - 8)]; });
    return '<svg viewBox="0 0 ' + W + ' ' + H + '" class="sev-spark" direction="ltr"><polyline points="' + pts.map(function (p) { return p[0].toFixed(1) + ',' + p[1].toFixed(1); }).join(' ') + '"/>' +
      pts.map(function (p, i) { return '<circle cx="' + p[0] + '" cy="' + p[1] + '" r="2.5"><title>' + esc(vals[i].d || 'الآن') + ': ' + vals[i].v + '</title></circle>'; }).join('') + '</svg>';
  }

  SP.addSection('dermatology', {
    id: 'severity',
    title: '📊 مقاييس الشدة',
    html: function (v) {
      v = v || {};
      var sc = v.scorad || {}, dl = (v.dlqi && v.dlqi.answers) || [];
      var body =
        sub('derm-pasi', 'PASI — الصدفية (Psoriasis)', v.pasiTotal != null ? 'PASI ' + v.pasiTotal : '',
          '<div class="sev-pasi">' + regionTable('pa', PASI_S, v.pasi, 4) + '</div><p class="sev-out" data-out="pasi"></p>') +
        sub('derm-easi', 'EASI — الإكزيما (Eczema)', v.easiTotal != null ? 'EASI ' + v.easiTotal : '',
          '<label class="sev-chk"><input type="checkbox" class="easi-child"' + (v.easiChild ? ' checked' : '') + ' /> طفل أقل من 8 سنوات</label>' +
          '<div class="sev-easi">' + regionTable('ea', EASI_S, v.easi, 3) + '</div><p class="sev-out" data-out="easi"></p>') +
        sub('derm-scorad', 'SCORAD — الإكزيما', v.scoradTotal != null ? 'SCORAD ' + v.scoradTotal : '',
          '<div class="grid-2"><div class="field"><label>A — نسبة المساحة المصابة (%)</label><input class="sc-extent" type="number" min="0" max="100" value="' + esc(sc.extent == null ? '' : sc.extent) + '" /></div></div>' +
          '<div class="grid-2 sev-grid">' + SCORAD_B.map(function (x) { return '<div class="field"><label>B — ' + x[1] + ' (0–3)</label>' + n03('sc-' + x[0], sc[x[0]], 3) + '</div>'; }).join('') + '</div>' +
          '<div class="grid-2"><div class="field"><label>C — الحكة (0–10)</label>' + n03('sc-itch', sc.itch, 10) + '</div><div class="field"><label>C — اضطراب النوم (0–10)</label>' + n03('sc-sleep', sc.sleep, 10) + '</div></div>' +
          '<p class="sev-out" data-out="scorad"></p>') +
        sub('derm-acne', 'حب الشباب و IGA', [v.acne, v.iga != null && v.iga !== '' ? 'IGA ' + v.iga : ''].filter(Boolean).join(' · '),
          '<div class="grid-2"><div class="field"><label>درجة حب الشباب (Acne grade)</label>' + sel('sv-acne', ACNE.map(function (a) { return [a, a || '—']; }), v.acne || '') + '</div>' +
          '<div class="field"><label>التقييم العام للطبيب (IGA)</label>' + sel('sv-iga', IGA.map(function (a, i) { return [i ? String(i - 1) : '', a || '—']; }), v.iga == null ? '' : String(v.iga)) + '</div></div>') +
        sub('derm-bsa', 'BSA — مساحة سطح الجسم', v.bsa != null ? 'BSA ' + v.bsa + '%' : '',
          '<div class="grid-2"><div class="field"><label>عدد الكفوف (كف المريض = 1%)</label><input class="sv-palms" type="number" min="0" max="100" step="0.5" value="' + esc(v.bsaPalms == null ? '' : v.bsaPalms) + '" /></div>' +
          '<div class="field"><label>النسبة</label><p class="sev-out" data-out="bsa">—</p></div></div>') +
        sub('derm-dlqi', 'DLQI — جودة الحياة', v.dlqi && v.dlqi.total != null ? 'DLQI ' + v.dlqi.total : '',
          '<ol class="dlqi-list">' + DLQI_Q.map(function (q, i) {
            return '<li><span>' + esc(q) + '</span>' + sel('dl-q dl-' + i, DLQI_A, dl[i] == null ? '' : String(dl[i])) + '</li>';
          }).join('') + '</ol><p class="sev-out" data-out="dlqi"></p>') +
        '<div class="sev-trend"></div>' +
        '<div class="sev-orig" hidden data-v="' + esc(JSON.stringify(v)) + '"></div>';
      return CC ? CC.box('derm-sev', '📊 مقاييس الشدة (Severity Scores)', '', body, 'cc-sec') : body;
    },
    wire: function (el) {
      function readAll() {
        var o = {};
        var pa = readRegions(el, 'pasi', 'pa', PASI_S); if (pa) { o.pasi = pa; o.pasiTotal = regionTotal(pa, PASI_S, W_ADULT); if (!regionComplete(pa, PASI_S)) o.pasiIncomplete = true; }
        var child = el.querySelector('.easi-child').checked;
        var ea = readRegions(el, 'easi', 'ea', EASI_S); if (ea) { o.easi = ea; o.easiChild = child; o.easiTotal = regionTotal(ea, EASI_S, child ? W_CHILD : W_ADULT); if (!regionComplete(ea, EASI_S)) o.easiIncomplete = true; }
        var sc = {}, anySc = false;
        ['extent', 'itch', 'sleep'].concat(SCORAD_B.map(function (x) { return x[0]; })).forEach(function (k) {
          var x = el.querySelector('.sc-' + k).value; if (x !== '') { sc[k] = Number(x); anySc = true; }
        });
        if (sc.extent != null) sc.extent = Math.max(0, Math.min(100, sc.extent));
        if (anySc) { o.scorad = sc; o.scoradTotal = scoradTotal(sc); if (!scoradComplete(sc)) o.scoradIncomplete = true; }
        var acne = el.querySelector('.sv-acne').value, iga = el.querySelector('.sv-iga').value;
        if (acne) o.acne = acne; if (iga !== '') o.iga = Number(iga);
        var palms = el.querySelector('.sv-palms').value; if (palms !== '') { var bp = Math.max(0, Math.min(100, Number(palms))); o.bsaPalms = bp; o.bsa = bp; }
        var ans = [], anyD = false;
        el.querySelectorAll('.dl-q').forEach(function (s, i) { ans[i] = s.value === '' ? null : Number(s.value); if (s.value !== '') anyD = true; });
        // keep totals saved by older versions when their detailed inputs are not present
        try {
          var org = JSON.parse(el.querySelector('.sev-orig').getAttribute('data-v') || '{}');
          ['pasiTotal', 'easiTotal', 'scoradTotal'].forEach(function (k) {
            var base = k.replace('Total', '');
            if (o[k] == null && org[k] != null && !org[base]) o[k] = org[k];
          });
        } catch (e) {}
        if (anyD) { var dt = dlqiScore(ans); o.dlqi = { answers: ans, total: dt }; if (dt == null) o.dlqi.invalid = true; }
        return o;
      }
      function out(k, html) { var p = el.querySelector('[data-out="' + k + '"]'); if (p) p.innerHTML = html; }
      function boxOf(id) { return el.querySelector('[data-cc="' + id + '"]'); }
      function update() {
        var o = readAll();
        out('pasi', o.pasiTotal != null ? 'الإجمالي: <b>PASI ' + o.pasiTotal + '</b> / 72 — ' + pasiBand(o.pasiTotal) + (o.pasiIncomplete ? INC : '') : '— لم يُقيَّم');
        out('easi', o.easiTotal != null ? 'الإجمالي: <b>EASI ' + o.easiTotal + '</b> / 72 — ' + easiBand(o.easiTotal) + (o.easiIncomplete ? INC : '') : '— لم يُقيَّم');
        out('scorad', o.scoradTotal != null ? 'الإجمالي: <b>SCORAD ' + o.scoradTotal + '</b> / 103 — ' + scoradBand(o.scoradTotal) + (o.scoradIncomplete ? INC : '') : '— لم يُقيَّم');
        out('bsa', o.bsa != null ? '<b>' + o.bsa + '%</b> — ' + bsaBand(o.bsa) : '— لم يُقيَّم');
        out('dlqi', o.dlqi ? (o.dlqi.invalid ? '<span class="sev-inc">⚠️ لا يمكن حساب DLQI: أكثر من سؤال بدون إجابة</span>' : 'الإجمالي: <b>DLQI ' + o.dlqi.total + '</b> / 30 — ' + dlqiBand(o.dlqi.total)) : '— لم يُقيَّم');
        if (CC) {
          CC.setSummary(boxOf('derm-pasi'), o.pasiTotal != null ? 'PASI ' + o.pasiTotal : '');
          CC.setSummary(boxOf('derm-easi'), o.easiTotal != null ? 'EASI ' + o.easiTotal : '');
          CC.setSummary(boxOf('derm-scorad'), o.scoradTotal != null ? 'SCORAD ' + o.scoradTotal : '');
          CC.setSummary(boxOf('derm-acne'), [o.acne, o.iga != null ? 'IGA ' + o.iga : ''].filter(Boolean).join(' · '));
          CC.setSummary(boxOf('derm-bsa'), o.bsa != null ? 'BSA ' + o.bsa + '%' : '');
          CC.setSummary(boxOf('derm-dlqi'), o.dlqi && o.dlqi.total != null ? 'DLQI ' + o.dlqi.total : '');
          var parts = [];
          if (o.pasiTotal != null) parts.push('PASI ' + o.pasiTotal);
          if (o.easiTotal != null) parts.push('EASI ' + o.easiTotal);
          if (o.scoradTotal != null) parts.push('SCORAD ' + o.scoradTotal);
          if (o.dlqi && o.dlqi.total != null) parts.push('DLQI ' + o.dlqi.total);
          if (o.bsa != null) parts.push('BSA ' + o.bsa + '%');
          CC.setSummary(boxOf('derm-sev'), parts.join(' · '));
        }
        trend(o);
      }
      function trend(o) {
        var box = el.querySelector('.sev-trend'), p = CC && CC.getPatient();
        if (!box) return;
        var prev = p ? CC.visitsFor(p).filter(function (v) { return v.exam && v.exam.sections && v.exam.sections.severity; }) : [];
        var keys = [['pasiTotal', 'PASI'], ['easiTotal', 'EASI'], ['scoradTotal', 'SCORAD'], ['dlqi', 'DLQI'], ['bsa', 'BSA %']];
        var rows = keys.map(function (k) {
          var get = function (s) { var x = s[k[0]]; return k[0] === 'dlqi' ? (x ? x.total : null) : x; };
          var vals = prev.map(function (v) { return { d: v.date, v: get(v.exam.sections.severity) }; }).filter(function (x) { return x.v != null; });
          var cur = get(o), inc = o[k[0].replace('Total', '') + 'Incomplete'];
          if (cur != null && !inc) vals.push({ d: '', v: cur });
          if (vals.length < 2) return '';
          var a = vals[vals.length - 2].v, b = vals[vals.length - 1].v, d = +(b - a).toFixed(1);
          var pct = a ? Math.round((b - a) / a * 100) : null, base = vals[0].v;
          var cmp = (d < 0 ? '⬇️ تحسن ' : d > 0 ? '⬆️ زيادة ' : '＝ ') + (d ? Math.abs(d) : 'بدون تغيير') + (pct != null && d ? ' (' + Math.abs(pct) + '%)' : '');
          if (k[0] === 'pasiTotal' && base > 0) { var r = Math.round((base - b) / base * 100); if (r >= 50) cmp += ' · PASI ' + (r >= 90 ? 90 : r >= 75 ? 75 : 50) + ' مقارنة بأول زيارة'; }
          return '<div class="sev-tr-row"><span>' + k[1] + '</span>' + trendSvg(vals) + '<span class="muted">' + vals.map(function (x) { return (x.d ? x.d + ': ' : 'الآن: ') + x.v; }).join(' ← ') + '</span><b class="sev-cmp">' + cmp + '</b></div>';
        }).join('');
        box.innerHTML = rows ? '<h4>📉 مقارنة بالزيارات السابقة</h4>' + rows : '';
      }
      el.addEventListener('change', update);
      el.addEventListener('input', update);
      document.addEventListener('clinic-patient-changed', update);
      el._sevRead = readAll;
      update();
    },
    collect: function (el) {
      if (!el._sevRead) return null;
      var o = el._sevRead();
      return Object.keys(o).length ? o : null;
    },
    render: function (v) {
      if (!v) return '';
      var rows = [];
      if (v.pasiTotal != null) rows.push(['PASI', v.pasiTotal + ' / 72 — ' + pasiBand(v.pasiTotal) + incTxt(v.pasiIncomplete)]);
      if (v.easiTotal != null) rows.push(['EASI', v.easiTotal + ' / 72 — ' + easiBand(v.easiTotal) + incTxt(v.easiIncomplete)]);
      if (v.scoradTotal != null) rows.push(['SCORAD', v.scoradTotal + ' / 103 — ' + scoradBand(v.scoradTotal) + incTxt(v.scoradIncomplete)]);
      if (v.acne) rows.push(['حب الشباب', v.acne]);
      if (v.iga != null) rows.push(['IGA', String(v.iga)]);
      if (v.bsa != null) rows.push(['BSA', v.bsa + '%']);
      if (v.dlqi && v.dlqi.total != null) rows.push(['DLQI', v.dlqi.total + ' / 30 — ' + dlqiBand(v.dlqi.total)]);
      return rows.length ? '<h4>📊 مقاييس الشدة</h4>' + SP.tableHtml(['المقياس', 'النتيجة'], rows) : '';
    }
  });

  // Fallback photos section; derm-plus.js (v56) replaces it with the dated before/after version (same `files` key).
  SP.addSection('dermatology', SP.filesSection({
    id: 'files',
    title: '📎 صور الحالة',
    hint: 'صور قبل / بعد العلاج.',
    folder: 'dermatology'
  }));
  window.ClinicDermScores = { regionTotal: regionTotal, regionComplete: regionComplete, scoradTotal: scoradTotal, dlqiScore: dlqiScore, W_ADULT: W_ADULT, W_CHILD: W_CHILD, PASI_S: PASI_S, EASI_S: EASI_S };
})();
} catch (e) { console.error('[specialties-bundle] dermatology.js failed:', e); }
/* ==== END dermatology.js ==== */

/* ==== BEGIN orthopedics.js ==== */
try {
// ============ Orthopedics module (وحدة العظام) ============
// Adds to the orthopedics specialty, on top of the shared exam fields:
//   1. مواضع الألم  — body areas + الجهة (يمين / يسار / الجهتين)
//   2. الإصابة والكسر — injury / trauma + fracture details
//   3. الأشعة والفحوصات — imaging rows (النوع / التاريخ / النتيجة / ملاحظات)
//   4. خطة العلاج والعلاج الطبيعي والمتابعة
//   5. المرفقات — أشعة / تقارير (نفس تخزين Firebase الحالي)

(function () {
  var SP = window.ClinicSpecialty;
  if (!SP) return;
  var esc = SP.escape;

  /* ---------- 1) Pain areas ---------- */
  var AREAS = ['الرقبة', 'الكتف', 'الذراع', 'الكوع', 'الرسغ', 'اليد', 'الظهر', 'الحوض', 'الفخذ',
               'الركبة', 'الساق', 'الكاحل', 'القدم'];
  var SIDES = ['يمين', 'يسار', 'الجهتان'];

  SP.addSection('orthopedics', {
    id: 'pain',
    title: '📍 مواضع الألم',
    html: function (v) {
      v = v || {};
      var picked = v.areas || [];
      var chips = AREAS.map(function (a) {
        var on = picked.indexOf(a) >= 0;
        return '<label class="ort-chip"><input type="checkbox" class="ort-area" value="' + esc(a) + '"' +
          (on ? ' checked' : '') + ' /> ' + esc(a) + '</label>';
      }).join('');
      var sides = SIDES.map(function (s) {
        return '<label class="ort-chip"><input type="radio" name="ortSide" class="ort-side" value="' + esc(s) + '"' +
          (v.side === s ? ' checked' : '') + ' /> ' + esc(s) + '</label>';
      }).join('');
      return '<p class="muted">حدد مواضع الألم والجهة.</p>' +
        '<div class="ort-chips">' + chips + '</div>' +
        '<div class="ort-chips ort-sides">' + sides + '</div>' +
        '<div class="field" style="margin-top:8px"><label>موضع آخر</label>' +
        '<input class="ort-other" value="' + esc(v.other || '') + '" placeholder="موضع غير مذكور" /></div>';
    },
    collect: function (el) {
      var areas = [];
      el.querySelectorAll('.ort-area:checked').forEach(function (c) { areas.push(c.value); });
      var sideEl = el.querySelector('.ort-side:checked');
      var other = (el.querySelector('.ort-other').value || '').trim();
      if (!areas.length && !sideEl && !other) return null;
      return { areas: areas, side: sideEl ? sideEl.value : '', other: other };
    },
    render: function (v) {
      if (!v) return '';
      var rows = [];
      if (v.areas && v.areas.length) rows.push(['المواضع', v.areas.join('، ')]);
      if (v.side) rows.push(['الجهة', v.side]);
      if (v.other) rows.push(['موضع آخر', v.other]);
      return rows.length ? SP.tableHtml(['البند', 'القيمة'], rows) : '';
    }
  });

  /* ---------- 2) Injury / fracture ---------- */
  var FR_TYPE = ['', 'مغلق', 'مفتوح'];
  var FR_DISP = ['', 'غير مزاح', 'مزاح'];

  SP.addSection('orthopedics', {
    id: 'fracture',
    title: '🦴 الإصابة والكسر',
    html: function (v) {
      v = v || {};
      function inp(k, l, ph) {
        return '<div class="field"><label>' + esc(l) + '</label><input class="ort-f" data-k="' + k +
          '" value="' + esc(v[k] || '') + '" placeholder="' + esc(ph || '') + '" /></div>';
      }
      function sel(k, l, opts) {
        return '<div class="field"><label>' + esc(l) + '</label><select class="ort-f" data-k="' + k + '">' +
          opts.map(function (o) {
            return '<option value="' + esc(o) + '"' + (o === v[k] ? ' selected' : '') + '>' + (o ? esc(o) : '—') + '</option>';
          }).join('') + '</select></div>';
      }
      return '<div class="grid-2">' +
        inp('mechanism', 'آلية الإصابة', 'سقوط / حادث / رياضة') +
        inp('injuryDate', 'تاريخ الإصابة', 'مثال: 2026-09-01') +
        inp('site', 'موضع الكسر', 'مثال: الكعبرة السفلية') +
        sel('type', 'نوع الكسر', FR_TYPE) +
        sel('displaced', 'الإزاحة', FR_DISP) +
        '<div class="field" style="grid-column:1 / -1"><label>وصف الكسر</label>' +
        '<textarea class="ort-f" data-k="desc" rows="2" placeholder="خط كسر واضح...">' + esc(v.desc || '') + '</textarea></div>' +
        '</div>';
    },
    collect: function (el) {
      var out = {}, any = false;
      el.querySelectorAll('.ort-f').forEach(function (f) {
        var val = (f.value || '').trim();
        if (val) { out[f.dataset.k] = val; any = true; }
      });
      return any ? out : null;
    },
    render: function (v) {
      if (!v) return '';
      var L = { mechanism: 'آلية الإصابة', injuryDate: 'تاريخ الإصابة', site: 'موضع الكسر',
                type: 'نوع الكسر', displaced: 'الإزاحة', desc: 'وصف الكسر' };
      var rows = Object.keys(L).filter(function (k) { return v[k]; })
        .map(function (k) { return [L[k], v[k]]; });
      return rows.length ? SP.tableHtml(['البند', 'القيمة'], rows) : '';
    }
  });

  /* ---------- 3) Imaging ---------- */
  var IMG_TYPES = ['', 'أشعة عادية (X-Ray)', 'رنين مغناطيسي (MRI)', 'أشعة مقطعية (CT)',
                   'موجات صوتية', 'قياس كثافة العظام', 'تحاليل', 'أخرى'];

  function imgRow(r) {
    r = r || {};
    return '<div class="ort-img-row">' +
      '<select class="i-type">' + IMG_TYPES.map(function (t) {
        return '<option value="' + esc(t) + '"' + (t === r.type ? ' selected' : '') + '>' + (t ? esc(t) : '— النوع —') + '</option>';
      }).join('') + '</select>' +
      '<input type="date" class="i-date" value="' + esc(r.date || '') + '" />' +
      '<input class="i-result" placeholder="النتيجة / التقرير" value="' + esc(r.result || '') + '" />' +
      '<input class="i-notes" placeholder="ملاحظات الطبيب" value="' + esc(r.notes || '') + '" />' +
      '<button type="button" class="btn small danger i-del">🗑</button>' +
      '</div>';
  }

  SP.addSection('orthopedics', {
    id: 'imaging',
    title: '🩻 الأشعة والفحوصات',
    html: function (v) {
      var rows = (v && v.length) ? v.map(function (r) { return imgRow(r); }).join('') : imgRow();
      return '<p class="muted">سجّل الأشعة والفحوصات ونتائجها.</p>' +
        '<div class="ort-img-list">' + rows + '</div>' +
        '<button type="button" class="btn ghost small ort-img-add">+ إضافة فحص</button>';
    },
    wire: function (el) {
      if (el._ortImgWired) return; el._ortImgWired = true;
      var list = el.querySelector('.ort-img-list');
      el.querySelector('.ort-img-add').addEventListener('click', function () {
        list.insertAdjacentHTML('beforeend', imgRow());
      });
      list.addEventListener('click', function (e) {
        if (!e.target.classList.contains('i-del')) return;
        var rows = list.querySelectorAll('.ort-img-row');
        if (rows.length === 1) {
          rows[0].querySelectorAll('input').forEach(function (i) { i.value = ''; });
          rows[0].querySelector('.i-type').value = '';
          return;
        }
        e.target.closest('.ort-img-row').remove();
      });
    },
    collect: function (el) {
      var out = [];
      el.querySelectorAll('.ort-img-row').forEach(function (r) {
        var type = r.querySelector('.i-type').value;
        var date = r.querySelector('.i-date').value;
        var result = (r.querySelector('.i-result').value || '').trim();
        var notes = (r.querySelector('.i-notes').value || '').trim();
        if (!type && !date && !result && !notes) return;
        out.push({ type: type, date: date, result: result, notes: notes });
      });
      return out.length ? out : null;
    },
    render: function (v) {
      if (!v || !v.length) return '';
      return SP.tableHtml(['نوع الفحص', 'التاريخ', 'النتيجة', 'ملاحظات'],
        v.map(function (r) { return [r.type, r.date || '-', r.result, r.notes]; }));
    }
  });

  /* ---------- 4) Treatment plan / physiotherapy / follow-up ---------- */
  SP.addSection('orthopedics', {
    id: 'plan',
    title: '📋 خطة العلاج والمتابعة',
    html: function (v) {
      v = v || {};
      function area(k, l, ph) {
        return '<div class="field" style="grid-column:1 / -1"><label>' + esc(l) + '</label>' +
          '<textarea class="ort-p" data-k="' + k + '" rows="2" placeholder="' + esc(ph) + '">' + esc(v[k] || '') + '</textarea></div>';
      }
      var immob = ['', 'لا يوجد', 'جبس', 'جبيرة', 'رباط ضاغط', 'دعامة', 'عكاز'];
      return '<div class="grid-2">' +
        '<div class="field"><label>التثبيت</label><select class="ort-p" data-k="immob">' +
        immob.map(function (o) {
          return '<option value="' + esc(o) + '"' + (o === v.immob ? ' selected' : '') + '>' + (o ? esc(o) : '—') + '</option>';
        }).join('') + '</select></div>' +
        '<div class="field"><label>موعد المتابعة</label><input type="date" class="ort-p" data-k="followUp" value="' + esc(v.followUp || '') + '" /></div>' +
        area('plan', 'خطة العلاج', 'مسكنات، تثبيت، جراحة...') +
        area('physio', 'العلاج الطبيعي', 'تمارين مدى الحركة 3 جلسات أسبوعياً...') +
        '</div>';
    },
    collect: function (el) {
      var out = {}, any = false;
      el.querySelectorAll('.ort-p').forEach(function (f) {
        var val = (f.value || '').trim();
        if (val) { out[f.dataset.k] = val; any = true; }
      });
      return any ? out : null;
    },
    render: function (v) {
      if (!v) return '';
      var L = { immob: 'التثبيت', plan: 'خطة العلاج', physio: 'العلاج الطبيعي', followUp: 'موعد المتابعة' };
      var rows = Object.keys(L).filter(function (k) { return v[k]; })
        .map(function (k) { return [L[k], v[k]]; });
      return rows.length ? SP.tableHtml(['البند', 'القيمة'], rows) : '';
    }
  });

  /* ---------- 5) Attachments ---------- */
  SP.addSection('orthopedics', SP.filesSection({
    id: 'files',
    title: '📎 مرفقات العظام',
    hint: 'صور الأشعة، الرنين، التقارير الطبية (JPG / PNG / PDF).',
    folder: 'orthopedics'
  }));
})();
} catch (e) { console.error('[specialties-bundle] orthopedics.js failed:', e); }
/* ==== END orthopedics.js ==== */

/* ==== BEGIN orthopedics-plus.js ==== */
try {
// ============ Orthopedics PLUS (v52) — وحدة العظام المتقدمة ============
// Additive module loaded AFTER orthopedics.js. It does not change how data is stored:
// every section saves inside exam.sections like the other specialty sections.
//
//  pain       (existing id)  + clickable body diagram (front/back SVG) synced with the old chips
//  fracture   (existing id)  + pattern, classification, side, intra-articular, NV injury, skin, union log
//  ortJoint   (new)          structured joint exam: ROM table, special tests, muscle power, measurements, gait
//  ortNeuro   (new)          pulses, cap refill, skin, dermatomes, reflexes + compartment banner
//  ortRedflags(new)          spine red flags + urgent banner
//  ortCast    (new)          cast / splint / brace tracker + patient instructions (printed in Arabic)
//  ortSurgery (new)          surgery + implants + post-op, injections/aspiration log with steroid warning
//  ortScores  (new)          Oswestry (ODI), QuickDASH, WOMAC with trend
//
// Old fields (rom, power, sensory...) in specialties.js stay untouched and keep working.
// Cast removal and suture removal dates feed the shared follow-up list (ClinicCare).

(function () {
  var SP = window.ClinicSpecialty;
  if (!SP) return;
  var CC = window.ClinicCare;
  var esc = SP.escape;

  /* ---------- small helpers ---------- */
  function bx(id, title, sum, body) {
    if (CC) return CC.box(id, title, sum, body, 'ort-box');
    return '<div class="ort-box"><h4>' + title + '</h4>' + body + '</div>';
  }
  function setSum(el, id, text) {
    if (!CC) return;
    var b = el.querySelector('.cc-box[data-cc="' + id + '"]');
    CC.setSummary(b, text);
  }
  function opt(list, val, blank) {
    return list.map(function (o) {
      var v = Array.isArray(o) ? o[0] : o, l = Array.isArray(o) ? o[1] : o;
      return '<option value="' + esc(v) + '"' + (String(v) === String(val == null ? '' : val) ? ' selected' : '') + '>' + (v === '' ? (blank || '—') : esc(l)) + '</option>';
    }).join('');
  }
  function today() { return CC ? CC.today() : new Date().toISOString().slice(0, 10); }
  function days(a, b) { return Math.round((new Date(b + 'T00:00:00') - new Date(a + 'T00:00:00')) / 86400000); }
  function val(el, sel) { var x = el.querySelector(sel); return x ? (x.value || '').trim() : ''; }
  function prevVisits() {
    var p = CC && CC.getPatient();
    return p ? CC.visitsFor(p) : [];
  }
  var SIDE3 = ['', 'يمين', 'يسار', 'الجهتان'];
  var SIDE2 = ['', 'يمين', 'يسار'];

  /* =====================================================================
     1) PAIN AREAS + BODY DIAGRAM  (same data: {areas:[], side:'', other:''})
     ===================================================================== */
  var AREAS = ['الرقبة', 'الكتف', 'الذراع', 'الكوع', 'الرسغ', 'اليد', 'الظهر', 'الحوض', 'الفخذ',
               'الركبة', 'الساق', 'الكاحل', 'القدم'];
  var SIDES = ['يمين', 'يسار', 'الجهتان'];
  // [area, shape, x, y, w/r, h]  — x is for the viewer-LEFT copy; paired parts are mirrored around x=60
  var PARTS = [
    ['الكتف', 'e', 38, 46, 10, 7, true],
    ['الذراع', 'r', 25, 54, 9, 30, true],
    ['الكوع', 'c', 29.5, 89, 5.5, 0, true],
    ['الذراع', 'r', 25, 95, 9, 21, true],
    ['الرسغ', 'c', 29.5, 120, 4.5, 0, true],
    ['اليد', 'e', 29.5, 133, 5.5, 8, true],
    ['الفخذ', 'r', 45, 120, 13, 44, true],
    ['الركبة', 'c', 51.5, 170, 6.5, 0, true],
    ['الساق', 'r', 46, 177, 11, 42, true],
    ['الكاحل', 'c', 51.5, 223, 4.5, 0, true],
    ['القدم', 'e', 51.5, 233, 7, 4, true],
    ['الرقبة', 'r', 54, 30, 12, 10, false],
    ['الحوض', 'r', 44, 100, 32, 18, false]
  ];
  function shape(p, x, attrs) {
    if (p[1] === 'r') return '<rect x="' + x + '" y="' + p[3] + '" width="' + p[4] + '" height="' + p[5] + '" rx="3" ' + attrs + '/>';
    if (p[1] === 'c') return '<circle cx="' + x + '" cy="' + p[3] + '" r="' + p[4] + '" ' + attrs + '/>';
    return '<ellipse cx="' + x + '" cy="' + p[3] + '" rx="' + p[4] + '" ry="' + p[5] + '" ' + attrs + '/>';
  }
  function bodySvg(view) {
    // front view: patient's RIGHT is on the viewer's LEFT; back view: patient's RIGHT is on the viewer's RIGHT
    var s = '<svg viewBox="0 0 120 245" class="ort-body" data-view="' + view + '" direction="ltr">' +
      '<circle cx="60" cy="17" r="12" class="ort-deco"/>' +
      (view === 'back'
        ? '<rect x="44" y="40" width="32" height="58" rx="5" class="ort-part" data-area="الظهر" data-side=""><title>الظهر</title></rect>'
        : '<rect x="44" y="40" width="32" height="58" rx="5" class="ort-deco"/>');
    PARTS.forEach(function (p) {
      if (!p[6]) { s += shape(p, p[2], 'class="ort-part" data-area="' + p[0] + '" data-side=""') ; return; }
      var w = p[1] === 'r' ? p[4] : 0;
      var xMirror = 120 - p[2] - w;
      var leftSide = view === 'front' ? 'يمين' : 'يسار';
      var rightSide = view === 'front' ? 'يسار' : 'يمين';
      s += shape(p, p[2], 'class="ort-part" data-area="' + p[0] + '" data-side="' + leftSide + '"');
      s += shape(p, xMirror, 'class="ort-part" data-area="' + p[0] + '" data-side="' + rightSide + '"');
    });
    s += '<text x="6" y="240" class="ort-lbl">' + (view === 'front' ? 'R' : 'L') + '</text>' +
         '<text x="108" y="240" class="ort-lbl">' + (view === 'front' ? 'L' : 'R') + '</text></svg>';
    return s;
  }
  function paintBody(el) {
    var areas = [];
    el.querySelectorAll('.ort-area:checked').forEach(function (c) { areas.push(c.value); });
    var sEl = el.querySelector('.ort-side:checked'), side = sEl ? sEl.value : '';
    el.querySelectorAll('.ort-part').forEach(function (p) {
      var a = p.getAttribute('data-area'), ps = p.getAttribute('data-side');
      var on = areas.indexOf(a) >= 0 && (!ps || !side || side === 'الجهتان' || side === ps);
      p.classList.toggle('on', on);
    });
    setSum(el, 'ort-pain', (areas.join('، ') || '') + (side ? ' — ' + side : ''));
  }

  SP.addSection('orthopedics', {
    id: 'pain',
    title: '📍 مواضع الألم',
    html: function (v) {
      v = v || {};
      var picked = v.areas || [];
      var chips = AREAS.map(function (a) {
        return '<label class="ort-chip"><input type="checkbox" class="ort-area" value="' + esc(a) + '"' +
          (picked.indexOf(a) >= 0 ? ' checked' : '') + ' /> ' + esc(a) + '</label>';
      }).join('');
      var sides = SIDES.map(function (s) {
        return '<label class="ort-chip"><input type="radio" name="ortSide" class="ort-side" value="' + esc(s) + '"' +
          (v.side === s ? ' checked' : '') + ' /> ' + esc(s) + '</label>';
      }).join('');
      var body = '<p class="muted">حدد مواضع الألم والجهة — من القائمة أو بالضغط على الرسم.</p>' +
        '<div class="ort-chips">' + chips + '</div>' +
        '<div class="ort-chips ort-sides">' + sides + '</div>' +
        '<div class="field" style="margin-top:8px"><label>موضع آخر</label>' +
        '<input class="ort-other" value="' + esc(v.other || '') + '" placeholder="موضع غير مذكور" /></div>' +
        bx('ort-diagram', '🧍 رسم الجسم', 'أمام / خلف',
          '<div class="ort-bodies"><div><b>أمام</b>' + bodySvg('front') + '</div><div><b>خلف</b>' + bodySvg('back') + '</div></div>' +
          '<p class="muted">اضغط على الجزء لتحديده؛ الضغط على الجهة الأخرى يجعلها «الجهتان».</p>');
      return bx('ort-pain', '📍 مواضع الألم', (picked.join('، ') || '') + (v.side ? ' — ' + v.side : ''), body);
    },
    wire: function (el) {
      if (el._ortPainWired) return; el._ortPainWired = true;
      el.addEventListener('change', function (e) {
        if (e.target.matches('.ort-area, .ort-side')) paintBody(el);
      });
      el.addEventListener('click', function (e) {
        var p = e.target.closest && e.target.closest('.ort-part');
        if (!p) return;
        var a = p.getAttribute('data-area'), ps = p.getAttribute('data-side');
        var chk = el.querySelector('.ort-area[value="' + a + '"]');
        var sEl = el.querySelector('.ort-side:checked'), side = sEl ? sEl.value : '';
        var newSide = side;
        if (!chk.checked) {
          chk.checked = true;
          if (ps) newSide = !side ? ps : (side === ps || side === 'الجهتان' ? side : 'الجهتان');
        } else if (!ps) {
          chk.checked = false;
        } else if (side === 'الجهتان') {
          newSide = ps === 'يمين' ? 'يسار' : 'يمين';
        } else if (side && side !== ps) {
          newSide = 'الجهتان';
        } else {
          chk.checked = false;
        }
        if (newSide !== side) {
          var r = el.querySelector('.ort-side[value="' + newSide + '"]');
          if (r) r.checked = true;
        }
        paintBody(el);
      });
      paintBody(el);
    },
    collect: function (el) {
      var areas = [];
      el.querySelectorAll('.ort-area:checked').forEach(function (c) { areas.push(c.value); });
      var sideEl = el.querySelector('.ort-side:checked');
      var other = val(el, '.ort-other');
      if (!areas.length && !sideEl && !other) return null;
      return { areas: areas, side: sideEl ? sideEl.value : '', other: other };
    },
    render: function (v) {
      if (!v) return '';
      var rows = [];
      if (v.areas && v.areas.length) rows.push(['المواضع', v.areas.join('، ')]);
      if (v.side) rows.push(['الجهة', v.side]);
      if (v.other) rows.push(['موضع آخر', v.other]);
      return rows.length ? SP.tableHtml(['البند', 'القيمة'], rows) : '';
    }
  });

  /* =====================================================================
     2) STRUCTURED JOINT EXAM
     data: { joints: { knee: { side, rom:{flex:{a,p,pain}}, tests:{Lachman:'+'|'-'|'nd'}, power:{Quadriceps:'4'} } },
             measures: { llR, llL, thR, thL, caR, caL }, gait }
     ===================================================================== */
  var JOINTS = [
    { id: 'neck', l: 'الرقبة (Neck)', limb: 'upper',
      rom: [['flex', 'Flexion', 50], ['ext', 'Extension', 60], ['lat', 'Lateral flexion', 45], ['rot', 'Rotation', 80]],
      tests: ['Spurling'], power: ['Deltoid (C5)', 'Biceps (C6)', 'Triceps (C7)', 'Finger flexors (C8)', 'Interossei (T1)'] },
    { id: 'shoulder', l: 'الكتف (Shoulder)', limb: 'upper',
      rom: [['flex', 'Flexion', 180], ['abd', 'Abduction', 180], ['ir', 'Internal rotation', 70], ['er', 'External rotation', 90]],
      tests: ['Neer', 'Hawkins-Kennedy', 'Empty can', 'Speed', 'Apprehension'],
      power: ['Deltoid', 'Supraspinatus', 'Infraspinatus', 'Subscapularis', 'Biceps'] },
    { id: 'elbow', l: 'الكوع (Elbow)', limb: 'upper',
      rom: [['flex', 'Flexion', 150], ['ext', 'Extension', 0], ['pro', 'Pronation', 80], ['sup', 'Supination', 80]],
      tests: [], power: ['Biceps', 'Triceps', 'Brachioradialis'] },
    { id: 'wrist', l: 'الرسغ واليد (Wrist/Hand)', limb: 'upper',
      rom: [['flex', 'Flexion', 80], ['ext', 'Extension', 70], ['rd', 'Radial deviation', 20], ['ud', 'Ulnar deviation', 30]],
      tests: ['Phalen', 'Tinel', 'Finkelstein'], power: ['Wrist flexors', 'Wrist extensors', 'Grip', 'Thumb abduction'] },
    { id: 'lumbar', l: 'الفقرات القطنية (Lumbar spine)', limb: 'lower',
      rom: [['flex', 'Flexion', 60], ['ext', 'Extension', 25], ['lat', 'Lateral flexion', 25], ['rot', 'Rotation', 30]],
      tests: ['Straight leg raise', 'Slump', 'Femoral stretch'],
      power: ['Hip flexors (L2)', 'Knee extensors (L3)', 'Ankle dorsiflexors (L4)', 'EHL (L5)', 'Plantar flexors (S1)'] },
    { id: 'hip', l: 'الحوض (Hip)', limb: 'lower',
      rom: [['flex', 'Flexion', 120], ['ext', 'Extension', 30], ['abd', 'Abduction', 45], ['add', 'Adduction', 30], ['ir', 'Internal rotation', 40], ['er', 'External rotation', 45]],
      tests: ['Thomas', 'Trendelenburg', 'FABER', 'FADIR'], power: ['Hip flexors', 'Hip extensors', 'Hip abductors', 'Hip adductors'] },
    { id: 'knee', l: 'الركبة (Knee)', limb: 'lower',
      rom: [['flex', 'Flexion', 135], ['ext', 'Extension', 0]],
      tests: ['Lachman', 'Anterior drawer', 'Posterior drawer', 'McMurray', 'Valgus stress', 'Varus stress', 'Patellar grind'],
      power: ['Quadriceps', 'Hamstrings'] },
    { id: 'ankle', l: 'الكاحل والقدم (Ankle/Foot)', limb: 'lower',
      rom: [['df', 'Dorsiflexion', 20], ['pf', 'Plantar flexion', 50], ['inv', 'Inversion', 35], ['ev', 'Eversion', 15]],
      tests: ['Anterior drawer', 'Thompson'], power: ['Tibialis anterior', 'Gastrocnemius', 'Peronei', 'EHL'] }
  ];
  function jointById(id) { for (var i = 0; i < JOINTS.length; i++) if (JOINTS[i].id === id) return JOINTS[i]; return null; }
  var GAIT = ['', 'طبيعية (Normal)', 'مؤلمة (Antalgic)', 'ترندلنبرج (Trendelenburg)', 'عرج باستخدام وسيلة مساعدة (Limping with aid)'];
  var TEST_V = [['+', 'إيجابي +'], ['-', 'سلبي −'], ['nd', 'لم يُجرَ']];

  function jointSummary(j, d) {
    var parts = [];
    j.rom.forEach(function (r) { var x = (d.rom || {})[r[0]]; if (x && (x.a !== '' && x.a != null)) parts.push(r[1] + ' ' + x.a + '°'); });
    j.tests.forEach(function (t) { var x = (d.tests || {})[t]; if (x === '+' || x === '-') parts.push(t + ' ' + (x === '+' ? '+' : '−')); });
    return j.l.split(' (')[0] + (d.side ? ' ' + d.side : '') + (parts.length ? ': ' + parts.slice(0, 4).join('، ') : '');
  }
  function jointBlock(j, d, on) {
    d = d || {};
    var rom = '<div class="table-wrap"><table class="ort-rom"><thead><tr><th>الحركة</th><th>إيجابي (Active)°</th><th>سلبي (Passive)°</th><th>الطبيعي°</th><th>مؤلم</th></tr></thead><tbody>' +
      j.rom.map(function (r) {
        var x = (d.rom || {})[r[0]] || {};
        return '<tr data-m="' + r[0] + '" data-n="' + r[2] + '"><td>' + r[1] + '</td>' +
          '<td><input type="number" class="rom-a" value="' + esc(x.a == null ? '' : x.a) + '" /></td>' +
          '<td><input type="number" class="rom-p" value="' + esc(x.p == null ? '' : x.p) + '" /></td>' +
          '<td class="muted">' + r[2] + '</td>' +
          '<td><input type="checkbox" class="rom-pain"' + (x.pain ? ' checked' : '') + ' /></td></tr>';
      }).join('') + '</tbody></table></div>';
    var tests = j.tests.length ? '<h5 class="ort-h5">الاختبارات الخاصة (Special tests)</h5><div class="ort-tests">' + j.tests.map(function (t) {
      var cur = (d.tests || {})[t] || '';
      return '<div class="ort-test" data-t="' + esc(t) + '"><span>' + esc(t) + '</span><span class="ort-seg">' +
        TEST_V.map(function (o) { return '<button type="button" class="ort-segb' + (cur === o[0] ? ' on' : '') + '" data-v="' + o[0] + '">' + o[1] + '</button>'; }).join('') +
        '</span></div>';
    }).join('') + '</div>' : '';
    var power = '<h5 class="ort-h5">قوة العضلات (0–5)</h5><div class="grid-2">' + j.power.map(function (m) {
      return '<div class="field"><label>' + esc(m) + '</label><select class="pw" data-m="' + esc(m) + '">' + opt(['', '0', '1', '2', '3', '4', '5'], (d.power || {})[m]) + '</select></div>';
    }).join('') + '</div>';
    var body = '<div class="field" style="max-width:220px"><label>الجهة</label><select class="j-side">' + opt(SIDE3, d.side) + '</select></div>' +
      rom + tests + power;
    return '<div class="ort-joint" data-j="' + j.id + '"' + (on ? '' : ' hidden') + '>' +
      bx('ort-j-' + j.id, '🦵 ' + j.l, jointSummary(j, d), body) + '</div>';
  }
  function readJoint(jel) {
    var j = jointById(jel.getAttribute('data-j')), d = { side: val(jel, '.j-side'), rom: {}, tests: {}, power: {} };
    jel.querySelectorAll('tr[data-m]').forEach(function (tr) {
      var a = tr.querySelector('.rom-a').value, p = tr.querySelector('.rom-p').value, pain = tr.querySelector('.rom-pain').checked;
      if (a !== '' || p !== '' || pain) d.rom[tr.getAttribute('data-m')] = { a: a === '' ? '' : Number(a), p: p === '' ? '' : Number(p), pain: pain };
    });
    jel.querySelectorAll('.ort-test').forEach(function (t) {
      var on = t.querySelector('.ort-segb.on'); if (on) d.tests[t.getAttribute('data-t')] = on.getAttribute('data-v');
    });
    jel.querySelectorAll('.pw').forEach(function (s) { if (s.value !== '') d.power[s.getAttribute('data-m')] = s.value; });
    return { j: j, d: d };
  }
  function paintRom(el) {
    el.querySelectorAll('tr[data-n]').forEach(function (tr) {
      var n = Number(tr.getAttribute('data-n'));
      ['.rom-a', '.rom-p'].forEach(function (s) {
        var i = tr.querySelector(s); i.classList.toggle('ort-low', i.value !== '' && Number(i.value) < n);
      });
    });
  }
  function diffTxt(r, l) { return (r !== '' && l !== '' && !isNaN(r) && !isNaN(l)) ? (Math.abs(Number(r) - Number(l)).toFixed(1).replace(/\.0$/, '') + ' سم') : '—'; }

  SP.addSection('orthopedics', {
    id: 'ortJoint',
    title: '🦵 فحص المفاصل المنظم',
    html: function (v) {
      v = v || {};
      var J = v.joints || {}, m = v.measures || {};
      var sel = JOINTS.map(function (j) {
        return '<label class="ort-chip"><input type="checkbox" class="j-pick" value="' + j.id + '"' + (J[j.id] ? ' checked' : '') + ' /> ' + esc(j.l) + '</label>';
      }).join('');
      var blocks = JOINTS.map(function (j) { return jointBlock(j, J[j.id], !!J[j.id]); }).join('');
      function mi(k, l) { return '<div class="field"><label>' + l + '</label><input type="number" step="0.1" class="ms" data-k="' + k + '" value="' + esc(m[k] == null ? '' : m[k]) + '" /></div>'; }
      var meas = '<div class="grid-2">' + mi('llR', 'طول الطرف السفلي يمين (سم)') + mi('llL', 'طول الطرف السفلي يسار (سم)') +
        '<p class="muted" style="grid-column:1/-1">الفرق: <b class="ms-d" data-a="llR" data-b="llL"></b></p>' +
        mi('thR', 'محيط الفخذ يمين (سم)') + mi('thL', 'محيط الفخذ يسار (سم)') +
        '<p class="muted" style="grid-column:1/-1">الفرق: <b class="ms-d" data-a="thR" data-b="thL"></b></p>' +
        mi('caR', 'محيط الساق يمين (سم)') + mi('caL', 'محيط الساق يسار (سم)') +
        '<p class="muted" style="grid-column:1/-1">الفرق: <b class="ms-d" data-a="caR" data-b="caL"></b></p>' +
        '<div class="field"><label>نوع المشية (Gait)</label><select class="gait">' + opt(GAIT, v.gait) + '</select></div></div>';
      var sum = Object.keys(J).map(function (k) { var j = jointById(k); return j ? jointSummary(j, J[k]) : ''; }).filter(Boolean).join(' | ');
      return bx('ort-joint', '🦵 فحص المفاصل المنظم', sum,
        '<p class="muted">اختر المفصل (يمكن أكثر من مفصل). القيم الأقل من الطبيعي تظهر باللون البرتقالي.</p>' +
        '<div class="ort-chips">' + sel + '</div>' + blocks +
        bx('ort-measure', '📏 القياسات والمشية', v.gait || '', meas));
    },
    wire: function (el) {
      if (el._ortJWired) return; el._ortJWired = true;
      function refresh() {
        paintRom(el);
        el.querySelectorAll('.ms-d').forEach(function (b) {
          b.textContent = diffTxt(val(el, '.ms[data-k="' + b.getAttribute('data-a') + '"]'), val(el, '.ms[data-k="' + b.getAttribute('data-b') + '"]'));
        });
        var s = [];
        el.querySelectorAll('.ort-joint:not([hidden])').forEach(function (jel) {
          var r = readJoint(jel), t = jointSummary(r.j, r.d); s.push(t); setSum(jel, 'ort-j-' + r.j.id, t);
        });
        setSum(el, 'ort-joint', s.join(' | '));
        setSum(el, 'ort-measure', val(el, '.gait'));
      }
      el.addEventListener('change', function (e) {
        if (e.target.classList.contains('j-pick')) {
          var b = el.querySelector('.ort-joint[data-j="' + e.target.value + '"]');
          b.hidden = !e.target.checked;
          if (e.target.checked && CC) { var x = b.querySelector('.cc-box'); if (x && !x.classList.contains('open')) CC.setBoxOpen(x, true); }
        }
        refresh();
      });
      el.addEventListener('input', refresh);
      el.addEventListener('click', function (e) {
        var b = e.target.closest && e.target.closest('.ort-segb');
        if (!b) return;
        var on = b.classList.contains('on');
        b.parentNode.querySelectorAll('.ort-segb').forEach(function (x) { x.classList.remove('on'); });
        if (!on) b.classList.add('on');
        refresh();
      });
      refresh();
    },
    collect: function (el) {
      var out = { joints: {}, measures: {}, gait: val(el, '.gait') }, any = !!out.gait;
      el.querySelectorAll('.j-pick:checked').forEach(function (c) {
        out.joints[c.value] = readJoint(el.querySelector('.ort-joint[data-j="' + c.value + '"]')).d; any = true;
      });
      el.querySelectorAll('.ms').forEach(function (i) { if (i.value !== '') { out.measures[i.getAttribute('data-k')] = Number(i.value); any = true; } });
      return any ? out : null;
    },
    render: function (v) {
      if (!v) return '';
      var h = '';
      Object.keys(v.joints || {}).forEach(function (k) {
        var j = jointById(k), d = v.joints[k]; if (!j) return;
        var rows = j.rom.filter(function (r) { return (d.rom || {})[r[0]]; }).map(function (r) {
          var x = d.rom[r[0]];
          return [r[1], (x.a === '' ? '-' : x.a + '°'), (x.p === '' ? '-' : x.p + '°'), r[2] + '°', x.pain ? 'نعم' : ''];
        });
        h += '<p><b>' + esc(j.l) + (d.side ? ' — ' + esc(d.side) : '') + '</b></p>';
        if (rows.length) h += SP.tableHtml(['الحركة', 'Active', 'Passive', 'الطبيعي', 'مؤلم'], rows);
        var t = Object.keys(d.tests || {}).map(function (n) { return [n, d.tests[n] === '+' ? 'إيجابي +' : d.tests[n] === '-' ? 'سلبي −' : 'لم يُجرَ']; });
        if (t.length) h += SP.tableHtml(['الاختبار', 'النتيجة'], t);
        var p = Object.keys(d.power || {}).map(function (n) { return [n, d.power[n] + '/5']; });
        if (p.length) h += SP.tableHtml(['العضلة', 'القوة'], p);
      });
      var m = v.measures || {}, mr = [];
      if (m.llR != null || m.llL != null) mr.push(['طول الطرف السفلي (يمين / يسار)', (m.llR == null ? '-' : m.llR) + ' / ' + (m.llL == null ? '-' : m.llL) + ' — الفرق ' + diffTxt(m.llR == null ? '' : m.llR, m.llL == null ? '' : m.llL)]);
      if (m.thR != null || m.thL != null) mr.push(['محيط الفخذ (يمين / يسار)', (m.thR == null ? '-' : m.thR) + ' / ' + (m.thL == null ? '-' : m.thL)]);
      if (m.caR != null || m.caL != null) mr.push(['محيط الساق (يمين / يسار)', (m.caR == null ? '-' : m.caR) + ' / ' + (m.caL == null ? '-' : m.caL)]);
      if (v.gait) mr.push(['المشية', v.gait]);
      if (mr.length) h += SP.tableHtml(['القياس', 'القيمة'], mr);
      return h;
    }
  });

  /* =====================================================================
     3) NEUROVASCULAR EXAM
     ===================================================================== */
  var PULSES = [['radial', 'Radial'], ['ulnar', 'Ulnar'], ['dp', 'Dorsalis pedis'], ['pt', 'Posterior tibial']];
  var PULSE_V = [['', '—'], ['present', 'موجود'], ['weak', 'ضعيف'], ['absent', 'غير موجود']];
  var DERM = ['C5', 'C6', 'C7', 'C8', 'T1', 'L2', 'L3', 'L4', 'L5', 'S1'];
  var SENS_V = [['', '—'], ['normal', 'طبيعي'], ['reduced', 'ناقص'], ['absent', 'غير موجود']];
  var REFLEX = [['biceps', 'Biceps'], ['triceps', 'Triceps'], ['knee', 'Knee'], ['ankle', 'Ankle']];
  function lbl(list, v) { for (var i = 0; i < list.length; i++) if (list[i][0] === v) return list[i][1]; return v; }
  function rlRow(prefix, key, name, list, d) {
    d = d || {};
    return '<tr><td>' + name + '</td><td><select class="nv" data-k="' + prefix + '.' + key + '.R">' + opt(list, d.R) + '</select></td>' +
      '<td><select class="nv" data-k="' + prefix + '.' + key + '.L">' + opt(list, d.L) + '</select></td></tr>';
  }
  function nvAlert(v) {
    var bad = false;
    ['pulses', 'sensation'].forEach(function (g) {
      var o = (v || {})[g] || {};
      Object.keys(o).forEach(function (k) { if ((o[k] || {}).R === 'absent' || (o[k] || {}).L === 'absent') bad = true; });
    });
    return bad;
  }
  function nvCollect(el) {
    var out = {}, any = false;
    el.querySelectorAll('.nv').forEach(function (s) {
      if (!s.value) return;
      var k = s.getAttribute('data-k').split('.');
      out[k[0]] = out[k[0]] || {}; out[k[0]][k[1]] = out[k[0]][k[1]] || {}; out[k[0]][k[1]][k[2]] = s.value; any = true;
    });
    ['capRefill', 'skinColor', 'skinTemp'].forEach(function (k) { var x = val(el, '.nv1[data-k="' + k + '"]'); if (x) { out[k] = x; any = true; } });
    return any ? out : null;
  }
  function nvSummary(v) {
    if (!v) return '';
    var n = 0; ['pulses', 'sensation', 'reflexes'].forEach(function (g) { n += Object.keys(v[g] || {}).length; });
    return (nvAlert(v) ? '⚠️ نبض/إحساس غير موجود · ' : '') + (n ? n + ' بند مسجّل' : '') + (v.capRefill ? ' · CRT ' + v.capRefill : '');
  }
  var NV_BANNER = '🚨 افحص الحالة العصبية الوعائية / احتمال متلازمة الحيز (Compartment syndrome)';

  SP.addSection('orthopedics', {
    id: 'ortNeuro',
    title: '🩸 الفحص العصبي الوعائي',
    html: function (v) {
      v = v || {};
      function t(head, rows) { return '<div class="table-wrap"><table class="ort-nv"><thead><tr><th>' + head + '</th><th>يمين</th><th>يسار</th></tr></thead><tbody>' + rows + '</tbody></table></div>'; }
      var body = '<div class="ort-banner ort-red nv-banner"' + (nvAlert(v) ? '' : ' hidden') + '>' + NV_BANNER + '</div>' +
        bx('ort-nv-pulse', 'النبض والدورة الدموية', '',
          t('النبض', PULSES.map(function (p) { return rlRow('pulses', p[0], p[1], PULSE_V, (v.pulses || {})[p[0]]); }).join('')) +
          '<div class="grid-2">' +
          '<div class="field"><label>امتلاء الشعيرات (Capillary refill)</label><select class="nv1" data-k="capRefill">' + opt(['', '< 2 ث', '2–3 ث', '> 3 ث'], v.capRefill) + '</select></div>' +
          '<div class="field"><label>لون الجلد</label><select class="nv1" data-k="skinColor">' + opt(['', 'طبيعي', 'شاحب', 'مزرق', 'محمر'], v.skinColor) + '</select></div>' +
          '<div class="field"><label>حرارة الجلد</label><select class="nv1" data-k="skinTemp">' + opt(['', 'دافئ', 'بارد', 'ساخن'], v.skinTemp) + '</select></div></div>') +
        bx('ort-nv-sens', 'الإحساس حسب الـ Dermatome', 'C5–T1 · L2–S1',
          t('Dermatome', DERM.map(function (d) { return rlRow('sensation', d, d, SENS_V, (v.sensation || {})[d]); }).join(''))) +
        bx('ort-nv-refl', 'المنعكسات (0–4)', '',
          t('Reflex', REFLEX.map(function (r) { return rlRow('reflexes', r[0], r[1], [['', '—'], ['0', '0'], ['1', '1+'], ['2', '2+'], ['3', '3+'], ['4', '4+']], (v.reflexes || {})[r[0]]); }).join('')));
      return bx('ort-neuro', '🩸 الفحص العصبي الوعائي', nvSummary(v), body);
    },
    wire: function (el) {
      if (el._ortNvWired) return; el._ortNvWired = true;
      el.addEventListener('change', function () {
        var v = nvCollect(el);
        el.querySelector('.nv-banner').hidden = !nvAlert(v);
        setSum(el, 'ort-neuro', nvSummary(v));
      });
    },
    collect: nvCollect,
    render: function (v) {
      if (!v) return '';
      var h = nvAlert(v) ? '<p style="color:#b91c1c"><b>' + NV_BANNER + '</b></p>' : '';
      function grp(g, names, list) {
        var o = v[g] || {};
        var rows = Object.keys(o).map(function (k) { return [lbl(names, k), lbl(list, o[k].R || '') || '-', lbl(list, o[k].L || '') || '-']; });
        return rows.length ? SP.tableHtml(['', 'يمين', 'يسار'], rows) : '';
      }
      h += grp('pulses', PULSES, PULSE_V) + grp('sensation', DERM.map(function (d) { return [d, d]; }), SENS_V) + grp('reflexes', REFLEX, [['0', '0'], ['1', '1+'], ['2', '2+'], ['3', '3+'], ['4', '4+']]);
      var r = [];
      if (v.capRefill) r.push(['Capillary refill', v.capRefill]);
      if (v.skinColor) r.push(['لون الجلد', v.skinColor]);
      if (v.skinTemp) r.push(['حرارة الجلد', v.skinTemp]);
      if (r.length) h += SP.tableHtml(['البند', 'القيمة'], r);
      return h;
    }
  });

  /* =====================================================================
     4) SPINE RED FLAGS
     ===================================================================== */
  var FLAGS = [
    ['saddle', 'خدر في منطقة السرج (Saddle anesthesia)', true],
    ['bladder', 'مشكلة جديدة في التحكم بالبول / البراز', true],
    ['weakness', 'ضعف متزايد في الساقين', false],
    ['fever', 'حرارة', false],
    ['weight', 'نقص وزن غير مبرر', false],
    ['cancer', 'تاريخ مرضي لورم', false],
    ['trauma', 'إصابة شديدة', false],
    ['night', 'ألم ليلي غير مرتبط بالحركة', false],
    ['age50', 'العمر أكبر من 50 مع أول نوبة', false]
  ];
  var RF_BANNER = '🚨 تحويل عاجل / رنين مغناطيسي عاجل (Urgent referral / MRI)';
  function rfUrgent(list) { return list.indexOf('saddle') >= 0 || list.indexOf('bladder') >= 0; }
  function rfLabel(k) { for (var i = 0; i < FLAGS.length; i++) if (FLAGS[i][0] === k) return FLAGS[i][1]; return k; }
  SP.addSection('orthopedics', {
    id: 'ortRedflags',
    title: '🚩 علامات الخطر في العمود الفقري',
    html: function (v) {
      var f = (v && v.flags) || [];
      var body = '<div class="ort-banner ort-red rf-banner"' + (rfUrgent(f) ? '' : ' hidden') + '>' + RF_BANNER + '</div>' +
        '<div class="ort-checks">' + FLAGS.map(function (x) {
          return '<label class="ort-chip' + (x[2] ? ' ort-chip-red' : '') + '"><input type="checkbox" class="rf" value="' + x[0] + '"' + (f.indexOf(x[0]) >= 0 ? ' checked' : '') + ' /> ' + esc(x[1]) + '</label>';
        }).join('') + '</div>';
      return bx('ort-rf', '🚩 علامات الخطر في العمود الفقري (Red flags)', f.length ? (rfUrgent(f) ? '🚨 ' : '') + f.length + ' علامة' : '', body);
    },
    wire: function (el) {
      if (el._ortRfWired) return; el._ortRfWired = true;
      el.addEventListener('change', function () {
        var f = []; el.querySelectorAll('.rf:checked').forEach(function (c) { f.push(c.value); });
        el.querySelector('.rf-banner').hidden = !rfUrgent(f);
        setSum(el, 'ort-rf', f.length ? (rfUrgent(f) ? '🚨 ' : '') + f.length + ' علامة' : '');
      });
    },
    collect: function (el) {
      var f = []; el.querySelectorAll('.rf:checked').forEach(function (c) { f.push(c.value); });
      return f.length ? { flags: f, urgent: rfUrgent(f) } : null;
    },
    render: function (v) {
      if (!v || !v.flags || !v.flags.length) return '';
      return (rfUrgent(v.flags) ? '<p style="color:#b91c1c"><b>' + RF_BANNER + '</b></p>' : '') +
        SP.tableHtml(['علامة الخطر', ''], v.flags.map(function (k) { return [rfLabel(k), '✔']; }));
    }
  });

  /* =====================================================================
     5) FRACTURE (existing fields kept) + pattern / classification / union log
     ===================================================================== */
  var FR_TYPE = ['', 'مغلق', 'مفتوح'];
  var FR_DISP = ['', 'غير مزاح', 'مزاح'];
  var FR_PATTERN = ['', 'عرضي (Transverse)', 'مائل (Oblique)', 'حلزوني (Spiral)', 'مفتت (Comminuted)', 'قطعي (Segmental)',
                    'غصن أخضر (Greenstick)', 'قلعي (Avulsion)', 'إجهادي (Stress)'];
  var FR_CLASS = [
    ['Salter-Harris (أطفال)', ['Salter-Harris I', 'Salter-Harris II', 'Salter-Harris III', 'Salter-Harris IV', 'Salter-Harris V']],
    ['Garden (عنق الفخذ)', ['Garden I', 'Garden II', 'Garden III', 'Garden IV']],
    ['Gustilo (الكسور المفتوحة)', ['Gustilo I', 'Gustilo II', 'Gustilo IIIA', 'Gustilo IIIB', 'Gustilo IIIC']],
    ['Weber (الكاحل)', ['Weber A', 'Weber B', 'Weber C']],
    ['Neer (أعلى عظمة العضد)', ['Neer 1-part', 'Neer 2-part', 'Neer 3-part', 'Neer 4-part']]
  ];
  var UNION = ['', 'لم يلتحم', 'التحام متأخر', 'ملتحم', 'عدم التحام (Non-union)'];
  var FR_L = { mechanism: 'آلية الإصابة', injuryDate: 'تاريخ الإصابة', site: 'موضع الكسر', type: 'نوع الكسر',
    displaced: 'الإزاحة', desc: 'وصف الكسر', pattern: 'نمط الكسر', classification: 'التصنيف', ao: 'تصنيف AO/OTA',
    side: 'الجهة', intra: 'داخل المفصل', nvInjury: 'إصابة عصبية / وعائية', skin: 'حالة الجلد' };
  function unionRow(r) {
    r = r || {};
    return '<div class="ort-img-row ort-un-row"><input type="date" class="u-date" value="' + esc(r.date || '') + '" />' +
      '<select class="u-status">' + opt(UNION, r.status, '— الحالة —') + '</select>' +
      '<input class="u-xray" placeholder="مرجع / ملاحظة الأشعة" value="' + esc(r.xray || '') + '" />' +
      '<button type="button" class="btn small danger u-del">🗑</button></div>';
  }
  function frSummary(v) {
    if (!v) return '';
    var u = (v.union || []).slice(-1)[0];
    return [v.site, v.pattern && v.pattern.split(' (')[0], v.classification || v.ao, v.side, u && u.status ? 'الالتحام: ' + u.status : '']
      .filter(Boolean).join(' · ');
  }
  function frCollect(el) {
    var out = {}, any = false;
    el.querySelectorAll('.ort-f').forEach(function (f) { var v = (f.value || '').trim(); if (v) { out[f.dataset.k] = v; any = true; } });
    var un = [];
    el.querySelectorAll('.ort-un-row').forEach(function (r) {
      var d = r.querySelector('.u-date').value, s = r.querySelector('.u-status').value, x = (r.querySelector('.u-xray').value || '').trim();
      if (d || s || x) un.push({ date: d, status: s, xray: x });
    });
    if (un.length) { out.union = un; any = true; }
    return any ? out : null;
  }
  SP.addSection('orthopedics', {
    id: 'fracture',
    title: '🦴 الإصابة والكسر',
    html: function (v) {
      v = v || {};
      function inp(k, l, ph, type) {
        return '<div class="field"><label>' + esc(l) + '</label><input' + (type ? ' type="' + type + '"' : '') + ' class="ort-f" data-k="' + k +
          '" value="' + esc(v[k] || '') + '" placeholder="' + esc(ph || '') + '" /></div>';
      }
      function sel(k, l, opts) { return '<div class="field"><label>' + esc(l) + '</label><select class="ort-f" data-k="' + k + '">' + opt(opts, v[k]) + '</select></div>'; }
      var cls = '<div class="field"><label>التصنيف</label><select class="ort-f" data-k="classification"><option value="">—</option>' +
        FR_CLASS.map(function (g) {
          return '<optgroup label="' + esc(g[0]) + '">' + g[1].map(function (o) { return '<option' + (o === v.classification ? ' selected' : '') + '>' + o + '</option>'; }).join('') + '</optgroup>';
        }).join('') + '</select></div>';
      var body = '<div class="grid-2">' +
        inp('mechanism', 'آلية الإصابة', 'سقوط / حادث / رياضة') +
        inp('injuryDate', 'تاريخ الإصابة', 'مثال: 2026-09-01') +
        inp('site', 'موضع الكسر', 'مثال: الكعبرة السفلية') +
        sel('side', 'الجهة', SIDE2) +
        sel('type', 'نوع الكسر', FR_TYPE) +
        sel('displaced', 'الإزاحة', FR_DISP) +
        sel('pattern', 'نمط الكسر', FR_PATTERN) +
        cls +
        inp('ao', 'تصنيف AO/OTA', 'مثال: 23-A2') +
        sel('intra', 'داخل المفصل', ['', 'نعم', 'لا']) +
        sel('nvInjury', 'إصابة عصبية / وعائية', ['', 'نعم', 'لا']) +
        inp('skin', 'حالة الجلد', 'سليم / جرح / بثور') +
        '<div class="field" style="grid-column:1 / -1"><label>وصف الكسر</label>' +
        '<textarea class="ort-f" data-k="desc" rows="2" placeholder="خط كسر واضح...">' + esc(v.desc || '') + '</textarea></div></div>' +
        bx('ort-union', '📆 متابعة التحام الكسر', ((v.union || []).slice(-1)[0] || {}).status || '',
          '<div class="ort-un-list">' + ((v.union && v.union.length) ? v.union.map(unionRow).join('') : unionRow()) + '</div>' +
          '<button type="button" class="btn ghost small u-add">+ إضافة متابعة</button>');
      return bx('ort-fracture', '🦴 الإصابة والكسر', frSummary(v), body);
    },
    wire: function (el) {
      if (el._ortFrWired) return; el._ortFrWired = true;
      var list = el.querySelector('.ort-un-list');
      el.querySelector('.u-add').addEventListener('click', function () { list.insertAdjacentHTML('beforeend', unionRow()); });
      list.addEventListener('click', function (e) {
        if (!e.target.classList.contains('u-del')) return;
        if (list.querySelectorAll('.ort-un-row').length === 1) { list.innerHTML = unionRow(); return; }
        e.target.closest('.ort-un-row').remove();
      });
      el.addEventListener('change', function () { setSum(el, 'ort-fracture', frSummary(frCollect(el))); });
    },
    collect: frCollect,
    render: function (v) {
      if (!v) return '';
      var rows = Object.keys(FR_L).filter(function (k) { return v[k]; }).map(function (k) { return [FR_L[k], v[k]]; });
      var h = rows.length ? SP.tableHtml(['البند', 'القيمة'], rows) : '';
      if (v.union && v.union.length) h += SP.tableHtml(['تاريخ المتابعة', 'حالة الالتحام', 'الأشعة'], v.union.map(function (u) { return [u.date || '-', u.status || '-', u.xray || '']; }));
      return h;
    }
  });

  /* =====================================================================
     6) CAST / SPLINT / BRACE TRACKER  { items:[{type,area,side,applied,removal,notes}], instr:[keys] }
     ===================================================================== */
  var CAST_T = ['', 'جبس (Cast)', 'جبيرة خلفية (Back slab)', 'جبيرة (Splint)', 'دعامة (Brace)', 'حذاء طبي (Boot)', 'حمالة ذراع (Sling)'];
  var INSTR = [
    ['dry', 'حافظ على الجبس / الجبيرة جافة ولا تبللها بالماء.'],
    ['elevate', 'ارفع الطرف المصاب على وسادة أعلى من مستوى القلب لتقليل التورم.'],
    ['move', 'حرّك أصابع اليد / القدم باستمرار عدة مرات يومياً.'],
    ['warn', 'ارجع للطبيب فوراً عند: تنميل، زيادة التورم، ألم شديد متزايد، أو تغير لون الأصابع (زرقة أو شحوب).']
  ];
  function remainTxt(removal) {
    if (!removal) return '';
    var n = days(today(), removal);
    return n < 0 ? 'متأخر ' + (-n) + ' يوم' : n === 0 ? 'الفك اليوم' : 'متبقي ' + n + ' يوم';
  }
  function castRow(r) {
    r = r || {};
    return '<div class="ort-cast-row">' +
      '<select class="c-type">' + opt(CAST_T, r.type, '— النوع —') + '</select>' +
      '<input class="c-area" placeholder="الموضع (مثال: الساعد)" value="' + esc(r.area || '') + '" />' +
      '<select class="c-side">' + opt(SIDE3, r.side, '— الجهة —') + '</select>' +
      '<label class="ort-mini">تاريخ التركيب<input type="date" class="c-applied" value="' + esc(r.applied || '') + '" /></label>' +
      '<label class="ort-mini">موعد الفك<input type="date" class="c-removal" value="' + esc(r.removal || '') + '" /></label>' +
      '<span class="ort-days">' + esc(remainTxt(r.removal)) + '</span>' +
      '<input class="c-notes" placeholder="ملاحظات" value="' + esc(r.notes || '') + '" />' +
      '<button type="button" class="btn small danger c-del">🗑</button></div>';
  }
  function castCollect(el) {
    var items = [];
    el.querySelectorAll('.ort-cast-row').forEach(function (r) {
      var o = { type: r.querySelector('.c-type').value, area: (r.querySelector('.c-area').value || '').trim(), side: r.querySelector('.c-side').value,
        applied: r.querySelector('.c-applied').value, removal: r.querySelector('.c-removal').value, notes: (r.querySelector('.c-notes').value || '').trim() };
      if (o.type || o.area || o.applied || o.removal || o.notes) items.push(o);
    });
    var instr = []; el.querySelectorAll('.c-instr:checked').forEach(function (c) { instr.push(c.value); });
    return (items.length || instr.length) ? { items: items, instr: instr } : null;
  }
  function castSummary(v) {
    if (!v || !v.items || !v.items.length) return '';
    var c = v.items[0];
    return (c.type ? c.type.split(' (')[0] : 'تثبيت') + (c.removal ? ': ' + remainTxt(c.removal) : '') + (v.items.length > 1 ? ' (+' + (v.items.length - 1) + ')' : '');
  }
  SP.addSection('orthopedics', {
    id: 'ortCast',
    title: '🩼 الجبس والجبائر والدعامات',
    html: function (v) {
      v = v || {};
      var instr = v.instr || [];
      var body = '<div class="ort-cast-list">' + ((v.items && v.items.length) ? v.items.map(castRow).join('') : castRow()) + '</div>' +
        '<button type="button" class="btn ghost small c-add">+ إضافة تثبيت</button>' +
        bx('ort-instr', '📝 تعليمات المريض (تُطبع مع الروشتة)', instr.length ? instr.length + ' تعليمات' : '',
          '<div class="ort-checks">' + INSTR.map(function (x) {
            return '<label class="ort-chip ort-chip-wide"><input type="checkbox" class="c-instr" value="' + x[0] + '"' + (instr.indexOf(x[0]) >= 0 ? ' checked' : '') + ' /> ' + esc(x[1]) + '</label>';
          }).join('') + '</div>');
      return bx('ort-cast', '🩼 الجبس والجبائر والدعامات', castSummary(v), body);
    },
    wire: function (el) {
      if (el._ortCastWired) return; el._ortCastWired = true;
      var list = el.querySelector('.ort-cast-list');
      el.querySelector('.c-add').addEventListener('click', function () { list.insertAdjacentHTML('beforeend', castRow()); });
      list.addEventListener('click', function (e) {
        if (!e.target.classList.contains('c-del')) return;
        if (list.querySelectorAll('.ort-cast-row').length === 1) { list.innerHTML = castRow(); return; }
        e.target.closest('.ort-cast-row').remove();
      });
      el.addEventListener('change', function (e) {
        if (e.target.classList.contains('c-removal')) e.target.closest('.ort-cast-row').querySelector('.ort-days').textContent = remainTxt(e.target.value);
        var v = castCollect(el);
        setSum(el, 'ort-cast', castSummary(v));
        setSum(el, 'ort-instr', v && v.instr.length ? v.instr.length + ' تعليمات' : '');
      });
    },
    collect: castCollect,
    render: function (v) {
      if (!v) return '';
      var h = '';
      if (v.items && v.items.length) h += SP.tableHtml(['النوع', 'الموضع', 'الجهة', 'تاريخ التركيب', 'موعد الفك', 'ملاحظات'],
        v.items.map(function (c) { return [c.type || '-', c.area || '-', c.side || '-', c.applied || '-', c.removal || '-', c.notes || '']; }));
      if (v.instr && v.instr.length) {
        h += '<div class="notes" style="margin-top:6px"><b>📝 تعليمات للمريض:</b><ul style="margin:4px 0 0;padding-inline-start:18px">' +
          INSTR.filter(function (x) { return v.instr.indexOf(x[0]) >= 0; }).map(function (x) { return '<li>' + esc(x[1]) + '</li>'; }).join('') + '</ul></div>';
      }
      return h;
    }
  });

  /* =====================================================================
     7) SURGERY + INJECTIONS LOG
     { surgery:{procedure,date,side,surgeon,notes,wb,sutureDate,hwRemoval,hwDate, implants:[{type,size,brand,lot}]},
       injections:[{joint,side,type,drug,dose,date,num}] }
     ===================================================================== */
  var IMPLANT = ['', 'شريحة (Plate)', 'مسامير (Screws)', 'مسمار نخاعي (Nail)', 'مفصل صناعي (Prosthesis)', 'سلك (K-wire)', 'أخرى'];
  var WB = ['', 'بدون تحميل (Non-weight bearing)', 'تحميل جزئي (Partial)', 'تحميل كامل (Full)'];
  var INJ_T = ['', 'كورتيزون (Corticosteroid)', 'بلازما (PRP)', 'هيالورونيك (Hyaluronic acid)', 'مخدر موضعي (Local anesthetic)', 'سحب سائل (Aspiration)'];
  var STEROID = INJ_T[1];
  function implantRow(r) {
    r = r || {};
    return '<div class="ort-img-row ort-imp-row"><select class="im-type">' + opt(IMPLANT, r.type, '— النوع —') + '</select>' +
      '<input class="im-size" placeholder="المقاس" value="' + esc(r.size || '') + '" />' +
      '<input class="im-brand" placeholder="الشركة" value="' + esc(r.brand || '') + '" />' +
      '<input class="im-lot" placeholder="رقم التشغيلة (Lot)" value="' + esc(r.lot || '') + '" />' +
      '<button type="button" class="btn small danger im-del">🗑</button></div>';
  }
  function injRow(r) {
    r = r || {};
    return '<div class="ort-img-row ort-inj-row"><input class="in-joint" placeholder="المفصل (مثال: الركبة)" value="' + esc(r.joint || '') + '" />' +
      '<select class="in-side">' + opt(SIDE3, r.side, '— الجهة —') + '</select>' +
      '<select class="in-type">' + opt(INJ_T, r.type, '— النوع —') + '</select>' +
      '<input class="in-drug" placeholder="اسم الدواء" value="' + esc(r.drug || '') + '" />' +
      '<input class="in-dose" placeholder="الجرعة" value="' + esc(r.dose || '') + '" />' +
      '<input type="date" class="in-date" value="' + esc(r.date || '') + '" />' +
      '<input type="number" min="1" class="in-num" placeholder="رقم الحقنة" title="رقم الحقنة لهذا المفصل" value="' + esc(r.num || '') + '" />' +
      '<button type="button" class="btn small danger in-del">🗑</button></div>';
  }
  function jkey(j, s) { return (j || '').replace(/\s+/g, '').replace(/^ال/, '') + '|' + (s || ''); }
  // previous injections of this patient from saved visits (excluding the visit being edited when same date+joint)
  function pastInjections() {
    var out = [];
    prevVisits().forEach(function (vis) {
      var s = vis.exam && vis.exam.sections && vis.exam.sections.ortSurgery;
      (s && s.injections || []).forEach(function (i) { out.push(i); });
    });
    return out;
  }
  function steroidWarnings(current) {
    var all = pastInjections().concat(current), seen = {}, list = [];
    all.forEach(function (i) { var k = jkey(i.joint, i.side) + '|' + i.date + '|' + i.type; if (!seen[k] && i.date) { seen[k] = 1; list.push(i); } });
    var warns = [], t = today();
    current.forEach(function (c) {
      if (c.type !== STEROID || !c.joint) return;
      var ref = c.date || t, k = jkey(c.joint, c.side);
      var st = list.filter(function (i) { return i.type === STEROID && jkey(i.joint, i.side) === k; });
      var lastYear = st.filter(function (i) { var d = days(i.date, ref); return d >= 0 && d <= 365; });
      var prior = st.filter(function (i) { return i.date < ref; }).sort(function (a, b) { return b.date.localeCompare(a.date); })[0];
      if (lastYear.length >= 3) warns.push('⚠️ ' + c.joint + ': ' + lastYear.length + ' حقن كورتيزون خلال آخر 12 شهر.');
      if (prior && days(prior.date, ref) < 90) warns.push('⚠️ ' + c.joint + ': أقل من 3 أشهر منذ آخر حقنة كورتيزون (' + prior.date + ').');
    });
    return warns;
  }
  function surgCollect(el) {
    var s = {}, any = false;
    el.querySelectorAll('.sg').forEach(function (f) { var v = (f.value || '').trim(); if (v) { s[f.getAttribute('data-k')] = v; any = true; } });
    var imp = [];
    el.querySelectorAll('.ort-imp-row').forEach(function (r) {
      var o = { type: r.querySelector('.im-type').value, size: val(r, '.im-size'), brand: val(r, '.im-brand'), lot: val(r, '.im-lot') };
      if (o.type || o.size || o.brand || o.lot) imp.push(o);
    });
    if (imp.length) { s.implants = imp; any = true; }
    var inj = [];
    el.querySelectorAll('.ort-inj-row').forEach(function (r) {
      var o = { joint: val(r, '.in-joint'), side: r.querySelector('.in-side').value, type: r.querySelector('.in-type').value,
        drug: val(r, '.in-drug'), dose: val(r, '.in-dose'), date: r.querySelector('.in-date').value, num: val(r, '.in-num') };
      if (o.joint || o.type || o.drug || o.date) inj.push(o);
    });
    var out = {};
    if (any) out.surgery = s;
    if (inj.length) out.injections = inj;
    return (any || inj.length) ? out : null;
  }
  function surgSummary(v) {
    if (!v) return '';
    var p = [];
    if (v.surgery && v.surgery.procedure) p.push(v.surgery.procedure + (v.surgery.date ? ' ' + v.surgery.date : ''));
    if (v.injections && v.injections.length) p.push(v.injections.length + ' حقنة');
    return p.join(' · ');
  }
  SP.addSection('orthopedics', {
    id: 'ortSurgery',
    title: '🔪 العمليات والحقن',
    html: function (v) {
      v = v || {};
      var s = v.surgery || {};
      function inp(k, l, type, ph) { return '<div class="field"><label>' + l + '</label><input' + (type ? ' type="' + type + '"' : '') + ' class="sg" data-k="' + k + '" value="' + esc(s[k] || '') + '" placeholder="' + esc(ph || '') + '" /></div>'; }
      function sel(k, l, o) { return '<div class="field"><label>' + l + '</label><select class="sg" data-k="' + k + '">' + opt(o, s[k]) + '</select></div>'; }
      var surg = '<div class="grid-2">' + inp('procedure', 'اسم العملية', '', 'مثال: تثبيت داخلي بشريحة ومسامير') + inp('date', 'تاريخ العملية', 'date') +
        sel('side', 'الجهة', SIDE3) + inp('surgeon', 'الجراح') + '</div>' +
        '<h5 class="ort-h5">المثبتات (Implants)</h5><div class="ort-imp-list">' + ((s.implants && s.implants.length) ? s.implants.map(implantRow).join('') : implantRow()) + '</div>' +
        '<button type="button" class="btn ghost small im-add">+ إضافة مثبت</button>' +
        '<h5 class="ort-h5">بعد العملية</h5><div class="grid-2">' + sel('wb', 'التحميل على الطرف', WB) + inp('sutureDate', 'موعد فك الغرز', 'date') +
        sel('hwRemoval', 'إزالة المثبتات مخططة', ['', 'لا', 'نعم']) + inp('hwDate', 'موعد إزالة المثبتات (تقريبي)', 'date') +
        '<div class="field" style="grid-column:1/-1"><label>ملاحظات</label><textarea class="sg" data-k="notes" rows="2">' + esc(s.notes || '') + '</textarea></div></div>';
      var inj = '<div class="ort-banner ort-orange inj-warn" hidden></div>' +
        '<div class="ort-inj-list">' + ((v.injections && v.injections.length) ? v.injections.map(injRow).join('') : injRow()) + '</div>' +
        '<button type="button" class="btn ghost small in-add">+ إضافة حقنة</button>';
      return bx('ort-surgery', '🔪 العمليات والحقن', surgSummary(v),
        bx('ort-surg', '🏥 العملية الجراحية', s.procedure || '', surg) +
        bx('ort-inj', '💉 الحقن وسحب السوائل', (v.injections || []).length ? v.injections.length + ' حقنة' : '', inj));
    },
    wire: function (el) {
      if (el._ortSgWired) return; el._ortSgWired = true;
      function rowList(listSel, rowSel, addSel, delCls, maker) {
        var list = el.querySelector(listSel);
        el.querySelector(addSel).addEventListener('click', function () { list.insertAdjacentHTML('beforeend', maker()); refresh(); });
        list.addEventListener('click', function (e) {
          if (!e.target.classList.contains(delCls)) return;
          if (list.querySelectorAll(rowSel).length === 1) list.innerHTML = maker(); else e.target.closest(rowSel).remove();
          refresh();
        });
      }
      function refresh() {
        var v = surgCollect(el) || {};
        // suggest the injection number for that joint when empty
        var past = pastInjections();
        el.querySelectorAll('.ort-inj-row').forEach(function (r) {
          var n = r.querySelector('.in-num'), j = val(r, '.in-joint');
          if (!j) return;
          var k = jkey(j, r.querySelector('.in-side').value);
          n.placeholder = 'رقم ' + (past.filter(function (i) { return jkey(i.joint, i.side) === k; }).length + 1);
        });
        var w = steroidWarnings(v.injections || []), b = el.querySelector('.inj-warn');
        b.hidden = !w.length; b.innerHTML = w.map(esc).join('<br>') + (w.length ? '<br><small>تنبيه فقط — يمكنك المتابعة.</small>' : '');
        setSum(el, 'ort-surgery', surgSummary(v));
        setSum(el, 'ort-surg', (v.surgery || {}).procedure || '');
        setSum(el, 'ort-inj', (v.injections || []).length ? v.injections.length + ' حقنة' + (w.length ? ' ⚠️' : '') : '');
      }
      rowList('.ort-imp-list', '.ort-imp-row', '.im-add', 'im-del', implantRow);
      rowList('.ort-inj-list', '.ort-inj-row', '.in-add', 'in-del', injRow);
      el.addEventListener('change', refresh);
      refresh();
    },
    collect: surgCollect,
    render: function (v) {
      if (!v) return '';
      var h = '', s = v.surgery;
      if (s) {
        var L = { procedure: 'العملية', date: 'التاريخ', side: 'الجهة', surgeon: 'الجراح', wb: 'التحميل', sutureDate: 'فك الغرز', hwRemoval: 'إزالة المثبتات مخططة', hwDate: 'موعد إزالة المثبتات', notes: 'ملاحظات' };
        var rows = Object.keys(L).filter(function (k) { return s[k]; }).map(function (k) { return [L[k], s[k]]; });
        if (rows.length) h += SP.tableHtml(['البند', 'القيمة'], rows);
        if (s.implants && s.implants.length) h += SP.tableHtml(['المثبت', 'المقاس', 'الشركة', 'Lot'], s.implants.map(function (i) { return [i.type || '-', i.size || '', i.brand || '', i.lot || '']; }));
      }
      if (v.injections && v.injections.length) h += SP.tableHtml(['المفصل', 'الجهة', 'النوع', 'الدواء', 'الجرعة', 'التاريخ', 'رقم'],
        v.injections.map(function (i) { return [i.joint || '-', i.side || '', i.type || '', i.drug || '', i.dose || '', i.date || '', i.num || '']; }));
      return h;
    }
  });

  /* =====================================================================
     8) OUTCOME SCORES
     ODI (Oswestry Disability Index): 10 sections, each 0–5.
         ODI % = (sum of scores / (5 × number of answered sections)) × 100
         Bands: 0–20 minimal, 21–40 moderate, 41–60 severe, 61–80 crippling, 81–100 bed-bound / exaggerating.
     QuickDASH: 11 items, each 1–5. At least 10 must be answered.
         QuickDASH = ((sum of answered / number answered) − 1) × 25   → 0 (no disability) … 100 (most severe)
     WOMAC (Likert 3.1): 24 items, each 0–4.  Pain 5 items (0–20), Stiffness 2 items (0–8), Function 17 items (0–68).
         Total = Pain + Stiffness + Function (0–96).  Percentage = Total / 96 × 100.
     ===================================================================== */
  var ODI_Q = ['شدة الألم (Pain intensity)', 'العناية الشخصية (Personal care)', 'رفع الأشياء (Lifting)', 'المشي (Walking)', 'الجلوس (Sitting)',
               'الوقوف (Standing)', 'النوم (Sleeping)', 'الحياة الجنسية (Sex life)', 'الحياة الاجتماعية (Social life)', 'السفر (Travelling)'];
  var ODI_O = [['', '—'], ['0', '0 — لا مشكلة'], ['1', '1'], ['2', '2'], ['3', '3'], ['4', '4'], ['5', '5 — أقصى صعوبة']];
  var QD_Q = ['فتح برطمان محكم الغلق', 'أعمال منزلية شاقة (غسل الأرضيات / الحوائط)', 'حمل حقيبة تسوق أو شنطة', 'غسل الظهر',
              'استخدام سكين لتقطيع الطعام', 'أنشطة ترفيهية تتطلب قوة في الذراع أو الكتف', 'تأثير المشكلة على الأنشطة الاجتماعية (آخر أسبوع)',
              'تأثير المشكلة على العمل أو الأنشطة اليومية (آخر أسبوع)', 'ألم الذراع / الكتف / اليد', 'تنميل أو وخز في الذراع / الكتف / اليد', 'صعوبة النوم بسبب الألم'];
  var QD_O = [['', '—'], ['1', '1 — لا صعوبة'], ['2', '2 — صعوبة بسيطة'], ['3', '3 — صعوبة متوسطة'], ['4', '4 — صعوبة شديدة'], ['5', '5 — غير قادر']];
  var WO_P = ['المشي على أرض مستوية', 'صعود / نزول السلم', 'ليلاً في السرير', 'الجلوس أو الاستلقاء', 'الوقوف'];
  var WO_S = ['التيبس بعد الاستيقاظ صباحاً', 'التيبس بعد الجلوس أو الراحة خلال اليوم'];
  var WO_F = ['نزول السلم', 'صعود السلم', 'القيام من الجلوس', 'الوقوف', 'الانحناء للأرض', 'المشي على أرض مستوية', 'ركوب / نزول السيارة',
              'التسوق', 'لبس الجوارب', 'القيام من السرير', 'خلع الجوارب', 'الاستلقاء في السرير', 'الدخول / الخروج من الحمام',
              'الجلوس', 'الجلوس على / القيام من التواليت', 'أعمال منزلية شاقة', 'أعمال منزلية خفيفة'];
  var WO_O = [['', '—'], ['0', '0 — لا يوجد'], ['1', '1 — بسيط'], ['2', '2 — متوسط'], ['3', '3 — شديد'], ['4', '4 — شديد جداً']];

  function odiScore(a) {
    var n = 0, s = 0; a.forEach(function (x) { if (x !== '' && x != null) { n++; s += Number(x); } });
    if (!n) return null;
    var pct = Math.round(s / (5 * n) * 100);
    var band = pct <= 20 ? 'إعاقة بسيطة' : pct <= 40 ? 'إعاقة متوسطة' : pct <= 60 ? 'إعاقة شديدة' : pct <= 80 ? 'إعاقة معطِّلة' : 'ملازم للفراش';
    return { score: pct, band: band, answered: n };
  }
  function qdScore(a) {
    var n = 0, s = 0; a.forEach(function (x) { if (x !== '' && x != null) { n++; s += Number(x); } });
    if (n < 10) return n ? { score: null, answered: n } : null;
    return { score: Math.round(((s / n) - 1) * 25 * 10) / 10, answered: n };
  }
  function woScore(a) {
    function sum(from, to) { var s = 0, n = 0; for (var i = from; i < to; i++) if (a[i] !== '' && a[i] != null) { s += Number(a[i]); n++; } return { s: s, n: n }; }
    var p = sum(0, 5), st = sum(5, 7), f = sum(7, 24);
    if (!p.n && !st.n && !f.n) return null;
    var tot = p.s + st.s + f.s;
    return { pain: p.s, stiffness: st.s, function: f.s, score: tot, pct: Math.round(tot / 96 * 100), answered: p.n + st.n + f.n };
  }
  function qList(cls, qs, opts, ans, offset) {
    offset = offset || 0;
    return '<ol class="ort-q" start="' + (offset + 1) + '">' + qs.map(function (q, i) {
      return '<li><span>' + esc(q) + '</span><select class="' + cls + '" data-i="' + (i + offset) + '">' + opt(opts, (ans || [])[i + offset]) + '</select></li>';
    }).join('') + '</ol>';
  }
  function readAns(el, cls, n) { var a = []; for (var i = 0; i < n; i++) a.push(''); el.querySelectorAll('.' + cls).forEach(function (s) { a[Number(s.getAttribute('data-i'))] = s.value; }); return a; }
  function odiTxt(r) { return r ? 'ODI ' + r.score + '% — ' + r.band : ''; }
  function qdTxt(r) { return r ? (r.score == null ? 'QuickDASH: أجب على 10 أسئلة على الأقل (' + r.answered + '/11)' : 'QuickDASH ' + r.score + ' / 100') : ''; }
  function woTxt(r) { return r ? 'WOMAC ' + r.score + ' / 96 (' + r.pct + '%) — ألم ' + r.pain + '/20 · تيبس ' + r.stiffness + '/8 · وظيفة ' + r.function + '/68' : ''; }
  function scoreTrend(key) {
    var pts = [];
    prevVisits().forEach(function (v) {
      var s = v.exam && v.exam.sections && v.exam.sections.ortScores;
      if (s && s[key] && s[key].score != null) pts.push(v.date + ': ' + s[key].score);
    });
    return pts;
  }
  function scCollect(el) {
    var out = {}, any = false;
    var o = readAns(el, 'odi-a', 10), q = readAns(el, 'qd-a', 11), w = readAns(el, 'wo-a', 24);
    var ro = odiScore(o), rq = qdScore(q), rw = woScore(w);
    if (ro) { out.odi = { answers: o, score: ro.score, band: ro.band }; any = true; }
    if (rq) { out.qdash = { answers: q, score: rq.score }; any = true; }
    if (rw) { out.womac = { answers: w, score: rw.score, pain: rw.pain, stiffness: rw.stiffness, function: rw.function, pct: rw.pct }; any = true; }
    return any ? out : null;
  }
  function trendHtml(key, now) {
    var t = scoreTrend(key);
    return t.length ? '<p class="muted ort-trend">📉 السابق: ' + esc(t.slice(-4).join(' ← ')) + (now != null ? ' ← الآن: ' + now : '') + '</p>' : '';
  }
  SP.addSection('orthopedics', {
    id: 'ortScores',
    title: '📊 مقاييس النتائج',
    html: function (v) {
      v = v || {};
      var o = v.odi || {}, q = v.qdash || {}, w = v.womac || {};
      var sum = [v.odi ? 'ODI ' + o.score + '%' : '', v.qdash && q.score != null ? 'QuickDASH ' + q.score : '', v.womac ? 'WOMAC ' + w.score : ''].filter(Boolean).join(' · ');
      return bx('ort-scores', '📊 مقاييس النتائج (Outcome scores)', sum,
        bx('ort-odi', 'Oswestry (ODI) — الظهر', v.odi ? odiTxt(odiScore(o.answers || [])) : '',
          qList('odi-a', ODI_Q, ODI_O, o.answers) + '<p class="sev-out ort-out" data-o="odi"></p><div class="ort-tr" data-t="odi"></div>') +
        bx('ort-qd', 'QuickDASH — الذراع والكتف واليد', v.qdash ? qdTxt(qdScore(q.answers || [])) : '',
          qList('qd-a', QD_Q, QD_O, q.answers) + '<p class="sev-out ort-out" data-o="qd"></p><div class="ort-tr" data-t="qdash"></div>') +
        bx('ort-wo', 'WOMAC — الركبة والحوض', v.womac ? woTxt(woScore(w.answers || [])) : '',
          '<h5 class="ort-h5">الألم (Pain)</h5>' + qList('wo-a', WO_P, WO_O, w.answers, 0) +
          '<h5 class="ort-h5">التيبس (Stiffness)</h5>' + qList('wo-a', WO_S, WO_O, w.answers, 5) +
          '<h5 class="ort-h5">الوظيفة (Physical function) — درجة الصعوبة</h5>' + qList('wo-a', WO_F, WO_O, w.answers, 7) +
          '<p class="sev-out ort-out" data-o="wo"></p><div class="ort-tr" data-t="womac"></div>'));
    },
    wire: function (el) {
      if (el._ortScWired) return; el._ortScWired = true;
      function refresh() {
        var ro = odiScore(readAns(el, 'odi-a', 10)), rq = qdScore(readAns(el, 'qd-a', 11)), rw = woScore(readAns(el, 'wo-a', 24));
        el.querySelector('[data-o="odi"]').textContent = odiTxt(ro) || '—';
        el.querySelector('[data-o="qd"]').textContent = qdTxt(rq) || '—';
        el.querySelector('[data-o="wo"]').textContent = woTxt(rw) || '—';
        el.querySelector('[data-t="odi"]').innerHTML = trendHtml('odi', ro && ro.score);
        el.querySelector('[data-t="qdash"]').innerHTML = trendHtml('qdash', rq && rq.score);
        el.querySelector('[data-t="womac"]').innerHTML = trendHtml('womac', rw && rw.score);
        setSum(el, 'ort-odi', odiTxt(ro)); setSum(el, 'ort-qd', qdTxt(rq)); setSum(el, 'ort-wo', woTxt(rw));
        setSum(el, 'ort-scores', [ro ? 'ODI ' + ro.score + '%' : '', rq && rq.score != null ? 'QuickDASH ' + rq.score : '', rw ? 'WOMAC ' + rw.score : ''].filter(Boolean).join(' · '));
      }
      el.addEventListener('change', refresh);
      refresh();
    },
    collect: scCollect,
    render: function (v) {
      if (!v) return '';
      var rows = [];
      if (v.odi) rows.push(['Oswestry (ODI)', v.odi.score + '% — ' + (v.odi.band || '')]);
      if (v.qdash) rows.push(['QuickDASH', v.qdash.score == null ? 'غير مكتمل' : v.qdash.score + ' / 100']);
      if (v.womac) rows.push(['WOMAC', v.womac.score + ' / 96 (ألم ' + v.womac.pain + ' · تيبس ' + v.womac.stiffness + ' · وظيفة ' + v.womac.function + ')']);
      return rows.length ? SP.tableHtml(['المقياس', 'النتيجة'], rows) : '';
    }
  });

  /* ---------- section order on the doctor page ---------- */
  if (SP.orderSections) SP.orderSections('orthopedics', ['pain', 'ortJoint', 'ortNeuro', 'ortRedflags', 'fracture', 'ortCast', 'ortSurgery', 'imaging', 'ortScores', 'plan', 'files']);

  /* =====================================================================
     Follow-ups: cast removal + suture removal feed the shared ClinicCare list
     ===================================================================== */
  function orthoFollowups(exam) {
    var s = exam && exam.sections, out = [];
    if (!s) return out;
    ((s.ortCast && s.ortCast.items) || []).forEach(function (c, i) {
      if (c.removal) out.push({ key: 'cast' + i, kind: 'cast', date: c.removal, reason: 'فك ' + (c.type ? c.type.split(' (')[0] : 'الجبس') + (c.area ? ' — ' + c.area : '') + (c.side ? ' ' + c.side : '') });
    });
    var sg = s.ortSurgery && s.ortSurgery.surgery;
    if (sg && sg.sutureDate) out.push({ key: 'suture', kind: 'suture', date: sg.sutureDate, reason: 'فك الغرز' + (sg.procedure ? ' — ' + sg.procedure : '') });
    return out;
  }
  function mountCastDue(container, filter) {
    if (!container || !CC) return;
    var t = today();
    var all = CC.listFollowups().filter(function (f) { return f.kind === 'cast' && (!filter || filter(f)); });
    var card = container.closest('section');
    if (card) card.hidden = !all.length;
    var pend = all.filter(function (f) { return f.status === 'pending' && f.date; });
    var groups = [
      ['متأخرة', 'cc-late', pend.filter(function (f) { return f.date < t; })],
      ['اليوم', 'cc-today', pend.filter(function (f) { return f.date === t; })],
      ['هذا الأسبوع', 'cc-week', pend.filter(function (f) { var n = days(t, f.date); return n > 0 && n <= 7; })]
    ];
    var body = groups.map(function (g) {
      var rows = g[2].map(function (f) {
        return '<tr><td>' + esc(f.patientName) + '</td><td>' + esc(f.date) + '</td><td>' + esc(remainTxt(f.date)) + '</td><td>' + esc(f.reason || '') + '</td>' +
          '<td><button type="button" class="btn ghost small" data-cast-done="' + esc(f.id) + '">✔ تم الفك</button></td></tr>';
      }).join('');
      return '<h4 class="cc-fu-h ' + g[1] + '">' + g[0] + ' (' + g[2].length + ')</h4>' +
        (rows ? '<div class="table-wrap"><table><thead><tr><th>المريض</th><th>موعد الفك</th><th>المتبقي</th><th>التثبيت</th><th>إجراء</th></tr></thead><tbody>' + rows + '</tbody></table></div>' : '<p class="muted">لا يوجد.</p>');
    }).join('');
    container.innerHTML = CC.box('ort-castdue', '🩼 مواعيد فك الجبس', 'اليوم: ' + groups[1][2].length + ' · هذا الأسبوع: ' + groups[2][2].length + ' · متأخرة: ' + groups[0][2].length, body, 'cc-fu');
    container.querySelectorAll('[data-cast-done]').forEach(function (b) {
      b.addEventListener('click', function () { CC.setFollowupStatus(b.getAttribute('data-cast-done'), 'done'); });
    });
    if (!container._ortWired) {
      container._ortWired = true;
      var re = function () { mountCastDue(container, filter); };
      document.addEventListener('clinic-followups-changed', re);
      document.addEventListener('cloud-sync-updated', function (e) { if (!e.detail || /followups/.test(e.detail.key || '')) re(); });
    }
  }

  window.ClinicOrtho = {
    orthoFollowups: orthoFollowups, mountCastDue: mountCastDue,
    odiScore: odiScore, qdScore: qdScore, woScore: woScore, steroidWarnings: steroidWarnings
  };
})();
} catch (e) { console.error('[specialties-bundle] orthopedics-plus.js failed:', e); }
/* ==== END orthopedics-plus.js ==== */

/* ==== BEGIN ent-plus.js ==== */
try {
// ============ ENT PLUS (v53) — وحدة الأنف والأذن والحنجرة المتقدمة ============
// Additive module loaded AFTER specialties-extra.js. Nothing old is changed:
// entSymptoms / entExam / entFiles keep their fields and printing. New sections save inside
// exam.sections like every other specialty section (new keys only):
//
//  entSides    per-side ear / nose / throat exam + tuning forks + per-side tonsils
//  entAudio    audiogram (AC/BC 250–8000 Hz) + SVG plot + PTA + degree + type + tympanometry
//  entVertigo  vertigo / dizziness (auto-opens when entSymptoms.vertigo = "نعم")
//  entNose     ARIA, rhinosinusitis duration class, polyps, endoscopy, adenoid, SNOT-22, Lund-Mackay, epistaxis, smell
//  entTonsil   tonsillitis episodes (3 years) + surgical-criteria helper + pediatric sleep checklist
//  entVoice    hoarseness, laryngoscopy per cord, VHI-10, dysphagia
//  entSleep    STOP-BANG + Epworth + BMI / neck / Mallampati / Friedman
//  entRedflags head & neck red flags + urgent banners
//  entProc     clinic procedures + surgical history (date / side / notes)
//  entFollow   next visit (feeds the shared ClinicCare follow-up list) + printable Arabic instruction sheets
//  entExtra    House-Brackmann, structured neck mass, pediatric ENT
//
// Every block is a ClinicCare collapsible box: closed by default, one-line summary, state kept
// in localStorage (cm_collapse_v1). All scores are helpers only — the doctor must verify.

(function () {
  var SP = window.ClinicSpecialty;
  if (!SP) return;
  var CC = window.ClinicCare;
  var esc = SP.escape;

  /* ---------------- generic helpers ---------------- */
  function bx(id, title, sum, body) {
    if (CC) return CC.box(id, title, sum, body, 'ent-box');
    return '<div class="ent-box"><h4>' + title + '</h4>' + body + '</div>';
  }
  function setSum(el, id, text) {
    if (!CC) return;
    CC.setSummary(el.querySelector('.cc-box[data-cc="' + id + '"]'), text);
  }
  function gv(o, k) { return k.split('.').reduce(function (a, p) { return a == null ? undefined : a[p]; }, o); }
  function sv(o, k, x) { var ps = k.split('.'), c = o; for (var i = 0; i < ps.length - 1; i++) c = c[ps[i]] || (c[ps[i]] = {}); c[ps[ps.length - 1]] = x; }
  function num(x) { return x === '' || x == null || isNaN(x) ? null : Number(x); }
  function today() { return CC ? CC.today() : new Date().toISOString().slice(0, 10); }
  function prevVisits() { var p = CC && CC.getPatient(); return p ? CC.visitsFor(p) : []; }
  var YN = ['', 'لا', 'نعم'];
  var SIDE = ['', 'يمين', 'يسار', 'الجهتان'];
  var PN = ['', 'إيجابي (Positive)', 'سلبي (Negative)'];
  var RL = [['R', 'يمين (R)'], ['L', 'يسار (L)']];

  function opts(list, val) {
    return list.map(function (o) {
      return '<option value="' + esc(o) + '"' + (String(o) === String(val == null ? '' : val) ? ' selected' : '') + '>' + (o === '' ? '—' : esc(o)) + '</option>';
    }).join('');
  }
  // field spec: [key, label, type, options, flags]   types: s select · t text · n number · d date · a textarea · c checkboxes
  function fieldHtml(f, v) {
    var k = f[0], x = gv(v, k), t = f[2], wide = (t === 'a' || t === 'c' || (f[4] && f[4].wide));
    var inp;
    if (t === 's') inp = '<select class="ef" data-k="' + k + '">' + opts(f[3], x) + '</select>';
    else if (t === 'c') inp = '<div class="ef-c ent-checks" data-k="' + k + '">' + f[3].map(function (o) {
      return '<label class="ort-chip"><input type="checkbox" value="' + esc(o) + '"' + ((x || []).indexOf(o) >= 0 ? ' checked' : '') + ' /> ' + esc(o) + '</label>';
    }).join('') + '</div>';
    else if (t === 'a') inp = '<textarea class="ef" data-k="' + k + '" rows="2">' + esc(x || '') + '</textarea>';
    else inp = '<input class="ef" data-k="' + k + '" type="' + (t === 'n' ? 'number' : t === 'd' ? 'date' : 'text') + '"' + (t === 'n' ? ' step="any" inputmode="decimal"' : '') + ' value="' + esc(x == null ? '' : x) + '"' + (f[3] && t !== 's' ? ' placeholder="' + esc(f[3]) + '"' : '') + ' />';
    return '<div class="field"' + (wide ? ' style="grid-column:1 / -1;"' : '') + '><label>' + esc(f[1]) + '</label>' + inp + '</div>';
  }
  function collectFields(el) {
    var out = {}, any = false;
    el.querySelectorAll('.ef').forEach(function (i) { var x = (i.value || '').trim(); if (x !== '') { sv(out, i.dataset.k, x); any = true; } });
    el.querySelectorAll('.ef-c').forEach(function (c) {
      var a = Array.prototype.map.call(c.querySelectorAll('input:checked'), function (i) { return i.value; });
      if (a.length) { sv(out, c.dataset.k, a); any = true; }
    });
    return any ? out : null;
  }
  // per-side expansion: [key,label,type,opts] -> R and L copies
  function sides(prefix, list) {
    var out = [];
    list.forEach(function (f) { RL.forEach(function (s) { out.push([prefix + '.' + s[0] + '.' + f[0], f[1] + ' — ' + (s[0] === 'R' ? 'يمين' : 'يسار'), f[2], f[3], f[4]]); }); });
    return out;
  }
  // questionnaire: n items scored 0..max; keys prefix.0..n-1 (not printed one by one)
  function qFields(prefix, items, max) {
    var o = ['']; for (var i = 0; i <= max; i++) o.push(String(i));
    return items.map(function (q, i) { return [prefix + '.' + i, (i + 1) + '. ' + q, 's', o, { nr: 1 }]; });
  }
  function qTotal(v, prefix, n) {
    var a = gv(v, prefix) || {}, t = 0, c = 0;
    for (var i = 0; i < n; i++) if (a[i] !== undefined && a[i] !== '') { t += Number(a[i]); c++; }
    return c ? { total: t, answered: c } : null;
  }
  function trend(sectionId, path) {
    var pts = [];
    prevVisits().forEach(function (x) { var s = x.exam && x.exam.sections && x.exam.sections[sectionId]; var val = s && gv(s, path); if (val != null && val !== '') pts.push(x.date + ': ' + val); });
    return pts.length ? '📉 السابق: ' + pts.slice(-4).join(' ← ') : '';
  }

  /* Section factory.
     cfg: { id, title, box, groups:[{id,t,f:[fields], pre(v), post(v), sum(v)}], summary(v), derive(v), calc(el,v), extraRender(v), banner(v) } */
  function entSection(cfg) {
    var labels = {}, noRender = {};
    cfg.groups.forEach(function (g) { g.f.forEach(function (f) { labels[f[0]] = f[1]; if (f[4] && f[4].nr) noRender[f[0]] = 1; }); });
    function collect(el) {
      var v = collectFields(el);
      if (v && cfg.derive) cfg.derive(v);
      return v;
    }
    return {
      id: cfg.id,
      title: cfg.title,
      html: function (v) {
        v = v || {};
        var inner = cfg.groups.map(function (g) {
          var body = (g.pre ? g.pre(v) : '') + (g.f.length ? '<div class="grid-2 ent-grid">' + g.f.filter(function (f) { return !(f[4] && f[4].hidden); }).map(function (f) { return fieldHtml(f, v); }).join('') + '</div>' : '') + (g.post ? g.post(v) : '');
          return cfg.groups.length === 1 ? body : bx(cfg.box + '-' + g.id, g.t, g.sum ? g.sum(v) : '', body);
        }).join('');
        return bx(cfg.box, cfg.title, cfg.summary(v), (cfg.bannerHtml ? cfg.bannerHtml : '') + inner);
      },
      wire: function (el) {
        if (el._entWired) return; el._entWired = true;
        function refresh() {
          var v = collect(el) || {};
          if (cfg.calc) { try { cfg.calc(el, v); } catch (e) { console.warn(e); } }
          setSum(el, cfg.box, cfg.summary(v));
          if (cfg.groups.length > 1) cfg.groups.forEach(function (g) { if (g.sum) setSum(el, cfg.box + '-' + g.id, g.sum(v)); });
        }
        el.addEventListener('change', refresh);
        el.addEventListener('input', function (e) { if (e.target.type === 'number' || e.target.type === 'date') refresh(); });
        if (cfg.wire) cfg.wire(el, refresh);
        refresh();
      },
      collect: collect,
      render: function (v) {
        if (!v) return '';
        var rows = [];
        cfg.groups.forEach(function (g) {
          g.f.forEach(function (f) {
            if (noRender[f[0]]) return;
            var x = gv(v, f[0]);
            if (x == null || x === '' || (Array.isArray(x) && !x.length)) return;
            rows.push([labels[f[0]], Array.isArray(x) ? x.join('، ') : x]);
          });
        });
        var h = cfg.extraRender ? cfg.extraRender(v) : '';
        if (rows.length) h += SP.tableHtml(['البند', 'القيمة'], rows);
        return h;
      }
    };
  }
  function out(el, sel, html) { var x = el.querySelector(sel); if (x) x.innerHTML = html; }

  /* =====================================================================
     1) PER-SIDE EAR / NOSE / THROAT EXAM  (old entExam fields are untouched)
     Tuning-fork logic (classic interpretation, doctor must verify):
       Rinne negative (BC > AC) in an ear  -> conductive loss in that ear.
       Weber lateralises to ear X: if X is Rinne-negative -> conductive loss in X;
                                    if both Rinne positive -> sensorineural loss in the OTHER ear.
     ===================================================================== */
  var CANAL = ['', 'طبيعية (Normal)', 'شمع (Wax)', 'التهاب خارجي (Otitis externa)', 'إفرازات (Discharge)', 'جسم غريب (Foreign body)', 'نتوء عظمي (Exostosis)'];
  var TM = ['', 'سليمة (Intact)', 'محتقنة (Congested)', 'منتفخة (Bulging)', 'منكمشة (Retracted)', 'مثقوبة (Perforated)', 'سوائل خلفها (Effusion)', 'أنبوب تهوية (Grommet in place)', 'تندب / تصلب (Scarring / Tympanosclerosis)'];
  var PERF = 'مثقوبة (Perforated)';
  function forkHint(v) {
    var f = v.fork || {}, rR = f.rinneR || '', rL = f.rinneL || '', w = f.weber || '';
    if (!rR && !rL && !w) return '';
    var negR = rR.indexOf('سلبي') === 0, negL = rL.indexOf('سلبي') === 0, posR = rR.indexOf('إيجابي') === 0, posL = rL.indexOf('إيجابي') === 0;
    var h = [];
    if (negR) h.push('توصيلي في الأذن اليمنى (conductive R)');
    if (negL) h.push('توصيلي في الأذن اليسرى (conductive L)');
    if (w.indexOf('يمين') === 0 && posR && posL) h.push('حسي عصبي في الأذن اليسرى (sensorineural L)');
    if (w.indexOf('يسار') === 0 && posR && posL) h.push('حسي عصبي في الأذن اليمنى (sensorineural R)');
    if (w.indexOf('يمين') === 0 && negL && !negR) h.push('Weber لا يتوافق مع Rinne — راجع الفحص');
    if (w.indexOf('يسار') === 0 && negR && !negL) h.push('Weber لا يتوافق مع Rinne — راجع الفحص');
    return h.length ? 'يشير إلى: ' + h.join(' · ') : (w.indexOf('المنتصف') === 0 && posR && posL ? 'طبيعي أو فقد متماثل' : '');
  }
  var TONS = ['', '0', '1', '2', '3', '4'];
  SP.addSection('ent', entSection({
    id: 'entSides', title: '👂 الفحص لكل جهة (يمين / يسار)', box: 'ent-sides',
    groups: [
      { id: 'ear', t: 'الأذن — يمين / يسار (Ear)', f: sides('ear', [
          ['pinna', 'الصيوان (Pinna)', 't', 'طبيعي'], ['canal', 'القناة (Canal)', 's', CANAL], ['tm', 'الطبلة (TM)', 's', TM],
          ['perf', 'الثقب: الحجم / المكان (Perforation size / site)', 't', 'مركزي صغير'], ['mastoid', 'ألم الماستويد (Mastoid tenderness)', 's', YN]]),
        sum: function (v) { var e = v.ear || {}; return ['R', 'L'].map(function (s) { var x = e[s] || {}; return (x.tm || x.canal) ? s + ': ' + (x.tm || x.canal).split(' (')[0] : ''; }).filter(Boolean).join(' · '); } },
      { id: 'fork', t: 'الشوكة الرنانة (Tuning forks)', f: [
          ['fork.rinneR', 'Rinne — يمين', 's', PN], ['fork.rinneL', 'Rinne — يسار', 's', PN],
          ['fork.weber', 'Weber', 's', ['', 'المنتصف (Center)', 'يمين (Right)', 'يسار (Left)']]],
        post: function () { return '<p class="sev-out ent-out" data-o="fork"></p>'; }, sum: forkHint },
      { id: 'ton', t: 'اللوزتان — يمين / يسار (Tonsils)', f: [
          ['ton.R', 'درجة اللوزة — يمين (Grade 0-4)', 's', TONS], ['ton.L', 'درجة اللوزة — يسار (Grade 0-4)', 's', TONS],
          ['ton.exudate', 'صديد / إفرازات (Exudate)', 's', YN]],
        sum: function (v) { var t = v.ton || {}; return (t.R || t.L) ? 'R ' + (t.R || '-') + ' · L ' + (t.L || '-') + (t.exudate === 'نعم' ? ' · صديد' : '') : ''; } },
      { id: 'nose', t: 'الأنف — يمين / يسار (Nose)', f: sides('nose', [
          ['septum', 'انحراف الحاجز (Septal deviation)', 's', ['', 'لا يوجد', 'بسيط', 'متوسط', 'شديد']],
          ['turb', 'القرنيات (Turbinates)', 's', ['', 'طبيعية', 'متضخمة', 'محتقنة', 'شاحبة']],
          ['meatus', 'إفرازات الصماخ الأوسط (Middle meatus discharge)', 's', ['', 'لا يوجد', 'مخاطية', 'صديدية']],
          ['polyps', 'لحمية (Polyps)', 's', YN], ['mucosa', 'لون الغشاء (Mucosa)', 's', ['', 'وردي طبيعي', 'شاحب (Pale)', 'أحمر (Red)']]]),
        sum: function (v) { var n = v.nose || {}; return ['R', 'L'].map(function (s) { var x = n[s] || {}; return x.septum && x.septum !== 'لا يوجد' ? 'انحراف ' + s : (x.polyps === 'نعم' ? 'لحمية ' + s : ''); }).filter(Boolean).join(' · '); } }
    ],
    summary: function (v) {
      var p = [], e = v.ear || {};
      ['R', 'L'].forEach(function (s) { var x = e[s] || {}; if (x.tm) p.push(s + ' ' + x.tm.split(' (')[0]); });
      var t = v.ton || {}; if (t.R || t.L) p.push('Tonsils R' + (t.R || '-') + '/L' + (t.L || '-'));
      var h = forkHint(v); if (h) p.push(h.replace('يشير إلى: ', ''));
      return p.join(' · ');
    },
    calc: function (el, v) {
      out(el, '[data-o="fork"]', esc(forkHint(v) || '—'));
      ['R', 'L'].forEach(function (s) {
        var tm = el.querySelector('[data-k="ear.' + s + '.tm"]'), pf = el.querySelector('[data-k="ear.' + s + '.perf"]');
        if (tm && pf) pf.closest('.field').style.display = (tm.value === PERF || pf.value) ? '' : 'none';
      });
    },
    extraRender: function (v) { var h = forkHint(v); return h ? '<p><b>Tuning forks:</b> ' + esc(h) + '</p>' : ''; }
  }));

  /* =====================================================================
     2) AUDIOLOGY
     PTA (4-frequency) = mean AC at 500, 1000, 2000, 4000 Hz.
     Degree (ASHA / Clark style, dB HL): ≤25 normal · 26–40 mild · 41–55 moderate · 56–70 moderately severe · 71–90 severe · >90 profound.
     Type: air-bone gap (ABG) = mean(AC − BC) at the PTA frequencies where both exist.
        ABG ≥ 15 dB and BC-PTA ≤ 25  -> conductive · ABG ≥ 15 and BC-PTA > 25 -> mixed
        ABG < 15 and AC-PTA > 25     -> sensorineural · otherwise normal.  Doctor can override.
     ===================================================================== */
  var FREQ = [250, 500, 1000, 2000, 4000, 8000], PTAF = [500, 1000, 2000, 4000];
  function degree(p) { return p == null ? '' : p <= 25 ? 'طبيعي (Normal)' : p <= 40 ? 'بسيط (Mild)' : p <= 55 ? 'متوسط (Moderate)' : p <= 70 ? 'متوسط إلى شديد (Moderately severe)' : p <= 90 ? 'شديد (Severe)' : 'عميق (Profound)'; }
  function earCalc(a, s) {
    var e = (a && a[s]) || {}, ac = e.ac || {}, bc = e.bc || {}, sa = 0, na = 0, sb = 0, nb = 0, gap = 0, ng = 0;
    PTAF.forEach(function (f) {
      var x = num(ac[f]), y = num(bc[f]);
      if (x != null) { sa += x; na++; }
      if (y != null) { sb += y; nb++; }
      if (x != null && y != null) { gap += x - y; ng++; }
    });
    if (!na) return null;
    var pta = Math.round(sa / na * 10) / 10, bpta = nb ? sb / nb : null, abg = ng ? gap / ng : null, type;
    if (abg != null && abg >= 15) type = (bpta != null && bpta <= 25) ? 'توصيلي (Conductive)' : 'مختلط (Mixed)';
    else type = pta > 25 ? 'حسي عصبي (Sensorineural)' : 'طبيعي (Normal)';
    return { pta: pta, complete: na === 4, degree: degree(pta), type: type, abg: abg == null ? null : Math.round(abg) };
  }
  function audSvg(a) {
    var W = 300, H = 210, L = 34, T = 14, gw = 250, gh = 180;
    function x(i) { return L + i * gw / (FREQ.length - 1); }
    function y(db) { return T + (db + 10) * gh / 130; } // axis -10 .. 120 dB HL (inverted: 0 at top)
    var s = '<svg viewBox="0 0 ' + W + ' ' + H + '" class="ent-aud" direction="ltr">';
    for (var d = 0; d <= 120; d += 20) s += '<line x1="' + L + '" x2="' + (L + gw) + '" y1="' + y(d) + '" y2="' + y(d) + '" class="g"/><text x="2" y="' + (y(d) + 3) + '">' + d + '</text>';
    FREQ.forEach(function (f, i) { s += '<line x1="' + x(i) + '" x2="' + x(i) + '" y1="' + T + '" y2="' + (T + gh) + '" class="g"/><text x="' + (x(i) - 10) + '" y="' + (H - 2) + '">' + (f >= 1000 ? f / 1000 + 'k' : f) + '</text>'; });
    s += '<rect x="' + L + '" y="' + y(-10) + '" width="' + gw + '" height="' + (y(25) - y(-10)) + '" class="nz"/>';
    [['R', 'r'], ['L', 'l']].forEach(function (p) {
      var e = (a && a[p[0]]) || {}, ac = e.ac || {}, bc = e.bc || {}, pts = [];
      FREQ.forEach(function (f, i) {
        var v = num(ac[f]);
        if (v != null) {
          pts.push(x(i) + ',' + y(v));
          s += p[0] === 'R' ? '<circle cx="' + x(i) + '" cy="' + y(v) + '" r="4" class="' + p[1] + '"/>'
            : '<path d="M' + (x(i) - 4) + ' ' + (y(v) - 4) + 'l8 8M' + (x(i) + 4) + ' ' + (y(v) - 4) + 'l-8 8" class="' + p[1] + '"/>';
        }
        var b = num(bc[f]);
        if (b != null) s += '<text x="' + (x(i) + (p[0] === 'R' ? -11 : 5)) + '" y="' + (y(b) + 4) + '" class="' + p[1] + 't">' + (p[0] === 'R' ? '&lt;' : '&gt;') + '</text>';
      });
      if (pts.length > 1) s += '<polyline points="' + pts.join(' ') + '" class="' + p[1] + ' ln"/>';
    });
    return s + '</svg>';
  }
  function audTable(v) {
    var a = v.aud || {};
    var h = '<div class="table-wrap"><table class="ent-aud-t"><thead><tr><th>Hz</th>' + FREQ.map(function (f) { return '<th>' + f + '</th>'; }).join('') + '</tr></thead><tbody>';
    [['R', 'ac', 'يمين — هوائي AC (O)'], ['R', 'bc', 'يمين — عظمي BC (<)'], ['L', 'ac', 'يسار — هوائي AC (X)'], ['L', 'bc', 'يسار — عظمي BC (>)']].forEach(function (r) {
      h += '<tr class="' + (r[0] === 'R' ? 'ent-r' : 'ent-l') + '"><th>' + r[2] + '</th>' + FREQ.map(function (f) {
        var x = gv(a, r[0] + '.' + r[1] + '.' + f);
        return '<td><input class="ef" type="number" step="5" min="-10" max="120" inputmode="numeric" data-k="aud.' + r[0] + '.' + r[1] + '.' + f + '" value="' + esc(x == null ? '' : x) + '"/></td>';
      }).join('') + '</tr>';
    });
    return h + '</tbody></table></div>';
  }
  function audText(v, s) {
    var c = v.calc && v.calc[s]; if (!c) return '';
    var type = (v.override && v.override[s]) || c.type;
    return s + ': PTA ' + c.pta + ' dB — ' + c.degree.split(' (')[0] + (c.pta > 25 || (v.override && v.override[s]) ? ' ' + type.split(' (')[0] : '');
  }
  function prevAudios() {
    var list = [];
    prevVisits().forEach(function (x) { var a = x.exam && x.exam.sections && x.exam.sections.entAudio; if (a && a.calc) list.push({ date: a.date || x.date, v: a }); });
    return list.slice(-5);
  }
  var TYPES = ['', 'طبيعي (Normal)', 'توصيلي (Conductive)', 'حسي عصبي (Sensorineural)', 'مختلط (Mixed)'];
  var TYMP = ['', 'A', 'As', 'Ad', 'B', 'C'];
  SP.addSection('ent', entSection({
    id: 'entAudio', title: '🎧 قياس السمع وضغط الأذن (Audiogram / Tympanometry)', box: 'ent-audio',
    groups: [
      { id: 'pta', t: 'رسم السمع (Audiogram)', f: [['date', 'تاريخ القياس', 'd']],
        pre: function (v) { return audTable(v); },
        post: function (v) { return '<div class="ent-aud-wrap"></div><p class="sev-out ent-out" data-o="aud"></p><p class="muted">🔴 O = الأذن اليمنى · 🔵 X = الأذن اليسرى · &lt; &gt; = التوصيل العظمي. المحور مقلوب 0 → 120 dB.</p>'; },
        sum: function (v) { return [audText(v, 'R'), audText(v, 'L')].filter(Boolean).join(' · '); } },
      { id: 'type', t: 'نوع الفقد (تعديل الطبيب) والطبلة', f: [
          ['override.R', 'نوع الفقد — يمين (Override)', 's', TYPES], ['override.L', 'نوع الفقد — يسار (Override)', 's', TYPES],
          ['tymp.R', 'Tympanometry — يمين', 's', TYMP], ['tymp.L', 'Tympanometry — يسار', 's', TYMP],
          ['sd.R', 'تمييز الكلام % — يمين (Speech discrimination)', 'n', '%'], ['sd.L', 'تمييز الكلام % — يسار', 'n', '%'],
          ['aid', 'سماعة طبية (Hearing aid)', 's', ['', 'لا يستخدم (None)', 'يستخدم سماعة (Uses aid)', 'تم التحويل (Referred)']]],
        sum: function (v) { var t = v.tymp || {}; return (t.R || t.L) ? 'Tymp R ' + (t.R || '-') + ' · L ' + (t.L || '-') : ''; } },
      { id: 'prev', t: 'القياسات السابقة (Previous audiograms)', f: [],
        pre: function () {
          var p = prevAudios();
          if (!p.length) return '<p class="muted">لا توجد قياسات سابقة.</p>';
          return SP.tableHtml(['التاريخ', 'يمين', 'يسار'], p.map(function (x) { return [x.date, audText(x.v, 'R').replace(/^R: /, '') || '-', audText(x.v, 'L').replace(/^L: /, '') || '-']; }));
        },
        sum: function () { var n = prevAudios().length; return n ? n + ' قياس سابق' : ''; } }
    ],
    derive: function (v) {
      v.calc = {}; ['R', 'L'].forEach(function (s) { var c = earCalc(v.aud, s); if (c) v.calc[s] = c; });
      if (!Object.keys(v.calc).length) delete v.calc;
      else if (!v.date) v.date = today();
    },
    summary: function (v) { var t = [audText(v, 'R'), audText(v, 'L')].filter(Boolean).join(', '); return t ? 'Audiogram: ' + t : ''; },
    calc: function (el, v) {
      out(el, '.ent-aud-wrap', audSvg(v.aud));
      var t = ['R', 'L'].map(function (s) { var c = v.calc && v.calc[s]; return c ? s + ': PTA ' + c.pta + ' dB' + (c.complete ? '' : ' (غير مكتمل)') + ' — ' + c.degree + ' · ' + c.type + (c.abg != null ? ' · ABG ' + c.abg + ' dB' : '') + (v.override && v.override[s] ? ' · تعديل الطبيب: ' + v.override[s] : '') : ''; }).filter(Boolean);
      out(el, '[data-o="aud"]', t.length ? t.map(esc).join('<br>') + '<br><small>⚠️ تقدير تلقائي — يجب على الطبيب المراجعة.</small>' : '—');
    },
    extraRender: function (v) {
      var h = '';
      if (v.aud) {
        h += audSvg(v.aud);
        var rows = [];
        [['R', 'ac', 'يمين AC'], ['R', 'bc', 'يمين BC'], ['L', 'ac', 'يسار AC'], ['L', 'bc', 'يسار BC']].forEach(function (r) {
          var o = gv(v.aud, r[0] + '.' + r[1]); if (o) rows.push([r[2]].concat(FREQ.map(function (f) { return o[f] != null ? o[f] : '-'; })));
        });
        if (rows.length) h += SP.tableHtml(['Hz'].concat(FREQ.map(String)), rows);
      }
      var t = [audText(v, 'R'), audText(v, 'L')].filter(Boolean);
      if (t.length) h += '<p><b>PTA:</b> ' + esc(t.join(' · ')) + '</p>';
      return h;
    }
  }));

  /* =====================================================================
     3) VERTIGO / DIZZINESS — auto-opens when entSymptoms "دوخة / دوار" = نعم
     ===================================================================== */
  var DH = ['', 'سلبي (Negative)', 'إيجابي (Positive)'];
  SP.addSection('ent', entSection({
    id: 'entVertigo', title: '🌀 الدوخة والدوار (Vertigo)', box: 'ent-vertigo',
    groups: [
      { id: 'hx', t: 'التاريخ (History)', f: [
          ['dur', 'مدة النوبة (Episode duration)', 's', ['', 'ثوانٍ (Seconds)', 'دقائق (Minutes)', 'ساعات (Hours)', 'أيام (Days)']],
          ['onset', 'البداية (Onset)', 's', ['', 'مفاجئة (Sudden)', 'تدريجية (Gradual)']],
          ['trig', 'المحفز (Triggers)', 'c', ['تغيير وضع الرأس (Head position)', 'الوقوف (Standing up)', 'لا يوجد (None)']],
          ['assoc', 'أعراض مصاحبة (Associated)', 'c', ['ضعف السمع (Hearing loss)', 'طنين (Tinnitus)', 'امتلاء الأذن (Ear fullness)', 'صداع (Headache)', 'غثيان / قيء (Nausea / vomiting)']]],
        sum: function (v) { return [v.dur, v.onset].filter(Boolean).map(function (x) { return x.split(' (')[0]; }).join(' · '); } },
      { id: 'tests', t: 'الاختبارات (Tests)', f: [
          ['dhR', 'Dix-Hallpike — يمين', 's', DH], ['dhL', 'Dix-Hallpike — يسار', 's', DH],
          ['nysDir', 'اتجاه الرأرأة (Nystagmus direction)', 't', 'geotropic torsional'],
          ['hit', 'Head impulse test', 's', ['', 'طبيعي (Normal)', 'غير طبيعي يمين (Abnormal R)', 'غير طبيعي يسار (Abnormal L)']],
          ['romberg', 'Romberg', 's', ['', 'سلبي (Negative)', 'إيجابي (Positive)']],
          ['nysType', 'نوع الرأرأة (Nystagmus type)', 's', ['', 'لا يوجد', 'أفقي (Horizontal)', 'التوائي (Torsional)', 'رأسي (Vertical)', 'متغير الاتجاه (Direction-changing)']]],
        sum: function (v) { var p = []; if (v.dhR && v.dhR.indexOf('إيجابي') === 0) p.push('DH R+'); if (v.dhL && v.dhL.indexOf('إيجابي') === 0) p.push('DH L+'); return p.join(' · '); } },
      { id: 'man', t: 'المناورة (Maneuver)', f: [
          ['maneuver', 'المناورة', 's', ['', 'لا يوجد (None)', 'Epley', 'Semont']], ['manDate', 'التاريخ', 'd']],
        sum: function (v) { return v.maneuver && v.maneuver.indexOf('لا') !== 0 ? v.maneuver + (v.manDate ? ' ' + v.manDate : '') : ''; } }
    ],
    summary: function (v) {
      var p = [];
      if (v.dur) p.push(v.dur.split(' (')[0]);
      if (v.dhR && v.dhR.indexOf('إيجابي') === 0) p.push('Dix-Hallpike R+');
      if (v.dhL && v.dhL.indexOf('إيجابي') === 0) p.push('Dix-Hallpike L+');
      if (v.maneuver && v.maneuver.indexOf('لا') !== 0) p.push(v.maneuver);
      return p.join(' · ');
    },
    wire: function (el) {
      function check() {
        var s = document.querySelector('[data-xk="vertigo"]');
        var b = el.querySelector('.cc-box[data-cc="ent-vertigo"]');
        if (s && b && CC && s.value === 'نعم' && !b.classList.contains('open') && !b._autoOpened) { b._autoOpened = true; CC.setBoxOpen(b, true); }
      }
      document.addEventListener('change', function (e) { if (e.target && e.target.dataset && e.target.dataset.xk === 'vertigo') check(); });
      setTimeout(check, 0);
    }
  }));

  /* =====================================================================
     4) NOSE & SINUS
     Rhinosinusitis by duration (EPOS / AAO-HNS): < 4 weeks acute · 4–12 weeks subacute · > 12 weeks chronic.
     SNOT-22: 22 items × 0–5 -> total 0–110 (higher = worse; MCID ≈ 9 points).
     Lund-Mackay CT: per side maxillary, anterior ethmoid, posterior ethmoid, sphenoid, frontal (0 none / 1 partial / 2 total)
                     + ostiomeatal complex (0 or 2 only) -> 12 per side, 24 total.
     ===================================================================== */
  var SNOT = ['الحاجة إلى تنظيف الأنف (Need to blow nose)', 'انسداد الأنف (Nasal blockage)', 'العطس (Sneezing)', 'سيلان الأنف (Runny nose)', 'الكحة (Cough)',
    'إفرازات خلف الأنف (Post-nasal discharge)', 'إفرازات أنفية سميكة (Thick nasal discharge)', 'امتلاء الأذن (Ear fullness)', 'الدوخة (Dizziness)', 'ألم الأذن (Ear pain)',
    'ألم / ضغط بالوجه (Facial pain / pressure)', 'ضعف الشم أو التذوق (Decreased smell / taste)', 'صعوبة بدء النوم (Difficulty falling asleep)', 'الاستيقاظ ليلاً (Waking up at night)',
    'قلة النوم الجيد (Lack of good night sleep)', 'الاستيقاظ متعباً (Waking up tired)', 'الإرهاق (Fatigue)', 'انخفاض الإنتاجية (Reduced productivity)', 'ضعف التركيز (Reduced concentration)',
    'الإحباط / العصبية (Frustrated / restless / irritable)', 'الحزن (Sad)', 'الإحراج (Embarrassed)'];
  var LM = [['max', 'الجيب الفكي (Maxillary)'], ['ae', 'الغربالي الأمامي (Anterior ethmoid)'], ['pe', 'الغربالي الخلفي (Posterior ethmoid)'], ['sph', 'الوتدي (Sphenoid)'], ['fr', 'الجبهي (Frontal)'], ['omc', 'المركب الصماخي (OMC 0 / 2)']];
  function rsClass(w) { w = num(w); return w == null ? '' : w < 4 ? 'حاد (Acute)' : w <= 12 ? 'تحت الحاد (Subacute)' : 'مزمن (Chronic)'; }
  function lmTotal(v) {
    var l = v.lm || {}, t = 0, any = false;
    ['R', 'L'].forEach(function (s) { LM.forEach(function (r) { var x = num(gv(l, s + '.' + r[0])); if (x != null) { t += x; any = true; } }); });
    return any ? t : null;
  }
  function aria(v) { return v.ariaFreq && v.ariaSev ? 'ARIA: ' + v.ariaFreq.split(' (')[0] + ' ' + v.ariaSev.split(' (')[0] : ''; }
  var POLYP = ['', '0', '1', '2', '3', '4'];
  var ENDO = ['طبيعي (Normal)', 'صديد بالصماخ الأوسط (Pus middle meatus)', 'لحمية (Polyps)', 'وذمة (Edema)', 'تضخم القرنيات (Turbinate hypertrophy)', 'انحراف (Deviation)', 'قشور (Crusts)', 'كتلة (Mass)'];
  SP.addSection('ent', entSection({
    id: 'entNose', title: '👃 الأنف والجيوب الأنفية (Nose & Sinus)', box: 'ent-nose',
    groups: [
      { id: 'ar', t: 'حساسية الأنف والتهاب الجيوب', f: [
          ['ariaFreq', 'حساسية الأنف — التكرار (ARIA)', 's', ['', 'متقطعة (Intermittent)', 'مستمرة (Persistent)']],
          ['ariaSev', 'حساسية الأنف — الشدة (ARIA)', 's', ['', 'بسيطة (Mild)', 'متوسطة / شديدة (Moderate-severe)']],
          ['rsWeeks', 'مدة أعراض الجيوب (بالأسابيع)', 'n', 'أسابيع']],
        post: function () { return '<p class="sev-out ent-out" data-o="rs"></p>'; },
        sum: function (v) { return [aria(v), v.rsClass ? 'Rhinosinusitis: ' + v.rsClass.split(' (')[0] : ''].filter(Boolean).join(' · '); } },
      { id: 'endo', t: 'اللحمية والمنظار واللحمية الخلفية', f: [
          ['polyp.R', 'درجة اللحمية — يمين (Polyp grade 0-4)', 's', POLYP], ['polyp.L', 'درجة اللحمية — يسار (Polyp grade 0-4)', 's', POLYP],
          ['endo.R', 'المنظار — يمين (Endoscopy R)', 'c', ENDO], ['endo.Rtxt', 'ملاحظات المنظار — يمين', 't'],
          ['endo.L', 'المنظار — يسار (Endoscopy L)', 'c', ENDO], ['endo.Ltxt', 'ملاحظات المنظار — يسار', 't'],
          ['adenoid', 'حجم اللحمية الخلفية عند الأطفال (% انسداد الفتحة الخلفية)', 'n', '%']],
        sum: function (v) { var p = v.polyp || {}; return [(p.R || p.L) ? 'Polyps R' + (p.R || '-') + '/L' + (p.L || '-') : '', v.adenoid ? 'Adenoid ' + v.adenoid + '%' : ''].filter(Boolean).join(' · '); } },
      { id: 'snot', t: 'SNOT-22 (0–5 لكل سؤال)', f: qFields('snot', SNOT, 5),
        pre: function () { return '<p class="muted">0 لا مشكلة · 1 بسيطة جداً · 2 بسيطة · 3 متوسطة · 4 شديدة · 5 أسوأ ما يكون</p>'; },
        post: function () { return '<p class="sev-out ent-out" data-o="snot"></p><p class="muted ort-trend" data-o="snotTr"></p>'; },
        sum: function (v) { return v.snotTotal != null ? 'SNOT-22 ' + v.snotTotal + ' / 110' : ''; } },
      { id: 'lm', t: 'Lund-Mackay (CT)', f: [],
        pre: function (v) {
          var h = '<div class="table-wrap"><table class="ort-nv"><thead><tr><th></th><th>يمين</th><th>يسار</th></tr></thead><tbody>';
          LM.forEach(function (r) {
            var o = r[0] === 'omc' ? ['', '0', '2'] : ['', '0', '1', '2'];
            h += '<tr><th>' + esc(r[1]) + '</th>' + ['R', 'L'].map(function (s) { return '<td><select class="ef" data-k="lm.' + s + '.' + r[0] + '">' + opts(o, gv(v, 'lm.' + s + '.' + r[0])) + '</select></td>'; }).join('') + '</tr>';
          });
          return h + '</tbody></table></div><p class="sev-out ent-out" data-o="lm"></p>';
        },
        sum: function (v) { return v.lmTotal != null ? 'Lund-Mackay ' + v.lmTotal + ' / 24' : ''; } },
      { id: 'epi', t: 'الرعاف (Epistaxis)', f: [
          ['epi.side', 'الجهة', 's', SIDE], ['epi.freq', 'التكرار', 't', 'مرتين أسبوعياً'],
          ['epi.amount', 'الكمية', 's', ['', 'قليلة', 'متوسطة', 'غزيرة']], ['epi.site', 'المكان المرجح', 's', ['', 'أمامي (Anterior)', 'خلفي (Posterior)']],
          ['epi.tx', 'الإجراء', 'c', ['كي (Cautery)', 'دك (Packing)']],
          ['epi.anticoag', 'يتناول مسيلات / مضادات صفائح (Anticoagulants / antiplatelets)', 's', YN]],
        sum: function (v) { var e = v.epi || {}; return e.side ? e.side + (e.site ? ' · ' + e.site.split(' (')[0] : '') + (e.anticoag === 'نعم' ? ' · مسيلات' : '') : ''; } },
      { id: 'smell', t: 'فقدان الشم (Smell loss)', f: [
          ['smell.onset', 'البداية', 's', ['', 'مفاجئة', 'تدريجية']], ['smell.dur', 'المدة', 't', '3 أشهر'], ['smell.postViral', 'بعد عدوى فيروسية (Post-viral)', 's', YN]],
        sum: function (v) { var s = v.smell || {}; return s.onset || s.dur ? 'فقدان الشم' + (s.dur ? ' ' + s.dur : '') : ''; } }
    ],
    derive: function (v) {
      var c = rsClass(v.rsWeeks); if (c) v.rsClass = c;
      var s = qTotal(v, 'snot', 22); if (s) { v.snotTotal = s.total; v.snotAnswered = s.answered; }
      var l = lmTotal(v); if (l != null) v.lmTotal = l;
    },
    summary: function (v) {
      return [aria(v), v.rsClass ? 'Rhinosinusitis ' + v.rsClass.split(' (')[0] : '', v.snotTotal != null ? 'SNOT-22 ' + v.snotTotal : '', v.lmTotal != null ? 'LM ' + v.lmTotal + '/24' : '', v.epi && v.epi.side ? 'Epistaxis ' + v.epi.side : ''].filter(Boolean).join(' · ');
    },
    calc: function (el, v) {
      out(el, '[data-o="rs"]', v.rsClass ? 'التصنيف: ' + esc(v.rsClass) : '—');
      out(el, '[data-o="snot"]', v.snotTotal != null ? 'SNOT-22 = ' + v.snotTotal + ' / 110' + (v.snotAnswered < 22 ? ' (' + v.snotAnswered + '/22 سؤال)' : '') : '—');
      out(el, '[data-o="snotTr"]', esc(trend('entNose', 'snotTotal')));
      out(el, '[data-o="lm"]', v.lmTotal != null ? 'Lund-Mackay = ' + v.lmTotal + ' / 24' : '—');
    },
    extraRender: function (v) {
      var r = [];
      if (v.rsClass) r.push(['Rhinosinusitis', v.rsClass]);
      if (v.snotTotal != null) r.push(['SNOT-22', v.snotTotal + ' / 110']);
      if (v.lmTotal != null) r.push(['Lund-Mackay', v.lmTotal + ' / 24']);
      return r.length ? SP.tableHtml(['المقياس', 'النتيجة'], r) : '';
    }
  }));

  /* =====================================================================
     5) TONSILS & ADENOIDS
     Helper only (Paradise criteria, as used in AAO-HNS tonsillectomy guideline):
       ≥ 7 episodes in the past year, OR ≥ 5 per year in each of the past 2 years, OR ≥ 3 per year in each of the past 3 years.
     ===================================================================== */
  function paradise(v) {
    var e = v.ep || {}, a = num(e.y0) || 0, b = num(e.y1) || 0, c = num(e.y2) || 0;
    return a >= 7 || (a >= 5 && b >= 5) || (a >= 3 && b >= 3 && c >= 3);
  }
  SP.addSection('ent', entSection({
    id: 'entTonsil', title: '🫁 اللوزتان واللحمية (Tonsils & Adenoids)', box: 'ent-tonsil',
    groups: [
      { id: 'ep', t: 'نوبات التهاب اللوزتين (Episodes)', f: [
          ['ep.y0', 'هذا العام (آخر 12 شهر)', 'n', '0'], ['ep.y1', 'العام الماضي', 'n', '0'], ['ep.y2', 'منذ عامين', 'n', '0']],
        post: function () { return '<div class="ent-note" data-o="par" hidden>💡 قد تنطبق معايير الجراحة الشائعة (Paradise) — <b>يجب على الطبيب التحقق</b>.</div>'; },
        sum: function (v) { var e = v.ep || {}; return e.y0 ? e.y0 + ' نوبات/سنة' : ''; } },
      { id: 'sleep', t: 'أعراض النوم عند الأطفال', f: [
          ['kidSleep', 'الأعراض', 'c', ['شخير (Snoring)', 'تنفس من الفم (Mouth breathing)', 'توقف التنفس أثناء النوم (Witnessed apnea)', 'نوم متقطع (Restless sleep)', 'تبول ليلي (Enuresis)', 'نعاس / فرط حركة نهاراً (Daytime sleepiness / hyperactivity)']]],
        sum: function (v) { return (v.kidSleep || []).length ? v.kidSleep.length + ' أعراض' : ''; } }
    ],
    derive: function (v) { if (paradise(v)) v.criteria = true; },
    summary: function (v) {
      var e = v.ep || {}, p = [];
      if (e.y0) p.push(e.y0 + ' episodes/yr');
      if (v.criteria) p.push('قد تنطبق معايير الجراحة');
      if ((v.kidSleep || []).length) p.push('شخير/نوم');
      return p.join(' · ');
    },
    calc: function (el, v) { var n = el.querySelector('[data-o="par"]'); if (n) n.hidden = !v.criteria; },
    extraRender: function (v) { return v.criteria ? '<p><b>💡 قد تنطبق معايير الجراحة الشائعة (Paradise) — يجب على الطبيب التحقق.</b></p>' : ''; }
  }));

  /* =====================================================================
     6) LARYNX & VOICE
     VHI-10: 10 items × 0–4 -> 0–40; > 11 is considered abnormal (Arffa et al. 2012).
     Pack-years = cigarettes per day / 20 × years smoked.
     ===================================================================== */
  var VHI = ['صوتي يصعّب على الناس سماعي', 'يجد الناس صعوبة في فهمي في المكان المزدحم', 'مشكلة صوتي تقيّد حياتي الاجتماعية', 'أشعر بأنني مستبعد من المحادثات بسبب صوتي',
    'مشكلة صوتي تسبب لي خسارة مادية', 'أشعر أنني أجهد نفسي لإخراج صوتي', 'وضوح صوتي غير متوقع', 'مشكلة صوتي تضايقني', 'صوتي يشعرني بالعجز', 'يسألني الناس: ما مشكلة صوتك؟'];
  var CORD_M = ['', 'طبيعية (Normal)', 'ضعف (Paresis)', 'شلل (Paralysis)'];
  var CORD_L = ['طبيعي (Normal)', 'عقدة (Nodule)', 'بوليب (Polyp)', 'كيس (Cyst)', 'وذمة (Edema)', 'كتلة (Mass)', 'طلوان أبيض (Leukoplakia)'];
  SP.addSection('ent', entSection({
    id: 'entVoice', title: '🎤 الحنجرة والصوت (Larynx & Voice)', box: 'ent-voice',
    groups: [
      { id: 'hx', t: 'البحة والتدخين (Hoarseness)', f: [
          ['hoarseDur', 'مدة البحة', 't', '4 أسابيع'], ['hoarseOnset', 'البداية', 's', ['', 'مفاجئة', 'تدريجية']],
          ['cigDay', 'سجائر يومياً', 'n'], ['smokeYears', 'سنوات التدخين', 'n'],
          ['voiceUse', 'استخدام الصوت / المهنة', 't', 'مدرس']],
        post: function () { return '<p class="sev-out ent-out" data-o="py"></p>'; },
        sum: function (v) { return [v.hoarseDur ? 'بحة ' + v.hoarseDur : '', v.packYears != null ? v.packYears + ' pack-yr' : ''].filter(Boolean).join(' · '); } },
      { id: 'scope', t: 'منظار الحنجرة (Laryngoscopy)', f: [
          ['cord.R.mob', 'حركة الحبل الصوتي — يمين', 's', CORD_M], ['cord.L.mob', 'حركة الحبل الصوتي — يسار', 's', CORD_M],
          ['cord.R.les', 'آفة الحبل — يمين', 'c', CORD_L], ['cord.L.les', 'آفة الحبل — يسار', 'c', CORD_L],
          ['airway', 'مجرى الهواء (Airway)', 's', ['', 'آمن (Patent)', 'ضيق جزئي (Partially narrowed)', 'خطر (Compromised)']],
          ['lpr', 'علامات الارتجاع الحنجري (LPR signs)', 'c', ['احمرار خلف الحنجرة', 'وذمة الطيات', 'إفرازات لزجة', 'تضخم الغشاء الخلفي']]],
        sum: function (v) { var c = v.cord || {}; return ['R', 'L'].map(function (s) { var x = c[s] || {}; return x.mob && x.mob.indexOf('طبيعية') !== 0 ? s + ' ' + x.mob.split(' (')[0] : ''; }).filter(Boolean).join(' · '); } },
      { id: 'vhi', t: 'VHI-10 (0 أبداً … 4 دائماً)', f: qFields('vhi', VHI, 4),
        post: function () { return '<p class="sev-out ent-out" data-o="vhi"></p><p class="muted ort-trend" data-o="vhiTr"></p>'; },
        sum: function (v) { return v.vhiTotal != null ? 'VHI-10 ' + v.vhiTotal + ' / 40' : ''; } },
      { id: 'dys', t: 'صعوبة / ألم البلع (Dysphagia / Odynophagia)', f: [
          ['dys.type', 'النوع', 'c', ['صعوبة بلع (Dysphagia)', 'ألم بلع (Odynophagia)']],
          ['dys.with', 'مع', 'c', ['الجوامد (Solids)', 'السوائل (Liquids)']],
          ['dys.level', 'المستوى', 's', ['', 'الفم / الحلق', 'الرقبة', 'خلف القص']]],
        sum: function (v) { var d = v.dys || {}; return (d.type || []).map(function (x) { return x.split(' (')[0]; }).join(' · '); } }
    ],
    derive: function (v) {
      var c = num(v.cigDay), y = num(v.smokeYears); if (c != null && y != null) v.packYears = Math.round(c / 20 * y * 10) / 10;
      var q = qTotal(v, 'vhi', 10); if (q) { v.vhiTotal = q.total; v.vhiAnswered = q.answered; }
    },
    summary: function (v) {
      var c = v.cord || {}, p = [];
      if (v.hoarseDur) p.push('Hoarseness ' + v.hoarseDur);
      ['R', 'L'].forEach(function (s) { var x = c[s] || {}; if (x.mob && x.mob.indexOf('طبيعية') !== 0) p.push(s + ' cord ' + x.mob.split(' (')[1].replace(')', '')); });
      if (v.vhiTotal != null) p.push('VHI-10 ' + v.vhiTotal);
      return p.join(' · ');
    },
    calc: function (el, v) {
      out(el, '[data-o="py"]', v.packYears != null ? 'Pack-years = ' + v.packYears : '—');
      out(el, '[data-o="vhi"]', v.vhiTotal != null ? 'VHI-10 = ' + v.vhiTotal + ' / 40' + (v.vhiTotal > 11 ? ' — غير طبيعي (> 11)' : ' — ضمن الطبيعي') + (v.vhiAnswered < 10 ? ' (' + v.vhiAnswered + '/10)' : '') : '—');
      out(el, '[data-o="vhiTr"]', esc(trend('entVoice', 'vhiTotal')));
    },
    extraRender: function (v) {
      var r = [];
      if (v.packYears != null) r.push(['Pack-years', v.packYears]);
      if (v.vhiTotal != null) r.push(['VHI-10', v.vhiTotal + ' / 40']);
      return r.length ? SP.tableHtml(['المقياس', 'النتيجة'], r) : '';
    }
  }));

  /* =====================================================================
     7) SLEEP APNEA SCREENING
     STOP-BANG (8 yes/no): 0–2 low · 3–4 intermediate · 5–8 high risk.
     Epworth (8 items × 0–3 = 0–24): 0–10 normal · 11–12 mild · 13–15 moderate · 16–24 severe excessive daytime sleepiness.
     BMI = weight(kg) / height(m)².
     ===================================================================== */
  var SB = [['s', 'شخير عالٍ (Snoring)'], ['t', 'إرهاق / نعاس نهاري (Tired)'], ['o', 'ملاحظة توقف التنفس (Observed apnea)'], ['p', 'ضغط مرتفع (Pressure / HTN)'],
    ['b', 'مؤشر كتلة > 35 (BMI > 35)'], ['a', 'العمر > 50 (Age > 50)'], ['n', 'محيط الرقبة > 40 سم (Neck > 40 cm)'], ['g', 'ذكر (Gender male)']];
  var ESS = ['الجلوس والقراءة', 'مشاهدة التلفزيون', 'الجلوس بلا نشاط في مكان عام', 'راكب في سيارة لمدة ساعة دون توقف', 'الاستلقاء للراحة بعد الظهر',
    'الجلوس والتحدث مع شخص', 'الجلوس بهدوء بعد الغداء دون كحول', 'في سيارة متوقفة لدقائق في الزحام'];
  function sbRisk(n) { return n >= 5 ? 'مرتفع (High)' : n >= 3 ? 'متوسط (Intermediate)' : 'منخفض (Low)'; }
  function essBand(n) { return n <= 10 ? 'طبيعي' : n <= 12 ? 'نعاس بسيط' : n <= 15 ? 'نعاس متوسط' : 'نعاس شديد'; }
  SP.addSection('ent', entSection({
    id: 'entSleep', title: '😴 فحص انقطاع النفس أثناء النوم (Sleep apnea)', box: 'ent-sleep',
    groups: [
      { id: 'body', t: 'القياسات (BMI / Neck / Mallampati)', f: [
          ['weight', 'الوزن (كجم)', 'n'], ['height', 'الطول (سم)', 'n'], ['neck', 'محيط الرقبة (سم)', 'n'],
          ['mallampati', 'Mallampati', 's', ['', 'I', 'II', 'III', 'IV']], ['tonsil', 'حجم اللوزتين', 's', TONS],
          ['friedman', 'وضع اللسان (Friedman tongue position)', 's', ['', 'I', 'IIa', 'IIb', 'III', 'IV']]],
        post: function () { return '<p class="sev-out ent-out" data-o="bmi"></p>'; },
        sum: function (v) { return v.bmi ? 'BMI ' + v.bmi : ''; } },
      { id: 'sb', t: 'STOP-BANG', f: [['sb', 'نعم لكل بند', 'c', SB.map(function (x) { return x[1]; })]],
        post: function () { return '<p class="sev-out ent-out" data-o="sb"></p>'; },
        sum: function (v) { return v.stopBang != null ? 'STOP-BANG ' + v.stopBang + '/8' : ''; } },
      { id: 'ess', t: 'Epworth (0 لا … 3 احتمال كبير للنوم)', f: qFields('ess', ESS, 3),
        post: function () { return '<p class="sev-out ent-out" data-o="ess"></p>'; },
        sum: function (v) { return v.epworth != null ? 'Epworth ' + v.epworth + '/24' : ''; } }
    ],
    derive: function (v) {
      var w = num(v.weight), h = num(v.height);
      if (w && h) v.bmi = Math.round(w / Math.pow(h / 100, 2) * 10) / 10;
      if (v.sb) { v.stopBang = v.sb.length; v.stopBangRisk = sbRisk(v.sb.length); }
      var e = qTotal(v, 'ess', 8); if (e) v.epworth = e.total;
    },
    summary: function (v) {
      return [v.stopBang != null ? 'STOP-BANG ' + v.stopBang + ' (' + v.stopBangRisk.split(' (')[0] + ')' : '', v.epworth != null ? 'Epworth ' + v.epworth : '', v.bmi ? 'BMI ' + v.bmi : ''].filter(Boolean).join(' · ');
    },
    wire: function (el) {
      // prefill weight from the visit form if it exists (pediatrics / general weight field)
      var w = el.querySelector('[data-k="weight"]');
      var src = document.querySelector('.sp-f[data-k="weight"]');
      if (w && !w.value && src && src.value) w.value = src.value;
    },
    calc: function (el, v) {
      var hint = [];
      if (v.bmi > 35) hint.push('BMI > 35');
      if (num(v.neck) > 40) hint.push('Neck > 40');
      out(el, '[data-o="bmi"]', v.bmi ? 'BMI = ' + v.bmi + (hint.length ? ' — ' + esc(hint.join('، ')) + ': ضع علامة في STOP-BANG' : '') : '—');
      out(el, '[data-o="sb"]', v.stopBang != null ? 'STOP-BANG = ' + v.stopBang + ' / 8 — خطورة ' + esc(v.stopBangRisk) : '—');
      out(el, '[data-o="ess"]', v.epworth != null ? 'Epworth = ' + v.epworth + ' / 24 — ' + essBand(v.epworth) : '—');
    },
    extraRender: function (v) {
      var r = [];
      if (v.bmi) r.push(['BMI', v.bmi]);
      if (v.stopBang != null) r.push(['STOP-BANG', v.stopBang + ' / 8 — ' + v.stopBangRisk]);
      if (v.epworth != null) r.push(['Epworth', v.epworth + ' / 24 — ' + essBand(v.epworth)]);
      return r.length ? SP.tableHtml(['المقياس', 'النتيجة'], r) : '';
    }
  }));

  /* =====================================================================
     8) RED FLAGS (head & neck cancer / urgent)
     Any ticked -> red banner. Stridor or sudden SNHL (< 72 h) -> stronger emergency banner.
     ===================================================================== */
  var RF = ['بحة مستمرة أكثر من 3 أسابيع', 'سوائل بأذن واحدة أو ضعف سمع غير مفسر عند بالغ', 'انسداد أنف بجهة واحدة مع إفرازات دموية', 'كتلة بالرقبة أكثر من أسبوعين',
    'التهاب حلق أو صعوبة بلع مستمرة', 'تضخم لوزة واحدة', 'نقص وزن غير مفسر', 'تدخين شديد أو كحول', 'صرير / صعوبة في مجرى الهواء (Stridor)', 'ضعف سمع حسي عصبي مفاجئ (خلال 72 ساعة)'];
  var RF_STRONG = [RF[8], RF[9]];
  var RF_TXT = '⚠️ عاجل: يحتاج تحويل / تقييم إضافي';
  var RF_STRONG_TXT = '🚨 طارئ: صرير أو ضعف سمع مفاجئ — تقييم فوري اليوم';
  SP.addSection('ent', entSection({
    id: 'entRedflags', title: '🚩 العلامات الحمراء (Red flags)', box: 'ent-redflags',
    bannerHtml: '<div class="ort-banner ort-red ent-rf-strong" hidden>' + RF_STRONG_TXT + '</div><div class="ort-banner ort-red ent-rf" hidden>' + RF_TXT + '</div>',
    groups: [{ id: 'rf', t: '', f: [['flags', 'ضع علامة على الموجود', 'c', RF]] }],
    summary: function (v) { var f = v.flags || []; return f.length ? (f.some(function (x) { return RF_STRONG.indexOf(x) >= 0; }) ? '🚨 ' : '⚠️ ') + f.length + ' علامات' : ''; },
    calc: function (el, v) {
      var f = v.flags || [], strong = f.some(function (x) { return RF_STRONG.indexOf(x) >= 0; });
      el.querySelector('.ent-rf-strong').hidden = !strong;
      el.querySelector('.ent-rf').hidden = !f.length || strong;
      // show the banner even while the box is closed
      var head = el.querySelector('.cc-box[data-cc="ent-redflags"]');
      if (head) head.classList.toggle('ent-alert', !!f.length);
    },
    extraRender: function (v) {
      var f = v.flags || []; if (!f.length) return '';
      var strong = f.some(function (x) { return RF_STRONG.indexOf(x) >= 0; });
      return '<p style="color:#b91c1c"><b>' + (strong ? RF_STRONG_TXT : RF_TXT) + '</b></p>';
    }
  }));

  /* =====================================================================
     9) PROCEDURES & SURGICAL HISTORY — fixed checklist, each with date / side / notes
     ===================================================================== */
  var PROC = [['wax', 'إزالة شمع / شفط (Wax removal / microsuction)'], ['fbE', 'إزالة جسم غريب — أذن (FB ear)'], ['fbN', 'إزالة جسم غريب — أنف (FB nose)'], ['cautery', 'كي الأنف (Nasal cautery)'],
    ['pack', 'دك الأنف (Nasal packing)'], ['endo', 'منظار أنف (Nasal endoscopy)'], ['tympano', 'بزل الطبلة (Tympanocentesis)'], ['myring', 'شق الطبلة (Myringotomy)'], ['dress', 'غيار أذن (Ear dressing)'], ['other', 'أخرى (Other)']];
  var SURG = [['tons', 'استئصال اللوزتين (Tonsillectomy)'], ['aden', 'استئصال اللحمية (Adenoidectomy)'], ['septo', 'تعديل الحاجز (Septoplasty)'], ['turb', 'تصغير القرنيات (Turbinate reduction)'],
    ['fess', 'منظار جيوب (FESS)'], ['tymp', 'ترقيع الطبلة (Tympanoplasty)'], ['mast', 'استئصال الماستويد (Mastoidectomy)'], ['grom', 'أنابيب تهوية (Grommets)'], ['thyr', 'استئصال الغدة الدرقية (Thyroidectomy)'], ['other', 'أخرى (Other)']];
  function logFields(prefix, list) {
    var f = [];
    list.forEach(function (p) {
      f.push([prefix + '.' + p[0] + '.date', p[1] + ' — التاريخ', 'd']);
      f.push([prefix + '.' + p[0] + '.side', p[1] + ' — الجهة', 's', SIDE]);
      f.push([prefix + '.' + p[0] + '.notes', p[1] + ' — ملاحظات', 't']);
    });
    return f;
  }
  function logPre(prefix, list) {
    return function (v) {
      return '<div class="table-wrap"><table class="ent-log"><thead><tr><th>الإجراء</th><th>التاريخ</th><th>الجهة</th><th>ملاحظات</th></tr></thead><tbody>' + list.map(function (p) {
        var k = prefix + '.' + p[0];
        return '<tr><th>' + esc(p[1]) + '</th><td><input class="ef" type="date" data-k="' + k + '.date" value="' + esc(gv(v, k + '.date') || '') + '"/></td>' +
          '<td><select class="ef" data-k="' + k + '.side">' + opts(SIDE, gv(v, k + '.side')) + '</select></td>' +
          '<td><input class="ef" type="text" data-k="' + k + '.notes" value="' + esc(gv(v, k + '.notes') || '') + '"/></td></tr>';
      }).join('') + '</tbody></table></div>';
    };
  }
  function logList(v, prefix, list) { var o = v[prefix] || {}; return list.filter(function (p) { return o[p[0]]; }).map(function (p) { return p[1].split(' (')[0]; }); }
  // The fields are drawn by logPre as a table; f is kept for collect labels but hidden in the grid.
  function hideAll(fs) { return fs.map(function (f) { return [f[0], f[1], f[2], f[3], { hidden: 1, nr: 1 }]; }); }
  function logRender(v, prefix, list, title) {
    var o = v[prefix] || {}, rows = list.filter(function (p) { return o[p[0]]; }).map(function (p) { var x = o[p[0]]; return [p[1], x.date || '-', x.side || '-', x.notes || '']; });
    return rows.length ? '<p><b>' + title + '</b></p>' + SP.tableHtml(['', 'التاريخ', 'الجهة', 'ملاحظات'], rows) : '';
  }
  SP.addSection('ent', entSection({
    id: 'entProc', title: '🛠️ الإجراءات والعمليات السابقة', box: 'ent-proc',
    groups: [
      { id: 'proc', t: 'إجراءات بالعيادة (Clinic procedures)', f: hideAll(logFields('proc', PROC)), pre: logPre('proc', PROC), sum: function (v) { return logList(v, 'proc', PROC).join('، '); } },
      { id: 'surg', t: 'العمليات السابقة (Surgical history)', f: hideAll(logFields('surg', SURG)), pre: logPre('surg', SURG), sum: function (v) { return logList(v, 'surg', SURG).join('، '); } }
    ],
    summary: function (v) { return logList(v, 'proc', PROC).concat(logList(v, 'surg', SURG)).join('، '); },
    extraRender: function (v) { return logRender(v, 'proc', PROC, 'إجراءات بالعيادة') + logRender(v, 'surg', SURG, 'العمليات السابقة'); }
  }));

  /* =====================================================================
     10) FOLLOW-UP + PATIENT INSTRUCTION SHEETS (Arabic, printable)
     ===================================================================== */
  var SHEETS = [
    ['drops', 'طريقة استخدام قطرة الأذن', ['دفّئ القطرة في يدك دقيقة قبل الاستخدام.', 'استلقِ على الجنب والأذن المصابة لأعلى.', 'اسحب صيوان الأذن للخلف وللأعلى (للأطفال: للخلف وللأسفل) وضع العدد المحدد من النقط.', 'ابقَ على نفس الوضع 3–5 دقائق، واضغط برفق على الغضروف أمام الأذن.', 'لا تلمس الأذن بطرف الزجاجة.']],
    ['spray', 'طريقة استخدام بخاخ الأنف', ['نظّف الأنف برفق قبل الاستخدام ورجّ البخاخ.', 'أمل رأسك قليلاً للأمام.', 'ضع البخاخ في فتحة الأنف ووجّهه نحو الأذن من نفس الجهة (بعيداً عن الحاجز الأنفي).', 'اضغط مع شهيق خفيف، ولا تشهق بقوة.', 'استمر بانتظام؛ مفعول بخاخ الكورتيزون يظهر خلال أيام.']],
    ['saline', 'غسول الأنف بالمحلول الملحي', ['اغسل يديك واستخدم ماء مغلي ومبرد أو محلول جاهز.', 'انحنِ فوق الحوض وأمل رأسك جانباً.', 'أدخل المحلول من فتحة الأنف العليا ودعه يخرج من الأخرى مع التنفس من الفم.', 'كرر في الجهة الأخرى ثم انفخ الأنف برفق.', 'نظّف الزجاجة وجففها بعد كل استخدام.']],
    ['water', 'احتياطات دخول الماء للأذن', ['امنع دخول الماء للأذن أثناء الاستحمام: قطنة مدهونة بالفازلين أو سدادة.', 'تجنب السباحة حتى يسمح الطبيب.', 'لا تستخدم أعواد القطن داخل الأذن.', 'جفف الأذن الخارجية بمنشفة فقط.']],
    ['tonsil', 'العناية بعد استئصال اللوزتين', ['أكثر من شرب السوائل الباردة والأطعمة اللينة.', 'تجنب الأطعمة الساخنة والحارة والصلبة لمدة أسبوعين.', 'خذ المسكن بانتظام كما وصف الطبيب.', 'الغشاء الأبيض مكان اللوزتين طبيعي.', 'عند حدوث نزيف من الفم توجه فوراً للطوارئ.']],
    ['nosebleed', 'الإسعافات الأولية للرعاف', ['اجلس وأمل رأسك للأمام (وليس للخلف).', 'اضغط على الجزء اللين من الأنف 10–15 دقيقة دون انقطاع.', 'تنفس من الفم وابصق الدم ولا تبتلعه.', 'كمادة باردة على الأنف قد تساعد.', 'إذا استمر النزيف أكثر من 20 دقيقة أو كان غزيراً توجه للطوارئ.']],
    ['voice', 'راحة الصوت والعناية به', ['قلل الكلام وتجنب الصراخ والهمس.', 'اشرب الماء بكثرة (8 أكواب يومياً).', 'امتنع عن التدخين وقلل الكافيين.', 'تجنب تنظيف الحلق بقوة؛ اشرب رشفة ماء بدلاً منه.', 'لا تأكل قبل النوم بساعتين إذا كان لديك ارتجاع.']]
  ];
  function sheetsHtml(keys) {
    return SHEETS.filter(function (s) { return keys.indexOf(s[0]) >= 0; }).map(function (s) {
      return '<div class="notes ent-sheet"><b>📝 ' + esc(s[1]) + '</b><ul style="margin:4px 0 0;padding-inline-start:18px">' + s[2].map(function (x) { return '<li>' + esc(x) + '</li>'; }).join('') + '</ul></div>';
    }).join('');
  }
  function printSheets(keys) {
    var w = window.open('', '_blank');
    if (!w) { alert('اسمح بالنوافذ المنبثقة للطباعة'); return; }
    var p = CC && CC.getPatient();
    w.document.write('<!doctype html><html lang="ar" dir="rtl"><head><meta charset="utf-8"><title>تعليمات المريض</title><style>body{font-family:Tahoma,Arial,sans-serif;padding:24px;line-height:1.8}.ent-sheet{border:1px solid #ccc;border-radius:10px;padding:12px 16px;margin-bottom:14px;page-break-inside:avoid}h2{margin:0 0 12px}</style></head><body>' +
      '<h2>تعليمات للمريض' + (p && p.fullName ? ' — ' + esc(p.fullName) : '') + '</h2>' + sheetsHtml(keys) + '<script>window.onload=function(){window.print()}<\/script></body></html>');
    w.document.close();
  }
  SP.addSection('ent', entSection({
    id: 'entFollow', title: '📅 المتابعة وتعليمات المريض', box: 'ent-follow',
    groups: [
      { id: 'next', t: 'الزيارة القادمة (Next visit)', f: [['nextDate', '📅 موعد الزيارة القادمة', 'd', '', { nr: 1 }], ['nextReason', 'سبب المتابعة', 't', 'متابعة بعد العلاج', { nr: 1 }]],
        sum: function (v) { return v.nextDate ? v.nextDate + (v.nextReason ? ' — ' + v.nextReason : '') : ''; } },
      { id: 'instr', t: 'تعليمات المريض (تُطبع مع الروشتة)', f: [['sheets', 'اختر التعليمات', 'c', SHEETS.map(function (s) { return s[1]; }), { nr: 1 }]],
        post: function () { return '<button type="button" class="btn ghost small ent-print">🖨️ طباعة التعليمات المختارة</button>'; },
        sum: function (v) { return (v.sheets || []).length ? v.sheets.length + ' تعليمات' : ''; } }
    ],
    summary: function (v) { return [v.nextDate ? 'المتابعة ' + v.nextDate : '', (v.sheets || []).length ? v.sheets.length + ' تعليمات' : ''].filter(Boolean).join(' · '); },
    wire: function (el) {
      el.addEventListener('click', function (e) {
        if (!e.target.classList.contains('ent-print')) return;
        var v = collectFields(el) || {}, keys = SHEETS.filter(function (s) { return (v.sheets || []).indexOf(s[1]) >= 0; }).map(function (s) { return s[0]; });
        if (!keys.length) { alert('اختر تعليمات أولاً'); return; }
        printSheets(keys);
      });
    },
    extraRender: function (v) {
      var keys = SHEETS.filter(function (s) { return (v.sheets || []).indexOf(s[1]) >= 0; }).map(function (s) { return s[0]; });
      return (v.nextDate ? '<p><b>📅 موعد المتابعة:</b> ' + esc(v.nextDate) + (v.nextReason ? ' — ' + esc(v.nextReason) : '') + '</p>' : '') + sheetsHtml(keys);
    }
  }));

  /* =====================================================================
     11) LOW PRIORITY — facial nerve, neck mass, pediatric ENT
     House-Brackmann: I normal · II mild · III moderate · IV moderately severe · V severe · VI total paralysis.
     ===================================================================== */
  SP.addSection('ent', entSection({
    id: 'entExtra', title: '➕ فحوصات إضافية (العصب الوجهي / كتلة الرقبة / الأطفال)', box: 'ent-extra',
    groups: [
      { id: 'hb', t: 'العصب الوجهي (House-Brackmann)', f: [
          ['hb.side', 'الجهة', 's', SIDE],
          ['hb.grade', 'الدرجة', 's', ['', 'I طبيعي', 'II بسيط', 'III متوسط', 'IV متوسط إلى شديد', 'V شديد', 'VI شلل كامل']]],
        sum: function (v) { var h = v.hb || {}; return h.grade ? 'HB ' + h.grade.split(' ')[0] + (h.side ? ' ' + h.side : '') : ''; } },
      { id: 'mass', t: 'كتلة الرقبة (Neck mass)', f: [
          ['mass.level', 'المستوى (Level)', 's', ['', 'I', 'II', 'III', 'IV', 'V', 'VI']], ['mass.side', 'الجهة', 's', SIDE],
          ['mass.size', 'الحجم (سم)', 't', '2 × 3'], ['mass.cons', 'القوام', 's', ['', 'لين (Soft)', 'مطاطي (Rubbery)', 'صلب (Hard)', 'كيسي (Cystic)']],
          ['mass.mob', 'الحركة', 's', ['', 'متحركة (Mobile)', 'ثابتة (Fixed)']], ['mass.tender', 'مؤلمة (Tender)', 's', YN]],
        sum: function (v) { var m = v.mass || {}; return m.level ? 'Level ' + m.level + (m.size ? ' · ' + m.size + ' سم' : '') + (m.mob ? ' · ' + m.mob.split(' (')[0] : '') : ''; } },
      { id: 'kid', t: 'أنف وأذن الأطفال (Pediatric ENT)', f: [
          ['kid.nhs', 'مسح السمع لحديثي الولادة', 's', ['', 'ناجح (Pass)', 'تحويل يمين (Refer R)', 'تحويل يسار (Refer L)', 'تحويل الجهتين (Refer both)', 'لم يُجرَ']],
          ['kid.speech', 'تأخر الكلام', 's', YN], ['kid.aom', 'عدد نوبات التهاب الأذن الوسطى (آخر 12 شهر)', 'n'],
          ['kid.grommet', 'حالة أنابيب التهوية', 's', ['', 'لا يوجد', 'في مكانها', 'خرجت', 'مسدودة']]],
        sum: function (v) { var k = v.kid || {}; return [k.nhs ? 'NHS ' + k.nhs.split(' (')[0] : '', k.aom ? k.aom + ' AOM' : ''].filter(Boolean).join(' · '); } }
    ],
    summary: function (v) {
      var h = v.hb || {}, m = v.mass || {}, k = v.kid || {};
      return [h.grade ? 'HB ' + h.grade.split(' ')[0] : '', m.level ? 'Neck mass L' + m.level : '', k.nhs || k.aom ? 'Pediatric' : ''].filter(Boolean).join(' · ');
    }
  }));

  /* ---------- section order on the doctor page ---------- */
  if (SP.orderSections) SP.orderSections('ent', ['entSymptoms', 'entRedflags', 'entExam', 'entSides', 'entAudio', 'entVertigo', 'entNose', 'entTonsil', 'entVoice', 'entSleep', 'entProc', 'entExtra', 'entFollow', 'entFiles']);

  /* ---------- follow-up feed: ENT next visit -> shared ClinicCare list (kind "ent") ---------- */
  function entFollowups(exam) {
    var f = exam && exam.sections && exam.sections.entFollow;
    return f && f.nextDate ? [{ key: 'entNext', kind: 'ent', date: f.nextDate, reason: f.nextReason || 'متابعة أنف وأذن وحنجرة' }] : [];
  }
  window.ClinicENT = { section: entSection, fieldHtml: fieldHtml, collectFields: collectFields, entFollowups: entFollowups, earCalc: earCalc, degree: degree, forkHint: forkHint, paradise: paradise, rsClass: rsClass, sbRisk: sbRisk };
})();
} catch (e) { console.error('[specialties-bundle] ent-plus.js failed:', e); }
/* ==== END ent-plus.js ==== */

/* ==== BEGIN derm-plus.js ==== */
try {
// ============ DERM PLUS (v56) — وحدة الجلدية المتكاملة ============
// Additive module loaded AFTER dermatology.js and ent-plus.js. Old dermatology data keeps working:
// base fields (complaint, duration, itching, spread, skinType, fitzpatrick, exam), `lesions`,
// `severity` and `files` keep their keys. New sections save inside exam.sections (new keys only):
//
//  dermHx      structured history (onset, progression, symptoms, recurrence, triggers, previous treatment, exposure)
//  dermExam    lesion details, scalp/hair, nails, mucosa, acne, special signs
//  dermDx      primary / additional / differential diagnoses with optional ICD-10 (searchable catalog, doctor confirms)
//  dermInv     investigations: requested → result + dates
//  dermTx      treatment plan (topical / systemic meds, skincare, education, goals) → copied into the prescription ONLY on click
//  dermProc    procedures log (dermoscopy, biopsy + pathology, cryo, cautery, peels, laser...) — list is configurable per doctor
//  files       clinical photos (same key as before; each photo now has date / site / stage / description) + timeline + compare
//  dermFollow  follow-up date (feeds the shared follow-up list), response, adherence, side effects
//
// Patient allergies / chronic diseases / current medicines are NOT repeated here: they live in the
// shared patient background (ClinicCare) and are shown at the top of the visit.

(function () {
  var SP = window.ClinicSpecialty, ENT = window.ClinicENT, CC = window.ClinicCare;
  if (!SP || !ENT || !ENT.section) return;
  var esc = SP.escape;
  var YN = ['', 'لا', 'نعم'];

  function today() { return CC ? CC.today() : new Date().toISOString().slice(0, 10); }
  function prevVisits() { var p = CC && CC.getPatient(); return p ? CC.visitsFor(p) : []; }
  function opts(list, val) {
    return list.map(function (o) {
      return '<option value="' + esc(o) + '"' + (String(o) === String(val == null ? '' : val) ? ' selected' : '') + '>' + (o === '' ? '—' : esc(o)) + '</option>';
    }).join('');
  }
  function bx(id, title, sum, body) { return CC ? CC.box(id, title, sum, body, 'ent-box') : '<div class="ent-box"><h4>' + title + '</h4>' + body + '</div>'; }
  function setSum(el, id, t) { if (CC) CC.setSummary(el.querySelector('.cc-box[data-cc="' + id + '"]'), t); }
  function list(v, k) { return (v && v[k]) || []; }

  // Conditional fields: any element with data-show="key=value1|value2" inside a section is
  // shown only when the .ef[data-k=key] (select / text) or checkbox group contains a value.
  function applyShow(el) {
    el.querySelectorAll('[data-show]').forEach(function (n) {
      var p = n.getAttribute('data-show').split('='), k = p[0], vals = p[1].split('|');
      var src = el.querySelector('.ef[data-k="' + k + '"]'), on = false;
      if (src) on = vals.indexOf(src.value) >= 0 || (vals[0] === '*' && !!src.value);
      else {
        var g = el.querySelector('.ef-c[data-k="' + k + '"]');
        if (g) g.querySelectorAll('input:checked').forEach(function (i) { if (vals.indexOf(i.value) >= 0 || vals[0] === '*') on = true; });
      }
      n.style.display = on ? '' : 'none';
    });
  }
  // fields flagged {show:'k=v'} get wrapped
  function F(k, l, t, o, flags) { return [k, l, t, o, flags]; }

  // ENT.section + conditional fields: fields with flags {show:'key=v1|v2'} are shown only when matching
  function fsec(cfg) {
    var map = {};
    cfg.groups.forEach(function (g) { g.f.forEach(function (f) { if (f[4] && f[4].show) map[f[0]] = f[4].show; }); });
    var sec = ENT.section(cfg), w = sec.wire;
    sec.wire = function (el) {
      Object.keys(map).forEach(function (k) {
        var n = el.querySelector('.ef[data-k="' + k + '"], .ef-c[data-k="' + k + '"]');
        if (n) n.closest('.field').setAttribute('data-show', map[k]);
      });
      w.apply(this, arguments);
      applyShow(el);
      el.addEventListener('change', function () { applyShow(el); });
    };
    return sec;
  }

  /* ===================== 1) HISTORY ===================== */
  var SYM = ['ألم (Pain)', 'حرقان (Burning)', 'تقشر (Scaling)', 'نزيف (Bleeding)', 'إفرازات (Discharge)', 'تنميل / وخز', 'لا توجد أعراض'];
  var TRIG = ['الشمس', 'الحرارة / العرق', 'البرد / الجفاف', 'التوتر النفسي', 'أطعمة', 'أدوية', 'مستحضرات تجميل / منظفات', 'الدورة الشهرية / الحمل', 'العدوى', 'الاحتكاك / الملابس', 'حيوانات أليفة'];
  var FAM = ['صدفية', 'إكزيما / حساسية (Atopy)', 'حب الشباب', 'بهاق', 'ثعلبة / تساقط وراثي', 'سرطان جلد / شامات', 'لا يوجد'];
  var EXPO = ['مهني (Occupational)', 'تعرض شمس طويل', 'سفر حديث', 'مخالطة مريض بأعراض مشابهة', 'مواد كيميائية / مهيجات', 'حيوانات', 'مسابح / صالات رياضية', 'منتج جديد على الجلد'];
  SP.addSection('dermatology', fsec({
    id: 'dermHx', title: '📝 التاريخ المرضي الجلدي', box: 'derm-hx',
    groups: [
      { id: 'course', t: 'البداية والمسار (Onset & Course)', f: [
          F('onset', 'طريقة البداية (Onset)', 's', ['', 'مفاجئة (Acute)', 'تدريجية (Gradual)']),
          F('onsetDate', 'تاريخ البداية التقريبي', 'd'),
          F('progression', 'المسار (Progression)', 's', ['', 'يتحسن (Improving)', 'مستقر (Stable)', 'يزداد سوءاً (Worsening)', 'متذبذب (Fluctuating)']),
          F('pattern', 'النمط', 's', ['', 'مستمر (Continuous)', 'نوبات متكررة (Episodic)', 'موسمي (Seasonal)']),
          F('symptoms', 'أعراض أخرى (الحكة مسجّلة بالأعلى)', 'c', SYM)],
        sum: function (v) { return [v.progression ? v.progression.split(' ')[0] : '', (v.symptoms || []).length ? v.symptoms.length + ' أعراض' : ''].filter(Boolean).join(' · '); } },
      { id: 'rec', t: 'النوبات السابقة والمحفزات', f: [
          F('previous', 'نوبات سابقة؟', 's', YN),
          F('episodes', 'عدد النوبات / آخر نوبة', 't', 'مثال: 3 مرات — آخرها منذ 6 شهور'),
          F('triggers', 'المحفزات المعروفة (Triggers)', 'c', TRIG),
          F('aggravating', 'عوامل تزيد الحالة', 't', ''),
          F('relieving', 'عوامل تحسّن الحالة', 't', '')],
        sum: function (v) { return (v.triggers || []).join('، '); } },
      { id: 'prevtx', t: 'العلاجات السابقة (Previous treatment)', f: [
          F('prevTx', 'العلاجات الجلدية السابقة', 'a'),
          F('prevTxEffect', 'مدى الاستجابة', 's', ['', 'استجابة ممتازة', 'استجابة جزئية', 'لا استجابة', 'تحسن ثم انتكاس', 'أعراض جانبية']),
          F('drugHx', 'أدوية قد تسبب أعراضاً جلدية (Drug history)', 't', 'بدأت حديثاً / مشتبه بها'),
          F('family', 'تاريخ عائلي لأمراض جلدية', 'c', FAM)],
        sum: function (v) { return v.prevTxEffect || ''; } },
      { id: 'expo', t: 'التعرضات (Exposure history)', f: [
          F('exposed', 'هل يوجد تعرض ذو صلة؟', 's', YN),
          F('exposure', 'نوع التعرض', 'c', EXPO, { show: 'exposed=نعم' }),
          F('exposureNote', 'تفاصيل (المهنة / المكان / المادة)', 't', '', { show: 'exposed=نعم' })],
        sum: function (v) { return v.exposed === 'نعم' ? (v.exposure || []).join('، ') || 'نعم' : ''; } }
    ],
    bannerHtml: '<p class="muted">الحساسية والأمراض المزمنة والأدوية الحالية تُسجَّل مرة واحدة في «الخلفية الطبية» للمريض أعلى الزيارة.</p>',
    summary: function (v) { return [v.onset ? v.onset.split(' ')[0] : '', v.progression ? v.progression.split(' ')[0] : '', v.previous === 'نعم' ? 'متكرر' : ''].filter(Boolean).join(' · '); }
  }));

  /* ===================== 2) EXAMINATION ===================== */
  SP.addSection('dermatology', fsec({
    id: 'dermExam', title: '🔍 الفحص الجلدي المفصّل', box: 'derm-exam',
    groups: [
      { id: 'les', t: 'وصف الآفات (Morphology)', f: [
          F('border', 'الحواف (Borders)', 's', ['', 'محددة جيداً (Well-defined)', 'غير محددة (Ill-defined)', 'غير منتظمة (Irregular)', 'مرتفعة (Raised)']),
          F('surface', 'السطح', 's', ['', 'أملس', 'متقشر (Scaly)', 'متقشر فضي (Silvery)', 'متقرن (Hyperkeratotic)', 'نازّ (Weeping)', 'متقشّر بقشرة (Crusted)', 'ثؤلولي (Verrucous)']),
          F('config', 'الشكل / الترتيب (Configuration)', 's', ['', 'منفرد', 'متعدد متفرق', 'حلقي (Annular)', 'قرصي (Nummular)', 'خطي (Linear)', 'شبكي (Reticular)', 'هدفي (Target)', 'متجمع (Herpetiform)']),
          F('signs', 'علامات خاصة', 'c', ['ظاهرة كوبنر (Koebner)', 'نيكولسكي إيجابي (Nikolsky)', 'أوسبيتز (Auspitz)', 'كتابة جلدية (Dermographism)', 'علامة داريير (Darier)', 'ضوء وود إيجابي (Wood\'s lamp)'])],
        sum: function (v) { return [v.border ? v.border.split(' (')[0] : '', v.config ? v.config.split(' (')[0] : ''].filter(Boolean).join(' · '); } },
      { id: 'hair', t: 'فروة الرأس والشعر (Scalp & Hair)', f: [
          F('hairLoss', 'نمط تساقط الشعر', 's', ['', 'لا يوجد', 'بقعي (Patchy)', 'منتشر (Diffuse)', 'ذكوري / أنثوي (Androgenetic)', 'ندبي (Scarring)', 'شد / نتف (Traction / Trichotillomania)']),
          F('ludwig', 'الدرجة (Hamilton / Ludwig)', 't', 'مثال: Hamilton III', { show: 'hairLoss=ذكوري / أنثوي (Androgenetic)' }),
          F('pull', 'اختبار الشد (Pull test)', 's', ['', 'سلبي', 'إيجابي'], { show: 'hairLoss=*' }),
          F('scalp', 'فروة الرأس', 'c', ['تقشر (Scaling)', 'احمرار / التهاب', 'بثور', 'قشور صفراء دهنية', 'شعر مكسور / نقاط سوداء', 'شعر علامة التعجب (Exclamation)'])],
        sum: function (v) { return v.hairLoss && v.hairLoss !== 'لا يوجد' ? v.hairLoss.split(' (')[0] : ''; } },
      { id: 'nails', t: 'الأظافر (Nails)', f: [
          F('nailsSite', 'الأظافر المصابة', 's', ['', 'لا يوجد', 'أظافر اليد', 'أظافر القدم', 'اليد والقدم']),
          F('nailFind', 'الموجودات', 'c', ['تنقر (Pitting)', 'تغير اللون', 'تثخن (Thickening)', 'انفصال (Onycholysis)', 'بقعة الزيت (Oil drop)', 'خطوط بو (Beau\'s lines)', 'تقعر (Koilonychia)', 'التهاب الجلد حول الظفر (Paronychia)', 'خط صبغي طولي (Melanonychia)'], { show: 'nailsSite=أظافر اليد|أظافر القدم|اليد والقدم' }),
          F('nailCount', 'عدد الأظافر المصابة', 'n', '', { show: 'nailsSite=أظافر اليد|أظافر القدم|اليد والقدم' })],
        sum: function (v) { return (v.nailFind || []).map(function (x) { return x.split(' (')[0]; }).join('، '); } },
      { id: 'muc', t: 'الأغشية المخاطية (Mucosa)', f: [
          F('mucosa', 'إصابة مخاطية؟', 's', YN),
          F('mucSite', 'الموضع', 'c', ['الفم', 'العين (الملتحمة)', 'الأعضاء التناسلية', 'الأنف'], { show: 'mucosa=نعم' }),
          F('mucFind', 'الموجودات', 'c', ['تقرحات (Erosions)', 'خطوط بيضاء شبكية (Wickham)', 'بقع بيضاء', 'فقاعات'], { show: 'mucosa=نعم' })],
        sum: function (v) { return v.mucosa === 'نعم' ? (v.mucSite || []).join('، ') || 'نعم' : ''; } },
      { id: 'acne', t: 'حب الشباب (Acne)', f: [
          F('acneSites', 'التوزيع', 'c', ['الجبهة', 'الخدود', 'الذقن / خط الفك', 'الأنف', 'الصدر', 'الظهر', 'الكتفين']),
          F('acneTypes', 'أنواع الآفات', 'c', ['رؤوس مفتوحة (Open comedones)', 'رؤوس مغلقة (Closed comedones)', 'حطاطات (Papules)', 'بثور (Pustules)', 'عقيدات (Nodules)', 'أكياس (Cysts)']),
          F('acneScar', 'الندبات', 'c', ['ندبات منخفضة (Atrophic / Ice-pick)', 'ندبات متضخمة / جدرة (Hypertrophic / Keloid)', 'تصبغ بعد الالتهاب (PIH)', 'احمرار بعد الالتهاب (PIE)']),
          F('acneHormonal', 'علامات هرمونية (عدم انتظام دورة / شعر زائد)', 's', YN)],
        sum: function (v) { return [(v.acneTypes || []).length ? v.acneTypes.length + ' أنواع' : '', (v.acneScar || []).length ? 'ندبات' : ''].filter(Boolean).join(' · '); } },
      { id: 'notes', t: 'ملاحظات الفحص (Free text)', f: [F('notes', 'ملاحظات إضافية', 'a')], sum: function (v) { return v.notes ? '✓' : ''; } }
    ],
    summary: function (v) { return [v.hairLoss && v.hairLoss !== 'لا يوجد' ? 'شعر' : '', (v.nailFind || []).length ? 'أظافر' : '', v.mucosa === 'نعم' ? 'أغشية مخاطية' : '', (v.acneTypes || []).length ? 'حب الشباب' : ''].filter(Boolean).join(' · '); }
  }));

  /* ===================== shared repeatable-rows helper ===================== */
  // cols: [key, label, type('t'|'s'|'d'|'n'|'a'), opts, {cls, show:'colKey=val|val'}]
  function rowHtml(cols, r, cls) {
    r = r || {};
    return '<div class="dr-row ' + cls + '">' + cols.map(function (c) {
      var x = r[c[0]] == null ? '' : r[c[0]], inp;
      if (c[2] === 's') inp = '<select class="dr-f" data-k="' + c[0] + '">' + opts(c[3].indexOf(x) >= 0 || x === '' ? c[3] : c[3].concat([x]), x) + '</select>';
      else if (c[2] === 'a') inp = '<textarea class="dr-f" data-k="' + c[0] + '" rows="2">' + esc(x) + '</textarea>';
      else inp = '<input class="dr-f" data-k="' + c[0] + '" type="' + (c[2] === 'd' ? 'date' : c[2] === 'n' ? 'number' : 'text') + '" value="' + esc(x) + '"' + (c[3] && c[2] !== 's' ? ' placeholder="' + esc(c[3]) + '"' : '') + ' />';
      var fl = c[4] || {};
      return '<div class="field' + (fl.wide ? ' dr-wide' : '') + '"' + (fl.show ? ' data-rshow="' + esc(fl.show) + '"' : '') + '><label>' + esc(c[1]) + '</label>' + inp + '</div>';
    }).join('') + '<button type="button" class="btn small danger dr-del" title="حذف">🗑</button></div>';
  }
  function rowsApplyShow(box) {
    box.querySelectorAll('.dr-row').forEach(function (row) {
      row.querySelectorAll('[data-rshow]').forEach(function (n) {
        var p = n.getAttribute('data-rshow').split('='), src = row.querySelector('.dr-f[data-k="' + p[0] + '"]');
        var vals = p[1].split('|'), val = src ? src.value : '';
        n.style.display = vals.some(function (v) { return val && (v === '*' || val.indexOf(v) >= 0); }) ? '' : 'none';
      });
    });
  }
  function collectRows(box, required) {
    var out = [];
    box.querySelectorAll('.dr-row').forEach(function (row) {
      var o = {}, any = false;
      row.querySelectorAll('.dr-f').forEach(function (i) { var x = (i.value || '').trim(); if (x !== '') { o[i.dataset.k] = x; any = true; } });
      if (any && (!required || o[required])) out.push(o);
    });
    return out;
  }
  function wireRows(el, box, cols, cls, onChange) {
    el.addEventListener('click', function (e) {
      var add = e.target.closest('[data-add="' + cls + '"]');
      if (add) { box.insertAdjacentHTML('beforeend', rowHtml(cols, null, cls)); rowsApplyShow(box); onChange(); return; }
      if (e.target.classList.contains('dr-del') && box.contains(e.target)) { e.target.closest('.dr-row').remove(); onChange(); }
    });
    rowsApplyShow(box);
  }
  function rowsTable(cols, rows) {
    var used = cols.filter(function (c) { return rows.some(function (r) { return r[c[0]]; }); });
    if (!used.length) return '';
    return SP.tableHtml(used.map(function (c) { return c[1]; }), rows.map(function (r) { return used.map(function (c) { return r[c[0]] || ''; }); }));
  }

  /* ===================== 3) DIAGNOSIS ===================== */
  // WHO ICD-10 codes for common dermatology diagnoses. Codes are suggestions only:
  // the doctor chooses / edits, and free text is always allowed. No automatic diagnosis.
  var DX = [
    ['L40.0', 'Psoriasis vulgaris — صدفية لويحية'], ['L40.4', 'Guttate psoriasis — صدفية نقطية'], ['L40.5', 'Psoriatic arthropathy — التهاب مفاصل صدفي'],
    ['L20.9', 'Atopic dermatitis — إكزيما تأتبية'], ['L21.9', 'Seborrhoeic dermatitis — التهاب جلد دهني'], ['L23.9', 'Allergic contact dermatitis — التهاب جلد تماسي تحسسي'],
    ['L24.9', 'Irritant contact dermatitis — التهاب جلد تماسي تهيجي'], ['L30.0', 'Nummular dermatitis — إكزيما قرصية'], ['L30.1', 'Dyshidrosis (Pompholyx) — إكزيما عرقية'],
    ['L30.9', 'Dermatitis, unspecified — التهاب جلد غير محدد'], ['L50.9', 'Urticaria — أرتيكاريا (شرى)'], ['L70.0', 'Acne vulgaris — حب الشباب'],
    ['L71.9', 'Rosacea — الوردية'], ['L73.2', 'Hidradenitis suppurativa — التهاب الغدد العرقية القيحي'], ['L80', 'Vitiligo — البهاق'],
    ['L81.1', 'Melasma (Chloasma) — الكلف'], ['L81.0', 'Post-inflammatory hyperpigmentation — تصبغ بعد الالتهاب'], ['L63.9', 'Alopecia areata — الثعلبة'],
    ['L64.9', 'Androgenetic alopecia — الصلع الوراثي'], ['L65.0', 'Telogen effluvium — تساقط الشعر الكربي'], ['L43.9', 'Lichen planus — الحزاز المسطح'],
    ['L42', 'Pityriasis rosea — النخالية الوردية'], ['L28.1', 'Prurigo nodularis — الحكاك العقدي'], ['L29.9', 'Pruritus — حكة'],
    ['L85.3', 'Xerosis cutis — جفاف الجلد'], ['L91.0', 'Keloid / hypertrophic scar — جدرة'], ['L60.0', 'Ingrowing nail — ظفر غائر'],
    ['L68.0', 'Hirsutism — الشعرانية'], ['L57.0', 'Actinic keratosis — تقرن سفعي'], ['L82', 'Seborrhoeic keratosis — تقرن دهني'],
    ['L10.9', 'Pemphigus — الفقاع'], ['L12.0', 'Bullous pemphigoid — الفقاعانية'], ['L01.0', 'Impetigo — القوباء'],
    ['L02.9', 'Cutaneous abscess / furuncle — خراج / دمل'], ['L03.9', 'Cellulitis — التهاب النسيج الخلوي'], ['L73.9', 'Folliculitis — التهاب بصيلات الشعر'],
    ['B35.0', 'Tinea capitis — سعفة الرأس'], ['B35.1', 'Onychomycosis (Tinea unguium) — فطريات الأظافر'], ['B35.3', 'Tinea pedis — سعفة القدم'],
    ['B35.4', 'Tinea corporis — سعفة الجسم'], ['B35.6', 'Tinea cruris — سعفة الفخذ'], ['B36.0', 'Pityriasis versicolor — النخالية المبرقشة'],
    ['B37.2', 'Cutaneous candidiasis — مبيضات جلدية'], ['B86', 'Scabies — الجرب'], ['B07', 'Viral warts — ثآليل'],
    ['B08.1', 'Molluscum contagiosum — المليساء المعدية'], ['B00.9', 'Herpes simplex — هربس بسيط'], ['B02.9', 'Herpes zoster — الحزام الناري'],
    ['B55.1', 'Cutaneous leishmaniasis — الليشمانيا الجلدية'], ['D22.9', 'Melanocytic naevus — شامة'], ['C43.9', 'Malignant melanoma — ميلانوما'],
    ['C44.9', 'Malignant neoplasm of skin (e.g. BCC / SCC) — ورم جلدي خبيث'], ['L93.0', 'Discoid lupus erythematosus — ذئبة قرصية'], ['L53.9', 'Erythema (unspecified) — حمامى']
  ];
  var DX_TEXT = DX.map(function (d) { return d[1] + ' [' + d[0] + ']'; });
  function splitDx(s) { var m = /\[([A-Z]\d{2}(?:\.\d{1,2})?)\]\s*$/.exec(s || ''); return m ? { name: s.replace(m[0], '').trim(), code: m[1] } : { name: (s || '').trim(), code: '' }; }
  var DXCOLS = [['name', 'التشخيص', 't', 'ابحث أو اكتب…', { wide: true }], ['code', 'كود ICD-10 (اختياري)', 't', 'مثال: L40.0']];
  function dxList(v, k) { return (v && v[k]) || []; }
  SP.addSection('dermatology', {
    id: 'dermDx', title: '🩺 التشخيص والتقييم',
    html: function (v) {
      v = v || {};
      var dl = '<datalist id="dermDxList">' + DX_TEXT.map(function (t) { return '<option value="' + esc(t) + '"></option>'; }).join('') + '</datalist>';
      function grp(k, title, addLabel) {
        var rows = dxList(v, k);
        return '<h4 class="derm-h">' + title + '</h4><div class="dr-list" data-list="' + k + '">' + (rows.length ? rows : (k === 'primary' ? [{}] : [])).map(function (r) { return rowHtml(DXCOLS, r, 'dx-' + k); }).join('') + '</div>' +
          (k === 'primary' ? '' : '<button type="button" class="btn ghost small" data-add="dx-' + k + '">+ ' + addLabel + '</button>');
      }
      var body = dl + '<p class="muted">اختر من القائمة أو اكتب التشخيص بحرية. الأكواد اقتراحات للمساعدة ويجب أن يتأكد منها الطبيب — لا يتم وضع أي تشخيص تلقائياً.</p>' +
        grp('primary', 'التشخيص الأساسي (Primary diagnosis)') +
        '<div class="grid-2 ent-grid"><div class="field"><label>درجة التأكد</label><select class="ef" data-k="certainty">' + opts(['', 'مبدئي (Provisional)', 'مؤكد سريرياً (Clinical)', 'مؤكد بالفحوصات (Confirmed)'], v.certainty) + '</select></div></div>' +
        grp('additional', 'تشخيصات إضافية (Additional)', 'تشخيص إضافي') +
        grp('differential', 'التشخيص التفريقي (Differential)', 'تشخيص تفريقي') +
        '<div class="grid-2 ent-grid"><div class="field" style="grid-column:1 / -1;"><label>التقييم السريري والموجودات الداعمة</label><textarea class="ef" data-k="assessment" rows="3">' + esc(v.assessment || '') + '</textarea></div></div>';
      return bx('derm-dx', '🩺 التشخيص والتقييم (Diagnosis)', dxSummary(v), body);
    },
    wire: function (el) {
      el.querySelectorAll('.dr-list input[data-k="name"]').forEach(function (i) { i.setAttribute('list', 'dermDxList'); });
      function refresh() { setSum(el, 'derm-dx', dxSummary(collect(el) || {})); }
      el.addEventListener('click', function (e) {
        var a = e.target.closest('[data-add]');
        if (a) {
          var k = a.getAttribute('data-add').slice(3), box = el.querySelector('[data-list="' + k + '"]');
          box.insertAdjacentHTML('beforeend', rowHtml(DXCOLS, null, 'dx-' + k));
          box.lastElementChild.querySelector('input[data-k="name"]').setAttribute('list', 'dermDxList');
        } else if (e.target.classList.contains('dr-del')) {
          var row = e.target.closest('.dr-row'), lst = row.parentNode;
          if (lst.getAttribute('data-list') === 'primary') row.querySelectorAll('input').forEach(function (i) { i.value = ''; }); else row.remove();
        }
        refresh();
      });
      // choosing a catalog item splits it into name + code
      el.addEventListener('change', function (e) {
        if (e.target.matches('input[data-k="name"]')) {
          var s = splitDx(e.target.value);
          if (s.code) { e.target.value = s.name; var c = e.target.closest('.dr-row').querySelector('input[data-k="code"]'); if (c) c.value = s.code; }
        }
        refresh();
      });
      refresh();
    },
    collect: collect,
    render: function (v) {
      if (!v) return '';
      var h = '', rows = [];
      [['primary', 'التشخيص الأساسي'], ['additional', 'تشخيص إضافي'], ['differential', 'تشخيص تفريقي']].forEach(function (g) {
        dxList(v, g[0]).forEach(function (d) { rows.push([g[1], d.name + (d.code ? ' (' + d.code + ')' : '')]); });
      });
      if (v.certainty) rows.push(['درجة التأكد', v.certainty]);
      if (v.assessment) rows.push(['التقييم السريري', v.assessment]);
      return rows.length ? h + SP.tableHtml(['البند', 'القيمة'], rows) : '';
    }
  });
  function collect(el) {
    var o = {}, any = false;
    ['primary', 'additional', 'differential'].forEach(function (k) {
      var box = el.querySelector('[data-list="' + k + '"]'); if (!box) return;
      var r = collectRows(box, 'name'); if (r.length) { o[k] = r; any = true; }
    });
    el.querySelectorAll('.ef').forEach(function (i) { var x = (i.value || '').trim(); if (x) { o[i.dataset.k] = x; any = true; } });
    return any ? o : null;
  }
  function dxSummary(v) { var p = dxList(v, 'primary')[0]; return p ? p.name + (p.code ? ' · ' + p.code : '') : ''; }

  /* ===================== 4) INVESTIGATIONS ===================== */
  var TESTS = ['', 'كشط جلدي + KOH (Fungal microscopy)', 'مزرعة فطريات (Fungal culture)', 'مزرعة بكتيرية (Bacterial swab/culture)', 'ضوء وود (Wood\'s lamp)', 'منظار جلد (Dermoscopy)',
    'خزعة جلدية (Skin biopsy)', 'اختبار الرقعة (Patch test)', 'اختبار الجرب (Scabies scraping)', 'Tzanck smear', 'صورة دم كاملة (CBC)', 'وظائف كبد وكلى', 'هرمونات (Hormonal profile)',
    'فيتامين د / فيريتين / زنك', 'وظائف الغدة الدرقية', 'ANA / مناعة ذاتية', 'IgE', 'أخرى'];
  var INVCOLS = [['test', 'الفحص', 's', TESTS], ['site', 'الموضع', 't', ''], ['reqDate', 'تاريخ الطلب', 'd'],
    ['status', 'الحالة', 's', ['', 'مطلوب', 'تم — بانتظار النتيجة', 'النتيجة متاحة']],
    ['resDate', 'تاريخ النتيجة', 'd', '', { show: 'status=النتيجة متاحة' }], ['result', 'النتيجة', 't', '', { show: 'status=النتيجة متاحة|تم', wide: true }]];
  SP.addSection('dermatology', {
    id: 'dermInv', title: '🧪 الفحوصات المطلوبة',
    html: function (v) {
      var rows = list(v, 'items');
      return bx('derm-inv', '🧪 الفحوصات المطلوبة ونتائجها (Investigations)', invSum(rows),
        '<div class="dr-list" data-list="inv">' + rows.map(function (r) { return rowHtml(INVCOLS, r, 'inv'); }).join('') + '</div>' +
        '<button type="button" class="btn ghost small" data-add="inv">+ إضافة فحص</button>');
    },
    wire: function (el) {
      var box = el.querySelector('[data-list="inv"]');
      function refresh() { rowsApplyShow(box); setSum(el, 'derm-inv', invSum(collectRows(box, 'test'))); }
      wireRows(el, box, INVCOLS, 'inv', refresh);
      el.addEventListener('change', refresh);
      // today's date by default when a test is chosen
      el.addEventListener('change', function (e) { if (e.target.matches('.dr-f[data-k="test"]')) { var d = e.target.closest('.dr-row').querySelector('[data-k="reqDate"]'); if (d && !d.value) d.value = today(); } });
      refresh();
    },
    collect: function (el) { var r = collectRows(el.querySelector('[data-list="inv"]'), 'test'); return r.length ? { items: r } : null; },
    render: function (v) { var r = list(v, 'items'); return r.length ? rowsTable(INVCOLS, r) : ''; }
  });
  function invSum(rows) { if (!rows.length) return ''; var p = rows.filter(function (r) { return r.status !== 'النتيجة متاحة'; }).length; return rows.length + ' فحوصات' + (p ? ' · ' + p + ' بانتظار النتيجة' : ''); }

  /* ===================== 5) TREATMENT PLAN ===================== */
  var MEDCOLS = [['route', 'النوع', 's', ['', 'موضعي (Topical)', 'بالفم (Oral)', 'حقن (Injection)', 'بيولوجي (Biologic)', 'أخرى']],
    ['name', 'اسم الدواء', 't', 'مثال: Mometasone 0.1% cream'], ['form', 'الشكل', 't', 'كريم / مرهم / أقراص'],
    ['dose', 'الجرعة / التكرار', 't', 'مرة مساءً'], ['duration', 'المدة', 't', 'أسبوعان'], ['site', 'مكان الاستخدام / تعليمات', 't', 'طبقة رقيقة على المكان', { wide: true }]];
  var CARE = ['مرطب يومي (Moisturizer)', 'واقي شمس SPF 50 كل 2–3 ساعات', 'غسول لطيف خالٍ من الصابون', 'تجنب المحفزات المعروفة', 'استحمام فاتر وقصير', 'ملابس قطنية واسعة', 'عدم العبث بالحبوب', 'قص الأظافر', 'غسل الملابس والمفارش بماء ساخن (للمخالطين)'];
  SP.addSection('dermatology', {
    id: 'dermTx', title: '💊 خطة العلاج',
    html: function (v) {
      v = v || {};
      var meds = list(v, 'meds');
      var body = '<p class="muted">خطة العلاج تُحفظ مع الزيارة. لا تُضاف أي أدوية للروشتة إلا بالضغط على الزر وبعد مراجعة الطبيب.</p>' +
        '<h4 class="derm-h">الأدوية (Topical / Systemic)</h4><div class="dr-list" data-list="meds">' + meds.map(function (r) { return rowHtml(MEDCOLS, r, 'med'); }).join('') + '</div>' +
        '<div class="actions"><button type="button" class="btn ghost small" data-add="med">+ إضافة دواء</button>' +
        '<button type="button" class="btn small derm-to-rx" style="display:none">⤵️ نسخ الأدوية والتشخيص إلى الروشتة</button></div>' +
        '<div class="grid-2 ent-grid">' +
        ENT.fieldHtml(['care', 'العناية بالبشرة ونمط الحياة', 'c', CARE], v) +
        ENT.fieldHtml(['lifestyle', 'نصائح إضافية', 't', ''], v) +
        ENT.fieldHtml(['education', 'تثقيف المريض', 'a'], v) +
        ENT.fieldHtml(['warnings', '⚠️ علامات تستدعي الرجوع فوراً', 'a'], v) +
        ENT.fieldHtml(['goals', '🎯 أهداف العلاج', 't', 'مثال: انخفاض PASI 75% خلال 12 أسبوع'], v) + '</div>';
      return bx('derm-tx', '💊 خطة العلاج (Treatment plan)', txSum(v), body);
    },
    wire: function (el) {
      var box = el.querySelector('[data-list="meds"]'), btn = el.querySelector('.derm-to-rx');
      var rxModal = el.closest('.modal, .modal-card, [role="dialog"]');
      var meds = rxModal && rxModal.querySelector('#rxMeds');
      if (meds) btn.style.display = '';
      function refresh() { setSum(el, 'derm-tx', txSum(collectTx(el) || {})); }
      wireRows(el, box, MEDCOLS, 'med', refresh);
      el.addEventListener('change', refresh);
      btn.addEventListener('click', function () {
        var rows = collectRows(box, 'name');
        var root = el.closest('.modal, .modal-card, [role="dialog"]') || document;
        var medsBox = root.querySelector('#rxMeds'), add = root.querySelector('#rxAddMed');
        if (!medsBox || !add) return;
        var exist = Array.prototype.map.call(medsBox.querySelectorAll('.rx-name'), function (i) { return i.value.trim().toLowerCase(); });
        var added = 0;
        rows.forEach(function (r) {
          if (exist.indexOf(r.name.toLowerCase()) >= 0) return;
          var empty = Array.prototype.filter.call(medsBox.querySelectorAll('.rx-med'), function (m) { return !m.querySelector('.rx-name').value.trim(); })[0];
          if (!empty) { add.click(); empty = medsBox.lastElementChild; }
          function put(c, x) { var i = empty.querySelector(c); if (i && x) { i.value = x; i.dispatchEvent(new Event('input', { bubbles: true })); i.dispatchEvent(new Event('change', { bubbles: true })); } }
          put('.rx-name', r.name); put('.rx-form', r.form); put('.rx-freq', r.dose); put('.rx-dur', r.duration); put('.rx-inst', r.site);
          added++;
        });
        var diag = root.querySelector('#rxDiag'), dxSec = root.querySelector('[data-list="primary"]');
        if (diag && !diag.value.trim() && dxSec) { var p = collectRows(dxSec, 'name')[0]; if (p) diag.value = p.name + (p.code ? ' (' + p.code + ')' : ''); }
        var notes = root.querySelector('#rxNotes'), v = collectTx(el) || {};
        var extra = (v.care || []).concat(v.lifestyle ? [v.lifestyle] : []);
        if (notes && extra.length && notes.value.indexOf(extra[0]) < 0) notes.value = (notes.value ? notes.value + '\n' : '') + extra.join(' — ');
        btn.textContent = added ? '✔ تمت إضافة ' + added + ' — راجعها في الروشتة' : '✔ الأدوية موجودة بالفعل في الروشتة';
        setTimeout(function () { btn.textContent = '⤵️ نسخ الأدوية والتشخيص إلى الروشتة'; }, 3000);
      });
      refresh();
    },
    collect: collectTx,
    render: function (v) {
      if (!v) return '';
      var rows = [];
      if ((v.care || []).length) rows.push(['العناية بالبشرة', v.care.join('، ')]);
      [['lifestyle', 'نصائح'], ['education', 'تثقيف المريض'], ['warnings', 'علامات الخطر'], ['goals', 'أهداف العلاج']].forEach(function (k) { if (v[k[0]]) rows.push([k[1], v[k[0]]]); });
      var meds = list(v, 'meds');
      var h = (meds.length ? rowsTable(MEDCOLS, meds) : '') + (rows.length ? SP.tableHtml(['البند', 'القيمة'], rows) : '');
      return h ? h : '';
    }
  });
  function collectTx(el) {
    var o = ENT.collectFields(el) || {}, m = collectRows(el.querySelector('[data-list="meds"]'), 'name');
    if (m.length) o.meds = m;
    return Object.keys(o).length ? o : null;
  }
  function txSum(v) { var n = list(v, 'meds').length; return [n ? n + ' أدوية' : '', (v.care || []).length ? 'عناية بالبشرة' : '', v.goals ? 'أهداف' : ''].filter(Boolean).join(' · '); }

  /* ===================== 6) PROCEDURES (configurable list) ===================== */
  var PROC_ALL = ['منظار جلد (Dermoscopy)', 'خزعة جلدية (Skin biopsy)', 'كي بالتبريد (Cryotherapy)', 'كي كهربائي (Electrocautery)', 'تقشير كيميائي (Chemical peel)',
    'ليزر (Laser)', 'حقن موضعي (Intralesional injection)', 'استئصال جراحي (Excision)', 'شق وتصريف (Incision & drainage)', 'ديرمابن / ميكرونيدلينج (Microneedling)',
    'بلازما (PRP)', 'بوتوكس / فيلر', 'إزالة ثآليل', 'أخرى'];
  var CFG_KEY = 'cm_derm_proc_cfg_v1';
  function procEnabled() { try { var c = JSON.parse(localStorage.getItem(CFG_KEY)); if (Array.isArray(c) && c.length) return c; } catch (e) {} return PROC_ALL.slice(); }
  function procCols(selected) {
    var en = procEnabled();
    var types = [''].concat(PROC_ALL.filter(function (p) { return en.indexOf(p) >= 0 || p === selected; }));
    return [['type', 'الإجراء', 's', types], ['date', 'التاريخ', 'd'], ['site', 'الموضع التشريحي', 't', ''], ['indication', 'سبب الإجراء (Indication)', 't', ''],
      ['finding', 'الموجودات (Dermoscopy findings)', 't', 'شبكة صبغية / نقاط / أوعية…', { show: 'type=Dermoscopy', wide: true }],
      ['technique', 'الطريقة / الإعدادات (Technique / Settings)', 't', 'نوع الليزر، الطاقة، المادة والتركيز، عدد الدورات…', { show: 'type=Cryo|Electro|peel|Laser|injection|Excision|Microneedling|PRP|بوتوكس|ثآليل|biopsy|drainage|أخرى', wide: true }],
      ['consent', 'الموافقة (Consent)', 's', ['', 'موافقة شفهية', 'موافقة كتابية موقعة', 'لم تؤخذ']],
      ['path', 'رقم العينة / المعمل', 't', '', { show: 'type=biopsy|Excision' }], ['pathStatus', 'حالة الباثولوجي', 's', ['', 'أُرسلت', 'النتيجة وصلت', 'تم إبلاغ المريض'], { show: 'type=biopsy|Excision' }],
      ['pathResult', 'نتيجة الباثولوجي + التاريخ', 't', '', { show: 'type=biopsy|Excision', wide: true }],
      ['complications', 'المضاعفات', 't', 'لا يوجد'], ['post', 'تعليمات بعد الإجراء', 't', '', { wide: true }]];
  }
  SP.addSection('dermatology', {
    id: 'dermProc', title: '🛠️ الإجراءات الجلدية',
    html: function (v) {
      var rows = list(v, 'items'), en = procEnabled();
      var cfg = '<details class="derm-cfg"><summary>⚙️ تخصيص قائمة الإجراءات المتاحة في عيادتي</summary><div class="ort-chips">' + PROC_ALL.map(function (p) {
        return '<label class="ort-chip"><input type="checkbox" class="derm-pcfg" value="' + esc(p) + '"' + (en.indexOf(p) >= 0 ? ' checked' : '') + ' /> ' + esc(p) + '</label>';
      }).join('') + '</div><p class="muted">يُحفظ الاختيار على هذا الجهاز ويُطبّق على الإجراءات الجديدة.</p></details>';
      return bx('derm-proc', '🛠️ الإجراءات الجلدية (Procedures)', procSum(rows),
        '<div class="dr-list" data-list="proc">' + rows.map(function (r) { return rowHtml(procCols(r.type), r, 'proc'); }).join('') + '</div>' +
        '<button type="button" class="btn ghost small" data-add="proc">+ إضافة إجراء</button>' + cfg);
    },
    wire: function (el) {
      var box = el.querySelector('[data-list="proc"]');
      function refresh() { rowsApplyShow(box); setSum(el, 'derm-proc', procSum(collectRows(box, 'type'))); }
      el.addEventListener('click', function (e) {
        if (e.target.closest('[data-add="proc"]')) { box.insertAdjacentHTML('beforeend', rowHtml(procCols(), { date: today() }, 'proc')); refresh(); }
        else if (e.target.classList.contains('dr-del') && box.contains(e.target)) { e.target.closest('.dr-row').remove(); refresh(); }
      });
      el.addEventListener('change', function (e) {
        if (e.target.classList.contains('derm-pcfg')) {
          var on = Array.prototype.filter.call(el.querySelectorAll('.derm-pcfg'), function (c) { return c.checked; }).map(function (c) { return c.value; });
          try { localStorage.setItem(CFG_KEY, JSON.stringify(on.length ? on : PROC_ALL)); } catch (x) {}
          return;
        }
        refresh();
      });
      refresh();
    },
    collect: function (el) { var r = collectRows(el.querySelector('[data-list="proc"]'), 'type'); return r.length ? { items: r } : null; },
    render: function (v) { var r = list(v, 'items'); return r.length ? rowsTable(procCols(), r) : ''; }
  });
  function procSum(rows) { return rows.map(function (r) { return (r.type || '').split(' (')[0]; }).join('، '); }

  /* ===================== 7) CLINICAL PHOTOS (same key `files`) ===================== */
  var STAGES = ['', 'قبل العلاج (Before)', 'أثناء العلاج', 'بعد العلاج (After)', 'متابعة'];
  var PSITES = ['', 'فروة الرأس', 'الوجه', 'الرقبة', 'الصدر', 'الظهر', 'البطن', 'الذراع', 'اليد', 'الساق', 'القدم', 'الأظافر', 'الأعضاء التناسلية', 'أخرى'];
  function isImg(f) { return /^image\//.test(f.type || '') || /\.(jpe?g|png|webp|gif|heic)$/i.test(f.name || ''); }
  function photoRow(f, i) {
    return '<div class="derm-ph" data-i="' + i + '">' +
      (isImg(f) ? '<a href="' + esc(f.url) + '" target="_blank" rel="noopener"><img src="' + esc(f.url) + '" alt="" loading="lazy" /></a>' : '<a class="derm-ph-doc" href="' + esc(f.url) + '" target="_blank" rel="noopener">📄 ' + esc(f.name) + '</a>') +
      '<div class="derm-ph-meta">' +
      '<input type="date" data-m="date" value="' + esc(f.date || '') + '" title="تاريخ التصوير" />' +
      '<select data-m="site">' + opts(PSITES.indexOf(f.site || '') >= 0 ? PSITES : PSITES.concat([f.site]), f.site || '') + '</select>' +
      '<select data-m="stage">' + opts(STAGES, f.stage || '') + '</select>' +
      '<input data-m="desc" placeholder="وصف (اختياري)" value="' + esc(f.desc || '') + '" />' +
      '<button type="button" class="btn small danger derm-ph-del">🗑</button></div></div>';
  }
  SP.addSection('dermatology', {
    id: 'files', title: '📷 صور الحالة',
    html: function (v) {
      var files = Array.isArray(v) ? v : [];
      var consent = files.some(function (f) { return f.consent; });
      var saved = ''; try { saved = files.length ? esc(JSON.stringify(files)) : ''; } catch (e) {}
      var body = '<label class="sev-chk derm-consent"><input type="checkbox" class="derm-cons"' + (consent ? ' checked' : '') + ' /> المريض وافق على تصوير الحالة واستخدام الصور للمتابعة الطبية فقط</label>' +
        '<div class="grid-2 ent-grid"><div class="field"><label>الموضع (للصور الجديدة)</label><select class="derm-new-site">' + opts(PSITES, '') + '</select></div>' +
        '<div class="field"><label>المرحلة</label><select class="derm-new-stage">' + opts(STAGES, '') + '</select></div></div>' +
        '<input type="file" class="derm-file" multiple accept="image/*,application/pdf" disabled />' +
        '<p class="muted derm-status"></p><div class="derm-ph-list" data-saved="' + saved + '"></div>' +
        '<div class="derm-timeline"></div>';
      return bx('derm-photos', '📷 صور الحالة قبل / بعد (Clinical photos)', files.length ? files.length + ' صور' : '', body);
    },
    wire: function (el) {
      var listEl = el.querySelector('.derm-ph-list'), input = el.querySelector('.derm-file'), cons = el.querySelector('.derm-cons'), st = el.querySelector('.derm-status');
      el._files = []; try { var s = listEl.getAttribute('data-saved'); if (s) el._files = JSON.parse(s) || []; } catch (e) {}
      function sortF() { el._files.sort(function (a, b) { return (a.date || '').localeCompare(b.date || ''); }); }
      function render() {
        sortF();
        listEl.innerHTML = el._files.map(photoRow).join('');
        input.disabled = !cons.checked;
        setSum(el, 'derm-photos', el._files.length ? el._files.length + ' صور' : '');
      }
      cons.addEventListener('change', render);
      listEl.addEventListener('change', function (e) {
        var m = e.target.getAttribute('data-m'), row = e.target.closest('.derm-ph'); if (!m || !row) return;
        var f = el._files[Number(row.dataset.i)]; if (f) { if (e.target.value) f[m] = e.target.value; else delete f[m]; }
        if (m === 'date') render();
      });
      listEl.addEventListener('input', function (e) {
        if (e.target.getAttribute('data-m') !== 'desc') return;
        var f = el._files[Number(e.target.closest('.derm-ph').dataset.i)]; if (f) f.desc = e.target.value;
      });
      listEl.addEventListener('click', function (e) {
        if (!e.target.classList.contains('derm-ph-del')) return;
        if (!confirm('حذف الصورة من هذه الزيارة؟')) return;
        el._files.splice(Number(e.target.closest('.derm-ph').dataset.i), 1); render();
      });
      input.addEventListener('change', async function () {
        var files = Array.from(input.files || []); input.value = '';
        if (!files.length || !cons.checked) return;
        var t0 = Date.now();
        while (!(window.ClinicFiles && window.ClinicFiles.upload) && Date.now() - t0 < 6000) await new Promise(function (r) { setTimeout(r, 200); });
        if (!(window.ClinicFiles && window.ClinicFiles.upload)) { st.textContent = 'رفع الصور غير متاح حالياً (تعذر تحميل وحدة التخزين).'; return; }
        var site = el.querySelector('.derm-new-site').value, stage = el.querySelector('.derm-new-stage').value;
        for (var i = 0; i < files.length; i++) {
          try {
            st.textContent = 'جارٍ رفع ' + files[i].name + ' (' + (i + 1) + '/' + files.length + ')...';
            var meta = await window.ClinicFiles.upload(files[i], 'dermatology', function (p) { st.textContent = 'جارٍ الرفع ' + p + '%'; });
            meta.date = today(); meta.consent = true; if (site) meta.site = site; if (stage) meta.stage = stage;
            el._files.push(meta); render();
          } catch (e) { st.textContent = 'تعذر رفع "' + files[i].name + '": ' + ((e && e.friendly) || (e && e.message) || 'خطأ'); await new Promise(function (r) { setTimeout(r, 1500); }); }
        }
        if (st.textContent.indexOf('تعذر') < 0) st.textContent = '';
      });
      // timeline of photos from previous visits of the same patient + side-by-side comparison
      function timeline() {
        var tl = el.querySelector('.derm-timeline'), all = [];
        prevVisits().forEach(function (vis) {
          var f = vis.exam && vis.exam.specialty === 'dermatology' && vis.exam.sections && vis.exam.sections.files;
          (Array.isArray(f) ? f : []).forEach(function (x) { if (isImg(x) && x.url) all.push({ url: x.url, date: x.date || vis.date, site: x.site || '', stage: x.stage || '' }); });
        });
        var seen = {}; all = all.filter(function (x) { if (seen[x.url]) return false; seen[x.url] = 1; return true; });
        if (!all.length) { tl.innerHTML = ''; return; }
        all.sort(function (a, b) { return (a.date || '').localeCompare(b.date || ''); });
        tl.innerHTML = '<h4 class="derm-h">🗂️ صور الزيارات السابقة (بالترتيب الزمني) — اختر صورتين للمقارنة</h4><div class="derm-tl">' + all.map(function (x, i) {
          return '<label class="derm-tl-i"><input type="checkbox" class="derm-cmp" value="' + i + '" /><img src="' + esc(x.url) + '" alt="" loading="lazy" /><span>' + esc(x.date || '') + (x.site ? ' · ' + esc(x.site) : '') + (x.stage ? ' · ' + esc(x.stage.split(' (')[0]) : '') + '</span></label>';
        }).join('') + '</div><button type="button" class="btn small derm-cmp-go">🔍 مقارنة الصورتين</button><div class="derm-cmp-view"></div>';
        tl._all = all;
      }
      el.addEventListener('click', function (e) {
        if (!e.target.classList.contains('derm-cmp-go')) return;
        var tl = el.querySelector('.derm-timeline'), sel = Array.prototype.filter.call(tl.querySelectorAll('.derm-cmp'), function (c) { return c.checked; }).map(function (c) { return tl._all[Number(c.value)]; });
        var view = tl.querySelector('.derm-cmp-view');
        if (sel.length !== 2) { view.innerHTML = '<p class="muted">اختر صورتين بالضبط.</p>'; return; }
        view.innerHTML = '<div class="derm-cmp-grid">' + sel.map(function (x) { return '<figure><img src="' + esc(x.url) + '" alt="" /><figcaption>' + esc(x.date || '') + (x.site ? ' · ' + esc(x.site) : '') + '</figcaption></figure>'; }).join('') + '</div>';
      });
      document.addEventListener('clinic-patient-changed', timeline);
      render(); timeline();
    },
    collect: function (el) { return el._files && el._files.length ? el._files.map(function (f) { return Object.assign({}, f); }) : null; },
    render: function (v) {
      if (!v || !v.length) return '';
      var s = v.slice().sort(function (a, b) { return (a.date || '').localeCompare(b.date || ''); });
      return '<div class="derm-print-ph">' + s.map(function (f) {
        var cap = [f.date, f.site, f.stage ? f.stage.split(' (')[0] : '', f.desc].filter(Boolean).map(esc).join(' · ');
        return isImg(f) ? '<figure><a href="' + esc(f.url) + '" target="_blank" rel="noopener"><img src="' + esc(f.url) + '" alt="" /></a><figcaption>' + (cap || esc(f.name)) + '</figcaption></figure>'
          : '<p><a href="' + esc(f.url) + '" target="_blank" rel="noopener">' + esc(f.name) + '</a></p>';
      }).join('') + '</div>';
    }
  });

  /* ===================== 8) FOLLOW-UP ===================== */
  SP.addSection('dermatology', fsec({
    id: 'dermFollow', title: '📅 المتابعة والاستجابة للعلاج', box: 'derm-follow',
    groups: [
      { id: 'resp', t: 'الاستجابة منذ الزيارة السابقة', f: [
          F('response', 'الاستجابة للعلاج', 's', ['', 'شفاء تام (Clear)', 'تحسن واضح', 'تحسن جزئي', 'لا تغيير', 'أسوأ']),
          F('adherence', 'الالتزام بالعلاج', 's', ['', 'ملتزم تماماً', 'التزام جزئي', 'غير ملتزم']),
          F('sideFx', 'أعراض جانبية؟', 's', YN),
          F('sideFxNote', 'الأعراض الجانبية', 't', 'جفاف، تهيج، اضطراب هضمي…', { show: 'sideFx=نعم' }),
          F('progress', 'ملاحظات التطور', 'a')],
        post: function () { var t = []; prevVisits().forEach(function (x) { var s = x.exam && x.exam.sections && x.exam.sections.dermFollow; if (s && s.response) t.push(x.date + ': ' + s.response); }); return t.length ? '<p class="muted">📉 السابق: ' + esc(t.slice(-4).join(' ← ')) + '</p>' : ''; },
        sum: function (v) { return [v.response, v.adherence].filter(Boolean).join(' · '); } },
      { id: 'next', t: 'الزيارة القادمة (Next visit)', f: [
          F('interval', 'بعد', 's', ['', 'أسبوع', 'أسبوعين', '3 أسابيع', 'شهر', '6 أسابيع', 'شهرين', '3 شهور', '6 شهور']),
          F('nextDate', '📅 موعد الزيارة القادمة', 'd', '', { nr: 1 }),
          F('nextReason', 'سبب المتابعة', 't', 'تقييم الاستجابة للعلاج', { nr: 1 })],
        sum: function (v) { return v.nextDate ? v.nextDate + (v.nextReason ? ' — ' + v.nextReason : '') : ''; } }
    ],
    wire: function (el, refresh) {
      el.addEventListener('change', function (e) {
        if (!e.target.matches('.ef[data-k="interval"]') || !e.target.value) return;
        var d = { 'أسبوع': 7, 'أسبوعين': 14, '3 أسابيع': 21, 'شهر': 30, '6 أسابيع': 42, 'شهرين': 60, '3 شهور': 91, '6 شهور': 182 }[e.target.value];
        var t = new Date(today() + 'T00:00:00'); t.setDate(t.getDate() + d);
        var n = el.querySelector('.ef[data-k="nextDate"]'); n.value = t.toISOString().slice(0, 10); refresh();
      });
    },
    summary: function (v) { return [v.response, v.nextDate ? 'المتابعة ' + v.nextDate : ''].filter(Boolean).join(' · '); },
    extraRender: function (v) { return v.nextDate ? '<p><b>📅 موعد المتابعة:</b> ' + esc(v.nextDate) + (v.nextReason ? ' — ' + esc(v.nextReason) : '') + '</p>' : ''; }
  }));

  SP.orderSections('dermatology', ['dermHx', 'dermExam', 'lesions', 'dermDx', 'dermInv', 'dermTx', 'severity', 'dermProc', 'files', 'dermFollow']);

  function dermFollowups(exam) {
    var f = exam && exam.sections && exam.sections.dermFollow;
    return f && f.nextDate ? [{ key: 'dermNext', kind: 'derm', date: f.nextDate, reason: f.nextReason || 'متابعة جلدية' }] : [];
  }
  window.ClinicDerm = { dermFollowups: dermFollowups, splitDx: splitDx, catalog: DX };
})();
} catch (e) { console.error('[specialties-bundle] derm-plus.js failed:', e); }
/* ==== END derm-plus.js ==== */

/* ==== BEGIN aesthetic-map.js ==== */
try {
// ============ Aesthetic: Facial Mapping & Injection Points (v57) ============
// Additive module for the existing "تجميل" specialty (specialties-extra.js).
// Saves inside the same visit: exam.sections.aesFaceMap — no new collection.
// Data: { points:[{ id, n, view:'front'|'left'|'right', x, y (0..100 % of diagram),
//          area, areaOther, type, product, pAmt, pUnit, status, aAmt, aUnit, reason, notes }],
//          procDate, procNotes }
// Documentation tool only: nothing is suggested or prescribed automatically.
(function () {
  var SP = window.ClinicSpecialty, CC = window.ClinicCare;
  if (!SP) return;
  var esc = SP.escape;
  var ID = 'aesFaceMap';
  var VIEWS = [['front', 'أمامي (Front)'], ['left', 'الجانب الأيسر (Left)'], ['right', 'الجانب الأيمن (Right)']];
  var TYPES = [
    ['botox', 'بوتوكس (Botox)', '#2f6fe0'],
    ['filler', 'فيلر (Dermal filler)', '#d6336c'],
    ['booster', 'Skin booster', '#12a17a'],
    ['meso', 'ميزوثيرابي (Mesotherapy)', '#e8890c'],
    ['prp', 'بلازما (PRP)', '#b0281f'],
    ['other', 'أخرى (Other)', '#6b5bd2']
  ];
  var AREAS = ['', 'الجبهة (Forehead)', 'بين الحاجبين (Glabella)', 'حول العين الخارجي (Crow\'s feet)', 'تحت العين (Under-eye)',
    'الخدود (Cheeks)', 'الأنف (Nose)', 'خطوط الابتسامة (Nasolabial folds)', 'الشفاه (Lips)', 'الذقن (Chin)',
    'خط الفك (Jawline)', 'الصدغ (Temples)', 'أخرى (Other)'];
  var UNITS = ['', 'وحدة (units)', 'مل (ml)', 'أخرى'];
  var STATUS = [['planned', 'مخطط فقط — لم يُنفذ بعد'], ['done', 'تم كما هو مخطط'], ['changed', 'تم مع تعديل'], ['skipped', 'لم يُنفذ / أُلغي']];

  function typeOf(k) { for (var i = 0; i < TYPES.length; i++) if (TYPES[i][0] === k) return TYPES[i]; return TYPES[5]; }
  function label(list, k) { for (var i = 0; i < list.length; i++) if (list[i][0] === k) return list[i][1]; return k || ''; }
  function opts(list, v) {
    return list.map(function (o) {
      var val = Array.isArray(o) ? o[0] : o, txt = Array.isArray(o) ? o[1] : o;
      return '<option value="' + esc(val) + '"' + (val === (v || '') ? ' selected' : '') + '>' + (txt ? esc(txt) : '—') + '</option>';
    }).join('');
  }
  function today() { return CC && CC.today ? CC.today() : new Date().toISOString().slice(0, 10); }
  function areaTxt(p) { return p.area === 'أخرى (Other)' && p.areaOther ? p.areaOther : (p.areaOther && !p.area ? p.areaOther : p.area || ''); }
  function amt(a, u) { return a ? a + (u ? ' ' + u : '') : '—'; }
  function diffTxt(p) {
    if (p.status === 'done') return 'مطابق';
    if (p.status === 'skipped') return 'لم يُنفذ';
    if (p.status === 'changed') {
      var a = parseFloat(p.aAmt), b = parseFloat(p.pAmt);
      if (!isNaN(a) && !isNaN(b) && (p.aUnit || '') === (p.pUnit || '')) return (a - b > 0 ? '+' : '') + (Math.round((a - b) * 100) / 100) + (p.aUnit ? ' ' + p.aUnit : '');
      return 'معدّل';
    }
    return 'مخطط فقط';
  }
  function statusTxt(p) { return label(STATUS, p.status || 'planned'); }

  /* ---------- lightweight SVG line drawings (viewBox 200 x 260) ---------- */
  var ST = 'fill="none" stroke="#8a94a8" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"';
  var FRONT =
    '<path d="M100 18 C55 18 40 60 42 112 C44 168 70 214 100 222 C130 214 156 168 158 112 C160 60 145 18 100 18 Z" fill="#fbf4ee" stroke="#8a94a8" stroke-width="1.8"/>' +
    '<path ' + ST + ' d="M50 78 C62 40 138 40 150 78"/>' +
    '<path ' + ST + ' d="M42 108 C33 106 31 130 40 140 M158 108 C167 106 169 130 160 140"/>' +
    '<path ' + ST + ' d="M60 98 C70 91 82 91 90 96 M110 96 C118 91 130 91 140 98"/>' +
    '<path ' + ST + ' d="M63 113 C70 107 82 107 88 113 C82 118 70 118 63 113 Z M112 113 C118 107 130 107 137 113 C130 118 118 118 112 113 Z"/>' +
    '<circle cx="75.5" cy="112.5" r="3" fill="#8a94a8"/><circle cx="124.5" cy="112.5" r="3" fill="#8a94a8"/>' +
    '<path ' + ST + ' d="M97 112 C96 130 90 146 88 152 C94 158 106 158 112 152 C110 146 104 130 103 112"/>' +
    '<path ' + ST + ' d="M84 132 C80 150 76 160 80 168 M116 132 C120 150 124 160 120 168" stroke-dasharray="2 3"/>' +
    '<path ' + ST + ' d="M80 176 C90 170 96 172 100 174 C104 172 110 170 120 176 C110 186 90 186 80 176 Z M80 176 L120 176"/>' +
    '<path ' + ST + ' d="M88 204 C96 210 104 210 112 204" stroke-dasharray="2 3"/>' +
    '<path ' + ST + ' d="M78 220 L76 255 M122 220 L124 255"/>';
  // profile facing left (patient's left side shown); right view is mirrored
  var SIDE =
    '<path d="M118 18 C80 16 58 40 56 70 C55 84 50 96 44 108 C40 114 46 118 52 118 C50 126 54 130 52 136 C48 140 52 146 58 148 C56 154 60 160 58 170 C58 186 70 196 88 198 C96 212 98 222 100 226 L150 226 C146 200 160 180 164 150 C170 110 166 40 118 18 Z" fill="#fbf4ee" stroke="#8a94a8" stroke-width="1.8"/>' +
    '<path ' + ST + ' d="M64 60 C80 30 130 22 156 60"/>' +
    '<path ' + ST + ' d="M64 96 C72 92 80 92 86 95"/>' +
    '<path ' + ST + ' d="M66 106 C72 102 80 103 84 107 C78 110 72 110 66 106 Z"/><circle cx="72" cy="106" r="2.2" fill="#8a94a8"/>' +
    '<path ' + ST + ' d="M118 98 C108 96 104 112 108 126 C112 136 122 136 124 126 C126 112 126 100 118 98 Z M114 108 C112 114 114 122 118 124"/>' +
    '<path ' + ST + ' d="M62 140 C72 138 76 142 76 150" stroke-dasharray="2 3"/>' +
    '<path ' + ST + ' d="M88 198 C110 200 132 186 146 160" />' +
    '<path ' + ST + ' d="M70 120 C80 126 84 134 82 140" stroke-dasharray="2 3"/>';
  function svg(view, points, sel, interactive) {
    var g = view === 'front' ? FRONT : (view === 'right' ? '<g transform="translate(200 0) scale(-1 1)">' + SIDE + '</g>' : SIDE);
    var m = points.filter(function (p) { return p.view === view; }).map(function (p) {
      var c = typeOf(p.type)[2], x = p.x * 2, y = p.y * 2.6, on = sel === p.id;
      return '<g class="afm-mk" data-id="' + esc(p.id) + '"' + (interactive ? ' style="cursor:pointer"' : '') + '>' +
        (on ? '<circle cx="' + x + '" cy="' + y + '" r="10" fill="none" stroke="' + c + '" stroke-width="2" opacity=".55"/>' : '') +
        '<circle cx="' + x + '" cy="' + y + '" r="6.5" fill="' + c + '" stroke="#fff" stroke-width="1.5"' + (p.status === 'skipped' ? ' opacity=".4"' : '') + '/>' +
        '<text x="' + x + '" y="' + (y + 2.6) + '" text-anchor="middle" font-size="7.5" font-weight="700" fill="#fff" style="pointer-events:none;font-family:sans-serif">' + p.n + '</text></g>';
    }).join('');
    return '<svg class="afm-svg" viewBox="0 0 200 260" preserveAspectRatio="xMidYMid meet" role="img" aria-label="' + esc(label(VIEWS, view)) + '">' +
      '<rect width="200" height="260" fill="#f4f6fa"/>' + g + m + '</svg>';
  }
  function legend() {
    return '<div class="afm-legend">' + TYPES.map(function (t) {
      return '<span><i style="background:' + t[2] + '"></i>' + esc(t[1]) + '</span>';
    }).join('') + '</div>';
  }
  function tableRows(points) {
    return points.map(function (p) {
      return [String(p.n), label(VIEWS, p.view).split(' ')[0], areaTxt(p) || '—', typeOf(p.type)[1] + (p.product ? ' — ' + p.product : ''),
        amt(p.pAmt, p.pUnit), p.status === 'done' ? amt(p.pAmt, p.pUnit) : (p.status === 'changed' ? amt(p.aAmt, p.aUnit) : '—'),
        diffTxt(p) + (p.reason ? ' (' + p.reason + ')' : ''), p.notes || '—'];
    });
  }
  var HEAD = ['النقطة', 'المنظر', 'المنطقة', 'الإجراء', 'المخطط', 'الفعلي', 'الفرق / السبب', 'ملاحظات'];
  function summary(v) {
    var n = (v && v.points || []).length;
    if (!n) return '';
    var done = v.points.filter(function (p) { return p.status === 'done' || p.status === 'changed'; }).length;
    return '● ' + n + ' نقطة' + (done ? ' • ' + done + ' منفذة' : '');
  }

  /* ---------- editor ---------- */
  function editorHtml(p) {
    if (!p) return '<p class="muted afm-hint">اضغط على الرسم لإضافة نقطة، أو اختر نقطة موجودة لتعديلها. المواقع والجرعات يحددها الطبيب فقط — لا توجد اقتراحات تلقائية.</p>';
    var showA = p.status === 'changed';
    return '<div class="afm-ed" style="border-inline-start:4px solid ' + typeOf(p.type)[2] + '">' +
      '<div class="afm-ed-h"><b>نقطة رقم ' + p.n + '</b> <span class="muted">' + esc(label(VIEWS, p.view)) + '</span>' +
      '<button type="button" class="btn small danger afm-del">🗑 حذف النقطة</button></div>' +
      '<div class="grid-2 sx-grid">' +
      '<div class="field"><label>منطقة الوجه</label><select data-f="area">' + opts(AREAS, p.area) + '</select></div>' +
      '<div class="field"><label>منطقة مخصصة / تفاصيل</label><input data-f="areaOther" value="' + esc(p.areaOther || '') + '" placeholder="مثال: زاوية الفم اليسرى" /></div>' +
      '<div class="field"><label>نوع الإجراء</label><select data-f="type">' + opts(TYPES.map(function (t) { return [t[0], t[1]]; }), p.type) + '</select></div>' +
      '<div class="field"><label>المنتج / العلاج (نص حر)</label><input data-f="product" value="' + esc(p.product || '') + '" /></div>' +
      '<div class="field"><label>الكمية المخططة</label><input data-f="pAmt" type="number" step="any" min="0" value="' + esc(p.pAmt || '') + '" /></div>' +
      '<div class="field"><label>الوحدة</label><select data-f="pUnit">' + opts(UNITS, p.pUnit) + '</select></div>' +
      '<div class="field"><label>حالة التنفيذ</label><select data-f="status">' + opts(STATUS, p.status || 'planned') + '</select></div>' +
      '<div class="field afm-a"' + (showA ? '' : ' style="display:none"') + '><label>الكمية الفعلية</label><input data-f="aAmt" type="number" step="any" min="0" value="' + esc(p.aAmt || '') + '" /></div>' +
      '<div class="field afm-a"' + (showA ? '' : ' style="display:none"') + '><label>وحدة الفعلي</label><select data-f="aUnit">' + opts(UNITS, p.aUnit) + '</select></div>' +
      '<div class="field afm-r"' + (p.status === 'changed' || p.status === 'skipped' ? '' : ' style="display:none"') + '><label>سبب التغيير</label><input data-f="reason" value="' + esc(p.reason || '') + '" /></div>' +
      '<div class="field" style="grid-column:1 / -1"><label>ملاحظات الطبيب</label><textarea data-f="notes" rows="2">' + esc(p.notes || '') + '</textarea></div>' +
      '</div></div>';
  }

  var section = {
    id: ID,
    title: '🗺️ خريطة الوجه ونقاط الحقن (Facial Mapping & Injection Points)',
    html: function (v) {
      v = v || {};
      var body = '<div class="afm" data-val="' + esc(JSON.stringify(v)) + '">' +
        '<div class="afm-tabs">' + VIEWS.map(function (w, i) {
          return '<button type="button" class="afm-tab' + (i ? '' : ' on') + '" data-view="' + w[0] + '">' + esc(w[1]) + ' <span class="afm-c"></span></button>';
        }).join('') + '</div>' +
        '<div class="afm-main"><div class="afm-stage"></div><div class="afm-side"><div class="afm-editor"></div></div></div>' +
        legend() +
        '<h4 class="afm-h">ملخص النقاط (Treatment Summary)</h4><div class="afm-table"></div>' +
        '<div class="grid-2 sx-grid">' +
        '<div class="field"><label>تاريخ تنفيذ الإجراء</label><input type="date" class="afm-pdate" value="' + esc(v.procDate || '') + '" /></div>' +
        '<div class="field" style="grid-column:1 / -1"><label>ملاحظات الإجراء</label><textarea class="afm-pnotes" rows="2">' + esc(v.procNotes || '') + '</textarea></div></div>' +
        '<p class="muted afm-hint">📷 صور قبل/بعد تُرفق في قسم «صور قبل / بعد» لنفس الزيارة — منفصلة عن الرسم التوضيحي. لا تُنشر صور المرضى أو تستخدم للتسويق بدون موافقة كتابية.</p>' +
        '</div>';
      return CC ? CC.box(ID, this.title, summary(v), body, 'ent-box') : body;
    },
    wire: function (el) {
      var root = el.querySelector('.afm');
      if (!root) return;
      var v = {}; try { v = JSON.parse(root.getAttribute('data-val') || '{}'); } catch (e) {}
      var st = root._st = { points: (v.points || []).map(function (p) { return Object.assign({}, p); }), view: 'front', sel: null };
      var nextId = 0;
      function find(id) { for (var i = 0; i < st.points.length; i++) if (st.points[i].id === id) return st.points[i]; }
      function renumber() { st.points.forEach(function (p, i) { p.n = i + 1; }); }
      function drawStage() { root.querySelector('.afm-stage').innerHTML = svg(st.view, st.points, st.sel, true); }
      function drawCounts() {
        root.querySelectorAll('.afm-tab').forEach(function (b) {
          var c = st.points.filter(function (p) { return p.view === b.dataset.view; }).length;
          b.querySelector('.afm-c').textContent = c ? '(' + c + ')' : '';
          b.classList.toggle('on', b.dataset.view === st.view);
        });
      }
      function drawTable() {
        root.querySelector('.afm-table').innerHTML = st.points.length ? SP.tableHtml(HEAD, tableRows(st.points)) : '<p class="muted">لا توجد نقاط بعد.</p>';
        if (CC) CC.setSummary(el.querySelector('.cc-box[data-cc="' + ID + '"]'), summary({ points: st.points }));
      }
      function drawEditor() { root.querySelector('.afm-editor').innerHTML = editorHtml(find(st.sel)); }
      function all() { drawStage(); drawCounts(); drawTable(); drawEditor(); }
      root.querySelector('.afm-tabs').addEventListener('click', function (e) {
        var b = e.target.closest('.afm-tab'); if (!b) return;
        st.view = b.dataset.view; var s = find(st.sel); if (s && s.view !== st.view) st.sel = null; all();
      });
      root.querySelector('.afm-stage').addEventListener('click', function (e) {
        var mk = e.target.closest('.afm-mk');
        if (mk) { st.sel = mk.dataset.id; drawStage(); drawEditor(); return; }
        var s = e.target.closest('svg'); if (!s) return;
        var pt = s.createSVGPoint(); pt.x = e.clientX; pt.y = e.clientY;
        var m = s.getScreenCTM(); if (!m) return;
        var q = pt.matrixTransform(m.inverse());
        if (q.x < 0 || q.y < 0 || q.x > 200 || q.y > 260) return;
        var last = st.points[st.points.length - 1];
        var p = { id: 'p' + Date.now().toString(36) + (nextId++), view: st.view,
          x: Math.round(q.x / 2 * 10) / 10, y: Math.round(q.y / 2.6 * 10) / 10,
          area: '', type: last ? last.type : 'botox', product: last ? last.product || '' : '', pAmt: '', pUnit: last ? last.pUnit || '' : '', status: 'planned', notes: '' };
        st.points.push(p); renumber(); st.sel = p.id; all();
      });
      var ed = root.querySelector('.afm-editor');
      function onEdit(e) {
        var f = e.target.getAttribute && e.target.getAttribute('data-f'), p = find(st.sel);
        if (!f || !p) return;
        p[f] = e.target.value;
        if (f === 'status') {
          ed.querySelectorAll('.afm-a').forEach(function (n) { n.style.display = p.status === 'changed' ? '' : 'none'; });
          ed.querySelector('.afm-r').style.display = (p.status === 'changed' || p.status === 'skipped') ? '' : 'none';
          var pd = root.querySelector('.afm-pdate');
          if ((p.status === 'done' || p.status === 'changed') && !pd.value) pd.value = today();
        }
        if (f === 'type') { ed.querySelector('.afm-ed').style.borderInlineStartColor = typeOf(p.type)[2]; }
        if (f === 'type' || f === 'status') drawStage();
        drawTable();
      }
      ed.addEventListener('input', onEdit); ed.addEventListener('change', onEdit);
      ed.addEventListener('click', function (e) {
        if (!e.target.closest('.afm-del')) return;
        if (!confirm('حذف هذه النقطة؟')) return;
        st.points = st.points.filter(function (p) { return p.id !== st.sel; }); renumber(); st.sel = null; all();
      });
      all();
    },
    collect: function (el) {
      var root = el.querySelector('.afm'); if (!root || !root._st) return null;
      var pts = root._st.points.map(function (p) {
        var o = {}; Object.keys(p).forEach(function (k) { if (p[k] !== '' && p[k] != null) o[k] = p[k]; });
        if (o.status !== 'changed') { delete o.aAmt; delete o.aUnit; }
        if (o.status !== 'changed' && o.status !== 'skipped') delete o.reason;
        return o;
      });
      var d = (root.querySelector('.afm-pdate').value || '').trim(), n = (root.querySelector('.afm-pnotes').value || '').trim();
      if (!pts.length && !d && !n) return null;
      var out = { points: pts }; if (d) out.procDate = d; if (n) out.procNotes = n;
      return out;
    },
    render: function (v) {
      if (!v || !(v.points || []).length && !v.procNotes) return '';
      var pts = v.points || [];
      var views = VIEWS.filter(function (w) { return pts.some(function (p) { return p.view === w[0]; }); });
      return '<div class="afm-print">' + views.map(function (w) {
        return '<div class="afm-pv"><div class="muted">' + esc(w[1]) + '</div>' + svg(w[0], pts, null, false) + '</div>';
      }).join('') + '</div>' + (pts.length ? legend() + '<div class="afm-table">' + SP.tableHtml(HEAD, tableRows(pts)) + '</div>' : '') +
        (v.procDate ? '<p><b>تاريخ التنفيذ:</b> ' + esc(v.procDate) + '</p>' : '') +
        (v.procNotes ? '<p><b>ملاحظات الإجراء:</b> ' + esc(v.procNotes) + '</p>' : '');
    }
  };
  SP.addSection('aesthetic', section);
  SP.orderSections('aesthetic', ['aesConsult', ID, 'aesProcedures', 'aesPhotos']);
  window.ClinicAesMap = { section: section, svg: svg };
})();
} catch (e) { console.error('[specialties-bundle] aesthetic-map.js failed:', e); }
/* ==== END aesthetic-map.js ==== */
