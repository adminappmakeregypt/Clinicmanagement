// ============ Dentistry: Interactive Odontogram (v63) ============
// Replaces the UI of the existing 'odontogram' section of dental.js (same section id, same
// saved place: exam.sections.odontogram). Old keys are kept and still edited:
//   teeth:{n:cond}  surfaces:{n:'MOD'}  details:{n:{status,diagnosis,notes}}
// New keys (additive):
//   dentition: 'permanent'|'primary'|'mixed'
//   records:[{ id, tooth, surf:'MOB', cat, proc, procOther, status:''|'planned'|'completed'|'followup', date, follow, notes }]
// FDI storage keys; permanent FDI labels and primary Palmer labels. Nothing is confirmed or marked completed without the doctor choosing it.
(function () {
  var SP = window.ClinicSpecialty, CC = window.ClinicCare;
  if (!SP) return;
  var esc = SP.escape;

  var P_UP = ['18','17','16','15','14','13','12','11','21','22','23','24','25','26','27','28'];
  var P_LO = ['48','47','46','45','44','43','42','41','31','32','33','34','35','36','37','38'];
  var D_UP = ['55','54','53','52','51','61','62','63','64','65'];
  var D_LO = ['85','84','83','82','81','71','72','73','74','75'];
  var DENT = [['permanent', 'الأسنان الدائمة (Permanent)'], ['primary', 'الأسنان اللبنية (Primary)'], ['mixed', 'مختلطة (Mixed)']];
  function teethOf(d) { return d === 'primary' ? D_UP.concat(D_LO) : d === 'mixed' ? P_UP.concat(P_LO, D_UP, D_LO) : P_UP.concat(P_LO); }
  var ALL = P_UP.concat(P_LO, D_UP, D_LO);

  // legacy condition colours (dental.js) — kept so old charts look the same
  var LEG = { 'سليم': '#d1fae5', 'تسوس': '#fecaca', 'حشو': '#bfdbfe', 'كسر': '#fed7aa', 'مفقود': '#e5e7eb', 'خلع': '#fbcfe8', 'علاج عصب': '#ddd6fe',
    'تركيبة': '#fde68a', 'جسر': '#fcd34d', 'زراعة': '#c7d2fe', 'مطمور': '#cbd5e1', 'دعامة جسر': '#fef08a', 'حركة': '#fdba74', 'أخرى': '#f5d0fe' };
  var LEG_LIST = [''].concat(Object.keys(LEG));
  var TOOTH_STATUS = ['', 'موجود (Present)', 'مفقود (Missing)', 'لم يبزغ (Unerupted)', 'لبني (Primary)', 'مؤقت (Temporary restoration)'];

  // [key, label, colour, short code, surface-level?]
  var CATS = [
    ['healthy', 'سليم (Healthy)', '#16a34a', 'H', 0],
    ['caries', 'تسوس مشتبه/مؤكد (Caries)', '#dc2626', 'C', 1],
    ['restoration', 'حشو موجود (Restoration)', '#2563eb', 'R', 1],
    ['crown', 'تاج / جسر (Crown / Bridge)', '#ca8a04', 'Cr', 0],
    ['rct', 'علاج عصب (Root canal)', '#7c3aed', 'RCT', 0],
    ['missing', 'مفقود / مخلوع (Missing / Extracted)', '#6b7280', 'X', 0],
    ['implant', 'زراعة (Implant)', '#4f46e5', 'Imp', 0],
    ['fracture', 'كسر (Fracture)', '#ea580c', 'Fx', 1],
    ['perio', 'لثة / دواعم (Periodontal)', '#db2777', 'P', 0],
    ['other', 'أخرى (Other)', '#0891b2', 'O', 1]
  ];
  var STATUS = [['', 'نتيجة فحص (Finding)'], ['planned', 'مخطط (Planned)'], ['completed', 'تم (Completed)'], ['followup', 'يحتاج متابعة (Follow-up)']];
  var PROCS = ['', 'حشو (Filling)', 'علاج عصب (Root canal treatment)', 'تاج (Crown)', 'جسر (Bridge)', 'خلع (Extraction)', 'تنظيف وتسوية جذور (Scaling & root planing)',
    'زراعة (Implant placement)', 'دعامة/تاج على زراعة (Implant abutment / crown)', 'بطانة/Pulpotomy', 'فلورايد / سيلانت (Fluoride / Sealant)', 'تبييض (Whitening)', 'أخرى (Other)'];
  var CFG = 'cm_dental_odo_cfg_v1'; // { hiddenCats:[], procs:[] } per device

  function cfg() { try { return JSON.parse(localStorage.getItem(CFG) || '{}') || {}; } catch (e) { return {}; } }
  function setCfg(c) { try { localStorage.setItem(CFG, JSON.stringify(c)); } catch (e) {} }
  function procList() { var x = cfg().procs; return [''].concat(PROCS.slice(1, -1), x || [], ['أخرى (Other)']); }
  function catOf(k) { for (var i = 0; i < CATS.length; i++) if (CATS[i][0] === k) return CATS[i]; return CATS[CATS.length - 1]; }
  function label(list, k) { for (var i = 0; i < list.length; i++) if (list[i][0] === k) return list[i][1]; return k || ''; }
  function opts(list, v) {
    return list.map(function (o) {
      var val = Array.isArray(o) ? o[0] : o, t = Array.isArray(o) ? o[1] : o;
      return '<option value="' + esc(val) + '"' + (val === (v || '') ? ' selected' : '') + '>' + (t ? esc(t) : '—') + '</option>';
    }).join('');
  }
  function today() { return CC && CC.today ? CC.today() : new Date().toISOString().slice(0, 10); }

  /* ---------- FDI helpers ---------- */
  function quad(n) { return +n.charAt(0); }
  function pos(n) { return +n.charAt(1); }
  function isPrimary(n) { return quad(n) >= 5; }
  function isUpper(n) { var q = quad(n); return q === 1 || q === 2 || q === 5 || q === 6; }
  function isAnterior(n) { return pos(n) <= 3; }
  function viewerLeft(n) { var q = quad(n); return q === 1 || q === 4 || q === 5 || q === 8; } // patient's right side
  function validTooth(n) { return ALL.indexOf(String(n)) >= 0; }
  // Display only: never replace the persisted FDI tooth identifier.
  // Universal (US) numbering is a per-device display option (cfg().notation === 'universal'); stored keys stay FDI.
  function universalOf(n) {
    n = String(n); if (!validTooth(n)) return '';
    var q = quad(n), p = pos(n), i;
    if (!isPrimary(n)) { i = q === 1 ? 9 - p : q === 2 ? 8 + p : q === 3 ? 25 - p : 24 + p; return String(i); }
    i = q === 5 ? 6 - p : q === 6 ? 5 + p : q === 7 ? 16 - p : 15 + p; // A–J upper (UR→UL), K–T lower (LL→LR)
    return String.fromCharCode(64 + i);
  }
  function useUniversal() { return cfg().notation === 'universal'; }
  function toothNotation(n) {
    n = String(n);
    if (useUniversal() && validTooth(n)) { var u = universalOf(n); return { text: u, letter: u, corner: '', quadrant: '', fdi: n }; }
    if (!isPrimary(n) || !validTooth(n)) return { text: n, letter: n, corner: '', quadrant: '' };
    var q = quad(n), letter = 'ABCDE'.charAt(pos(n) - 1);
    var corner = { 5: '┘', 6: '└', 7: '┌', 8: '┐' }[q];
    return { text: viewerLeft(n) ? letter + corner : corner + letter, letter: letter, corner: corner,
      quadrant: { 5: 'UR', 6: 'UL', 7: 'LL', 8: 'LR' }[q] };
  }
  function toothText(n) { var t = toothNotation(n); return t.text + (t.quadrant ? ' (' + t.quadrant + ')' : '') + (t.fdi ? ' [FDI ' + t.fdi + ']' : ''); }
  function toothHtml(n) { return '<bdi dir="ltr" class="odx-tooth-label">' + esc(toothText(n)) + '</bdi>'; }
  function notationSvg(n, x, y, selected) {
    var t = toothNotation(n), cls = 'odx-n' + (selected ? ' odx-number-selected' : '');
    var out = '<g class="' + cls + '" data-t="' + n + '" transform="translate(' + x.toFixed(2) + ' ' + y.toFixed(2) + ')"><title>' + esc(toothText(n) + ' — ' + toothName(n)) + '</title>' +
      '<text text-anchor="middle" y="4" font-size="13" font-weight="600">' + t.letter + '</text>';
    if (t.corner) {
      var side = viewerLeft(n) ? 9 : -9, edge = isUpper(n) ? 8 : -10;
      out += '<path class="odx-palmer-corner" d="M' + (-side) + ' ' + edge + ' H' + side + ' V' + (isUpper(n) ? -10 : 8) + '"/>';
    }
    return out + '</g>';
  }
  function surfacesFor(n) { return ['M', 'D', isAnterior(n) ? 'I' : 'O', 'B', isUpper(n) ? 'P' : 'L']; }
  var SURF_L = { M: 'Mesial', D: 'Distal', O: 'Occlusal', I: 'Incisal', B: 'Buccal/Labial', L: 'Lingual', P: 'Palatal' };
  function cleanSurf(n, s) { var ok = surfacesFor(n); return (s || '').split('').filter(function (c, i, a) { return ok.indexOf(c) >= 0 && a.indexOf(c) === i; }).join(''); }
  function toothName(n) {
    var Q = { 1: 'علوي أيمن (UR)', 2: 'علوي أيسر (UL)', 3: 'سفلي أيسر (LL)', 4: 'سفلي أيمن (LR)' };
    var Pn = ['', 'قاطع أوسط (Central incisor)', 'قاطع جانبي (Lateral incisor)', 'ناب (Canine)', 'ضاحك أول (1st premolar)', 'ضاحك ثانٍ (2nd premolar)', 'ضرس أول (1st molar)', 'ضرس ثانٍ (2nd molar)', 'ضرس العقل (3rd molar)'];
    var Dn = ['', 'قاطع أوسط لبني (Primary central)', 'قاطع جانبي لبني (Primary lateral)', 'ناب لبني (Primary canine)', 'ضرس لبني أول (Primary 1st molar)', 'ضرس لبني ثانٍ (Primary 2nd molar)'];
    var q = quad(n), p = pos(n);
    return (isPrimary(n) ? Dn[p] : Pn[p]) + ' — ' + Q[isPrimary(n) ? q - 4 : q];
  }

  /* ---------- SVG tooth glyph: 5 clickable surfaces ---------- */
  var G = 30; // glyph size
  function glyphPolys(x, y, g, n) {
    var a = g * 0.3, b = g * 0.7;
    var top = [[x, y], [x + g, y], [x + b, y + a], [x + a, y + a]];
    var bot = [[x + a, y + b], [x + b, y + b], [x + g, y + g], [x, y + g]];
    var lft = [[x, y], [x + a, y + a], [x + a, y + b], [x, y + g]];
    var rgt = [[x + g, y], [x + g, y + g], [x + b, y + b], [x + b, y + a]];
    var cen = [[x + a, y + a], [x + b, y + a], [x + b, y + b], [x + a, y + b]];
    var up = isUpper(n), vl = viewerLeft(n), m = {};
    if (up) { m.B = top; m.P = bot; } else { m.L = top; m.B = bot; }
    m[vl ? 'D' : 'M'] = lft; m[vl ? 'M' : 'D'] = rgt;
    m[isAnterior(n) ? 'I' : 'O'] = cen;
    return m;
  }
  function pts(p) { return p.map(function (q) { return q[0].toFixed(1) + ',' + q[1].toFixed(1); }).join(' '); }

  function toothState(n, st) {
    var recs = (st.records || []).filter(function (r) { return r.tooth === n; });
    var surf = {}, whole = [], codes = [], planned = false, done = false, fu = false;
    recs.forEach(function (r) {
      var c = catOf(r.cat);
      if (r.surf && c[4]) r.surf.split('').forEach(function (s) { surf[s] = c[2]; }); else whole.push(r.cat);
      if (codes.indexOf(c[3]) < 0) codes.push(c[3]);
      if (r.status === 'planned') planned = true; if (r.status === 'completed') done = true; if (r.status === 'followup') fu = true;
    });
    var lc = st.teeth && st.teeth[n];
    if (lc && st.surfaces && st.surfaces[n]) st.surfaces[n].split('').forEach(function (s) { if (!surf[s]) surf[s] = LEG[lc] || '#999'; });
    return { recs: recs, surf: surf, whole: whole, codes: codes, planned: planned, done: done, fu: fu, legacy: lc };
  }
  function toothSvg(n, x, y, st, sel, selSurf, interactive, hist, angle) {
    var s = toothState(n, st), out = '', size = isAnterior(n) ? 29 : 36;
    var g = size, m = glyphPolys(-g / 2, -g / 2, g, n);
    var missing = s.whole.indexOf('missing') >= 0 || s.legacy === 'مفقود' || s.legacy === 'خلع';
    var crown = isAnterior(n) ? 'M-12 -15 Q0 -19 12 -15 L13 9 Q11 17 0 17 Q-11 17 -13 9 Z' :
      'M-14 -17 Q-7 -20 0 -17 Q8 -20 15 -15 Q20 -7 17 1 Q20 10 13 16 Q5 20 0 17 Q-10 20 -16 13 Q-20 5 -17 -3 Q-20 -11 -14 -17 Z';
    var clip = 'odx-crown-' + n + (interactive ? '-edit' : '-print');
    out += '<defs><clipPath id="' + clip + '"><path d="' + crown + '"/></clipPath></defs>';
    if (s.planned) out += '<path d="' + crown + '" class="odx-plan-ring" transform="scale(1.22)"/>';
    if (sel) out += '<path d="' + crown + '" class="odx-selection" transform="scale(1.32)"/>';
    out += '<path data-t="' + n + '" d="' + crown + '" class="odx-crown' + (missing ? ' odx-missing' : '') + '"/>';
    out += '<g clip-path="url(#' + clip + ')">';
    Object.keys(m).forEach(function (k) {
      var on = sel && selSurf.indexOf(k) >= 0;
      out += '<polygon data-t="' + n + '" data-s="' + k + '" points="' + pts(m[k]) + '" class="odx-s' + (on ? ' odx-sel-surface' : '') + '"><title>' + n + ' ' + SURF_L[k] + '</title></polygon>';
    });
    out += '</g>';
    if (!isAnterior(n)) out += '<path d="M-9 -5 Q0 0 9 -5 M0 -10 Q-3 0 0 10 M-9 6 Q0 2 9 6" class="odx-fissure"/>';
    else out += '<path d="M-8 10 Q0 13 8 10" class="odx-fissure"/>';
    Object.keys(s.surf).forEach(function (k) {
      if (!m[k]) return;
      var cx = 0, cy = 0; m[k].forEach(function (q) { cx += q[0] / 4; cy += q[1] / 4; });
      out += '<circle cx="' + cx + '" cy="' + cy + '" r="3.5" fill="' + s.surf[k] + '" class="odx-condition-dot"><title>' + n + ' ' + SURF_L[k] + '</title></circle>';
    });
    s.whole.forEach(function (k, i) {
      out += '<circle cx="' + ((i - (s.whole.length - 1) / 2) * 7) + '" cy="2" r="3.4" fill="' + catOf(k)[2] + '" class="odx-condition-dot"><title>' + esc(catOf(k)[1]) + '</title></circle>';
    });
    if (s.legacy && !Object.keys(s.surf).length) out += '<circle cx="0" cy="-7" r="4" fill="' + (LEG[s.legacy] || 'var(--muted)') + '" class="odx-condition-dot"><title>' + esc(s.legacy) + '</title></circle>';
    if (missing) out += '<path d="M-10 -10 L10 10 M10 -10 L-10 10" class="odx-missing-cross"/>';
    if (s.whole.indexOf('implant') >= 0) out += '<text y="13" text-anchor="middle" font-size="6" class="odx-status-label">IMP</text>';
    var badge = (s.done ? '✓' : '') + (s.fu ? '!' : '') + (hist ? '•' : '');
    if (badge) out += '<text y="29" transform="rotate(' + (-angle) + ')" text-anchor="middle" font-size="9" class="odx-status-label">' + badge + '</text>';
    return '<g transform="translate(' + x.toFixed(2) + ' ' + y.toFixed(2) + ') rotate(' + angle.toFixed(2) + ')">' + out + '</g>';
  }
  var WIDTH = 640;
  function archSvg(list, upper, offset, st, sel, selSurf, interactive, hist) {
    var cy = (upper ? 251 : 309) + offset, sign = upper ? -1 : 1;
    var outer = 'M112 ' + cy + ' C112 ' + (cy + sign * 235) + ' 528 ' + (cy + sign * 235) + ' 528 ' + cy;
    var out = '<path d="' + outer + ' Q320 ' + (cy + sign * 10) + ' 112 ' + cy + ' Z" class="odx-gum"/>';
    out += '<path d="M150 ' + (cy + sign * 10) + ' C150 ' + (cy + sign * 188) + ' 490 ' + (cy + sign * 188) + ' 490 ' + (cy + sign * 10) + '" class="odx-gum-ridge"/>';
    if (upper) {
      out += '<path d="M320 ' + (cy - 115) + ' L320 ' + (cy - 20) + '" class="odx-palate-line"/>';
      for (var r = 0; r < 4; r++) out += '<path d="M320 ' + (cy - 103 + r * 15) + ' q-30 -13 -53 1 M320 ' + (cy - 103 + r * 15) + ' q30 -13 53 1" class="odx-palate-line"/>';
    } else out += '<path d="M320 ' + (cy + 20) + ' Q320 ' + (cy + 65) + ' 320 ' + (cy + 109) + '" class="odx-palate-line"/>';
    list.forEach(function (n, i) {
      var t = -1.48 + 2.96 * i / (list.length - 1), sn = Math.sin(t), cs = Math.cos(t);
      var x = 320 + sn * 174, y = cy + sign * cs * 145;
      var rotation = (upper ? t : -t) * 180 / Math.PI;
      out += toothSvg(n, x, y, st, sel === n, sel === n ? selSurf : '', interactive, hist && hist[n], rotation);
      var nx = 320 + sn * 223, ny = cy + sign * cs * 186;
      out += notationSvg(n, nx, ny, sel === n);
    });
    out += '<text x="320" y="' + (upper ? cy - 55 : cy + 66) + '" text-anchor="middle" class="odx-jaw-label">' + (upper ? 'الفك العلوي · Upper' : 'الفك السفلي · Lower') + '</text>';
    return out;
  }
  function chartSvg(dent, st, sel, selSurf, interactive, hist) {
    var h = dent === 'mixed' ? 1100 : 560;
    var pairs = dent === 'mixed' ? [[P_UP, P_LO, 0], [D_UP, D_LO, 540]] : [[dent === 'primary' ? D_UP : P_UP, dent === 'primary' ? D_LO : P_LO, 0]];
    var body = pairs.map(function (p) {
      return archSvg(p[0], true, p[2], st, sel, selSurf, interactive, hist) + archSvg(p[1], false, p[2], st, sel, selSurf, interactive, hist);
    }).join('');
    return '<svg class="odx-svg" viewBox="0 0 ' + WIDTH + ' ' + h + '" style="direction:ltr" role="img" aria-label="Odontogram — upper and lower dental arches">' +
      '<text x="50" y="30" class="odx-side-label">يمين المريض · R</text><text x="590" y="30" text-anchor="end" class="odx-side-label">يسار المريض · L</text>' + body + '</svg>';
  }
  function focusSvg(n, st, selSurf) {
    var g = 120, x = 30, y = 26, m = glyphPolys(x, y, g, n), s = toothState(n, st), out = '';
    Object.keys(m).forEach(function (k) {
      var on = selSurf.indexOf(k) >= 0, c = m[k], cx = 0, cy = 0;
      c.forEach(function (q) { cx += q[0] / 4; cy += q[1] / 4; });
      out += '<polygon class="odx-fs" data-s="' + k + '" points="' + pts(c) + '" fill="' + (s.surf[k] || '#fff') + '" stroke="' + (on ? '#0d6efd' : '#7d8aa3') + '" stroke-width="' + (on ? 3 : 1.2) + '"/>' +
        '<text x="' + cx + '" y="' + (cy + 5) + '" text-anchor="middle" font-size="15" font-weight="700" fill="' + (on ? '#0d6efd' : '#2b3a67') + '" style="pointer-events:none">' + k + '</text>';
    });
    return '<svg class="odx-focus" viewBox="0 0 180 172" style="direction:ltr">' + out +
      '<text x="90" y="16" text-anchor="middle" font-size="10" fill="#6b7280">' + (isUpper(n) ? 'Buccal ▲' : 'Lingual ▲') + '</text>' +
      '<text x="90" y="166" text-anchor="middle" font-size="10" fill="#6b7280">' + (isUpper(n) ? 'Palatal ▼' : 'Buccal ▼') + '</text></svg>';
  }
  function legendHtml() {
    return '<div class="afm-legend odx-legend">' + CATS.map(function (c) { return '<span><i style="background:' + c[2] + '"></i><b>' + c[3] + '</b> ' + esc(c[1]) + '</span>'; }).join('') +
      '<span><i class="odx-lg-dash"></i>مخطط (Planned)</span><span>✓ تم (Completed)</span><span>! متابعة</span><span>✕ مفقود</span><span>• له سجل سابق</span></div>';
  }
  var HEAD = ['السن', 'الأسطح', 'الحالة / التصنيف', 'الإجراء', 'الحالة', 'التاريخ', 'متابعة', 'ملاحظات'];
  function procTxt(r) { return r.proc === 'أخرى (Other)' && r.procOther ? r.procOther : (r.proc || '—'); }
  function recRows(list) { return list.map(function (r) { return [toothText(r.tooth), r.surf || '—', catOf(r.cat)[1], procTxt(r), label(STATUS, r.status || ''), r.date || '—', r.follow || '—', r.notes || '—']; }); }
  function sortT(a, b) { return ALL.indexOf(a.tooth) - ALL.indexOf(b.tooth); }
  function groupTables(recs) {
    var G3 = [['نتائج الفحص (Findings)', function (r) { return !r.status || r.status === 'followup'; }],
      ['خطة العلاج المقترحة (Planned treatment)', function (r) { return r.status === 'planned'; }],
      ['إجراءات تمت (Completed treatment)', function (r) { return r.status === 'completed'; }]];
    var h = G3.map(function (g) { var l = recs.filter(g[1]).sort(sortT); return l.length ? '<h5 class="em-kind">' + g[0] + ' (' + l.length + ')</h5>' + SP.tableHtml(HEAD, recRows(l)) : ''; }).join('');
    return h || '<p class="muted">لا توجد سجلات مطابقة.</p>';
  }
  function legacyTable(st) {
    var keys = ALL.filter(function (k) { return (st.teeth || {})[k] || (st.surfaces || {})[k] || (st.details || {})[k]; });
    if (!keys.length) return '';
    return '<h5 class="em-kind">حالة السن العامة (Tooth condition)</h5>' + SP.tableHtml(['السن', 'الحالة', 'الأسطح', 'حالة السن', 'التشخيص', 'ملاحظات'], keys.map(function (k) {
      var x = (st.details || {})[k] || {}; return [toothText(k), (st.teeth || {})[k] || '', (st.surfaces || {})[k] || '', x.status || '', x.diagnosis || '', x.notes || ''];
    }));
  }
  function prevVisits() { try { var p = CC && CC.getPatient && CC.getPatient(); return p && CC.visitsFor ? CC.visitsFor(p) : []; } catch (e) { return []; } }
  function history() {
    var rows = [], map = {};
    prevVisits().forEach(function (v) {
      var o = v && v.exam && v.exam.specialty === 'dental' && v.exam.sections && v.exam.sections.odontogram;
      if (!o) return;
      (o.records || []).forEach(function (r) { map[r.tooth] = 1; rows.push([v.date || '—', toothText(r.tooth), r.surf || '—', catOf(r.cat)[1], procTxt(r), label(STATUS, r.status || '')]); });
      Object.keys(o.teeth || {}).forEach(function (t) { map[t] = 1; rows.push([v.date || '—', toothText(t), (o.surfaces || {})[t] || '—', o.teeth[t], '—', '—']); });
    });
    return { rows: rows, map: map };
  }

  /* ---------- section ---------- */
  function make() {
    return {
      id: 'odontogram',
      title: '🦷 خريطة الأسنان التفاعلية (Interactive Odontogram — FDI / Palmer)',
      html: function (v) {
        v = v || {};
        var data = { teeth: v.teeth || {}, surfaces: v.surfaces || {}, details: v.details || {}, records: v.records || [], dentition: v.dentition || '' };
        return '<div class="odx" data-saved="' + esc(JSON.stringify(data)) + '">' +
          '<div class="afm-tabs odx-tabs">' + DENT.map(function (d) { return '<button type="button" class="afm-tab" data-d="' + d[0] + '">' + esc(d[1]) + '</button>'; }).join('') + '</div>' +
          '<div class="odx-nt-row"><label class="muted">نظام الترقيم (لهذا الجهاز): <select class="odx-nt"><option value="fdi"' + (useUniversal() ? '' : ' selected') + '>FDI (الدائمة) / Palmer (اللبنية)</option><option value="universal"' + (useUniversal() ? ' selected' : '') + '>Universal (1–32 / A–T)</option></select></label></div>' +
          '<p class="muted afm-hint">اضغط على السن أو على سطح منه (M/D/O-I/B/L-P). الترقيم للعرض فقط — البيانات المحفوظة تبقى بنظام FDI. كل تسجيل يدوي — لا يُعتبر أي شيء مؤكداً أو منفذاً إلا باختيار الطبيب.</p>' +
          '<div class="odx-stage"></div>' + legendHtml() +
          '<div class="odx-panel"></div>' +
          '<details class="em-cfg odx-cfg"><summary>⚙️ إعدادات التصنيفات والإجراءات (لهذا الجهاز)</summary><div class="odx-cfg-b"></div></details>' +
          '<h4 class="afm-h">ملخص العلاج (Treatment Summary)</h4>' +
          '<div class="em-filters odx-filters"><select class="odx-ft"><option value="">كل الأسنان</option></select>' +
          '<select class="odx-fc"><option value="">كل التصنيفات</option>' + opts(CATS.map(function (c) { return [c[0], c[1]]; }), '') + '</select>' +
          '<select class="odx-fs2"><option value="">كل الحالات</option>' + opts(STATUS.map(function (s) { return [s[0] || 'finding', s[1]]; }), '') + '</select></div>' +
          '<div class="afm-table odx-table"></div><div class="odx-hist"></div></div>';
      },
      wire: function (el) {
        var root = el.querySelector('.odx'); if (!root) return;
        var st = { teeth: {}, surfaces: {}, details: {}, records: [], dentition: '' };
        try { st = Object.assign(st, JSON.parse(root.getAttribute('data-saved'))); } catch (e) {}
        st.records = (st.records || []).filter(function (r) { return r && validTooth(r.tooth); });
        el._odo = st;
        var ui = { sel: null, surf: '', edit: null, dent: st.dentition || '' };
        if (!ui.dent) {
          var p = CC && CC.getPatient && CC.getPatient(), age = null;
          try { var a = p && CC.ageParts && CC.ageParts(p); age = a && a.years != null ? a.years : null; } catch (e) {}
          var hasD = st.records.concat(Object.keys(st.teeth).map(function (t) { return { tooth: t }; })).some(function (r) { return isPrimary(r.tooth); });
          ui.dent = hasD ? 'mixed' : (age != null && age < 6 ? 'primary' : (age != null && age < 12 ? 'mixed' : 'permanent'));
        }
        var H = history();
        function fillHist() {
          H = history();
          var hb = root.querySelector('.odx-hist'); if (!H.rows.length) { hb.innerHTML = ''; return; }
          hb.innerHTML = '<details class="em-hist"><summary>🕘 سجل الأسنان في الزيارات السابقة (' + H.rows.length + ') — للاطلاع فقط، لا يتغير</summary>' +
          SP.tableHtml(['الزيارة', 'السن', 'الأسطح', 'الحالة', 'الإجراء', 'الحالة'], H.rows) + '</details>';
        }
        fillHist();
        var nid = 0;
        function drawTabs() { root.querySelectorAll('.odx-tabs .afm-tab').forEach(function (b) { b.classList.toggle('on', b.dataset.d === ui.dent); }); }
        function drawChart() { root.querySelector('.odx-stage').innerHTML = chartSvg(ui.dent, st, ui.sel, ui.surf, true, H.map); }
        function activeCats(cur) { var h = cfg().hiddenCats || []; return CATS.filter(function (c) { return h.indexOf(c[0]) < 0 || c[0] === cur; }); }
        function recForm(r) {
          var n = ui.sel;
          return '<div class="odx-form"><b>' + (r ? 'تعديل السجل' : '➕ سجل جديد لهذا السن') + '</b>' +
            '<div class="odx-surfs">' + surfacesFor(n).map(function (s) { return '<label class="odo-sbtn"><input type="checkbox" value="' + s + '"' + (ui.surf.indexOf(s) >= 0 ? ' checked' : '') + '/> ' + s + ' <small>' + SURF_L[s] + '</small></label>'; }).join('') + '</div>' +
            '<div class="grid-2 sx-grid">' +
            '<div class="field"><label>الحالة / التصنيف (Condition)</label><select data-r="cat">' + opts(activeCats(r && r.cat).map(function (c) { return [c[0], c[1]]; }), r ? r.cat : 'caries') + '</select></div>' +
            '<div class="field"><label>الإجراء (Procedure)</label><select data-r="proc">' + opts(procList(), r ? r.proc : '') + '</select></div>' +
            '<div class="field odx-po"' + (r && r.proc === 'أخرى (Other)' ? '' : ' style="display:none"') + '><label>إجراء آخر</label><input data-r="procOther" value="' + esc(r && r.procOther || '') + '"/></div>' +
            '<div class="field"><label>الحالة (Status)</label><select data-r="status">' + opts(STATUS, r ? r.status : '') + '</select></div>' +
            '<div class="field"><label>التاريخ</label><input type="date" data-r="date" value="' + esc(r ? r.date || '' : today()) + '"/></div>' +
            '<div class="field"><label>المتابعة المطلوبة (Follow-up)</label><input data-r="follow" value="' + esc(r && r.follow || '') + '" placeholder="مثال: مراجعة بعد أسبوعين"/></div>' +
            '<div class="field" style="grid-column:1 / -1"><label>ملاحظات إكلينيكية</label><textarea data-r="notes" rows="2">' + esc(r && r.notes || '') + '</textarea></div></div>' +
            '<div class="odx-actions"><button type="button" class="btn small primary odx-save">' + (r ? '💾 حفظ التعديل' : '➕ إضافة السجل') + '</button>' +
            (r ? '<button type="button" class="btn small odx-cancel">إلغاء</button>' : '') + '<span class="odx-msg muted"></span></div></div>';
        }
        function drawPanel() {
          var pnl = root.querySelector('.odx-panel'), n = ui.sel;
          if (!n) { pnl.innerHTML = '<p class="muted afm-hint">اختر سناً من الخريطة لعرض تفاصيله.</p>'; return; }
          var d = st.details[n] || {}, recs = st.records.filter(function (r) { return r.tooth === n; });
          var edit = ui.edit && recs.filter(function (r) { return r.id === ui.edit; })[0];
          pnl.innerHTML = '<div class="afm-ed odx-ed"><div class="afm-ed-h"><b>السن ' + toothHtml(n) + '</b> <span class="muted">' + esc(toothName(n)) + '</span></div>' +
            '<div class="odx-detail"><div class="odx-fwrap">' + focusSvg(n, st, ui.surf) + '<div class="muted odx-fhint">اضغط على السطح لاختياره</div></div><div class="odx-dright">' +
            '<div class="grid-2 sx-grid">' +
            '<div class="field"><label>الحالة الحالية (Current condition)</label><select data-l="cond">' + opts(LEG_LIST.map(function (x) { return [x, x || '— بدون —']; }), st.teeth[n] || '') + '</select></div>' +
            '<div class="field"><label>حالة السن (Tooth status)</label><select data-l="status">' + opts(TOOTH_STATUS, d.status || '') + '</select></div>' +
            '<div class="field"><label>التشخيص / النتائج (Findings)</label><input data-l="diagnosis" value="' + esc(d.diagnosis || '') + '"/></div>' +
            '<div class="field"><label>ملاحظات السن</label><input data-l="notes" value="' + esc(d.notes || '') + '"/></div></div>' +
            (recs.length ? '<div class="odx-recs">' + recs.map(function (r) {
              var c = catOf(r.cat);
              return '<div class="odx-rec' + (r.id === ui.edit ? ' on' : '') + '" style="border-inline-start:4px solid ' + c[2] + '"><span><b>' + esc(c[3]) + '</b> ' + esc(c[1]) + (r.surf ? ' — ' + esc(r.surf) : '') +
                (r.proc ? ' • ' + esc(procTxt(r)) : '') + ' • <i>' + esc(label(STATUS, r.status || '')) + '</i>' + (r.date ? ' • ' + esc(r.date) : '') + '</span>' +
                '<span><button type="button" class="btn small odx-e" data-id="' + esc(r.id) + '">✏️</button><button type="button" class="btn small danger odx-x" data-id="' + esc(r.id) + '">🗑</button></span></div>';
            }).join('') + '</div>' : '<p class="muted">لا توجد سجلات لهذا السن في هذه الزيارة.</p>') +
            recForm(edit) + '</div></div></div>';
        }
        function drawFilters() {
          var ft = root.querySelector('.odx-ft'), cur = ft.value, used = {};
          st.records.forEach(function (r) { used[r.tooth] = 1; });
          ft.innerHTML = '<option value="">كل الأسنان</option>' + ALL.filter(function (t) { return used[t]; }).map(function (t) { return '<option value="' + t + '" dir="ltr"' + (t === cur ? ' selected' : '') + '>' + esc(toothText(t)) + '</option>'; }).join('');
        }
        function drawTable() {
          var ft = root.querySelector('.odx-ft').value, fc = root.querySelector('.odx-fc').value, fs = root.querySelector('.odx-fs2').value;
          var l = st.records.filter(function (r) { return (!ft || r.tooth === ft) && (!fc || r.cat === fc) && (!fs || (fs === 'finding' ? !r.status : r.status === fs)); });
          root.querySelector('.odx-table').innerHTML = (st.records.length ? groupTables(l) : '<p class="muted">لا توجد سجلات بعد.</p>') + legacyTable(st);
        }
        function drawCfg() {
          var c = cfg(), h = c.hiddenCats || [];
          root.querySelector('.odx-cfg-b').innerHTML = CATS.map(function (k) {
            return '<label class="em-cfg-i"><input type="checkbox" data-hc="' + k[0] + '"' + (h.indexOf(k[0]) < 0 ? ' checked' : '') + '/> <i style="background:' + k[2] + '"></i>' + esc(k[1]) + '</label>';
          }).join('') + '<div class="field"><label>إجراءات إضافية خاصة بك (افصل بفاصلة)</label><input class="odx-cp" value="' + esc((c.procs || []).join('، ')) + '"/></div>';
        }
        function all() { drawTabs(); drawChart(); drawPanel(); drawFilters(); drawTable(); }
        function select(n, s) {
          if (ui.sel !== n) { ui.sel = n; ui.surf = ''; ui.edit = null; }
          if (s) ui.surf = ui.surf.indexOf(s) >= 0 ? ui.surf.replace(s, '') : ui.surf + s;
          ui.surf = cleanSurf(n, ui.surf);
          drawChart(); drawPanel();
          if (window.innerWidth < 760) { var p = root.querySelector('.odx-panel'); if (p.scrollIntoView) p.scrollIntoView({ behavior: 'smooth', block: 'start' }); }
        }
        root.querySelector('.odx-nt').addEventListener('change', function (e) {
          var c = cfg(); c.notation = e.target.value === 'universal' ? 'universal' : 'fdi'; setCfg(c);
          fillHist(); all();
        });
        root.querySelector('.odx-tabs').addEventListener('click', function (e) {
          var b = e.target.closest('.afm-tab'); if (!b) return;
          ui.dent = b.dataset.d; st.dentition = ui.dent;
          if (ui.sel && teethOf(ui.dent).indexOf(ui.sel) < 0) { ui.sel = null; ui.surf = ''; ui.edit = null; }
          all();
        });
        root.querySelector('.odx-stage').addEventListener('click', function (e) {
          var t = e.target.closest('[data-t]'); if (!t) return;
          var n = t.getAttribute('data-t'); if (teethOf(ui.dent).indexOf(n) < 0) return;
          select(n, t.getAttribute('data-s'));
        });
        var pnl = root.querySelector('.odx-panel');
        pnl.addEventListener('click', function (e) {
          var fs = e.target.closest('.odx-fs');
          if (fs) { select(ui.sel, fs.getAttribute('data-s')); return; }
          var eb = e.target.closest('.odx-e');
          if (eb) { ui.edit = eb.dataset.id; var r = st.records.filter(function (x) { return x.id === ui.edit; })[0]; ui.surf = r ? r.surf || '' : ''; drawChart(); drawPanel(); return; }
          var xb = e.target.closest('.odx-x');
          if (xb) { if (!confirm('حذف هذا السجل من الزيارة الحالية؟')) return; st.records = st.records.filter(function (x) { return x.id !== xb.dataset.id; }); ui.edit = null; all(); return; }
          if (e.target.closest('.odx-cancel')) { ui.edit = null; ui.surf = ''; drawChart(); drawPanel(); return; }
          if (e.target.closest('.odx-save')) {
            var f = pnl.querySelector('.odx-form'), msg = pnl.querySelector('.odx-msg'), v = {};
            f.querySelectorAll('[data-r]').forEach(function (i) { v[i.getAttribute('data-r')] = (i.value || '').trim(); });
            var n = ui.sel;
            if (!validTooth(n) || teethOf(ui.dent).indexOf(n) < 0) { msg.textContent = '⚠️ رقم السن غير صحيح لهذا النوع من الأسنان.'; return; }
            var c = catOf(v.cat), surf = c[4] ? cleanSurf(n, ui.surf) : '';
            if (c[4] && ui.surf && !surf) { msg.textContent = '⚠️ الأسطح المختارة لا تناسب هذا السن.'; return; }
            if (v.proc !== 'أخرى (Other)') v.procOther = '';
            var rec = { tooth: n, surf: surf, cat: v.cat, proc: v.proc, procOther: v.procOther, status: v.status, date: v.date, follow: v.follow, notes: v.notes };
            var dup = st.records.some(function (r) { return r.id !== ui.edit && r.tooth === n && (r.surf || '') === surf && r.cat === rec.cat && (r.proc || '') === rec.proc && (r.status || '') === rec.status && (r.date || '') === rec.date; });
            if (dup) { msg.textContent = '⚠️ يوجد سجل مطابق بالفعل لنفس السن والسطح والتاريخ.'; return; }
            if (ui.edit) { st.records.forEach(function (r, i) { if (r.id === ui.edit) st.records[i] = Object.assign({ id: r.id }, rec); }); }
            else { rec.id = 'd' + Date.now().toString(36) + (nid++); st.records.push(rec); }
            ui.edit = null; ui.surf = ''; all();
            var m2 = root.querySelector('.odx-msg'); if (m2) m2.textContent = '✔ تمت الإضافة — يُحفظ نهائياً عند حفظ الزيارة.';
          }
        });
        function onPanel(e) {
          var l = e.target.getAttribute && e.target.getAttribute('data-l'), n = ui.sel;
          if (l && n) {
            if (l === 'cond') { if (e.target.value) st.teeth[n] = e.target.value; else { delete st.teeth[n]; delete st.surfaces[n]; } }
            else { var d = Object.assign({}, st.details[n] || {}); d[l] = (e.target.value || '').trim(); if (d.status || d.diagnosis || d.notes) st.details[n] = d; else delete st.details[n]; }
            drawChart(); drawTable(); return;
          }
          if (e.target.getAttribute && e.target.getAttribute('data-r') === 'proc') { var po = pnl.querySelector('.odx-po'); if (po) po.style.display = e.target.value === 'أخرى (Other)' ? '' : 'none'; }
          if (e.target.closest && e.target.closest('.odx-surfs') && e.target.type === 'checkbox') {
            var s = ''; pnl.querySelectorAll('.odx-surfs input:checked').forEach(function (i) { s += i.value; }); ui.surf = cleanSurf(n, s);
            drawChart(); var fw = pnl.querySelector('.odx-fwrap'); if (fw) fw.firstChild.outerHTML = focusSvg(n, st, ui.surf);
          }
        }
        pnl.addEventListener('change', onPanel); pnl.addEventListener('input', function (e) { if (e.target.getAttribute('data-l') && e.target.tagName === 'INPUT') onPanel(e); });
        root.querySelector('.odx-filters').addEventListener('change', drawTable);
        root.querySelector('.odx-cfg').addEventListener('change', function (e) {
          var c = cfg();
          var hc = e.target.getAttribute('data-hc');
          if (hc) { var h = (c.hiddenCats || []).filter(function (x) { return x !== hc; }); if (!e.target.checked) h.push(hc); c.hiddenCats = h; }
          if (e.target.classList.contains('odx-cp')) c.procs = e.target.value.split(/[,،]/).map(function (x) { return x.trim(); }).filter(Boolean);
          setCfg(c); drawPanel();
        });
        drawCfg(); all();
      },
      collect: function (el) {
        var st = el._odo || {}, out = {};
        ['teeth', 'surfaces', 'details'].forEach(function (k) { if (st[k] && Object.keys(st[k]).length) out[k] = st[k]; });
        var recs = (st.records || []).filter(function (r) { return validTooth(r.tooth); }).map(function (r) {
          var o = {}; Object.keys(r).forEach(function (k) { if (r[k] !== '' && r[k] != null) o[k] = r[k]; }); return o;
        });
        if (recs.length) out.records = recs;
        if (!Object.keys(out).length) return null;
        if (st.dentition) out.dentition = st.dentition;
        return out;
      },
      render: function (v) {
        v = v || {};
        var st = { teeth: v.teeth || {}, surfaces: v.surfaces || {}, details: v.details || {}, records: v.records || [] };
        var any = st.records.length || Object.keys(st.teeth).length || Object.keys(st.surfaces).length || Object.keys(st.details).length;
        if (!any) return '';
        var dent = v.dentition || (st.records.concat(Object.keys(st.teeth).map(function (t) { return { tooth: t }; })).some(function (r) { return isPrimary(r.tooth); }) ? 'mixed' : 'permanent');
        return '<div class="odx-print">' + chartSvg(dent, st, null, '', false, null) + '</div>' + legendHtml() +
          (st.records.length ? groupTables(st.records) : '') + legacyTable(st);
      }
    };
  }
  window.ClinicDentalOdo = { wrap: function () { return make(); }, chartSvg: chartSvg, surfacesFor: surfacesFor, toothName: toothName, teethOf: teethOf, toothNotation: toothNotation, universalOf: universalOf };
})();
