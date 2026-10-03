// ============ v32: إدارة المستخدمين + إدارة العيادات ============
// - مدير العيادة (role admin): يدير مستخدمي عيادته فقط.
// - مدير المنصة: يدير كل العيادات ويُنشئ عيادات جديدة.
// الأمان الحقيقي في قواعد Firestore؛ هذه الواجهة لا تتجاوزها.
// لا تُحفظ أي كلمة مرور: يُنشأ الحساب بكلمة عشوائية لا يراها أحد، ثم يُرسل
// للمستخدم بريد «تعيين كلمة المرور» من Firebase ليختار كلمته بنفسه.
import { app, auth, db } from "./firebase-config.js";
import { initializeApp, deleteApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import {
  getAuth, createUserWithEmailAndPassword, signOut, sendPasswordResetEmail,
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import {
  doc, getDoc, setDoc, updateDoc, deleteDoc, collection, getDocs, query, where,
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { LEGACY_ACCOUNTS } from "./legacy-accounts.js?v=33";

const $ = (id) => document.getElementById(id);
const ROLES = { admin: "مدير", user: "مستخدم", doctor: "طبيب" };
const PLATFORM_EMAILS = ["mostafa.hegab83@gmail.com"];
const CLINIC_RE = /^[a-z0-9_-]{2,40}$/;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
let me = null;
let currentClinic = "";
let rows = [];

function msg(el, text, ok) {
  const n = $(el); if (!n) return;
  n.textContent = text || "";
  n.style.color = ok ? "#15803d" : "#b91c1c";
}
function friendly(e) {
  const c = (e && e.code) || "";
  if (c.includes("permission-denied")) return "ليست لديك صلاحية لهذا الإجراء (أو البريد مرتبط بعيادة أخرى). تأكد أيضاً من نشر قواعد Firestore الجديدة v33.";
  if (c.includes("invalid-email")) return "البريد الإلكتروني غير صالح.";
  if (c.includes("weak-password")) return "كلمة المرور ضعيفة.";
  if (c.includes("operation-not-allowed")) return "تسجيل الدخول بالبريد وكلمة المرور غير مفعّل في Firebase Authentication.";
  if (c.includes("too-many-requests")) return "محاولات كثيرة، انتظر قليلاً ثم أعد المحاولة.";
  if (c.includes("unavailable") || c.includes("network")) return "لا يوجد اتصال بالإنترنت أو خدمة Firebase غير متاحة مؤقتاً.";
  if (c.includes("failed-precondition")) return "يحتاج Firebase إلى إنشاء فهرس لهذا الاستعلام — افتح الرابط الظاهر في وحدة التحكم (Console).";
  return (e && e.message) || "حدث خطأ";
}
function randomPassword() {
  const a = new Uint8Array(24); crypto.getRandomValues(a);
  return Array.from(a, (b) => b.toString(36)).join("") + "Aa1!";
}

// ---------- إضافة مستخدم (يُستخدم أيضاً عند إنشاء عيادة) ----------
async function addUser({ name, email, role, clinicId }) {
  email = String(email || "").trim().toLowerCase();
  name = String(name || "").trim();
  if (!name) throw new Error("أدخل اسم المستخدم");
  if (!EMAIL_RE.test(email)) throw new Error("البريد الإلكتروني غير صالح");
  if (!ROLES[role]) throw new Error("اختر الدور");
  if (!CLINIC_RE.test(clinicId)) throw new Error("معرّف العيادة غير صالح");

  // 1) منع التكرار: هل يوجد سجل UID بهذا البريد؟
  const q = me.isPlatformAdmin
    ? query(collection(db, "users"), where("email", "==", email))
    : query(collection(db, "users"), where("clinicId", "==", clinicId), where("email", "==", email));
  const found = await getDocs(q);
  if (!found.empty) {
    const fd = found.docs[0]; const d = fd.data();
    if (d.clinicId === clinicId) throw new Error("هذا المستخدم موجود بالفعل في العيادة — عدّله من الجدول.");
    // v33: platform admin can move an existing account (e.g. a mistyped clinicId) instead of duplicating it.
    if (!me.isPlatformAdmin) throw new Error("هذا البريد مسجّل بالفعل في عيادة أخرى.");
    if (!confirm("هذا البريد مسجّل حالياً في «" + d.clinicId + "».\nنقله إلى «" + clinicId + "» بدور " + ROLES[role] + "؟ (لن يُنشأ حساب جديد)")) throw new Error("تم الإلغاء.");
    await setDoc(doc(db, "clinicMembers", email), { clinicId, role, name, isActive: true, updatedAt: Date.now() }, { merge: true });
    await updateDoc(doc(db, "users", fd.id), { clinicId, role, name, isActive: true, updatedAt: Date.now() });
    return { uid: fd.id, existed: true, moved: true };
  }

  // 2) دعوة (bridge) باسم البريد — تتيح الدخول حتى لو كان حساب Firebase موجوداً مسبقاً.
  await setDoc(doc(db, "clinicMembers", email), {
    clinicId, role, name, isActive: true, invitedBy: me.uid, updatedAt: Date.now(),
  }, { merge: true });

  // 3) إنشاء حساب Firebase Authentication بتطبيق ثانوي (لا يُخرج المدير من جلسته)
  const second = initializeApp(app.options, "user-admin-" + Date.now());
  const secondAuth = getAuth(second);
  let uid = null, existed = false;
  try {
    const cred = await createUserWithEmailAndPassword(secondAuth, email, randomPassword());
    uid = cred.user.uid;
    try { await signOut(secondAuth); } catch (e) { /* ignore */ }
  } catch (e) {
    if (String(e && e.code).includes("email-already-in-use")) existed = true;
    else throw e;
  } finally {
    try { await deleteApp(second); } catch (e) { /* ignore */ }
  }

  // 4) سجل المستخدم الأساسي باسم UID
  if (uid) {
    await setDoc(doc(db, "users", uid), {
      email, name, role, clinicId, isActive: true,
      createdAt: Date.now(), updatedAt: Date.now(), createdBy: me.uid,
    });
  }
  // 5) بريد لتعيين كلمة المرور (دعوة آمنة، لا كلمات مرور محفوظة)
  let mailed = false;
  if (!existed) {
    try { await sendPasswordResetEmail(auth, email); mailed = true; } catch (e) { console.warn(e); }
  }
  return { uid, existed, mailed };
}

// ---------- قائمة المستخدمين ----------
async function loadUsers() {
  const tbody = $("usersTable").querySelector("tbody");
  tbody.innerHTML = '<tr><td colspan="6" class="muted">جارٍ التحميل…</td></tr>';
  if (!currentClinic) { tbody.innerHTML = ""; return; }
  try {
    const [us, ms] = await Promise.all([
      getDocs(query(collection(db, "users"), where("clinicId", "==", currentClinic))),
      getDocs(query(collection(db, "clinicMembers"), where("clinicId", "==", currentClinic))).catch(() => ({ docs: [] })),
    ]);
    const emails = new Set();
    rows = us.docs.map((d) => { const x = d.data(); emails.add(String(x.email || "").toLowerCase()); return Object.assign({ uid: d.id, kind: "uid" }, x); });
    ms.docs.forEach((d) => {
      if (emails.has(d.id)) return;
      rows.push(Object.assign({ email: d.id, kind: "pending" }, d.data()));
    });
    rows.sort((a, b) => String(a.email).localeCompare(String(b.email)));
    renderUsers();
  } catch (e) {
    tbody.innerHTML = `<tr><td colspan="6" style="color:#b91c1c">${esc(friendly(e))}</td></tr>`;
  }
}

function renderUsers() {
  const tbody = $("usersTable").querySelector("tbody");
  $("usersEmpty").style.display = rows.length ? "none" : "";
  tbody.innerHTML = rows.map((r, i) => {
    const active = r.isActive !== false;
    const state = r.kind === "pending"
      ? '<span style="color:#b45309">⏳ بانتظار التسجيل/أول دخول</span>'
      : (active ? '<span style="color:#15803d">✅ مفعّل</span>' : '<span style="color:#b91c1c">⛔ موقوف</span>');
    const roleOpts = Object.keys(ROLES).map((k) => `<option value="${k}"${r.role === k ? " selected" : ""}>${ROLES[k]}</option>`).join("");
    const locked = !ROLES[r.role]; // حساب مدير منصة — لا يُعدَّل من هنا
    return `<tr>
      <td><input class="u-name" data-i="${i}" value="${esc(r.name || "")}" ${locked ? "disabled" : ""} style="width:100%"></td>
      <td dir="ltr" style="text-align:right">${esc(r.email)}</td>
      <td>${locked ? esc(r.role) : `<select class="u-role" data-i="${i}">${roleOpts}</select>`}</td>
      <td>${me.isPlatformAdmin && !locked ? `<input class="u-clinic" data-i="${i}" value="${esc(r.clinicId)}" dir="ltr" style="width:110px">` : esc(r.clinicId)}</td>
      <td>${state}</td>
      <td>${locked ? "" : `
        <button class="btn small primary u-save" data-i="${i}" type="button">💾 حفظ</button>
        <button class="btn small ${active ? "danger" : "success"} u-toggle" data-i="${i}" type="button">${active ? "⛔ إيقاف" : "✅ تفعيل"}</button>
        ${me.isPlatformAdmin && r.uid !== me.uid ? `<button class="btn small ghost u-del" data-i="${i}" type="button" title="لمدير المنصة فقط — يحذف سجل الصلاحية نهائياً">🗑️ حذف نهائي</button>` : ""}`}
      </td></tr>`;
  }).join("");
  tbody.querySelectorAll(".u-save").forEach((b) => b.addEventListener("click", () => saveRow(Number(b.dataset.i), {})));
  tbody.querySelectorAll(".u-del").forEach((b) => b.addEventListener("click", () => removeRow(Number(b.dataset.i))));
  tbody.querySelectorAll(".u-toggle").forEach((b) => b.addEventListener("click", () => {
    const r = rows[Number(b.dataset.i)];
    const next = r.isActive === false;
    if (!next && r.uid === me.uid) { alert("لا يمكنك إيقاف حسابك الحالي."); return; }
    if (!confirm(next ? "تفعيل هذا الحساب؟" : "إيقاف هذا الحساب؟ لن يستطيع الدخول أو رؤية بيانات العيادة.")) return;
    saveRow(Number(b.dataset.i), { isActive: next });
  }));
}

async function saveRow(i, extra) {
  const r = rows[i]; if (!r) return;
  const tr = $("usersTable").querySelectorAll("tbody tr")[i];
  const name = tr.querySelector(".u-name").value.trim() || r.name || "";
  const role = tr.querySelector(".u-role").value;
  const clinicInput = tr.querySelector(".u-clinic");
  const clinicId = clinicInput ? clinicInput.value.trim().toLowerCase() : r.clinicId;
  if (!CLINIC_RE.test(clinicId)) { msg("usersMsg", "معرّف العيادة غير صالح"); return; }
  if (r.uid === me.uid && role !== "admin" && !me.isPlatformAdmin) { msg("usersMsg", "لا يمكنك إزالة صلاحية المدير عن حسابك."); return; }
  if (!me.isPlatformAdmin && clinicId !== r.clinicId) { msg("usersMsg", "لا يمكن نقل مستخدم إلى عيادة أخرى."); return; }
  const patch = Object.assign({ name, role, clinicId, updatedAt: Date.now(), updatedBy: me.uid }, extra);
  if (r.kind === "uid" && !("isActive" in patch)) patch.isActive = r.isActive !== false;
  try {
    // v33: both records are always written and kept identical, so the automatic
    // login repair can never undo an administrator's change.
    await setDoc(doc(db, "clinicMembers", String(r.email).toLowerCase()), patch, { merge: true });
    if (r.kind === "uid") await setDoc(doc(db, "users", r.uid), patch, { merge: true });
    msg("usersMsg", "تم الحفظ ✓", true);
    loadUsers();
  } catch (e) { msg("usersMsg", friendly(e)); }
}

// v34: الحذف النهائي لمدير المنصة فقط. الطريقة الموصى بها هي «⛔ إيقاف» (isActive=false)
// لأنها تحفظ السجل للمراجعة. الحذف يزيل سجل الصلاحية فقط — لا يمس بيانات المرضى
// ولا يحذف حساب Firebase Authentication.
async function removeRow(i) {
  const r = rows[i]; if (!r || !me.isPlatformAdmin) return;
  if (r.uid === me.uid) { alert("لا يمكنك حذف حسابك الحالي."); return; }
  if (!confirm("⚠️ حذف نهائي لسجل الصلاحية الخاص بـ " + r.email + "؟\nيُفضّل استخدام «⛔ إيقاف» بدلاً من الحذف للاحتفاظ بالسجل.\nلن تُحذف أي بيانات مرضى أو حجوزات.")) return;
  if (prompt("للتأكيد اكتب: حذف") !== "حذف") { msg("usersMsg", "تم الإلغاء."); return; }
  try {
    await deleteDoc(doc(db, "clinicMembers", String(r.email).toLowerCase()));
    if (r.kind === "uid") await deleteDoc(doc(db, "users", r.uid));
    msg("usersMsg", "تم الحذف النهائي ✓", true);
    loadUsers();
  } catch (e) { msg("usersMsg", friendly(e)); }
}

// ---------- v34: ترحيل/إصلاح الحسابات الحالية (مدير المنصة فقط) ----------
// المصدر: legacy-accounts.js (قائمة مرجعية فقط — لا تُستخدم في تسجيل الدخول).
// لكل بريد: يبحث عن users/{uid} بنفس البريد، ويفحص clinicMembers، ثم:
//  • ينشئ/يصحح clinicMembers/{email} (الجسر الذي يُنشئ users/{uid} عند أول دخول).
//  • يصحح users/{uid} إن كان معرّف العيادة خاطئاً بوضوح (مثل clicin-admin1) أو
//    كان مدير العيادة محفوظاً كـ«طبيب» بسبب نسخة الموقع القديمة.
//  • أي عيادة مختلفة «صالحة» = تعارض: لا يُعدَّل إلا بعد تأكيد صريح منفصل.
//  • الحسابات الموقوفة عمداً (isActive=false) لا تُلمس.
// لا يحذف شيئاً ولا يلمس بيانات المرضى أو الحجوزات.
// ملاحظة: متصفح الويب لا يستطيع البحث في Firebase Authentication بالبريد.
// لذلك «حساب Authentication» = نعم عندما يوجد users/{uid} (يُنشأ فقط من حساب حقيقي)،
// وإلا «غير مؤكد» إلى أن يسجّل المستخدم الدخول مرة واحدة.
const VALID_CLINIC = /^clinic[0-9]+$/;
let lastReport = [];

async function migrateLegacy() {
  const out = $("umReport");
  msg("usersMsg", "جارٍ فحص الحسابات القديمة…", true);
  let knownClinics = new Set();
  try { (await getDocs(collection(db, "clinics"))).docs.forEach((d) => knownClinics.add(d.id)); } catch (e) { /* optional */ }
  const isRealClinic = (id) => !!id && (VALID_CLINIC.test(id) || knownClinics.has(id));
  const report = [];
  const actions = []; // {row, kind:'member'|'user', uid?, target, conflict}
  try {
    for (const [email, L] of Object.entries(LEGACY_ACCOUNTS)) {
      const row = { email, expectedClinic: L.clinicId, expectedRole: L.role, auth: "غير مؤكد", uid: "", userDoc: "لا",
        memberDoc: "لا", clinicId: "", role: "", active: "", status: "" };
      report.push(row);
      if (PLATFORM_EMAILS.includes(email)) { row.status = "مدير المنصة — لا يحتاج ترحيل"; row.auth = "نعم"; continue; }
      const m = await getDoc(doc(db, "clinicMembers", email));
      const md = m.exists() ? m.data() : null;
      if (md) row.memberDoc = "نعم (" + (md.clinicId || "—") + "/" + (md.role || "—") + (md.isActive === false ? "/موقوف" : "") + ")";
      const us = await getDocs(query(collection(db, "users"), where("email", "==", email)));
      const u = us.docs[0] || null; const ud = u ? u.data() : null;
      if (us.docs.length > 1) row.status = "⚠️ أكثر من سجل users بنفس البريد — ";
      if (u) { row.auth = "نعم"; row.uid = u.id; row.userDoc = "نعم"; }

      const cur = ud || md;
      row.clinicId = cur ? (cur.clinicId || "—") : "—";
      row.role = cur ? (cur.role || "—") : "—";
      row.active = cur ? (cur.isActive === false ? "لا" : "نعم") : "—";

      if ((ud && ud.isActive === false) || (!ud && md && md.isActive === false)) { row.status += "⛔ موقوف عمداً — لم يُعدَّل"; continue; }
      if (ud && ["superadmin", "super_admin"].includes(ud.role)) { row.status += "مدير منصة — لم يُعدَّل"; continue; }

      // target: keep an intentional valid assignment, else the legacy one
      let target = { clinicId: L.clinicId, role: L.role };
      let conflict = "";
      if (cur && cur.clinicId && cur.clinicId !== L.clinicId) {
        if (isRealClinic(cur.clinicId)) { conflict = "مرتبط حالياً بعيادة صالحة أخرى «" + cur.clinicId + "»"; }
      } else if (cur && ROLES[cur.role] && cur.role !== L.role && !(L.role === "admin" && cur.role === "doctor")) {
        conflict = "دور مختلف حالياً «" + cur.role + "»"; // possibly changed on purpose
      }
      const name = (cur && cur.name) || email.split("@")[0];
      const memberOk = md && md.clinicId === target.clinicId && md.role === target.role && md.isActive !== false;
      const userOk = ud && ud.clinicId === target.clinicId && ud.role === target.role && ud.isActive === true;
      if (!memberOk) actions.push({ row, kind: "member", email, target, name, conflict });
      if (ud && !userOk) actions.push({ row, kind: "user", uid: u.id, email, target, name, conflict });
      if (memberOk && userOk) row.status += "✅ مكتمل — يستطيع الوصول لبيانات " + target.clinicId;
      else if (conflict) row.status += "⚠️ تعارض: " + conflict;
      else row.status += ud ? "سيُصحَّح سجل users" : (memberOk ? "⏳ جاهز — يكتمل عند أول تسجيل دخول" : "سيُنشأ سجل clinicMembers");
    }
  } catch (e) { msg("usersMsg", friendly(e)); return; }

  const safe = actions.filter((a) => !a.conflict);
  const risky = actions.filter((a) => a.conflict);
  let apply = [];
  if (safe.length && confirm("سيتم إنشاء/تصحيح " + safe.length + " سجل آمن (بدون تعارض).\nلن يُحذف أي شيء. متابعة؟")) apply = apply.concat(safe);
  if (risky.length) {
    const list = [...new Set(risky.map((a) => "• " + a.email + ": " + a.conflict + " ← " + a.target.clinicId + "/" + a.target.role))].slice(0, 20).join("\n");
    if (confirm("⚠️ " + new Set(risky.map((a) => a.email)).size + " حساب مرتبط حالياً بشكل مختلف (ربما عمداً):\n" + list + "\n\nهل تريد إعادتهم إلى العيادة/الدور الأصلي؟ (إلغاء = تركهم كما هم)")) apply = apply.concat(risky);
  }
  let ok = 0, bad = 0;
  for (const a of apply) {
    try {
      const base = Object.assign({ isActive: true, updatedAt: Date.now(), updatedBy: me.uid }, a.target);
      if (a.kind === "member") await setDoc(doc(db, "clinicMembers", a.email), Object.assign({ name: a.name }, base), { merge: true });
      else await updateDoc(doc(db, "users", a.uid), base);
      ok++;
      a.row.status = a.kind === "user" || a.row.userDoc === "نعم"
        ? "✅ تم الإصلاح — users/{uid} = " + a.target.clinicId + "/" + a.target.role
        : "⏳ تم إنشاء الدعوة — يكتمل users/{uid} عند أول تسجيل دخول";
      a.row.clinicId = a.target.clinicId; a.row.role = a.target.role; a.row.active = "نعم";
    } catch (e) { bad++; a.row.status = "❌ فشل: " + friendly(e); console.warn("[migrate]", a, e); }
  }
  lastReport = report;
  renderReport();
  msg("usersMsg", apply.length ? ("تم تنفيذ " + ok + " تعديل" + (bad ? " — فشل " + bad : "") + ". على المستخدمين تسجيل الخروج ثم الدخول.") : "تم الفحص — لم يُنفَّذ أي تعديل.", !bad);
  loadUsers();
}

function renderReport() {
  const out = $("umReport"); if (!out) return;
  const cols = [["email", "البريد"], ["auth", "حساب Authentication"], ["uid", "UID"], ["userDoc", "users/{uid}"], ["memberDoc", "clinicMembers"],
    ["clinicId", "العيادة"], ["role", "الدور"], ["active", "مفعّل"], ["status", "الحالة"]];
  out.innerHTML = '<div style="display:flex;gap:8px;align-items:center;margin:10px 0"><strong>تقرير الترحيل</strong>' +
    '<button class="btn small ghost" id="umReportCsv" type="button">⬇️ تنزيل CSV</button></div>' +
    '<div class="table-wrap"><table><thead><tr>' + cols.map((c) => "<th>" + c[1] + "</th>").join("") + "</tr></thead><tbody>" +
    lastReport.map((r) => "<tr>" + cols.map((c) => '<td dir="auto">' + esc(r[c[0]]) + "</td>").join("") + "</tr>").join("") +
    "</tbody></table></div>";
  $("umReportCsv").addEventListener("click", () => {
    const csv = [cols.map((c) => c[0]).join(",")].concat(lastReport.map((r) => cols.map((c) => '"' + String(r[c[0]] ?? "").replace(/"/g, '""') + '"').join(","))).join("\n");
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob(["\ufeff" + csv], { type: "text/csv" }));
    a.download = "migration-report.csv"; a.click();
  });
}

// ---------- العيادات (مدير المنصة فقط) ----------
async function loadClinics() {
  const sel = $("umClinic");
  const tbody = $("clinicsTable").querySelector("tbody");
  let list = [];
  try {
    const snap = await getDocs(collection(db, "clinics"));
    list = snap.docs.map((d) => Object.assign({ id: d.id }, d.data()));
  } catch (e) { msg("clinicsMsg", friendly(e)); }
  list.sort((a, b) => a.id.localeCompare(b.id, "en", { numeric: true }));
  tbody.innerHTML = list.map((c) => `<tr>
    <td dir="ltr" style="text-align:right">${esc(c.id)}</td><td>${esc(c.name || "")}</td>
    <td>${esc(c.adminName || "")}</td><td dir="ltr" style="text-align:right">${esc(c.adminEmail || "")}</td>
    <td><button class="btn small ghost c-open" data-id="${esc(c.id)}" type="button">👥 المستخدمون</button></td></tr>`).join("");
  $("clinicsEmpty").style.display = list.length ? "none" : "";
  tbody.querySelectorAll(".c-open").forEach((b) => b.addEventListener("click", () => {
    $("umClinicInput").value = b.dataset.id; setClinic(b.dataset.id);
    $("usersSection").scrollIntoView({ behavior: "smooth" });
  }));
  sel.innerHTML = list.map((c) => `<option value="${esc(c.id)}">`).join("");
}

function setClinic(id) {
  currentClinic = String(id || "").trim().toLowerCase();
  $("umCurrentClinic").textContent = currentClinic || "—";
  loadUsers();
}

async function createClinic() {
  msg("clinicsMsg", "");
  const id = $("cId").value.trim().toLowerCase();
  const name = $("cName").value.trim();
  const adminName = $("cAdminName").value.trim();
  const adminEmail = $("cAdminEmail").value.trim().toLowerCase();
  if (!CLINIC_RE.test(id)) { msg("clinicsMsg", "معرّف العيادة: حروف إنجليزية صغيرة وأرقام فقط، مثل clinic20"); return; }
  if (!name) { msg("clinicsMsg", "أدخل اسم العيادة"); return; }
  if (!adminName || !EMAIL_RE.test(adminEmail)) { msg("clinicsMsg", "أدخل اسم وبريد مدير العيادة"); return; }
  const btn = $("cCreateBtn"); btn.disabled = true;
  try {
    const ref = doc(db, "clinics", id);
    if ((await getDoc(ref)).exists()) throw new Error("هذه العيادة موجودة بالفعل — لم يتم تغيير أي بيانات.");
    await setDoc(ref, { clinicId: id, name, adminName, adminEmail, isActive: true, createdAt: Date.now(), createdBy: me.uid });
    const r = await addUser({ name: adminName, email: adminEmail, role: "admin", clinicId: id });
    msg("clinicsMsg", `تم إنشاء ${id} ✓ ` + (r.existed ? "(الحساب موجود مسبقاً — يدخل بكلمة مروره الحالية)" : "وأُرسل للمدير بريد لتعيين كلمة المرور."), true);
    ["cId", "cName", "cAdminName", "cAdminEmail"].forEach((k) => ($(k).value = ""));
    await loadClinics();
    $("umClinicInput").value = id; setClinic(id);
  } catch (e) { msg("clinicsMsg", friendly(e)); }
  btn.disabled = false;
}

// يسجّل العيادات القديمة (clinic1…clinic19) في القائمة دون لمس بياناتها
async function registerExisting() {
  msg("clinicsMsg", "جارٍ التسجيل…", true);
  let n = 0;
  for (let i = 1; i <= 19; i++) {
    const id = "clinic" + i;
    try {
      const ref = doc(db, "clinics", id);
      if (!(await getDoc(ref)).exists()) {
        await setDoc(ref, { clinicId: id, name: id, isActive: true, createdAt: Date.now(), legacy: true });
        n++;
      }
    } catch (e) { msg("clinicsMsg", friendly(e)); return; }
  }
  msg("clinicsMsg", `تم تسجيل ${n} عيادة. البيانات الحالية لم تتغير.`, true);
  loadClinics();
}

// ---------- التهيئة ----------
document.addEventListener("auth:ready", (ev) => {
  me = ev.detail;
  if (!me || !(me.isPlatformAdmin || me.role === "admin")) return;
  $("usersSection").style.display = "";
  if (me.isPlatformAdmin) {
    $("clinicsSection").style.display = "";
    $("umClinicPicker").style.display = "";
    loadClinics();
    $("cCreateBtn").addEventListener("click", createClinic);
    $("cImportBtn").addEventListener("click", registerExisting);
    const rb = $("umRepairBtn"); if (rb) { rb.style.display = ""; rb.addEventListener("click", migrateLegacy); }
    $("umClinicInput").addEventListener("change", (e) => setClinic(e.target.value));
    const start = me.clinicId && me.clinicId !== "__platform__" ? me.clinicId : "";
    $("umClinicInput").value = start;
    setClinic(start);
  } else {
    setClinic(me.clinicId);
  }
  $("umAddBtn").addEventListener("click", async () => {
    msg("usersMsg", "");
    const btn = $("umAddBtn"); btn.disabled = true;
    try {
      const r = await addUser({
        name: $("umName").value, email: $("umEmail").value, role: $("umRole").value, clinicId: currentClinic,
      });
      msg("usersMsg", r.moved ? "تم نقل الحساب الموجود إلى هذه العيادة ✓ — يسجّل الخروج ثم الدخول." : r.existed
        ? "تمت الإضافة ✓ — الحساب موجود مسبقاً في Firebase؛ يدخل بكلمة مروره الحالية وسيُربط تلقائياً."
        : "تمت الإضافة ✓ — أُرسل للمستخدم بريد لتعيين كلمة المرور.", true);
      $("umName").value = ""; $("umEmail").value = "";
      loadUsers();
    } catch (e) { msg("usersMsg", friendly(e)); }
    btn.disabled = false;
  });
});
