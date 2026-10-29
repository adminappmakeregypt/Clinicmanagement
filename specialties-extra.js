// ============ Extra specialty modules (v38) ============
// نساء وتوليد • أنف وأذن وحنجرة • تجميل • جهاز هضمي • باطنة
// v70: + مسالك • قلب • مخ وأعصاب • صدر • سكر وغدد • جراحة عامة • علاج طبيعي • أمراض نفسية
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

  /* ================= v70) تخصصات إضافية: مسالك • قلب • مخ وأعصاب • صدر • سكر وغدد • جراحة عامة • علاج طبيعي • نفسية =================
     Same architecture as the five above: SP.addSpecialty + structSection, saved inside exam.sections.
     New ids only (urology, cardiology, neurology, chest, endocrine, surgery, physio, psychiatry) — no existing id or saved record changes. */
  (function () {
    var N10 = ['', '0', '1', '2', '3', '4', '5', '6', '7', '8', '9', '10'];
    var MMT = ['', '0/5', '1/5', '2/5', '3/5', '4/5', '5/5'];
    var SIDE = ['', 'يمين', 'يسار', 'الجانبين'];
    var NOTE = ['', 'لا', 'نعم'];
    var FU = function (extra) {
      return { t: 'الخطة والمتابعة', f: (extra || []).concat([
        ['plan', 'الخطة العلاجية', 'a'], ['fuInv', 'الفحوصات المطلوبة قبل المتابعة', 't'], ['fuDate', 'موعد المتابعة', 'd']
      ]) };
    };

    /* ---------- 1) مسالك بولية ---------- */
    SP.addSpecialty({
      id: 'urology', label: 'مسالك بولية', icon: '💧', services: ['مسالك بولية'],
      fields: [
        { k: 'complaint', l: 'الشكوى الرئيسية', ph: 'حرقان في البول / ألم في الخاصرة', wide: true },
        { k: 'duration', l: 'مدة الشكوى', ph: 'أسبوعان' },
        { k: 'weight', l: 'الوزن (كجم)', ph: '80' }
      ],
      sections: []
    });
    var UR_COLIC = 'ألم بالخاصرة / مغص كلوي';
    SP.addSection('urology', structSection('urSymptoms', '💧 أعراض المسالك البولية', [
      { t: 'الأعراض (Urinary Symptoms)', open: true, f: [
        ['sx', 'الأعراض', 'c', ['تكرار التبول', 'إلحاح بولي', 'تبول ليلي (Nocturia)', 'ضعف تيار البول', 'تقطع التبول', 'تأخر بدء التبول', 'حرقان أثناء التبول', 'سلس البول', 'دم في البول', 'إحساس بتفريغ غير كامل', 'احتباس بولي', UR_COLIC, 'تغير لون / رائحة البول']],
        ['ipss', 'مجموع IPSS (0-35)', 'n'],
        ['qol', 'تأثير الأعراض على جودة الحياة (0-6)', 's', ['', '0', '1', '2', '3', '4', '5', '6']],
        ['fever', 'حرارة / رعشة', 's', NOTE]
      ]},
      { t: 'تفاصيل ألم الخاصرة / المغص الكلوي', when: { k: 'sx', v: UR_COLIC }, f: [
        ['colicSide', 'الجهة', 's', SIDE],
        ['colicDur', 'المدة', 't'],
        ['colicSev', 'الشدة (0-10)', 's', N10],
        ['colicRad', 'الانتشار', 's', ['', 'الخصية / الأربية', 'أسفل البطن', 'الظهر', 'لا ينتشر']],
        ['colicNausea', 'غثيان / قيء', 's', NOTE],
        ['colicPast', 'حصوات سابقة', 's', NOTE]
      ]},
      { t: 'الوظيفة الجنسية والعقم (Sexual & Fertility)', f: [
        ['erection', 'الانتصاب', 's', ['', 'طبيعي', 'ضعيف', 'غير قادر']],
        ['libido', 'الرغبة الجنسية', 's', ['', 'طبيعية', 'ضعيفة', 'زائدة']],
        ['ejac', 'القذف', 's', ['', 'طبيعي', 'سريع', 'متأخر', 'غائب', 'قذف راجع']],
        ['infDur', 'مدة تأخر الإنجاب', 't'],
        ['semenLast', 'آخر تحليل سائل منوي', 't']
      ]}
    ]));
    SP.addSection('urology', structSection('urExam', '🔍 الفحص والتحاليل', [
      { t: 'الفحص الإكلينيكي (Urological Examination)', open: true, f: [
        ['renalAngle', 'إيلام الزاوية الكلوية', 's', SIDE],
        ['bladder', 'المثانة ممتلئة / محسوسة', 's', NOTE],
        ['genitalia', 'الأعضاء التناسلية الخارجية', 't'],
        ['testes', 'الخصيتان', 's', ['', 'طبيعيتان', 'ضمور', 'ورم / كتلة', 'ألم', 'خصية غير نازلة']],
        ['varicocele', 'دوالي الحبل المنوي', 's', ['', 'لا يوجد', 'درجة 1', 'درجة 2', 'درجة 3']],
        ['hernia', 'فتق', 's', NOTE],
        ['dre', 'فحص البروستاتا بالإصبع (DRE)', 's', ['', 'طبيعية', 'متضخمة', 'صلبة / عقدة', 'مؤلمة']],
        ['prostateSize', 'حجم البروستاتا', 't'],
        ['urExamOther', 'نتائج أخرى', 'a']
      ]},
      { t: 'الفحوصات (Investigations)', f: [
        ['inv', 'المطلوب', 'c', ['تحليل بول', 'مزرعة بول', 'PSA', 'وظائف كلى', 'سونار مسالك بولية', 'سونار بروستاتا / مثانة', 'أشعة مقطعية على المسالك CT', 'أشعة بالصبغة', 'تحليل سائل منوي', 'قياس الدفق البولي (Uroflowmetry)', 'منظار مثانة', 'هرمونات الذكورة']],
        ['invResults', 'النتائج / ملاحظات', 'a'],
        ['psa', 'PSA (ng/ml)', 'n'],
        ['pvr', 'بول متبقي بعد التبول (مل)', 'n'],
        ['stoneSize', 'حجم الحصوة (مم)', 'n'],
        ['stoneSite', 'مكان الحصوة', 's', ['', 'الكلية', 'الحالب العلوي', 'الحالب الأوسط', 'الحالب السفلي', 'المثانة', 'غير محدد']]
      ]},
      FU([['procedure', 'الإجراء / العملية المقترحة', 't']])
    ]));
    SP.addSection('urology', SP.filesSection({ id: 'urFiles', title: '📎 مرفقات (سونار / أشعة / تحاليل)', folder: 'urology' }));

    /* ---------- 2) قلب ---------- */
    SP.addSpecialty({
      id: 'cardiology', label: 'قلب وأوعية دموية', icon: '💓', services: ['قلب وأوعية دموية'],
      fields: [
        { k: 'complaint', l: 'الشكوى الرئيسية', ph: 'ألم بالصدر عند المجهود', wide: true },
        { k: 'bp', l: 'ضغط الدم', ph: '120/80' },
        { k: 'pulse', l: 'النبض (ن/د)', ph: '78' }
      ],
      sections: []
    });
    var CD_PAIN = 'ألم بالصدر';
    SP.addSection('cardiology', structSection('cardHistory', '💓 الأعراض وعوامل الخطورة', [
      { t: 'الأعراض (Cardiac Symptoms)', open: true, f: [
        ['sx', 'الأعراض', 'c', [CD_PAIN, 'ضيق نفس', 'ضيق نفس عند النوم', 'خفقان', 'دوخة', 'إغماء', 'تورم القدمين', 'تعب عند المجهود', 'سعال ليلي', 'ألم بالساقين عند المشي']],
        ['nyha', 'درجة التعب (NYHA)', 's', ['', 'I — بدون أعراض', 'II — أعراض مع المجهود العادي', 'III — أعراض مع مجهود بسيط', 'IV — أعراض أثناء الراحة']]
      ]},
      { t: 'تفاصيل ألم الصدر', when: { k: 'sx', v: CD_PAIN }, f: [
        ['painSite', 'المكان', 's', ['', 'خلف القص', 'يسار الصدر', 'يمين الصدر', 'أعلى البطن', 'الظهر']],
        ['painChar', 'الطبيعة', 's', ['', 'ضاغط / ثقل', 'طاعن', 'حارق', 'يتغير مع التنفس']],
        ['painDur', 'المدة', 't'],
        ['painTrig', 'يحدث عند', 's', ['', 'المجهود', 'الراحة', 'بعد الأكل', 'الانفعال', 'تغيير الوضع']],
        ['painRel', 'يخف مع', 's', ['', 'الراحة', 'نيتروجليسرين', 'مضاد حموضة', 'لا يخف']],
        ['painRad', 'الانتشار', 's', ['', 'الذراع اليسرى', 'الفك / الرقبة', 'الظهر', 'لا ينتشر']]
      ]},
      { t: 'عوامل الخطورة (Risk Factors)', f: [
        ['rf', 'عوامل الخطورة', 'c', ['ضغط مرتفع', 'سكر', 'دهون مرتفعة', 'تدخين', 'تاريخ عائلي لأمراض القلب', 'سمنة', 'قلة الحركة', 'فشل كلوي']],
        ['packYears', 'التدخين (علبة / سنة)', 'n'],
        ['cardHx', 'تاريخ قلبي سابق', 'c', ['جلطة قلبية', 'دعامات / قسطرة علاجية', 'جراحة قلب مفتوح', 'مرض بالصمامات', 'عدم انتظام النبض', 'فشل القلب', 'جلطة / سكتة دماغية', 'جهاز تنظيم النبض']],
        ['cardMeds', 'الأدوية الحالية', 'a']
      ]}
    ]));
    SP.addSection('cardiology', structSection('cardExam', '🩺 الفحص والتخطيط والإيكو', [
      { t: 'الفحص الإكلينيكي (Cardiac Examination)', open: true, f: [
        ['bpR', 'الضغط — الذراع اليمنى', 't'], ['bpL', 'الضغط — الذراع اليسرى', 't'],
        ['hr', 'النبض (ن/د)', 'n'], ['spo2', 'تشبع الأكسجين %', 'n'],
        ['rhythm', 'انتظام النبض', 's', ['', 'منتظم', 'غير منتظم']],
        ['jvp', 'أوردة الرقبة (JVP)', 's', ['', 'طبيعية', 'مرتفعة']],
        ['sounds', 'أصوات القلب', 's', ['', 'طبيعية (S1 S2)', 'صوت ثالث S3', 'صوت رابع S4', 'خافتة']],
        ['murmur', 'النفخات', 's', ['', 'لا يوجد', 'انقباضية', 'انبساطية', 'مستمرة']],
        ['murmurGrade', 'درجة النفخة / مكانها', 't'],
        ['chestEx', 'الصدر', 's', ['', 'سليم', 'خراخر قاعدية', 'أزيز', 'انصباب']],
        ['edema', 'تورم القدمين', 's', ['', 'لا يوجد', 'خفيف', 'متوسط', 'شديد']],
        ['pulses', 'النبض الطرفي', 's', NAD],
        ['carotid', 'نفخة بالشريان السباتي', 's', NOTE]
      ]},
      { t: 'رسم القلب (ECG)', f: [
        ['ecgRate', 'معدل القلب', 'n'],
        ['ecgRhythm', 'الإيقاع', 's', ['', 'جيبي منتظم', 'رجفان أذيني', 'رفرفة أذينية', 'سرعة قلب', 'بطء قلب', 'انقباضات مبكرة', 'غير ذلك']],
        ['ecgST', 'تغيرات ST-T', 's', ['', 'لا يوجد', 'ارتفاع ST', 'انخفاض ST', 'انقلاب موجة T']],
        ['ecgBlock', 'حصار', 's', ['', 'لا يوجد', 'حصار فرع أيمن', 'حصار فرع أيسر', 'حصار أذيني بطيني']],
        ['qtc', 'QTc (م.ث)', 'n'],
        ['ecgNote', 'التفسير', 'a']
      ]},
      { t: 'الإيكو (Echocardiography)', f: [
        ['ef', 'الكسر القذفي EF %', 'n'],
        ['lvFn', 'وظيفة البطين الأيسر', 's', ['', 'طبيعية', 'ضعف خفيف', 'ضعف متوسط', 'ضعف شديد']],
        ['valves', 'الصمامات', 't'],
        ['wall', 'حركة الجدار', 't'],
        ['effusion', 'انصباب حول التامور', 's', NOTE],
        ['echoNote', 'ملاحظات الإيكو', 'a']
      ]},
      { t: 'الفحوصات (Investigations)', f: [
        ['inv', 'المطلوب', 'c', ['تخطيط قلب ECG', 'إيكو على القلب', 'اختبار مجهود', 'هولتر رسم قلب 24 ساعة', 'هولتر ضغط 24 ساعة', 'تحليل دهون', 'تروبونين', 'صورة دم CBC', 'وظائف كلى', 'وظائف غدة درقية', 'أشعة مقطعية على الشرايين التاجية', 'قسطرة تشخيصية', 'دوبلر على الأوعية']],
        ['invResults', 'النتائج / ملاحظات', 'a']
      ]},
      FU([['riskLevel', 'تقدير الخطورة', 's', ['', 'منخفضة', 'متوسطة', 'عالية']]])
    ]));
    SP.addSection('cardiology', SP.filesSection({ id: 'cardFiles', title: '📎 مرفقات (رسم قلب / إيكو / قسطرة / تحاليل)', folder: 'cardiology' }));

    /* ---------- 3) مخ وأعصاب ---------- */
    SP.addSpecialty({
      id: 'neurology', label: 'مخ وأعصاب', icon: '🧠', services: ['مخ وأعصاب'],
      fields: [
        { k: 'complaint', l: 'الشكوى الرئيسية', ph: 'صداع متكرر / تنميل', wide: true },
        { k: 'duration', l: 'مدة الشكوى', ph: 'شهر' },
        { k: 'age', l: 'العمر (سنة)', ph: '40' }
      ],
      sections: []
    });
    var NE_HEAD = 'صداع', NE_SEIZ = 'تشنجات';
    SP.addSection('neurology', structSection('neuroHistory', '🧠 التاريخ المرضي العصبي', [
      { t: 'الأعراض (Neurological Symptoms)', open: true, f: [
        ['sx', 'الأعراض', 'c', [NE_HEAD, 'دوخة / دوار', 'فقدان وعي', NE_SEIZ, 'تنميل', 'ضعف بالأطراف', 'رعشة', 'اضطراب الكلام', 'اضطراب الرؤية', 'ضعف الذاكرة', 'اضطراب المشي', 'ألم عصبي', 'اضطراب النوم']],
        ['onset', 'طريقة البداية', 's', ['', 'مفاجئة', 'تدريجية']],
        ['course', 'سير الحالة', 's', ['', 'ثابتة', 'تتحسن', 'تزداد سوءاً', 'نوبات متكررة']]
      ]},
      { t: 'تفاصيل الصداع', when: { k: 'sx', v: NE_HEAD }, f: [
        ['hType', 'النوع المرجح', 's', ['', 'صداع نصفي (Migraine)', 'صداع توتري', 'صداع عنقودي', 'صداع بسبب الإفراط في المسكنات', 'غير محدد']],
        ['hSite', 'المكان', 's', ['', 'جانب واحد', 'الجانبين', 'الجبهة', 'خلف الرأس', 'حول العين']],
        ['hFreq', 'عدد المرات / الشهر', 'n'],
        ['hDur', 'مدة النوبة', 't'],
        ['hSev', 'الشدة (0-10)', 's', N10],
        ['hAura', 'هالة (Aura)', 's', NOTE],
        ['hNausea', 'غثيان / قيء', 's', NOTE],
        ['hPhoto', 'حساسية للضوء / الصوت', 's', NOTE],
        ['hTrig', 'المحفزات', 't'],
        ['hMeds', 'المسكنات المستخدمة', 't']
      ]},
      { t: 'تفاصيل التشنجات', when: { k: 'sx', v: NE_SEIZ }, f: [
        ['sType', 'النوع', 's', ['', 'تشنج عام', 'تشنج جزئي', 'غياب (Absence)', 'غير معروف']],
        ['sFreq', 'التكرار', 't'],
        ['sLast', 'آخر نوبة', 'd'],
        ['sAura', 'إنذار قبل النوبة', 's', NOTE],
        ['sTongue', 'عض اللسان / تبول لا إرادي', 's', NOTE],
        ['sPost', 'خمول بعد النوبة', 's', NOTE],
        ['sTrig', 'العوامل المحفزة', 't'],
        ['sMeds', 'أدوية الصرع الحالية', 't']
      ]},
      { t: 'التاريخ الطبي', f: [
        ['pmh', 'أمراض سابقة', 'c', ['ضغط مرتفع', 'سكر', 'سكتة دماغية', 'إصابة بالرأس', 'التهاب سحايا / مخ', 'ورم', 'مرض بالقلب', 'اضطراب نفسي']],
        ['famHx', 'تاريخ عائلي عصبي', 't'],
        ['neuroMeds', 'الأدوية الحالية', 'a']
      ]}
    ]));
    SP.addSection('neurology', structSection('neuroExam', '🔍 الفحص العصبي والفحوصات', [
      { t: 'الحالة الذهنية (Mental Status)', open: true, f: [
        ['gcs', 'مقياس غلاسكو GCS (3-15)', 'n'],
        ['orient', 'التوجه', 's', ['', 'سليم', 'اضطراب بالزمان', 'اضطراب بالمكان', 'اضطراب بالأشخاص']],
        ['speech', 'الكلام', 's', ['', 'طبيعي', 'ثقل بالنطق', 'صعوبة إيجاد الكلمات', 'عدم فهم الكلام']],
        ['memory', 'الذاكرة', 's', ['', 'سليمة', 'ضعف قريب', 'ضعف شديد']],
        ['mmse', 'MMSE / MoCA', 't']
      ]},
      { t: 'الأعصاب القحفية والعين', f: [
        ['cn', 'الأعصاب القحفية', 's', NAD],
        ['pupils', 'الحدقتان', 's', ['', 'متساويتان وتستجيبان', 'غير متساويتين', 'لا تستجيبان']],
        ['eyeMov', 'حركة العين', 's', ['', 'طبيعية', 'شلل بعصب', 'رأرأة (Nystagmus)']],
        ['face', 'الوجه', 's', ['', 'متماثل', 'ضعف الوجه جهة واحدة', 'ضعف الوجه الجانبين']],
        ['fundus', 'قاع العين', 't'],
        ['cnNote', 'ملاحظات', 'a']
      ]},
      { t: 'الحركة والإحساس (Motor & Sensory)', f: [
        ['pRUL', 'قوة الذراع اليمنى', 's', MMT], ['pLUL', 'قوة الذراع اليسرى', 's', MMT],
        ['pRLL', 'قوة الساق اليمنى', 's', MMT], ['pLLL', 'قوة الساق اليسرى', 's', MMT],
        ['tone', 'قوة الشد العضلي (Tone)', 's', ['', 'طبيعي', 'زيادة (تيبس)', 'نقص']],
        ['reflex', 'ردود الأفعال الوترية', 's', ['', 'طبيعية', 'زائدة', 'ضعيفة', 'غائبة']],
        ['plantar', 'علامة بابنسكي', 's', ['', 'سالبة', 'موجبة يمين', 'موجبة يسار', 'موجبة الجانبين']],
        ['sensory', 'الإحساس', 's', ['', 'سليم', 'نقص باللمس', 'نقص بالألم', 'نقص بالاهتزاز', 'تنميل']],
        ['sensLevel', 'مستوى / توزيع الإحساس', 't']
      ]},
      { t: 'التوازن والمشية', f: [
        ['coord', 'التناسق (أنف — إصبع)', 's', NAD],
        ['gait', 'المشية', 's', ['', 'طبيعية', 'غير متزنة', 'عرجاء', 'مشية شلل نصفي', 'مشية باركنسونية', 'غير قادر على المشي']],
        ['romberg', 'اختبار رومبرج', 's', ['', 'سلبي', 'إيجابي']],
        ['meningeal', 'علامات تهيج السحايا', 's', NOTE],
        ['tremor', 'رعشة', 's', ['', 'لا يوجد', 'أثناء الراحة', 'أثناء الحركة', 'وضعية']]
      ]},
      { t: 'الفحوصات (Investigations)', f: [
        ['inv', 'المطلوب', 'c', ['رنين مغناطيسي على المخ', 'أشعة مقطعية على المخ', 'رنين على العمود الفقري', 'رسم مخ EEG', 'رسم أعصاب وعضلات EMG / NCV', 'دوبلر على شرايين الرقبة', 'تحاليل دم', 'تحليل فيتامين B12 / D', 'بزل قطني', 'اختبار نوم']],
        ['invResults', 'النتائج / ملاحظات', 'a']
      ]},
      FU()
    ]));
    SP.addSection('neurology', SP.filesSection({ id: 'neuroFiles', title: '📎 مرفقات (رنين / مقطعية / رسم مخ)', folder: 'neurology' }));

    /* ---------- 4) صدر ---------- */
    SP.addSpecialty({
      id: 'chest', label: 'صدر وجهاز تنفسي', icon: '🫁', services: ['صدر وجهاز تنفسي'],
      fields: [
        { k: 'complaint', l: 'الشكوى الرئيسية', ph: 'كحة وضيق نفس', wide: true },
        { k: 'duration', l: 'مدة الشكوى', ph: 'أسبوعان' },
        { k: 'spo2', l: 'تشبع الأكسجين %', ph: '97' }
      ],
      sections: []
    });
    var CH_COUGH = 'كحة';
    SP.addSection('chest', structSection('chestHistory', '🫁 الأعراض والتعرض', [
      { t: 'الأعراض (Respiratory Symptoms)', open: true, f: [
        ['sx', 'الأعراض', 'c', [CH_COUGH, 'ضيق نفس', 'أزيز', 'ألم بالصدر', 'نفث دم', 'حرارة', 'تعرق ليلي', 'شخير / انقطاع نفس أثناء النوم', 'فقدان وزن', 'عدم تحمل المجهود']],
        ['mmrc', 'ضيق النفس (mMRC)', 's', ['', '0 — بدون', '1 — مع الجري أو التسلق', '2 — يمشي أبطأ من أقرانه', '3 — يتوقف بعد 100 متر', '4 — لا يخرج من المنزل']]
      ]},
      { t: 'تفاصيل الكحة', when: { k: 'sx', v: CH_COUGH }, f: [
        ['cDur', 'المدة', 't'],
        ['cType', 'النوع', 's', ['', 'جافة', 'ببلغم']],
        ['cSputum', 'لون البلغم', 's', ['', 'شفاف', 'أبيض', 'أصفر', 'أخضر', 'دموي']],
        ['cTime', 'وقت الزيادة', 's', ['', 'ليلاً', 'صباحاً', 'مع المجهود', 'طوال اليوم', 'مع التعرض لمحفز']]
      ]},
      { t: 'التدخين والتعرض (Smoking & Exposure)', f: [
        ['smoking', 'التدخين', 's', ['', 'لا', 'مدخن حالياً', 'مدخن سابقاً', 'مدخن سلبي']],
        ['packYears', 'علبة / سنة', 'n'],
        ['exposure', 'تعرض مهني / بيئي', 'c', ['غبار', 'كيماويات', 'دخان', 'طيور / حيوانات', 'عفن / رطوبة', 'أسبستوس']],
        ['tbContact', 'مخالطة مريض درن', 's', NOTE],
        ['pmh', 'تاريخ مرضي', 'c', ['ربو', 'انسداد رئوي مزمن COPD', 'درن سابق', 'التهاب رئوي متكرر', 'حساسية الأنف', 'ارتجاع', 'جلطة رئوية', 'سرطان']],
        ['chMeds', 'الأدوية / البخاخات الحالية', 'a']
      ]}
    ]));
    SP.addSection('chest', structSection('chestExam', '🔍 الفحص ووظائف التنفس', [
      { t: 'الفحص الإكلينيكي (Chest Examination)', open: true, f: [
        ['rr', 'معدل التنفس', 'n'], ['hr', 'النبض (ن/د)', 'n'], ['temp', 'الحرارة (°م)', 'n'],
        ['cyanosis', 'زرقة', 's', NOTE], ['clubbing', 'تعجر الأصابع', 's', NOTE],
        ['expansion', 'حركة الصدر', 's', ['', 'متماثلة', 'ضعيفة يمين', 'ضعيفة يسار', 'ضعيفة الجانبين']],
        ['percussion', 'القرع', 's', ['', 'رنين طبيعي', 'كتمة', 'طبلي']],
        ['auscult', 'السمع', 's', ['', 'حويصلي طبيعي', 'ضعف دخول هواء', 'أزيز', 'خراخر', 'صرير']],
        ['auscSide', 'الجهة', 's', SIDE],
        ['chExamNote', 'ملاحظات', 'a']
      ]},
      { t: 'وظائف التنفس (Spirometry)', f: [
        ['pef', 'أقصى تدفق زفيري (لتر / دقيقة)', 'n'],
        ['fev1', 'FEV1 %', 'n'], ['fvc', 'FVC %', 'n'], ['ratio', 'FEV1 / FVC %', 'n'],
        ['spiro', 'التفسير', 's', ['', 'طبيعي', 'انسدادي', 'تقييدي', 'مختلط']],
        ['reversibility', 'الاستجابة للموسع', 's', ['', 'لا يوجد', 'موجبة', 'غير مختبرة']]
      ]},
      { t: 'الفحوصات (Investigations)', f: [
        ['inv', 'المطلوب', 'c', ['أشعة عادية على الصدر', 'أشعة مقطعية على الصدر', 'وظائف تنفس Spirometry', 'غازات الدم', 'تحليل بلغم', 'مزرعة بلغم', 'تحليل درن (Xpert)', 'اختبار حساسية', 'منظار شعبي', 'دراسة نوم', 'صورة دم CBC', 'D-dimer']],
        ['invResults', 'النتائج / ملاحظات', 'a']
      ]},
      FU()
    ]));
    SP.addSection('chest', SP.filesSection({ id: 'chestFiles', title: '📎 مرفقات (أشعة / مقطعية / وظائف تنفس)', folder: 'chest' }));

    /* ---------- 5) سكر وغدد صماء ---------- */
    SP.addSpecialty({
      id: 'endocrine', label: 'سكر وغدد صماء', icon: '🧪', services: ['سكر وغدد صماء'],
      fields: [
        { k: 'complaint', l: 'الشكوى الرئيسية', ph: 'ارتفاع السكر / تضخم الغدة', wide: true },
        { k: 'weight', l: 'الوزن (كجم)', ph: '85' },
        { k: 'height', l: 'الطول (سم)', ph: '170' }
      ],
      sections: []
    });
    SP.addSection('endocrine', structSection('endoHistory', '🧪 السكر والغدة الدرقية', [
      { t: 'السكر (Diabetes)', open: true, f: [
        ['dmType', 'نوع السكر', 's', ['', 'نوع 1', 'نوع 2', 'سكر حمل', 'ما قبل السكر', 'غير محدد']],
        ['dmDur', 'مدة المرض', 't'],
        ['dmRx', 'العلاج الحالي', 'c', ['أنسولين', 'ميتفورمين', 'سلفونيل يوريا', 'DPP-4', 'SGLT2', 'GLP-1', 'نظام غذائي فقط']],
        ['insulin', 'نظام الأنسولين / الجرعات', 't'],
        ['hypo', 'نوبات هبوط السكر', 's', ['', 'لا', 'نادرة', 'متكررة']],
        ['smbg', 'قياس السكر المنزلي', 's', ['', 'لا يقيس', 'أحياناً', 'يومياً', 'جهاز مستمر CGM']],
        ['compl', 'مضاعفات السكر', 'c', ['اعتلال الشبكية', 'اعتلال الكلى', 'اعتلال الأعصاب', 'القدم السكرية', 'أمراض القلب', 'جلطة / سكتة']]
      ]},
      { t: 'الغدة الدرقية (Thyroid)', f: [
        ['thHx', 'التاريخ', 's', ['', 'لا يوجد', 'قصور', 'فرط نشاط', 'عقدة / تضخم', 'جراحة بالغدة', 'علاج باليود المشع']],
        ['thSx', 'الأعراض', 'c', ['نقص وزن', 'زيادة وزن', 'خفقان', 'رعشة', 'تعرق زائد', 'برودة', 'إمساك', 'تساقط شعر', 'تضخم بالرقبة', 'جفاف الجلد']],
        ['thMeds', 'الدواء وجرعته', 't']
      ]},
      { t: 'غدد أخرى (Other Endocrine)', f: [
        ['other', 'المشاكل', 'c', ['كيس على المبيض PCOS', 'هشاشة العظام', 'نقص فيتامين د', 'استعمال كورتيزون', 'غدة نخامية', 'غدة كظرية', 'اضطراب النمو / البلوغ', 'ارتفاع الكالسيوم', 'السمنة']],
        ['otherNote', 'ملاحظات', 'a']
      ]}
    ]));
    SP.addSection('endocrine', structSection('endoExam', '🔍 الفحص والتحاليل', [
      { t: 'القياسات والفحص (Measurements & Examination)', open: true, f: [
        ['bp', 'ضغط الدم', 't'], ['bmi', 'مؤشر كتلة الجسم BMI', 't'], ['waist', 'محيط الخصر (سم)', 'n'],
        ['thyroidEx', 'الغدة الدرقية', 's', ['', 'طبيعية', 'متضخمة منتشرة', 'عقدة واحدة', 'عقد متعددة']],
        ['thyroidNote', 'وصف الغدة', 't'],
        ['acanthosis', 'تصبغ الرقبة (Acanthosis)', 's', NOTE],
        ['tremor', 'رعشة الأيدي', 's', NOTE]
      ]},
      { t: 'فحص القدم السكرية (Diabetic Foot)', f: [
        ['footPulse', 'نبض القدم', 's', NAD],
        ['footSens', 'الإحساس (Monofilament)', 's', NAD],
        ['footUlcer', 'قرحة', 's', NOTE],
        ['footDeform', 'تشوه / جلد جاف / تشققات', 's', NOTE],
        ['footNote', 'ملاحظات', 't']
      ]},
      { t: 'التحاليل (Lab Results)', f: [
        ['fbs', 'سكر صائم (mg/dl)', 'n'], ['ppbs', 'سكر بعد الأكل (mg/dl)', 'n'], ['rbs', 'سكر عشوائي (mg/dl)', 'n'],
        ['hba1c', 'سكر تراكمي HbA1c %', 'n'],
        ['tsh', 'TSH', 'n'], ['ft4', 'FT4', 'n'], ['ft3', 'FT3', 'n'],
        ['vitD', 'فيتامين د (ng/ml)', 'n'],
        ['creat', 'الكرياتينين', 'n'], ['egfr', 'eGFR', 'n'], ['uAlb', 'الألبومين بالبول', 't'],
        ['ldl', 'LDL', 'n'], ['tg', 'الدهون الثلاثية', 'n'],
        ['inv', 'المطلوب', 'c', ['سكر صائم', 'سكر بعد الأكل', 'سكر تراكمي HbA1c', 'منحنى سكر', 'تحليل دهون', 'وظائف كلى', 'ألبومين بالبول', 'وظائف الغدة الدرقية', 'أجسام مضادة للغدة', 'سونار على الغدة', 'خزعة بالإبرة من الغدة', 'فيتامين د', 'كالسيوم / فوسفور / PTH', 'هرمونات', 'قاع العين']]
      ]},
      FU([
        ['hba1cTarget', 'الهدف من HbA1c %', 'n'],
        ['dietAdvice', 'نظام غذائي ورياضة', 'a']
      ])
    ]));
    SP.addSection('endocrine', SP.filesSection({ id: 'endoFiles', title: '📎 مرفقات (تحاليل / سونار / تقارير)', folder: 'endocrine' }));

    /* ---------- 6) جراحة عامة ---------- */
    SP.addSpecialty({
      id: 'surgery', label: 'جراحة عامة', icon: '🩹', services: ['جراحة عامة'],
      fields: [
        { k: 'complaint', l: 'الشكوى الرئيسية', ph: 'كتلة بالبطن / ألم أسفل البطن', wide: true },
        { k: 'duration', l: 'مدة الشكوى', ph: 'أسبوع' },
        { k: 'weight', l: 'الوزن (كجم)', ph: '75' }
      ],
      sections: []
    });
    var SG_MASS = 'ورم / كتلة / تورم';
    SP.addSection('surgery', structSection('surgHistory', '🩹 التاريخ الجراحي', [
      { t: 'المشكلة الجراحية (Surgical Problem)', open: true, f: [
        ['problem', 'نوع المشكلة', 'c', [SG_MASS, 'ألم بالبطن', 'فتق', 'مشاكل الشرج (بواسير / شرخ / ناسور)', 'جرح / خراج / التهاب', 'قدم سكرية', 'دوالي', 'مشكلة بالثدي', 'غدة درقية', 'حصوات المرارة', 'التهاب الزائدة', 'بعد عملية جراحية']],
        ['onset', 'البداية', 's', ['', 'مفاجئة', 'تدريجية', 'بعد إصابة']],
        ['progress', 'التطور', 's', ['', 'ثابتة', 'تزداد', 'تتحسن', 'متكررة']],
        ['pain', 'الألم (0-10)', 's', N10]
      ]},
      { t: 'تفاصيل الكتلة / التورم', when: { k: 'problem', v: SG_MASS }, f: [
        ['mSite', 'المكان', 't'],
        ['mSize', 'الحجم (سم)', 't'],
        ['mConsist', 'القوام', 's', ['', 'ليّن', 'متماسك', 'صلب', 'متحرك', 'ثابت']],
        ['mTender', 'إيلام', 's', NOTE],
        ['mRed', 'احمرار / سخونة', 's', NOTE],
        ['mPulsate', 'نبض بالكتلة', 's', NOTE],
        ['mNodes', 'غدد ليمفاوية', 's', NOTE]
      ]},
      { t: 'اللياقة للجراحة (Fitness for Surgery)', f: [
        ['pastSurg', 'عمليات سابقة', 't'],
        ['anesProb', 'مشاكل مع التخدير', 's', NOTE],
        ['anticoag', 'أدوية سيولة', 's', NOTE],
        ['chronic', 'أمراض مزمنة', 'c', ['سكر', 'ضغط', 'قلب', 'ربو / صدر', 'كلى', 'كبد', 'اضطراب تجلط']],
        ['asa', 'تصنيف ASA', 's', ['', 'I', 'II', 'III', 'IV', 'V']],
        ['allergy', 'حساسية أدوية / لاتكس', 't']
      ]}
    ]));
    SP.addSection('surgery', structSection('surgExam', '🔍 الفحص والخطة الجراحية', [
      { t: 'الفحص الموضعي (Local Examination)', open: true, f: [
        ['inspection', 'المعاينة', 't'],
        ['palpation', 'الجس', 't'],
        ['abdomen', 'البطن', 's', ['', 'طري غير مؤلم', 'إيلام موضعي', 'تصلب دفاعي', 'انتفاخ', 'كتلة']],
        ['hernia', 'نوع الفتق', 's', ['', 'لا يوجد', 'إربي', 'سري', 'فخذي', 'بجرح سابق', 'خط وسطي']],
        ['reducible', 'الفتق', 's', ['', 'قابل للرد', 'غير قابل للرد', 'مختنق']],
        ['coughImp', 'دفعة السعال', 's', NOTE],
        ['anorectal', 'الشرج', 's', ['', 'سليم', 'بواسير', 'شرخ', 'ناسور', 'خراج']],
        ['wound', 'الجرح', 's', ['', 'نظيف', 'التهاب', 'إفرازات', 'مفتوح', 'خراج']],
        ['sgExamNote', 'ملاحظات أخرى', 'a']
      ]},
      { t: 'الفحوصات (Investigations)', f: [
        ['inv', 'المطلوب', 'c', ['صورة دم CBC', 'سكر', 'وظائف كبد', 'وظائف كلى', 'زمن التجلط PT / INR', 'رسم قلب قبل العملية', 'سونار على البطن', 'سونار على الثدي', 'أشعة مقطعية', 'منظار', 'خزعة']],
        ['invResults', 'النتائج / ملاحظات', 'a']
      ]},
      { t: 'خطة العملية (Operative Plan)', f: [
        ['procedure', 'الإجراء المقترح', 't'],
        ['anesthesia', 'نوع التخدير', 's', ['', 'موضعي', 'نصفي', 'كلي']],
        ['opDate', 'تاريخ العملية', 'd'],
        ['consent', 'الموافقة الطبية', 's', ['', 'تمت', 'لم تتم']],
        ['preOp', 'تعليمات قبل العملية', 'a']
      ]},
      { t: 'بعد العملية (Post-operative)', f: [
        ['postDay', 'اليوم بعد العملية', 'n'],
        ['postWound', 'حالة الجرح', 's', ['', 'نظيف جاف', 'التهاب', 'إفرازات', 'انفتاح']],
        ['drain', 'الدرنقة', 's', ['', 'لا يوجد', 'موجودة', 'تمت إزالتها']],
        ['stitchDate', 'موعد إزالة الغرز', 'd'],
        ['postNote', 'ملاحظات', 'a']
      ]},
      FU()
    ]));
    SP.addSection('surgery', SP.filesSection({ id: 'surgFiles', title: '📎 مرفقات (صور الجرح / أشعة / تحاليل)', folder: 'surgery' }));

    /* ---------- 7) علاج طبيعي وتأهيل ---------- */
    SP.addSpecialty({
      id: 'physio', label: 'علاج طبيعي وتأهيل', icon: '🏃', services: ['علاج طبيعي وتأهيل'],
      fields: [
        { k: 'complaint', l: 'الشكوى الرئيسية', ph: 'ألم أسفل الظهر', wide: true },
        { k: 'medDx', l: 'التشخيص الطبي / الإحالة', ph: 'انزلاق غضروفي' },
        { k: 'duration', l: 'مدة الشكوى', ph: 'شهران' }
      ],
      sections: []
    });
    SP.addSection('physio', structSection('physioAssess', '🏃 التقييم', [
      { t: 'الألم والتاريخ (Pain & History)', open: true, f: [
        ['site', 'مكان الألم / المنطقة', 't'],
        ['side', 'الجهة', 's', SIDE],
        ['vas', 'شدة الألم (0-10)', 's', N10],
        ['type', 'نوع الحالة', 's', ['', 'حادة', 'مزمنة', 'بعد جراحة', 'إصابة رياضية', 'عصبية', 'حالة تأهيل']],
        ['aggr', 'ما يزيد الألم', 't'], ['relief', 'ما يخفف الألم', 't'],
        ['redFlags', 'علامات تحذيرية', 'c', ['فقدان وزن غير مبرر', 'حرارة', 'ضعف تدريجي', 'تنميل منطقة السرج', 'ألم ليلي مستمر', 'فقدان السيطرة على البول / البراز', 'صدمة قوية']],
        ['imaging', 'أشعة / تقارير سابقة', 't']
      ]},
      { t: 'مدى الحركة والقوة (ROM & Strength)', f: [
        ['joint', 'المفصل / المنطقة', 't'],
        ['arom', 'مدى الحركة النشط', 't'],
        ['prom', 'مدى الحركة السلبي', 't'],
        ['endFeel', 'نهاية الحركة (End feel)', 's', ['', 'طبيعية', 'صلبة', 'لينة', 'فارغة', 'مع تشنج عضلي']],
        ['mmt', 'قوة العضلات (MMT)', 's', MMT],
        ['spasm', 'تشنج عضلي', 's', ['', 'لا يوجد', 'خفيف', 'متوسط', 'شديد']],
        ['special', 'الاختبارات الخاصة', 't']
      ]},
      { t: 'الوضعية والمشية والوظيفة (Posture, Gait & Function)', f: [
        ['posture', 'الوضعية', 't'],
        ['gait', 'المشية', 's', ['', 'طبيعية', 'عرجاء', 'تحتاج عكاز', 'تحتاج مشاية', 'غير قادر على المشي']],
        ['balance', 'التوازن', 's', NAD],
        ['adl', 'الأنشطة اليومية (ADL)', 's', ['', 'مستقل', 'يحتاج مساعدة بسيطة', 'يحتاج مساعدة كبيرة', 'معتمد كلياً']],
        ['scale', 'مقياس وظيفي', 's', ['', 'Oswestry (أسفل الظهر)', 'NDI (الرقبة)', 'DASH (الذراع)', 'WOMAC (الركبة)', 'Barthel', 'آخر']],
        ['scaleScore', 'نتيجة المقياس %', 'n']
      ]}
    ]));
    SP.addSection('physio', structSection('physioPlan', '📋 خطة العلاج والجلسات', [
      { t: 'التشخيص والأهداف (Diagnosis & Goals)', open: true, f: [
        ['ptDx', 'التشخيص العلاجي', 't'],
        ['goalShort', 'أهداف قصيرة المدى', 'a'],
        ['goalLong', 'أهداف طويلة المدى', 'a']
      ]},
      { t: 'طرق العلاج (Treatment)', f: [
        ['modal', 'الأجهزة', 'c', ['كمادات حرارية', 'كمادات باردة', 'موجات فوق صوتية', 'تنبيه كهربائي TENS', 'تنبيه كهربائي للعضلات', 'ليزر علاجي', 'شد ميكانيكي', 'موجات صدمية', 'مجال مغناطيسي', 'تحفيز عصبي عضلي']],
        ['manual', 'علاج يدوي', 'c', ['تدليك علاجي', 'تحريك مفصلي', 'تمدد عضلي', 'تحرير الأنسجة', 'تحريك الأعصاب']],
        ['exercise', 'تمارين علاجية', 'c', ['تمارين مدى الحركة', 'تقوية عضلات', 'تمارين الثبات', 'تمارين التوازن', 'إطالة', 'تأهيل بعد الجراحة', 'تمارين التنفس']],
        ['exNote', 'تفاصيل التمارين', 'a']
      ]},
      { t: 'الجلسات (Sessions)', f: [
        ['sessionsPlanned', 'عدد الجلسات المقررة', 'n'],
        ['perWeek', 'جلسات / أسبوع', 'n'],
        ['sessionDone', 'الجلسات المكتملة', 'n'],
        ['sessionDur', 'مدة الجلسة (دقيقة)', 'n']
      ]},
      { t: 'التقدم (Progress)', f: [
        ['vasNow', 'الألم الحالي (0-10)', 's', N10],
        ['romNow', 'مدى الحركة الحالي', 't'],
        ['progNote', 'ملاحظات التقدم', 'a'],
        ['homeProg', 'برنامج منزلي', 'a'],
        ['reassess', 'موعد إعادة التقييم', 'd']
      ]}
    ]));
    SP.addSection('physio', SP.filesSection({ id: 'physioFiles', title: '📎 مرفقات (أشعة / رنين / تقارير)', folder: 'physio' }));

    /* ---------- 8) أمراض نفسية ---------- */
    SP.addSpecialty({
      id: 'psychiatry', label: 'أمراض نفسية', icon: '🗣️', services: ['أمراض نفسية'],
      fields: [
        { k: 'complaint', l: 'الشكوى الرئيسية', ph: 'قلق وأرق', wide: true },
        { k: 'duration', l: 'مدة الشكوى', ph: '3 أشهر' },
        { k: 'age', l: 'العمر (سنة)', ph: '30' }
      ],
      sections: []
    });
    SP.addSection('psychiatry', structSection('psyHistory', '🗣️ التاريخ النفسي', [
      { t: 'الأعراض الحالية (Presenting Symptoms)', open: true, f: [
        ['sx', 'الأعراض', 'c', ['حزن / اكتئاب', 'قلق', 'نوبات هلع', 'وسواس / أفعال قهرية', 'أرق', 'نوم زائد', 'تغير الشهية', 'أفكار غريبة', 'هلاوس', 'تقلب المزاج', 'سلوك عدواني', 'ضعف التركيز', 'تعاطي مواد', 'إرهاق']],
        ['onset', 'البداية', 's', ['', 'مفاجئة', 'تدريجية']],
        ['stress', 'ضغوط حياتية', 'c', ['عمل', 'أسرة', 'زواج', 'مادية', 'فقدان عزيز', 'دراسة', 'مرض جسدي', 'لا يوجد']],
        ['stressNote', 'تفاصيل', 'a']
      ]},
      { t: 'التاريخ النفسي والعائلي', f: [
        ['prevTx', 'علاج سابق', 's', ['', 'لا', 'أدوية', 'علاج نفسي', 'كلاهما']],
        ['hospital', 'دخول مستشفى نفسي سابق', 's', NOTE],
        ['prevMeds', 'الأدوية الحالية / السابقة', 'a'],
        ['famHx', 'تاريخ عائلي', 'c', ['اكتئاب', 'اضطراب ثنائي القطب', 'فصام', 'قلق', 'إدمان', 'انتحار', 'لا يوجد']],
        ['substances', 'تعاطي مواد', 'c', ['تدخين', 'كحول', 'حشيش', 'ترامادول', 'مهدئات', 'منشطات', 'لا يوجد']]
      ]},
      { t: 'تقييم الخطورة (Risk Assessment)', f: [
        ['suicide', 'أفكار إيذاء النفس', 's', ['', 'لا يوجد', 'أفكار عابرة', 'أفكار مع خطة', 'محاولة سابقة']],
        ['harmOthers', 'أفكار إيذاء الآخرين', 's', NOTE],
        ['riskLevel', 'تقدير الخطورة', 's', ['', 'منخفضة', 'متوسطة', 'عالية']],
        ['safety', 'خطة الأمان / المرافق', 'a']
      ]}
    ]));
    SP.addSection('psychiatry', structSection('psyExam', '🔍 الفحص النفسي والمقاييس', [
      { t: 'فحص الحالة العقلية (Mental State Examination)', open: true, f: [
        ['appear', 'المظهر', 's', ['', 'مرتب', 'مهمل', 'غير مناسب للعمر']],
        ['behavior', 'السلوك', 's', ['', 'هادئ', 'متعاون', 'قلق', 'هائج', 'بطيء الحركة', 'تجنب التواصل البصري']],
        ['speechPsy', 'الكلام', 's', ['', 'طبيعي', 'سريع', 'بطيء', 'قليل', 'غير مترابط']],
        ['mood', 'المزاج', 's', ['', 'طبيعي', 'حزين', 'قلق', 'مرتفع', 'متقلب', 'غاضب']],
        ['affect', 'الانفعال', 's', ['', 'مناسب', 'مسطح', 'محدود', 'غير مناسب']],
        ['thoughtForm', 'شكل التفكير', 's', ['', 'مترابط', 'تطاير أفكار', 'تفكير مفكك', 'بطء التفكير']],
        ['thoughtContent', 'محتوى التفكير', 'c', ['لا يوجد', 'ضلالات', 'أفكار وسواسية', 'أفكار اضطهاد', 'أفكار انتحارية', 'انشغال بالمرض']],
        ['perception', 'الإدراك', 's', ['', 'طبيعي', 'هلاوس سمعية', 'هلاوس بصرية', 'أخرى']],
        ['orient', 'التوجه', 's', ['', 'سليم', 'مضطرب']],
        ['attention', 'الانتباه والذاكرة', 's', ['', 'سليم', 'ضعف خفيف', 'ضعف واضح']],
        ['insight', 'الاستبصار', 's', ['', 'تام', 'جزئي', 'معدوم']],
        ['judgment', 'الحكم', 's', ['', 'سليم', 'ضعيف']]
      ]},
      { t: 'المقاييس (Rating Scales)', f: [
        ['phq9', 'PHQ-9 (0-27)', 'n'],
        ['gad7', 'GAD-7 (0-21)', 'n'],
        ['otherScale', 'مقياس آخر ونتيجته', 't'],
        ['sleepHrs', 'ساعات النوم', 'n']
      ]},
      { t: 'التشخيص والخطة (Diagnosis & Plan)', f: [
        ['dx', 'التشخيص', 't'],
        ['therapy', 'العلاج النفسي', 'c', ['علاج معرفي سلوكي CBT', 'علاج داعم', 'علاج أسري', 'علاج جماعي', 'تدريب على الاسترخاء']],
        ['medPlan', 'الخطة الدوائية', 'a'],
        ['plan', 'ملاحظات الخطة', 'a'],
        ['fuInv', 'الفحوصات المطلوبة', 't'],
        ['fuDate', 'موعد المتابعة', 'd']
      ]}
    ]));
    SP.addSection('psychiatry', SP.filesSection({ id: 'psyFiles', title: '📎 مرفقات (تقارير / مقاييس)', folder: 'psychiatry' }));
  })();


  // Admin picker may already be drawn — redraw so the five new options appear.
  document.dispatchEvent(new Event('clinic-specialties-registered'));
})();
