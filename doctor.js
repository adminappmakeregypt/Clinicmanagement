// ============ صفحة الطبيب (Doctor page) ============
// الطبيب يختار المريض + التخصص، فتظهر مميزات هذا التخصص (نفس نموذج الأسنان مثلاً)
// ويمكنه إضافة أكثر من تسجيل، لكل تسجيل تاريخ زيارة، وتظهر كلها في التاريخ المرضي.
//
// التخزين داخل نفس مشروع Firebase الحالي (بدون بنية جديدة):
//   Firestore: clinics/{clinicId}/patientRecords/{patientId}  ->  { records: [...] }
//   الملفات   : attachments.js (Firebase Storage)
// نسخة محلية في localStorage: clinic_patient_records_v1

import { auth, db } from "./firebase-config.js?v=1";
import {
  doc, getDoc, setDoc, collection, getDocs,
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

const CLINIC_ID = window.CLINIC_ID || "__anon__";
const ck = window.clinicKey || ((n) => n);
const LOCAL_KEY = ck("clinic_patient_records_v1");
const BOOKINGS_KEY = ck("clinic_bookings_v1");

const $ = (s) => document.querySelector(s);
const esc = (s) =>
  (s == null ? "" : String(s)).replace(/[&<>"']/g, (c) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
  }[c]));

const today = () => new Date().toISOString().slice(0, 10);

/* ---------- patients (from the existing bookings) ---------- */
function normPhone(p) { return (p || "").toString().replace(/\D/g, ""); }

let cloudPatients = [];   // patients known from the cloud records (any device)

function allPatients() {
  let list = [];
  try { list = JSON.parse(localStorage.getItem(BOOKINGS_KEY) || "[]"); } catch { list = []; }
  const map = new Map();
  list.forEach((b) => {
    const key = (normPhone(b.phone) || "") + "|" + ((b.fullName || "").trim().toLowerCase());
    if (!map.has(key)) {
      map.set(key, { key, fullName: b.fullName || "-", phone: b.phone || "", visits: 0, last: "" });
    }
    const p = map.get(key);
    p.visits++;
    const d = b.appointmentDate || "";
    if (d > p.last) p.last = d;
  });
  // add patients that exist in the cloud history but not in this browser's bookings
  cloudPatients.forEach((c) => {
    const key = (normPhone(c.phone) || "") + "|" + ((c.fullName || "").trim().toLowerCase());
    if (!map.has(key)) {
      map.set(key, { key, fullName: c.fullName || "-", phone: c.phone || "", visits: 0, last: "", docId: c.docId });
    } else {
      map.get(key).docId = map.get(key).docId || c.docId;
    }
  });
  return Array.from(map.values()).sort((a, b) => a.fullName.localeCompare(b.fullName, "ar"));
}

// Read every patient-record document once so the doctor page works on a new
// device even before the local bookings copy has finished syncing.
async function loadCloudPatients() {
  if (!auth.currentUser) return;
  try {
    const snap = await getDocs(collection(db, "clinics", CLINIC_ID, "patientRecords"));
    cloudPatients = [];
    snap.forEach((d) => {
      const data = d.data() || {};
      localPut(d.id, data);
      cloudPatients.push({
        docId: d.id,
        patientKey: data.patientKey || "",
        fullName: data.patientName || "",
        phone: data.phone || "",
      });
    });
  } catch (e) {
    console.warn("Could not read patient records list:", e && e.message);
  }
}

function docId(patient) {
  const raw = (patient && (patient.key || patient.phone || patient.fullName)) || "unknown";
  return String(raw).replace(/[^\w\u0600-\u06FF]+/g, "_").slice(0, 120) || "unknown";
}

/* ---------- storage ---------- */
function localAll() {
  try { return JSON.parse(localStorage.getItem(LOCAL_KEY) || "{}"); } catch { return {}; }
}
function localPut(id, data) {
  const all = localAll();
  all[id] = data;
  try { localStorage.setItem(LOCAL_KEY, JSON.stringify(all)); } catch {}
}

let lastLoadError = "";

async function loadRecords(id, patientObj) {
  lastLoadError = "";
  const cached = localAll()[id] || null;
  try {
    if (auth.currentUser) {
      const snap = await getDoc(doc(db, "clinics", CLINIC_ID, "patientRecords", id));
      if (snap.exists()) {
        const data = snap.data();
        localPut(id, data);
        return Array.isArray(data.records) ? data.records : [];
      }
      // Not found under this id: the record may have been saved on another
      // device with a slightly different name/phone spelling. Match it.
      const alt = await findCloudRecords(patientObj);
      if (alt) return alt;
    } else {
      lastLoadError = "لم يتم تسجيل الدخول — يعرض النسخة المحلية فقط.";
    }
  } catch (e) {
    lastLoadError = "تعذر قراءة التاريخ المرضي من السحابة: " + (e && e.message ? e.message : "خطأ");
    console.warn(lastLoadError);
  }
  return cached && Array.isArray(cached.records) ? cached.records : [];
}

async function findCloudRecords(p) {
  if (!p) return null;
  const phone = normPhone(p.phone);
  const name = (p.fullName || "").trim().toLowerCase();
  try {
    const snap = await getDocs(collection(db, "clinics", CLINIC_ID, "patientRecords"));
    let found = null;
    snap.forEach((d) => {
      if (found) return;
      const data = d.data() || {};
      const sameKey = data.patientKey && p.key && data.patientKey === p.key;
      const samePhone = phone && normPhone(data.phone) === phone;
      const sameName = name && (data.patientName || "").trim().toLowerCase() === name;
      if (sameKey || samePhone || sameName) {
        localPut(d.id, data);
        found = Array.isArray(data.records) ? data.records : [];
      }
    });
    return found;
  } catch (e) {
    lastLoadError = "تعذر البحث في التاريخ المرضي: " + (e && e.message ? e.message : "خطأ");
    console.warn(lastLoadError);
    return null;
  }
}

async function saveRecords(id, patient, records) {
  const data = {
    id,
    patientKey: patient.key || "",
    patientName: patient.fullName || "",
    phone: patient.phone || "",
    records,
    updatedAt: new Date().toISOString(),
    updatedBy: (auth.currentUser && auth.currentUser.email) || "",
  };
  localPut(id, data);
  if (!auth.currentUser) throw new Error("not-signed-in");
  await setDoc(doc(db, "clinics", CLINIC_ID, "patientRecords", id), data);
}

/* ---------- state ---------- */
let patients = [];
let patient = null;
let records = [];
let specialtyId = null;
let editingId = null;   // معرّف التسجيل الجاري تعديله (null = تسجيل جديد)

/* ---------- UI ---------- */
function renderPatientOptions() {
  patients = allPatients();
  const dl = $("#dpPatients");
  dl.innerHTML = patients
    .map((p) => `<option value="${esc(p.fullName + (p.phone ? " — " + p.phone : ""))}"></option>`)
    .join("");
}

function findPatient(text) {
  const t = (text || "").trim().toLowerCase();
  if (!t) return null;
  const digits = normPhone(t);
  return (
    patients.find((p) => (p.fullName + " — " + p.phone).toLowerCase() === t) ||
    (digits && patients.find((p) => normPhone(p.phone) === digits)) ||
    patients.find((p) => p.fullName.toLowerCase() === t) ||
    patients.find((p) => p.fullName.toLowerCase().includes(t)) ||
    null
  );
}

function renderSpecialtySelect() {
  const SP = window.ClinicSpecialty;
  const sel = $("#dpSpecialty");
  specialtyId = specialtyId || SP.currentId();
  sel.innerHTML = SP.list()
    .map((s) => `<option value="${s.id}"${s.id === specialtyId ? " selected" : ""}>${s.icon} ${esc(s.label)}</option>`)
    .join("");
}

function renderForm(values) {
  const SP = window.ClinicSpecialty;
  const box = $("#dpForm");
  box.innerHTML = SP.formHtml(values || {}, specialtyId);
  SP.wire(box, specialtyId);
}

function renderHistory() {
  const SP = window.ClinicSpecialty;
  const tbody = $("#dpHistory tbody");
  const sorted = records.slice().sort((a, b) => (b.visitDate || "").localeCompare(a.visitDate || ""));
  tbody.innerHTML = sorted
    .map((r) => {
      const rows = SP.summaryRows(r.exam) || [];
      const brief = rows.slice(0, 2).map((x) => x[0] + ": " + x[1]).join(" — ");
      return `<tr>
        <td>${esc(r.visitDate || "—")}</td>
        <td>${esc(r.label || "")}</td>
        <td>${esc(r.doctor || "—")}</td>
        <td>${esc(brief || "—")}</td>
        <td>
          <button class="btn primary small" type="button" data-view="${esc(r.id)}">👁️ عرض</button>
          <button class="btn ghost small" type="button" data-edit="${esc(r.id)}">✏️ تعديل</button>
          <button class="btn ghost small" type="button" data-del="${esc(r.id)}">🗑️ حذف</button>
        </td>
      </tr>`;
    })
    .join("");
  $("#dpHistoryEmpty").style.display = sorted.length ? "none" : "";
  $("#dpHistoryCount").textContent = sorted.length;

  tbody.querySelectorAll("button[data-view]").forEach((b) =>
    b.addEventListener("click", () => viewRecord(b.getAttribute("data-view")))
  );
  tbody.querySelectorAll("button[data-edit]").forEach((b) =>
    b.addEventListener("click", () => editRecord(b.getAttribute("data-edit")))
  );
  tbody.querySelectorAll("button[data-del]").forEach((b) =>
    b.addEventListener("click", () => removeRecord(b.getAttribute("data-del")))
  );
}

function modal(title, bodyHtml) {
  document.querySelectorAll(".rx-overlay.dc-overlay").forEach((n) => n.remove());
  const ov = document.createElement("div");
  ov.className = "rx-overlay dc-overlay";
  ov.innerHTML = `
    <div class="rx-modal" role="dialog" aria-modal="true">
      <div class="rx-modal-head">
        <h2>${title}</h2>
        <button type="button" class="btn ghost small rx-close">✖</button>
      </div>
      <div class="rx-modal-body">${bodyHtml}</div>
      <div class="rx-modal-foot">
        <button type="button" class="btn ghost small rx-close2">إغلاق</button>
      </div>
    </div>`;
  document.body.appendChild(ov);
  const close = () => ov.remove();
  ov.querySelector(".rx-close").addEventListener("click", close);
  ov.querySelector(".rx-close2").addEventListener("click", close);
  ov.addEventListener("click", (e) => { if (e.target === ov) close(); });
  return ov;
}

function viewRecord(id) {
  const SP = window.ClinicSpecialty;
  const r = records.find((x) => x.id === id);
  if (!r) return;
  const rows = SP.summaryRows(r.exam) || [];
  const body =
    `<div class="dc-head">
       <div><strong>المريض:</strong> ${esc(r.patientName || (patient && patient.fullName) || "-")}</div>
       <div><strong>تاريخ الزيارة:</strong> ${esc(r.visitDate || "—")}</div>
       <div><strong>التخصص:</strong> ${esc(r.label || "")}</div>
       <div><strong>الطبيب:</strong> ${esc(r.doctor || "—")}</div>
     </div>` +
    (rows.length
      ? `<table class="rx-view-table"><tbody>${rows
          .map((x) => `<tr><th>${esc(x[0])}</th><td>${esc(x[1])}</td></tr>`)
          .join("")}</tbody></table>`
      : `<p class="muted">لا توجد بيانات فحص.</p>`) +
    (SP.detailHtml(r.exam) || "");
  modal("📄 تسجيل زيارة", body);
}

async function removeRecord(id) {
  if (!patient) return;
  if (!confirm("حذف هذا التسجيل نهائياً؟")) return;
  if (editingId === id) cancelEdit();
  records = records.filter((x) => x.id !== id);
  try { await saveRecords(docId(patient), patient, records); } catch (e) { console.warn(e); }
  renderHistory();
}

/* ---------- تعديل تسجيل موجود ---------- */
function setSaveBtnLabel() {
  const b = $("#dpSaveBtn");
  if (b) b.textContent = editingId ? "💾 حفظ التعديلات" : "💾 حفظ التسجيل";
  const c = $("#dpCancelEdit");
  if (c) c.style.display = editingId ? "" : "none";
  const h = $("#dpFormTitle");
  if (h) h.textContent = editingId ? "✏️ تعديل تسجيل" : "➕ تسجيل زيارة جديدة";
}

function editRecord(id) {
  const r = records.find((x) => x.id === id);
  if (!r) return;
  editingId = id;
  specialtyId = r.specialty || specialtyId;
  renderSpecialtySelect();
  $("#dpVisitDate").value = r.visitDate || today();
  $("#dpDoctor").value = r.doctor || "";
  renderForm(r.exam || {});
  setSaveBtnLabel();
  $("#dpStatus").textContent = "وضع التعديل: عدّل البيانات ثم اضغط «حفظ التعديلات».";
  $("#dpPatientCard").scrollIntoView({ behavior: "smooth", block: "start" });
}

function cancelEdit() {
  editingId = null;
  renderForm({});
  setSaveBtnLabel();
  $("#dpStatus").textContent = "";
}

async function selectPatient(p) {
  patient = p;
  editingId = null;
  setSaveBtnLabel();
  $("#dpPatientCard").style.display = p ? "" : "none";
  if (!p) return;
  $("#dpName").textContent = p.fullName;
  $("#dpPhone").textContent = p.phone || "-";
  $("#dpVisits").textContent = p.visits || 0;
  $("#dpStatus").textContent = "جارٍ تحميل التاريخ المرضي...";
  records = await loadRecords(p.docId || docId(p), p);
  $("#dpStatus").textContent = lastLoadError || "";
  renderHistory();
  renderPatientRx();
}

async function saveNew() {
  const SP = window.ClinicSpecialty;
  if (!patient) { alert("اختر المريض أولاً."); return; }
  const visitDate = $("#dpVisitDate").value || today();
  const collected = SP.collect($("#dpForm"), specialtyId);
  if (!collected) { alert("من فضلك املأ بيانات الفحص أولاً."); return; }

  const status = $("#dpStatus");
  const wasEditing = editingId;

  if (wasEditing) {
    const r = records.find((x) => x.id === wasEditing);
    if (!r) { editingId = null; setSaveBtnLabel(); return; }
    r.visitDate = visitDate;
    r.specialty = specialtyId;
    r.label = collected.label;
    r.doctor = ($("#dpDoctor").value || "").trim();
    r.patientName = patient.fullName;
    r.exam = collected;
    r.updatedAt = new Date().toISOString();
    r.updatedBy = (auth.currentUser && auth.currentUser.email) || "";
  } else {
    records.push({
      id: "r" + Date.now(),
      visitDate,
      specialty: specialtyId,
      label: collected.label,
      doctor: ($("#dpDoctor").value || "").trim(),
      patientName: patient.fullName,
      exam: collected,
      createdAt: new Date().toISOString(),
      createdBy: (auth.currentUser && auth.currentUser.email) || "",
    });
  }

  status.textContent = "جارٍ الحفظ...";
  try {
    await saveRecords(docId(patient), patient, records);
    status.textContent = wasEditing ? "تم حفظ التعديلات ✔" : "تم حفظ التسجيل ✔";
  } catch (e) {
    console.warn(e);
    status.textContent = "تم الحفظ محلياً فقط (تعذر الاتصال).";
  }
  editingId = null;
  renderHistory();
  renderForm({});
  setSaveBtnLabel();
  setTimeout(() => { status.textContent = ""; }, 2500);
}


/* ---------- 💊 الروشتات الإلكترونية ---------- */
function rxReady() {
  if (window.RX) return true;
  alert("جارٍ تحميل وحدة الروشتة، حاول بعد لحظة.");
  return false;
}

function rxRow(rx, withPatient) {
  return `<tr>
    <td>${esc(rx.number)}</td>
    ${withPatient ? `<td>${esc(rx.patientName)}</td><td>${esc(rx.patientPhone || "-")}</td>` : ""}
    <td>${esc(rx.issueDate || "-")}</td>
    <td>${esc(rx.visitDate || "-")}</td>
    <td>${esc(rx.doctor || "-")}</td>
    ${withPatient ? "" : `<td>${(rx.medications || []).length}</td>`}
    <td>
      <button class="btn ghost small rx-view" type="button">👁 عرض</button>
      <button class="btn primary small rx-pdf" type="button">📄 PDF</button>
    </td>
  </tr>`;
}

function wireRxButtons(tbody, list) {
  Array.from(tbody.querySelectorAll("tr")).forEach((tr, i) => {
    const rx = list[i];
    if (!rx) return;
    tr.querySelector(".rx-view").addEventListener("click", () => window.RX.view(rx));
    tr.querySelector(".rx-pdf").addEventListener("click", () => window.RX.pdf(rx));
  });
}

let patientRx = [];
async function renderPatientRx() {
  const tbody = $("#dpRxTable tbody");
  if (!tbody || !window.RX || !patient) return;
  patientRx = await window.RX.listForPatient(patient);
  tbody.innerHTML = patientRx.map((rx) => rxRow(rx, false)).join("");
  wireRxButtons(tbody, patientRx);
  $("#dpRxCount").textContent = patientRx.length;
  $("#dpRxEmpty").style.display = patientRx.length ? "none" : "";
  $("#dpRxTable").style.display = patientRx.length ? "" : "none";
}

function newPrescription() {
  if (!patient) { alert("اختر المريض أولاً."); return; }
  if (!rxReady()) return;
  window.RX.open(
    {
      id: "dp_" + (patient.key || patient.fullName),
      doctor: ($("#dpDoctor").value || "").trim(),
      appointmentDate: $("#dpVisitDate").value || today(),
      fullName: patient.fullName,
      phone: patient.phone,
    },
    patient
  );
}

async function searchRx() {
  if (!window.RX) return;
  const digits = (s) => (s == null ? "" : String(s)).replace(/\D/g, "");
  const name = ($("#rxsName").value || "").trim().toLowerCase();
  const phone = digits($("#rxsPhone").value);
  const from = $("#rxsFrom").value;
  const to = $("#rxsTo").value;
  const all = await window.RX.listAll();
  const list = all.filter((rx) => {
    if (name && !(rx.patientName || "").toLowerCase().includes(name)) return false;
    if (phone && !digits(rx.patientPhone).includes(phone)) return false;
    const d = rx.visitDate || rx.issueDate || "";
    if (from && d < from) return false;
    if (to && d > to) return false;
    return true;
  });
  const tbody = $("#rxsTable tbody");
  tbody.innerHTML = list.map((rx) => rxRow(rx, true)).join("");
  wireRxButtons(tbody, list);
  $("#rxsEmpty").style.display = list.length ? "none" : "";
  $("#rxsTable").style.display = list.length ? "" : "none";
}

/* ---------- boot ---------- */
var booted = false;
function boot() {
  if (booted) return;
  if (!window.ClinicSpecialty) { setTimeout(boot, 120); return; }
  booted = true;
  renderPatientOptions();
  renderSpecialtySelect();
  renderForm({});
  $("#dpVisitDate").value = today();

  $("#dpSpecialty").addEventListener("change", (e) => {
    specialtyId = e.target.value;
    renderForm({});
  });
  $("#dpPatientInput").addEventListener("change", (e) => {
    const p = findPatient(e.target.value);
    if (!p) { alert("لم يتم العثور على المريض. تأكد من الاسم أو رقم الجوال."); return; }
    selectPatient(p);
  });
  $("#dpPickBtn").addEventListener("click", () => {
    const p = findPatient($("#dpPatientInput").value);
    if (!p) { alert("لم يتم العثور على المريض. تأكد من الاسم أو رقم الجوال."); return; }
    selectPatient(p);
  });
  $("#dpSaveBtn").addEventListener("click", saveNew);
  $("#dpClearBtn").addEventListener("click", cancelEdit);
  const cancelBtn = $("#dpCancelEdit");
  if (cancelBtn) cancelBtn.addEventListener("click", cancelEdit);

  $("#dpRxNew").addEventListener("click", newPrescription);
  $("#rxsSearch").addEventListener("click", searchRx);
  $("#rxsClear").addEventListener("click", () => {
    ["#rxsName", "#rxsPhone", "#rxsFrom", "#rxsTo"].forEach((s) => { $(s).value = ""; });
    searchRx();
  });
  ["#rxsName", "#rxsPhone", "#rxsFrom", "#rxsTo"].forEach((sel) => {
    $(sel).addEventListener("keydown", (e) => { if (e.key === "Enter") searchRx(); });
  });

  const hookRx = () => {
    if (window.RX && !window.RX.__dpHooked) {
      window.RX.__dpHooked = true;
      window.RX.onChange(() => { if (patient) renderPatientRx(); searchRx(); });
    }
  };
  document.addEventListener("rx-ready", hookRx);
  hookRx();
  searchRx();

  document.addEventListener("cloud-sync-updated", renderPatientOptions);

  // pull the cloud patient index, then refresh the list (and the open patient)
  loadCloudPatients().then(() => {
    renderPatientOptions();
    if (patient) selectPatient(patient);
  });
}

const refreshFromCloud = () => loadCloudPatients().then(() => {
  renderPatientOptions();
  if (patient) selectPatient(patient);
});
document.addEventListener("auth:ready", () => { boot(); setTimeout(refreshFromCloud, 300); });
if (document.readyState !== "loading") setTimeout(boot, 400);
else document.addEventListener("DOMContentLoaded", () => setTimeout(boot, 400));
