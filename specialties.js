// ============ Specialty Module Layer (طبقة التخصصات) ============
// The clinic picks ONE specialty in لوحة المدير. Everything clinical that the
// doctor sees (exam fields + extra specialty sections) follows that choice.
//
// Storage (unchanged architecture):
//   - active specialty  -> localStorage clinicKey('clinic_specialty_v1')
//                          (mirrored to Firebase by cloud-sync.js, same appData pattern)
//   - booking specialty list (clinic_majors_v1) is now DERIVED from the chosen
//     specialty, so the old "إدارة التخصصات" screen is no longer needed.
//   - exam data is saved INSIDE the prescription document as an `exam` object.
//
// window.ClinicSpecialty API:
//   list() / current() / currentId() / set(id)
//   addSection(specialtyId, section)   <- used by dental.js, ophthalmology.js, ...
//   filesSection(opts)                 <- ready-made attachments section
//   formHtml(values) / wire(root) / collect(root)
//   summaryRows(exam) / detailHtml(exam)

(function () {
  var ck = window.clinicKey || function (n) { return n; };
  var KEY = ck('clinic_specialty_v1');
  var MAJORS_KEY = ck('clinic_majors_v1');

  var SPECIALTIES = [
    {
      id: 'general', label: 'طب عام', icon: '🩺', services: ['طب عام'],
      fields: [
        { k: 'bp',       l: 'ضغط الدم',           ph: '120/80' },
        { k: 'pulse',    l: 'النبض (ن/د)',        ph: '78' },
        { k: 'temp',     l: 'الحرارة (°م)',       ph: '37' },
        { k: 'weight',   l: 'الوزن (كجم)',        ph: '70' },
        { k: 'height',   l: 'الطول (سم)',         ph: '170' },
        { k: 'complaint',l: 'الشكوى الرئيسية',    ph: 'صداع منذ 3 أيام', wide: true },
        { k: 'exam',     l: 'الفحص الإكلينيكي',   ph: 'القلب والصدر طبيعي...', area: true }
      ],
      sections: []
    },
    {
      id: 'dental', label: 'أسنان', icon: '🦷', services: ['أسنان'],
      fields: [
        { k: 'chief',     l: 'الشكوى الأساسية',        ph: 'ألم في الضرس العلوي', wide: true },
        { k: 'hygiene',   l: 'نظافة الفم',             opts: ['', 'ممتازة', 'جيدة', 'متوسطة', 'ضعيفة'] },
        { k: 'gums',      l: 'حالة اللثة',             opts: ['', 'سليمة', 'التهاب خفيف', 'التهاب متوسط', 'التهاب شديد', 'نزيف'] },
        { k: 'plaque',    l: 'الترسبات (Plaque)',      opts: ['', 'لا يوجد', 'خفيف', 'متوسط', 'كثيف'] },
        { k: 'calculus',  l: 'الجير (Calculus)',       opts: ['', 'لا يوجد', 'خفيف', 'متوسط', 'كثيف'] },
        { k: 'mobility',  l: 'حركة الأسنان',           opts: ['', 'لا يوجد', 'درجة 1', 'درجة 2', 'درجة 3'] },
        { k: 'occlusion', l: 'الإطباق (Occlusion)',    opts: ['', 'طبيعي', 'Class I', 'Class II', 'Class III', 'تزاحم', 'فراغات'] },
        { k: 'notes',     l: 'ملاحظات عامة',           ph: 'ألم عند الطرق...', area: true }
      ],
      sections: []
    },
    {
      id: 'ophthalmology', label: 'رمد وعيون', icon: '👁️', services: ['رمد وعيون'],
      fields: [
        { k: 'complaint',l: 'الشكوى الرئيسية',    ph: 'زغللة في الرؤية', wide: true },
        { k: 'iopR',     l: 'ضغط العين - يمين',   ph: '15' },
        { k: 'iopL',     l: 'ضغط العين - يسار',   ph: '16' },
        { k: 'lens',     l: 'العدسة',             opts: ['', 'صافية', 'مياه بيضاء مبكرة', 'مياه بيضاء ناضجة', 'عدسة صناعية'] },
        { k: 'cornea',   l: 'القرنية',            opts: ['', 'صافية', 'التهاب', 'قرحة', 'ندبة'] },
        { k: 'exam',     l: 'فحص قاع العين',      ph: 'الشبكية والعصب البصري...', area: true }
      ],
      sections: []
    },
    {
      id: 'pediatrics', label: 'أطفال', icon: '🧒', services: ['أطفال'],
      fields: [
        { k: 'ageMonths',l: 'العمر (شهور)',        ph: '18' },
        { k: 'weight',   l: 'الوزن (كجم)',         ph: '11' },
        { k: 'height',   l: 'الطول (سم)',          ph: '80' },
        { k: 'head',     l: 'محيط الرأس (سم)',     ph: '47' },
        { k: 'temp',     l: 'الحرارة (°م)',        ph: '37.5' },
        { k: 'feeding',  l: 'التغذية',             opts: ['', 'رضاعة طبيعية', 'صناعية', 'مختلطة', 'طعام عادي'] },
        { k: 'develop',  l: 'النمو والتطور',       opts: ['', 'طبيعي', 'تأخر بسيط', 'تأخر واضح'] },
        { k: 'exam',     l: 'الفحص الإكلينيكي',    ph: 'نشيط، صدر سليم...', area: true }
      ],
      sections: []
    },
    {
      id: 'dermatology', label: 'جلدية', icon: '🧴', services: ['جلدية'],
      fields: [
        { k: 'complaint',l: 'الشكوى الرئيسية',     ph: 'طفح جلدي منذ أسبوع', wide: true },
        { k: 'duration', l: 'مدة الشكوى',          ph: 'أسبوعان' },
        { k: 'itching',  l: 'الحكة',               opts: ['', 'لا يوجد', 'خفيفة', 'متوسطة', 'شديدة'] },
        { k: 'spread',   l: 'الانتشار',            opts: ['', 'موضعي', 'منتشر'] },
        { k: 'skinType', l: 'نوع البشرة',          opts: ['', 'عادية', 'دهنية', 'جافة', 'مختلطة', 'حساسة'] },
        { k: 'exam',     l: 'وصف الفحص',           ph: 'طفح حمامي متقشر...', area: true }
      ],
      sections: []
    },
    {
      id: 'orthopedics', label: 'عظام', icon: '🦴', services: ['عظام'],
      fields: [
        { k: 'complaint', l: 'الشكوى الرئيسية',        ph: 'ألم في الركبة اليمنى', wide: true },
        { k: 'duration',  l: 'مدة الألم',              ph: '3 أسابيع' },
        { k: 'severity',  l: 'شدة الألم (0-10)',       opts: ['', '0', '1', '2', '3', '4', '5', '6', '7', '8', '9', '10'] },
        { k: 'character', l: 'صفة الألم',              ph: 'ألم مستمر يزداد ليلاً' },
        { k: 'extra',     l: 'أعراض مصاحبة',           ph: 'تنميل، تيبس صباحي' },
        { k: 'swelling',  l: 'التورم',                 opts: ['', 'لا يوجد', 'خفيف', 'متوسط', 'شديد'] },
        { k: 'tender',    l: 'الإيلام عند اللمس',      opts: ['', 'لا يوجد', 'خفيف', 'متوسط', 'شديد'] },
        { k: 'redness',   l: 'الاحمرار / السخونة',     opts: ['', 'لا يوجد', 'يوجد'] },
        { k: 'deformity', l: 'التشوه',                 opts: ['', 'لا يوجد', 'يوجد'] },
        { k: 'rom',       l: 'مدى الحركة (ROM)',       ph: 'كامل / محدود 30°' },
        { k: 'power',     l: 'قوة العضلات',            opts: ['', '5/5', '4/5', '3/5', '2/5', '1/5', '0/5'] },
        { k: 'sensory',   l: 'الفحص الحسي والأعصاب',   ph: 'الإحساس والردود طبيعية' },
        { k: 'exam',      l: 'ملاحظات الفحص الأخرى',   ph: 'المشية، الاستقرار...', area: true }
      ],
      sections: []
    }
  ];

  function esc(s) {
    return (s == null ? '' : String(s)).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  function list() {
    return SPECIALTIES.map(function (s) { return { id: s.id, label: s.label, icon: s.icon }; });
  }
  function byId(id) {
    for (var i = 0; i < SPECIALTIES.length; i++) if (SPECIALTIES[i].id === id) return SPECIALTIES[i];
    return SPECIALTIES[0];
  }
  function currentId() {
    try { return byId(localStorage.getItem(KEY) || 'general').id; } catch (e) { return 'general'; }
  }
  function current() { return byId(currentId()); }

  // booking list (clinic_majors_v1) always follows the clinic specialty
  function syncMajors() {
    try {
      var want = JSON.stringify(current().services || [current().label]);
      if (localStorage.getItem(MAJORS_KEY) !== want) localStorage.setItem(MAJORS_KEY, want);
    } catch (e) {}
  }

  function set(id) {
    try { localStorage.setItem(KEY, byId(id).id); } catch (e) {}
    syncMajors();
  }

  // v38: register a new specialty (used by specialties-extra.js)
  function addSpecialty(spec) {
    if (!spec || !spec.id) return;
    for (var i = 0; i < SPECIALTIES.length; i++) if (SPECIALTIES[i].id === spec.id) return;
    spec.sections = spec.sections || [];
    SPECIALTIES.push(spec);
  }
  function has(id) {
    for (var i = 0; i < SPECIALTIES.length; i++) if (SPECIALTIES[i].id === id) return true;
    return false;
  }
  // v38: specialties assigned to a doctor (clinic_doctors_v1 → specialtyIds).
  // Falls back to matching the old free-text specialty, then the clinic default.
  function doctorIds(name) {
    var out = [];
    try {
      var docs = JSON.parse(localStorage.getItem(ck('clinic_doctors_v1')) || '[]');
      var norm = function (v) { return (v || '').toString().trim().replace(/\s+/g, ' ').toLowerCase(); };
      var n = norm(name);
      var d = n && docs.find(function (x) { return x && norm(x.name) === n; });
      if (!d && n) d = docs.find(function (x) { return x && x.email && (norm(x.email) === n || norm(x.email).split('@')[0] === n); });
      if (!d) {
        var em = '';
        try { em = norm(window.firebase && firebase.auth && firebase.auth().currentUser && firebase.auth().currentUser.email); } catch (e2) {}
        if (!em && window.currentUserProfile) em = norm(window.currentUserProfile.email);
        if (em) d = docs.find(function (x) { return x && norm(x.email) === em; });
      }
      if (d) {
        (d.specialtyIds || []).forEach(function (id) { if (has(id) && out.indexOf(id) < 0) out.push(id); });
        if (!out.length && d.specialty) {
          matchText(d.specialty).forEach(function (id) { if (out.indexOf(id) < 0) out.push(id); });
        }
      }
    } catch (e) {}
    return out;
  }
  // v46: يطابق التخصص المكتوب نصاً (باطنه / طب الأطفال / Dentist ...) بالتخصصات المعروفة
  var SP_WORDS = {
    general: ['عام', 'general', 'gp', 'family', 'اسره'],
    dental: ['اسنان', 'سنان', 'dental', 'dentist', 'dentistry', 'teeth'],
    ophthalmology: ['رمد', 'عيون', 'عين', 'eye', 'ophthal'],
    pediatrics: ['اطفال', 'طفل', 'pediatric', 'paediatric', 'child', 'kids'],
    dermatology: ['جلديه', 'جلد', 'derma', 'skin'],
    orthopedics: ['عظام', 'ortho', 'bone'],
    obgyn: ['نساء', 'توليد', 'gyn', 'obstet', 'women'],
    ent: ['انف', 'اذن', 'حنجره', 'ent', 'ear', 'nose', 'throat'],
    aesthetic: ['تجميل', 'aesthetic', 'cosmetic', 'plastic', 'beauty'],
    gastro: ['هضمي', 'جهاز هضمي', 'gastro', 'digest'],
    internal: ['باطنه', 'باطني', 'internal', 'internist']
  };
  function arNorm(v) {
    return (v || '').toString().toLowerCase()
      .replace(/[\u064B-\u0652\u0640]/g, '')
      .replace(/[أإآ]/g, 'ا').replace(/ة/g, 'ه').replace(/ى/g, 'ي')
      .replace(/\s+/g, ' ').trim();
  }
  function matchText(txt) {
    var t = arNorm(txt), out = [];
    if (!t) return out;
    var bare = t.replace(/(^|\s)(طب|ال|و)(?=\S)/g, '$1').replace(/(^|\s)ال/g, '$1');
    SPECIALTIES.forEach(function (s) {
      if (arNorm(s.label) === t || s.id === t) out.push(s.id);
    });
    if (out.length) return out;
    var words = t.split(/[\s,،\/\-و]+/).map(function (w) { return w.replace(/^ال/, ''); }).filter(Boolean);
    SPECIALTIES.forEach(function (s) {
      var keys = (SP_WORDS[s.id] || []).concat([arNorm(s.label).replace(/^ال/, '')]);
      var hit = keys.some(function (k) {
        k = arNorm(k);
        if (!k) return false;
        if (k.length <= 3) return words.indexOf(k) >= 0 || words.some(function (w) { return w.indexOf(k) === 0 && /[a-z]/.test(k); });
        return t.indexOf(k) >= 0 || bare.indexOf(k) >= 0 || words.some(function (w) { return w.indexOf(k) >= 0 || (w.length > 3 && k.indexOf(w) >= 0); });
      });
      if (hit && out.indexOf(s.id) < 0) out.push(s.id);
    });
    // "طب عام" فقط لو مفيش تخصص تاني اتطابق
    if (out.length > 1) out = out.filter(function (id) { return id !== 'general'; });
    return out;
  }
  function forDoctor(name) { return doctorIds(name)[0] || currentId(); }

  function addSection(specialtyId, section) {
    var s = byId(specialtyId);
    if (!s || !section || !section.id) return;
    for (var i = 0; i < s.sections.length; i++) {
      if (s.sections[i].id === section.id) { s.sections[i] = section; return; }
    }
    s.sections.push(section);
  }

  /* ---------- plain fields ---------- */
  function fieldHtml(f, v) {
    var val = esc(v == null ? '' : v), input;
    if (f.opts) {
      input = '<select class="sp-f" data-k="' + f.k + '">' + f.opts.map(function (o) {
        return '<option value="' + esc(o) + '"' + (o === v ? ' selected' : '') + '>' + (o ? esc(o) : '—') + '</option>';
      }).join('') + '</select>';
    } else if (f.area) {
      input = '<textarea class="sp-f" data-k="' + f.k + '" rows="2" placeholder="' + esc(f.ph || '') + '">' + val + '</textarea>';
    } else {
      input = '<input class="sp-f" data-k="' + f.k + '" value="' + val + '" placeholder="' + esc(f.ph || '') + '" />';
    }
    var style = (f.area || f.wide) ? ' style="grid-column:1 / -1;"' : '';
    return '<div class="field"' + style + '><label>' + esc(f.l) + '</label>' + input + '</div>';
  }

  function formHtml(values, specialtyId) {
    values = values || {};
    var s = specialtyId ? byId(specialtyId) : current();
    var secVals = values.sections || {};
    var html = '<div class="grid-2 sp-form" data-specialty="' + s.id + '">' +
      s.fields.map(function (f) { return fieldHtml(f, (values.fields || values)[f.k]); }).join('') +
      '</div>';
    html += s.sections.map(function (sec) {
      return '<div class="sp-section" data-sid="' + sec.id + '">' +
        '<h4 class="sp-section-title">' + esc(sec.title) + '</h4>' +
        sec.html(secVals[sec.id]) + '</div>';
    }).join('');
    return html;
  }

  function wire(root, specialtyId) {
    root = root || document;
    (specialtyId ? byId(specialtyId) : current()).sections.forEach(function (sec) {
      var el = root.querySelector('.sp-section[data-sid="' + sec.id + '"]');
      if (el && typeof sec.wire === 'function') { try { sec.wire(el); } catch (e) { console.warn(e); } }
    });
  }

  function collect(root, specialtyId) {
    root = root || document;
    var s = specialtyId ? byId(specialtyId) : current(), out = {}, sections = {}, any = false;
    var box = root.querySelector('.sp-form');
    if (box) {
      box.querySelectorAll('.sp-f').forEach(function (el) {
        var v = (el.value || '').trim();
        if (v) { out[el.dataset.k] = v; any = true; }
      });
    }
    s.sections.forEach(function (sec) {
      var el = root.querySelector('.sp-section[data-sid="' + sec.id + '"]');
      if (!el || typeof sec.collect !== 'function') return;
      var v = null;
      try { v = sec.collect(el); } catch (e) { console.warn(e); }
      if (v && (!Array.isArray(v) ? Object.keys(v).length : v.length)) { sections[sec.id] = v; any = true; }
    });
    if (!any) return null;
    return { specialty: s.id, label: s.label, fields: out, sections: sections };
  }

  function summaryRows(exam) {
    if (!exam || !exam.fields) return [];
    var s = byId(exam.specialty);
    return s.fields
      .filter(function (f) { return exam.fields[f.k]; })
      .map(function (f) { return [f.l, exam.fields[f.k]]; });
  }

  // HTML blocks for the extra sections — used in the view modal AND in the PDF
  function detailHtml(exam) {
    if (!exam || !exam.sections) return '';
    var s = byId(exam.specialty);
    return s.sections.map(function (sec) {
      var v = exam.sections[sec.id];
      if (!v || typeof sec.render !== 'function') return '';
      var h = sec.render(v);
      return h ? '<h3 class="sp-detail-title">' + esc(sec.title) + '</h3>' + h : '';
    }).join('');
  }

  /* ---------- shared: attachments section (Firebase Storage) ---------- */
  function filesSection(opts) {
    opts = opts || {};
    return {
      id: opts.id || 'files',
      title: opts.title || '📎 المرفقات',
      html: function (v) {
        var saved = '';
        try { saved = v && v.length ? esc(JSON.stringify(v)) : ''; } catch (e) {}
        return '<p class="muted">' + esc(opts.hint || 'أرفق صور أو أشعة (JPG / PNG / PDF).') + '</p>' +
          '<input type="file" class="sp-file-input" multiple accept="image/*,application/pdf" />' +
          '<div class="sp-file-list" data-saved="' + saved + '"></div>';
      },
      wire: function (el) {
        var input = el.querySelector('.sp-file-input');
        var listEl = el.querySelector('.sp-file-list');
        el._files = [];
        try {
          var s = listEl.getAttribute('data-saved');
          if (s) el._files = JSON.parse(s) || [];
        } catch (e) {}
        function render() {
          listEl.innerHTML = el._files.map(function (f, i) {
            return '<div class="sp-file-row"><a href="' + esc(f.url) + '" target="_blank" rel="noopener">' +
              esc(f.name) + '</a><button type="button" class="btn small danger" data-fi="' + i + '">🗑</button></div>';
          }).join('');
          listEl.querySelectorAll('button[data-fi]').forEach(function (b) {
            b.addEventListener('click', function () { el._files.splice(Number(b.dataset.fi), 1); render(); });
          });
        }
        var statusEl = document.createElement('p');
        statusEl.className = 'sp-uploading muted';
        statusEl.style.display = 'none';
        listEl.parentNode.insertBefore(statusEl, listEl);
        function status(t, err) {
          statusEl.style.display = t ? '' : 'none';
          statusEl.textContent = t || '';
          statusEl.style.color = err ? '#c0392b' : '';
        }

        function waitForFiles(ms) {
          if (window.ClinicFiles && window.ClinicFiles.upload) return Promise.resolve(true);
          return new Promise(function (res) {
            var done = false;
            function ok() { if (!done) { done = true; res(true); } }
            window.addEventListener('clinic-files-ready', ok, { once: true });
            setTimeout(function () { if (!done) { done = true; res(!!(window.ClinicFiles && window.ClinicFiles.upload)); } }, ms || 6000);
          });
        }

        input.addEventListener('change', async function () {
          var files = Array.from(input.files || []);
          input.value = '';
          if (!files.length) return;
          status('جارٍ التحضير للرفع...');
          var ready = await waitForFiles();
          if (!ready) { status('رفع الملفات غير متاح حالياً (تعذر تحميل وحدة التخزين).', true); return; }

          var failed = 0;
          for (var i = 0; i < files.length; i++) {
            (function (n, total) { status('جارٍ رفع ' + n + ' (' + (i + 1) + '/' + total + ')...'); })(files[i].name, files.length);
            try {
              var idx = i, tot = files.length;
              var meta = await window.ClinicFiles.upload(files[i], opts.folder || 'attachments', function (p) {
                status('جارٍ رفع ' + files[idx].name + ' (' + (idx + 1) + '/' + tot + ') — ' + p + '%');
              });
              el._files.push(meta);
              render();
            } catch (e) {
              failed++;
              console.warn('upload failed', e);
              status('تعذر رفع "' + files[i].name + '": ' + ((e && e.friendly) || (e && e.message) || 'خطأ'), true);
              await new Promise(function (r) { setTimeout(r, 1500); });
            }
          }
          if (!failed) status('');
          render();
        });
        render();
      },
      collect: function (el) { return (el._files && el._files.length) ? el._files.slice() : null; },
      render: function (v) {
        if (!v || !v.length) return '';
        return '<ul class="sp-files-view">' + v.map(function (f) {
          return '<li><a href="' + esc(f.url) + '" target="_blank" rel="noopener">' + esc(f.name) + '</a></li>';
        }).join('') + '</ul>';
      }
    };
  }

  function tableHtml(head, rows) {
    return '<div class="table-wrap"><table><thead><tr>' +
      head.map(function (h) { return '<th>' + esc(h) + '</th>'; }).join('') +
      '</tr></thead><tbody>' +
      rows.map(function (r) {
        return '<tr>' + r.map(function (c) { return '<td>' + esc(c == null ? '' : c) + '</td>'; }).join('') + '</tr>';
      }).join('') + '</tbody></table></div>';
  }

  window.ClinicSpecialty = {
    list: list, current: current, currentId: currentId, set: set,
    addSection: addSection, addSpecialty: addSpecialty, doctorIds: doctorIds, forDoctor: forDoctor, matchText: matchText,
    filesSection: filesSection, tableHtml: tableHtml,
    formHtml: formHtml, wire: wire, collect: collect,
    summaryRows: summaryRows, detailHtml: detailHtml, escape: esc
  };

  syncMajors();

  /* ---- Admin page: self-wiring picker (only runs if the select exists) ---- */
  function wireAdmin() {
    var sel = document.getElementById('clinicSpecialty');
    if (!sel) return;
    sel.innerHTML = list().map(function (s) {
      return '<option value="' + s.id + '">' + s.icon + ' ' + esc(s.label) + '</option>';
    }).join('');
    sel.value = currentId();
    var hint = document.getElementById('clinicSpecialtyHint');
    function describe() {
      var s = current();
      var extras = s.sections.map(function (x) { return x.title; });
      var txt = 'التخصص الحالي: ' + s.label;
      if (extras.length) txt += ' — مميزات إضافية: ' + extras.join('، ');
      else txt += ' — حقول الفحص الأساسية';
      if (hint) hint.textContent = txt;
    }
    sel.addEventListener('change', function () {
      set(sel.value);
      describe();
      if (typeof window.toast === 'function') window.toast('تم حفظ تخصص العيادة');
      document.dispatchEvent(new Event('clinic-specialty-changed'));
    });
    describe();
  }
  document.addEventListener('clinic-specialties-registered', function () {
    syncMajors();
    var sel = document.getElementById('clinicSpecialty');
    if (!sel) return;
    var v = currentId();
    sel.innerHTML = list().map(function (s) {
      return '<option value="' + s.id + '">' + s.icon + ' ' + esc(s.label) + '</option>';
    }).join('');
    sel.value = v;
  });

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', wireAdmin, { once: true });
  } else {
    wireAdmin();
  }
})();
