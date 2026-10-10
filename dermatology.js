// ============ Dermatology module (وحدة الجلدية) ============
// v51: Fitzpatrick skin type, extended lesion map (color + distribution),
// severity scores (PASI, EASI, SCORAD, Acne/IGA, BSA, DLQI) with trend, photos.
// Old lesion records ({site,type,size,notes}) still load.

(function () {
  var SP = window.ClinicSpecialty;
  if (!SP) return;
  var esc = SP.escape;
  var CC = window.ClinicCare || null;

  // Fitzpatrick skin type field is defined in specialties.js (next to «نوع البشرة»).

  /* ---------- lesion map ---------- */
  var SITES = ['', 'فروة الرأس', 'الوجه', 'الرقبة', 'الصدر', 'الظهر', 'البطن', 'الذراع', 'اليد', 'الكفوف / الأخمص (Palms/Soles)', 'الثنيات (Flexures)', 'الإبط (Axilla)', 'الأربية (Groin)', 'الأرداف (Buttocks)', 'الأغشية المخاطية (Mucosa)', 'الأعضاء التناسلية (Genitals)', 'الساق', 'القدم', 'الأظافر', 'منطقة أخرى'];
  var TYPES = ['', 'بقعة (Macule)', 'رقعة (Patch)', 'حطاطة (Papule)', 'لويحة (Plaque)', 'بثرة (Pustule)', 'حويصلة (Vesicle)', 'فقاعة (Bulla)', 'عقدة (Nodule)', 'شرى (Wheal)', 'قشور (Scales)', 'قشرة (Crust)', 'تآكل (Erosion)', 'تقرح (Ulcer)', 'سحجة (Excoriation)', 'تحزز (Lichenification)', 'ندبة (Scar)', 'ضمور (Atrophy)', 'توسع شعيرات (Telangiectasia)', 'فرفرية (Purpura)', 'نفق الجرب (Burrow)', 'كيس (Cyst)', 'وحمة (Nevus)'];
  var COLORS = ['', 'أحمر (Erythematous)', 'وردي', 'بني', 'أسود', 'أبيض / ناقص الصبغة', 'أصفر', 'بنفسجي', 'بلون الجلد'];
  var DIST = ['', 'موضعي (Localized)', 'منتشر (Generalized)', 'متماثل (Symmetrical)', 'على الأسطح الباسطة (Extensor)', 'في الثنيات (Flexural)', 'خطي (Linear)', 'حلقي (Annular)', 'متجمع (Grouped)', 'جلدي قطعي (Dermatomal)', 'في المناطق المعرضة للشمس'];

  function opts(list, val, ph) {
    var has = !val || list.indexOf(val) >= 0;
    return (has ? list : list.concat([val])).map(function (s) {
      return '<option value="' + esc(s) + '"' + (s === (val || '') ? ' selected' : '') + '>' + (s ? esc(s) : ph) + '</option>';
    }).join('');
  }
  function row(r) {
    r = r || {};
    return '<div class="les-row">' +
      '<select class="l-site">' + opts(SITES, r.site, '— الموضع —') + '</select>' +
      '<select class="l-type">' + opts(TYPES, r.type, '— نوع الآفة —') + '</select>' +
      '<select class="l-color">' + opts(COLORS, r.color, '— اللون —') + '</select>' +
      '<select class="l-dist">' + opts(DIST, r.distribution, '— نمط التوزيع —') + '</select>' +
      '<input class="l-size" placeholder="الحجم (سم)" value="' + esc(r.size || '') + '" />' +
      '<input class="l-notes" placeholder="ملاحظات" value="' + esc(r.notes || '') + '" />' +
      '<button type="button" class="btn small danger l-del">🗑</button>' +
      '</div>';
  }

  SP.addSection('dermatology', {
    id: 'lesions',
    title: '🔎 خريطة الآفات الجلدية',
    html: function (v) {
      var list = Array.isArray(v) && v.length ? v : [null];
      return '<p class="muted">سجّل موضع ونوع ولون ونمط توزيع كل آفة.</p>' +
        '<div class="les-list">' + list.map(row).join('') + '</div>' +
        '<button type="button" class="btn ghost small les-add">+ إضافة آفة</button>';
    },
    wire: function (el) {
      var list = el.querySelector('.les-list');
      el.querySelector('.les-add').addEventListener('click', function () {
        list.insertAdjacentHTML('beforeend', row());
      });
      list.addEventListener('click', function (e) {
        if (!e.target.classList.contains('l-del')) return;
        var rows = list.querySelectorAll('.les-row');
        if (rows.length === 1) {
          rows[0].querySelectorAll('input').forEach(function (i) { i.value = ''; });
          rows[0].querySelectorAll('select').forEach(function (s) { s.value = ''; });
          return;
        }
        e.target.closest('.les-row').remove();
      });
    },
    collect: function (el) {
      var out = [];
      el.querySelectorAll('.les-row').forEach(function (r) {
        var site = r.querySelector('.l-site').value;
        var type = r.querySelector('.l-type').value;
        if (!site && !type) return;
        var o = {
          site: site, type: type,
          size: (r.querySelector('.l-size').value || '').trim(),
          notes: (r.querySelector('.l-notes').value || '').trim()
        };
        var c = r.querySelector('.l-color').value, d = r.querySelector('.l-dist').value;
        if (c) o.color = c;
        if (d) o.distribution = d;
        out.push(o);
      });
      return out.length ? out : null;
    },
    render: function (v) {
      if (!v || !v.length) return '';
      return SP.tableHtml(['الموضع', 'نوع الآفة', 'اللون', 'التوزيع', 'الحجم', 'ملاحظات'],
        v.map(function (r) { return [r.site, r.type, r.color || '', r.distribution || '', r.size, r.notes]; }));
    }
  });

  /* ---------- severity scores ---------- */
  var REG = [['head', 'الرأس والرقبة'], ['upper', 'الأطراف العلوية'], ['trunk', 'الجذع'], ['lower', 'الأطراف السفلية']];
  var W_ADULT = { head: 0.1, upper: 0.2, trunk: 0.3, lower: 0.4 };
  var W_CHILD = { head: 0.2, upper: 0.2, trunk: 0.3, lower: 0.3 };
  var AREA = ['0 — لا يوجد', '1 — أقل من 10%', '2 — 10–29%', '3 — 30–49%', '4 — 50–69%', '5 — 70–89%', '6 — 90–100%'];
  var PASI_S = [['e', 'الاحمرار (Erythema)'], ['i', 'السُمك (Induration)'], ['s', 'التقشر (Scaling)']];
  var EASI_S = [['e', 'الاحمرار'], ['p', 'الوذمة/الحطاطات'], ['x', 'السحجات'], ['l', 'التحزز']];
  var SCORAD_B = [['er', 'الاحمرار'], ['ed', 'الوذمة / الحطاطات'], ['oz', 'النزّ / القشور'], ['ex', 'السحجات'], ['li', 'التحزز'], ['dr', 'الجفاف']];
  var ACNE = ['', 'خفيف (Mild)', 'متوسط (Moderate)', 'شديد (Severe)'];
  var IGA = ['', '0 — جلد صافٍ', '1 — شبه صافٍ', '2 — خفيف', '3 — متوسط', '4 — شديد'];
  var DLQI_Q = [
    'خلال الأسبوع الماضي، ما مدى الحكة أو الألم أو الحرقان في الجلد؟',
    'ما مدى شعورك بالإحراج أو الخجل بسبب جلدك؟',
    'ما مدى تأثير جلدك على التسوق أو الاهتمام بالمنزل؟',
    'ما مدى تأثير جلدك على اختيار ملابسك؟',
    'ما مدى تأثير جلدك على أنشطتك الاجتماعية أو الترفيهية؟',
    'ما مدى صعوبة ممارسة الرياضة بسبب جلدك؟',
    'هل منعك جلدك من العمل أو الدراسة؟ (نعم = 3)',
    'ما مدى المشاكل مع شريك الحياة أو الأصدقاء أو الأقارب بسبب جلدك؟',
    'ما مدى تأثير جلدك على العلاقة الحميمة؟',
    'ما مدى مشكلة علاج جلدك (وقت، فوضى في المنزل)؟'];
  var DLQI_A = [['', '—'], ['3', 'كثيراً جداً'], ['2', 'كثيراً'], ['1', 'قليلاً'], ['0', 'لا على الإطلاق / لا ينطبق']];

  function sel(cls, pairs, val) {
    val = val == null ? '' : String(val);
    return '<select class="' + cls + '">' + pairs.map(function (o) {
      return '<option value="' + esc(o[0]) + '"' + (val === o[0] ? ' selected' : '') + '>' + esc(o[1]) + '</option>';
    }).join('') + '</select>';
  }
  function n03(cls, val, max) {
    var a = [['', '—']]; for (var i = 0; i <= max; i++) a.push([String(i), String(i)]);
    return sel(cls, a, val == null ? '' : String(val));
  }
  function regionTable(prefix, signs, v, max) {
    v = v || {};
    return '<div class="table-wrap"><table class="sev-t"><thead><tr><th>المنطقة</th>' + signs.map(function (s) { return '<th>' + s[1] + ' (0–' + max + ')</th>'; }).join('') + '<th>المساحة (0–6)</th></tr></thead><tbody>' +
      REG.map(function (r) {
        var rv = v[r[0]] || {};
        return '<tr data-reg="' + r[0] + '"><td>' + r[1] + '</td>' + signs.map(function (s) { return '<td>' + n03(prefix + '-' + s[0], rv[s[0]], max) + '</td>'; }).join('') +
          '<td>' + sel(prefix + '-a', [['', '—']].concat(AREA.map(function (t, i) { return [String(i), t]; })), rv.a == null ? '' : String(rv.a)) + '</td></tr>';
      }).join('') + '</tbody></table></div>';
  }
  function readRegions(el, wrap, prefix, signs) {
    var out = {}, any = false;
    el.querySelectorAll('.sev-' + wrap + ' tr[data-reg]').forEach(function (tr) {
      var o = {};
      signs.concat([['a']]).forEach(function (s) { var x = tr.querySelector('.' + prefix + '-' + s[0]).value; if (x !== '') { o[s[0]] = Number(x); any = true; } });
      out[tr.dataset.reg] = o;
    });
    return any ? out : null;
  }
  // v56: a region counts as complete only when every sign AND the area are entered.
  // Missing values are NOT zeros: incomplete scores are flagged on screen and in the report.
  function regionComplete(reg, signs) {
    if (!reg) return false;
    return REG.every(function (r) { var o = reg[r[0]]; return o && o.a != null && signs.every(function (x) { return o[x[0]] != null; }); });
  }
  function regionTotal(reg, signs, w) {
    if (!reg) return null;
    var t = 0;
    REG.forEach(function (r) {
      var o = reg[r[0]] || {}, s = 0;
      signs.forEach(function (x) { s += o[x[0]] || 0; });
      t += w[r[0]] * s * (o.a || 0);
    });
    return +t.toFixed(1);
  }
  function scoradComplete(sc) {
    return !!sc && ['extent', 'itch', 'sleep'].concat(SCORAD_B.map(function (x) { return x[0]; })).every(function (k) { return sc[k] != null; });
  }
  // DLQI (Finlay): one unanswered question scores 0; two or more unanswered → score invalid.
  function dlqiScore(ans) {
    var miss = 0, t = 0;
    for (var i = 0; i < 10; i++) { if (ans[i] == null) miss++; else t += ans[i]; }
    return miss > 1 ? null : t;
  }
  function easiBand(t) { return t == null ? '' : t === 0 ? 'صافٍ' : t <= 1 ? 'شبه صافٍ' : t <= 7 ? 'خفيف' : t <= 21 ? 'متوسط' : t <= 50 ? 'شديد' : 'شديد جداً'; }
  function bsaBand(t) { return t == null ? '' : t < 3 ? 'خفيف' : t <= 10 ? 'متوسط' : 'شديد'; }
  var INC = ' <span class="sev-inc">⚠️ غير مكتمل — بعض القيم لم تُدخل</span>';
  function incTxt(f) { return f ? ' (غير مكتمل)' : ''; }
  function scoradTotal(sc) {
    if (!sc) return null;
    var b = 0; SCORAD_B.forEach(function (x) { b += Number(sc[x[0]]) || 0; });
    return +((Number(sc.extent) || 0) / 5 + 3.5 * b + (Number(sc.itch) || 0) + (Number(sc.sleep) || 0)).toFixed(1);
  }
  function scoradBand(t) { return t == null ? '' : t < 25 ? 'خفيف' : t <= 50 ? 'متوسط' : 'شديد'; }
  function dlqiBand(t) { return t == null ? '' : t <= 1 ? 'لا تأثير' : t <= 5 ? 'تأثير بسيط' : t <= 10 ? 'تأثير متوسط' : t <= 20 ? 'تأثير كبير جداً' : 'تأثير بالغ'; }
  function pasiBand(t) { return t == null ? '' : t < 5 ? 'خفيف' : t <= 10 ? 'متوسط' : 'شديد'; }

  function sub(id, title, sum, body) { return CC ? CC.box(id, title, sum, body, 'cc-sub') : '<h4>' + title + '</h4>' + body; }

  function trendSvg(vals) {
    if (vals.length < 2) return '';
    var W = 140, H = 34, max = Math.max.apply(null, vals.map(function (v) { return v.v; })) || 1;
    var pts = vals.map(function (v, i) { return [(i / (vals.length - 1)) * (W - 8) + 4, H - 4 - (v.v / max) * (H - 8)]; });
    return '<svg viewBox="0 0 ' + W + ' ' + H + '" class="sev-spark" direction="ltr"><polyline points="' + pts.map(function (p) { return p[0].toFixed(1) + ',' + p[1].toFixed(1); }).join(' ') + '"/>' +
      pts.map(function (p, i) { return '<circle cx="' + p[0] + '" cy="' + p[1] + '" r="2.5"><title>' + esc(vals[i].d || 'الآن') + ': ' + vals[i].v + '</title></circle>'; }).join('') + '</svg>';
  }

  SP.addSection('dermatology', {
    id: 'severity',
    title: '📊 مقاييس الشدة',
    html: function (v) {
      v = v || {};
      var sc = v.scorad || {}, dl = (v.dlqi && v.dlqi.answers) || [];
      var body =
        sub('derm-pasi', 'PASI — الصدفية (Psoriasis)', v.pasiTotal != null ? 'PASI ' + v.pasiTotal : '',
          '<div class="sev-pasi">' + regionTable('pa', PASI_S, v.pasi, 4) + '</div><p class="sev-out" data-out="pasi"></p>') +
        sub('derm-easi', 'EASI — الإكزيما (Eczema)', v.easiTotal != null ? 'EASI ' + v.easiTotal : '',
          '<label class="sev-chk"><input type="checkbox" class="easi-child"' + (v.easiChild ? ' checked' : '') + ' /> طفل أقل من 8 سنوات</label>' +
          '<div class="sev-easi">' + regionTable('ea', EASI_S, v.easi, 3) + '</div><p class="sev-out" data-out="easi"></p>') +
        sub('derm-scorad', 'SCORAD — الإكزيما', v.scoradTotal != null ? 'SCORAD ' + v.scoradTotal : '',
          '<div class="grid-2"><div class="field"><label>A — نسبة المساحة المصابة (%)</label><input class="sc-extent" type="number" min="0" max="100" value="' + esc(sc.extent == null ? '' : sc.extent) + '" /></div></div>' +
          '<div class="grid-2 sev-grid">' + SCORAD_B.map(function (x) { return '<div class="field"><label>B — ' + x[1] + ' (0–3)</label>' + n03('sc-' + x[0], sc[x[0]], 3) + '</div>'; }).join('') + '</div>' +
          '<div class="grid-2"><div class="field"><label>C — الحكة (0–10)</label>' + n03('sc-itch', sc.itch, 10) + '</div><div class="field"><label>C — اضطراب النوم (0–10)</label>' + n03('sc-sleep', sc.sleep, 10) + '</div></div>' +
          '<p class="sev-out" data-out="scorad"></p>') +
        sub('derm-acne', 'حب الشباب و IGA', [v.acne, v.iga != null && v.iga !== '' ? 'IGA ' + v.iga : ''].filter(Boolean).join(' · '),
          '<div class="grid-2"><div class="field"><label>درجة حب الشباب (Acne grade)</label>' + sel('sv-acne', ACNE.map(function (a) { return [a, a || '—']; }), v.acne || '') + '</div>' +
          '<div class="field"><label>التقييم العام للطبيب (IGA)</label>' + sel('sv-iga', IGA.map(function (a, i) { return [i ? String(i - 1) : '', a || '—']; }), v.iga == null ? '' : String(v.iga)) + '</div></div>') +
        sub('derm-bsa', 'BSA — مساحة سطح الجسم', v.bsa != null ? 'BSA ' + v.bsa + '%' : '',
          '<div class="grid-2"><div class="field"><label>عدد الكفوف (كف المريض = 1%)</label><input class="sv-palms" type="number" min="0" max="100" step="0.5" value="' + esc(v.bsaPalms == null ? '' : v.bsaPalms) + '" /></div>' +
          '<div class="field"><label>النسبة</label><p class="sev-out" data-out="bsa">—</p></div></div>') +
        sub('derm-dlqi', 'DLQI — جودة الحياة', v.dlqi && v.dlqi.total != null ? 'DLQI ' + v.dlqi.total : '',
          '<ol class="dlqi-list">' + DLQI_Q.map(function (q, i) {
            return '<li><span>' + esc(q) + '</span>' + sel('dl-q dl-' + i, DLQI_A, dl[i] == null ? '' : String(dl[i])) + '</li>';
          }).join('') + '</ol><p class="sev-out" data-out="dlqi"></p>') +
        '<div class="sev-trend"></div>' +
        '<div class="sev-orig" hidden data-v="' + esc(JSON.stringify(v)) + '"></div>';
      return CC ? CC.box('derm-sev', '📊 مقاييس الشدة (Severity Scores)', '', body, 'cc-sec') : body;
    },
    wire: function (el) {
      function readAll() {
        var o = {};
        var pa = readRegions(el, 'pasi', 'pa', PASI_S); if (pa) { o.pasi = pa; o.pasiTotal = regionTotal(pa, PASI_S, W_ADULT); if (!regionComplete(pa, PASI_S)) o.pasiIncomplete = true; }
        var child = el.querySelector('.easi-child').checked;
        var ea = readRegions(el, 'easi', 'ea', EASI_S); if (ea) { o.easi = ea; o.easiChild = child; o.easiTotal = regionTotal(ea, EASI_S, child ? W_CHILD : W_ADULT); if (!regionComplete(ea, EASI_S)) o.easiIncomplete = true; }
        var sc = {}, anySc = false;
        ['extent', 'itch', 'sleep'].concat(SCORAD_B.map(function (x) { return x[0]; })).forEach(function (k) {
          var x = el.querySelector('.sc-' + k).value; if (x !== '') { sc[k] = Number(x); anySc = true; }
        });
        if (sc.extent != null) sc.extent = Math.max(0, Math.min(100, sc.extent));
        if (anySc) { o.scorad = sc; o.scoradTotal = scoradTotal(sc); if (!scoradComplete(sc)) o.scoradIncomplete = true; }
        var acne = el.querySelector('.sv-acne').value, iga = el.querySelector('.sv-iga').value;
        if (acne) o.acne = acne; if (iga !== '') o.iga = Number(iga);
        var palms = el.querySelector('.sv-palms').value; if (palms !== '') { var bp = Math.max(0, Math.min(100, Number(palms))); o.bsaPalms = bp; o.bsa = bp; }
        var ans = [], anyD = false;
        el.querySelectorAll('.dl-q').forEach(function (s, i) { ans[i] = s.value === '' ? null : Number(s.value); if (s.value !== '') anyD = true; });
        // keep totals saved by older versions when their detailed inputs are not present
        try {
          var org = JSON.parse(el.querySelector('.sev-orig').getAttribute('data-v') || '{}');
          ['pasiTotal', 'easiTotal', 'scoradTotal'].forEach(function (k) {
            var base = k.replace('Total', '');
            if (o[k] == null && org[k] != null && !org[base]) o[k] = org[k];
          });
        } catch (e) {}
        if (anyD) { var dt = dlqiScore(ans); o.dlqi = { answers: ans, total: dt }; if (dt == null) o.dlqi.invalid = true; }
        return o;
      }
      function out(k, html) { var p = el.querySelector('[data-out="' + k + '"]'); if (p) p.innerHTML = html; }
      function boxOf(id) { return el.querySelector('[data-cc="' + id + '"]'); }
      function update() {
        var o = readAll();
        out('pasi', o.pasiTotal != null ? 'الإجمالي: <b>PASI ' + o.pasiTotal + '</b> / 72 — ' + pasiBand(o.pasiTotal) + (o.pasiIncomplete ? INC : '') : '— لم يُقيَّم');
        out('easi', o.easiTotal != null ? 'الإجمالي: <b>EASI ' + o.easiTotal + '</b> / 72 — ' + easiBand(o.easiTotal) + (o.easiIncomplete ? INC : '') : '— لم يُقيَّم');
        out('scorad', o.scoradTotal != null ? 'الإجمالي: <b>SCORAD ' + o.scoradTotal + '</b> / 103 — ' + scoradBand(o.scoradTotal) + (o.scoradIncomplete ? INC : '') : '— لم يُقيَّم');
        out('bsa', o.bsa != null ? '<b>' + o.bsa + '%</b> — ' + bsaBand(o.bsa) : '— لم يُقيَّم');
        out('dlqi', o.dlqi ? (o.dlqi.invalid ? '<span class="sev-inc">⚠️ لا يمكن حساب DLQI: أكثر من سؤال بدون إجابة</span>' : 'الإجمالي: <b>DLQI ' + o.dlqi.total + '</b> / 30 — ' + dlqiBand(o.dlqi.total)) : '— لم يُقيَّم');
        if (CC) {
          CC.setSummary(boxOf('derm-pasi'), o.pasiTotal != null ? 'PASI ' + o.pasiTotal : '');
          CC.setSummary(boxOf('derm-easi'), o.easiTotal != null ? 'EASI ' + o.easiTotal : '');
          CC.setSummary(boxOf('derm-scorad'), o.scoradTotal != null ? 'SCORAD ' + o.scoradTotal : '');
          CC.setSummary(boxOf('derm-acne'), [o.acne, o.iga != null ? 'IGA ' + o.iga : ''].filter(Boolean).join(' · '));
          CC.setSummary(boxOf('derm-bsa'), o.bsa != null ? 'BSA ' + o.bsa + '%' : '');
          CC.setSummary(boxOf('derm-dlqi'), o.dlqi && o.dlqi.total != null ? 'DLQI ' + o.dlqi.total : '');
          var parts = [];
          if (o.pasiTotal != null) parts.push('PASI ' + o.pasiTotal);
          if (o.easiTotal != null) parts.push('EASI ' + o.easiTotal);
          if (o.scoradTotal != null) parts.push('SCORAD ' + o.scoradTotal);
          if (o.dlqi && o.dlqi.total != null) parts.push('DLQI ' + o.dlqi.total);
          if (o.bsa != null) parts.push('BSA ' + o.bsa + '%');
          CC.setSummary(boxOf('derm-sev'), parts.join(' · '));
        }
        trend(o);
      }
      function trend(o) {
        var box = el.querySelector('.sev-trend'), p = CC && CC.getPatient();
        if (!box) return;
        var prev = p ? CC.visitsFor(p).filter(function (v) { return v.exam && v.exam.sections && v.exam.sections.severity; }) : [];
        var keys = [['pasiTotal', 'PASI'], ['easiTotal', 'EASI'], ['scoradTotal', 'SCORAD'], ['dlqi', 'DLQI'], ['bsa', 'BSA %']];
        var rows = keys.map(function (k) {
          var get = function (s) { var x = s[k[0]]; return k[0] === 'dlqi' ? (x ? x.total : null) : x; };
          var vals = prev.map(function (v) { return { d: v.date, v: get(v.exam.sections.severity) }; }).filter(function (x) { return x.v != null; });
          var cur = get(o), inc = o[k[0].replace('Total', '') + 'Incomplete'];
          if (cur != null && !inc) vals.push({ d: '', v: cur });
          if (vals.length < 2) return '';
          var a = vals[vals.length - 2].v, b = vals[vals.length - 1].v, d = +(b - a).toFixed(1);
          var pct = a ? Math.round((b - a) / a * 100) : null, base = vals[0].v;
          var cmp = (d < 0 ? '⬇️ تحسن ' : d > 0 ? '⬆️ زيادة ' : '＝ ') + (d ? Math.abs(d) : 'بدون تغيير') + (pct != null && d ? ' (' + Math.abs(pct) + '%)' : '');
          if (k[0] === 'pasiTotal' && base > 0) { var r = Math.round((base - b) / base * 100); if (r >= 50) cmp += ' · PASI ' + (r >= 90 ? 90 : r >= 75 ? 75 : 50) + ' مقارنة بأول زيارة'; }
          return '<div class="sev-tr-row"><span>' + k[1] + '</span>' + trendSvg(vals) + '<span class="muted">' + vals.map(function (x) { return (x.d ? x.d + ': ' : 'الآن: ') + x.v; }).join(' ← ') + '</span><b class="sev-cmp">' + cmp + '</b></div>';
        }).join('');
        box.innerHTML = rows ? '<h4>📉 مقارنة بالزيارات السابقة</h4>' + rows : '';
      }
      el.addEventListener('change', update);
      el.addEventListener('input', update);
      document.addEventListener('clinic-patient-changed', update);
      el._sevRead = readAll;
      update();
    },
    collect: function (el) {
      if (!el._sevRead) return null;
      var o = el._sevRead();
      return Object.keys(o).length ? o : null;
    },
    render: function (v) {
      if (!v) return '';
      var rows = [];
      if (v.pasiTotal != null) rows.push(['PASI', v.pasiTotal + ' / 72 — ' + pasiBand(v.pasiTotal) + incTxt(v.pasiIncomplete)]);
      if (v.easiTotal != null) rows.push(['EASI', v.easiTotal + ' / 72 — ' + easiBand(v.easiTotal) + incTxt(v.easiIncomplete)]);
      if (v.scoradTotal != null) rows.push(['SCORAD', v.scoradTotal + ' / 103 — ' + scoradBand(v.scoradTotal) + incTxt(v.scoradIncomplete)]);
      if (v.acne) rows.push(['حب الشباب', v.acne]);
      if (v.iga != null) rows.push(['IGA', String(v.iga)]);
      if (v.bsa != null) rows.push(['BSA', v.bsa + '%']);
      if (v.dlqi && v.dlqi.total != null) rows.push(['DLQI', v.dlqi.total + ' / 30 — ' + dlqiBand(v.dlqi.total)]);
      return rows.length ? '<h4>📊 مقاييس الشدة</h4>' + SP.tableHtml(['المقياس', 'النتيجة'], rows) : '';
    }
  });

  // Fallback photos section; derm-plus.js (v56) replaces it with the dated before/after version (same `files` key).
  SP.addSection('dermatology', SP.filesSection({
    id: 'files',
    title: '📎 صور الحالة',
    hint: 'صور قبل / بعد العلاج.',
    folder: 'dermatology'
  }));
  window.ClinicDermScores = { regionTotal: regionTotal, regionComplete: regionComplete, scoradTotal: scoradTotal, dlqiScore: dlqiScore, W_ADULT: W_ADULT, W_CHILD: W_CHILD, PASI_S: PASI_S, EASI_S: EASI_S };
})();
