// ============ Clinic Session (multi-tenant per-browser) ============
// Namespaces every localStorage key by the current clinic account so that
// bookings/doctors/majors/schedules of one clinic never mix with another.
// NOTE: localStorage is per-browser/device. To sync across devices you need
// a real backend.
(function () {
  const CUR = 'bmd_current_clinic_v1';
  const MIGRATED = 'bmd_migrated_v1';

  let clinic = (localStorage.getItem(CUR) || '').trim().toLowerCase();
  if (!clinic) {
    const input = prompt(
      'أدخل بريد / اسم العيادة لتسجيل الدخول\n(يُستخدم لفصل بيانات كل عيادة على حدة):',
      ''
    );
    clinic = (input || '').trim().toLowerCase();
    if (!clinic) clinic = 'default';
    localStorage.setItem(CUR, clinic);
  }

  window.CLINIC_ID = clinic;
  window.clinicKey = function (name) {
    return 'bmd::' + clinic + '::' + name;
  };

  // One-time migration: copy legacy (non-namespaced) keys into the current
  // clinic namespace so existing users don't lose their data.
  if (!localStorage.getItem(MIGRATED + '::' + clinic)) {
    const legacyKeys = [
      'clinic_bookings_v1',
      'clinic_audit_v1',
      'clinic_current_user',
      'clinic_doctors_v1',
      'clinic_majors_v1',
      'clinic_admin_v1',
    ];
    legacyKeys.forEach(function (k) {
      const v = localStorage.getItem(k);
      const nk = window.clinicKey(k);
      if (v && !localStorage.getItem(nk)) {
        localStorage.setItem(nk, v);
      }
    });
    localStorage.setItem(MIGRATED + '::' + clinic, '1');
  }

  window.switchClinic = function () {
    const c = prompt('تبديل العيادة - أدخل البريد/الاسم:', clinic);
    const v = (c || '').trim().toLowerCase();
    if (v) {
      localStorage.setItem(CUR, v);
      location.reload();
    }
  };
  window.signOutClinic = function () {
    if (confirm('تسجيل الخروج من هذه العيادة؟')) {
      localStorage.removeItem(CUR);
      location.reload();
    }
  };

  // Inject a small badge in the header once the DOM is ready
  document.addEventListener('DOMContentLoaded', function () {
    const header = document.querySelector('.page-header') || document.body;
    const bar = document.createElement('div');
    bar.style.cssText =
      'display:flex;gap:8px;align-items:center;justify-content:center;padding:8px;font-size:14px;color:#555;flex-wrap:wrap;';
    bar.innerHTML =
      '<span>🏥 العيادة الحالية: <strong>' +
      clinic.replace(/[&<>"']/g, '') +
      '</strong></span>' +
      '<button type="button" class="btn small ghost" onclick="switchClinic()">🔄 تبديل العيادة</button>' +
      '<button type="button" class="btn small ghost" onclick="signOutClinic()">🚪 خروج</button>';
    header.parentNode.insertBefore(bar, header.nextSibling);
  });
})();
