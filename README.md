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
