// ============ BookMyDoctor Auth (per-browser accounts + roles) ============
// Simple client-side auth using localStorage. Passwords are hashed with
// SHA-256 (not for real security, but avoids storing plaintext). Each account
// gets its own clinic namespace so data is separated per clinic.
//
// Roles: 'admin' (can access admin + reports + booking) and 'user' (booking + reports view).
// Pages set data-auth-role on <body> to require a specific role.
(function () {
  const ACC_KEY = 'bmd_accounts_v1';
  const SESSION_KEY = 'bmd_session_v1';
  const LOGIN_PAGE = 'login.html';

  async function sha256(str) {
    const buf = new TextEncoder().encode(str);
    const hash = await crypto.subtle.digest('SHA-256', buf);
    return Array.from(new Uint8Array(hash)).map(b => b.toString(16).padStart(2, '0')).join('');
  }

  function readAccounts() {
    try { return JSON.parse(localStorage.getItem(ACC_KEY) || '{}'); }
    catch { return {}; }
  }
  function writeAccounts(a) { localStorage.setItem(ACC_KEY, JSON.stringify(a)); }

  function getSession() {
    try {
      const s = JSON.parse(localStorage.getItem(SESSION_KEY) || 'null');
      if (!s || !s.email) return null;
      return s;
    } catch { return null; }
  }
  function setSession(s) { localStorage.setItem(SESSION_KEY, JSON.stringify(s)); }
  function clearSession() { localStorage.removeItem(SESSION_KEY); }

  async function signUp({ name, email, password, role }) {
    email = (email || '').trim().toLowerCase();
    if (!email || !password) throw new Error('البريد وكلمة المرور مطلوبان');
    if (!['admin', 'user'].includes(role)) role = 'user';
    const accounts = readAccounts();
    if (accounts[email]) throw new Error('هذا البريد مسجل مسبقاً');
    const passwordHash = await sha256(password);
    accounts[email] = { name: name || email, email, passwordHash, role, clinicId: email, createdAt: Date.now() };
    writeAccounts(accounts);
    setSession({ email, role, name: accounts[email].name, clinicId: email });
    return accounts[email];
  }

  async function signIn(email, password) {
    email = (email || '').trim().toLowerCase();
    const accounts = readAccounts();
    const acc = accounts[email];
    if (!acc) throw new Error('لا يوجد حساب بهذا البريد');
    const passwordHash = await sha256(password);
    if (passwordHash !== acc.passwordHash) throw new Error('كلمة المرور غير صحيحة');
    setSession({ email: acc.email, role: acc.role, name: acc.name, clinicId: acc.clinicId });
    return acc;
  }

  function signOut() {
    clearSession();
    location.href = LOGIN_PAGE;
  }

  const session = getSession();

  // Set clinic namespace from current session (fallback avoids errors on login page)
  const clinicId = session ? session.clinicId : '__anon__';
  window.CLINIC_ID = clinicId;
  window.clinicKey = function (name) { return 'bmd::' + clinicId + '::' + name; };

  // One-time migration of legacy keys into the signed-in user's namespace
  if (session) {
    const migFlag = 'bmd_migrated_v1::' + clinicId;
    if (!localStorage.getItem(migFlag)) {
      const legacyKeys = [
        'clinic_bookings_v1', 'clinic_audit_v1', 'clinic_current_user',
        'clinic_doctors_v1', 'clinic_majors_v1', 'clinic_admin_v1',
      ];
      legacyKeys.forEach(function (k) {
        const v = localStorage.getItem(k);
        const nk = window.clinicKey(k);
        if (v && !localStorage.getItem(nk)) localStorage.setItem(nk, v);
      });
      localStorage.setItem(migFlag, '1');
    }
  }

  window.BMDAuth = {
    signUp, signIn, signOut, getSession,
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
    // Role gating: admin.html requires admin
    const adminOnlyPages = ['admin.html'];
    if (adminOnlyPages.includes(path) && session.role !== 'admin') {
      alert('هذه الصفحة متاحة لمدير العيادة فقط');
      location.replace('home.html');
      return;
    }
  }

  // ---- Header session bar (skip on login page) ----
  if (!isLoginPage && session) {
    document.addEventListener('DOMContentLoaded', function () {
      const header = document.querySelector('.page-header') || document.body;
      const bar = document.createElement('div');
      bar.style.cssText =
        'display:flex;gap:8px;align-items:center;justify-content:center;padding:8px;font-size:14px;color:#555;flex-wrap:wrap;';
      const safeName = (session.name || session.email).replace(/[&<>"']/g, '');
      const roleLabel = session.role === 'admin' ? 'مدير' : 'مستخدم';
      bar.innerHTML =
        '<span>👤 <strong>' + safeName + '</strong> — ' + roleLabel + '</span>' +
        '<button type="button" class="btn small ghost" id="bmdSignOutBtn">🚪 تسجيل الخروج</button>';
      header.parentNode.insertBefore(bar, header.nextSibling);
      const btn = document.getElementById('bmdSignOutBtn');
      if (btn) btn.addEventListener('click', function () { window.BMDAuth.signOut(); });

      // Hide admin nav link for non-admins
      if (session.role !== 'admin') {
        document.querySelectorAll('a[href="admin.html"]').forEach(el => { el.style.display = 'none'; });
      }
    });
  }
})();
