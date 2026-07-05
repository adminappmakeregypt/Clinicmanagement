// ============ BookMyDoctor Auth (fixed accounts, no signup) ============
// Accounts are hardcoded below. No sign-up. When a user logs in with their
// email + password, we place them into the correct clinic namespace so each
// clinic's data (doctors, majors, bookings...) stays isolated from others.
//
// To add/remove/change accounts: edit ALLOWED_USERS below.
// To change the default password: edit DEFAULT_PASSWORD.
// Users can change their own password from the login page ("نسيت كلمة المرور؟"
// / "تغيير كلمة المرور") or from the header bar. Custom passwords are saved
// in this browser's localStorage under bmd_pw_overrides_v1.
(function () {
  const SESSION_KEY = 'bmd_session_v1';
  const PW_OVERRIDES_KEY = 'bmd_pw_overrides_v1';
  const LOGIN_PAGE = 'login.html';

  // 🔑 default password for every account (unless the user has their own)
  const DEFAULT_PASSWORD = '123456';

  // 👥 The full list of allowed accounts, grouped by clinic.
  // role: 'admin' = full access (incl. admin.html), 'user' = booking + reports.
  const ALLOWED_USERS = {
    // Clinic 1
    'clinic1admin@appmakeregypt.com': { clinicId: 'clinic1', role: 'admin' },
    'clinic1usera@appmakeregypt.com': { clinicId: 'clinic1', role: 'user' },
    'clinic1userb@appmakeregypt.com': { clinicId: 'clinic1', role: 'user' },
    // Clinic 2
    'clinic2admin@appmakeregypt.com': { clinicId: 'clinic2', role: 'admin' },
    'clinic2usera@appmakeregypt.com': { clinicId: 'clinic2', role: 'user' },
    'clinic2userb@appmakeregypt.com': { clinicId: 'clinic2', role: 'user' },
    // Clinic 3
    'clinic3admin@appmakeregypt.com': { clinicId: 'clinic3', role: 'admin' },
    'clinic3usera@appmakeregypt.com': { clinicId: 'clinic3', role: 'user' },
    'clinic3userb@appmakeregypt.com': { clinicId: 'clinic3', role: 'user' },
    // Clinic 4
    'clinic4admin@appmakeregypt.com': { clinicId: 'clinic4', role: 'admin' },
    'clinic4usera@appmakeregypt.com': { clinicId: 'clinic4', role: 'user' },
    'clinic4userb@appmakeregypt.com': { clinicId: 'clinic4', role: 'user' },
    // Clinic 5
    'clinic5admin@appmakeregypt.com': { clinicId: 'clinic5', role: 'admin' },
    'clinic5usera@appmakeregypt.com': { clinicId: 'clinic5', role: 'user' },
    'clinic5userb@appmakeregypt.com': { clinicId: 'clinic5', role: 'user' },
    // Clinic 6
    'clinic6admin@appmakeregypt.com': { clinicId: 'clinic6', role: 'admin' },
    'clinic6usera@appmakeregypt.com': { clinicId: 'clinic6', role: 'user' },
    'clinic6userb@appmakeregypt.com': { clinicId: 'clinic6', role: 'user' },
    // Clinic 7
    'clinic7admin@appmakeregypt.com': { clinicId: 'clinic7', role: 'admin' },
    'clinic7usera@appmakeregypt.com': { clinicId: 'clinic7', role: 'user' },
    'clinic7userb@appmakeregypt.com': { clinicId: 'clinic7', role: 'user' },
    // Clinic 8
    'clinic8admin@appmakeregypt.com': { clinicId: 'clinic8', role: 'admin' },
    'clinic8usera@appmakeregypt.com': { clinicId: 'clinic8', role: 'user' },
    'clinic8userb@appmakeregypt.com': { clinicId: 'clinic8', role: 'user' },
    // Clinic 9
    'clinic9admin@appmakeregypt.com': { clinicId: 'clinic9', role: 'admin' },
    'clinic9usera@appmakeregypt.com': { clinicId: 'clinic9', role: 'user' },
    'clinic9userb@appmakeregypt.com': { clinicId: 'clinic9', role: 'user' },
    // Clinic 10
    'clinic10admin@appmakeregypt.com': { clinicId: 'clinic10', role: 'admin' },
    'clinic10usera@appmakeregypt.com': { clinicId: 'clinic10', role: 'user' },
    'clinic10userb@appmakeregypt.com': { clinicId: 'clinic10', role: 'user' },
    // Clinic 11
    'appmakeregypt@gmail.com':      { clinicId: 'clinic11', role: 'admin' },
    'mostafa.hegab83@gmail.com':    { clinicId: 'clinic11', role: 'user' },
    'mostafa.hegab@hotmail.com':    { clinicId: 'clinic11', role: 'user' },
    // Clinic 12
    'karimaismail1998@gmail.com':   { clinicId: 'clinic12', role: 'admin' },
    'afiaclinic1@gmail.com':        { clinicId: 'clinic12', role: 'user' },
    'afiaclinic2@gmail.com':        { clinicId: 'clinic12', role: 'user' },
    // Clinic 13
    'ahmadarfa55555@gmail.com':     { clinicId: 'clinic13', role: 'admin' },
    // (add more accounts here as needed)
  };

  function getSession() {
    try {
      const s = JSON.parse(localStorage.getItem(SESSION_KEY) || 'null');
      if (!s || !s.email) return null;
      return s;
    } catch { return null; }
  }
  function setSession(s) { localStorage.setItem(SESSION_KEY, JSON.stringify(s)); }
  function clearSession() { localStorage.removeItem(SESSION_KEY); }

  function getOverrides() {
    try { return JSON.parse(localStorage.getItem(PW_OVERRIDES_KEY) || '{}') || {}; }
    catch { return {}; }
  }
  function setOverride(email, pw) {
    const o = getOverrides();
    o[email] = pw;
    localStorage.setItem(PW_OVERRIDES_KEY, JSON.stringify(o));
  }
  function expectedPassword(email, acc) {
    const o = getOverrides();
    if (Object.prototype.hasOwnProperty.call(o, email)) return o[email];
    return acc.password || DEFAULT_PASSWORD;
  }

  function signIn(email, password) {
    email = (email || '').trim().toLowerCase();
    const acc = ALLOWED_USERS[email];
    if (!acc) throw new Error('هذا البريد غير مصرح له بالدخول');
    if (password !== expectedPassword(email, acc)) throw new Error('كلمة المرور غير صحيحة');
    const session = {
      email,
      role: acc.role,
      name: acc.name || email.split('@')[0],
      clinicId: acc.clinicId,
    };
    setSession(session);
    return session;
  }

  function changePassword(email, oldPassword, newPassword) {
    email = (email || '').trim().toLowerCase();
    const acc = ALLOWED_USERS[email];
    if (!acc) throw new Error('هذا البريد غير مصرح له بالدخول');
    if (oldPassword !== expectedPassword(email, acc)) throw new Error('كلمة المرور الحالية غير صحيحة');
    if (!newPassword || String(newPassword).length < 6) throw new Error('كلمة المرور الجديدة يجب أن تكون 6 أحرف على الأقل');
    if (newPassword === oldPassword) throw new Error('كلمة المرور الجديدة يجب أن تختلف عن الحالية');
    setOverride(email, newPassword);
    return true;
  }

  function signOut() {
    clearSession();
    location.href = LOGIN_PAGE;
  }

  const session = getSession();

  // Per-clinic namespace for all app data
  const clinicId = session ? session.clinicId : '__anon__';
  window.CLINIC_ID = clinicId;
  window.clinicKey = function (name) { return 'bmd::' + clinicId + '::' + name; };

  window.BMDAuth = {
    signIn, signOut, getSession, changePassword,
    isAllowed: (email) => !!ALLOWED_USERS[(email || '').trim().toLowerCase()],
    isAdmin: () => !!(session && session.role === 'admin'),
  };

  // ---- Page guard ----
  const path = (location.pathname.split('/').pop() || '').toLowerCase();
  const isLoginPage = path === 'login.html';

  if (!isLoginPage) {
    if (!session) {
      location.replace(LOGIN_PAGE);
      return;
    }
    const adminOnlyPages = ['admin.html','reports.html','patients.html'];
    if (adminOnlyPages.includes(path) && session.role !== 'admin') {
      alert('هذه الصفحة متاحة لمدير العيادة فقط');
      location.replace('home.html');
      return;
    }
  }

  // ---- Header session bar ----
  if (!isLoginPage && session) {
    document.addEventListener('DOMContentLoaded', function () {
      const header = document.querySelector('.page-header') || document.body;
      const bar = document.createElement('div');
      bar.style.cssText =
        'display:flex;gap:8px;align-items:center;justify-content:center;padding:8px;font-size:14px;color:#555;flex-wrap:wrap;';
      const safeName = (session.name || session.email).replace(/[&<>"']/g, '');
      const roleLabel = session.role === 'admin' ? 'مدير' : 'مستخدم';
      bar.innerHTML =
        '<span>👤 <strong>' + safeName + '</strong> — ' + roleLabel +
        ' — 🏥 ' + session.clinicId + '</span>' +
        '<button type="button" class="btn small ghost" id="bmdChangePwBtn">🔑 تغيير كلمة المرور</button>' +
        '<button type="button" class="btn small ghost" id="bmdSignOutBtn">🚪 تسجيل الخروج</button>';
      header.parentNode.insertBefore(bar, header.nextSibling);

      const signOutBtn = document.getElementById('bmdSignOutBtn');
      if (signOutBtn) signOutBtn.addEventListener('click', function () { window.BMDAuth.signOut(); });

      const changeBtn = document.getElementById('bmdChangePwBtn');
      if (changeBtn) changeBtn.addEventListener('click', function () {
        const oldPw = prompt('كلمة المرور الحالية:');
        if (oldPw === null) return;
        const newPw = prompt('كلمة المرور الجديدة (٦ أحرف على الأقل):');
        if (newPw === null) return;
        const confirmPw = prompt('تأكيد كلمة المرور الجديدة:');
        if (confirmPw === null) return;
        if (newPw !== confirmPw) { alert('كلمتا المرور غير متطابقتين'); return; }
        try {
          window.BMDAuth.changePassword(session.email, oldPw, newPw);
          alert('تم تغيير كلمة المرور بنجاح');
        } catch (err) { alert(err.message || 'فشل تغيير كلمة المرور'); }
      });

      if (session.role !== 'admin') {
        document.querySelectorAll('a[href="admin.html"], a[href="reports.html"], a[href="patients.html"]').forEach(el => { el.style.display = 'none'; });
      }
    });
  }
})();
