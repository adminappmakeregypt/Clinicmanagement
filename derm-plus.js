// ============ DERM PLUS (v56) — وحدة الجلدية المتكاملة ============
// Additive module loaded AFTER dermatology.js and ent-plus.js. Old dermatology data keeps working:
// base fields (complaint, duration, itching, spread, skinType, fitzpatrick, exam), `lesions`,
// `severity` and `files` keep their keys. New sections save inside exam.sections (new keys only):
//
//  dermHx      structured history (onset, progression, symptoms, recurrence, triggers, previous treatment, exposure)
//  dermExam    lesion details, scalp/hair, nails, mucosa, acne, special signs
//  dermDx      primary / additional / differential diagnoses with optional ICD-10 (searchable catalog, doctor confirms)
//  dermInv     investigations: requested → result + dates
//  dermTx      treatment plan (topical / systemic meds, skincare, education, goals) → copied into the prescription ONLY on click
//  dermProc    procedures log (dermoscopy, biopsy + pathology, cryo, cautery, peels, laser...) — list is configurable per doctor
//  files       clinical photos (same key as before; each photo now has date / site / stage / description) + timeline + compare
//  dermFollow  follow-up date (feeds the shared follow-up list), response, adherence, side effects
//
// Patient allergies / chronic diseases / current medicines are NOT repeated here: they live in the
// shared patient background (ClinicCare) and are shown at the top of the visit.

(function () {
  var SP = window.ClinicSpecialty, ENT = window.ClinicENT, CC = window.ClinicCare;
  if (!SP || !ENT || !ENT.section) return;
  var esc = SP.escape;
  var YN = ['', 'لا', 'نعم'];

  function today() { return CC ? CC.today() : new Date().toISOString().slice(0, 10); }
  function prevVisits() { var p = CC && CC.getPatient(); return p ? CC.visitsFor(p) : []; }
  function opts(list, val) {
    return list.map(function (o) {
      return '<option value="' + esc(o) + '"' + (String(o) === String(val == null ? '' : val) ? ' selected' : '') + '>' + (o === '' ? '—' : esc(o)) + '</option>';
    }).join('');
  }
  function bx(id, title, sum, body) { return CC ? CC.box(id, title, sum, body, 'ent-box') : '<div class="ent-box"><h4>' + title + '</h4>' + body + '</div>'; }
  function setSum(el, id, t) { if (CC) CC.setSummary(el.querySelector('.cc-box[data-cc="' + id + '"]'), t); }
  function list(v, k) { return (v && v[k]) || []; }

  // Conditional fields: any element with data-show="key=value1|value2" inside a section is
  // shown only when the .ef[data-k=key] (select / text) or checkbox group contains a value.
  function applyShow(el) {
    el.querySelectorAll('[data-show]').forEach(function (n) {
      var p = n.getAttribute('data-show').split('='), k = p[0], vals = p[1].split('|');
      var src = el.querySelector('.ef[data-k="' + k + '"]'), on = false;
      if (src) on = vals.indexOf(src.value) >= 0 || (vals[0] === '*' && !!src.value);
      else {
        var g = el.querySelector('.ef-c[data-k="' + k + '"]');
        if (g) g.querySelectorAll('input:checked').forEach(function (i) { if (vals.indexOf(i.value) >= 0 || vals[0] === '*') on = true; });
      }
      n.style.display = on ? '' : 'none';
    });
  }
  // fields flagged {show:'k=v'} get wrapped
  function F(k, l, t, o, flags) { return [k, l, t, o, flags]; }

  // ENT.section + conditional fields: fields with flags {show:'key=v1|v2'} are shown only when matching
  function fsec(cfg) {
    var map = {};
    cfg.groups.forEach(function (g) { g.f.forEach(function (f) { if (f[4] && f[4].show) map[f[0]] = f[4].show; }); });
    var sec = ENT.section(cfg), w = sec.wire;
    sec.wire = function (el) {
      Object.keys(map).forEach(function (k) {
        var n = el.querySelector('.ef[data-k="' + k + '"], .ef-c[data-k="' + k + '"]');
        if (n) n.closest('.field').setAttribute('data-show', map[k]);
      });
      w.apply(this, arguments);
      applyShow(el);
      el.addEventListener('change', function () { applyShow(el); });
    };
    return sec;
  }

  /* ===================== 1) HISTORY ===================== */
  var SYM = ['ألم (Pain)', 'حرقان (Burning)', 'تقشر (Scaling)', 'نزيف (Bleeding)', 'إفرازات (Discharge)', 'تنميل / وخز', 'لا توجد أعراض'];
  var TRIG = ['الشمس', 'الحرارة / العرق', 'البرد / الجفاف', 'التوتر النفسي', 'أطعمة', 'أدوية', 'مستحضرات تجميل / منظفات', 'الدورة الشهرية / الحمل', 'العدوى', 'الاحتكاك / الملابس', 'حيوانات أليفة'];
  var FAM = ['صدفية', 'إكزيما / حساسية (Atopy)', 'حب الشباب', 'بهاق', 'ثعلبة / تساقط وراثي', 'سرطان جلد / شامات', 'لا يوجد'];
  var EXPO = ['مهني (Occupational)', 'تعرض شمس طويل', 'سفر حديث', 'مخالطة مريض بأعراض مشابهة', 'مواد كيميائية / مهيجات', 'حيوانات', 'مسابح / صالات رياضية', 'منتج جديد على الجلد'];
  SP.addSection('dermatology', fsec({
    id: 'dermHx', title: '📝 التاريخ المرضي الجلدي', box: 'derm-hx',
    groups: [
      { id: 'course', t: 'البداية والمسار (Onset & Course)', f: [
          F('onset', 'طريقة البداية (Onset)', 's', ['', 'مفاجئة (Acute)', 'تدريجية (Gradual)']),
          F('onsetDate', 'تاريخ البداية التقريبي', 'd'),
          F('progression', 'المسار (Progression)', 's', ['', 'يتحسن (Improving)', 'مستقر (Stable)', 'يزداد سوءاً (Worsening)', 'متذبذب (Fluctuating)']),
          F('pattern', 'النمط', 's', ['', 'مستمر (Continuous)', 'نوبات متكررة (Episodic)', 'موسمي (Seasonal)']),
          F('symptoms', 'أعراض أخرى (الحكة مسجّلة بالأعلى)', 'c', SYM)],
        sum: function (v) { return [v.progression ? v.progression.split(' ')[0] : '', (v.symptoms || []).length ? v.symptoms.length + ' أعراض' : ''].filter(Boolean).join(' · '); } },
      { id: 'rec', t: 'النوبات السابقة والمحفزات', f: [
          F('previous', 'نوبات سابقة؟', 's', YN),
          F('episodes', 'عدد النوبات / آخر نوبة', 't', 'مثال: 3 مرات — آخرها منذ 6 شهور'),
          F('triggers', 'المحفزات المعروفة (Triggers)', 'c', TRIG),
          F('aggravating', 'عوامل تزيد الحالة', 't', ''),
          F('relieving', 'عوامل تحسّن الحالة', 't', '')],
        sum: function (v) { return (v.triggers || []).join('، '); } },
      { id: 'prevtx', t: 'العلاجات السابقة (Previous treatment)', f: [
          F('prevTx', 'العلاجات الجلدية السابقة', 'a'),
          F('prevTxEffect', 'مدى الاستجابة', 's', ['', 'استجابة ممتازة', 'استجابة جزئية', 'لا استجابة', 'تحسن ثم انتكاس', 'أعراض جانبية']),
          F('drugHx', 'أدوية قد تسبب أعراضاً جلدية (Drug history)', 't', 'بدأت حديثاً / مشتبه بها'),
          F('family', 'تاريخ عائلي لأمراض جلدية', 'c', FAM)],
        sum: function (v) { return v.prevTxEffect || ''; } },
      { id: 'expo', t: 'التعرضات (Exposure history)', f: [
          F('exposed', 'هل يوجد تعرض ذو صلة؟', 's', YN),
          F('exposure', 'نوع التعرض', 'c', EXPO, { show: 'exposed=نعم' }),
          F('exposureNote', 'تفاصيل (المهنة / المكان / المادة)', 't', '', { show: 'exposed=نعم' })],
        sum: function (v) { return v.exposed === 'نعم' ? (v.exposure || []).join('، ') || 'نعم' : ''; } }
    ],
    bannerHtml: '<p class="muted">الحساسية والأمراض المزمنة والأدوية الحالية تُسجَّل مرة واحدة في «الخلفية الطبية» للمريض أعلى الزيارة.</p>',
    summary: function (v) { return [v.onset ? v.onset.split(' ')[0] : '', v.progression ? v.progression.split(' ')[0] : '', v.previous === 'نعم' ? 'متكرر' : ''].filter(Boolean).join(' · '); }
  }));

  /* ===================== 2) EXAMINATION ===================== */
  SP.addSection('dermatology', fsec({
    id: 'dermExam', title: '🔍 الفحص الجلدي المفصّل', box: 'derm-exam',
    groups: [
      { id: 'les', t: 'وصف الآفات (Morphology)', f: [
          F('border', 'الحواف (Borders)', 's', ['', 'محددة جيداً (Well-defined)', 'غير محددة (Ill-defined)', 'غير منتظمة (Irregular)', 'مرتفعة (Raised)']),
          F('surface', 'السطح', 's', ['', 'أملس', 'متقشر (Scaly)', 'متقشر فضي (Silvery)', 'متقرن (Hyperkeratotic)', 'نازّ (Weeping)', 'متقشّر بقشرة (Crusted)', 'ثؤلولي (Verrucous)']),
          F('config', 'الشكل / الترتيب (Configuration)', 's', ['', 'منفرد', 'متعدد متفرق', 'حلقي (Annular)', 'قرصي (Nummular)', 'خطي (Linear)', 'شبكي (Reticular)', 'هدفي (Target)', 'متجمع (Herpetiform)']),
          F('signs', 'علامات خاصة', 'c', ['ظاهرة كوبنر (Koebner)', 'نيكولسكي إيجابي (Nikolsky)', 'أوسبيتز (Auspitz)', 'كتابة جلدية (Dermographism)', 'علامة داريير (Darier)', 'ضوء وود إيجابي (Wood\'s lamp)'])],
        sum: function (v) { return [v.border ? v.border.split(' (')[0] : '', v.config ? v.config.split(' (')[0] : ''].filter(Boolean).join(' · '); } },
      { id: 'hair', t: 'فروة الرأس والشعر (Scalp & Hair)', f: [
          F('hairLoss', 'نمط تساقط الشعر', 's', ['', 'لا يوجد', 'بقعي (Patchy)', 'منتشر (Diffuse)', 'ذكوري / أنثوي (Androgenetic)', 'ندبي (Scarring)', 'شد / نتف (Traction / Trichotillomania)']),
          F('ludwig', 'الدرجة (Hamilton / Ludwig)', 't', 'مثال: Hamilton III', { show: 'hairLoss=ذكوري / أنثوي (Androgenetic)' }),
          F('pull', 'اختبار الشد (Pull test)', 's', ['', 'سلبي', 'إيجابي'], { show: 'hairLoss=*' }),
          F('scalp', 'فروة الرأس', 'c', ['تقشر (Scaling)', 'احمرار / التهاب', 'بثور', 'قشور صفراء دهنية', 'شعر مكسور / نقاط سوداء', 'شعر علامة التعجب (Exclamation)'])],
        sum: function (v) { return v.hairLoss && v.hairLoss !== 'لا يوجد' ? v.hairLoss.split(' (')[0] : ''; } },
      { id: 'nails', t: 'الأظافر (Nails)', f: [
          F('nailsSite', 'الأظافر المصابة', 's', ['', 'لا يوجد', 'أظافر اليد', 'أظافر القدم', 'اليد والقدم']),
          F('nailFind', 'الموجودات', 'c', ['تنقر (Pitting)', 'تغير اللون', 'تثخن (Thickening)', 'انفصال (Onycholysis)', 'بقعة الزيت (Oil drop)', 'خطوط بو (Beau\'s lines)', 'تقعر (Koilonychia)', 'التهاب الجلد حول الظفر (Paronychia)', 'خط صبغي طولي (Melanonychia)'], { show: 'nailsSite=أظافر اليد|أظافر القدم|اليد والقدم' }),
          F('nailCount', 'عدد الأظافر المصابة', 'n', '', { show: 'nailsSite=أظافر اليد|أظافر القدم|اليد والقدم' })],
        sum: function (v) { return (v.nailFind || []).map(function (x) { return x.split(' (')[0]; }).join('، '); } },
      { id: 'muc', t: 'الأغشية المخاطية (Mucosa)', f: [
          F('mucosa', 'إصابة مخاطية؟', 's', YN),
          F('mucSite', 'الموضع', 'c', ['الفم', 'العين (الملتحمة)', 'الأعضاء التناسلية', 'الأنف'], { show: 'mucosa=نعم' }),
          F('mucFind', 'الموجودات', 'c', ['تقرحات (Erosions)', 'خطوط بيضاء شبكية (Wickham)', 'بقع بيضاء', 'فقاعات'], { show: 'mucosa=نعم' })],
        sum: function (v) { return v.mucosa === 'نعم' ? (v.mucSite || []).join('، ') || 'نعم' : ''; } },
      { id: 'acne', t: 'حب الشباب (Acne)', f: [
          F('acneSites', 'التوزيع', 'c', ['الجبهة', 'الخدود', 'الذقن / خط الفك', 'الأنف', 'الصدر', 'الظهر', 'الكتفين']),
          F('acneTypes', 'أنواع الآفات', 'c', ['رؤوس مفتوحة (Open comedones)', 'رؤوس مغلقة (Closed comedones)', 'حطاطات (Papules)', 'بثور (Pustules)', 'عقيدات (Nodules)', 'أكياس (Cysts)']),
          F('acneScar', 'الندبات', 'c', ['ندبات منخفضة (Atrophic / Ice-pick)', 'ندبات متضخمة / جدرة (Hypertrophic / Keloid)', 'تصبغ بعد الالتهاب (PIH)', 'احمرار بعد الالتهاب (PIE)']),
          F('acneHormonal', 'علامات هرمونية (عدم انتظام دورة / شعر زائد)', 's', YN)],
        sum: function (v) { return [(v.acneTypes || []).length ? v.acneTypes.length + ' أنواع' : '', (v.acneScar || []).length ? 'ندبات' : ''].filter(Boolean).join(' · '); } },
      { id: 'notes', t: 'ملاحظات الفحص (Free text)', f: [F('notes', 'ملاحظات إضافية', 'a')], sum: function (v) { return v.notes ? '✓' : ''; } }
    ],
    summary: function (v) { return [v.hairLoss && v.hairLoss !== 'لا يوجد' ? 'شعر' : '', (v.nailFind || []).length ? 'أظافر' : '', v.mucosa === 'نعم' ? 'أغشية مخاطية' : '', (v.acneTypes || []).length ? 'حب الشباب' : ''].filter(Boolean).join(' · '); }
  }));

  /* ===================== shared repeatable-rows helper ===================== */
  // cols: [key, label, type('t'|'s'|'d'|'n'|'a'), opts, {cls, show:'colKey=val|val'}]
  function rowHtml(cols, r, cls) {
    r = r || {};
    return '<div class="dr-row ' + cls + '">' + cols.map(function (c) {
      var x = r[c[0]] == null ? '' : r[c[0]], inp;
      if (c[2] === 's') inp = '<select class="dr-f" data-k="' + c[0] + '">' + opts(c[3].indexOf(x) >= 0 || x === '' ? c[3] : c[3].concat([x]), x) + '</select>';
      else if (c[2] === 'a') inp = '<textarea class="dr-f" data-k="' + c[0] + '" rows="2">' + esc(x) + '</textarea>';
      else inp = '<input class="dr-f" data-k="' + c[0] + '" type="' + (c[2] === 'd' ? 'date' : c[2] === 'n' ? 'number' : 'text') + '" value="' + esc(x) + '"' + (c[3] && c[2] !== 's' ? ' placeholder="' + esc(c[3]) + '"' : '') + ' />';
      var fl = c[4] || {};
      return '<div class="field' + (fl.wide ? ' dr-wide' : '') + '"' + (fl.show ? ' data-rshow="' + esc(fl.show) + '"' : '') + '><label>' + esc(c[1]) + '</label>' + inp + '</div>';
    }).join('') + '<button type="button" class="btn small danger dr-del" title="حذف">🗑</button></div>';
  }
  function rowsApplyShow(box) {
    box.querySelectorAll('.dr-row').forEach(function (row) {
      row.querySelectorAll('[data-rshow]').forEach(function (n) {
        var p = n.getAttribute('data-rshow').split('='), src = row.querySelector('.dr-f[data-k="' + p[0] + '"]');
        var vals = p[1].split('|'), val = src ? src.value : '';
        n.style.display = vals.some(function (v) { return val && (v === '*' || val.indexOf(v) >= 0); }) ? '' : 'none';
      });
    });
  }
  function collectRows(box, required) {
    var out = [];
    box.querySelectorAll('.dr-row').forEach(function (row) {
      var o = {}, any = false;
      row.querySelectorAll('.dr-f').forEach(function (i) { var x = (i.value || '').trim(); if (x !== '') { o[i.dataset.k] = x; any = true; } });
      if (any && (!required || o[required])) out.push(o);
    });
    return out;
  }
  function wireRows(el, box, cols, cls, onChange) {
    el.addEventListener('click', function (e) {
      var add = e.target.closest('[data-add="' + cls + '"]');
      if (add) { box.insertAdjacentHTML('beforeend', rowHtml(cols, null, cls)); rowsApplyShow(box); onChange(); return; }
      if (e.target.classList.contains('dr-del') && box.contains(e.target)) { e.target.closest('.dr-row').remove(); onChange(); }
    });
    rowsApplyShow(box);
  }
  function rowsTable(cols, rows) {
    var used = cols.filter(function (c) { return rows.some(function (r) { return r[c[0]]; }); });
    if (!used.length) return '';
    return SP.tableHtml(used.map(function (c) { return c[1]; }), rows.map(function (r) { return used.map(function (c) { return r[c[0]] || ''; }); }));
  }

  /* ===================== 3) DIAGNOSIS ===================== */
  // WHO ICD-10 codes for common dermatology diagnoses. Codes are suggestions only:
  // the doctor chooses / edits, and free text is always allowed. No automatic diagnosis.
  var DX = [
    ['L40.0', 'Psoriasis vulgaris — صدفية لويحية'], ['L40.4', 'Guttate psoriasis — صدفية نقطية'], ['L40.5', 'Psoriatic arthropathy — التهاب مفاصل صدفي'],
    ['L20.9', 'Atopic dermatitis — إكزيما تأتبية'], ['L21.9', 'Seborrhoeic dermatitis — التهاب جلد دهني'], ['L23.9', 'Allergic contact dermatitis — التهاب جلد تماسي تحسسي'],
    ['L24.9', 'Irritant contact dermatitis — التهاب جلد تماسي تهيجي'], ['L30.0', 'Nummular dermatitis — إكزيما قرصية'], ['L30.1', 'Dyshidrosis (Pompholyx) — إكزيما عرقية'],
    ['L30.9', 'Dermatitis, unspecified — التهاب جلد غير محدد'], ['L50.9', 'Urticaria — أرتيكاريا (شرى)'], ['L70.0', 'Acne vulgaris — حب الشباب'],
    ['L71.9', 'Rosacea — الوردية'], ['L73.2', 'Hidradenitis suppurativa — التهاب الغدد العرقية القيحي'], ['L80', 'Vitiligo — البهاق'],
    ['L81.1', 'Melasma (Chloasma) — الكلف'], ['L81.0', 'Post-inflammatory hyperpigmentation — تصبغ بعد الالتهاب'], ['L63.9', 'Alopecia areata — الثعلبة'],
    ['L64.9', 'Androgenetic alopecia — الصلع الوراثي'], ['L65.0', 'Telogen effluvium — تساقط الشعر الكربي'], ['L43.9', 'Lichen planus — الحزاز المسطح'],
    ['L42', 'Pityriasis rosea — النخالية الوردية'], ['L28.1', 'Prurigo nodularis — الحكاك العقدي'], ['L29.9', 'Pruritus — حكة'],
    ['L85.3', 'Xerosis cutis — جفاف الجلد'], ['L91.0', 'Keloid / hypertrophic scar — جدرة'], ['L60.0', 'Ingrowing nail — ظفر غائر'],
    ['L68.0', 'Hirsutism — الشعرانية'], ['L57.0', 'Actinic keratosis — تقرن سفعي'], ['L82', 'Seborrhoeic keratosis — تقرن دهني'],
    ['L10.9', 'Pemphigus — الفقاع'], ['L12.0', 'Bullous pemphigoid — الفقاعانية'], ['L01.0', 'Impetigo — القوباء'],
    ['L02.9', 'Cutaneous abscess / furuncle — خراج / دمل'], ['L03.9', 'Cellulitis — التهاب النسيج الخلوي'], ['L73.9', 'Folliculitis — التهاب بصيلات الشعر'],
    ['B35.0', 'Tinea capitis — سعفة الرأس'], ['B35.1', 'Onychomycosis (Tinea unguium) — فطريات الأظافر'], ['B35.3', 'Tinea pedis — سعفة القدم'],
    ['B35.4', 'Tinea corporis — سعفة الجسم'], ['B35.6', 'Tinea cruris — سعفة الفخذ'], ['B36.0', 'Pityriasis versicolor — النخالية المبرقشة'],
    ['B37.2', 'Cutaneous candidiasis — مبيضات جلدية'], ['B86', 'Scabies — الجرب'], ['B07', 'Viral warts — ثآليل'],
    ['B08.1', 'Molluscum contagiosum — المليساء المعدية'], ['B00.9', 'Herpes simplex — هربس بسيط'], ['B02.9', 'Herpes zoster — الحزام الناري'],
    ['B55.1', 'Cutaneous leishmaniasis — الليشمانيا الجلدية'], ['D22.9', 'Melanocytic naevus — شامة'], ['C43.9', 'Malignant melanoma — ميلانوما'],
    ['C44.9', 'Malignant neoplasm of skin (e.g. BCC / SCC) — ورم جلدي خبيث'], ['L93.0', 'Discoid lupus erythematosus — ذئبة قرصية'], ['L53.9', 'Erythema (unspecified) — حمامى']
  ];
  var DX_TEXT = DX.map(function (d) { return d[1] + ' [' + d[0] + ']'; });
  function splitDx(s) { var m = /\[([A-Z]\d{2}(?:\.\d{1,2})?)\]\s*$/.exec(s || ''); return m ? { name: s.replace(m[0], '').trim(), code: m[1] } : { name: (s || '').trim(), code: '' }; }
  var DXCOLS = [['name', 'التشخيص', 't', 'ابحث أو اكتب…', { wide: true }], ['code', 'كود ICD-10 (اختياري)', 't', 'مثال: L40.0']];
  function dxList(v, k) { return (v && v[k]) || []; }
  SP.addSection('dermatology', {
    id: 'dermDx', title: '🩺 التشخيص والتقييم',
    html: function (v) {
      v = v || {};
      var dl = '<datalist id="dermDxList">' + DX_TEXT.map(function (t) { return '<option value="' + esc(t) + '"></option>'; }).join('') + '</datalist>';
      function grp(k, title, addLabel) {
        var rows = dxList(v, k);
        return '<h4 class="derm-h">' + title + '</h4><div class="dr-list" data-list="' + k + '">' + (rows.length ? rows : (k === 'primary' ? [{}] : [])).map(function (r) { return rowHtml(DXCOLS, r, 'dx-' + k); }).join('') + '</div>' +
          (k === 'primary' ? '' : '<button type="button" class="btn ghost small" data-add="dx-' + k + '">+ ' + addLabel + '</button>');
      }
      var body = dl + '<p class="muted">اختر من القائمة أو اكتب التشخيص بحرية. الأكواد اقتراحات للمساعدة ويجب أن يتأكد منها الطبيب — لا يتم وضع أي تشخيص تلقائياً.</p>' +
        grp('primary', 'التشخيص الأساسي (Primary diagnosis)') +
        '<div class="grid-2 ent-grid"><div class="field"><label>درجة التأكد</label><select class="ef" data-k="certainty">' + opts(['', 'مبدئي (Provisional)', 'مؤكد سريرياً (Clinical)', 'مؤكد بالفحوصات (Confirmed)'], v.certainty) + '</select></div></div>' +
        grp('additional', 'تشخيصات إضافية (Additional)', 'تشخيص إضافي') +
        grp('differential', 'التشخيص التفريقي (Differential)', 'تشخيص تفريقي') +
        '<div class="grid-2 ent-grid"><div class="field" style="grid-column:1 / -1;"><label>التقييم السريري والموجودات الداعمة</label><textarea class="ef" data-k="assessment" rows="3">' + esc(v.assessment || '') + '</textarea></div></div>';
      return bx('derm-dx', '🩺 التشخيص والتقييم (Diagnosis)', dxSummary(v), body);
    },
    wire: function (el) {
      el.querySelectorAll('.dr-list input[data-k="name"]').forEach(function (i) { i.setAttribute('list', 'dermDxList'); });
      function refresh() { setSum(el, 'derm-dx', dxSummary(collect(el) || {})); }
      el.addEventListener('click', function (e) {
        var a = e.target.closest('[data-add]');
        if (a) {
          var k = a.getAttribute('data-add').slice(3), box = el.querySelector('[data-list="' + k + '"]');
          box.insertAdjacentHTML('beforeend', rowHtml(DXCOLS, null, 'dx-' + k));
          box.lastElementChild.querySelector('input[data-k="name"]').setAttribute('list', 'dermDxList');
        } else if (e.target.classList.contains('dr-del')) {
          var row = e.target.closest('.dr-row'), lst = row.parentNode;
          if (lst.getAttribute('data-list') === 'primary') row.querySelectorAll('input').forEach(function (i) { i.value = ''; }); else row.remove();
        }
        refresh();
      });
      // choosing a catalog item splits it into name + code
      el.addEventListener('change', function (e) {
        if (e.target.matches('input[data-k="name"]')) {
          var s = splitDx(e.target.value);
          if (s.code) { e.target.value = s.name; var c = e.target.closest('.dr-row').querySelector('input[data-k="code"]'); if (c) c.value = s.code; }
        }
        refresh();
      });
      refresh();
    },
    collect: collect,
    render: function (v) {
      if (!v) return '';
      var h = '', rows = [];
      [['primary', 'التشخيص الأساسي'], ['additional', 'تشخيص إضافي'], ['differential', 'تشخيص تفريقي']].forEach(function (g) {
        dxList(v, g[0]).forEach(function (d) { rows.push([g[1], d.name + (d.code ? ' (' + d.code + ')' : '')]); });
      });
      if (v.certainty) rows.push(['درجة التأكد', v.certainty]);
      if (v.assessment) rows.push(['التقييم السريري', v.assessment]);
      return rows.length ? h + SP.tableHtml(['البند', 'القيمة'], rows) : '';
    }
  });
  function collect(el) {
    var o = {}, any = false;
    ['primary', 'additional', 'differential'].forEach(function (k) {
      var box = el.querySelector('[data-list="' + k + '"]'); if (!box) return;
      var r = collectRows(box, 'name'); if (r.length) { o[k] = r; any = true; }
    });
    el.querySelectorAll('.ef').forEach(function (i) { var x = (i.value || '').trim(); if (x) { o[i.dataset.k] = x; any = true; } });
    return any ? o : null;
  }
  function dxSummary(v) { var p = dxList(v, 'primary')[0]; return p ? p.name + (p.code ? ' · ' + p.code : '') : ''; }

  /* ===================== 4) INVESTIGATIONS ===================== */
  var TESTS = ['', 'كشط جلدي + KOH (Fungal microscopy)', 'مزرعة فطريات (Fungal culture)', 'مزرعة بكتيرية (Bacterial swab/culture)', 'ضوء وود (Wood\'s lamp)', 'منظار جلد (Dermoscopy)',
    'خزعة جلدية (Skin biopsy)', 'اختبار الرقعة (Patch test)', 'اختبار الجرب (Scabies scraping)', 'Tzanck smear', 'صورة دم كاملة (CBC)', 'وظائف كبد وكلى', 'هرمونات (Hormonal profile)',
    'فيتامين د / فيريتين / زنك', 'وظائف الغدة الدرقية', 'ANA / مناعة ذاتية', 'IgE', 'أخرى'];
  var INVCOLS = [['test', 'الفحص', 's', TESTS], ['site', 'الموضع', 't', ''], ['reqDate', 'تاريخ الطلب', 'd'],
    ['status', 'الحالة', 's', ['', 'مطلوب', 'تم — بانتظار النتيجة', 'النتيجة متاحة']],
    ['resDate', 'تاريخ النتيجة', 'd', '', { show: 'status=النتيجة متاحة' }], ['result', 'النتيجة', 't', '', { show: 'status=النتيجة متاحة|تم', wide: true }]];
  SP.addSection('dermatology', {
    id: 'dermInv', title: '🧪 الفحوصات المطلوبة',
    html: function (v) {
      var rows = list(v, 'items');
      return bx('derm-inv', '🧪 الفحوصات المطلوبة ونتائجها (Investigations)', invSum(rows),
        '<div class="dr-list" data-list="inv">' + rows.map(function (r) { return rowHtml(INVCOLS, r, 'inv'); }).join('') + '</div>' +
        '<button type="button" class="btn ghost small" data-add="inv">+ إضافة فحص</button>');
    },
    wire: function (el) {
      var box = el.querySelector('[data-list="inv"]');
      function refresh() { rowsApplyShow(box); setSum(el, 'derm-inv', invSum(collectRows(box, 'test'))); }
      wireRows(el, box, INVCOLS, 'inv', refresh);
      el.addEventListener('change', refresh);
      // today's date by default when a test is chosen
      el.addEventListener('change', function (e) { if (e.target.matches('.dr-f[data-k="test"]')) { var d = e.target.closest('.dr-row').querySelector('[data-k="reqDate"]'); if (d && !d.value) d.value = today(); } });
      refresh();
    },
    collect: function (el) { var r = collectRows(el.querySelector('[data-list="inv"]'), 'test'); return r.length ? { items: r } : null; },
    render: function (v) { var r = list(v, 'items'); return r.length ? rowsTable(INVCOLS, r) : ''; }
  });
  function invSum(rows) { if (!rows.length) return ''; var p = rows.filter(function (r) { return r.status !== 'النتيجة متاحة'; }).length; return rows.length + ' فحوصات' + (p ? ' · ' + p + ' بانتظار النتيجة' : ''); }

  /* ===================== 5) TREATMENT PLAN ===================== */
  var MEDCOLS = [['route', 'النوع', 's', ['', 'موضعي (Topical)', 'بالفم (Oral)', 'حقن (Injection)', 'بيولوجي (Biologic)', 'أخرى']],
    ['name', 'اسم الدواء', 't', 'مثال: Mometasone 0.1% cream'], ['form', 'الشكل', 't', 'كريم / مرهم / أقراص'],
    ['dose', 'الجرعة / التكرار', 't', 'مرة مساءً'], ['duration', 'المدة', 't', 'أسبوعان'], ['site', 'مكان الاستخدام / تعليمات', 't', 'طبقة رقيقة على المكان', { wide: true }]];
  var CARE = ['مرطب يومي (Moisturizer)', 'واقي شمس SPF 50 كل 2–3 ساعات', 'غسول لطيف خالٍ من الصابون', 'تجنب المحفزات المعروفة', 'استحمام فاتر وقصير', 'ملابس قطنية واسعة', 'عدم العبث بالحبوب', 'قص الأظافر', 'غسل الملابس والمفارش بماء ساخن (للمخالطين)'];
  SP.addSection('dermatology', {
    id: 'dermTx', title: '💊 خطة العلاج',
    html: function (v) {
      v = v || {};
      var meds = list(v, 'meds');
      var body = '<p class="muted">خطة العلاج تُحفظ مع الزيارة. لا تُضاف أي أدوية للروشتة إلا بالضغط على الزر وبعد مراجعة الطبيب.</p>' +
        '<h4 class="derm-h">الأدوية (Topical / Systemic)</h4><div class="dr-list" data-list="meds">' + meds.map(function (r) { return rowHtml(MEDCOLS, r, 'med'); }).join('') + '</div>' +
        '<div class="actions"><button type="button" class="btn ghost small" data-add="med">+ إضافة دواء</button>' +
        '<button type="button" class="btn small derm-to-rx" style="display:none">⤵️ نسخ الأدوية والتشخيص إلى الروشتة</button></div>' +
        '<div class="grid-2 ent-grid">' +
        ENT.fieldHtml(['care', 'العناية بالبشرة ونمط الحياة', 'c', CARE], v) +
        ENT.fieldHtml(['lifestyle', 'نصائح إضافية', 't', ''], v) +
        ENT.fieldHtml(['education', 'تثقيف المريض', 'a'], v) +
        ENT.fieldHtml(['warnings', '⚠️ علامات تستدعي الرجوع فوراً', 'a'], v) +
        ENT.fieldHtml(['goals', '🎯 أهداف العلاج', 't', 'مثال: انخفاض PASI 75% خلال 12 أسبوع'], v) + '</div>';
      return bx('derm-tx', '💊 خطة العلاج (Treatment plan)', txSum(v), body);
    },
    wire: function (el) {
      var box = el.querySelector('[data-list="meds"]'), btn = el.querySelector('.derm-to-rx');
      var rxModal = el.closest('.modal, .modal-card, [role="dialog"]');
      var meds = rxModal && rxModal.querySelector('#rxMeds');
      if (meds) btn.style.display = '';
      function refresh() { setSum(el, 'derm-tx', txSum(collectTx(el) || {})); }
      wireRows(el, box, MEDCOLS, 'med', refresh);
      el.addEventListener('change', refresh);
      btn.addEventListener('click', function () {
        var rows = collectRows(box, 'name');
        var root = el.closest('.modal, .modal-card, [role="dialog"]') || document;
        var medsBox = root.querySelector('#rxMeds'), add = root.querySelector('#rxAddMed');
        if (!medsBox || !add) return;
        var exist = Array.prototype.map.call(medsBox.querySelectorAll('.rx-name'), function (i) { return i.value.trim().toLowerCase(); });
        var added = 0;
        rows.forEach(function (r) {
          if (exist.indexOf(r.name.toLowerCase()) >= 0) return;
          var empty = Array.prototype.filter.call(medsBox.querySelectorAll('.rx-med'), function (m) { return !m.querySelector('.rx-name').value.trim(); })[0];
          if (!empty) { add.click(); empty = medsBox.lastElementChild; }
          function put(c, x) { var i = empty.querySelector(c); if (i && x) { i.value = x; i.dispatchEvent(new Event('input', { bubbles: true })); i.dispatchEvent(new Event('change', { bubbles: true })); } }
          put('.rx-name', r.name); put('.rx-form', r.form); put('.rx-freq', r.dose); put('.rx-dur', r.duration); put('.rx-inst', r.site);
          added++;
        });
        var diag = root.querySelector('#rxDiag'), dxSec = root.querySelector('[data-list="primary"]');
        if (diag && !diag.value.trim() && dxSec) { var p = collectRows(dxSec, 'name')[0]; if (p) diag.value = p.name + (p.code ? ' (' + p.code + ')' : ''); }
        var notes = root.querySelector('#rxNotes'), v = collectTx(el) || {};
        var extra = (v.care || []).concat(v.lifestyle ? [v.lifestyle] : []);
        if (notes && extra.length && notes.value.indexOf(extra[0]) < 0) notes.value = (notes.value ? notes.value + '\n' : '') + extra.join(' — ');
        btn.textContent = added ? '✔ تمت إضافة ' + added + ' — راجعها في الروشتة' : '✔ الأدوية موجودة بالفعل في الروشتة';
        setTimeout(function () { btn.textContent = '⤵️ نسخ الأدوية والتشخيص إلى الروشتة'; }, 3000);
      });
      refresh();
    },
    collect: collectTx,
    render: function (v) {
      if (!v) return '';
      var rows = [];
      if ((v.care || []).length) rows.push(['العناية بالبشرة', v.care.join('، ')]);
      [['lifestyle', 'نصائح'], ['education', 'تثقيف المريض'], ['warnings', 'علامات الخطر'], ['goals', 'أهداف العلاج']].forEach(function (k) { if (v[k[0]]) rows.push([k[1], v[k[0]]]); });
      var meds = list(v, 'meds');
      var h = (meds.length ? rowsTable(MEDCOLS, meds) : '') + (rows.length ? SP.tableHtml(['البند', 'القيمة'], rows) : '');
      return h ? h : '';
    }
  });
  function collectTx(el) {
    var o = ENT.collectFields(el) || {}, m = collectRows(el.querySelector('[data-list="meds"]'), 'name');
    if (m.length) o.meds = m;
    return Object.keys(o).length ? o : null;
  }
  function txSum(v) { var n = list(v, 'meds').length; return [n ? n + ' أدوية' : '', (v.care || []).length ? 'عناية بالبشرة' : '', v.goals ? 'أهداف' : ''].filter(Boolean).join(' · '); }

  /* ===================== 6) PROCEDURES (configurable list) ===================== */
  var PROC_ALL = ['منظار جلد (Dermoscopy)', 'خزعة جلدية (Skin biopsy)', 'كي بالتبريد (Cryotherapy)', 'كي كهربائي (Electrocautery)', 'تقشير كيميائي (Chemical peel)',
    'ليزر (Laser)', 'حقن موضعي (Intralesional injection)', 'استئصال جراحي (Excision)', 'شق وتصريف (Incision & drainage)', 'ديرمابن / ميكرونيدلينج (Microneedling)',
    'بلازما (PRP)', 'بوتوكس / فيلر', 'إزالة ثآليل', 'أخرى'];
  var CFG_KEY = 'cm_derm_proc_cfg_v1';
  function procEnabled() { try { var c = JSON.parse(localStorage.getItem(CFG_KEY)); if (Array.isArray(c) && c.length) return c; } catch (e) {} return PROC_ALL.slice(); }
  function procCols(selected) {
    var en = procEnabled();
    var types = [''].concat(PROC_ALL.filter(function (p) { return en.indexOf(p) >= 0 || p === selected; }));
    return [['type', 'الإجراء', 's', types], ['date', 'التاريخ', 'd'], ['site', 'الموضع التشريحي', 't', ''], ['indication', 'سبب الإجراء (Indication)', 't', ''],
      ['finding', 'الموجودات (Dermoscopy findings)', 't', 'شبكة صبغية / نقاط / أوعية…', { show: 'type=Dermoscopy', wide: true }],
      ['technique', 'الطريقة / الإعدادات (Technique / Settings)', 't', 'نوع الليزر، الطاقة، المادة والتركيز، عدد الدورات…', { show: 'type=Cryo|Electro|peel|Laser|injection|Excision|Microneedling|PRP|بوتوكس|ثآليل|biopsy|drainage|أخرى', wide: true }],
      ['consent', 'الموافقة (Consent)', 's', ['', 'موافقة شفهية', 'موافقة كتابية موقعة', 'لم تؤخذ']],
      ['path', 'رقم العينة / المعمل', 't', '', { show: 'type=biopsy|Excision' }], ['pathStatus', 'حالة الباثولوجي', 's', ['', 'أُرسلت', 'النتيجة وصلت', 'تم إبلاغ المريض'], { show: 'type=biopsy|Excision' }],
      ['pathResult', 'نتيجة الباثولوجي + التاريخ', 't', '', { show: 'type=biopsy|Excision', wide: true }],
      ['complications', 'المضاعفات', 't', 'لا يوجد'], ['post', 'تعليمات بعد الإجراء', 't', '', { wide: true }]];
  }
  SP.addSection('dermatology', {
    id: 'dermProc', title: '🛠️ الإجراءات الجلدية',
    html: function (v) {
      var rows = list(v, 'items'), en = procEnabled();
      var cfg = '<details class="derm-cfg"><summary>⚙️ تخصيص قائمة الإجراءات المتاحة في عيادتي</summary><div class="ort-chips">' + PROC_ALL.map(function (p) {
        return '<label class="ort-chip"><input type="checkbox" class="derm-pcfg" value="' + esc(p) + '"' + (en.indexOf(p) >= 0 ? ' checked' : '') + ' /> ' + esc(p) + '</label>';
      }).join('') + '</div><p class="muted">يُحفظ الاختيار على هذا الجهاز ويُطبّق على الإجراءات الجديدة.</p></details>';
      return bx('derm-proc', '🛠️ الإجراءات الجلدية (Procedures)', procSum(rows),
        '<div class="dr-list" data-list="proc">' + rows.map(function (r) { return rowHtml(procCols(r.type), r, 'proc'); }).join('') + '</div>' +
        '<button type="button" class="btn ghost small" data-add="proc">+ إضافة إجراء</button>' + cfg);
    },
    wire: function (el) {
      var box = el.querySelector('[data-list="proc"]');
      function refresh() { rowsApplyShow(box); setSum(el, 'derm-proc', procSum(collectRows(box, 'type'))); }
      el.addEventListener('click', function (e) {
        if (e.target.closest('[data-add="proc"]')) { box.insertAdjacentHTML('beforeend', rowHtml(procCols(), { date: today() }, 'proc')); refresh(); }
        else if (e.target.classList.contains('dr-del') && box.contains(e.target)) { e.target.closest('.dr-row').remove(); refresh(); }
      });
      el.addEventListener('change', function (e) {
        if (e.target.classList.contains('derm-pcfg')) {
          var on = Array.prototype.filter.call(el.querySelectorAll('.derm-pcfg'), function (c) { return c.checked; }).map(function (c) { return c.value; });
          try { localStorage.setItem(CFG_KEY, JSON.stringify(on.length ? on : PROC_ALL)); } catch (x) {}
          return;
        }
        refresh();
      });
      refresh();
    },
    collect: function (el) { var r = collectRows(el.querySelector('[data-list="proc"]'), 'type'); return r.length ? { items: r } : null; },
    render: function (v) { var r = list(v, 'items'); return r.length ? rowsTable(procCols(), r) : ''; }
  });
  function procSum(rows) { return rows.map(function (r) { return (r.type || '').split(' (')[0]; }).join('، '); }

  /* ===================== 7) CLINICAL PHOTOS (same key `files`) ===================== */
  var STAGES = ['', 'قبل العلاج (Before)', 'أثناء العلاج', 'بعد العلاج (After)', 'متابعة'];
  var PSITES = ['', 'فروة الرأس', 'الوجه', 'الرقبة', 'الصدر', 'الظهر', 'البطن', 'الذراع', 'اليد', 'الساق', 'القدم', 'الأظافر', 'الأعضاء التناسلية', 'أخرى'];
  function isImg(f) { return /^image\//.test(f.type || '') || /\.(jpe?g|png|webp|gif|heic)$/i.test(f.name || ''); }
  function photoRow(f, i) {
    return '<div class="derm-ph" data-i="' + i + '">' +
      (isImg(f) ? '<a href="' + esc(f.url) + '" target="_blank" rel="noopener"><img src="' + esc(f.url) + '" alt="" loading="lazy" /></a>' : '<a class="derm-ph-doc" href="' + esc(f.url) + '" target="_blank" rel="noopener">📄 ' + esc(f.name) + '</a>') +
      '<div class="derm-ph-meta">' +
      '<input type="date" data-m="date" value="' + esc(f.date || '') + '" title="تاريخ التصوير" />' +
      '<select data-m="site">' + opts(PSITES.indexOf(f.site || '') >= 0 ? PSITES : PSITES.concat([f.site]), f.site || '') + '</select>' +
      '<select data-m="stage">' + opts(STAGES, f.stage || '') + '</select>' +
      '<input data-m="desc" placeholder="وصف (اختياري)" value="' + esc(f.desc || '') + '" />' +
      '<button type="button" class="btn small danger derm-ph-del">🗑</button></div></div>';
  }
  SP.addSection('dermatology', {
    id: 'files', title: '📷 صور الحالة',
    html: function (v) {
      var files = Array.isArray(v) ? v : [];
      var consent = files.some(function (f) { return f.consent; });
      var saved = ''; try { saved = files.length ? esc(JSON.stringify(files)) : ''; } catch (e) {}
      var body = '<label class="sev-chk derm-consent"><input type="checkbox" class="derm-cons"' + (consent ? ' checked' : '') + ' /> المريض وافق على تصوير الحالة واستخدام الصور للمتابعة الطبية فقط</label>' +
        '<div class="grid-2 ent-grid"><div class="field"><label>الموضع (للصور الجديدة)</label><select class="derm-new-site">' + opts(PSITES, '') + '</select></div>' +
        '<div class="field"><label>المرحلة</label><select class="derm-new-stage">' + opts(STAGES, '') + '</select></div></div>' +
        '<input type="file" class="derm-file" multiple accept="image/*,application/pdf" disabled />' +
        '<p class="muted derm-status"></p><div class="derm-ph-list" data-saved="' + saved + '"></div>' +
        '<div class="derm-timeline"></div>';
      return bx('derm-photos', '📷 صور الحالة قبل / بعد (Clinical photos)', files.length ? files.length + ' صور' : '', body);
    },
    wire: function (el) {
      var listEl = el.querySelector('.derm-ph-list'), input = el.querySelector('.derm-file'), cons = el.querySelector('.derm-cons'), st = el.querySelector('.derm-status');
      el._files = []; try { var s = listEl.getAttribute('data-saved'); if (s) el._files = JSON.parse(s) || []; } catch (e) {}
      function sortF() { el._files.sort(function (a, b) { return (a.date || '').localeCompare(b.date || ''); }); }
      function render() {
        sortF();
        listEl.innerHTML = el._files.map(photoRow).join('');
        input.disabled = !cons.checked;
        setSum(el, 'derm-photos', el._files.length ? el._files.length + ' صور' : '');
      }
      cons.addEventListener('change', render);
      listEl.addEventListener('change', function (e) {
        var m = e.target.getAttribute('data-m'), row = e.target.closest('.derm-ph'); if (!m || !row) return;
        var f = el._files[Number(row.dataset.i)]; if (f) { if (e.target.value) f[m] = e.target.value; else delete f[m]; }
        if (m === 'date') render();
      });
      listEl.addEventListener('input', function (e) {
        if (e.target.getAttribute('data-m') !== 'desc') return;
        var f = el._files[Number(e.target.closest('.derm-ph').dataset.i)]; if (f) f.desc = e.target.value;
      });
      listEl.addEventListener('click', function (e) {
        if (!e.target.classList.contains('derm-ph-del')) return;
        if (!confirm('حذف الصورة من هذه الزيارة؟')) return;
        el._files.splice(Number(e.target.closest('.derm-ph').dataset.i), 1); render();
      });
      input.addEventListener('change', async function () {
        var files = Array.from(input.files || []); input.value = '';
        if (!files.length || !cons.checked) return;
        var t0 = Date.now();
        while (!(window.ClinicFiles && window.ClinicFiles.upload) && Date.now() - t0 < 6000) await new Promise(function (r) { setTimeout(r, 200); });
        if (!(window.ClinicFiles && window.ClinicFiles.upload)) { st.textContent = 'رفع الصور غير متاح حالياً (تعذر تحميل وحدة التخزين).'; return; }
        var site = el.querySelector('.derm-new-site').value, stage = el.querySelector('.derm-new-stage').value;
        for (var i = 0; i < files.length; i++) {
          try {
            st.textContent = 'جارٍ رفع ' + files[i].name + ' (' + (i + 1) + '/' + files.length + ')...';
            var meta = await window.ClinicFiles.upload(files[i], 'dermatology', function (p) { st.textContent = 'جارٍ الرفع ' + p + '%'; });
            meta.date = today(); meta.consent = true; if (site) meta.site = site; if (stage) meta.stage = stage;
            el._files.push(meta); render();
          } catch (e) { st.textContent = 'تعذر رفع "' + files[i].name + '": ' + ((e && e.friendly) || (e && e.message) || 'خطأ'); await new Promise(function (r) { setTimeout(r, 1500); }); }
        }
        if (st.textContent.indexOf('تعذر') < 0) st.textContent = '';
      });
      // timeline of photos from previous visits of the same patient + side-by-side comparison
      function timeline() {
        var tl = el.querySelector('.derm-timeline'), all = [];
        prevVisits().forEach(function (vis) {
          var f = vis.exam && vis.exam.specialty === 'dermatology' && vis.exam.sections && vis.exam.sections.files;
          (Array.isArray(f) ? f : []).forEach(function (x) { if (isImg(x) && x.url) all.push({ url: x.url, date: x.date || vis.date, site: x.site || '', stage: x.stage || '' }); });
        });
        var seen = {}; all = all.filter(function (x) { if (seen[x.url]) return false; seen[x.url] = 1; return true; });
        if (!all.length) { tl.innerHTML = ''; return; }
        all.sort(function (a, b) { return (a.date || '').localeCompare(b.date || ''); });
        tl.innerHTML = '<h4 class="derm-h">🗂️ صور الزيارات السابقة (بالترتيب الزمني) — اختر صورتين للمقارنة</h4><div class="derm-tl">' + all.map(function (x, i) {
          return '<label class="derm-tl-i"><input type="checkbox" class="derm-cmp" value="' + i + '" /><img src="' + esc(x.url) + '" alt="" loading="lazy" /><span>' + esc(x.date || '') + (x.site ? ' · ' + esc(x.site) : '') + (x.stage ? ' · ' + esc(x.stage.split(' (')[0]) : '') + '</span></label>';
        }).join('') + '</div><button type="button" class="btn small derm-cmp-go">🔍 مقارنة الصورتين</button><div class="derm-cmp-view"></div>';
        tl._all = all;
      }
      el.addEventListener('click', function (e) {
        if (!e.target.classList.contains('derm-cmp-go')) return;
        var tl = el.querySelector('.derm-timeline'), sel = Array.prototype.filter.call(tl.querySelectorAll('.derm-cmp'), function (c) { return c.checked; }).map(function (c) { return tl._all[Number(c.value)]; });
        var view = tl.querySelector('.derm-cmp-view');
        if (sel.length !== 2) { view.innerHTML = '<p class="muted">اختر صورتين بالضبط.</p>'; return; }
        view.innerHTML = '<div class="derm-cmp-grid">' + sel.map(function (x) { return '<figure><img src="' + esc(x.url) + '" alt="" /><figcaption>' + esc(x.date || '') + (x.site ? ' · ' + esc(x.site) : '') + '</figcaption></figure>'; }).join('') + '</div>';
      });
      document.addEventListener('clinic-patient-changed', timeline);
      render(); timeline();
    },
    collect: function (el) { return el._files && el._files.length ? el._files.map(function (f) { return Object.assign({}, f); }) : null; },
    render: function (v) {
      if (!v || !v.length) return '';
      var s = v.slice().sort(function (a, b) { return (a.date || '').localeCompare(b.date || ''); });
      return '<div class="derm-print-ph">' + s.map(function (f) {
        var cap = [f.date, f.site, f.stage ? f.stage.split(' (')[0] : '', f.desc].filter(Boolean).map(esc).join(' · ');
        return isImg(f) ? '<figure><a href="' + esc(f.url) + '" target="_blank" rel="noopener"><img src="' + esc(f.url) + '" alt="" /></a><figcaption>' + (cap || esc(f.name)) + '</figcaption></figure>'
          : '<p><a href="' + esc(f.url) + '" target="_blank" rel="noopener">' + esc(f.name) + '</a></p>';
      }).join('') + '</div>';
    }
  });

  /* ===================== 8) FOLLOW-UP ===================== */
  SP.addSection('dermatology', fsec({
    id: 'dermFollow', title: '📅 المتابعة والاستجابة للعلاج', box: 'derm-follow',
    groups: [
      { id: 'resp', t: 'الاستجابة منذ الزيارة السابقة', f: [
          F('response', 'الاستجابة للعلاج', 's', ['', 'شفاء تام (Clear)', 'تحسن واضح', 'تحسن جزئي', 'لا تغيير', 'أسوأ']),
          F('adherence', 'الالتزام بالعلاج', 's', ['', 'ملتزم تماماً', 'التزام جزئي', 'غير ملتزم']),
          F('sideFx', 'أعراض جانبية؟', 's', YN),
          F('sideFxNote', 'الأعراض الجانبية', 't', 'جفاف، تهيج، اضطراب هضمي…', { show: 'sideFx=نعم' }),
          F('progress', 'ملاحظات التطور', 'a')],
        post: function () { var t = []; prevVisits().forEach(function (x) { var s = x.exam && x.exam.sections && x.exam.sections.dermFollow; if (s && s.response) t.push(x.date + ': ' + s.response); }); return t.length ? '<p class="muted">📉 السابق: ' + esc(t.slice(-4).join(' ← ')) + '</p>' : ''; },
        sum: function (v) { return [v.response, v.adherence].filter(Boolean).join(' · '); } },
      { id: 'next', t: 'الزيارة القادمة (Next visit)', f: [
          F('interval', 'بعد', 's', ['', 'أسبوع', 'أسبوعين', '3 أسابيع', 'شهر', '6 أسابيع', 'شهرين', '3 شهور', '6 شهور']),
          F('nextDate', '📅 موعد الزيارة القادمة', 'd', '', { nr: 1 }),
          F('nextReason', 'سبب المتابعة', 't', 'تقييم الاستجابة للعلاج', { nr: 1 })],
        sum: function (v) { return v.nextDate ? v.nextDate + (v.nextReason ? ' — ' + v.nextReason : '') : ''; } }
    ],
    wire: function (el, refresh) {
      el.addEventListener('change', function (e) {
        if (!e.target.matches('.ef[data-k="interval"]') || !e.target.value) return;
        var d = { 'أسبوع': 7, 'أسبوعين': 14, '3 أسابيع': 21, 'شهر': 30, '6 أسابيع': 42, 'شهرين': 60, '3 شهور': 91, '6 شهور': 182 }[e.target.value];
        var t = new Date(today() + 'T00:00:00'); t.setDate(t.getDate() + d);
        var n = el.querySelector('.ef[data-k="nextDate"]'); n.value = t.toISOString().slice(0, 10); refresh();
      });
    },
    summary: function (v) { return [v.response, v.nextDate ? 'المتابعة ' + v.nextDate : ''].filter(Boolean).join(' · '); },
    extraRender: function (v) { return v.nextDate ? '<p><b>📅 موعد المتابعة:</b> ' + esc(v.nextDate) + (v.nextReason ? ' — ' + esc(v.nextReason) : '') + '</p>' : ''; }
  }));

  SP.orderSections('dermatology', ['dermHx', 'dermExam', 'lesions', 'dermDx', 'dermInv', 'dermTx', 'severity', 'dermProc', 'files', 'dermFollow']);

  function dermFollowups(exam) {
    var f = exam && exam.sections && exam.sections.dermFollow;
    return f && f.nextDate ? [{ key: 'dermNext', kind: 'derm', date: f.nextDate, reason: f.nextReason || 'متابعة جلدية' }] : [];
  }
  window.ClinicDerm = { dermFollowups: dermFollowups, splitDx: splitDx, catalog: DX };
})();
