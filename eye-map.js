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
