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
