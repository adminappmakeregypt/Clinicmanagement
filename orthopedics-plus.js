// ============ Orthopedics PLUS (v52) — وحدة العظام المتقدمة ============
// Additive module loaded AFTER orthopedics.js. It does not change how data is stored:
// every section saves inside exam.sections like the other specialty sections.
//
//  pain       (existing id)  + clickable body diagram (front/back SVG) synced with the old chips
//  fracture   (existing id)  + pattern, classification, side, intra-articular, NV injury, skin, union log
//  ortJoint   (new)          structured joint exam: ROM table, special tests, muscle power, measurements, gait
//  ortNeuro   (new)          pulses, cap refill, skin, dermatomes, reflexes + compartment banner
//  ortRedflags(new)          spine red flags + urgent banner
//  ortCast    (new)          cast / splint / brace tracker + patient instructions (printed in Arabic)
//  ortSurgery (new)          surgery + implants + post-op, injections/aspiration log with steroid warning
//  ortScores  (new)          Oswestry (ODI), QuickDASH, WOMAC with trend
//
// Old fields (rom, power, sensory...) in specialties.js stay untouched and keep working.
// Cast removal and suture removal dates feed the shared follow-up list (ClinicCare).

(function () {
  var SP = window.ClinicSpecialty;
  if (!SP) return;
  var CC = window.ClinicCare;
  var esc = SP.escape;

  /* ---------- small helpers ---------- */
  function bx(id, title, sum, body) {
    if (CC) return CC.box(id, title, sum, body, 'ort-box');
    return '<div class="ort-box"><h4>' + title + '</h4>' + body + '</div>';
  }
  function setSum(el, id, text) {
    if (!CC) return;
    var b = el.querySelector('.cc-box[data-cc="' + id + '"]');
    CC.setSummary(b, text);
  }
  function opt(list, val, blank) {
    return list.map(function (o) {
      var v = Array.isArray(o) ? o[0] : o, l = Array.isArray(o) ? o[1] : o;
      return '<option value="' + esc(v) + '"' + (String(v) === String(val == null ? '' : val) ? ' selected' : '') + '>' + (v === '' ? (blank || '—') : esc(l)) + '</option>';
    }).join('');
  }
  function today() { return CC ? CC.today() : new Date().toISOString().slice(0, 10); }
  function days(a, b) { return Math.round((new Date(b + 'T00:00:00') - new Date(a + 'T00:00:00')) / 86400000); }
  function val(el, sel) { var x = el.querySelector(sel); return x ? (x.value || '').trim() : ''; }
  function prevVisits() {
    var p = CC && CC.getPatient();
    return p ? CC.visitsFor(p) : [];
  }
  var SIDE3 = ['', 'يمين', 'يسار', 'الجهتان'];
  var SIDE2 = ['', 'يمين', 'يسار'];

  /* =====================================================================
     1) PAIN AREAS + BODY DIAGRAM  (same data: {areas:[], side:'', other:''})
     ===================================================================== */
  var AREAS = ['الرقبة', 'الكتف', 'الذراع', 'الكوع', 'الرسغ', 'اليد', 'الظهر', 'الحوض', 'الفخذ',
               'الركبة', 'الساق', 'الكاحل', 'القدم'];
  var SIDES = ['يمين', 'يسار', 'الجهتان'];
  // [area, shape, x, y, w/r, h]  — x is for the viewer-LEFT copy; paired parts are mirrored around x=60
  var PARTS = [
    ['الكتف', 'e', 38, 46, 10, 7, true],
    ['الذراع', 'r', 25, 54, 9, 30, true],
    ['الكوع', 'c', 29.5, 89, 5.5, 0, true],
    ['الذراع', 'r', 25, 95, 9, 21, true],
    ['الرسغ', 'c', 29.5, 120, 4.5, 0, true],
    ['اليد', 'e', 29.5, 133, 5.5, 8, true],
    ['الفخذ', 'r', 45, 120, 13, 44, true],
    ['الركبة', 'c', 51.5, 170, 6.5, 0, true],
    ['الساق', 'r', 46, 177, 11, 42, true],
    ['الكاحل', 'c', 51.5, 223, 4.5, 0, true],
    ['القدم', 'e', 51.5, 233, 7, 4, true],
    ['الرقبة', 'r', 54, 30, 12, 10, false],
    ['الحوض', 'r', 44, 100, 32, 18, false]
  ];
  function shape(p, x, attrs) {
    if (p[1] === 'r') return '<rect x="' + x + '" y="' + p[3] + '" width="' + p[4] + '" height="' + p[5] + '" rx="3" ' + attrs + '/>';
    if (p[1] === 'c') return '<circle cx="' + x + '" cy="' + p[3] + '" r="' + p[4] + '" ' + attrs + '/>';
    return '<ellipse cx="' + x + '" cy="' + p[3] + '" rx="' + p[4] + '" ry="' + p[5] + '" ' + attrs + '/>';
  }
  function bodySvg(view) {
    // front view: patient's RIGHT is on the viewer's LEFT; back view: patient's RIGHT is on the viewer's RIGHT
    var s = '<svg viewBox="0 0 120 245" class="ort-body" data-view="' + view + '" direction="ltr">' +
      '<circle cx="60" cy="17" r="12" class="ort-deco"/>' +
      (view === 'back'
        ? '<rect x="44" y="40" width="32" height="58" rx="5" class="ort-part" data-area="الظهر" data-side=""><title>الظهر</title></rect>'
        : '<rect x="44" y="40" width="32" height="58" rx="5" class="ort-deco"/>');
    PARTS.forEach(function (p) {
      if (!p[6]) { s += shape(p, p[2], 'class="ort-part" data-area="' + p[0] + '" data-side=""') ; return; }
      var w = p[1] === 'r' ? p[4] : 0;
      var xMirror = 120 - p[2] - w;
      var leftSide = view === 'front' ? 'يمين' : 'يسار';
      var rightSide = view === 'front' ? 'يسار' : 'يمين';
      s += shape(p, p[2], 'class="ort-part" data-area="' + p[0] + '" data-side="' + leftSide + '"');
      s += shape(p, xMirror, 'class="ort-part" data-area="' + p[0] + '" data-side="' + rightSide + '"');
    });
    s += '<text x="6" y="240" class="ort-lbl">' + (view === 'front' ? 'R' : 'L') + '</text>' +
         '<text x="108" y="240" class="ort-lbl">' + (view === 'front' ? 'L' : 'R') + '</text></svg>';
    return s;
  }
  function paintBody(el) {
    var areas = [];
    el.querySelectorAll('.ort-area:checked').forEach(function (c) { areas.push(c.value); });
    var sEl = el.querySelector('.ort-side:checked'), side = sEl ? sEl.value : '';
    el.querySelectorAll('.ort-part').forEach(function (p) {
      var a = p.getAttribute('data-area'), ps = p.getAttribute('data-side');
      var on = areas.indexOf(a) >= 0 && (!ps || !side || side === 'الجهتان' || side === ps);
      p.classList.toggle('on', on);
    });
    setSum(el, 'ort-pain', (areas.join('، ') || '') + (side ? ' — ' + side : ''));
  }

  SP.addSection('orthopedics', {
    id: 'pain',
    title: '📍 مواضع الألم',
    html: function (v) {
      v = v || {};
      var picked = v.areas || [];
      var chips = AREAS.map(function (a) {
        return '<label class="ort-chip"><input type="checkbox" class="ort-area" value="' + esc(a) + '"' +
          (picked.indexOf(a) >= 0 ? ' checked' : '') + ' /> ' + esc(a) + '</label>';
      }).join('');
      var sides = SIDES.map(function (s) {
        return '<label class="ort-chip"><input type="radio" name="ortSide" class="ort-side" value="' + esc(s) + '"' +
          (v.side === s ? ' checked' : '') + ' /> ' + esc(s) + '</label>';
      }).join('');
      var body = '<p class="muted">حدد مواضع الألم والجهة — من القائمة أو بالضغط على الرسم.</p>' +
        '<div class="ort-chips">' + chips + '</div>' +
        '<div class="ort-chips ort-sides">' + sides + '</div>' +
        '<div class="field" style="margin-top:8px"><label>موضع آخر</label>' +
        '<input class="ort-other" value="' + esc(v.other || '') + '" placeholder="موضع غير مذكور" /></div>' +
        bx('ort-diagram', '🧍 رسم الجسم', 'أمام / خلف',
          '<div class="ort-bodies"><div><b>أمام</b>' + bodySvg('front') + '</div><div><b>خلف</b>' + bodySvg('back') + '</div></div>' +
          '<p class="muted">اضغط على الجزء لتحديده؛ الضغط على الجهة الأخرى يجعلها «الجهتان».</p>');
      return bx('ort-pain', '📍 مواضع الألم', (picked.join('، ') || '') + (v.side ? ' — ' + v.side : ''), body);
    },
    wire: function (el) {
      if (el._ortPainWired) return; el._ortPainWired = true;
      el.addEventListener('change', function (e) {
        if (e.target.matches('.ort-area, .ort-side')) paintBody(el);
      });
      el.addEventListener('click', function (e) {
        var p = e.target.closest && e.target.closest('.ort-part');
        if (!p) return;
        var a = p.getAttribute('data-area'), ps = p.getAttribute('data-side');
        var chk = el.querySelector('.ort-area[value="' + a + '"]');
        var sEl = el.querySelector('.ort-side:checked'), side = sEl ? sEl.value : '';
        var newSide = side;
        if (!chk.checked) {
          chk.checked = true;
          if (ps) newSide = !side ? ps : (side === ps || side === 'الجهتان' ? side : 'الجهتان');
        } else if (!ps) {
          chk.checked = false;
        } else if (side === 'الجهتان') {
          newSide = ps === 'يمين' ? 'يسار' : 'يمين';
        } else if (side && side !== ps) {
          newSide = 'الجهتان';
        } else {
          chk.checked = false;
        }
        if (newSide !== side) {
          var r = el.querySelector('.ort-side[value="' + newSide + '"]');
          if (r) r.checked = true;
        }
        paintBody(el);
      });
      paintBody(el);
    },
    collect: function (el) {
      var areas = [];
      el.querySelectorAll('.ort-area:checked').forEach(function (c) { areas.push(c.value); });
      var sideEl = el.querySelector('.ort-side:checked');
      var other = val(el, '.ort-other');
      if (!areas.length && !sideEl && !other) return null;
      return { areas: areas, side: sideEl ? sideEl.value : '', other: other };
    },
    render: function (v) {
      if (!v) return '';
      var rows = [];
      if (v.areas && v.areas.length) rows.push(['المواضع', v.areas.join('، ')]);
      if (v.side) rows.push(['الجهة', v.side]);
      if (v.other) rows.push(['موضع آخر', v.other]);
      return rows.length ? SP.tableHtml(['البند', 'القيمة'], rows) : '';
    }
  });

  /* =====================================================================
     2) STRUCTURED JOINT EXAM
     data: { joints: { knee: { side, rom:{flex:{a,p,pain}}, tests:{Lachman:'+'|'-'|'nd'}, power:{Quadriceps:'4'} } },
             measures: { llR, llL, thR, thL, caR, caL }, gait }
     ===================================================================== */
  var JOINTS = [
    { id: 'neck', l: 'الرقبة (Neck)', limb: 'upper',
      rom: [['flex', 'Flexion', 50], ['ext', 'Extension', 60], ['lat', 'Lateral flexion', 45], ['rot', 'Rotation', 80]],
      tests: ['Spurling'], power: ['Deltoid (C5)', 'Biceps (C6)', 'Triceps (C7)', 'Finger flexors (C8)', 'Interossei (T1)'] },
    { id: 'shoulder', l: 'الكتف (Shoulder)', limb: 'upper',
      rom: [['flex', 'Flexion', 180], ['abd', 'Abduction', 180], ['ir', 'Internal rotation', 70], ['er', 'External rotation', 90]],
      tests: ['Neer', 'Hawkins-Kennedy', 'Empty can', 'Speed', 'Apprehension'],
      power: ['Deltoid', 'Supraspinatus', 'Infraspinatus', 'Subscapularis', 'Biceps'] },
    { id: 'elbow', l: 'الكوع (Elbow)', limb: 'upper',
      rom: [['flex', 'Flexion', 150], ['ext', 'Extension', 0], ['pro', 'Pronation', 80], ['sup', 'Supination', 80]],
      tests: [], power: ['Biceps', 'Triceps', 'Brachioradialis'] },
    { id: 'wrist', l: 'الرسغ واليد (Wrist/Hand)', limb: 'upper',
      rom: [['flex', 'Flexion', 80], ['ext', 'Extension', 70], ['rd', 'Radial deviation', 20], ['ud', 'Ulnar deviation', 30]],
      tests: ['Phalen', 'Tinel', 'Finkelstein'], power: ['Wrist flexors', 'Wrist extensors', 'Grip', 'Thumb abduction'] },
    { id: 'lumbar', l: 'الفقرات القطنية (Lumbar spine)', limb: 'lower',
      rom: [['flex', 'Flexion', 60], ['ext', 'Extension', 25], ['lat', 'Lateral flexion', 25], ['rot', 'Rotation', 30]],
      tests: ['Straight leg raise', 'Slump', 'Femoral stretch'],
      power: ['Hip flexors (L2)', 'Knee extensors (L3)', 'Ankle dorsiflexors (L4)', 'EHL (L5)', 'Plantar flexors (S1)'] },
    { id: 'hip', l: 'الحوض (Hip)', limb: 'lower',
      rom: [['flex', 'Flexion', 120], ['ext', 'Extension', 30], ['abd', 'Abduction', 45], ['add', 'Adduction', 30], ['ir', 'Internal rotation', 40], ['er', 'External rotation', 45]],
      tests: ['Thomas', 'Trendelenburg', 'FABER', 'FADIR'], power: ['Hip flexors', 'Hip extensors', 'Hip abductors', 'Hip adductors'] },
    { id: 'knee', l: 'الركبة (Knee)', limb: 'lower',
      rom: [['flex', 'Flexion', 135], ['ext', 'Extension', 0]],
      tests: ['Lachman', 'Anterior drawer', 'Posterior drawer', 'McMurray', 'Valgus stress', 'Varus stress', 'Patellar grind'],
      power: ['Quadriceps', 'Hamstrings'] },
    { id: 'ankle', l: 'الكاحل والقدم (Ankle/Foot)', limb: 'lower',
      rom: [['df', 'Dorsiflexion', 20], ['pf', 'Plantar flexion', 50], ['inv', 'Inversion', 35], ['ev', 'Eversion', 15]],
      tests: ['Anterior drawer', 'Thompson'], power: ['Tibialis anterior', 'Gastrocnemius', 'Peronei', 'EHL'] }
  ];
  function jointById(id) { for (var i = 0; i < JOINTS.length; i++) if (JOINTS[i].id === id) return JOINTS[i]; return null; }
  var GAIT = ['', 'طبيعية (Normal)', 'مؤلمة (Antalgic)', 'ترندلنبرج (Trendelenburg)', 'عرج باستخدام وسيلة مساعدة (Limping with aid)'];
  var TEST_V = [['+', 'إيجابي +'], ['-', 'سلبي −'], ['nd', 'لم يُجرَ']];

  function jointSummary(j, d) {
    var parts = [];
    j.rom.forEach(function (r) { var x = (d.rom || {})[r[0]]; if (x && (x.a !== '' && x.a != null)) parts.push(r[1] + ' ' + x.a + '°'); });
    j.tests.forEach(function (t) { var x = (d.tests || {})[t]; if (x === '+' || x === '-') parts.push(t + ' ' + (x === '+' ? '+' : '−')); });
    return j.l.split(' (')[0] + (d.side ? ' ' + d.side : '') + (parts.length ? ': ' + parts.slice(0, 4).join('، ') : '');
  }
  function jointBlock(j, d, on) {
    d = d || {};
    var rom = '<div class="table-wrap"><table class="ort-rom"><thead><tr><th>الحركة</th><th>إيجابي (Active)°</th><th>سلبي (Passive)°</th><th>الطبيعي°</th><th>مؤلم</th></tr></thead><tbody>' +
      j.rom.map(function (r) {
        var x = (d.rom || {})[r[0]] || {};
        return '<tr data-m="' + r[0] + '" data-n="' + r[2] + '"><td>' + r[1] + '</td>' +
          '<td><input type="number" class="rom-a" value="' + esc(x.a == null ? '' : x.a) + '" /></td>' +
          '<td><input type="number" class="rom-p" value="' + esc(x.p == null ? '' : x.p) + '" /></td>' +
          '<td class="muted">' + r[2] + '</td>' +
          '<td><input type="checkbox" class="rom-pain"' + (x.pain ? ' checked' : '') + ' /></td></tr>';
      }).join('') + '</tbody></table></div>';
    var tests = j.tests.length ? '<h5 class="ort-h5">الاختبارات الخاصة (Special tests)</h5><div class="ort-tests">' + j.tests.map(function (t) {
      var cur = (d.tests || {})[t] || '';
      return '<div class="ort-test" data-t="' + esc(t) + '"><span>' + esc(t) + '</span><span class="ort-seg">' +
        TEST_V.map(function (o) { return '<button type="button" class="ort-segb' + (cur === o[0] ? ' on' : '') + '" data-v="' + o[0] + '">' + o[1] + '</button>'; }).join('') +
        '</span></div>';
    }).join('') + '</div>' : '';
    var power = '<h5 class="ort-h5">قوة العضلات (0–5)</h5><div class="grid-2">' + j.power.map(function (m) {
      return '<div class="field"><label>' + esc(m) + '</label><select class="pw" data-m="' + esc(m) + '">' + opt(['', '0', '1', '2', '3', '4', '5'], (d.power || {})[m]) + '</select></div>';
    }).join('') + '</div>';
    var body = '<div class="field" style="max-width:220px"><label>الجهة</label><select class="j-side">' + opt(SIDE3, d.side) + '</select></div>' +
      rom + tests + power;
    return '<div class="ort-joint" data-j="' + j.id + '"' + (on ? '' : ' hidden') + '>' +
      bx('ort-j-' + j.id, '🦵 ' + j.l, jointSummary(j, d), body) + '</div>';
  }
  function readJoint(jel) {
    var j = jointById(jel.getAttribute('data-j')), d = { side: val(jel, '.j-side'), rom: {}, tests: {}, power: {} };
    jel.querySelectorAll('tr[data-m]').forEach(function (tr) {
      var a = tr.querySelector('.rom-a').value, p = tr.querySelector('.rom-p').value, pain = tr.querySelector('.rom-pain').checked;
      if (a !== '' || p !== '' || pain) d.rom[tr.getAttribute('data-m')] = { a: a === '' ? '' : Number(a), p: p === '' ? '' : Number(p), pain: pain };
    });
    jel.querySelectorAll('.ort-test').forEach(function (t) {
      var on = t.querySelector('.ort-segb.on'); if (on) d.tests[t.getAttribute('data-t')] = on.getAttribute('data-v');
    });
    jel.querySelectorAll('.pw').forEach(function (s) { if (s.value !== '') d.power[s.getAttribute('data-m')] = s.value; });
    return { j: j, d: d };
  }
  function paintRom(el) {
    el.querySelectorAll('tr[data-n]').forEach(function (tr) {
      var n = Number(tr.getAttribute('data-n'));
      ['.rom-a', '.rom-p'].forEach(function (s) {
        var i = tr.querySelector(s); i.classList.toggle('ort-low', i.value !== '' && Number(i.value) < n);
      });
    });
  }
  function diffTxt(r, l) { return (r !== '' && l !== '' && !isNaN(r) && !isNaN(l)) ? (Math.abs(Number(r) - Number(l)).toFixed(1).replace(/\.0$/, '') + ' سم') : '—'; }

  SP.addSection('orthopedics', {
    id: 'ortJoint',
    title: '🦵 فحص المفاصل المنظم',
    html: function (v) {
      v = v || {};
      var J = v.joints || {}, m = v.measures || {};
      var sel = JOINTS.map(function (j) {
        return '<label class="ort-chip"><input type="checkbox" class="j-pick" value="' + j.id + '"' + (J[j.id] ? ' checked' : '') + ' /> ' + esc(j.l) + '</label>';
      }).join('');
      var blocks = JOINTS.map(function (j) { return jointBlock(j, J[j.id], !!J[j.id]); }).join('');
      function mi(k, l) { return '<div class="field"><label>' + l + '</label><input type="number" step="0.1" class="ms" data-k="' + k + '" value="' + esc(m[k] == null ? '' : m[k]) + '" /></div>'; }
      var meas = '<div class="grid-2">' + mi('llR', 'طول الطرف السفلي يمين (سم)') + mi('llL', 'طول الطرف السفلي يسار (سم)') +
        '<p class="muted" style="grid-column:1/-1">الفرق: <b class="ms-d" data-a="llR" data-b="llL"></b></p>' +
        mi('thR', 'محيط الفخذ يمين (سم)') + mi('thL', 'محيط الفخذ يسار (سم)') +
        '<p class="muted" style="grid-column:1/-1">الفرق: <b class="ms-d" data-a="thR" data-b="thL"></b></p>' +
        mi('caR', 'محيط الساق يمين (سم)') + mi('caL', 'محيط الساق يسار (سم)') +
        '<p class="muted" style="grid-column:1/-1">الفرق: <b class="ms-d" data-a="caR" data-b="caL"></b></p>' +
        '<div class="field"><label>نوع المشية (Gait)</label><select class="gait">' + opt(GAIT, v.gait) + '</select></div></div>';
      var sum = Object.keys(J).map(function (k) { var j = jointById(k); return j ? jointSummary(j, J[k]) : ''; }).filter(Boolean).join(' | ');
      return bx('ort-joint', '🦵 فحص المفاصل المنظم', sum,
        '<p class="muted">اختر المفصل (يمكن أكثر من مفصل). القيم الأقل من الطبيعي تظهر باللون البرتقالي.</p>' +
        '<div class="ort-chips">' + sel + '</div>' + blocks +
        bx('ort-measure', '📏 القياسات والمشية', v.gait || '', meas));
    },
    wire: function (el) {
      if (el._ortJWired) return; el._ortJWired = true;
      function refresh() {
        paintRom(el);
        el.querySelectorAll('.ms-d').forEach(function (b) {
          b.textContent = diffTxt(val(el, '.ms[data-k="' + b.getAttribute('data-a') + '"]'), val(el, '.ms[data-k="' + b.getAttribute('data-b') + '"]'));
        });
        var s = [];
        el.querySelectorAll('.ort-joint:not([hidden])').forEach(function (jel) {
          var r = readJoint(jel), t = jointSummary(r.j, r.d); s.push(t); setSum(jel, 'ort-j-' + r.j.id, t);
        });
        setSum(el, 'ort-joint', s.join(' | '));
        setSum(el, 'ort-measure', val(el, '.gait'));
      }
      el.addEventListener('change', function (e) {
        if (e.target.classList.contains('j-pick')) {
          var b = el.querySelector('.ort-joint[data-j="' + e.target.value + '"]');
          b.hidden = !e.target.checked;
          if (e.target.checked && CC) { var x = b.querySelector('.cc-box'); if (x && !x.classList.contains('open')) CC.setBoxOpen(x, true); }
        }
        refresh();
      });
      el.addEventListener('input', refresh);
      el.addEventListener('click', function (e) {
        var b = e.target.closest && e.target.closest('.ort-segb');
        if (!b) return;
        var on = b.classList.contains('on');
        b.parentNode.querySelectorAll('.ort-segb').forEach(function (x) { x.classList.remove('on'); });
        if (!on) b.classList.add('on');
        refresh();
      });
      refresh();
    },
    collect: function (el) {
      var out = { joints: {}, measures: {}, gait: val(el, '.gait') }, any = !!out.gait;
      el.querySelectorAll('.j-pick:checked').forEach(function (c) {
        out.joints[c.value] = readJoint(el.querySelector('.ort-joint[data-j="' + c.value + '"]')).d; any = true;
      });
      el.querySelectorAll('.ms').forEach(function (i) { if (i.value !== '') { out.measures[i.getAttribute('data-k')] = Number(i.value); any = true; } });
      return any ? out : null;
    },
    render: function (v) {
      if (!v) return '';
      var h = '';
      Object.keys(v.joints || {}).forEach(function (k) {
        var j = jointById(k), d = v.joints[k]; if (!j) return;
        var rows = j.rom.filter(function (r) { return (d.rom || {})[r[0]]; }).map(function (r) {
          var x = d.rom[r[0]];
          return [r[1], (x.a === '' ? '-' : x.a + '°'), (x.p === '' ? '-' : x.p + '°'), r[2] + '°', x.pain ? 'نعم' : ''];
        });
        h += '<p><b>' + esc(j.l) + (d.side ? ' — ' + esc(d.side) : '') + '</b></p>';
        if (rows.length) h += SP.tableHtml(['الحركة', 'Active', 'Passive', 'الطبيعي', 'مؤلم'], rows);
        var t = Object.keys(d.tests || {}).map(function (n) { return [n, d.tests[n] === '+' ? 'إيجابي +' : d.tests[n] === '-' ? 'سلبي −' : 'لم يُجرَ']; });
        if (t.length) h += SP.tableHtml(['الاختبار', 'النتيجة'], t);
        var p = Object.keys(d.power || {}).map(function (n) { return [n, d.power[n] + '/5']; });
        if (p.length) h += SP.tableHtml(['العضلة', 'القوة'], p);
      });
      var m = v.measures || {}, mr = [];
      if (m.llR != null || m.llL != null) mr.push(['طول الطرف السفلي (يمين / يسار)', (m.llR == null ? '-' : m.llR) + ' / ' + (m.llL == null ? '-' : m.llL) + ' — الفرق ' + diffTxt(m.llR == null ? '' : m.llR, m.llL == null ? '' : m.llL)]);
      if (m.thR != null || m.thL != null) mr.push(['محيط الفخذ (يمين / يسار)', (m.thR == null ? '-' : m.thR) + ' / ' + (m.thL == null ? '-' : m.thL)]);
      if (m.caR != null || m.caL != null) mr.push(['محيط الساق (يمين / يسار)', (m.caR == null ? '-' : m.caR) + ' / ' + (m.caL == null ? '-' : m.caL)]);
      if (v.gait) mr.push(['المشية', v.gait]);
      if (mr.length) h += SP.tableHtml(['القياس', 'القيمة'], mr);
      return h;
    }
  });

  /* =====================================================================
     3) NEUROVASCULAR EXAM
     ===================================================================== */
  var PULSES = [['radial', 'Radial'], ['ulnar', 'Ulnar'], ['dp', 'Dorsalis pedis'], ['pt', 'Posterior tibial']];
  var PULSE_V = [['', '—'], ['present', 'موجود'], ['weak', 'ضعيف'], ['absent', 'غير موجود']];
  var DERM = ['C5', 'C6', 'C7', 'C8', 'T1', 'L2', 'L3', 'L4', 'L5', 'S1'];
  var SENS_V = [['', '—'], ['normal', 'طبيعي'], ['reduced', 'ناقص'], ['absent', 'غير موجود']];
  var REFLEX = [['biceps', 'Biceps'], ['triceps', 'Triceps'], ['knee', 'Knee'], ['ankle', 'Ankle']];
  function lbl(list, v) { for (var i = 0; i < list.length; i++) if (list[i][0] === v) return list[i][1]; return v; }
  function rlRow(prefix, key, name, list, d) {
    d = d || {};
    return '<tr><td>' + name + '</td><td><select class="nv" data-k="' + prefix + '.' + key + '.R">' + opt(list, d.R) + '</select></td>' +
      '<td><select class="nv" data-k="' + prefix + '.' + key + '.L">' + opt(list, d.L) + '</select></td></tr>';
  }
  function nvAlert(v) {
    var bad = false;
    ['pulses', 'sensation'].forEach(function (g) {
      var o = (v || {})[g] || {};
      Object.keys(o).forEach(function (k) { if ((o[k] || {}).R === 'absent' || (o[k] || {}).L === 'absent') bad = true; });
    });
    return bad;
  }
  function nvCollect(el) {
    var out = {}, any = false;
    el.querySelectorAll('.nv').forEach(function (s) {
      if (!s.value) return;
      var k = s.getAttribute('data-k').split('.');
      out[k[0]] = out[k[0]] || {}; out[k[0]][k[1]] = out[k[0]][k[1]] || {}; out[k[0]][k[1]][k[2]] = s.value; any = true;
    });
    ['capRefill', 'skinColor', 'skinTemp'].forEach(function (k) { var x = val(el, '.nv1[data-k="' + k + '"]'); if (x) { out[k] = x; any = true; } });
    return any ? out : null;
  }
  function nvSummary(v) {
    if (!v) return '';
    var n = 0; ['pulses', 'sensation', 'reflexes'].forEach(function (g) { n += Object.keys(v[g] || {}).length; });
    return (nvAlert(v) ? '⚠️ نبض/إحساس غير موجود · ' : '') + (n ? n + ' بند مسجّل' : '') + (v.capRefill ? ' · CRT ' + v.capRefill : '');
  }
  var NV_BANNER = '🚨 افحص الحالة العصبية الوعائية / احتمال متلازمة الحيز (Compartment syndrome)';

  SP.addSection('orthopedics', {
    id: 'ortNeuro',
    title: '🩸 الفحص العصبي الوعائي',
    html: function (v) {
      v = v || {};
      function t(head, rows) { return '<div class="table-wrap"><table class="ort-nv"><thead><tr><th>' + head + '</th><th>يمين</th><th>يسار</th></tr></thead><tbody>' + rows + '</tbody></table></div>'; }
      var body = '<div class="ort-banner ort-red nv-banner"' + (nvAlert(v) ? '' : ' hidden') + '>' + NV_BANNER + '</div>' +
        bx('ort-nv-pulse', 'النبض والدورة الدموية', '',
          t('النبض', PULSES.map(function (p) { return rlRow('pulses', p[0], p[1], PULSE_V, (v.pulses || {})[p[0]]); }).join('')) +
          '<div class="grid-2">' +
          '<div class="field"><label>امتلاء الشعيرات (Capillary refill)</label><select class="nv1" data-k="capRefill">' + opt(['', '< 2 ث', '2–3 ث', '> 3 ث'], v.capRefill) + '</select></div>' +
          '<div class="field"><label>لون الجلد</label><select class="nv1" data-k="skinColor">' + opt(['', 'طبيعي', 'شاحب', 'مزرق', 'محمر'], v.skinColor) + '</select></div>' +
          '<div class="field"><label>حرارة الجلد</label><select class="nv1" data-k="skinTemp">' + opt(['', 'دافئ', 'بارد', 'ساخن'], v.skinTemp) + '</select></div></div>') +
        bx('ort-nv-sens', 'الإحساس حسب الـ Dermatome', 'C5–T1 · L2–S1',
          t('Dermatome', DERM.map(function (d) { return rlRow('sensation', d, d, SENS_V, (v.sensation || {})[d]); }).join(''))) +
        bx('ort-nv-refl', 'المنعكسات (0–4)', '',
          t('Reflex', REFLEX.map(function (r) { return rlRow('reflexes', r[0], r[1], [['', '—'], ['0', '0'], ['1', '1+'], ['2', '2+'], ['3', '3+'], ['4', '4+']], (v.reflexes || {})[r[0]]); }).join('')));
      return bx('ort-neuro', '🩸 الفحص العصبي الوعائي', nvSummary(v), body);
    },
    wire: function (el) {
      if (el._ortNvWired) return; el._ortNvWired = true;
      el.addEventListener('change', function () {
        var v = nvCollect(el);
        el.querySelector('.nv-banner').hidden = !nvAlert(v);
        setSum(el, 'ort-neuro', nvSummary(v));
      });
    },
    collect: nvCollect,
    render: function (v) {
      if (!v) return '';
      var h = nvAlert(v) ? '<p style="color:#b91c1c"><b>' + NV_BANNER + '</b></p>' : '';
      function grp(g, names, list) {
        var o = v[g] || {};
        var rows = Object.keys(o).map(function (k) { return [lbl(names, k), lbl(list, o[k].R || '') || '-', lbl(list, o[k].L || '') || '-']; });
        return rows.length ? SP.tableHtml(['', 'يمين', 'يسار'], rows) : '';
      }
      h += grp('pulses', PULSES, PULSE_V) + grp('sensation', DERM.map(function (d) { return [d, d]; }), SENS_V) + grp('reflexes', REFLEX, [['0', '0'], ['1', '1+'], ['2', '2+'], ['3', '3+'], ['4', '4+']]);
      var r = [];
      if (v.capRefill) r.push(['Capillary refill', v.capRefill]);
      if (v.skinColor) r.push(['لون الجلد', v.skinColor]);
      if (v.skinTemp) r.push(['حرارة الجلد', v.skinTemp]);
      if (r.length) h += SP.tableHtml(['البند', 'القيمة'], r);
      return h;
    }
  });

  /* =====================================================================
     4) SPINE RED FLAGS
     ===================================================================== */
  var FLAGS = [
    ['saddle', 'خدر في منطقة السرج (Saddle anesthesia)', true],
    ['bladder', 'مشكلة جديدة في التحكم بالبول / البراز', true],
    ['weakness', 'ضعف متزايد في الساقين', false],
    ['fever', 'حرارة', false],
    ['weight', 'نقص وزن غير مبرر', false],
    ['cancer', 'تاريخ مرضي لورم', false],
    ['trauma', 'إصابة شديدة', false],
    ['night', 'ألم ليلي غير مرتبط بالحركة', false],
    ['age50', 'العمر أكبر من 50 مع أول نوبة', false]
  ];
  var RF_BANNER = '🚨 تحويل عاجل / رنين مغناطيسي عاجل (Urgent referral / MRI)';
  function rfUrgent(list) { return list.indexOf('saddle') >= 0 || list.indexOf('bladder') >= 0; }
  function rfLabel(k) { for (var i = 0; i < FLAGS.length; i++) if (FLAGS[i][0] === k) return FLAGS[i][1]; return k; }
  SP.addSection('orthopedics', {
    id: 'ortRedflags',
    title: '🚩 علامات الخطر في العمود الفقري',
    html: function (v) {
      var f = (v && v.flags) || [];
      var body = '<div class="ort-banner ort-red rf-banner"' + (rfUrgent(f) ? '' : ' hidden') + '>' + RF_BANNER + '</div>' +
        '<div class="ort-checks">' + FLAGS.map(function (x) {
          return '<label class="ort-chip' + (x[2] ? ' ort-chip-red' : '') + '"><input type="checkbox" class="rf" value="' + x[0] + '"' + (f.indexOf(x[0]) >= 0 ? ' checked' : '') + ' /> ' + esc(x[1]) + '</label>';
        }).join('') + '</div>';
      return bx('ort-rf', '🚩 علامات الخطر في العمود الفقري (Red flags)', f.length ? (rfUrgent(f) ? '🚨 ' : '') + f.length + ' علامة' : '', body);
    },
    wire: function (el) {
      if (el._ortRfWired) return; el._ortRfWired = true;
      el.addEventListener('change', function () {
        var f = []; el.querySelectorAll('.rf:checked').forEach(function (c) { f.push(c.value); });
        el.querySelector('.rf-banner').hidden = !rfUrgent(f);
        setSum(el, 'ort-rf', f.length ? (rfUrgent(f) ? '🚨 ' : '') + f.length + ' علامة' : '');
      });
    },
    collect: function (el) {
      var f = []; el.querySelectorAll('.rf:checked').forEach(function (c) { f.push(c.value); });
      return f.length ? { flags: f, urgent: rfUrgent(f) } : null;
    },
    render: function (v) {
      if (!v || !v.flags || !v.flags.length) return '';
      return (rfUrgent(v.flags) ? '<p style="color:#b91c1c"><b>' + RF_BANNER + '</b></p>' : '') +
        SP.tableHtml(['علامة الخطر', ''], v.flags.map(function (k) { return [rfLabel(k), '✔']; }));
    }
  });

  /* =====================================================================
     5) FRACTURE (existing fields kept) + pattern / classification / union log
     ===================================================================== */
  var FR_TYPE = ['', 'مغلق', 'مفتوح'];
  var FR_DISP = ['', 'غير مزاح', 'مزاح'];
  var FR_PATTERN = ['', 'عرضي (Transverse)', 'مائل (Oblique)', 'حلزوني (Spiral)', 'مفتت (Comminuted)', 'قطعي (Segmental)',
                    'غصن أخضر (Greenstick)', 'قلعي (Avulsion)', 'إجهادي (Stress)'];
  var FR_CLASS = [
    ['Salter-Harris (أطفال)', ['Salter-Harris I', 'Salter-Harris II', 'Salter-Harris III', 'Salter-Harris IV', 'Salter-Harris V']],
    ['Garden (عنق الفخذ)', ['Garden I', 'Garden II', 'Garden III', 'Garden IV']],
    ['Gustilo (الكسور المفتوحة)', ['Gustilo I', 'Gustilo II', 'Gustilo IIIA', 'Gustilo IIIB', 'Gustilo IIIC']],
    ['Weber (الكاحل)', ['Weber A', 'Weber B', 'Weber C']],
    ['Neer (أعلى عظمة العضد)', ['Neer 1-part', 'Neer 2-part', 'Neer 3-part', 'Neer 4-part']]
  ];
  var UNION = ['', 'لم يلتحم', 'التحام متأخر', 'ملتحم', 'عدم التحام (Non-union)'];
  var FR_L = { mechanism: 'آلية الإصابة', injuryDate: 'تاريخ الإصابة', site: 'موضع الكسر', type: 'نوع الكسر',
    displaced: 'الإزاحة', desc: 'وصف الكسر', pattern: 'نمط الكسر', classification: 'التصنيف', ao: 'تصنيف AO/OTA',
    side: 'الجهة', intra: 'داخل المفصل', nvInjury: 'إصابة عصبية / وعائية', skin: 'حالة الجلد' };
  function unionRow(r) {
    r = r || {};
    return '<div class="ort-img-row ort-un-row"><input type="date" class="u-date" value="' + esc(r.date || '') + '" />' +
      '<select class="u-status">' + opt(UNION, r.status, '— الحالة —') + '</select>' +
      '<input class="u-xray" placeholder="مرجع / ملاحظة الأشعة" value="' + esc(r.xray || '') + '" />' +
      '<button type="button" class="btn small danger u-del">🗑</button></div>';
  }
  function frSummary(v) {
    if (!v) return '';
    var u = (v.union || []).slice(-1)[0];
    return [v.site, v.pattern && v.pattern.split(' (')[0], v.classification || v.ao, v.side, u && u.status ? 'الالتحام: ' + u.status : '']
      .filter(Boolean).join(' · ');
  }
  function frCollect(el) {
    var out = {}, any = false;
    el.querySelectorAll('.ort-f').forEach(function (f) { var v = (f.value || '').trim(); if (v) { out[f.dataset.k] = v; any = true; } });
    var un = [];
    el.querySelectorAll('.ort-un-row').forEach(function (r) {
      var d = r.querySelector('.u-date').value, s = r.querySelector('.u-status').value, x = (r.querySelector('.u-xray').value || '').trim();
      if (d || s || x) un.push({ date: d, status: s, xray: x });
    });
    if (un.length) { out.union = un; any = true; }
    return any ? out : null;
  }
  SP.addSection('orthopedics', {
    id: 'fracture',
    title: '🦴 الإصابة والكسر',
    html: function (v) {
      v = v || {};
      function inp(k, l, ph, type) {
        return '<div class="field"><label>' + esc(l) + '</label><input' + (type ? ' type="' + type + '"' : '') + ' class="ort-f" data-k="' + k +
          '" value="' + esc(v[k] || '') + '" placeholder="' + esc(ph || '') + '" /></div>';
      }
      function sel(k, l, opts) { return '<div class="field"><label>' + esc(l) + '</label><select class="ort-f" data-k="' + k + '">' + opt(opts, v[k]) + '</select></div>'; }
      var cls = '<div class="field"><label>التصنيف</label><select class="ort-f" data-k="classification"><option value="">—</option>' +
        FR_CLASS.map(function (g) {
          return '<optgroup label="' + esc(g[0]) + '">' + g[1].map(function (o) { return '<option' + (o === v.classification ? ' selected' : '') + '>' + o + '</option>'; }).join('') + '</optgroup>';
        }).join('') + '</select></div>';
      var body = '<div class="grid-2">' +
        inp('mechanism', 'آلية الإصابة', 'سقوط / حادث / رياضة') +
        inp('injuryDate', 'تاريخ الإصابة', 'مثال: 2026-09-01') +
        inp('site', 'موضع الكسر', 'مثال: الكعبرة السفلية') +
        sel('side', 'الجهة', SIDE2) +
        sel('type', 'نوع الكسر', FR_TYPE) +
        sel('displaced', 'الإزاحة', FR_DISP) +
        sel('pattern', 'نمط الكسر', FR_PATTERN) +
        cls +
        inp('ao', 'تصنيف AO/OTA', 'مثال: 23-A2') +
        sel('intra', 'داخل المفصل', ['', 'نعم', 'لا']) +
        sel('nvInjury', 'إصابة عصبية / وعائية', ['', 'نعم', 'لا']) +
        inp('skin', 'حالة الجلد', 'سليم / جرح / بثور') +
        '<div class="field" style="grid-column:1 / -1"><label>وصف الكسر</label>' +
        '<textarea class="ort-f" data-k="desc" rows="2" placeholder="خط كسر واضح...">' + esc(v.desc || '') + '</textarea></div></div>' +
        bx('ort-union', '📆 متابعة التحام الكسر', ((v.union || []).slice(-1)[0] || {}).status || '',
          '<div class="ort-un-list">' + ((v.union && v.union.length) ? v.union.map(unionRow).join('') : unionRow()) + '</div>' +
          '<button type="button" class="btn ghost small u-add">+ إضافة متابعة</button>');
      return bx('ort-fracture', '🦴 الإصابة والكسر', frSummary(v), body);
    },
    wire: function (el) {
      if (el._ortFrWired) return; el._ortFrWired = true;
      var list = el.querySelector('.ort-un-list');
      el.querySelector('.u-add').addEventListener('click', function () { list.insertAdjacentHTML('beforeend', unionRow()); });
      list.addEventListener('click', function (e) {
        if (!e.target.classList.contains('u-del')) return;
        if (list.querySelectorAll('.ort-un-row').length === 1) { list.innerHTML = unionRow(); return; }
        e.target.closest('.ort-un-row').remove();
      });
      el.addEventListener('change', function () { setSum(el, 'ort-fracture', frSummary(frCollect(el))); });
    },
    collect: frCollect,
    render: function (v) {
      if (!v) return '';
      var rows = Object.keys(FR_L).filter(function (k) { return v[k]; }).map(function (k) { return [FR_L[k], v[k]]; });
      var h = rows.length ? SP.tableHtml(['البند', 'القيمة'], rows) : '';
      if (v.union && v.union.length) h += SP.tableHtml(['تاريخ المتابعة', 'حالة الالتحام', 'الأشعة'], v.union.map(function (u) { return [u.date || '-', u.status || '-', u.xray || '']; }));
      return h;
    }
  });

  /* =====================================================================
     6) CAST / SPLINT / BRACE TRACKER  { items:[{type,area,side,applied,removal,notes}], instr:[keys] }
     ===================================================================== */
  var CAST_T = ['', 'جبس (Cast)', 'جبيرة خلفية (Back slab)', 'جبيرة (Splint)', 'دعامة (Brace)', 'حذاء طبي (Boot)', 'حمالة ذراع (Sling)'];
  var INSTR = [
    ['dry', 'حافظ على الجبس / الجبيرة جافة ولا تبللها بالماء.'],
    ['elevate', 'ارفع الطرف المصاب على وسادة أعلى من مستوى القلب لتقليل التورم.'],
    ['move', 'حرّك أصابع اليد / القدم باستمرار عدة مرات يومياً.'],
    ['warn', 'ارجع للطبيب فوراً عند: تنميل، زيادة التورم، ألم شديد متزايد، أو تغير لون الأصابع (زرقة أو شحوب).']
  ];
  function remainTxt(removal) {
    if (!removal) return '';
    var n = days(today(), removal);
    return n < 0 ? 'متأخر ' + (-n) + ' يوم' : n === 0 ? 'الفك اليوم' : 'متبقي ' + n + ' يوم';
  }
  function castRow(r) {
    r = r || {};
    return '<div class="ort-cast-row">' +
      '<select class="c-type">' + opt(CAST_T, r.type, '— النوع —') + '</select>' +
      '<input class="c-area" placeholder="الموضع (مثال: الساعد)" value="' + esc(r.area || '') + '" />' +
      '<select class="c-side">' + opt(SIDE3, r.side, '— الجهة —') + '</select>' +
      '<label class="ort-mini">تاريخ التركيب<input type="date" class="c-applied" value="' + esc(r.applied || '') + '" /></label>' +
      '<label class="ort-mini">موعد الفك<input type="date" class="c-removal" value="' + esc(r.removal || '') + '" /></label>' +
      '<span class="ort-days">' + esc(remainTxt(r.removal)) + '</span>' +
      '<input class="c-notes" placeholder="ملاحظات" value="' + esc(r.notes || '') + '" />' +
      '<button type="button" class="btn small danger c-del">🗑</button></div>';
  }
  function castCollect(el) {
    var items = [];
    el.querySelectorAll('.ort-cast-row').forEach(function (r) {
      var o = { type: r.querySelector('.c-type').value, area: (r.querySelector('.c-area').value || '').trim(), side: r.querySelector('.c-side').value,
        applied: r.querySelector('.c-applied').value, removal: r.querySelector('.c-removal').value, notes: (r.querySelector('.c-notes').value || '').trim() };
      if (o.type || o.area || o.applied || o.removal || o.notes) items.push(o);
    });
    var instr = []; el.querySelectorAll('.c-instr:checked').forEach(function (c) { instr.push(c.value); });
    return (items.length || instr.length) ? { items: items, instr: instr } : null;
  }
  function castSummary(v) {
    if (!v || !v.items || !v.items.length) return '';
    var c = v.items[0];
    return (c.type ? c.type.split(' (')[0] : 'تثبيت') + (c.removal ? ': ' + remainTxt(c.removal) : '') + (v.items.length > 1 ? ' (+' + (v.items.length - 1) + ')' : '');
  }
  SP.addSection('orthopedics', {
    id: 'ortCast',
    title: '🩼 الجبس والجبائر والدعامات',
    html: function (v) {
      v = v || {};
      var instr = v.instr || [];
      var body = '<div class="ort-cast-list">' + ((v.items && v.items.length) ? v.items.map(castRow).join('') : castRow()) + '</div>' +
        '<button type="button" class="btn ghost small c-add">+ إضافة تثبيت</button>' +
        bx('ort-instr', '📝 تعليمات المريض (تُطبع مع الروشتة)', instr.length ? instr.length + ' تعليمات' : '',
          '<div class="ort-checks">' + INSTR.map(function (x) {
            return '<label class="ort-chip ort-chip-wide"><input type="checkbox" class="c-instr" value="' + x[0] + '"' + (instr.indexOf(x[0]) >= 0 ? ' checked' : '') + ' /> ' + esc(x[1]) + '</label>';
          }).join('') + '</div>');
      return bx('ort-cast', '🩼 الجبس والجبائر والدعامات', castSummary(v), body);
    },
    wire: function (el) {
      if (el._ortCastWired) return; el._ortCastWired = true;
      var list = el.querySelector('.ort-cast-list');
      el.querySelector('.c-add').addEventListener('click', function () { list.insertAdjacentHTML('beforeend', castRow()); });
      list.addEventListener('click', function (e) {
        if (!e.target.classList.contains('c-del')) return;
        if (list.querySelectorAll('.ort-cast-row').length === 1) { list.innerHTML = castRow(); return; }
        e.target.closest('.ort-cast-row').remove();
      });
      el.addEventListener('change', function (e) {
        if (e.target.classList.contains('c-removal')) e.target.closest('.ort-cast-row').querySelector('.ort-days').textContent = remainTxt(e.target.value);
        var v = castCollect(el);
        setSum(el, 'ort-cast', castSummary(v));
        setSum(el, 'ort-instr', v && v.instr.length ? v.instr.length + ' تعليمات' : '');
      });
    },
    collect: castCollect,
    render: function (v) {
      if (!v) return '';
      var h = '';
      if (v.items && v.items.length) h += SP.tableHtml(['النوع', 'الموضع', 'الجهة', 'تاريخ التركيب', 'موعد الفك', 'ملاحظات'],
        v.items.map(function (c) { return [c.type || '-', c.area || '-', c.side || '-', c.applied || '-', c.removal || '-', c.notes || '']; }));
      if (v.instr && v.instr.length) {
        h += '<div class="notes" style="margin-top:6px"><b>📝 تعليمات للمريض:</b><ul style="margin:4px 0 0;padding-inline-start:18px">' +
          INSTR.filter(function (x) { return v.instr.indexOf(x[0]) >= 0; }).map(function (x) { return '<li>' + esc(x[1]) + '</li>'; }).join('') + '</ul></div>';
      }
      return h;
    }
  });

  /* =====================================================================
     7) SURGERY + INJECTIONS LOG
     { surgery:{procedure,date,side,surgeon,notes,wb,sutureDate,hwRemoval,hwDate, implants:[{type,size,brand,lot}]},
       injections:[{joint,side,type,drug,dose,date,num}] }
     ===================================================================== */
  var IMPLANT = ['', 'شريحة (Plate)', 'مسامير (Screws)', 'مسمار نخاعي (Nail)', 'مفصل صناعي (Prosthesis)', 'سلك (K-wire)', 'أخرى'];
  var WB = ['', 'بدون تحميل (Non-weight bearing)', 'تحميل جزئي (Partial)', 'تحميل كامل (Full)'];
  var INJ_T = ['', 'كورتيزون (Corticosteroid)', 'بلازما (PRP)', 'هيالورونيك (Hyaluronic acid)', 'مخدر موضعي (Local anesthetic)', 'سحب سائل (Aspiration)'];
  var STEROID = INJ_T[1];
  function implantRow(r) {
    r = r || {};
    return '<div class="ort-img-row ort-imp-row"><select class="im-type">' + opt(IMPLANT, r.type, '— النوع —') + '</select>' +
      '<input class="im-size" placeholder="المقاس" value="' + esc(r.size || '') + '" />' +
      '<input class="im-brand" placeholder="الشركة" value="' + esc(r.brand || '') + '" />' +
      '<input class="im-lot" placeholder="رقم التشغيلة (Lot)" value="' + esc(r.lot || '') + '" />' +
      '<button type="button" class="btn small danger im-del">🗑</button></div>';
  }
  function injRow(r) {
    r = r || {};
    return '<div class="ort-img-row ort-inj-row"><input class="in-joint" placeholder="المفصل (مثال: الركبة)" value="' + esc(r.joint || '') + '" />' +
      '<select class="in-side">' + opt(SIDE3, r.side, '— الجهة —') + '</select>' +
      '<select class="in-type">' + opt(INJ_T, r.type, '— النوع —') + '</select>' +
      '<input class="in-drug" placeholder="اسم الدواء" value="' + esc(r.drug || '') + '" />' +
      '<input class="in-dose" placeholder="الجرعة" value="' + esc(r.dose || '') + '" />' +
      '<input type="date" class="in-date" value="' + esc(r.date || '') + '" />' +
      '<input type="number" min="1" class="in-num" placeholder="رقم الحقنة" title="رقم الحقنة لهذا المفصل" value="' + esc(r.num || '') + '" />' +
      '<button type="button" class="btn small danger in-del">🗑</button></div>';
  }
  function jkey(j, s) { return (j || '').replace(/\s+/g, '').replace(/^ال/, '') + '|' + (s || ''); }
  // previous injections of this patient from saved visits (excluding the visit being edited when same date+joint)
  function pastInjections() {
    var out = [];
    prevVisits().forEach(function (vis) {
      var s = vis.exam && vis.exam.sections && vis.exam.sections.ortSurgery;
      (s && s.injections || []).forEach(function (i) { out.push(i); });
    });
    return out;
  }
  function steroidWarnings(current) {
    var all = pastInjections().concat(current), seen = {}, list = [];
    all.forEach(function (i) { var k = jkey(i.joint, i.side) + '|' + i.date + '|' + i.type; if (!seen[k] && i.date) { seen[k] = 1; list.push(i); } });
    var warns = [], t = today();
    current.forEach(function (c) {
      if (c.type !== STEROID || !c.joint) return;
      var ref = c.date || t, k = jkey(c.joint, c.side);
      var st = list.filter(function (i) { return i.type === STEROID && jkey(i.joint, i.side) === k; });
      var lastYear = st.filter(function (i) { var d = days(i.date, ref); return d >= 0 && d <= 365; });
      var prior = st.filter(function (i) { return i.date < ref; }).sort(function (a, b) { return b.date.localeCompare(a.date); })[0];
      if (lastYear.length >= 3) warns.push('⚠️ ' + c.joint + ': ' + lastYear.length + ' حقن كورتيزون خلال آخر 12 شهر.');
      if (prior && days(prior.date, ref) < 90) warns.push('⚠️ ' + c.joint + ': أقل من 3 أشهر منذ آخر حقنة كورتيزون (' + prior.date + ').');
    });
    return warns;
  }
  function surgCollect(el) {
    var s = {}, any = false;
    el.querySelectorAll('.sg').forEach(function (f) { var v = (f.value || '').trim(); if (v) { s[f.getAttribute('data-k')] = v; any = true; } });
    var imp = [];
    el.querySelectorAll('.ort-imp-row').forEach(function (r) {
      var o = { type: r.querySelector('.im-type').value, size: val(r, '.im-size'), brand: val(r, '.im-brand'), lot: val(r, '.im-lot') };
      if (o.type || o.size || o.brand || o.lot) imp.push(o);
    });
    if (imp.length) { s.implants = imp; any = true; }
    var inj = [];
    el.querySelectorAll('.ort-inj-row').forEach(function (r) {
      var o = { joint: val(r, '.in-joint'), side: r.querySelector('.in-side').value, type: r.querySelector('.in-type').value,
        drug: val(r, '.in-drug'), dose: val(r, '.in-dose'), date: r.querySelector('.in-date').value, num: val(r, '.in-num') };
      if (o.joint || o.type || o.drug || o.date) inj.push(o);
    });
    var out = {};
    if (any) out.surgery = s;
    if (inj.length) out.injections = inj;
    return (any || inj.length) ? out : null;
  }
  function surgSummary(v) {
    if (!v) return '';
    var p = [];
    if (v.surgery && v.surgery.procedure) p.push(v.surgery.procedure + (v.surgery.date ? ' ' + v.surgery.date : ''));
    if (v.injections && v.injections.length) p.push(v.injections.length + ' حقنة');
    return p.join(' · ');
  }
  SP.addSection('orthopedics', {
    id: 'ortSurgery',
    title: '🔪 العمليات والحقن',
    html: function (v) {
      v = v || {};
      var s = v.surgery || {};
      function inp(k, l, type, ph) { return '<div class="field"><label>' + l + '</label><input' + (type ? ' type="' + type + '"' : '') + ' class="sg" data-k="' + k + '" value="' + esc(s[k] || '') + '" placeholder="' + esc(ph || '') + '" /></div>'; }
      function sel(k, l, o) { return '<div class="field"><label>' + l + '</label><select class="sg" data-k="' + k + '">' + opt(o, s[k]) + '</select></div>'; }
      var surg = '<div class="grid-2">' + inp('procedure', 'اسم العملية', '', 'مثال: تثبيت داخلي بشريحة ومسامير') + inp('date', 'تاريخ العملية', 'date') +
        sel('side', 'الجهة', SIDE3) + inp('surgeon', 'الجراح') + '</div>' +
        '<h5 class="ort-h5">المثبتات (Implants)</h5><div class="ort-imp-list">' + ((s.implants && s.implants.length) ? s.implants.map(implantRow).join('') : implantRow()) + '</div>' +
        '<button type="button" class="btn ghost small im-add">+ إضافة مثبت</button>' +
        '<h5 class="ort-h5">بعد العملية</h5><div class="grid-2">' + sel('wb', 'التحميل على الطرف', WB) + inp('sutureDate', 'موعد فك الغرز', 'date') +
        sel('hwRemoval', 'إزالة المثبتات مخططة', ['', 'لا', 'نعم']) + inp('hwDate', 'موعد إزالة المثبتات (تقريبي)', 'date') +
        '<div class="field" style="grid-column:1/-1"><label>ملاحظات</label><textarea class="sg" data-k="notes" rows="2">' + esc(s.notes || '') + '</textarea></div></div>';
      var inj = '<div class="ort-banner ort-orange inj-warn" hidden></div>' +
        '<div class="ort-inj-list">' + ((v.injections && v.injections.length) ? v.injections.map(injRow).join('') : injRow()) + '</div>' +
        '<button type="button" class="btn ghost small in-add">+ إضافة حقنة</button>';
      return bx('ort-surgery', '🔪 العمليات والحقن', surgSummary(v),
        bx('ort-surg', '🏥 العملية الجراحية', s.procedure || '', surg) +
        bx('ort-inj', '💉 الحقن وسحب السوائل', (v.injections || []).length ? v.injections.length + ' حقنة' : '', inj));
    },
    wire: function (el) {
      if (el._ortSgWired) return; el._ortSgWired = true;
      function rowList(listSel, rowSel, addSel, delCls, maker) {
        var list = el.querySelector(listSel);
        el.querySelector(addSel).addEventListener('click', function () { list.insertAdjacentHTML('beforeend', maker()); refresh(); });
        list.addEventListener('click', function (e) {
          if (!e.target.classList.contains(delCls)) return;
          if (list.querySelectorAll(rowSel).length === 1) list.innerHTML = maker(); else e.target.closest(rowSel).remove();
          refresh();
        });
      }
      function refresh() {
        var v = surgCollect(el) || {};
        // suggest the injection number for that joint when empty
        var past = pastInjections();
        el.querySelectorAll('.ort-inj-row').forEach(function (r) {
          var n = r.querySelector('.in-num'), j = val(r, '.in-joint');
          if (!j) return;
          var k = jkey(j, r.querySelector('.in-side').value);
          n.placeholder = 'رقم ' + (past.filter(function (i) { return jkey(i.joint, i.side) === k; }).length + 1);
        });
        var w = steroidWarnings(v.injections || []), b = el.querySelector('.inj-warn');
        b.hidden = !w.length; b.innerHTML = w.map(esc).join('<br>') + (w.length ? '<br><small>تنبيه فقط — يمكنك المتابعة.</small>' : '');
        setSum(el, 'ort-surgery', surgSummary(v));
        setSum(el, 'ort-surg', (v.surgery || {}).procedure || '');
        setSum(el, 'ort-inj', (v.injections || []).length ? v.injections.length + ' حقنة' + (w.length ? ' ⚠️' : '') : '');
      }
      rowList('.ort-imp-list', '.ort-imp-row', '.im-add', 'im-del', implantRow);
      rowList('.ort-inj-list', '.ort-inj-row', '.in-add', 'in-del', injRow);
      el.addEventListener('change', refresh);
      refresh();
    },
    collect: surgCollect,
    render: function (v) {
      if (!v) return '';
      var h = '', s = v.surgery;
      if (s) {
        var L = { procedure: 'العملية', date: 'التاريخ', side: 'الجهة', surgeon: 'الجراح', wb: 'التحميل', sutureDate: 'فك الغرز', hwRemoval: 'إزالة المثبتات مخططة', hwDate: 'موعد إزالة المثبتات', notes: 'ملاحظات' };
        var rows = Object.keys(L).filter(function (k) { return s[k]; }).map(function (k) { return [L[k], s[k]]; });
        if (rows.length) h += SP.tableHtml(['البند', 'القيمة'], rows);
        if (s.implants && s.implants.length) h += SP.tableHtml(['المثبت', 'المقاس', 'الشركة', 'Lot'], s.implants.map(function (i) { return [i.type || '-', i.size || '', i.brand || '', i.lot || '']; }));
      }
      if (v.injections && v.injections.length) h += SP.tableHtml(['المفصل', 'الجهة', 'النوع', 'الدواء', 'الجرعة', 'التاريخ', 'رقم'],
        v.injections.map(function (i) { return [i.joint || '-', i.side || '', i.type || '', i.drug || '', i.dose || '', i.date || '', i.num || '']; }));
      return h;
    }
  });

  /* =====================================================================
     8) OUTCOME SCORES
     ODI (Oswestry Disability Index): 10 sections, each 0–5.
         ODI % = (sum of scores / (5 × number of answered sections)) × 100
         Bands: 0–20 minimal, 21–40 moderate, 41–60 severe, 61–80 crippling, 81–100 bed-bound / exaggerating.
     QuickDASH: 11 items, each 1–5. At least 10 must be answered.
         QuickDASH = ((sum of answered / number answered) − 1) × 25   → 0 (no disability) … 100 (most severe)
     WOMAC (Likert 3.1): 24 items, each 0–4.  Pain 5 items (0–20), Stiffness 2 items (0–8), Function 17 items (0–68).
         Total = Pain + Stiffness + Function (0–96).  Percentage = Total / 96 × 100.
     ===================================================================== */
  var ODI_Q = ['شدة الألم (Pain intensity)', 'العناية الشخصية (Personal care)', 'رفع الأشياء (Lifting)', 'المشي (Walking)', 'الجلوس (Sitting)',
               'الوقوف (Standing)', 'النوم (Sleeping)', 'الحياة الجنسية (Sex life)', 'الحياة الاجتماعية (Social life)', 'السفر (Travelling)'];
  var ODI_O = [['', '—'], ['0', '0 — لا مشكلة'], ['1', '1'], ['2', '2'], ['3', '3'], ['4', '4'], ['5', '5 — أقصى صعوبة']];
  var QD_Q = ['فتح برطمان محكم الغلق', 'أعمال منزلية شاقة (غسل الأرضيات / الحوائط)', 'حمل حقيبة تسوق أو شنطة', 'غسل الظهر',
              'استخدام سكين لتقطيع الطعام', 'أنشطة ترفيهية تتطلب قوة في الذراع أو الكتف', 'تأثير المشكلة على الأنشطة الاجتماعية (آخر أسبوع)',
              'تأثير المشكلة على العمل أو الأنشطة اليومية (آخر أسبوع)', 'ألم الذراع / الكتف / اليد', 'تنميل أو وخز في الذراع / الكتف / اليد', 'صعوبة النوم بسبب الألم'];
  var QD_O = [['', '—'], ['1', '1 — لا صعوبة'], ['2', '2 — صعوبة بسيطة'], ['3', '3 — صعوبة متوسطة'], ['4', '4 — صعوبة شديدة'], ['5', '5 — غير قادر']];
  var WO_P = ['المشي على أرض مستوية', 'صعود / نزول السلم', 'ليلاً في السرير', 'الجلوس أو الاستلقاء', 'الوقوف'];
  var WO_S = ['التيبس بعد الاستيقاظ صباحاً', 'التيبس بعد الجلوس أو الراحة خلال اليوم'];
  var WO_F = ['نزول السلم', 'صعود السلم', 'القيام من الجلوس', 'الوقوف', 'الانحناء للأرض', 'المشي على أرض مستوية', 'ركوب / نزول السيارة',
              'التسوق', 'لبس الجوارب', 'القيام من السرير', 'خلع الجوارب', 'الاستلقاء في السرير', 'الدخول / الخروج من الحمام',
              'الجلوس', 'الجلوس على / القيام من التواليت', 'أعمال منزلية شاقة', 'أعمال منزلية خفيفة'];
  var WO_O = [['', '—'], ['0', '0 — لا يوجد'], ['1', '1 — بسيط'], ['2', '2 — متوسط'], ['3', '3 — شديد'], ['4', '4 — شديد جداً']];

  function odiScore(a) {
    var n = 0, s = 0; a.forEach(function (x) { if (x !== '' && x != null) { n++; s += Number(x); } });
    if (!n) return null;
    var pct = Math.round(s / (5 * n) * 100);
    var band = pct <= 20 ? 'إعاقة بسيطة' : pct <= 40 ? 'إعاقة متوسطة' : pct <= 60 ? 'إعاقة شديدة' : pct <= 80 ? 'إعاقة معطِّلة' : 'ملازم للفراش';
    return { score: pct, band: band, answered: n };
  }
  function qdScore(a) {
    var n = 0, s = 0; a.forEach(function (x) { if (x !== '' && x != null) { n++; s += Number(x); } });
    if (n < 10) return n ? { score: null, answered: n } : null;
    return { score: Math.round(((s / n) - 1) * 25 * 10) / 10, answered: n };
  }
  function woScore(a) {
    function sum(from, to) { var s = 0, n = 0; for (var i = from; i < to; i++) if (a[i] !== '' && a[i] != null) { s += Number(a[i]); n++; } return { s: s, n: n }; }
    var p = sum(0, 5), st = sum(5, 7), f = sum(7, 24);
    if (!p.n && !st.n && !f.n) return null;
    var tot = p.s + st.s + f.s;
    return { pain: p.s, stiffness: st.s, function: f.s, score: tot, pct: Math.round(tot / 96 * 100), answered: p.n + st.n + f.n };
  }
  function qList(cls, qs, opts, ans, offset) {
    offset = offset || 0;
    return '<ol class="ort-q" start="' + (offset + 1) + '">' + qs.map(function (q, i) {
      return '<li><span>' + esc(q) + '</span><select class="' + cls + '" data-i="' + (i + offset) + '">' + opt(opts, (ans || [])[i + offset]) + '</select></li>';
    }).join('') + '</ol>';
  }
  function readAns(el, cls, n) { var a = []; for (var i = 0; i < n; i++) a.push(''); el.querySelectorAll('.' + cls).forEach(function (s) { a[Number(s.getAttribute('data-i'))] = s.value; }); return a; }
  function odiTxt(r) { return r ? 'ODI ' + r.score + '% — ' + r.band : ''; }
  function qdTxt(r) { return r ? (r.score == null ? 'QuickDASH: أجب على 10 أسئلة على الأقل (' + r.answered + '/11)' : 'QuickDASH ' + r.score + ' / 100') : ''; }
  function woTxt(r) { return r ? 'WOMAC ' + r.score + ' / 96 (' + r.pct + '%) — ألم ' + r.pain + '/20 · تيبس ' + r.stiffness + '/8 · وظيفة ' + r.function + '/68' : ''; }
  function scoreTrend(key) {
    var pts = [];
    prevVisits().forEach(function (v) {
      var s = v.exam && v.exam.sections && v.exam.sections.ortScores;
      if (s && s[key] && s[key].score != null) pts.push(v.date + ': ' + s[key].score);
    });
    return pts;
  }
  function scCollect(el) {
    var out = {}, any = false;
    var o = readAns(el, 'odi-a', 10), q = readAns(el, 'qd-a', 11), w = readAns(el, 'wo-a', 24);
    var ro = odiScore(o), rq = qdScore(q), rw = woScore(w);
    if (ro) { out.odi = { answers: o, score: ro.score, band: ro.band }; any = true; }
    if (rq) { out.qdash = { answers: q, score: rq.score }; any = true; }
    if (rw) { out.womac = { answers: w, score: rw.score, pain: rw.pain, stiffness: rw.stiffness, function: rw.function, pct: rw.pct }; any = true; }
    return any ? out : null;
  }
  function trendHtml(key, now) {
    var t = scoreTrend(key);
    return t.length ? '<p class="muted ort-trend">📉 السابق: ' + esc(t.slice(-4).join(' ← ')) + (now != null ? ' ← الآن: ' + now : '') + '</p>' : '';
  }
  SP.addSection('orthopedics', {
    id: 'ortScores',
    title: '📊 مقاييس النتائج',
    html: function (v) {
      v = v || {};
      var o = v.odi || {}, q = v.qdash || {}, w = v.womac || {};
      var sum = [v.odi ? 'ODI ' + o.score + '%' : '', v.qdash && q.score != null ? 'QuickDASH ' + q.score : '', v.womac ? 'WOMAC ' + w.score : ''].filter(Boolean).join(' · ');
      return bx('ort-scores', '📊 مقاييس النتائج (Outcome scores)', sum,
        bx('ort-odi', 'Oswestry (ODI) — الظهر', v.odi ? odiTxt(odiScore(o.answers || [])) : '',
          qList('odi-a', ODI_Q, ODI_O, o.answers) + '<p class="sev-out ort-out" data-o="odi"></p><div class="ort-tr" data-t="odi"></div>') +
        bx('ort-qd', 'QuickDASH — الذراع والكتف واليد', v.qdash ? qdTxt(qdScore(q.answers || [])) : '',
          qList('qd-a', QD_Q, QD_O, q.answers) + '<p class="sev-out ort-out" data-o="qd"></p><div class="ort-tr" data-t="qdash"></div>') +
        bx('ort-wo', 'WOMAC — الركبة والحوض', v.womac ? woTxt(woScore(w.answers || [])) : '',
          '<h5 class="ort-h5">الألم (Pain)</h5>' + qList('wo-a', WO_P, WO_O, w.answers, 0) +
          '<h5 class="ort-h5">التيبس (Stiffness)</h5>' + qList('wo-a', WO_S, WO_O, w.answers, 5) +
          '<h5 class="ort-h5">الوظيفة (Physical function) — درجة الصعوبة</h5>' + qList('wo-a', WO_F, WO_O, w.answers, 7) +
          '<p class="sev-out ort-out" data-o="wo"></p><div class="ort-tr" data-t="womac"></div>'));
    },
    wire: function (el) {
      if (el._ortScWired) return; el._ortScWired = true;
      function refresh() {
        var ro = odiScore(readAns(el, 'odi-a', 10)), rq = qdScore(readAns(el, 'qd-a', 11)), rw = woScore(readAns(el, 'wo-a', 24));
        el.querySelector('[data-o="odi"]').textContent = odiTxt(ro) || '—';
        el.querySelector('[data-o="qd"]').textContent = qdTxt(rq) || '—';
        el.querySelector('[data-o="wo"]').textContent = woTxt(rw) || '—';
        el.querySelector('[data-t="odi"]').innerHTML = trendHtml('odi', ro && ro.score);
        el.querySelector('[data-t="qdash"]').innerHTML = trendHtml('qdash', rq && rq.score);
        el.querySelector('[data-t="womac"]').innerHTML = trendHtml('womac', rw && rw.score);
        setSum(el, 'ort-odi', odiTxt(ro)); setSum(el, 'ort-qd', qdTxt(rq)); setSum(el, 'ort-wo', woTxt(rw));
        setSum(el, 'ort-scores', [ro ? 'ODI ' + ro.score + '%' : '', rq && rq.score != null ? 'QuickDASH ' + rq.score : '', rw ? 'WOMAC ' + rw.score : ''].filter(Boolean).join(' · '));
      }
      el.addEventListener('change', refresh);
      refresh();
    },
    collect: scCollect,
    render: function (v) {
      if (!v) return '';
      var rows = [];
      if (v.odi) rows.push(['Oswestry (ODI)', v.odi.score + '% — ' + (v.odi.band || '')]);
      if (v.qdash) rows.push(['QuickDASH', v.qdash.score == null ? 'غير مكتمل' : v.qdash.score + ' / 100']);
      if (v.womac) rows.push(['WOMAC', v.womac.score + ' / 96 (ألم ' + v.womac.pain + ' · تيبس ' + v.womac.stiffness + ' · وظيفة ' + v.womac.function + ')']);
      return rows.length ? SP.tableHtml(['المقياس', 'النتيجة'], rows) : '';
    }
  });

  /* ---------- section order on the doctor page ---------- */
  if (SP.orderSections) SP.orderSections('orthopedics', ['pain', 'ortJoint', 'ortNeuro', 'ortRedflags', 'fracture', 'ortCast', 'ortSurgery', 'imaging', 'ortScores', 'plan', 'files']);

  /* =====================================================================
     Follow-ups: cast removal + suture removal feed the shared ClinicCare list
     ===================================================================== */
  function orthoFollowups(exam) {
    var s = exam && exam.sections, out = [];
    if (!s) return out;
    ((s.ortCast && s.ortCast.items) || []).forEach(function (c, i) {
      if (c.removal) out.push({ key: 'cast' + i, kind: 'cast', date: c.removal, reason: 'فك ' + (c.type ? c.type.split(' (')[0] : 'الجبس') + (c.area ? ' — ' + c.area : '') + (c.side ? ' ' + c.side : '') });
    });
    var sg = s.ortSurgery && s.ortSurgery.surgery;
    if (sg && sg.sutureDate) out.push({ key: 'suture', kind: 'suture', date: sg.sutureDate, reason: 'فك الغرز' + (sg.procedure ? ' — ' + sg.procedure : '') });
    return out;
  }
  function mountCastDue(container, filter) {
    if (!container || !CC) return;
    var t = today();
    var all = CC.listFollowups().filter(function (f) { return f.kind === 'cast' && (!filter || filter(f)); });
    var card = container.closest('section');
    if (card) card.hidden = !all.length;
    var pend = all.filter(function (f) { return f.status === 'pending' && f.date; });
    var groups = [
      ['متأخرة', 'cc-late', pend.filter(function (f) { return f.date < t; })],
      ['اليوم', 'cc-today', pend.filter(function (f) { return f.date === t; })],
      ['هذا الأسبوع', 'cc-week', pend.filter(function (f) { var n = days(t, f.date); return n > 0 && n <= 7; })]
    ];
    var body = groups.map(function (g) {
      var rows = g[2].map(function (f) {
        return '<tr><td>' + esc(f.patientName) + '</td><td>' + esc(f.date) + '</td><td>' + esc(remainTxt(f.date)) + '</td><td>' + esc(f.reason || '') + '</td>' +
          '<td><button type="button" class="btn ghost small" data-cast-done="' + esc(f.id) + '">✔ تم الفك</button></td></tr>';
      }).join('');
      return '<h4 class="cc-fu-h ' + g[1] + '">' + g[0] + ' (' + g[2].length + ')</h4>' +
        (rows ? '<div class="table-wrap"><table><thead><tr><th>المريض</th><th>موعد الفك</th><th>المتبقي</th><th>التثبيت</th><th>إجراء</th></tr></thead><tbody>' + rows + '</tbody></table></div>' : '<p class="muted">لا يوجد.</p>');
    }).join('');
    container.innerHTML = CC.box('ort-castdue', '🩼 مواعيد فك الجبس', 'اليوم: ' + groups[1][2].length + ' · هذا الأسبوع: ' + groups[2][2].length + ' · متأخرة: ' + groups[0][2].length, body, 'cc-fu');
    container.querySelectorAll('[data-cast-done]').forEach(function (b) {
      b.addEventListener('click', function () { CC.setFollowupStatus(b.getAttribute('data-cast-done'), 'done'); });
    });
    if (!container._ortWired) {
      container._ortWired = true;
      var re = function () { mountCastDue(container, filter); };
      document.addEventListener('clinic-followups-changed', re);
      document.addEventListener('cloud-sync-updated', function (e) { if (!e.detail || /followups/.test(e.detail.key || '')) re(); });
    }
  }

  window.ClinicOrtho = {
    orthoFollowups: orthoFollowups, mountCastDue: mountCastDue,
    odiScore: odiScore, qdScore: qdScore, woScore: woScore, steroidWarnings: steroidWarnings
  };
})();
