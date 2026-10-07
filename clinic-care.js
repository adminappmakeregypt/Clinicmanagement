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
    listFollowups: listFollowups, saveFollowupFromRx: saveFollowupFromRx, setFollowupStatus: setFollowupStatus,
    waLink: waLink, mountFollowups: mountFollowups
  };
  document.addEventListener('cloud-sync-updated', function () { renderBadges(); });
})();
