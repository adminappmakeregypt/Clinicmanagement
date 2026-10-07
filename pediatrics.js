// ============ Pediatrics module (وحدة الأطفال) ============
// v51: age auto-calculation, weight-based dose calculator, WHO growth charts,
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

  /* ================= 3) Growth charts (WHO) ================= */
  var Z = [[-1.881, '3'], [-1.036, '15'], [0, '50'], [1.036, '85'], [1.881, '97']];
  var IND = { wfa: { l: 'الوزن للعمر', u: 'كجم', k: 'weight' }, hfa: { l: 'الطول للعمر', u: 'سم', k: 'height' }, hcfa: { l: 'محيط الرأس للعمر', u: 'سم', k: 'head' } };
  function lms(ind, sex, months) {
    var t = window.WHO_GROWTH && window.WHO_GROWTH[ind + '_' + sex];
    if (!t || months < 0 || months > 60) return null;
    var i = Math.floor(months), f = months - i, a = t[i], b = t[Math.min(i + 1, 60)];
    return [a[0] + (b[0] - a[0]) * f, a[1] + (b[1] - a[1]) * f, a[2] + (b[2] - a[2]) * f];
  }
  function valAt(p, z) { return p[0] ? p[1] * Math.pow(1 + p[0] * p[2] * z, 1 / p[0]) : p[1] * Math.exp(p[2] * z); }
  function zOf(p, x) { return p[0] ? (Math.pow(x / p[1], p[0]) - 1) / (p[0] * p[2]) : Math.log(x / p[1]) / p[2]; }
  function pct(z) { // normal CDF
    var t = 1 / (1 + 0.2316419 * Math.abs(z)), d = 0.3989423 * Math.exp(-z * z / 2);
    var q = d * t * (0.3193815 + t * (-0.3565638 + t * (1.781478 + t * (-1.821256 + t * 1.330274))));
    return z > 0 ? 1 - q : q;
  }
  function growthPoints(el) {
    var p = patient(), pts = [];
    var push = function (date, ex, fields) {
      var age = null;
      if (p && p.birthDate && date) { var a = CC.ageParts(p.birthDate, date); if (a) age = a.exactMonths; }
      if (age == null && fields.ageMonths) age = num(fields.ageMonths);
      if (age == null) return;
      pts.push({ age: age, date: date, weight: num(fields.weight), height: num(fields.height), head: num(fields.head) });
    };
    if (p && CC) CC.visitsFor(p).forEach(function (v) { if (v.exam && v.exam.specialty === 'pediatrics') push(v.date, v.exam, v.exam.fields || {}); });
    var cur = {};
    ['ageMonths', 'weight', 'height', 'head'].forEach(function (k) { cur[k] = fieldVal(el, k); });
    if (cur.weight || cur.height || cur.head) push(visitDate(el), null, cur);
    // keep one point per date (the current form wins)
    var seen = {}, out = [];
    for (var i = pts.length - 1; i >= 0; i--) { var k = pts[i].date || ('a' + pts[i].age); if (!seen[k]) { seen[k] = 1; out.unshift(pts[i]); } }
    return out.sort(function (a, b) { return a.age - b.age; });
  }
  function chartSvg(ind, sex, pts) {
    var key = IND[ind].k, mine = pts.filter(function (p) { return p[key] != null && p.age <= 60; });
    var maxA = Math.min(60, Math.max(24, Math.ceil(((mine.length ? mine[mine.length - 1].age : 0) + 6) / 6) * 6));
    var lo = Infinity, hi = -Infinity;
    for (var m = 0; m <= maxA; m++) { var q = lms(ind, sex, m); lo = Math.min(lo, valAt(q, -2.3)); hi = Math.max(hi, valAt(q, 2.3)); }
    mine.forEach(function (p) { lo = Math.min(lo, p[key]); hi = Math.max(hi, p[key]); });
    lo = Math.floor(lo); hi = Math.ceil(hi);
    var W = 560, H = 300, L = 40, R = 30, T = 12, B = 30;
    var X = function (a) { return L + (a / maxA) * (W - L - R); }, Y = function (v) { return T + (1 - (v - lo) / (hi - lo)) * (H - T - B); };
    var s = '<svg viewBox="0 0 ' + W + ' ' + H + '" class="gc-svg" role="img" aria-label="' + IND[ind].l + '" direction="ltr">';
    var stepY = Math.max(1, Math.round((hi - lo) / 6));
    for (var v = lo; v <= hi; v += stepY) s += '<line x1="' + L + '" x2="' + (W - R) + '" y1="' + Y(v) + '" y2="' + Y(v) + '" class="gc-grid"/><text x="' + (L - 4) + '" y="' + (Y(v) + 3) + '" class="gc-ax" text-anchor="end">' + v + '</text>';
    var stepX = maxA > 36 ? 6 : 3;
    for (var a = 0; a <= maxA; a += stepX) s += '<line y1="' + T + '" y2="' + (H - B) + '" x1="' + X(a) + '" x2="' + X(a) + '" class="gc-grid"/><text x="' + X(a) + '" y="' + (H - B + 14) + '" class="gc-ax" text-anchor="middle">' + a + '</text>';
    s += '<text x="' + ((W) / 2) + '" y="' + (H - 2) + '" class="gc-ax" text-anchor="middle">العمر بالشهور</text>';
    Z.forEach(function (z) {
      var d = '';
      for (var m2 = 0; m2 <= maxA; m2 += 0.5) { var q2 = lms(ind, sex, m2); d += (m2 ? 'L' : 'M') + X(m2).toFixed(1) + ' ' + Y(valAt(q2, z[0])).toFixed(1); }
      var last = lms(ind, sex, maxA);
      s += '<path d="' + d + '" class="gc-line' + (z[1] === '50' ? ' gc-mid' : '') + '"/><text x="' + (X(maxA) + 3) + '" y="' + (Y(valAt(last, z[0])) + 3) + '" class="gc-pl">' + z[1] + '</text>';
    });
    if (mine.length > 1) s += '<path class="gc-kid" d="' + mine.map(function (p, i) { return (i ? 'L' : 'M') + X(p.age).toFixed(1) + ' ' + Y(p[key]).toFixed(1); }).join('') + '"/>';
    mine.forEach(function (p) { s += '<circle cx="' + X(p.age) + '" cy="' + Y(p[key]) + '" r="4" class="gc-pt"><title>' + (p.date || '') + ' — ' + p[key] + ' ' + IND[ind].u + '</title></circle>'; });
    return s + '</svg>';
  }
  function latestText(sex, pts) {
    var last = pts[pts.length - 1];
    if (!last) return '<p class="muted">لا توجد قياسات بعد. أدخل الوزن والطول ومحيط الرأس في الفحص.</p>';
    var rows = [];
    Object.keys(IND).forEach(function (ind) {
      var v = last[IND[ind].k], q = v != null && lms(ind, sex, last.age);
      if (!q) return;
      var z = zOf(q, v);
      rows.push([IND[ind].l, v + ' ' + IND[ind].u, z.toFixed(2), Math.round(pct(z) * 100) + '%']);
    });
    var bmi = last.weight && last.height ? last.weight / Math.pow(last.height / 100, 2) : null;
    return '<p><b>آخر زيارة:</b> ' + esc(last.date || '') + ' — العمر ' + last.age.toFixed(1) + ' شهر' + (bmi ? ' — مؤشر كتلة الجسم (BMI): <b>' + bmi.toFixed(1) + '</b>' : '') + '</p>' +
      (rows.length ? SP.tableHtml(['القياس', 'القيمة', 'Z-score', 'المئين (Percentile)'], rows) : '');
  }
  SP.addSection('pediatrics', {
    id: 'growth',
    title: '📈 منحنيات النمو',
    html: function () {
      return wrap('ped-growth', '📈 منحنيات النمو (WHO Growth Chart)', '',
        '<div class="gc-bar"><div class="gc-tabs">' +
        Object.keys(IND).map(function (k, i) { return '<button type="button" class="btn small ' + (i ? 'ghost' : 'primary') + '" data-gc="' + k + '">' + IND[k].l + '</button>'; }).join('') +
        '</div><select class="gc-sex"><option value="m">ولد</option><option value="f">بنت</option></select></div>' +
        '<div class="gc-chart"></div><div class="gc-latest"></div>' +
        '<p class="muted">المنحنيات: المئين 3، 15، 50، 85، 97 حسب معايير منظمة الصحة العالمية (0–5 سنوات). النقاط = زيارات الطفل.</p>');
    },
    wire: function (el) {
      var ind = 'wfa', sexSel = el.querySelector('.gc-sex');
      function setSex() { var p = patient(), g = p && CC.genderCode(p.gender); if (g) sexSel.value = g; }
      function draw() {
        if (!window.WHO_GROWTH) { el.querySelector('.gc-chart').innerHTML = '<p class="muted">بيانات المنحنيات غير محمّلة.</p>'; return; }
        var pts = growthPoints(el), sex = sexSel.value;
        el.querySelector('.gc-chart').innerHTML = chartSvg(ind, sex, pts);
        el.querySelector('.gc-latest').innerHTML = latestText(sex, pts);
        var last = pts[pts.length - 1];
        if (last && CC) {
          var q = last.weight != null && lms('wfa', sex, last.age);
          CC.setSummary(el.querySelector('.cc-box'), q ? 'الوزن: المئين ' + Math.round(pct(zOf(q, last.weight)) * 100) + '%' : pts.length + ' قياس');
        }
      }
      el.querySelectorAll('[data-gc]').forEach(function (b) {
        b.addEventListener('click', function () {
          ind = b.dataset.gc;
          el.querySelectorAll('[data-gc]').forEach(function (x) { x.classList.toggle('primary', x === b); x.classList.toggle('ghost', x !== b); });
          draw();
        });
      });
      sexSel.addEventListener('change', draw);
      ['weight', 'height', 'head', 'ageMonths'].forEach(function (k) {
        var f = root(el).querySelector('.sp-f[data-k="' + k + '"]');
        if (f) f.addEventListener('change', draw);
      });
      document.addEventListener('clinic-patient-changed', function () { setSex(); draw(); });
      setSex(); draw();
    },
    collect: function () { return null; },
    render: function () { return ''; }
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
