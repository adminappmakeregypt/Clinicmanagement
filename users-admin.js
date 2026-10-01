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
  doc, getDoc, setDoc, collection, getDocs, query, where,
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

const $ = (id) => document.getElementById(id);
const ROLES = { admin: "مدير", user: "مستخدم", doctor: "طبيب" };
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
  if (c.includes("permission-denied")) return "ليست لديك صلاحية لهذا الإجراء (أو البريد مرتبط بعيادة أخرى).";
  if (c.includes("invalid-email")) return "البريد الإلكتروني غير صالح.";
  if (c.includes("network")) return "لا يوجد اتصال بالإنترنت.";
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
    const d = found.docs[0].data();
    if (d.clinicId !== clinicId) throw new Error("هذا البريد مسجّل بالفعل في عيادة أخرى: " + d.clinicId);
    throw new Error("هذا المستخدم موجود بالفعل في العيادة — عدّله من الجدول.");
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
      ? '<span class="muted">بانتظار أول دخول</span>'
      : (active ? '<span style="color:#15803d">مفعّل</span>' : '<span style="color:#b91c1c">موقوف</span>');
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
        <button class="btn small ${active ? "danger" : "success"} u-toggle" data-i="${i}" type="button">${active ? "⛔ إيقاف" : "✅ تفعيل"}</button>`}
      </td></tr>`;
  }).join("");
  tbody.querySelectorAll(".u-save").forEach((b) => b.addEventListener("click", () => saveRow(Number(b.dataset.i), {})));
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
  const patch = Object.assign({ name, role, clinicId, updatedAt: Date.now() }, extra);
  try {
    if (r.kind === "uid") await setDoc(doc(db, "users", r.uid), patch, { merge: true });
    // نُحدّث سجل الدعوة أيضاً ليبقى متطابقاً (لا يمنح صلاحية إذا وُجد سجل UID)
    await setDoc(doc(db, "clinicMembers", String(r.email).toLowerCase()), patch, { merge: true })
      .catch((e) => { if (r.kind !== "uid") throw e; });
    msg("usersMsg", "تم الحفظ ✓", true);
    loadUsers();
  } catch (e) { msg("usersMsg", friendly(e)); }
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
      msg("usersMsg", r.existed
        ? "تمت الإضافة ✓ — الحساب موجود مسبقاً في Firebase؛ يدخل بكلمة مروره الحالية وسيُربط تلقائياً."
        : "تمت الإضافة ✓ — أُرسل للمستخدم بريد لتعيين كلمة المرور.", true);
      $("umName").value = ""; $("umEmail").value = "";
      loadUsers();
    } catch (e) { msg("usersMsg", friendly(e)); }
    btn.disabled = false;
  });
});
