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

  SP.addSection(S, {
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
  });

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
    { k: 'tempFilling', l: 'حشو مؤقت' }, { k: 'finalRestoration', l: 'الترميم النهائي' },
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
