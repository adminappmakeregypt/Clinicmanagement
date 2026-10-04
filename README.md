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
