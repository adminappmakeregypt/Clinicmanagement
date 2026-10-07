// ============ Ophthalmology module (وحدة الرمد والعيون) — v48 structured exam ============
// Uses the existing ClinicSpecialty.addSection architecture. All data is saved inside the
// visit's existing specialty exam object: exam.sections[<id>]. Old v47 fields
// (complaint, iopR, iopL, lens, cornea, exam) and old sections (refraction, files) are kept
// with the same ids/keys, so old records still open, edit and display correctly.

(function () {
  var SP = window.ClinicSpecialty;
  if (!SP) return;
  var esc = SP.escape;
  var EYES = [{ k: 'right', l: 'العين اليمنى (OD)' }, { k: 'left', l: 'العين اليسرى (OS)' }];
  function O(s) { return [''].concat(s.split('|')); }

  /* ---------- generic path helpers ---------- */
  function get(v, path) {
    return path.split('.').reduce(function (o, k) { return o == null ? undefined : o[k]; }, v);
  }
  function put(obj, path, val) {
    var ks = path.split('.'), o = obj;
    for (var i = 0; i < ks.length - 1; i++) { o = o[ks[i]] = o[ks[i]] || {}; }
    o[ks[ks.length - 1]] = val;
  }
  function input(f, path, v) {
    var val = get(v, path); val = val == null ? '' : String(val);
    var a = ' class="oph-f" data-p="' + path + '"';
    if (f.opts) return '<select' + a + '>' + f.opts.map(function (o) {
      return '<option value="' + esc(o) + '"' + (o === val ? ' selected' : '') + '>' + (o ? esc(o) : '—') + '</option>';
    }).join('') + '</select>';
    if (f.area) return '<textarea' + a + ' rows="2" placeholder="' + esc(f.ph || '') + '">' + esc(val) + '</textarea>';
    return '<input' + a + ' value="' + esc(val) + '" placeholder="' + esc(f.ph || '') + '"' + (f.type ? ' type="' + f.type + '"' : '') + ' />';
  }
  function collectInputs(el) {
    var out = {}, any = false;
    el.querySelectorAll('.oph-f').forEach(function (i) {
      var v = (i.value || '').trim();
      if (v) { put(out, i.dataset.p, v); any = true; }
    });
    return any ? out : null;
  }

  /* ---------- section builders ---------- */
  // OD/OS table: each row = structure with choice + note per eye
  function eyeSection(id, title, rows, extra) {
    var labels = {};
    rows.forEach(function (r) { labels[r.k] = r.l; });
    return {
      id: id, title: title,
      html: function (v) {
        v = v || {};
        var h = '<div class="table-wrap"><table class="oph-eye"><thead><tr><th>البند</th>' +
          EYES.map(function (e) { return '<th>' + esc(e.l) + '</th>'; }).join('') + '</tr></thead><tbody>' +
          rows.map(function (r) {
            return '<tr><td><b>' + esc(r.l) + '</b></td>' + EYES.map(function (e) {
              return '<td>' + input(r, e.k + '.' + r.k, v) +
                (r.opts ? input({ ph: 'ملاحظات / أخرى' }, e.k + '.' + r.k + '_note', v) : '') + '</td>';
            }).join('') + '</tr>';
          }).join('') +
          '<tr><td><b>تعليق</b></td>' + EYES.map(function (e) {
            return '<td>' + input({ area: true, ph: 'ملاحظات العين' }, e.k + '.comment', v) + '</td>';
          }).join('') + '</tr></tbody></table></div>';
        return h + (extra ? extra.html(v) : '');
      },
      collect: collectInputs,
      render: function (v) {
        var rs = [];
        rows.concat([{ k: 'comment', l: 'تعليق' }]).forEach(function (r) {
          var cells = EYES.map(function (e) {
            var a = get(v, e.k + '.' + r.k), n = get(v, e.k + '.' + r.k + '_note');
            return [a, n].filter(Boolean).join(' — ');
          });
          if (cells[0] || cells[1]) rs.push([r.l, cells[0] || '-', cells[1] || '-']);
        });
        var h = rs.length ? SP.tableHtml(['البند', 'OD', 'OS'], rs) : '';
        return h + (extra ? extra.render(v) : '');
      }
    };
  }

  // Grouped plain fields. groups: [{t: 'title', p: 'pathPrefix', fields:[...]}]
  function fieldsBlock(groups) {
    return {
      html: function (v) {
        return groups.map(function (g) {
          return (g.t ? '<h5 class="oph-sub">' + esc(g.t) + '</h5>' : '') + '<div class="grid-2 oph-grid">' +
            g.fields.map(function (f) {
              return '<div class="field"' + (f.area || f.wide ? ' style="grid-column:1 / -1;"' : '') + '><label>' +
                esc(f.l) + '</label>' + input(f, g.p + '.' + f.k, v) + '</div>';
            }).join('') + '</div>';
        }).join('');
      },
      render: function (v) {
        var rs = [];
        groups.forEach(function (g) {
          g.fields.forEach(function (f) {
            var x = get(v, g.p + '.' + f.k);
            if (x) rs.push([(g.t ? g.t + ' — ' : '') + f.l, x]);
          });
        });
        return rs.length ? SP.tableHtml(['البند', 'القيمة'], rs) : '';
      }
    };
  }
  function fieldSection(id, title, groups, pre) {
    var b = fieldsBlock(groups);
    return {
      id: id, title: title,
      html: function (v) { v = v || {}; return (pre ? pre.html(v) : '') + b.html(v); },
      collect: collectInputs,
      render: function (v) { return (pre ? pre.render(v) : '') + b.render(v); }
    };
  }

  // Repeating findings rows (diagram replacement): eye / location / finding / description / date
  function rowsSection(id, title, hint, locOpts) {
    var COLS = [
      { k: 'eye', l: 'العين', opts: ['OD', 'OS', 'OU'] },
      { k: 'loc', l: 'الموقع (Location)', opts: locOpts },
      { k: 'finding', l: 'الملاحظة (Finding)', ph: 'Ulcer / Hemorrhage...' },
      { k: 'desc', l: 'الوصف', ph: 'الحجم، العمق...' },
      { k: 'date', l: 'التاريخ', type: 'date' }
    ];
    function rowHtml(r) {
      r = r || {};
      return '<tr class="oph-row">' + COLS.map(function (c) {
        var tmp = {}; tmp[c.k] = r[c.k];
        return '<td>' + input(c, c.k, tmp).replace('class="oph-f"', 'class="oph-rf"') + '</td>';
      }).join('') + '<td><button type="button" class="btn small danger oph-del">🗑</button></td></tr>';
    }
    return {
      id: id, title: title,
      html: function (v) {
        var rows = (v && v.rows) || [];
        return '<p class="muted">' + esc(hint) + '</p><div class="table-wrap"><table class="oph-rows"><thead><tr>' +
          COLS.map(function (c) { return '<th>' + esc(c.l) + '</th>'; }).join('') + '<th></th></tr></thead><tbody>' +
          (rows.length ? rows : [{}]).map(rowHtml).join('') + '</tbody></table></div>' +
          '<button type="button" class="btn small oph-add">➕ إضافة ملاحظة</button>';
      },
      wire: function (el) {
        var tb = el.querySelector('tbody');
        el.querySelector('.oph-add').addEventListener('click', function () { tb.insertAdjacentHTML('beforeend', rowHtml()); });
        tb.addEventListener('click', function (e) {
          var b = e.target.closest('.oph-del'); if (b) b.closest('tr').remove();
        });
      },
      collect: function (el) {
        var rows = [];
        el.querySelectorAll('tr.oph-row').forEach(function (tr) {
          var r = {}, any = false;
          tr.querySelectorAll('.oph-rf').forEach(function (i) {
            var v = (i.value || '').trim();
            if (v) { r[i.dataset.p] = v; if (i.dataset.p !== 'eye') any = true; }
          });
          if (any) rows.push(r);
        });
        return rows.length ? { rows: rows } : null;
      },
      render: function (v) {
        if (!v || !v.rows || !v.rows.length) return '';
        return SP.tableHtml(COLS.map(function (c) { return c.l; }),
          v.rows.map(function (r) { return COLS.map(function (c) { return r[c.k] || '-'; }); }));
      }
    };
  }

  /* ---------- option lists ---------- */
  var OTHER = 'أخرى (Other)';
  var ANTERIOR = [
    { k: 'lids', l: 'الجفون والرموش (Lids / Lashes)', opts: O('Normal|Blepharitis|Meibomian gland dysfunction|Ptosis|Entropion|Ectropion|' + OTHER) },
    { k: 'conj', l: 'الملتحمة (Conjunctiva)', opts: O('Normal|White|Injection|Chemosis|Follicles|Papillae|' + OTHER) },
    { k: 'cornea', l: 'القرنية (Cornea)', opts: O('Clear|Epithelial defect|Ulcer|Edema|Scar|Keratitis|Neovascularization|' + OTHER) },
    { k: 'ac', l: 'الخزانة الأمامية (Anterior Chamber)', opts: O('Deep|Shallow|Cell|Flare|Hypopyon|' + OTHER) },
    { k: 'iris', l: 'القزحية (Iris)', opts: O('Normal|Atrophy|Synechiae|Irregular pupil|' + OTHER) },
    { k: 'lens', l: 'العدسة (Lens)', opts: O('Clear|Cataract|Nuclear sclerosis|Cortical|Posterior subcapsular|Aphakia|PCIOL|' + OTHER) }
  ];
  var POSTERIOR = [
    { k: 'disc', l: 'العصب البصري (Optic Disc)', opts: O('Normal|Pallor|Edema|Cupping|' + OTHER) },
    { k: 'cd', l: 'نسبة C/D', ph: '0.3' },
    { k: 'macula', l: 'الماكيولا (Macula)', opts: O('Normal|Edema|Hemorrhage|Exudates|Drusen|Scar|' + OTHER) },
    { k: 'vessels', l: 'الأوعية (Retinal Vessels)', opts: O('Normal|Attenuation|Tortuosity|Hemorrhage|' + OTHER) },
    { k: 'periphery', l: 'الشبكية الطرفية (Peripheral Retina)', opts: O('Normal|Break|Hole|Detachment|Degeneration|Lattice|' + OTHER) },
    { k: 'vitreous', l: 'الجسم الزجاجي (Vitreous)', opts: O('Clear|PVD|Hemorrhage|Cells|' + OTHER) }
  ];
  var MOTILITY = ['abduction|التبعيد (Abduction)', 'adduction|التقريب (Adduction)', 'elevation|الرفع (Elevation)', 'depression|الخفض (Depression)']
    .map(function (s) { var p = s.split('|'); return { k: p[0], l: p[1], opts: O('Full|Limited|Overaction|Underaction|Restriction|Pain|' + OTHER) }; });

  /* ---------- 2. Visual acuity & refraction (old id "refraction", old keys kept) ---------- */
  var RCOLS = [
    { k: 'va', l: 'VA (قديم/عام)', ph: '6/6' },
    { k: 'ucva', l: 'Unaided VA', ph: '6/12' },
    { k: 'ph', l: 'Pin-hole', ph: '6/9' },
    { k: 'bcva', l: 'BCVA', ph: '6/6' },
    { k: 'near', l: 'Near VA', ph: 'N5' },
    { k: 'sph', l: 'Sph', ph: '-1.25' },
    { k: 'cyl', l: 'Cyl', ph: '-0.50' },
    { k: 'axis', l: 'Axis', ph: '180' },
    { k: 'add', l: 'Add', ph: '+2.00' },
    { k: 'pd', l: 'PD', ph: '31' }
  ];
  var refraction = {
    id: 'refraction',
    title: '👓 حدة الإبصار والانكسار (Visual Acuity & Refraction)',
    html: function (v) {
      v = v || {};
      return '<div class="table-wrap"><table class="rfx"><thead><tr><th>العين</th>' +
        RCOLS.map(function (c) { return '<th>' + esc(c.l) + '</th>'; }).join('') + '</tr></thead><tbody>' +
        EYES.map(function (e) {
          return '<tr data-eye="' + e.k + '"><td>' + esc(e.l) + '</td>' + RCOLS.map(function (c) {
            var val = (v[e.k] && v[e.k][c.k]) || '';
            return '<td><input class="rfx-f" data-k="' + c.k + '" value="' + esc(val) + '" placeholder="' + esc(c.ph) + '" /></td>';
          }).join('') + '</tr>';
        }).join('') + '</tbody></table></div>';
    },
    collect: function (el) {
      var out = {};
      el.querySelectorAll('tr[data-eye]').forEach(function (tr) {
        var row = {};
        tr.querySelectorAll('.rfx-f').forEach(function (i) { var v = (i.value || '').trim(); if (v) row[i.dataset.k] = v; });
        if (Object.keys(row).length) out[tr.dataset.eye] = row;
      });
      return Object.keys(out).length ? out : null;
    },
    render: function (v) {
      var used = RCOLS.filter(function (c) { return EYES.some(function (e) { return v[e.k] && v[e.k][c.k]; }); });
      var rows = EYES.filter(function (e) { return v[e.k]; }).map(function (e) {
        return [e.l].concat(used.map(function (c) { return v[e.k][c.k] || '-'; }));
      });
      if (!rows.length) return '';
      return SP.tableHtml(['العين'].concat(used.map(function (c) { return c.l; })), rows);
    }
  };

  /* ---------- 9-gaze grid ---------- */
  var GAZE = [['ur', '↖ أعلى يمين (Up-right)'], ['up', '↑ أعلى (Up)'], ['ul', '↗ أعلى يسار (Up-left)'],
              ['r', '← يمين (Right)'], ['pp', '● الوضع الأساسي (Primary)'], ['l', '→ يسار (Left)'],
              ['dr', '↙ أسفل يمين (Down-right)'], ['down', '↓ أسفل (Down)'], ['dl', '↘ أسفل يسار (Down-left)']];
  var gazeBlock = {
    html: function (v) {
      return '<h5 class="oph-sub">فحص الاتجاهات التسعة (9 Gaze Positions)</h5><div class="oph-gaze">' +
        GAZE.map(function (g) {
          return '<div class="oph-gaze-cell"><label>' + esc(g[1]) + '</label>' + input({ ph: 'Normal / -2 / +1...' }, 'gaze.' + g[0], v) + '</div>';
        }).join('') + '</div>';
    },
    render: function (v) {
      var rs = GAZE.filter(function (g) { return get(v, 'gaze.' + g[0]); }).map(function (g) { return [g[1], get(v, 'gaze.' + g[0])]; });
      return rs.length ? SP.tableHtml(['الاتجاه', 'الملاحظة'], rs) : '';
    }
  };
  function devFields() {
    return [
      { k: 'method', l: 'الطريقة (Method)', opts: O('Cover test|Prism cover test|Hirschberg|Krimsky|' + OTHER) },
      { k: 'type', l: 'نوع الانحراف', opts: O('Orthophoria|ET|XT|RHT|LHT|' + OTHER) },
      { k: 'angle', l: 'الزاوية (Angle)', ph: '15°' },
      { k: 'pd', l: 'Prism diopters (PD)', ph: '30' }
    ];
  }
  function coverFields() {
    return [
      { k: 'result', l: 'النتيجة', opts: O('Orthophoria|Phoria|Tropia|Alternating|' + OTHER) },
      { k: 'side', l: 'الجهة', opts: O('Right|Left|Alternating') },
      { k: 'comment', l: 'تعليق', ph: '' }
    ];
  }
  function prismFields() {
    return [
      { k: 'amount', l: 'قوة المنشور (Prism)', ph: '20 PD' },
      { k: 'base', l: 'القاعدة (Base)', opts: O('IN|OUT|UP|DOWN') },
      { k: 'eye', l: 'العين', opts: O('OD|OS|Both') },
      { k: 'notes', l: 'ملاحظات', ph: '' }
    ];
  }

  /* ---------- IOP ---------- */
  var iopFields = function (p) {
    return [
      { k: p + 'Value', l: 'القيمة', ph: '15' },
      { k: p + 'Unit', l: 'الوحدة', opts: O('mmHg') },
      { k: p + 'Method', l: 'الطريقة (Method)', opts: O('Goldmann|Tonopen|Non-contact|' + OTHER) },
      { k: p + 'Time', l: 'وقت القياس', type: 'time' }
    ];
  };

  /* ---------- investigations ---------- */
  var INV = [['octMacula', 'OCT Macula'], ['octRnfl', 'OCT RNFL / Optic Nerve'], ['fundus', 'Fundus Photography'],
             ['vf', 'Visual Fields'], ['topo', 'Corneal Topography'], ['bscan', 'B-scan'],
             ['asOct', 'Anterior Segment OCT'], ['hess', 'Hess Chart']];

  /* ---------- attachments with optional classification (old id "files" kept) ---------- */
  var CATS = O('Anterior Segment|OCT|Fundus Photo|Visual Field|Corneal Topography|B-scan|Retinal Drawing|Hess Chart|' + OTHER);
  var baseFiles = SP.filesSection({
    id: 'files',
    title: '📎 المرفقات وصور العين (Attachments)',
    hint: 'اختر نوع الملف (اختياري) ثم ارفع: OCT، صور قاع العين، مجال الرؤية...',
    folder: 'ophthalmology'
  });
  var files = {
    id: 'files', title: baseFiles.title,
    html: function (v) {
      return '<div class="field"><label>نوع المرفق القادم (اختياري)</label><select class="oph-cat">' +
        CATS.map(function (c) { return '<option value="' + esc(c) + '">' + (c ? esc(c) : '—') + '</option>'; }).join('') +
        '</select></div>' + baseFiles.html(v);
    },
    wire: function (el) {
      baseFiles.wire(el);
      var cat = el.querySelector('.oph-cat'), list = el.querySelector('.sp-file-list');
      function decorate() {
        (el._files || []).forEach(function (f) { if (f && !('category' in f)) f.category = cat.value || ''; });
        list.querySelectorAll('.sp-file-row').forEach(function (row, i) {
          var f = el._files[i];
          if (!f || row.querySelector('.oph-tag')) return;
          row.insertAdjacentHTML('afterbegin', f.category ? '<span class="oph-tag">' + esc(f.category) + '</span>' : '');
        });
      }
      // tag only newly uploaded files: mark existing ones first
      (el._files || []).forEach(function (f) { if (f && !('category' in f)) f.category = f.category || ''; });
      new MutationObserver(decorate).observe(list, { childList: true });
      decorate();
    },
    collect: baseFiles.collect,
    render: function (v) {
      if (!v || !v.length) return '';
      return '<ul class="sp-files-view">' + v.map(function (f) {
        return '<li>' + (f.category ? '<b>' + esc(f.category) + ':</b> ' : '') +
          '<a href="' + esc(f.url) + '" target="_blank" rel="noopener">' + esc(f.name) + '</a></li>';
      }).join('') + '</ul>';
    }
  };

  /* ---------- register sections (order = display order) ---------- */
  var S = 'ophthalmology';
  SP.addSection(S, eyeSection('anteriorSegment', '👁️ الفحص الأمامي (Anterior Segment Examination)', ANTERIOR));
  SP.addSection(S, refraction);
  SP.addSection(S, fieldSection('iop', '🎯 ضغط العين (IOP)', [
    { t: 'العين اليمنى (OD)', p: 'right', fields: iopFields('') },
    { t: 'العين اليسرى (OS)', p: 'left', fields: iopFields('') }
  ]));
  SP.addSection(S, fieldSection('cornea', '🔵 فحص القرنية (Corneal Examination)', [
    { t: 'الصبغة (Staining)', p: 'staining', fields: [
      { k: 'fluorescein', l: 'Fluorescein', ph: 'OD: / OS:' },
      { k: 'lissamine', l: 'Lissamine green', ph: 'OD: / OS:' }] },
    { t: 'TBUT (ثانية)', p: 'tbut', fields: [{ k: 'right', l: 'يمين (OD)', ph: '10' }, { k: 'left', l: 'يسار (OS)', ph: '8' }] },
    { t: 'قرحة القرنية (Corneal Ulcer)', p: 'ulcer', fields: [
      { k: 'present', l: 'الحالة', opts: O('Absent|Present') },
      { k: 'eye', l: 'العين', opts: O('OD|OS|OU') },
      { k: 'location', l: 'الموقع (Location)', opts: O('Central|Paracentral|Peripheral|Superior|Inferior|Nasal|Temporal') },
      { k: 'size', l: 'الحجم (Size mm)', ph: '2x3' },
      { k: 'depth', l: 'العمق (Depth)', opts: O('Superficial|Mid-stromal|Deep|Descemetocele|Perforated') },
      { k: 'edge', l: 'الحافة (Edge)', opts: O('Regular|Irregular|Feathery|Satellite lesions') },
      { k: 'infiltrate', l: 'Infiltrate', opts: O('None|Mild|Moderate|Dense') },
      { k: 'hypopyon', l: 'Hypopyon', opts: O('Absent|Present') },
      { k: 'seidel', l: 'Seidel test', opts: O('Negative|Positive') },
      { k: 'comment', l: 'تعليق', area: true }] }
  ]));
  SP.addSection(S, rowsSection('cornealDiagram', '✏️ خريطة القرنية (Corneal Findings Map)',
    'سجّل كل ملاحظة: العين، موقعها على القرنية، والملاحظة. ويمكن إرفاق صورة رسم من قسم المرفقات.',
    O('Central|Superior|Inferior|Nasal|Temporal|Superonasal|Superotemporal|Inferonasal|Inferotemporal|Limbus')));
  SP.addSection(S, fieldSection('strabismus', '👀 فحص الحول (Strabismus / Squint)', [
    { t: 'الانحراف — بعيد (Distance)', p: 'dist', fields: devFields() },
    { t: 'الانحراف — قريب (Near)', p: 'near', fields: devFields() },
    { t: 'Cover test — بعيد', p: 'coverDist', fields: coverFields() },
    { t: 'Cover test — قريب', p: 'coverNear', fields: coverFields() },
    { t: 'Prism cover test — بعيد', p: 'prismDist', fields: prismFields() },
    { t: 'Prism cover test — قريب', p: 'prismNear', fields: prismFields() }
  ], gazeBlock));
  SP.addSection(S, eyeSection('ocularMotility', '↔️ حركة العين (Ocular Motility)', MOTILITY));
  SP.addSection(S, fieldSection('binocularFunction', '🧠 الرؤية الثنائية (Binocular Function)', [
    { t: 'Stereopsis', p: 'stereo', fields: [
      { k: 'result', l: 'النتيجة', opts: O('Normal|Reduced|None') },
      { k: 'test', l: 'الاختبار', opts: O('Titmus|TNO|Lang|Randot|' + OTHER) },
      { k: 'value', l: 'القيمة', ph: '40' }, { k: 'unit', l: 'الوحدة', opts: O('arc sec') }] },
    { t: 'Worth 4 Dot', p: 'w4d', fields: [{ k: 'result', l: 'النتيجة', opts: O('Normal|Diplopia|Suppression|' + OTHER) }] },
    { t: 'Fusion', p: 'fusion', fields: [{ k: 'result', l: 'النتيجة', opts: O('Normal|Reduced|None') }] },
    { t: 'ازدواج الرؤية (Diplopia)', p: 'diplopia', fields: [
      { k: 'present', l: 'الحالة', opts: O('Absent|Present') },
      { k: 'at', l: 'المسافة', opts: O('Distance|Near|Both') },
      { k: 'direction', l: 'الاتجاه', opts: O('Horizontal|Vertical|Oblique|Torsional|' + OTHER) },
      { k: 'notes', l: 'ملاحظات', ph: '' }] }
  ]));
  SP.addSection(S, fieldSection('headPosture', '🧍 وضع الرأس والرأرأة (Head Posture / Nystagmus)', [
    { t: 'وضع الرأس (Head Posture)', p: 'head', fields: [
      { k: 'posture', l: 'الوضع', opts: O('Normal|Face turn right|Face turn left|Chin up|Chin down|Head tilt right|Head tilt left') },
      { k: 'notes', l: 'ملاحظات', ph: '' }] },
    { t: 'الرأرأة (Nystagmus)', p: 'nystagmus', fields: [
      { k: 'present', l: 'الحالة', opts: O('Absent|Present') },
      { k: 'type', l: 'النوع', opts: O('Horizontal|Vertical|Torsional|Pendular|Jerk|' + OTHER) }] },
    { t: 'Ocular torticollis', p: 'torticollis', fields: [
      { k: 'present', l: 'الحالة', opts: O('Absent|Present') },
      { k: 'comment', l: 'تعليق', area: true }] }
  ]));
  SP.addSection(S, eyeSection('posteriorSegment', '🔴 فحص قاع العين والشبكية (Posterior Segment / Retina)', POSTERIOR));
  SP.addSection(S, rowsSection('retinalDrawing', '🩻 رسم ونتائج الشبكية (Retinal Drawing / Findings)',
    'سجّل كل ملاحظة على الشبكية. ولإرفاق رسم أو صورة اختر «Retinal Drawing» في قسم المرفقات.',
    O('Macula|Optic disc|Superior arcade|Inferior arcade|Superotemporal|Superonasal|Inferotemporal|Inferonasal|Periphery|Ora serrata')));
  SP.addSection(S, fieldSection('investigations', '📊 فحوصات وأشعة العين (Investigations & Imaging)', INV.map(function (x) {
    return { t: x[1], p: x[0], fields: [
      { k: 'od', l: 'OD', ph: '' }, { k: 'os', l: 'OS', ph: '' }, { k: 'findings', l: 'النتيجة (Findings)', area: true }] };
  })));
  SP.addSection(S, files);
  SP.addSection(S, fieldSection('comments', '📝 الانطباع والخطة (Impression / Plan)', [
    { t: '', p: 'imp', fields: [
      { k: 'impression', l: 'الانطباع الإكلينيكي (Clinical impression)', area: true },
      { k: 'summary', l: 'ملخص النتائج (Findings summary)', area: true },
      { k: 'plan', l: 'الخطة والتوصيات (Plan / Recommendations)', area: true }] }
  ]));
  // Diagnosis stays in the visit's main «التشخيص» field (not duplicated here).

  /* ---------- collapsible sections (only inside the ophthalmology form) ---------- */
  document.addEventListener('click', function (e) {
    var t = e.target.closest && e.target.closest('.sp-section-title');
    if (!t) return;
    var sec = t.parentNode;
    if (!sec.closest('[data-oph]') && !sec.querySelector('.oph-f,.rfx-f,.oph-rows,.oph-cat')) return;
    sec.classList.toggle('oph-collapsed');
  });
})();
