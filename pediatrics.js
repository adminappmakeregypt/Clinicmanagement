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
      function bwValid() { var n = num(bw.value); var ok = !bw.value || (n != null && n > 0 && /^\d+([.,]\d+)?$/.test(bw.value.trim())); el.querySelector('.gc-err').hidden = ok; return ok ? n : null; }
      function draw() {
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
