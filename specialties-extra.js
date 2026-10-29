// ============ Extra specialty modules (v38) ============
// نساء وتوليد • أنف وأذن وحنجرة • تجميل • جهاز هضمي • باطنة
// Uses the existing ClinicSpecialty architecture: every section is saved inside
// the same visit/prescription `exam.sections` object — no new collections,
// same patient record, same electronic prescription.
//
// Field spec: [key, label, type, options]
//   types: t=text  a=textarea  s=select  c=checkboxes(multi)  d=date  n=number
// Group spec: { t: title, f: [fields], when: { k: key, v: value }, open: bool }

(function () {
  var SP = window.ClinicSpecialty;
  if (!SP) return;
  var esc = SP.escape;
  var YN = ['', 'لا', 'نعم'];
  var SEV = ['', 'لا يوجد', 'خفيف', 'متوسط', 'شديد'];
  var NAD = ['', 'طبيعي', 'غير طبيعي'];

  /* ---------------- generic structured section ---------------- */
  function fieldInput(f, v) {
    var k = f[0], type = f[2], opts = f[3] || [];
    if (type === 's') {
      return '<select data-xk="' + k + '">' + opts.map(function (o) {
        return '<option value="' + esc(o) + '"' + (o === v ? ' selected' : '') + '>' + (o ? esc(o) : '—') + '</option>';
      }).join('') + '</select>';
    }
    if (type === 'c') {
      var arr = Array.isArray(v) ? v : [];
      return '<div class="sx-checks" data-xk="' + k + '" data-multi="1">' + opts.map(function (o) {
        return '<label class="sx-check"><input type="checkbox" value="' + esc(o) + '"' +
          (arr.indexOf(o) >= 0 ? ' checked' : '') + ' /> ' + esc(o) + '</label>';
      }).join('') + '</div>';
    }
    if (type === 'a') return '<textarea data-xk="' + k + '" rows="2">' + esc(v || '') + '</textarea>';
    var it = type === 'd' ? 'date' : (type === 'n' ? 'number' : 'text');
    return '<input type="' + it + '" data-xk="' + k + '" value="' + esc(v || '') + '"' + (type === 'n' ? ' step="any"' : '') + ' />';
  }

  function structSection(id, title, groups, hooks) {
    var labels = {};
    groups.forEach(function (g) { g.f.forEach(function (f) { labels[f[0]] = f[1]; }); });

    function readVal(root, k) {
      var el = root.querySelector('[data-xk="' + k + '"]');
      if (!el) return null;
      if (el.dataset.multi) {
        return Array.prototype.map.call(el.querySelectorAll('input:checked'), function (i) { return i.value; });
      }
      return (el.value || '').trim();
    }
    function matches(root, w) {
      var v = readVal(root, w.k);
      return Array.isArray(v) ? v.indexOf(w.v) >= 0 : v === w.v;
    }

    return {
      id: id,
      title: title,
      html: function (val) {
        val = val || {};
        return groups.map(function (g, gi) {
          var hasData = g.f.some(function (f) { var x = val[f[0]]; return Array.isArray(x) ? x.length : x; });
          return '<details class="sx-group" data-gi="' + gi + '"' + ((g.open || hasData) ? ' open' : '') + '>' +
            '<summary>' + esc(g.t) + '</summary><div class="grid-2 sx-grid">' +
            g.f.map(function (f) {
              var wide = (f[2] === 'a' || f[2] === 'c') ? ' style="grid-column:1 / -1;"' : '';
              return '<div class="field"' + wide + '><label>' + esc(f[1]) + '</label>' + fieldInput(f, val[f[0]]) + '</div>';
            }).join('') + '</div></details>';
        }).join('');
      },
      wire: function (el) {
        var root = el.parentNode || el;
        function refresh() {
          groups.forEach(function (g, gi) {
            if (!g.when) return;
            var box = el.querySelector('.sx-group[data-gi="' + gi + '"]');
            if (!box) return;
            var show = matches(root, g.when);
            box.style.display = show ? '' : 'none';
            if (show && !box._shown) box.open = true;
            box._shown = show;
          });
          if (hooks && hooks.calc) { try { hooks.calc(el, root); } catch (e) {} }
        }
        root.addEventListener('change', refresh);
        root.addEventListener('input', function (e) { if (e.target.type === 'date' || e.target.type === 'number') refresh(); });
        refresh();
      },
      collect: function (el) {
        var out = {};
        var root = el.parentNode || el;
        groups.forEach(function (g) {
          if (g.when && !matches(root, g.when)) return;
          g.f.forEach(function (f) {
            var v = readVal(el, f[0]);
            if (Array.isArray(v) ? v.length : v) out[f[0]] = v;
          });
        });
        return out;
      },
      render: function (v) {
        var rows = Object.keys(v || {}).filter(function (k) { return labels[k]; }).map(function (k) {
          return [labels[k], Array.isArray(v[k]) ? v[k].join('، ') : v[k]];
        });
        if (!rows.length) return '';
        return '<div class="table-wrap"><table><tbody>' + rows.map(function (r) {
          return '<tr><td style="width:190px;font-weight:700;">' + esc(r[0]) + '</td><td>' + esc(r[1]) + '</td></tr>';
        }).join('') + '</tbody></table></div>';
      }
    };
  }

  function setIfEmptyOrAuto(el, k, value) {
    var inp = el.querySelector('[data-xk="' + k + '"]');
    if (!inp || value == null) return;
    if (!inp.value || inp.dataset.auto === '1') { inp.value = value; inp.dataset.auto = '1'; }
  }
  function anyVal(root, k) {
    var inp = root.querySelector('[data-xk="' + k + '"]') || root.querySelector('.sp-f[data-k="' + k + '"]');
    return inp ? (inp.value || '').trim() : '';
  }

  /* ================= 1) نساء وتوليد ================= */
  SP.addSpecialty({
    id: 'obgyn', label: 'نساء وتوليد', icon: '🤰', services: ['نساء وتوليد'],
    fields: [
      { k: 'complaint', l: 'الشكوى الرئيسية', ph: 'تأخر الدورة / متابعة حمل', wide: true },
      { k: 'bp', l: 'ضغط الدم', ph: '120/80' },
      { k: 'weight', l: 'الوزن (كجم)', ph: '65' }
    ],
    sections: []
  });
  SP.addSection('obgyn', structSection('obgynHistory', '🩸 التاريخ النسائي والولادي', [
    { t: 'التاريخ النسائي (Gynecology History)', open: true, f: [
      ['menStatus', 'حالة الدورة', 's', ['', 'منتظمة', 'غير منتظمة', 'متوقفة', 'انقطاع طمث']],
      ['lmp', 'تاريخ آخر دورة (LMP)', 'd'],
      ['cycleLen', 'طول الدورة (يوم)', 'n'],
      ['regularity', 'انتظام الدورة', 's', ['', 'منتظمة', 'غير منتظمة']],
      ['duration', 'مدة الطمث (أيام)', 'n'],
      ['flow', 'كمية الطمث', 's', ['', 'قليلة', 'متوسطة', 'غزيرة']],
      ['dysmen', 'آلام الدورة (Dysmenorrhea)', 's', SEV],
      ['menarche', 'سن البلوغ (Menarche)', 'n'],
      ['menopause', 'حالة انقطاع الطمث', 's', ['', 'قبل انقطاع الطمث', 'حول انقطاع الطمث', 'بعد انقطاع الطمث']],
      ['menopauseDate', 'تاريخ انقطاع الطمث', 'd']
    ]},
    { t: 'التاريخ الولادي (Obstetric History)', f: [
      ['G', 'عدد مرات الحمل (G)', 'n'], ['P', 'عدد الولادات (P)', 'n'],
      ['A', 'الإجهاض (A)', 'n'], ['L', 'الأطفال الأحياء (L)', 'n'],
      ['prevPreg', 'حمل سابق', 'a'], ['prevDeliv', 'نوع الولادات السابقة', 'c', ['طبيعية', 'قيصرية', 'بالآلة']],
      ['cs', 'عدد القيصريات', 'n'], ['miscarriages', 'عدد الإجهاضات', 'n'],
      ['complications', 'مضاعفات حمل سابق', 'c', ['تسمم حمل', 'سكر حمل', 'نزيف', 'ولادة مبكرة', 'أخرى']],
      ['ectopic', 'حمل خارج الرحم سابقاً', 's', YN]
    ]},
    { t: 'هل المريضة حامل حالياً؟', open: true, f: [
      ['pregStatus', 'حالة الحمل', 's', ['', 'غير حامل', 'حامل', 'غير معروف']]
    ]},
    { t: 'الحمل الحالي (Current Pregnancy)', when: { k: 'pregStatus', v: 'حامل' }, f: [
      ['pLmp', 'LMP', 'd'],
      ['ga', 'عمر الحمل (أسابيع)', 't'],
      ['edd', 'موعد الولادة المتوقع (EDD)', 'd'],
      ['pregNo', 'رقم الحمل الحالي', 'n'],
      ['fhr', 'نبض الجنين (ن/د)', 'n'],
      ['pBp', 'ضغط الدم', 't'],
      ['pWeight', 'الوزن (كجم)', 'n'],
      ['fundal', 'ارتفاع قاع الرحم (سم)', 'n'],
      ['fetalMove', 'حركة الجنين', 's', ['', 'طبيعية', 'قليلة', 'غير محسوسة']],
      ['presentation', 'المجيء', 's', ['', 'رأسي', 'مقعدي', 'مستعرض', 'غير محدد']],
      ['pComp', 'مضاعفات الحمل الحالي', 'c', ['ارتفاع ضغط', 'سكر حمل', 'أنيميا', 'نزيف', 'تهديد ولادة مبكرة', 'أخرى']],
      ['highRisk', 'حمل عالي الخطورة', 's', YN]
    ]}
  ], {
    calc: function (el) {
      var lmp = anyVal(el, 'pLmp') || anyVal(el, 'lmp');
      if (!lmp) return;
      var d = new Date(lmp + 'T00:00:00');
      if (isNaN(d)) return;
      var edd = new Date(d.getTime() + 280 * 864e5).toISOString().slice(0, 10);
      var days = Math.floor((Date.now() - d.getTime()) / 864e5);
      setIfEmptyOrAuto(el, 'edd', edd);
      if (days >= 0 && days < 320) setIfEmptyOrAuto(el, 'ga', Math.floor(days / 7) + ' أسبوع + ' + (days % 7) + ' يوم');
    }
  }));
  SP.addSection('obgyn', structSection('obgynExam', '🔍 الفحص النسائي والتحاليل', [
    { t: 'الفحص النسائي (Gynecological Examination)', open: true, f: [
      ['pelvic', 'فحص الحوض', 's', NAD], ['vaginal', 'الفحص المهبلي', 's', ['', 'طبيعي', 'غير طبيعي', 'لم يُجرَ']],
      ['cervix', 'عنق الرحم', 't'], ['uterus', 'الرحم', 't'], ['adnexa', 'الملحقات', 't'],
      ['discharge', 'الإفرازات', 's', ['', 'لا يوجد', 'طبيعية', 'غير طبيعية']],
      ['bleeding', 'النزيف', 's', SEV], ['pain', 'الألم', 's', SEV],
      ['otherFind', 'نتائج أخرى', 'a']
    ]},
    { t: 'التحاليل والأشعة (Investigations)', f: [
      ['inv', 'المطلوب', 'c', ['اختبار حمل', 'صورة دم CBC', 'تحليل بول', 'فصيلة الدم', 'هرمونات', 'مسحة عنق الرحم Pap', 'سونار', 'سونار توليد', 'أخرى']],
      ['invResults', 'النتائج / تحاليل أخرى', 'a']
    ]},
    { t: 'المتابعة (Follow-up)', f: [
      ['fuDate', 'موعد المتابعة', 'd'], ['fuGa', 'عمر الحمل في الزيارة القادمة', 't'],
      ['fuInv', 'التحاليل المطلوبة', 't'], ['fuTx', 'العلاج', 't'], ['fuNotes', 'ملاحظات إضافية', 'a']
    ]}
  ]));
  SP.addSection('obgyn', SP.filesSection({ id: 'obgynFiles', title: '📎 صور السونار والتحاليل', folder: 'obgyn' }));

  /* ================= 2) أنف وأذن وحنجرة ================= */
  SP.addSpecialty({
    id: 'ent', label: 'أنف وأذن وحنجرة', icon: '👂', services: ['أنف وأذن وحنجرة'],
    fields: [
      { k: 'complaint', l: 'الشكوى الرئيسية', ph: 'ألم بالأذن اليمنى', wide: true },
      { k: 'duration', l: 'مدة الشكوى', ph: '5 أيام' },
      { k: 'temp', l: 'الحرارة (°م)', ph: '37' }
    ],
    sections: []
  });
  var EAR_SIDE = ['', 'لا يوجد', 'يمين', 'يسار', 'الجانبين'];
  SP.addSection('ent', structSection('entSymptoms', '🗣️ الأعراض', [
    { t: 'الأذن (Ear)', open: true, f: [
      ['earPain', 'ألم الأذن', 's', EAR_SIDE], ['hearingLoss', 'ضعف السمع', 's', EAR_SIDE],
      ['tinnitus', 'طنين', 's', EAR_SIDE], ['earDischarge', 'إفرازات الأذن', 's', EAR_SIDE],
      ['vertigo', 'دوخة / دوار', 's', YN]
    ]},
    { t: 'الأنف والجيوب (Nose & Sinuses)', f: [
      ['noseSx', 'الأعراض', 'c', ['انسداد الأنف', 'رشح', 'رعاف', 'فقدان الشم', 'ألم بالوجه', 'أعراض جيوب أنفية']]
    ]},
    { t: 'الحلق والحنجرة (Throat & Larynx)', f: [
      ['throatSx', 'الأعراض', 'c', ['التهاب الحلق', 'صعوبة البلع', 'بحة الصوت', 'تغير الصوت']]
    ]}
  ]));
  SP.addSection('ent', structSection('entExam', '🔍 فحص الأنف والأذن والحنجرة', [
    { t: 'الأذن', open: true, f: [
      ['rEar', 'الأذن اليمنى', 't'], ['lEar', 'الأذن اليسرى', 't'],
      ['canal', 'القناة السمعية', 's', ['', 'طبيعية', 'شمع', 'التهاب', 'إفرازات', 'جسم غريب']],
      ['tm', 'طبلة الأذن', 's', ['', 'سليمة', 'محتقنة', 'منتفخة', 'مثقوبة', 'منكمشة', 'سوائل خلفها']],
      ['hearing', 'تقييم السمع', 't']
    ]},
    { t: 'الأنف والجيوب', f: [
      ['nose', 'الأنف', 't'],
      ['septum', 'الحاجز الأنفي', 's', ['', 'مستقيم', 'منحرف يمين', 'منحرف يسار']],
      ['turbinates', 'القرنيات', 's', ['', 'طبيعية', 'متضخمة', 'محتقنة']],
      ['nasalDischarge', 'إفرازات الأنف', 's', ['', 'لا يوجد', 'مائية', 'مخاطية', 'صديدية', 'دموية']],
      ['sinuses', 'الجيوب الأنفية', 't']
    ]},
    { t: 'الحلق والرقبة', f: [
      ['throat', 'الحلق', 't'],
      ['tonsils', 'اللوزتان', 's', ['', 'طبيعية', 'متضخمة درجة 1', 'درجة 2', 'درجة 3', 'درجة 4', 'صديد', 'مستأصلة']],
      ['pharynx', 'البلعوم', 's', ['', 'طبيعي', 'محتقن', 'غير طبيعي']],
      ['larynx', 'الحنجرة', 't'], ['neck', 'الرقبة', 't'],
      ['nodes', 'الغدد الليمفاوية', 's', ['', 'غير متضخمة', 'متضخمة']]
    ]},
    { t: 'الفحوصات (Investigations)', f: [
      ['inv', 'المطلوب', 'c', ['قياس سمع Audiometry', 'قياس ضغط الأذن Tympanometry', 'منظار', 'أشعة جيوب', 'أشعة مقطعية CT', 'أشعة عادية X-ray', 'أخرى']],
      ['invResults', 'النتائج / ملاحظات', 'a']
    ]}
  ]));
  SP.addSection('ent', SP.filesSection({ id: 'entFiles', title: '📎 مرفقات (منظار / سمع / أشعة)', folder: 'ent' }));

  /* ================= 3) تجميل ================= */
  SP.addSpecialty({
    id: 'aesthetic', label: 'تجميل', icon: '✨', services: ['تجميل'],
    fields: [
      { k: 'concern', l: 'الشكوى / الاهتمام الرئيسي', ph: 'تجاعيد حول العين', wide: true },
      { k: 'goal', l: 'النتيجة المرغوبة', ph: 'مظهر طبيعي أكثر شباباً', wide: true }
    ],
    sections: []
  });
  var AREAS = ['الوجه', 'الجبهة', 'حول العين', 'الشفاه', 'الخدود', 'خط الفك', 'الذقن', 'الرقبة', 'الأنف', 'الشعر / فروة الرأس', 'الجسم', 'أخرى'];
  SP.addSection('aesthetic', structSection('aesConsult', '💬 الاستشارة وتقييم البشرة', [
    { t: 'الاستشارة التجميلية', open: true, f: [
      ['areas', 'منطقة العلاج', 'c', AREAS],
      ['skinType', 'نوع البشرة', 's', ['', 'عادية', 'دهنية', 'جافة', 'مختلطة', 'حساسة']],
      ['skinCond', 'حالة البشرة', 't'],
      ['prevProc', 'إجراءات تجميلية سابقة', 'a'],
      ['prevComp', 'مضاعفات سابقة', 't'],
      ['skincare', 'منتجات العناية الحالية', 't']
    ]},
    { t: 'تقييم البشرة (Skin Assessment)', f: [
      ['acne', 'حب الشباب', 's', SEV], ['pigment', 'التصبغات', 's', SEV],
      ['wrinkles', 'التجاعيد', 's', SEV], ['scars', 'الندبات', 's', SEV],
      ['fineLines', 'الخطوط الدقيقة', 's', SEV], ['laxity', 'ترهل الجلد', 's', SEV],
      ['redness', 'الاحمرار', 's', SEV], ['skinOther', 'نتائج أخرى', 'a']
    ]}
  ]));

  // Procedure log: repeatable rows (one visit can include several procedures)
  var PROCS = ['', 'بوتوكس', 'فيلر', 'تقشير كيميائي', 'ميكرونيدلينج', 'ليزر', 'نضارة البشرة', 'علاج الشعر', 'إجراء آخر'];
  function procRow(p) {
    p = p || {};
    function inp(k, ph, type) {
      return '<input class="pr-' + k + '" type="' + (type || 'text') + '" placeholder="' + esc(ph) + '" value="' + esc(p[k] || '') + '" />';
    }
    return '<div class="sx-proc">' +
      '<div class="grid-2 sx-grid">' +
      '<div class="field"><label>الإجراء</label><select class="pr-name">' + PROCS.map(function (o) {
        return '<option value="' + esc(o) + '"' + (o === p.name ? ' selected' : '') + '>' + (o ? esc(o) : '—') + '</option>';
      }).join('') + '</select></div>' +
      '<div class="field"><label>منطقة العلاج</label>' + inp('area', 'الجبهة') + '</div>' +
      '<div class="field"><label>التاريخ</label>' + inp('date', '', 'date') + '</div>' +
      '<div class="field"><label>المنتج / الجهاز</label>' + inp('product', 'Botulinum toxin') + '</div>' +
      '<div class="field"><label>الماركة</label>' + inp('brand', '') + '</div>' +
      '<div class="field"><label>رقم التشغيلة (Batch/Lot)</label>' + inp('lot', '') + '</div>' +
      '<div class="field"><label>الكمية / الجرعة</label>' + inp('dose', '20 وحدة') + '</div>' +
      '<div class="field"><label>موعد المتابعة المتوقع</label>' + inp('fu', '', 'date') + '</div>' +
      '<div class="field" style="grid-column:1 / -1;"><label>ملاحظات الإجراء</label>' + inp('notes', '') + '</div>' +
      '<div class="field" style="grid-column:1 / -1;"><label>تعليمات الطبيب</label>' + inp('instr', 'تجنب التدليك 24 ساعة') + '</div>' +
      '</div><button type="button" class="btn small danger pr-del">🗑 حذف الإجراء</button></div>';
  }
  var PR_KEYS = ['name', 'area', 'date', 'product', 'brand', 'lot', 'dose', 'fu', 'notes', 'instr'];
  var PR_LABELS = ['الإجراء', 'المنطقة', 'التاريخ', 'المنتج', 'الماركة', 'التشغيلة', 'الجرعة', 'المتابعة', 'ملاحظات', 'التعليمات'];
  SP.addSection('aesthetic', {
    id: 'aesProcedures',
    title: '💉 الإجراءات التجميلية',
    html: function (v) {
      var rows = (v && v.length) ? v : [];
      return '<p class="muted">لا يلغي الإجراء الزيارة العادية — يمكن إضافة التشخيص والروشتة والتحاليل كالمعتاد.</p>' +
        '<div class="sx-procs">' + rows.map(procRow).join('') + '</div>' +
        '<button type="button" class="btn ghost sx-add-proc">+ إضافة إجراء</button>';
    },
    wire: function (el) {
      var box = el.querySelector('.sx-procs');
      function bindDel() {
        box.querySelectorAll('.pr-del').forEach(function (b) {
          b.onclick = function () { b.closest('.sx-proc').remove(); };
        });
      }
      el.querySelector('.sx-add-proc').addEventListener('click', function () {
        box.insertAdjacentHTML('beforeend', procRow({ date: new Date().toISOString().slice(0, 10) }));
        bindDel();
      });
      bindDel();
    },
    collect: function (el) {
      var out = [];
      el.querySelectorAll('.sx-proc').forEach(function (r) {
        var o = {}, any = false;
        PR_KEYS.forEach(function (k) {
          var i = r.querySelector('.pr-' + k);
          var v = i ? (i.value || '').trim() : '';
          if (v) { o[k] = v; any = true; }
        });
        if (any) out.push(o);
      });
      return out.length ? out : null;
    },
    render: function (v) {
      if (!v || !v.length) return '';
      return SP.tableHtml(PR_LABELS, v.map(function (p) { return PR_KEYS.map(function (k) { return p[k] || ''; }); }));
    }
  });
  SP.addSection('aesthetic', SP.filesSection({ id: 'aesPhotos', title: '📷 صور قبل / بعد', folder: 'aesthetic', hint: 'أرفق صور قبل وبعد الإجراء (JPG / PNG).' }));

  /* ================= 4) جهاز هضمي ================= */
  SP.addSpecialty({
    id: 'gastro', label: 'جهاز هضمي', icon: '🫃', services: ['جهاز هضمي'],
    fields: [
      { k: 'complaint', l: 'الشكوى الرئيسية', ph: 'ألم أعلى البطن', wide: true },
      { k: 'duration', l: 'مدة الشكوى', ph: 'شهر' },
      { k: 'weight', l: 'الوزن (كجم)', ph: '75' }
    ],
    sections: []
  });
  var GI_PAIN = 'ألم بالبطن';
  SP.addSection('gastro', structSection('giSymptoms', '🩻 الأعراض الهضمية', [
    { t: 'الأعراض (Gastrointestinal Symptoms)', open: true, f: [
      ['sx', 'الأعراض', 'c', [GI_PAIN, 'غثيان', 'قيء', 'حرقة', 'ارتجاع', 'صعوبة البلع', 'انتفاخ', 'عسر هضم', 'إسهال', 'إمساك', 'دم في البراز', 'براز أسود', 'صفراء', 'فقدان وزن', 'فقدان شهية']]
    ]},
    { t: 'تفاصيل ألم البطن', when: { k: 'sx', v: GI_PAIN }, f: [
      ['painSite', 'المكان', 's', ['', 'أعلى البطن (Epigastric)', 'المراق الأيمن', 'المراق الأيسر', 'حول السرة', 'أسفل البطن', 'الحفرة الحرقفية اليمنى', 'الحفرة الحرقفية اليسرى', 'منتشر']],
      ['painDur', 'المدة', 't'],
      ['painSev', 'الشدة (0-10)', 's', ['', '0', '1', '2', '3', '4', '5', '6', '7', '8', '9', '10']],
      ['painChar', 'الطبيعة', 's', ['', 'حارق', 'مغص', 'طاعن', 'ضاغط', 'ممل']],
      ['painRad', 'الانتشار', 't'],
      ['painMeal', 'العلاقة بالأكل', 's', ['', 'لا علاقة', 'يزيد بعد الأكل', 'يقل بعد الأكل', 'على معدة فارغة']],
      ['painAgg', 'عوامل تزيده', 't'], ['painRel', 'عوامل تخففه', 't']
    ]}
  ]));
  SP.addSection('gastro', structSection('giExam', '🔍 الفحص والكبد والتحاليل', [
    { t: 'فحص البطن (GI Examination)', open: true, f: [
      ['inspection', 'المعاينة', 't'],
      ['tender', 'الإيلام', 's', SEV], ['guarding', 'التصلب الدفاعي', 's', YN],
      ['rigidity', 'التيبس', 's', YN], ['distension', 'الانتفاخ', 's', YN],
      ['mass', 'كتلة محسوسة', 's', YN],
      ['bowel', 'أصوات الأمعاء', 's', ['', 'طبيعية', 'زائدة', 'ضعيفة', 'غائبة']],
      ['liver', 'الكبد', 's', ['', 'غير محسوس', 'متضخم']],
      ['spleen', 'الطحال', 's', ['', 'غير محسوس', 'متضخم']],
      ['giOther', 'نتائج أخرى', 'a']
    ]},
    { t: 'الكبد والقنوات المرارية', f: [
      ['jaundice', 'صفراء', 's', YN],
      ['hepatitis', 'تاريخ التهاب كبدي', 's', ['', 'لا', 'فيروس B', 'فيروس C', 'أخرى']],
      ['liverDz', 'مرض كبدي', 't'], ['gallstones', 'حصوات مرارة', 's', YN],
      ['liverProc', 'إجراءات كبدية سابقة', 't'], ['alcohol', 'تاريخ تناول الكحول', 's', ['', 'لا', 'نعم', 'سابقاً']],
      ['liverExam', 'فحص الكبد', 't']
    ]},
    { t: 'الفحوصات (Investigations)', f: [
      ['inv', 'المطلوب', 'c', ['صورة دم CBC', 'وظائف كبد', 'وظائف كلى', 'أميليز / ليبيز', 'جرثومة المعدة H. pylori', 'تحليل براز', 'سونار بطن', 'أشعة مقطعية CT', 'رنين MRI', 'منظار علوي', 'منظار قولون', 'أخرى']],
      ['invResults', 'النتائج / ملاحظات', 'a']
    ]},
    { t: 'المتابعة', f: [
      ['diet', 'توصيات غذائية', 'a'], ['fuInv', 'التحاليل المطلوبة', 't'], ['fuDate', 'موعد المتابعة', 'd']
    ]}
  ]));
  SP.addSection('gastro', SP.filesSection({ id: 'giFiles', title: '📎 مرفقات (منظار / أشعة / تحاليل)', folder: 'gastro' }));

  /* ================= 5) باطنة ================= */
  SP.addSpecialty({
    id: 'internal', label: 'باطنة', icon: '🫀', services: ['باطنة'],
    fields: [
      { k: 'complaint', l: 'الشكوى الرئيسية', ph: 'إرهاق وعطش', wide: true },
      { k: 'exam', l: 'الفحص العام', ph: 'واعٍ، متعاون...', area: true }
    ],
    sections: []
  });
  SP.addSection('internal', structSection('imVitals', '❤️ العلامات الحيوية والأعراض العامة', [
    { t: 'العلامات الحيوية (Vital Signs)', open: true, f: [
      ['bp', 'ضغط الدم', 't'], ['hr', 'النبض (ن/د)', 'n'], ['rr', 'معدل التنفس', 'n'],
      ['temp', 'الحرارة (°م)', 'n'], ['spo2', 'تشبع الأكسجين %', 'n'],
      ['weight', 'الوزن (كجم)', 'n'], ['height', 'الطول (سم)', 'n'], ['bmi', 'مؤشر كتلة الجسم BMI', 't']
    ]},
    { t: 'الأعراض العامة', f: [
      ['general', 'الأعراض', 'c', ['حرارة', 'إرهاق', 'فقدان وزن', 'زيادة وزن', 'ضعف عام', 'فقدان شهية', 'تعرق ليلي']]
    ]}
  ], {
    calc: function (el) {
      var w = parseFloat(anyVal(el, 'weight')), h = parseFloat(anyVal(el, 'height'));
      if (w > 0 && h > 0) setIfEmptyOrAuto(el, 'bmi', (w / Math.pow(h / 100, 2)).toFixed(1));
    }
  }));
  SP.addSection('internal', structSection('imSystems', '🔍 مراجعة الأجهزة', [
    { t: 'القلب والأوعية', f: [
      ['cvs', 'الأعراض', 'c', ['ألم بالصدر', 'خفقان', 'ضيق تنفس', 'تورم الساقين']], ['cvsExam', 'فحص القلب', 't']
    ]},
    { t: 'الجهاز التنفسي', f: [
      ['resp', 'الأعراض', 'c', ['كحة', 'بلغم', 'صفير', 'ضيق تنفس']], ['respExam', 'فحص الصدر', 't']
    ]},
    { t: 'الجهاز الهضمي', f: [
      ['gi', 'الأعراض', 'c', ['ألم بالبطن', 'غثيان', 'قيء', 'إسهال', 'إمساك']], ['giExam', 'فحص البطن', 't']
    ]},
    { t: 'الجهاز العصبي', f: [
      ['neuro', 'الأعراض', 'c', ['صداع', 'ضعف', 'تنميل', 'دوخة']], ['neuroExam', 'نتائج الفحص العصبي', 't']
    ]},
    { t: 'الغدد الصماء', f: [
      ['endo', 'الأعراض / الأمراض', 'c', ['سكر', 'أمراض الغدة الدرقية', 'عطش زائد', 'كثرة التبول', 'عدم تحمل الحر/البرد']]
    ]},
    { t: 'العضلات والمفاصل', f: [
      ['msk', 'الأعراض', 'c', ['ألم المفاصل', 'ألم العضلات', 'تورم', 'صعوبة الحركة']]
    ]}
  ]));
  var CTRL = ['', 'منضبط', 'غير منضبط', 'تحت التقييم'];
  SP.addSection('internal', structSection('imChronic', '📈 متابعة الأمراض المزمنة والتحاليل', [
    { t: 'الأمراض المزمنة (Chronic Disease Management)', open: true, f: [
      ['dm', 'السكر', 's', CTRL], ['htn', 'الضغط', 's', CTRL], ['lipid', 'الدهون', 's', CTRL],
      ['thyroid', 'الغدة الدرقية', 's', CTRL], ['asthma', 'الربو / السدة الرئوية', 's', CTRL],
      ['ckd', 'الفشل الكلوي المزمن', 's', CTRL], ['chronicOther', 'أمراض مزمنة أخرى', 't']
    ]},
    { t: 'الفحوصات (Investigations)', f: [
      ['inv', 'المطلوب', 'c', ['صورة دم CBC', 'سكر', 'سكر تراكمي HbA1c', 'دهون', 'وظائف كلى', 'وظائف كبد', 'وظائف غدة درقية', 'أملاح', 'رسم قلب ECG', 'أشعة عادية', 'سونار', 'أشعة مقطعية CT', 'رنين MRI', 'أخرى']],
      ['invResults', 'النتائج / ملاحظات', 'a']
    ]}
  ]));
  SP.addSection('internal', SP.filesSection({ id: 'imFiles', title: '📎 مرفقات (تحاليل / أشعة / رسم قلب)', folder: 'internal' }));

  // Admin picker may already be drawn — redraw so the five new options appear.
  document.dispatchEvent(new Event('clinic-specialties-registered'));
})();
