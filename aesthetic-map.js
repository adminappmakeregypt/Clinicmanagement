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
