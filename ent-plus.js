// ============ ENT PLUS (v53) — وحدة الأنف والأذن والحنجرة المتقدمة ============
// Additive module loaded AFTER specialties-extra.js. Nothing old is changed:
// entSymptoms / entExam / entFiles keep their fields and printing. New sections save inside
// exam.sections like every other specialty section (new keys only):
//
//  entSides    per-side ear / nose / throat exam + tuning forks + per-side tonsils
//  entAudio    audiogram (AC/BC 250–8000 Hz) + SVG plot + PTA + degree + type + tympanometry
//  entVertigo  vertigo / dizziness (auto-opens when entSymptoms.vertigo = "نعم")
//  entNose     ARIA, rhinosinusitis duration class, polyps, endoscopy, adenoid, SNOT-22, Lund-Mackay, epistaxis, smell
//  entTonsil   tonsillitis episodes (3 years) + surgical-criteria helper + pediatric sleep checklist
//  entVoice    hoarseness, laryngoscopy per cord, VHI-10, dysphagia
//  entSleep    STOP-BANG + Epworth + BMI / neck / Mallampati / Friedman
//  entRedflags head & neck red flags + urgent banners
//  entProc     clinic procedures + surgical history (date / side / notes)
//  entFollow   next visit (feeds the shared ClinicCare follow-up list) + printable Arabic instruction sheets
//  entExtra    House-Brackmann, structured neck mass, pediatric ENT
//
// Every block is a ClinicCare collapsible box: closed by default, one-line summary, state kept
// in localStorage (cm_collapse_v1). All scores are helpers only — the doctor must verify.

(function () {
  var SP = window.ClinicSpecialty;
  if (!SP) return;
  var CC = window.ClinicCare;
  var esc = SP.escape;

  /* ---------------- generic helpers ---------------- */
  function bx(id, title, sum, body) {
    if (CC) return CC.box(id, title, sum, body, 'ent-box');
    return '<div class="ent-box"><h4>' + title + '</h4>' + body + '</div>';
  }
  function setSum(el, id, text) {
    if (!CC) return;
    CC.setSummary(el.querySelector('.cc-box[data-cc="' + id + '"]'), text);
  }
  function gv(o, k) { return k.split('.').reduce(function (a, p) { return a == null ? undefined : a[p]; }, o); }
  function sv(o, k, x) { var ps = k.split('.'), c = o; for (var i = 0; i < ps.length - 1; i++) c = c[ps[i]] || (c[ps[i]] = {}); c[ps[ps.length - 1]] = x; }
  function num(x) { return x === '' || x == null || isNaN(x) ? null : Number(x); }
  function today() { return CC ? CC.today() : new Date().toISOString().slice(0, 10); }
  function prevVisits() { var p = CC && CC.getPatient(); return p ? CC.visitsFor(p) : []; }
  var YN = ['', 'لا', 'نعم'];
  var SIDE = ['', 'يمين', 'يسار', 'الجهتان'];
  var PN = ['', 'إيجابي (Positive)', 'سلبي (Negative)'];
  var RL = [['R', 'يمين (R)'], ['L', 'يسار (L)']];

  function opts(list, val) {
    return list.map(function (o) {
      return '<option value="' + esc(o) + '"' + (String(o) === String(val == null ? '' : val) ? ' selected' : '') + '>' + (o === '' ? '—' : esc(o)) + '</option>';
    }).join('');
  }
  // field spec: [key, label, type, options, flags]   types: s select · t text · n number · d date · a textarea · c checkboxes
  function fieldHtml(f, v) {
    var k = f[0], x = gv(v, k), t = f[2], wide = (t === 'a' || t === 'c' || (f[4] && f[4].wide));
    var inp;
    if (t === 's') inp = '<select class="ef" data-k="' + k + '">' + opts(f[3], x) + '</select>';
    else if (t === 'c') inp = '<div class="ef-c ent-checks" data-k="' + k + '">' + f[3].map(function (o) {
      return '<label class="ort-chip"><input type="checkbox" value="' + esc(o) + '"' + ((x || []).indexOf(o) >= 0 ? ' checked' : '') + ' /> ' + esc(o) + '</label>';
    }).join('') + '</div>';
    else if (t === 'a') inp = '<textarea class="ef" data-k="' + k + '" rows="2">' + esc(x || '') + '</textarea>';
    else inp = '<input class="ef" data-k="' + k + '" type="' + (t === 'n' ? 'number' : t === 'd' ? 'date' : 'text') + '"' + (t === 'n' ? ' step="any" inputmode="decimal"' : '') + ' value="' + esc(x == null ? '' : x) + '"' + (f[3] && t !== 's' ? ' placeholder="' + esc(f[3]) + '"' : '') + ' />';
    return '<div class="field"' + (wide ? ' style="grid-column:1 / -1;"' : '') + '><label>' + esc(f[1]) + '</label>' + inp + '</div>';
  }
  function collectFields(el) {
    var out = {}, any = false;
    el.querySelectorAll('.ef').forEach(function (i) { var x = (i.value || '').trim(); if (x !== '') { sv(out, i.dataset.k, x); any = true; } });
    el.querySelectorAll('.ef-c').forEach(function (c) {
      var a = Array.prototype.map.call(c.querySelectorAll('input:checked'), function (i) { return i.value; });
      if (a.length) { sv(out, c.dataset.k, a); any = true; }
    });
    return any ? out : null;
  }
  // per-side expansion: [key,label,type,opts] -> R and L copies
  function sides(prefix, list) {
    var out = [];
    list.forEach(function (f) { RL.forEach(function (s) { out.push([prefix + '.' + s[0] + '.' + f[0], f[1] + ' — ' + (s[0] === 'R' ? 'يمين' : 'يسار'), f[2], f[3], f[4]]); }); });
    return out;
  }
  // questionnaire: n items scored 0..max; keys prefix.0..n-1 (not printed one by one)
  function qFields(prefix, items, max) {
    var o = ['']; for (var i = 0; i <= max; i++) o.push(String(i));
    return items.map(function (q, i) { return [prefix + '.' + i, (i + 1) + '. ' + q, 's', o, { nr: 1 }]; });
  }
  function qTotal(v, prefix, n) {
    var a = gv(v, prefix) || {}, t = 0, c = 0;
    for (var i = 0; i < n; i++) if (a[i] !== undefined && a[i] !== '') { t += Number(a[i]); c++; }
    return c ? { total: t, answered: c } : null;
  }
  function trend(sectionId, path) {
    var pts = [];
    prevVisits().forEach(function (x) { var s = x.exam && x.exam.sections && x.exam.sections[sectionId]; var val = s && gv(s, path); if (val != null && val !== '') pts.push(x.date + ': ' + val); });
    return pts.length ? '📉 السابق: ' + pts.slice(-4).join(' ← ') : '';
  }

  /* Section factory.
     cfg: { id, title, box, groups:[{id,t,f:[fields], pre(v), post(v), sum(v)}], summary(v), derive(v), calc(el,v), extraRender(v), banner(v) } */
  function entSection(cfg) {
    var labels = {}, noRender = {};
    cfg.groups.forEach(function (g) { g.f.forEach(function (f) { labels[f[0]] = f[1]; if (f[4] && f[4].nr) noRender[f[0]] = 1; }); });
    function collect(el) {
      var v = collectFields(el);
      if (v && cfg.derive) cfg.derive(v);
      return v;
    }
    return {
      id: cfg.id,
      title: cfg.title,
      html: function (v) {
        v = v || {};
        var inner = cfg.groups.map(function (g) {
          var body = (g.pre ? g.pre(v) : '') + (g.f.length ? '<div class="grid-2 ent-grid">' + g.f.filter(function (f) { return !(f[4] && f[4].hidden); }).map(function (f) { return fieldHtml(f, v); }).join('') + '</div>' : '') + (g.post ? g.post(v) : '');
          return cfg.groups.length === 1 ? body : bx(cfg.box + '-' + g.id, g.t, g.sum ? g.sum(v) : '', body);
        }).join('');
        return bx(cfg.box, cfg.title, cfg.summary(v), (cfg.bannerHtml ? cfg.bannerHtml : '') + inner);
      },
      wire: function (el) {
        if (el._entWired) return; el._entWired = true;
        function refresh() {
          var v = collect(el) || {};
          if (cfg.calc) { try { cfg.calc(el, v); } catch (e) { console.warn(e); } }
          setSum(el, cfg.box, cfg.summary(v));
          if (cfg.groups.length > 1) cfg.groups.forEach(function (g) { if (g.sum) setSum(el, cfg.box + '-' + g.id, g.sum(v)); });
        }
        el.addEventListener('change', refresh);
        el.addEventListener('input', function (e) { if (e.target.type === 'number' || e.target.type === 'date') refresh(); });
        if (cfg.wire) cfg.wire(el, refresh);
        refresh();
      },
      collect: collect,
      render: function (v) {
        if (!v) return '';
        var rows = [];
        cfg.groups.forEach(function (g) {
          g.f.forEach(function (f) {
            if (noRender[f[0]]) return;
            var x = gv(v, f[0]);
            if (x == null || x === '' || (Array.isArray(x) && !x.length)) return;
            rows.push([labels[f[0]], Array.isArray(x) ? x.join('، ') : x]);
          });
        });
        var h = cfg.extraRender ? cfg.extraRender(v) : '';
        if (rows.length) h += SP.tableHtml(['البند', 'القيمة'], rows);
        return h;
      }
    };
  }
  function out(el, sel, html) { var x = el.querySelector(sel); if (x) x.innerHTML = html; }

  /* =====================================================================
     1) PER-SIDE EAR / NOSE / THROAT EXAM  (old entExam fields are untouched)
     Tuning-fork logic (classic interpretation, doctor must verify):
       Rinne negative (BC > AC) in an ear  -> conductive loss in that ear.
       Weber lateralises to ear X: if X is Rinne-negative -> conductive loss in X;
                                    if both Rinne positive -> sensorineural loss in the OTHER ear.
     ===================================================================== */
  var CANAL = ['', 'طبيعية (Normal)', 'شمع (Wax)', 'التهاب خارجي (Otitis externa)', 'إفرازات (Discharge)', 'جسم غريب (Foreign body)', 'نتوء عظمي (Exostosis)'];
  var TM = ['', 'سليمة (Intact)', 'محتقنة (Congested)', 'منتفخة (Bulging)', 'منكمشة (Retracted)', 'مثقوبة (Perforated)', 'سوائل خلفها (Effusion)', 'أنبوب تهوية (Grommet in place)', 'تندب / تصلب (Scarring / Tympanosclerosis)'];
  var PERF = 'مثقوبة (Perforated)';
  function forkHint(v) {
    var f = v.fork || {}, rR = f.rinneR || '', rL = f.rinneL || '', w = f.weber || '';
    if (!rR && !rL && !w) return '';
    var negR = rR.indexOf('سلبي') === 0, negL = rL.indexOf('سلبي') === 0, posR = rR.indexOf('إيجابي') === 0, posL = rL.indexOf('إيجابي') === 0;
    var h = [];
    if (negR) h.push('توصيلي في الأذن اليمنى (conductive R)');
    if (negL) h.push('توصيلي في الأذن اليسرى (conductive L)');
    if (w.indexOf('يمين') === 0 && posR && posL) h.push('حسي عصبي في الأذن اليسرى (sensorineural L)');
    if (w.indexOf('يسار') === 0 && posR && posL) h.push('حسي عصبي في الأذن اليمنى (sensorineural R)');
    if (w.indexOf('يمين') === 0 && negL && !negR) h.push('Weber لا يتوافق مع Rinne — راجع الفحص');
    if (w.indexOf('يسار') === 0 && negR && !negL) h.push('Weber لا يتوافق مع Rinne — راجع الفحص');
    return h.length ? 'يشير إلى: ' + h.join(' · ') : (w.indexOf('المنتصف') === 0 && posR && posL ? 'طبيعي أو فقد متماثل' : '');
  }
  var TONS = ['', '0', '1', '2', '3', '4'];
  SP.addSection('ent', entSection({
    id: 'entSides', title: '👂 الفحص لكل جهة (يمين / يسار)', box: 'ent-sides',
    groups: [
      { id: 'ear', t: 'الأذن — يمين / يسار (Ear)', f: sides('ear', [
          ['pinna', 'الصيوان (Pinna)', 't', 'طبيعي'], ['canal', 'القناة (Canal)', 's', CANAL], ['tm', 'الطبلة (TM)', 's', TM],
          ['perf', 'الثقب: الحجم / المكان (Perforation size / site)', 't', 'مركزي صغير'], ['mastoid', 'ألم الماستويد (Mastoid tenderness)', 's', YN]]),
        sum: function (v) { var e = v.ear || {}; return ['R', 'L'].map(function (s) { var x = e[s] || {}; return (x.tm || x.canal) ? s + ': ' + (x.tm || x.canal).split(' (')[0] : ''; }).filter(Boolean).join(' · '); } },
      { id: 'fork', t: 'الشوكة الرنانة (Tuning forks)', f: [
          ['fork.rinneR', 'Rinne — يمين', 's', PN], ['fork.rinneL', 'Rinne — يسار', 's', PN],
          ['fork.weber', 'Weber', 's', ['', 'المنتصف (Center)', 'يمين (Right)', 'يسار (Left)']]],
        post: function () { return '<p class="sev-out ent-out" data-o="fork"></p>'; }, sum: forkHint },
      { id: 'ton', t: 'اللوزتان — يمين / يسار (Tonsils)', f: [
          ['ton.R', 'درجة اللوزة — يمين (Grade 0-4)', 's', TONS], ['ton.L', 'درجة اللوزة — يسار (Grade 0-4)', 's', TONS],
          ['ton.exudate', 'صديد / إفرازات (Exudate)', 's', YN]],
        sum: function (v) { var t = v.ton || {}; return (t.R || t.L) ? 'R ' + (t.R || '-') + ' · L ' + (t.L || '-') + (t.exudate === 'نعم' ? ' · صديد' : '') : ''; } },
      { id: 'nose', t: 'الأنف — يمين / يسار (Nose)', f: sides('nose', [
          ['septum', 'انحراف الحاجز (Septal deviation)', 's', ['', 'لا يوجد', 'بسيط', 'متوسط', 'شديد']],
          ['turb', 'القرنيات (Turbinates)', 's', ['', 'طبيعية', 'متضخمة', 'محتقنة', 'شاحبة']],
          ['meatus', 'إفرازات الصماخ الأوسط (Middle meatus discharge)', 's', ['', 'لا يوجد', 'مخاطية', 'صديدية']],
          ['polyps', 'لحمية (Polyps)', 's', YN], ['mucosa', 'لون الغشاء (Mucosa)', 's', ['', 'وردي طبيعي', 'شاحب (Pale)', 'أحمر (Red)']]]),
        sum: function (v) { var n = v.nose || {}; return ['R', 'L'].map(function (s) { var x = n[s] || {}; return x.septum && x.septum !== 'لا يوجد' ? 'انحراف ' + s : (x.polyps === 'نعم' ? 'لحمية ' + s : ''); }).filter(Boolean).join(' · '); } }
    ],
    summary: function (v) {
      var p = [], e = v.ear || {};
      ['R', 'L'].forEach(function (s) { var x = e[s] || {}; if (x.tm) p.push(s + ' ' + x.tm.split(' (')[0]); });
      var t = v.ton || {}; if (t.R || t.L) p.push('Tonsils R' + (t.R || '-') + '/L' + (t.L || '-'));
      var h = forkHint(v); if (h) p.push(h.replace('يشير إلى: ', ''));
      return p.join(' · ');
    },
    calc: function (el, v) {
      out(el, '[data-o="fork"]', esc(forkHint(v) || '—'));
      ['R', 'L'].forEach(function (s) {
        var tm = el.querySelector('[data-k="ear.' + s + '.tm"]'), pf = el.querySelector('[data-k="ear.' + s + '.perf"]');
        if (tm && pf) pf.closest('.field').style.display = (tm.value === PERF || pf.value) ? '' : 'none';
      });
    },
    extraRender: function (v) { var h = forkHint(v); return h ? '<p><b>Tuning forks:</b> ' + esc(h) + '</p>' : ''; }
  }));

  /* =====================================================================
     2) AUDIOLOGY
     PTA (4-frequency) = mean AC at 500, 1000, 2000, 4000 Hz.
     Degree (ASHA / Clark style, dB HL): ≤25 normal · 26–40 mild · 41–55 moderate · 56–70 moderately severe · 71–90 severe · >90 profound.
     Type: air-bone gap (ABG) = mean(AC − BC) at the PTA frequencies where both exist.
        ABG ≥ 15 dB and BC-PTA ≤ 25  -> conductive · ABG ≥ 15 and BC-PTA > 25 -> mixed
        ABG < 15 and AC-PTA > 25     -> sensorineural · otherwise normal.  Doctor can override.
     ===================================================================== */
  var FREQ = [250, 500, 1000, 2000, 4000, 8000], PTAF = [500, 1000, 2000, 4000];
  function degree(p) { return p == null ? '' : p <= 25 ? 'طبيعي (Normal)' : p <= 40 ? 'بسيط (Mild)' : p <= 55 ? 'متوسط (Moderate)' : p <= 70 ? 'متوسط إلى شديد (Moderately severe)' : p <= 90 ? 'شديد (Severe)' : 'عميق (Profound)'; }
  function earCalc(a, s) {
    var e = (a && a[s]) || {}, ac = e.ac || {}, bc = e.bc || {}, sa = 0, na = 0, sb = 0, nb = 0, gap = 0, ng = 0;
    PTAF.forEach(function (f) {
      var x = num(ac[f]), y = num(bc[f]);
      if (x != null) { sa += x; na++; }
      if (y != null) { sb += y; nb++; }
      if (x != null && y != null) { gap += x - y; ng++; }
    });
    if (!na) return null;
    var pta = Math.round(sa / na * 10) / 10, bpta = nb ? sb / nb : null, abg = ng ? gap / ng : null, type;
    if (abg != null && abg >= 15) type = (bpta != null && bpta <= 25) ? 'توصيلي (Conductive)' : 'مختلط (Mixed)';
    else type = pta > 25 ? 'حسي عصبي (Sensorineural)' : 'طبيعي (Normal)';
    return { pta: pta, complete: na === 4, degree: degree(pta), type: type, abg: abg == null ? null : Math.round(abg) };
  }
  function audSvg(a) {
    var W = 300, H = 210, L = 34, T = 14, gw = 250, gh = 180;
    function x(i) { return L + i * gw / (FREQ.length - 1); }
    function y(db) { return T + (db + 10) * gh / 130; } // axis -10 .. 120 dB HL (inverted: 0 at top)
    var s = '<svg viewBox="0 0 ' + W + ' ' + H + '" class="ent-aud" direction="ltr">';
    for (var d = 0; d <= 120; d += 20) s += '<line x1="' + L + '" x2="' + (L + gw) + '" y1="' + y(d) + '" y2="' + y(d) + '" class="g"/><text x="2" y="' + (y(d) + 3) + '">' + d + '</text>';
    FREQ.forEach(function (f, i) { s += '<line x1="' + x(i) + '" x2="' + x(i) + '" y1="' + T + '" y2="' + (T + gh) + '" class="g"/><text x="' + (x(i) - 10) + '" y="' + (H - 2) + '">' + (f >= 1000 ? f / 1000 + 'k' : f) + '</text>'; });
    s += '<rect x="' + L + '" y="' + y(-10) + '" width="' + gw + '" height="' + (y(25) - y(-10)) + '" class="nz"/>';
    [['R', 'r'], ['L', 'l']].forEach(function (p) {
      var e = (a && a[p[0]]) || {}, ac = e.ac || {}, bc = e.bc || {}, pts = [];
      FREQ.forEach(function (f, i) {
        var v = num(ac[f]);
        if (v != null) {
          pts.push(x(i) + ',' + y(v));
          s += p[0] === 'R' ? '<circle cx="' + x(i) + '" cy="' + y(v) + '" r="4" class="' + p[1] + '"/>'
            : '<path d="M' + (x(i) - 4) + ' ' + (y(v) - 4) + 'l8 8M' + (x(i) + 4) + ' ' + (y(v) - 4) + 'l-8 8" class="' + p[1] + '"/>';
        }
        var b = num(bc[f]);
        if (b != null) s += '<text x="' + (x(i) + (p[0] === 'R' ? -11 : 5)) + '" y="' + (y(b) + 4) + '" class="' + p[1] + 't">' + (p[0] === 'R' ? '&lt;' : '&gt;') + '</text>';
      });
      if (pts.length > 1) s += '<polyline points="' + pts.join(' ') + '" class="' + p[1] + ' ln"/>';
    });
    return s + '</svg>';
  }
  function audTable(v) {
    var a = v.aud || {};
    var h = '<div class="table-wrap"><table class="ent-aud-t"><thead><tr><th>Hz</th>' + FREQ.map(function (f) { return '<th>' + f + '</th>'; }).join('') + '</tr></thead><tbody>';
    [['R', 'ac', 'يمين — هوائي AC (O)'], ['R', 'bc', 'يمين — عظمي BC (<)'], ['L', 'ac', 'يسار — هوائي AC (X)'], ['L', 'bc', 'يسار — عظمي BC (>)']].forEach(function (r) {
      h += '<tr class="' + (r[0] === 'R' ? 'ent-r' : 'ent-l') + '"><th>' + r[2] + '</th>' + FREQ.map(function (f) {
        var x = gv(a, r[0] + '.' + r[1] + '.' + f);
        return '<td><input class="ef" type="number" step="5" min="-10" max="120" inputmode="numeric" data-k="aud.' + r[0] + '.' + r[1] + '.' + f + '" value="' + esc(x == null ? '' : x) + '"/></td>';
      }).join('') + '</tr>';
    });
    return h + '</tbody></table></div>';
  }
  function audText(v, s) {
    var c = v.calc && v.calc[s]; if (!c) return '';
    var type = (v.override && v.override[s]) || c.type;
    return s + ': PTA ' + c.pta + ' dB — ' + c.degree.split(' (')[0] + (c.pta > 25 || (v.override && v.override[s]) ? ' ' + type.split(' (')[0] : '');
  }
  function prevAudios() {
    var list = [];
    prevVisits().forEach(function (x) { var a = x.exam && x.exam.sections && x.exam.sections.entAudio; if (a && a.calc) list.push({ date: a.date || x.date, v: a }); });
    return list.slice(-5);
  }
  var TYPES = ['', 'طبيعي (Normal)', 'توصيلي (Conductive)', 'حسي عصبي (Sensorineural)', 'مختلط (Mixed)'];
  var TYMP = ['', 'A', 'As', 'Ad', 'B', 'C'];
  SP.addSection('ent', entSection({
    id: 'entAudio', title: '🎧 قياس السمع وضغط الأذن (Audiogram / Tympanometry)', box: 'ent-audio',
    groups: [
      { id: 'pta', t: 'رسم السمع (Audiogram)', f: [['date', 'تاريخ القياس', 'd']],
        pre: function (v) { return audTable(v); },
        post: function (v) { return '<div class="ent-aud-wrap"></div><p class="sev-out ent-out" data-o="aud"></p><p class="muted">🔴 O = الأذن اليمنى · 🔵 X = الأذن اليسرى · &lt; &gt; = التوصيل العظمي. المحور مقلوب 0 → 120 dB.</p>'; },
        sum: function (v) { return [audText(v, 'R'), audText(v, 'L')].filter(Boolean).join(' · '); } },
      { id: 'type', t: 'نوع الفقد (تعديل الطبيب) والطبلة', f: [
          ['override.R', 'نوع الفقد — يمين (Override)', 's', TYPES], ['override.L', 'نوع الفقد — يسار (Override)', 's', TYPES],
          ['tymp.R', 'Tympanometry — يمين', 's', TYMP], ['tymp.L', 'Tympanometry — يسار', 's', TYMP],
          ['sd.R', 'تمييز الكلام % — يمين (Speech discrimination)', 'n', '%'], ['sd.L', 'تمييز الكلام % — يسار', 'n', '%'],
          ['aid', 'سماعة طبية (Hearing aid)', 's', ['', 'لا يستخدم (None)', 'يستخدم سماعة (Uses aid)', 'تم التحويل (Referred)']]],
        sum: function (v) { var t = v.tymp || {}; return (t.R || t.L) ? 'Tymp R ' + (t.R || '-') + ' · L ' + (t.L || '-') : ''; } },
      { id: 'prev', t: 'القياسات السابقة (Previous audiograms)', f: [],
        pre: function () {
          var p = prevAudios();
          if (!p.length) return '<p class="muted">لا توجد قياسات سابقة.</p>';
          return SP.tableHtml(['التاريخ', 'يمين', 'يسار'], p.map(function (x) { return [x.date, audText(x.v, 'R').replace(/^R: /, '') || '-', audText(x.v, 'L').replace(/^L: /, '') || '-']; }));
        },
        sum: function () { var n = prevAudios().length; return n ? n + ' قياس سابق' : ''; } }
    ],
    derive: function (v) {
      v.calc = {}; ['R', 'L'].forEach(function (s) { var c = earCalc(v.aud, s); if (c) v.calc[s] = c; });
      if (!Object.keys(v.calc).length) delete v.calc;
      else if (!v.date) v.date = today();
    },
    summary: function (v) { var t = [audText(v, 'R'), audText(v, 'L')].filter(Boolean).join(', '); return t ? 'Audiogram: ' + t : ''; },
    calc: function (el, v) {
      out(el, '.ent-aud-wrap', audSvg(v.aud));
      var t = ['R', 'L'].map(function (s) { var c = v.calc && v.calc[s]; return c ? s + ': PTA ' + c.pta + ' dB' + (c.complete ? '' : ' (غير مكتمل)') + ' — ' + c.degree + ' · ' + c.type + (c.abg != null ? ' · ABG ' + c.abg + ' dB' : '') + (v.override && v.override[s] ? ' · تعديل الطبيب: ' + v.override[s] : '') : ''; }).filter(Boolean);
      out(el, '[data-o="aud"]', t.length ? t.map(esc).join('<br>') + '<br><small>⚠️ تقدير تلقائي — يجب على الطبيب المراجعة.</small>' : '—');
    },
    extraRender: function (v) {
      var h = '';
      if (v.aud) {
        h += audSvg(v.aud);
        var rows = [];
        [['R', 'ac', 'يمين AC'], ['R', 'bc', 'يمين BC'], ['L', 'ac', 'يسار AC'], ['L', 'bc', 'يسار BC']].forEach(function (r) {
          var o = gv(v.aud, r[0] + '.' + r[1]); if (o) rows.push([r[2]].concat(FREQ.map(function (f) { return o[f] != null ? o[f] : '-'; })));
        });
        if (rows.length) h += SP.tableHtml(['Hz'].concat(FREQ.map(String)), rows);
      }
      var t = [audText(v, 'R'), audText(v, 'L')].filter(Boolean);
      if (t.length) h += '<p><b>PTA:</b> ' + esc(t.join(' · ')) + '</p>';
      return h;
    }
  }));

  /* =====================================================================
     3) VERTIGO / DIZZINESS — auto-opens when entSymptoms "دوخة / دوار" = نعم
     ===================================================================== */
  var DH = ['', 'سلبي (Negative)', 'إيجابي (Positive)'];
  SP.addSection('ent', entSection({
    id: 'entVertigo', title: '🌀 الدوخة والدوار (Vertigo)', box: 'ent-vertigo',
    groups: [
      { id: 'hx', t: 'التاريخ (History)', f: [
          ['dur', 'مدة النوبة (Episode duration)', 's', ['', 'ثوانٍ (Seconds)', 'دقائق (Minutes)', 'ساعات (Hours)', 'أيام (Days)']],
          ['onset', 'البداية (Onset)', 's', ['', 'مفاجئة (Sudden)', 'تدريجية (Gradual)']],
          ['trig', 'المحفز (Triggers)', 'c', ['تغيير وضع الرأس (Head position)', 'الوقوف (Standing up)', 'لا يوجد (None)']],
          ['assoc', 'أعراض مصاحبة (Associated)', 'c', ['ضعف السمع (Hearing loss)', 'طنين (Tinnitus)', 'امتلاء الأذن (Ear fullness)', 'صداع (Headache)', 'غثيان / قيء (Nausea / vomiting)']]],
        sum: function (v) { return [v.dur, v.onset].filter(Boolean).map(function (x) { return x.split(' (')[0]; }).join(' · '); } },
      { id: 'tests', t: 'الاختبارات (Tests)', f: [
          ['dhR', 'Dix-Hallpike — يمين', 's', DH], ['dhL', 'Dix-Hallpike — يسار', 's', DH],
          ['nysDir', 'اتجاه الرأرأة (Nystagmus direction)', 't', 'geotropic torsional'],
          ['hit', 'Head impulse test', 's', ['', 'طبيعي (Normal)', 'غير طبيعي يمين (Abnormal R)', 'غير طبيعي يسار (Abnormal L)']],
          ['romberg', 'Romberg', 's', ['', 'سلبي (Negative)', 'إيجابي (Positive)']],
          ['nysType', 'نوع الرأرأة (Nystagmus type)', 's', ['', 'لا يوجد', 'أفقي (Horizontal)', 'التوائي (Torsional)', 'رأسي (Vertical)', 'متغير الاتجاه (Direction-changing)']]],
        sum: function (v) { var p = []; if (v.dhR && v.dhR.indexOf('إيجابي') === 0) p.push('DH R+'); if (v.dhL && v.dhL.indexOf('إيجابي') === 0) p.push('DH L+'); return p.join(' · '); } },
      { id: 'man', t: 'المناورة (Maneuver)', f: [
          ['maneuver', 'المناورة', 's', ['', 'لا يوجد (None)', 'Epley', 'Semont']], ['manDate', 'التاريخ', 'd']],
        sum: function (v) { return v.maneuver && v.maneuver.indexOf('لا') !== 0 ? v.maneuver + (v.manDate ? ' ' + v.manDate : '') : ''; } }
    ],
    summary: function (v) {
      var p = [];
      if (v.dur) p.push(v.dur.split(' (')[0]);
      if (v.dhR && v.dhR.indexOf('إيجابي') === 0) p.push('Dix-Hallpike R+');
      if (v.dhL && v.dhL.indexOf('إيجابي') === 0) p.push('Dix-Hallpike L+');
      if (v.maneuver && v.maneuver.indexOf('لا') !== 0) p.push(v.maneuver);
      return p.join(' · ');
    },
    wire: function (el) {
      function check() {
        var s = document.querySelector('[data-xk="vertigo"]');
        var b = el.querySelector('.cc-box[data-cc="ent-vertigo"]');
        if (s && b && CC && s.value === 'نعم' && !b.classList.contains('open') && !b._autoOpened) { b._autoOpened = true; CC.setBoxOpen(b, true); }
      }
      document.addEventListener('change', function (e) { if (e.target && e.target.dataset && e.target.dataset.xk === 'vertigo') check(); });
      setTimeout(check, 0);
    }
  }));

  /* =====================================================================
     4) NOSE & SINUS
     Rhinosinusitis by duration (EPOS / AAO-HNS): < 4 weeks acute · 4–12 weeks subacute · > 12 weeks chronic.
     SNOT-22: 22 items × 0–5 -> total 0–110 (higher = worse; MCID ≈ 9 points).
     Lund-Mackay CT: per side maxillary, anterior ethmoid, posterior ethmoid, sphenoid, frontal (0 none / 1 partial / 2 total)
                     + ostiomeatal complex (0 or 2 only) -> 12 per side, 24 total.
     ===================================================================== */
  var SNOT = ['الحاجة إلى تنظيف الأنف (Need to blow nose)', 'انسداد الأنف (Nasal blockage)', 'العطس (Sneezing)', 'سيلان الأنف (Runny nose)', 'الكحة (Cough)',
    'إفرازات خلف الأنف (Post-nasal discharge)', 'إفرازات أنفية سميكة (Thick nasal discharge)', 'امتلاء الأذن (Ear fullness)', 'الدوخة (Dizziness)', 'ألم الأذن (Ear pain)',
    'ألم / ضغط بالوجه (Facial pain / pressure)', 'ضعف الشم أو التذوق (Decreased smell / taste)', 'صعوبة بدء النوم (Difficulty falling asleep)', 'الاستيقاظ ليلاً (Waking up at night)',
    'قلة النوم الجيد (Lack of good night sleep)', 'الاستيقاظ متعباً (Waking up tired)', 'الإرهاق (Fatigue)', 'انخفاض الإنتاجية (Reduced productivity)', 'ضعف التركيز (Reduced concentration)',
    'الإحباط / العصبية (Frustrated / restless / irritable)', 'الحزن (Sad)', 'الإحراج (Embarrassed)'];
  var LM = [['max', 'الجيب الفكي (Maxillary)'], ['ae', 'الغربالي الأمامي (Anterior ethmoid)'], ['pe', 'الغربالي الخلفي (Posterior ethmoid)'], ['sph', 'الوتدي (Sphenoid)'], ['fr', 'الجبهي (Frontal)'], ['omc', 'المركب الصماخي (OMC 0 / 2)']];
  function rsClass(w) { w = num(w); return w == null ? '' : w < 4 ? 'حاد (Acute)' : w <= 12 ? 'تحت الحاد (Subacute)' : 'مزمن (Chronic)'; }
  function lmTotal(v) {
    var l = v.lm || {}, t = 0, any = false;
    ['R', 'L'].forEach(function (s) { LM.forEach(function (r) { var x = num(gv(l, s + '.' + r[0])); if (x != null) { t += x; any = true; } }); });
    return any ? t : null;
  }
  function aria(v) { return v.ariaFreq && v.ariaSev ? 'ARIA: ' + v.ariaFreq.split(' (')[0] + ' ' + v.ariaSev.split(' (')[0] : ''; }
  var POLYP = ['', '0', '1', '2', '3', '4'];
  var ENDO = ['طبيعي (Normal)', 'صديد بالصماخ الأوسط (Pus middle meatus)', 'لحمية (Polyps)', 'وذمة (Edema)', 'تضخم القرنيات (Turbinate hypertrophy)', 'انحراف (Deviation)', 'قشور (Crusts)', 'كتلة (Mass)'];
  SP.addSection('ent', entSection({
    id: 'entNose', title: '👃 الأنف والجيوب الأنفية (Nose & Sinus)', box: 'ent-nose',
    groups: [
      { id: 'ar', t: 'حساسية الأنف والتهاب الجيوب', f: [
          ['ariaFreq', 'حساسية الأنف — التكرار (ARIA)', 's', ['', 'متقطعة (Intermittent)', 'مستمرة (Persistent)']],
          ['ariaSev', 'حساسية الأنف — الشدة (ARIA)', 's', ['', 'بسيطة (Mild)', 'متوسطة / شديدة (Moderate-severe)']],
          ['rsWeeks', 'مدة أعراض الجيوب (بالأسابيع)', 'n', 'أسابيع']],
        post: function () { return '<p class="sev-out ent-out" data-o="rs"></p>'; },
        sum: function (v) { return [aria(v), v.rsClass ? 'Rhinosinusitis: ' + v.rsClass.split(' (')[0] : ''].filter(Boolean).join(' · '); } },
      { id: 'endo', t: 'اللحمية والمنظار واللحمية الخلفية', f: [
          ['polyp.R', 'درجة اللحمية — يمين (Polyp grade 0-4)', 's', POLYP], ['polyp.L', 'درجة اللحمية — يسار (Polyp grade 0-4)', 's', POLYP],
          ['endo.R', 'المنظار — يمين (Endoscopy R)', 'c', ENDO], ['endo.Rtxt', 'ملاحظات المنظار — يمين', 't'],
          ['endo.L', 'المنظار — يسار (Endoscopy L)', 'c', ENDO], ['endo.Ltxt', 'ملاحظات المنظار — يسار', 't'],
          ['adenoid', 'حجم اللحمية الخلفية عند الأطفال (% انسداد الفتحة الخلفية)', 'n', '%']],
        sum: function (v) { var p = v.polyp || {}; return [(p.R || p.L) ? 'Polyps R' + (p.R || '-') + '/L' + (p.L || '-') : '', v.adenoid ? 'Adenoid ' + v.adenoid + '%' : ''].filter(Boolean).join(' · '); } },
      { id: 'snot', t: 'SNOT-22 (0–5 لكل سؤال)', f: qFields('snot', SNOT, 5),
        pre: function () { return '<p class="muted">0 لا مشكلة · 1 بسيطة جداً · 2 بسيطة · 3 متوسطة · 4 شديدة · 5 أسوأ ما يكون</p>'; },
        post: function () { return '<p class="sev-out ent-out" data-o="snot"></p><p class="muted ort-trend" data-o="snotTr"></p>'; },
        sum: function (v) { return v.snotTotal != null ? 'SNOT-22 ' + v.snotTotal + ' / 110' : ''; } },
      { id: 'lm', t: 'Lund-Mackay (CT)', f: [],
        pre: function (v) {
          var h = '<div class="table-wrap"><table class="ort-nv"><thead><tr><th></th><th>يمين</th><th>يسار</th></tr></thead><tbody>';
          LM.forEach(function (r) {
            var o = r[0] === 'omc' ? ['', '0', '2'] : ['', '0', '1', '2'];
            h += '<tr><th>' + esc(r[1]) + '</th>' + ['R', 'L'].map(function (s) { return '<td><select class="ef" data-k="lm.' + s + '.' + r[0] + '">' + opts(o, gv(v, 'lm.' + s + '.' + r[0])) + '</select></td>'; }).join('') + '</tr>';
          });
          return h + '</tbody></table></div><p class="sev-out ent-out" data-o="lm"></p>';
        },
        sum: function (v) { return v.lmTotal != null ? 'Lund-Mackay ' + v.lmTotal + ' / 24' : ''; } },
      { id: 'epi', t: 'الرعاف (Epistaxis)', f: [
          ['epi.side', 'الجهة', 's', SIDE], ['epi.freq', 'التكرار', 't', 'مرتين أسبوعياً'],
          ['epi.amount', 'الكمية', 's', ['', 'قليلة', 'متوسطة', 'غزيرة']], ['epi.site', 'المكان المرجح', 's', ['', 'أمامي (Anterior)', 'خلفي (Posterior)']],
          ['epi.tx', 'الإجراء', 'c', ['كي (Cautery)', 'دك (Packing)']],
          ['epi.anticoag', 'يتناول مسيلات / مضادات صفائح (Anticoagulants / antiplatelets)', 's', YN]],
        sum: function (v) { var e = v.epi || {}; return e.side ? e.side + (e.site ? ' · ' + e.site.split(' (')[0] : '') + (e.anticoag === 'نعم' ? ' · مسيلات' : '') : ''; } },
      { id: 'smell', t: 'فقدان الشم (Smell loss)', f: [
          ['smell.onset', 'البداية', 's', ['', 'مفاجئة', 'تدريجية']], ['smell.dur', 'المدة', 't', '3 أشهر'], ['smell.postViral', 'بعد عدوى فيروسية (Post-viral)', 's', YN]],
        sum: function (v) { var s = v.smell || {}; return s.onset || s.dur ? 'فقدان الشم' + (s.dur ? ' ' + s.dur : '') : ''; } }
    ],
    derive: function (v) {
      var c = rsClass(v.rsWeeks); if (c) v.rsClass = c;
      var s = qTotal(v, 'snot', 22); if (s) { v.snotTotal = s.total; v.snotAnswered = s.answered; }
      var l = lmTotal(v); if (l != null) v.lmTotal = l;
    },
    summary: function (v) {
      return [aria(v), v.rsClass ? 'Rhinosinusitis ' + v.rsClass.split(' (')[0] : '', v.snotTotal != null ? 'SNOT-22 ' + v.snotTotal : '', v.lmTotal != null ? 'LM ' + v.lmTotal + '/24' : '', v.epi && v.epi.side ? 'Epistaxis ' + v.epi.side : ''].filter(Boolean).join(' · ');
    },
    calc: function (el, v) {
      out(el, '[data-o="rs"]', v.rsClass ? 'التصنيف: ' + esc(v.rsClass) : '—');
      out(el, '[data-o="snot"]', v.snotTotal != null ? 'SNOT-22 = ' + v.snotTotal + ' / 110' + (v.snotAnswered < 22 ? ' (' + v.snotAnswered + '/22 سؤال)' : '') : '—');
      out(el, '[data-o="snotTr"]', esc(trend('entNose', 'snotTotal')));
      out(el, '[data-o="lm"]', v.lmTotal != null ? 'Lund-Mackay = ' + v.lmTotal + ' / 24' : '—');
    },
    extraRender: function (v) {
      var r = [];
      if (v.rsClass) r.push(['Rhinosinusitis', v.rsClass]);
      if (v.snotTotal != null) r.push(['SNOT-22', v.snotTotal + ' / 110']);
      if (v.lmTotal != null) r.push(['Lund-Mackay', v.lmTotal + ' / 24']);
      return r.length ? SP.tableHtml(['المقياس', 'النتيجة'], r) : '';
    }
  }));

  /* =====================================================================
     5) TONSILS & ADENOIDS
     Helper only (Paradise criteria, as used in AAO-HNS tonsillectomy guideline):
       ≥ 7 episodes in the past year, OR ≥ 5 per year in each of the past 2 years, OR ≥ 3 per year in each of the past 3 years.
     ===================================================================== */
  function paradise(v) {
    var e = v.ep || {}, a = num(e.y0) || 0, b = num(e.y1) || 0, c = num(e.y2) || 0;
    return a >= 7 || (a >= 5 && b >= 5) || (a >= 3 && b >= 3 && c >= 3);
  }
  SP.addSection('ent', entSection({
    id: 'entTonsil', title: '🫁 اللوزتان واللحمية (Tonsils & Adenoids)', box: 'ent-tonsil',
    groups: [
      { id: 'ep', t: 'نوبات التهاب اللوزتين (Episodes)', f: [
          ['ep.y0', 'هذا العام (آخر 12 شهر)', 'n', '0'], ['ep.y1', 'العام الماضي', 'n', '0'], ['ep.y2', 'منذ عامين', 'n', '0']],
        post: function () { return '<div class="ent-note" data-o="par" hidden>💡 قد تنطبق معايير الجراحة الشائعة (Paradise) — <b>يجب على الطبيب التحقق</b>.</div>'; },
        sum: function (v) { var e = v.ep || {}; return e.y0 ? e.y0 + ' نوبات/سنة' : ''; } },
      { id: 'sleep', t: 'أعراض النوم عند الأطفال', f: [
          ['kidSleep', 'الأعراض', 'c', ['شخير (Snoring)', 'تنفس من الفم (Mouth breathing)', 'توقف التنفس أثناء النوم (Witnessed apnea)', 'نوم متقطع (Restless sleep)', 'تبول ليلي (Enuresis)', 'نعاس / فرط حركة نهاراً (Daytime sleepiness / hyperactivity)']]],
        sum: function (v) { return (v.kidSleep || []).length ? v.kidSleep.length + ' أعراض' : ''; } }
    ],
    derive: function (v) { if (paradise(v)) v.criteria = true; },
    summary: function (v) {
      var e = v.ep || {}, p = [];
      if (e.y0) p.push(e.y0 + ' episodes/yr');
      if (v.criteria) p.push('قد تنطبق معايير الجراحة');
      if ((v.kidSleep || []).length) p.push('شخير/نوم');
      return p.join(' · ');
    },
    calc: function (el, v) { var n = el.querySelector('[data-o="par"]'); if (n) n.hidden = !v.criteria; },
    extraRender: function (v) { return v.criteria ? '<p><b>💡 قد تنطبق معايير الجراحة الشائعة (Paradise) — يجب على الطبيب التحقق.</b></p>' : ''; }
  }));

  /* =====================================================================
     6) LARYNX & VOICE
     VHI-10: 10 items × 0–4 -> 0–40; > 11 is considered abnormal (Arffa et al. 2012).
     Pack-years = cigarettes per day / 20 × years smoked.
     ===================================================================== */
  var VHI = ['صوتي يصعّب على الناس سماعي', 'يجد الناس صعوبة في فهمي في المكان المزدحم', 'مشكلة صوتي تقيّد حياتي الاجتماعية', 'أشعر بأنني مستبعد من المحادثات بسبب صوتي',
    'مشكلة صوتي تسبب لي خسارة مادية', 'أشعر أنني أجهد نفسي لإخراج صوتي', 'وضوح صوتي غير متوقع', 'مشكلة صوتي تضايقني', 'صوتي يشعرني بالعجز', 'يسألني الناس: ما مشكلة صوتك؟'];
  var CORD_M = ['', 'طبيعية (Normal)', 'ضعف (Paresis)', 'شلل (Paralysis)'];
  var CORD_L = ['طبيعي (Normal)', 'عقدة (Nodule)', 'بوليب (Polyp)', 'كيس (Cyst)', 'وذمة (Edema)', 'كتلة (Mass)', 'طلوان أبيض (Leukoplakia)'];
  SP.addSection('ent', entSection({
    id: 'entVoice', title: '🎤 الحنجرة والصوت (Larynx & Voice)', box: 'ent-voice',
    groups: [
      { id: 'hx', t: 'البحة والتدخين (Hoarseness)', f: [
          ['hoarseDur', 'مدة البحة', 't', '4 أسابيع'], ['hoarseOnset', 'البداية', 's', ['', 'مفاجئة', 'تدريجية']],
          ['cigDay', 'سجائر يومياً', 'n'], ['smokeYears', 'سنوات التدخين', 'n'],
          ['voiceUse', 'استخدام الصوت / المهنة', 't', 'مدرس']],
        post: function () { return '<p class="sev-out ent-out" data-o="py"></p>'; },
        sum: function (v) { return [v.hoarseDur ? 'بحة ' + v.hoarseDur : '', v.packYears != null ? v.packYears + ' pack-yr' : ''].filter(Boolean).join(' · '); } },
      { id: 'scope', t: 'منظار الحنجرة (Laryngoscopy)', f: [
          ['cord.R.mob', 'حركة الحبل الصوتي — يمين', 's', CORD_M], ['cord.L.mob', 'حركة الحبل الصوتي — يسار', 's', CORD_M],
          ['cord.R.les', 'آفة الحبل — يمين', 'c', CORD_L], ['cord.L.les', 'آفة الحبل — يسار', 'c', CORD_L],
          ['airway', 'مجرى الهواء (Airway)', 's', ['', 'آمن (Patent)', 'ضيق جزئي (Partially narrowed)', 'خطر (Compromised)']],
          ['lpr', 'علامات الارتجاع الحنجري (LPR signs)', 'c', ['احمرار خلف الحنجرة', 'وذمة الطيات', 'إفرازات لزجة', 'تضخم الغشاء الخلفي']]],
        sum: function (v) { var c = v.cord || {}; return ['R', 'L'].map(function (s) { var x = c[s] || {}; return x.mob && x.mob.indexOf('طبيعية') !== 0 ? s + ' ' + x.mob.split(' (')[0] : ''; }).filter(Boolean).join(' · '); } },
      { id: 'vhi', t: 'VHI-10 (0 أبداً … 4 دائماً)', f: qFields('vhi', VHI, 4),
        post: function () { return '<p class="sev-out ent-out" data-o="vhi"></p><p class="muted ort-trend" data-o="vhiTr"></p>'; },
        sum: function (v) { return v.vhiTotal != null ? 'VHI-10 ' + v.vhiTotal + ' / 40' : ''; } },
      { id: 'dys', t: 'صعوبة / ألم البلع (Dysphagia / Odynophagia)', f: [
          ['dys.type', 'النوع', 'c', ['صعوبة بلع (Dysphagia)', 'ألم بلع (Odynophagia)']],
          ['dys.with', 'مع', 'c', ['الجوامد (Solids)', 'السوائل (Liquids)']],
          ['dys.level', 'المستوى', 's', ['', 'الفم / الحلق', 'الرقبة', 'خلف القص']]],
        sum: function (v) { var d = v.dys || {}; return (d.type || []).map(function (x) { return x.split(' (')[0]; }).join(' · '); } }
    ],
    derive: function (v) {
      var c = num(v.cigDay), y = num(v.smokeYears); if (c != null && y != null) v.packYears = Math.round(c / 20 * y * 10) / 10;
      var q = qTotal(v, 'vhi', 10); if (q) { v.vhiTotal = q.total; v.vhiAnswered = q.answered; }
    },
    summary: function (v) {
      var c = v.cord || {}, p = [];
      if (v.hoarseDur) p.push('Hoarseness ' + v.hoarseDur);
      ['R', 'L'].forEach(function (s) { var x = c[s] || {}; if (x.mob && x.mob.indexOf('طبيعية') !== 0) p.push(s + ' cord ' + x.mob.split(' (')[1].replace(')', '')); });
      if (v.vhiTotal != null) p.push('VHI-10 ' + v.vhiTotal);
      return p.join(' · ');
    },
    calc: function (el, v) {
      out(el, '[data-o="py"]', v.packYears != null ? 'Pack-years = ' + v.packYears : '—');
      out(el, '[data-o="vhi"]', v.vhiTotal != null ? 'VHI-10 = ' + v.vhiTotal + ' / 40' + (v.vhiTotal > 11 ? ' — غير طبيعي (> 11)' : ' — ضمن الطبيعي') + (v.vhiAnswered < 10 ? ' (' + v.vhiAnswered + '/10)' : '') : '—');
      out(el, '[data-o="vhiTr"]', esc(trend('entVoice', 'vhiTotal')));
    },
    extraRender: function (v) {
      var r = [];
      if (v.packYears != null) r.push(['Pack-years', v.packYears]);
      if (v.vhiTotal != null) r.push(['VHI-10', v.vhiTotal + ' / 40']);
      return r.length ? SP.tableHtml(['المقياس', 'النتيجة'], r) : '';
    }
  }));

  /* =====================================================================
     7) SLEEP APNEA SCREENING
     STOP-BANG (8 yes/no): 0–2 low · 3–4 intermediate · 5–8 high risk.
     Epworth (8 items × 0–3 = 0–24): 0–10 normal · 11–12 mild · 13–15 moderate · 16–24 severe excessive daytime sleepiness.
     BMI = weight(kg) / height(m)².
     ===================================================================== */
  var SB = [['s', 'شخير عالٍ (Snoring)'], ['t', 'إرهاق / نعاس نهاري (Tired)'], ['o', 'ملاحظة توقف التنفس (Observed apnea)'], ['p', 'ضغط مرتفع (Pressure / HTN)'],
    ['b', 'مؤشر كتلة > 35 (BMI > 35)'], ['a', 'العمر > 50 (Age > 50)'], ['n', 'محيط الرقبة > 40 سم (Neck > 40 cm)'], ['g', 'ذكر (Gender male)']];
  var ESS = ['الجلوس والقراءة', 'مشاهدة التلفزيون', 'الجلوس بلا نشاط في مكان عام', 'راكب في سيارة لمدة ساعة دون توقف', 'الاستلقاء للراحة بعد الظهر',
    'الجلوس والتحدث مع شخص', 'الجلوس بهدوء بعد الغداء دون كحول', 'في سيارة متوقفة لدقائق في الزحام'];
  function sbRisk(n) { return n >= 5 ? 'مرتفع (High)' : n >= 3 ? 'متوسط (Intermediate)' : 'منخفض (Low)'; }
  function essBand(n) { return n <= 10 ? 'طبيعي' : n <= 12 ? 'نعاس بسيط' : n <= 15 ? 'نعاس متوسط' : 'نعاس شديد'; }
  SP.addSection('ent', entSection({
    id: 'entSleep', title: '😴 فحص انقطاع النفس أثناء النوم (Sleep apnea)', box: 'ent-sleep',
    groups: [
      { id: 'body', t: 'القياسات (BMI / Neck / Mallampati)', f: [
          ['weight', 'الوزن (كجم)', 'n'], ['height', 'الطول (سم)', 'n'], ['neck', 'محيط الرقبة (سم)', 'n'],
          ['mallampati', 'Mallampati', 's', ['', 'I', 'II', 'III', 'IV']], ['tonsil', 'حجم اللوزتين', 's', TONS],
          ['friedman', 'وضع اللسان (Friedman tongue position)', 's', ['', 'I', 'IIa', 'IIb', 'III', 'IV']]],
        post: function () { return '<p class="sev-out ent-out" data-o="bmi"></p>'; },
        sum: function (v) { return v.bmi ? 'BMI ' + v.bmi : ''; } },
      { id: 'sb', t: 'STOP-BANG', f: [['sb', 'نعم لكل بند', 'c', SB.map(function (x) { return x[1]; })]],
        post: function () { return '<p class="sev-out ent-out" data-o="sb"></p>'; },
        sum: function (v) { return v.stopBang != null ? 'STOP-BANG ' + v.stopBang + '/8' : ''; } },
      { id: 'ess', t: 'Epworth (0 لا … 3 احتمال كبير للنوم)', f: qFields('ess', ESS, 3),
        post: function () { return '<p class="sev-out ent-out" data-o="ess"></p>'; },
        sum: function (v) { return v.epworth != null ? 'Epworth ' + v.epworth + '/24' : ''; } }
    ],
    derive: function (v) {
      var w = num(v.weight), h = num(v.height);
      if (w && h) v.bmi = Math.round(w / Math.pow(h / 100, 2) * 10) / 10;
      if (v.sb) { v.stopBang = v.sb.length; v.stopBangRisk = sbRisk(v.sb.length); }
      var e = qTotal(v, 'ess', 8); if (e) v.epworth = e.total;
    },
    summary: function (v) {
      return [v.stopBang != null ? 'STOP-BANG ' + v.stopBang + ' (' + v.stopBangRisk.split(' (')[0] + ')' : '', v.epworth != null ? 'Epworth ' + v.epworth : '', v.bmi ? 'BMI ' + v.bmi : ''].filter(Boolean).join(' · ');
    },
    wire: function (el) {
      // prefill weight from the visit form if it exists (pediatrics / general weight field)
      var w = el.querySelector('[data-k="weight"]');
      var src = document.querySelector('.sp-f[data-k="weight"]');
      if (w && !w.value && src && src.value) w.value = src.value;
    },
    calc: function (el, v) {
      var hint = [];
      if (v.bmi > 35) hint.push('BMI > 35');
      if (num(v.neck) > 40) hint.push('Neck > 40');
      out(el, '[data-o="bmi"]', v.bmi ? 'BMI = ' + v.bmi + (hint.length ? ' — ' + esc(hint.join('، ')) + ': ضع علامة في STOP-BANG' : '') : '—');
      out(el, '[data-o="sb"]', v.stopBang != null ? 'STOP-BANG = ' + v.stopBang + ' / 8 — خطورة ' + esc(v.stopBangRisk) : '—');
      out(el, '[data-o="ess"]', v.epworth != null ? 'Epworth = ' + v.epworth + ' / 24 — ' + essBand(v.epworth) : '—');
    },
    extraRender: function (v) {
      var r = [];
      if (v.bmi) r.push(['BMI', v.bmi]);
      if (v.stopBang != null) r.push(['STOP-BANG', v.stopBang + ' / 8 — ' + v.stopBangRisk]);
      if (v.epworth != null) r.push(['Epworth', v.epworth + ' / 24 — ' + essBand(v.epworth)]);
      return r.length ? SP.tableHtml(['المقياس', 'النتيجة'], r) : '';
    }
  }));

  /* =====================================================================
     8) RED FLAGS (head & neck cancer / urgent)
     Any ticked -> red banner. Stridor or sudden SNHL (< 72 h) -> stronger emergency banner.
     ===================================================================== */
  var RF = ['بحة مستمرة أكثر من 3 أسابيع', 'سوائل بأذن واحدة أو ضعف سمع غير مفسر عند بالغ', 'انسداد أنف بجهة واحدة مع إفرازات دموية', 'كتلة بالرقبة أكثر من أسبوعين',
    'التهاب حلق أو صعوبة بلع مستمرة', 'تضخم لوزة واحدة', 'نقص وزن غير مفسر', 'تدخين شديد أو كحول', 'صرير / صعوبة في مجرى الهواء (Stridor)', 'ضعف سمع حسي عصبي مفاجئ (خلال 72 ساعة)'];
  var RF_STRONG = [RF[8], RF[9]];
  var RF_TXT = '⚠️ عاجل: يحتاج تحويل / تقييم إضافي';
  var RF_STRONG_TXT = '🚨 طارئ: صرير أو ضعف سمع مفاجئ — تقييم فوري اليوم';
  SP.addSection('ent', entSection({
    id: 'entRedflags', title: '🚩 العلامات الحمراء (Red flags)', box: 'ent-redflags',
    bannerHtml: '<div class="ort-banner ort-red ent-rf-strong" hidden>' + RF_STRONG_TXT + '</div><div class="ort-banner ort-red ent-rf" hidden>' + RF_TXT + '</div>',
    groups: [{ id: 'rf', t: '', f: [['flags', 'ضع علامة على الموجود', 'c', RF]] }],
    summary: function (v) { var f = v.flags || []; return f.length ? (f.some(function (x) { return RF_STRONG.indexOf(x) >= 0; }) ? '🚨 ' : '⚠️ ') + f.length + ' علامات' : ''; },
    calc: function (el, v) {
      var f = v.flags || [], strong = f.some(function (x) { return RF_STRONG.indexOf(x) >= 0; });
      el.querySelector('.ent-rf-strong').hidden = !strong;
      el.querySelector('.ent-rf').hidden = !f.length || strong;
      // show the banner even while the box is closed
      var head = el.querySelector('.cc-box[data-cc="ent-redflags"]');
      if (head) head.classList.toggle('ent-alert', !!f.length);
    },
    extraRender: function (v) {
      var f = v.flags || []; if (!f.length) return '';
      var strong = f.some(function (x) { return RF_STRONG.indexOf(x) >= 0; });
      return '<p style="color:#b91c1c"><b>' + (strong ? RF_STRONG_TXT : RF_TXT) + '</b></p>';
    }
  }));

  /* =====================================================================
     9) PROCEDURES & SURGICAL HISTORY — fixed checklist, each with date / side / notes
     ===================================================================== */
  var PROC = [['wax', 'إزالة شمع / شفط (Wax removal / microsuction)'], ['fbE', 'إزالة جسم غريب — أذن (FB ear)'], ['fbN', 'إزالة جسم غريب — أنف (FB nose)'], ['cautery', 'كي الأنف (Nasal cautery)'],
    ['pack', 'دك الأنف (Nasal packing)'], ['endo', 'منظار أنف (Nasal endoscopy)'], ['tympano', 'بزل الطبلة (Tympanocentesis)'], ['myring', 'شق الطبلة (Myringotomy)'], ['dress', 'غيار أذن (Ear dressing)'], ['other', 'أخرى (Other)']];
  var SURG = [['tons', 'استئصال اللوزتين (Tonsillectomy)'], ['aden', 'استئصال اللحمية (Adenoidectomy)'], ['septo', 'تعديل الحاجز (Septoplasty)'], ['turb', 'تصغير القرنيات (Turbinate reduction)'],
    ['fess', 'منظار جيوب (FESS)'], ['tymp', 'ترقيع الطبلة (Tympanoplasty)'], ['mast', 'استئصال الماستويد (Mastoidectomy)'], ['grom', 'أنابيب تهوية (Grommets)'], ['thyr', 'استئصال الغدة الدرقية (Thyroidectomy)'], ['other', 'أخرى (Other)']];
  function logFields(prefix, list) {
    var f = [];
    list.forEach(function (p) {
      f.push([prefix + '.' + p[0] + '.date', p[1] + ' — التاريخ', 'd']);
      f.push([prefix + '.' + p[0] + '.side', p[1] + ' — الجهة', 's', SIDE]);
      f.push([prefix + '.' + p[0] + '.notes', p[1] + ' — ملاحظات', 't']);
    });
    return f;
  }
  function logPre(prefix, list) {
    return function (v) {
      return '<div class="table-wrap"><table class="ent-log"><thead><tr><th>الإجراء</th><th>التاريخ</th><th>الجهة</th><th>ملاحظات</th></tr></thead><tbody>' + list.map(function (p) {
        var k = prefix + '.' + p[0];
        return '<tr><th>' + esc(p[1]) + '</th><td><input class="ef" type="date" data-k="' + k + '.date" value="' + esc(gv(v, k + '.date') || '') + '"/></td>' +
          '<td><select class="ef" data-k="' + k + '.side">' + opts(SIDE, gv(v, k + '.side')) + '</select></td>' +
          '<td><input class="ef" type="text" data-k="' + k + '.notes" value="' + esc(gv(v, k + '.notes') || '') + '"/></td></tr>';
      }).join('') + '</tbody></table></div>';
    };
  }
  function logList(v, prefix, list) { var o = v[prefix] || {}; return list.filter(function (p) { return o[p[0]]; }).map(function (p) { return p[1].split(' (')[0]; }); }
  // The fields are drawn by logPre as a table; f is kept for collect labels but hidden in the grid.
  function hideAll(fs) { return fs.map(function (f) { return [f[0], f[1], f[2], f[3], { hidden: 1, nr: 1 }]; }); }
  function logRender(v, prefix, list, title) {
    var o = v[prefix] || {}, rows = list.filter(function (p) { return o[p[0]]; }).map(function (p) { var x = o[p[0]]; return [p[1], x.date || '-', x.side || '-', x.notes || '']; });
    return rows.length ? '<p><b>' + title + '</b></p>' + SP.tableHtml(['', 'التاريخ', 'الجهة', 'ملاحظات'], rows) : '';
  }
  SP.addSection('ent', entSection({
    id: 'entProc', title: '🛠️ الإجراءات والعمليات السابقة', box: 'ent-proc',
    groups: [
      { id: 'proc', t: 'إجراءات بالعيادة (Clinic procedures)', f: hideAll(logFields('proc', PROC)), pre: logPre('proc', PROC), sum: function (v) { return logList(v, 'proc', PROC).join('، '); } },
      { id: 'surg', t: 'العمليات السابقة (Surgical history)', f: hideAll(logFields('surg', SURG)), pre: logPre('surg', SURG), sum: function (v) { return logList(v, 'surg', SURG).join('، '); } }
    ],
    summary: function (v) { return logList(v, 'proc', PROC).concat(logList(v, 'surg', SURG)).join('، '); },
    extraRender: function (v) { return logRender(v, 'proc', PROC, 'إجراءات بالعيادة') + logRender(v, 'surg', SURG, 'العمليات السابقة'); }
  }));

  /* =====================================================================
     10) FOLLOW-UP + PATIENT INSTRUCTION SHEETS (Arabic, printable)
     ===================================================================== */
  var SHEETS = [
    ['drops', 'طريقة استخدام قطرة الأذن', ['دفّئ القطرة في يدك دقيقة قبل الاستخدام.', 'استلقِ على الجنب والأذن المصابة لأعلى.', 'اسحب صيوان الأذن للخلف وللأعلى (للأطفال: للخلف وللأسفل) وضع العدد المحدد من النقط.', 'ابقَ على نفس الوضع 3–5 دقائق، واضغط برفق على الغضروف أمام الأذن.', 'لا تلمس الأذن بطرف الزجاجة.']],
    ['spray', 'طريقة استخدام بخاخ الأنف', ['نظّف الأنف برفق قبل الاستخدام ورجّ البخاخ.', 'أمل رأسك قليلاً للأمام.', 'ضع البخاخ في فتحة الأنف ووجّهه نحو الأذن من نفس الجهة (بعيداً عن الحاجز الأنفي).', 'اضغط مع شهيق خفيف، ولا تشهق بقوة.', 'استمر بانتظام؛ مفعول بخاخ الكورتيزون يظهر خلال أيام.']],
    ['saline', 'غسول الأنف بالمحلول الملحي', ['اغسل يديك واستخدم ماء مغلي ومبرد أو محلول جاهز.', 'انحنِ فوق الحوض وأمل رأسك جانباً.', 'أدخل المحلول من فتحة الأنف العليا ودعه يخرج من الأخرى مع التنفس من الفم.', 'كرر في الجهة الأخرى ثم انفخ الأنف برفق.', 'نظّف الزجاجة وجففها بعد كل استخدام.']],
    ['water', 'احتياطات دخول الماء للأذن', ['امنع دخول الماء للأذن أثناء الاستحمام: قطنة مدهونة بالفازلين أو سدادة.', 'تجنب السباحة حتى يسمح الطبيب.', 'لا تستخدم أعواد القطن داخل الأذن.', 'جفف الأذن الخارجية بمنشفة فقط.']],
    ['tonsil', 'العناية بعد استئصال اللوزتين', ['أكثر من شرب السوائل الباردة والأطعمة اللينة.', 'تجنب الأطعمة الساخنة والحارة والصلبة لمدة أسبوعين.', 'خذ المسكن بانتظام كما وصف الطبيب.', 'الغشاء الأبيض مكان اللوزتين طبيعي.', 'عند حدوث نزيف من الفم توجه فوراً للطوارئ.']],
    ['nosebleed', 'الإسعافات الأولية للرعاف', ['اجلس وأمل رأسك للأمام (وليس للخلف).', 'اضغط على الجزء اللين من الأنف 10–15 دقيقة دون انقطاع.', 'تنفس من الفم وابصق الدم ولا تبتلعه.', 'كمادة باردة على الأنف قد تساعد.', 'إذا استمر النزيف أكثر من 20 دقيقة أو كان غزيراً توجه للطوارئ.']],
    ['voice', 'راحة الصوت والعناية به', ['قلل الكلام وتجنب الصراخ والهمس.', 'اشرب الماء بكثرة (8 أكواب يومياً).', 'امتنع عن التدخين وقلل الكافيين.', 'تجنب تنظيف الحلق بقوة؛ اشرب رشفة ماء بدلاً منه.', 'لا تأكل قبل النوم بساعتين إذا كان لديك ارتجاع.']]
  ];
  function sheetsHtml(keys) {
    return SHEETS.filter(function (s) { return keys.indexOf(s[0]) >= 0; }).map(function (s) {
      return '<div class="notes ent-sheet"><b>📝 ' + esc(s[1]) + '</b><ul style="margin:4px 0 0;padding-inline-start:18px">' + s[2].map(function (x) { return '<li>' + esc(x) + '</li>'; }).join('') + '</ul></div>';
    }).join('');
  }
  function printSheets(keys) {
    var w = window.open('', '_blank');
    if (!w) { alert('اسمح بالنوافذ المنبثقة للطباعة'); return; }
    var p = CC && CC.getPatient();
    w.document.write('<!doctype html><html lang="ar" dir="rtl"><head><meta charset="utf-8"><title>تعليمات المريض</title><style>body{font-family:Tahoma,Arial,sans-serif;padding:24px;line-height:1.8}.ent-sheet{border:1px solid #ccc;border-radius:10px;padding:12px 16px;margin-bottom:14px;page-break-inside:avoid}h2{margin:0 0 12px}</style></head><body>' +
      '<h2>تعليمات للمريض' + (p && p.fullName ? ' — ' + esc(p.fullName) : '') + '</h2>' + sheetsHtml(keys) + '<script>window.onload=function(){window.print()}<\/script></body></html>');
    w.document.close();
  }
  SP.addSection('ent', entSection({
    id: 'entFollow', title: '📅 المتابعة وتعليمات المريض', box: 'ent-follow',
    groups: [
      { id: 'next', t: 'الزيارة القادمة (Next visit)', f: [['nextDate', '📅 موعد الزيارة القادمة', 'd', '', { nr: 1 }], ['nextReason', 'سبب المتابعة', 't', 'متابعة بعد العلاج', { nr: 1 }]],
        sum: function (v) { return v.nextDate ? v.nextDate + (v.nextReason ? ' — ' + v.nextReason : '') : ''; } },
      { id: 'instr', t: 'تعليمات المريض (تُطبع مع الروشتة)', f: [['sheets', 'اختر التعليمات', 'c', SHEETS.map(function (s) { return s[1]; }), { nr: 1 }]],
        post: function () { return '<button type="button" class="btn ghost small ent-print">🖨️ طباعة التعليمات المختارة</button>'; },
        sum: function (v) { return (v.sheets || []).length ? v.sheets.length + ' تعليمات' : ''; } }
    ],
    summary: function (v) { return [v.nextDate ? 'المتابعة ' + v.nextDate : '', (v.sheets || []).length ? v.sheets.length + ' تعليمات' : ''].filter(Boolean).join(' · '); },
    wire: function (el) {
      el.addEventListener('click', function (e) {
        if (!e.target.classList.contains('ent-print')) return;
        var v = collectFields(el) || {}, keys = SHEETS.filter(function (s) { return (v.sheets || []).indexOf(s[1]) >= 0; }).map(function (s) { return s[0]; });
        if (!keys.length) { alert('اختر تعليمات أولاً'); return; }
        printSheets(keys);
      });
    },
    extraRender: function (v) {
      var keys = SHEETS.filter(function (s) { return (v.sheets || []).indexOf(s[1]) >= 0; }).map(function (s) { return s[0]; });
      return (v.nextDate ? '<p><b>📅 موعد المتابعة:</b> ' + esc(v.nextDate) + (v.nextReason ? ' — ' + esc(v.nextReason) : '') + '</p>' : '') + sheetsHtml(keys);
    }
  }));

  /* =====================================================================
     11) LOW PRIORITY — facial nerve, neck mass, pediatric ENT
     House-Brackmann: I normal · II mild · III moderate · IV moderately severe · V severe · VI total paralysis.
     ===================================================================== */
  SP.addSection('ent', entSection({
    id: 'entExtra', title: '➕ فحوصات إضافية (العصب الوجهي / كتلة الرقبة / الأطفال)', box: 'ent-extra',
    groups: [
      { id: 'hb', t: 'العصب الوجهي (House-Brackmann)', f: [
          ['hb.side', 'الجهة', 's', SIDE],
          ['hb.grade', 'الدرجة', 's', ['', 'I طبيعي', 'II بسيط', 'III متوسط', 'IV متوسط إلى شديد', 'V شديد', 'VI شلل كامل']]],
        sum: function (v) { var h = v.hb || {}; return h.grade ? 'HB ' + h.grade.split(' ')[0] + (h.side ? ' ' + h.side : '') : ''; } },
      { id: 'mass', t: 'كتلة الرقبة (Neck mass)', f: [
          ['mass.level', 'المستوى (Level)', 's', ['', 'I', 'II', 'III', 'IV', 'V', 'VI']], ['mass.side', 'الجهة', 's', SIDE],
          ['mass.size', 'الحجم (سم)', 't', '2 × 3'], ['mass.cons', 'القوام', 's', ['', 'لين (Soft)', 'مطاطي (Rubbery)', 'صلب (Hard)', 'كيسي (Cystic)']],
          ['mass.mob', 'الحركة', 's', ['', 'متحركة (Mobile)', 'ثابتة (Fixed)']], ['mass.tender', 'مؤلمة (Tender)', 's', YN]],
        sum: function (v) { var m = v.mass || {}; return m.level ? 'Level ' + m.level + (m.size ? ' · ' + m.size + ' سم' : '') + (m.mob ? ' · ' + m.mob.split(' (')[0] : '') : ''; } },
      { id: 'kid', t: 'أنف وأذن الأطفال (Pediatric ENT)', f: [
          ['kid.nhs', 'مسح السمع لحديثي الولادة', 's', ['', 'ناجح (Pass)', 'تحويل يمين (Refer R)', 'تحويل يسار (Refer L)', 'تحويل الجهتين (Refer both)', 'لم يُجرَ']],
          ['kid.speech', 'تأخر الكلام', 's', YN], ['kid.aom', 'عدد نوبات التهاب الأذن الوسطى (آخر 12 شهر)', 'n'],
          ['kid.grommet', 'حالة أنابيب التهوية', 's', ['', 'لا يوجد', 'في مكانها', 'خرجت', 'مسدودة']]],
        sum: function (v) { var k = v.kid || {}; return [k.nhs ? 'NHS ' + k.nhs.split(' (')[0] : '', k.aom ? k.aom + ' AOM' : ''].filter(Boolean).join(' · '); } }
    ],
    summary: function (v) {
      var h = v.hb || {}, m = v.mass || {}, k = v.kid || {};
      return [h.grade ? 'HB ' + h.grade.split(' ')[0] : '', m.level ? 'Neck mass L' + m.level : '', k.nhs || k.aom ? 'Pediatric' : ''].filter(Boolean).join(' · ');
    }
  }));

  /* ---------- section order on the doctor page ---------- */
  if (SP.orderSections) SP.orderSections('ent', ['entSymptoms', 'entRedflags', 'entExam', 'entSides', 'entAudio', 'entVertigo', 'entNose', 'entTonsil', 'entVoice', 'entSleep', 'entProc', 'entExtra', 'entFollow', 'entFiles']);

  /* ---------- follow-up feed: ENT next visit -> shared ClinicCare list (kind "ent") ---------- */
  function entFollowups(exam) {
    var f = exam && exam.sections && exam.sections.entFollow;
    return f && f.nextDate ? [{ key: 'entNext', kind: 'ent', date: f.nextDate, reason: f.nextReason || 'متابعة أنف وأذن وحنجرة' }] : [];
  }
  window.ClinicENT = { section: entSection, fieldHtml: fieldHtml, collectFields: collectFields, entFollowups: entFollowups, earCalc: earCalc, degree: degree, forkHint: forkHint, paradise: paradise, rsClass: rsClass, sbRisk: sbRisk };
})();
