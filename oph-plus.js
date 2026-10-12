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
