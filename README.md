# حجز العيادات - Clinic Booking App

تطبيق ويب بسيط لحجز مواعيد العيادات باللغة العربية. يحتوي على نموذج متعدد الخطوات، ملخص حجز مباشر، وسجل حجوزات مع إمكانية التعديل والحذف.

## الملفات
- `index.html` - الواجهة
- `styles.css` - التنسيق
- `script.js` - المنطق (يحفظ البيانات في localStorage)

## التشغيل
افتح `index.html` مباشرة في المتصفح، أو ارفع الملفات إلى GitHub Pages.

## المزايا
- نموذج بخمس خطوات (اسم، مرض، تاريخ، وقت، تأكيد)
- ملخص حجز مباشر
- سجل حجوزات مع بحث
- تعديل وحذف الحجوزات
- يدعم RTL بالكامل

## v39 — English / Arabic
- New button «English / العربية» at the top of the home page (and login page).
- The choice is saved in the browser and applies to every page. No settings change.
- Only on-screen text is translated; saved patient data and bookings stay exactly as they are.
- New file: i18n.js. Changed: all 7 HTML pages (one line added) and styles.css.

## v40 — website-bookings.js publishes only active doctors (records with active:false are skipped).

## v41 — إيميل الطبيب
- في صفحة المدير (الأطباء والتخصصات) خانة «إيميل الطبيب» عند الإضافة، وزر «📧 الإيميل» لكل طبيب لإضافة/تعديل الإيميل.
- لما الطبيب يسجل دخول بنفس الإيميل: صفحة الطبيب تتقفل على اسمه، وتظهر له مرضاه فقط (حجوزاته + المرضى اللي سجّل لهم زيارات)، والتاريخ المرضي والروشتات الخاصة به فقط.
- المدير يرى كل المرضى كما هو. البيانات المحفوظة لم تتغير.
- ملفات معدلة: admin.html, admin.js, doctor.js, i18n.js.

## v42 — تعديل ومسح الروشتة
- في صفحة الطبيب: كل روشتة (في البحث وفي 🗒️ التاريخ المرضي) لها زر «✏️ تعديل» وزر «🗑 مسح» بجانب 👁 عرض و 📄 PDF.
- التعديل يفتح نفس الروشتة بنفس الرقم والبيانات محفوظة (الطبيب، التاريخ، التشخيص، الأدوية، بيانات الفحص، الملاحظات) ويعيد الحفظ بنفس رقم الروشتة دون إنشاء نسخة جديدة.
- المسح يحذف الروشتة من السحابة، ولو منعت قواعد الأمان المسح يتم إخفاؤها تلقائياً حتى لا تظهر في أي قائمة (لا يوجد فقدان بيانات).
- ملفات معدلة: prescriptions.js (v5), doctor.js (v6), doctor.html, i18n.js.

## v43
- Bookings page: a doctor signed in with their email sees only their own bookings (table + Excel export). Admin sees all.


## v60 — Dental arch illustration
- Curved upper/lower arches, pink gum tissue, white tooth contours, FDI numbers, and condition dots. Permanent, primary, mixed, and print views updated.
- Existing saved keys, clinical records, focused surface selection, permissions, and Firebase settings unchanged.
- Upload dental-odo.js, styles.css, and all HTML files, then refresh with Ctrl+Shift+R.
- Browser-checked tooth/surface selection, findings/planned/completed records, reopening, narrow display, and print view. Real-account visit saving remains to be checked on your hosted clinic.

## v61 — patient records permission fix
- Root cause: doctor.js and prescriptions.js froze the clinic ID when the page loaded, and doctor.js also loaded records 400 ms after load, before sign-in had confirmed the clinic. Cloud calls could therefore go to "__anon__" or a previous clinic, and the rules correctly refused them.
- Now every patient-record and prescription call waits for the confirmed clinic, refuses "__anon__" or a mismatched clinic, logs safe diagnostics ([records-diag]: operation, path, uid, clinic, error code), and shows "saved on this device only" when the cloud save fails.
- firestore.rules unchanged.

## v62 — booking delete fix
- Deleted bookings used to reappear: cloud sync merges by union, so the cloud copy restored them.
- cloud-sync.js now remembers deleted ids (tombstones) and keeps them out of every merge.
- script.js records the tombstone when a booking is deleted.
- Upload: cloud-sync.js, script.js, index.html. No Firebase Console changes.

## v62b — booking delete across devices
- The deletion list was only kept on the deleting device; other devices still had the booking and pushed it back.
- The deletion list now travels inside the cloud document, so a delete applies on every device.
- Upload: cloud-sync.js, index.html. No Firebase Console changes.

## v62c — حذف الحجز يظهر على كل الأجهزة
- cloud-sync.js: when a deletion arrives from another device, the open bookings screen now refreshes immediately (before, the booking stayed on screen and could be saved back). The shared deletion list in the cloud only grows (merge) and every upload drops deleted bookings.
- website-bookings.js: a website booking that staff deleted is never re-imported on any device, and its save keeps the deletion list.
- All pages load cloud-sync.js?v=7 and website-bookings.js?v=31 so no device keeps an old copy.
- No Firebase Console changes.

## v63 — Palmer notation for primary teeth
- Primary teeth display A–E with quadrant corners (UR, UL, LL, LR), including mixed dentition, details, filters, history, and print.
- Permanent FDI numbers, saved tooth identifiers, and existing clinical records remain unchanged.
- Upload dental-odo.js, styles.css, doctor.html, patients.html, admin.html; refresh with Ctrl+Shift+R.
- No Firebase Console changes. Hosted account saving has not been tested.

## v64 — أقسام الأسنان التخصصية
- dental-plus.js (جديد): تبويبات داخل قسم الأسنان: الأسنان العامة · جراحة الفم والفكين · تجميل الأسنان · تقويم الأسنان.
- الجراحة: تقييم قبل الجراحة، بطاقات إجراءات (مخطط/مكتمل منفصلان)، متابعة بعد الجراحة مع مقارنة الزيارات السابقة.
- التجميل: تقييم جمالي، خريطة أسنان تجميلية مربوطة بخريطة الأسنان (زر «من الخريطة»)، صور قبل/أثناء/بعد مع مقارنة جنباً إلى جنب، تصميم الابتسامة (المقترح منفصل عن الفعلي).
- التقويم: تقييم مبدئي، سجلات وأشعة + قياسات سيفالومتري يدوية، تشخيص وخطة، زيارات متابعة، خط زمني من الأحداث المسجلة فقط.
- الحفظ داخل نفس الزيارة (مفاتيح جديدة ds*) — لا تغيير في Firebase أو القواعد.

## v65 — تعديلات بطاقات الأسنان
- علاج العصب: «الترميم النهائي» أصبح «حشو نهائي» (نفس المفتاح finalRestoration — السجلات القديمة كما هي).
- علاج العصب: حقل جديد «أشعة صغيرة (Periapical)» (مفتاح periapical).
- الزراعة: حقل جديد «أشعة مقطعية مخروطية (Cone-beam CT)» (مفتاح cbct).
- جميع الحقول تُحفظ داخل نفس الزيارة مثل باقي حقول الأسنان — لا تغيير في Firebase أو القواعد.
- Upload: dental.js, doctor.html, patients.html, admin.html; refresh with Ctrl+Shift+R.

## v66 — Arabic / English clinical parity
- Expanded the shared English dictionary across all specialties, including dental departments, odontogram, root canal, implants, cosmetic / eye maps, ENT, growth charts, and dynamic cards.
- Identical sections, controls, option values, specialty identifiers, and saved clinical keys in both languages. Only display text and reading direction change.
- Corrected inaccurate English cataract and tooth labels.
- Upload i18n.js and all HTML files; refresh with Ctrl+Shift+R. No Firebase Console changes.
- Standalone clinical-form switching and record round-trip checked; real-account hosted saving remains unverified.

## v67 / Website v48 — Booking reliability + removed doctors (2026-10-11)
Root causes:
1. Intermittent "booking not available": the security rule checked slots against the doctor's general hours, while the website shows per-day hours (dayHours). On days with their own hours/break, valid slots were refused, and the website turned every refusal into "booking disabled". Failed schedule reads were also treated as "no appointments".
2. Removed doctor still on the website: cloud sync merges the doctor list by union, so a deleted doctor came back from the cloud copy and kept being published.
Fixes: firestore.rules (both projects, identical) honour dayHours; doctor removal is remembered on all devices; publishing rebuilds the list from current eligible doctors only, ignores stale async writes, shows a warning + auto-retry on failure; website reads fresh data on open, shows a retry button on failure, revalidates doctor/date/time/settings before booking, blocks double-submit, and reports the real reason (taken / changed / doctor unavailable / disabled only if confirmed / network). Old bookings and patient records keep the doctor's id and name.
Upload: Clinic: admin.js, website-bookings.js, all .html, firestore.rules. Website: booking.js, site.js, index.html, firestore.rules. Then publish firestore.rules in Firebase Console and Ctrl+Shift+R.

## v68 — Ophthalmology: contact lens, glasses prescription print, previous-visit comparison
Already existed: VA/refraction table (SPH/CYL/Axis/ADD/PD per eye), IOP with unit/method/time, visit history (ClinicCare.visitsFor).
Added (oph-plus.js, collapsed groups in ophthalmology.js):
- Contact Lens (exam.sections.ophContactLens): indication, lens type, OD/OS BC/DIA/SPH/CYL/Axis, brand, schedule, replacement, fitting, comfort, corneal response, instructions, follow-up, notes. No calculations.
- Glasses Prescription (exam.sections.ophGlassesRx): prism/base per eye, date, expiry, doctor, specialty, notes. SPH/CYL/Axis/ADD/PD read live from the refraction table (no duplicate fields). Review + print via an isolated print frame — only the prescription prints.
- Previous Visit Comparison: read-only, choose a visit, "Not recorded" for missing values, highlights only comparable changes (same VA notation; IOP same unit + method).
Saved in the same visit; no new collections, no Firebase rule changes. Upload oph-plus.js, ophthalmology.js, i18n.js, styles.css, all .html, then Ctrl+Shift+R.
