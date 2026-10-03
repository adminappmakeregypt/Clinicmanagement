// ============ ClinicManagement Auth (Firebase Authentication) ============
// Accounts must exist in Firebase Auth for the project bookmydoctor-6c93c.
// - Sign in uses Firebase email/password.
// - "نسيت كلمة المرور؟" sends a REAL password-reset email via Firebase; the
//   user clicks the link in their inbox and Firebase shows a hosted page to
//   set a new password. Nothing to store on our side.
// - Clinic/role come from Firestore (users/{uid}); each clinic's data stays
//   isolated in its own localStorage namespace (window.clinicKey).

import { auth, db } from "./firebase-config.js";
import { doc, getDoc, setDoc } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut as fbSignOut,
  sendPasswordResetEmail,
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";

// v34: identity = Firebase Authentication UID + users/{uid}  (the ONLY authority).
//   - users/{uid} exists      → its clinicId / role / isActive are used as-is.
//   - users/{uid} missing     → an administrator-written clinicMembers/{email}
//                               invitation is copied ONCE into users/{uid} (first login).
//   - neither exists          → no access (the user is signed out).
// The old email list (legacy-accounts.js) is NOT used here any more; it is only
// the source list for the platform admin's «ترحيل/إصلاح الحسابات الحالية».
// The v33 automatic "repair on login" was removed: it let an invitation silently
// move an existing account to another clinic. Repairs are done by the platform admin.
const PLATFORM_ADMIN_EMAILS = ["mostafa.hegab83@gmail.com"];
const PLATFORM_ROLES = ["superadmin", "super_admin"];
const CLINIC_ROLES = ["admin", "user", "doctor"];

async function resolveProfile(user) {
  const email = (user.email || "").toLowerCase();
  const isPlatformEmail = PLATFORM_ADMIN_EMAILS.includes(email);
  let uData = null, warning = "";
  try {
    const u = await getDoc(doc(db, "users", user.uid));
    if (u.exists()) uData = u.data();
  } catch (e) { console.warn("[auth] users read failed", e && e.code); }

  let data = uData;
  if (!uData && email) {
    let mData = null;
    try {
      const m = await getDoc(doc(db, "clinicMembers", email));
      if (m.exists()) mData = m.data();
    } catch (e) { console.warn("[auth] clinicMembers read failed", e && e.code); }
    const mRole = mData ? String(mData.role || "user").toLowerCase() : "";
    if (mData && mData.isActive !== false && mData.clinicId && CLINIC_ROLES.includes(mRole)) {
      const rec = { email, name: mData.name || email.split("@")[0], role: mRole, clinicId: mData.clinicId,
        isActive: true, createdAt: Date.now(), updatedAt: Date.now(), linkedFrom: "clinicMembers" };
      try { await setDoc(doc(db, "users", user.uid), rec); data = rec; }
      catch (e) {
        console.warn("[auth] first-login link failed", e && e.code);
        data = rec; // the rules still accept the invitation until the UID record exists
        warning = "تعذّر إنشاء سجل حسابك (users). اطلب من مدير المنصة الضغط على «ترحيل/إصلاح الحسابات الحالية».";
      }
    } else if (mData && mData.isActive === false) {
      data = { email, clinicId: mData.clinicId, role: mRole, isActive: false };
    }
  }

  const role = String((data && data.role) || "").toLowerCase();
  const isPlatformAdmin = isPlatformEmail || (PLATFORM_ROLES.includes(role) && data.isActive !== false);
  if (!data && !isPlatformAdmin) return null;
  return {
    uid: user.uid,
    email,
    role: isPlatformAdmin || role === "owner" ? "admin" : (CLINIC_ROLES.includes(role) ? role : "user"),
    name: (data && data.name) || email.split("@")[0],
    clinicId: (data && data.clinicId) || "__platform__",
    isActive: isPlatformEmail || !data || data.isActive !== false,
    isPlatformAdmin,
    warning,
  };
}

const LOGIN_PAGE = "login.html";
const HOME_PAGE  = "home.html";

const path = (location.pathname.split("/").pop() || "").toLowerCase();
const isLoginPage = path === LOGIN_PAGE;

// Resolve the clinic namespace SYNCHRONOUSLY at boot so page scripts that
// read localStorage at load time always hit their own clinic's bucket.
// A small inline bootstrap in the HTML creates window.clinicKey before this
// module finishes loading Firebase; keep the same logic here as a fallback.
const LAST_CLINIC_KEY = window.__BMD_LAST_CLINIC_KEY || "bmd::lastClinicId";
if (!window.clinicKey) {
  window.CLINIC_ID = localStorage.getItem(LAST_CLINIC_KEY) || "__anon__";
  window.clinicKey = (name) => "bmd::" + window.CLINIC_ID + "::" + name;
}

// Hide non-login pages until Firebase confirms who is signed in.
if (!isLoginPage) {
  const s = document.createElement("style");
  s.id = "bmd-boot-hide";
  s.textContent = "body{visibility:hidden}";
  document.head.appendChild(s);
}

function friendlyAuthError(err) {
  const code = err && err.code ? err.code : "";
  switch (code) {
    case "auth/invalid-email":         return "البريد الإلكتروني غير صالح";
    case "auth/user-disabled":         return "تم تعطيل هذا الحساب";
    case "auth/user-not-found":        return "هذا البريد غير مسجل";
    case "auth/wrong-password":
    case "auth/invalid-credential":    return "كلمة المرور غير صحيحة";
    case "auth/too-many-requests":     return "محاولات كثيرة، حاول لاحقاً";
    case "auth/network-request-failed":return "لا يوجد اتصال بالإنترنت";
    case "auth/missing-email":         return "أدخل البريد الإلكتروني";
    default: return (err && err.message) || "حدث خطأ";
  }
}

async function signIn(email, password) {
  email = (email || "").trim().toLowerCase();
  try {
    await signInWithEmailAndPassword(auth, email, password);
    return true;
  } catch (err) {
    throw new Error(friendlyAuthError(err));
  }
}

async function signOut() {
  window.CLINIC_ID = "__anon__";
  try { localStorage.removeItem(LAST_CLINIC_KEY); } catch {}
  try { await fbSignOut(auth); } catch {}
  location.href = LOGIN_PAGE;
}

async function resetPassword(email) {
  email = (email || "").trim().toLowerCase();
  if (!email) throw new Error("أدخل البريد الإلكتروني أولاً");
  try {
    await sendPasswordResetEmail(auth, email);
    return true;
  } catch (err) {
    throw new Error(friendlyAuthError(err));
  }
}

// Expose a simple API for the pages that already use window.BMDAuth
window.BMDAuth = {
  signIn,
  signOut,
  resetPassword,
  getSession: () => window.currentUserProfile || null,
  isAdmin: () => !!(window.currentUserProfile && window.currentUserProfile.role === "admin"),
};

window.currentUserProfile = null;

// ---- Firebase auth state → page guard + header bar ----
onAuthStateChanged(auth, async (user) => {
  // 1) Not signed in
  if (!user) {
    if (!isLoginPage) location.replace(LOGIN_PAGE);
    else {
      const b = document.getElementById("bmd-boot-hide");
      if (b) b.remove();
    }
    return;
  }

  // 2) Signed in — resolve clinic + role from Firestore (by UID)
  const email = (user.email || "").toLowerCase();
  const mapped = await resolveProfile(user);
  if (!mapped) {
    alert("لم يتم العثور على بيانات العيادة لهذا المستخدم:\n" + email + "\nاطلب من مدير العيادة إضافتك من «إدارة المستخدمين».");
    fbSignOut(auth).finally(() => location.replace(LOGIN_PAGE));
    return;
  }
  if (!mapped.isActive) {
    alert("تم إيقاف هذا الحساب. تواصل مع مدير العيادة.");
    fbSignOut(auth).finally(() => location.replace(LOGIN_PAGE));
    return;
  }

  // If the clinic bucket used at boot differs from the one this account
  // belongs to (e.g. a different user just signed in on the same browser),
  // persist the new clinicId and reload so all page scripts re-read
  // localStorage against the correct namespace instead of the previous
  // clinic's data.
  const bootClinicId = window.CLINIC_ID;
  let stored = null;
  try {
    localStorage.setItem(LAST_CLINIC_KEY, mapped.clinicId);
    stored = localStorage.getItem(LAST_CLINIC_KEY);
  } catch {}
  // Reload at most ONCE per page load, and only if the new clinicId actually
  // persisted. Without these guards a browser that blocks localStorage (private
  // mode / blocked cookies) would reload forever and the page would flicker.
  const RELOAD_FLAG = "bmd::reloadedForClinic";
  let alreadyReloaded = false;
  try { alreadyReloaded = sessionStorage.getItem(RELOAD_FLAG) === mapped.clinicId; } catch { alreadyReloaded = true; }
  if (
    bootClinicId !== mapped.clinicId &&
    !isLoginPage &&
    stored === mapped.clinicId &&
    !alreadyReloaded
  ) {
    try { sessionStorage.setItem(RELOAD_FLAG, mapped.clinicId); } catch {}
    location.reload();
    return;
  }
  try { sessionStorage.setItem(RELOAD_FLAG, mapped.clinicId); } catch {}
  window.CLINIC_ID = mapped.clinicId;
  window.currentUserProfile = mapped;

  // On the login page: bounce to home once signed in
  if (isLoginPage) { location.replace(HOME_PAGE); return; }

  // Role guard for admin-only pages
  const adminOnlyPages = ["admin.html", "reports.html", "patients.html"];
  if (adminOnlyPages.includes(path) && mapped.role !== "admin" && !(path === "admin.html" && mapped.isPlatformAdmin)) {
    alert("هذه الصفحة متاحة لمدير العيادة فقط");
    location.replace(HOME_PAGE);
    return;
  }

  // Reveal page + add header bar
  const reveal = () => {
    const b = document.getElementById("bmd-boot-hide");
    if (b) b.remove();
    injectHeaderBar();
    document.dispatchEvent(new CustomEvent("auth:ready", { detail: window.currentUserProfile }));
  };
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", reveal, { once: true });
  } else {
    reveal();
  }
});

function injectHeaderBar() {
  const session = window.currentUserProfile;
  if (!session) return;
  const header = document.querySelector(".page-header") || document.body;
  let bar = document.getElementById("userBar");
  if (!bar) {
    bar = document.createElement("section");
    bar.id = "userBar";
    bar.className = "user-bar account-bar";
    header.parentNode.insertBefore(bar, header.nextSibling);
  }
  const safeName = (session.name || session.email).replace(/[&<>"']/g, "");
  const safeEmail = (session.email || "").replace(/[&<>"']/g, "");
  const roleLabel = session.isPlatformAdmin ? "مدير المنصة" : session.role === "admin" ? "مدير" : session.role === "doctor" ? "طبيب" : "مستخدم";
  bar.innerHTML =
    '<div class="user-bar-actions">' +
      '<button type="button" class="ub-btn" id="bmdSignOutBtn"><span>تسجيل الخروج</span><span class="ub-ico">🚪</span></button>' +
      '<button type="button" class="ub-btn" id="bmdChangePwBtn"><span>نسيت كلمة المرور؟</span><span class="ub-ico">🔑</span></button>' +
    '</div>' +
    '<div class="user-bar-info">' +
      '<span class="ub-clinic">' + session.clinicId + ' <span class="ub-ico">🏥</span></span>' +
      '<span class="ub-sep"></span><span class="ub-role">' + roleLabel + '</span>' +
      '<span class="ub-sep"></span><span class="ub-name"><strong>' + safeName + '</strong> <span class="ub-email">' + safeEmail + '</span> <span class="ub-ico">👤</span></span>' +
    '</div>';

  if (session.warning) {
    let w = document.getElementById("bmdAuthWarn");
    if (!w) { w = document.createElement("div"); w.id = "bmdAuthWarn"; bar.parentNode.insertBefore(w, bar.nextSibling); }
    w.style.cssText = "background:#fef2f2;color:#991b1b;border:1px solid #fecaca;border-radius:10px;padding:10px 14px;margin:8px 0;font-weight:600";
    w.textContent = "⚠️ " + session.warning;
  }
  const outBtn = document.getElementById("bmdSignOutBtn");
  if (outBtn) outBtn.addEventListener("click", () => window.BMDAuth.signOut());

  const pwBtn = document.getElementById("bmdChangePwBtn");
  if (pwBtn) pwBtn.addEventListener("click", async () => {
    if (!confirm("سنرسل رابط إعادة تعيين كلمة المرور إلى بريدك:\n" + session.email + "\nهل تريد المتابعة؟")) return;
    try {
      await window.BMDAuth.resetPassword(session.email);
      alert("تم إرسال رابط إعادة التعيين إلى بريدك الإلكتروني. افتح البريد واضغط الرابط لتعيين كلمة مرور جديدة.");
    } catch (err) { alert(err.message || "فشل الإرسال"); }
  });

  if (session.role !== "admin") {
    document.querySelectorAll(
      (session.isPlatformAdmin ? '' : 'a[href="admin.html"], ') + 'a[href="reports.html"], a[href="patients.html"]'
    ).forEach(el => { el.style.display = "none"; });
  }
}
