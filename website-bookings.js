// ============ Website bookings bridge (Doctor Website Engine → Clinic app) ============
// Patients who book from the doctor's public website create a request in
//   clinics/{clinicId}/websiteBookings/{YYYY-MM-DD_HHMM_doctorId}
// together with a public lock in
//   clinics/{clinicId}/bookedSlots/{YYYY-MM-DD_HHMM_doctorId}
// This module (runs only for signed-in clinic staff):
//  1. imports each request into the EXISTING bookings list
//     (localStorage clinic_bookings_v1 → appData/clinic_bookings_v1 via cloud-sync)
//     using the same booking fields as the manual form, plus source:"website",
//     doctorId and websiteSlot;
//  2. publishes a times-only schedule to clinics/{clinicId}/publicAvailability/main
//     (per-doctor schedules keyed by the stable doctor ID + taken times, no patient data);
//  3. frees a website slot lock ONLY when the clinic booking that owns it is
//     cancelled, moved to another time/doctor, or deleted by staff.
//     Importing (and deleting) the websiteBookings request never frees the lock.

import { auth, db } from "./firebase-config.js?v=1";
import {
  doc, getDoc, setDoc, deleteDoc, collection, onSnapshot, getDocs, query, where
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";

const CANCELLED = "ملغي";
const key = (n) => (window.clinicKey ? window.clinicKey(n) : "bmd::" + window.CLINIC_ID + "::" + n);
const read = (n, d) => { try { return JSON.parse(localStorage.getItem(key(n)) || "") ?? d; } catch { return d; } };
const pad = (n) => String(n).padStart(2, "0");
const today = () => { const d = new Date(); return d.getFullYear() + "-" + pad(d.getMonth() + 1) + "-" + pad(d.getDate()); };
const slotId = (date, time, doctorId) => date + "_" + String(time || "").replace(":", "") + "_" + doctorId;

// Same algorithm as admin.js makeDoctorId (stable ID, stored on the doctor record).
function makeDoctorId(name) {
  let h = 2166136261;
  const s = String(name || "").trim().replace(/\s+/g, " ");
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
  return "doc" + (h >>> 0).toString(36);
}
function doctorsList() {
  const list = read("clinic_doctors_v1", []);
  if (list.some((d) => d && d.name && !d.id)) {
    list.forEach((d) => { if (d && d.name && !d.id) d.id = makeDoctorId(d.name); });
    localStorage.setItem(key("clinic_doctors_v1"), JSON.stringify(list)); // cloud-sync mirrors it
  }
  return list.filter((d) => d && d.name && d.id);
}
const idOfName = (name) => { const d = doctorsList().find((x) => x.name === name); return d ? d.id : ""; };
const nameOfId = (id) => { const d = doctorsList().find((x) => x.id === id); return d ? d.name : ""; };
const bookingDoctorId = (b) => b.doctorId || idOfName(b.doctor);
const isActive = (b) => (b.status || "مجدول") !== CANCELLED;

let clinicId = "";
let unsub = null;
let timer = null;
let lastPublished = "";
let siteSettings = null;   // clinics/{c}/websiteSettings/main (live)
let siteDoctorId = "";     // doctor shown on this clinic's website
let siteDoctorReady = false;

// ============ Two-way working-hours sync (clinic schedule ⇄ website hours) ============
const WEEK = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"]; // JS getDay order
const appliedKey = () => key("web_hours_applied_v1");

function hoursToSched(wh) {            // website hours → clinic-compatible schedule
  const days = []; let start = "", end = "";
  const dayHours = {};
  WEEK.forEach((k, i) => {
    const r = (wh || {})[k];
    if (!r || r.closed || !r.open || !r.close) return;
    days.push(i);
    dayHours[i] = { start: r.open, end: r.close };
    if (!start || r.open < start) start = r.open;
    if (!end || r.close > end) end = r.close;
  });
  return { days, start, end, dayHours };
}
function schedToHours(c) {             // clinic schedule → website hours
  const out = {};
  WEEK.forEach((k, i) => {
    const perDay = c.dayHours && c.dayHours[i];
    out[k] = (c.days || []).map(Number).includes(i)
      ? { open: (perDay && perDay.start) || c.start, close: (perDay && perDay.end) || c.end, closed: false }
      : { open: "", close: "", closed: true };
  });
  return out;
}
const sameSched = (a, b) => a.start === b.start && a.end === b.end &&
  JSON.stringify([...a.days].map(Number).sort()) === JSON.stringify([...(b.days || [])].map(Number).sort()) &&
  JSON.stringify(a.dayHours || {}) === JSON.stringify(b.dayHours || {});

function targetDoctor(docs) {
  return docs.find((d) => d.id === siteDoctorId) || docs[0] || null;
}

// Website → clinic: the doctor saved new hours on the website dashboard.
function applyWebsiteHours() {
  const s = siteSettings;
  if (!siteDoctorReady || !s || s.hoursSource !== "website") return false;
  const at = Number(s.hoursUpdatedAt) || 0;
  if (at <= Number(localStorage.getItem(appliedKey()) || 0)) return false;
  const h = hoursToSched(s.workingHours);
  const list = read("clinic_doctors_v1", []);
  const t = targetDoctor(list.filter((d) => d && d.id));
  if (t && h.days.length && h.start && h.end) {
    const d = list.find((x) => x.id === t.id);
    const admin = read("clinic_admin_v1", {});
    d.schedule = Object.assign({
      breakStart: admin.breakStart || "", breakEnd: admin.breakEnd || "",
      slotMinutes: Number(admin.slotMinutes) || 30,
    }, d.schedule || {}, { start: h.start, end: h.end, days: h.days, dayHours: h.dayHours });
    localStorage.setItem(key("clinic_doctors_v1"), JSON.stringify(list)); // cloud-sync mirrors it
    document.dispatchEvent(new CustomEvent("cloud-sync-updated", { detail: { key: "clinic_doctors_v1" } }));
    localStorage.setItem(appliedKey(), String(at));
    return true;
  }
  return false;
}

// Clinic → website: push the doctor's clinic schedule when it differs from the website.
async function pushHoursToSite(sched) {
  const s = siteSettings;
  if (!siteDoctorReady || !s || !s.__exists) return;
  if (s.hoursSource === "website" && (Number(s.hoursUpdatedAt) || 0) > Number(localStorage.getItem(appliedKey()) || 0)) return;
  const t = targetDoctor(doctorsList());
  const c = t && sched[t.id];
  if (!c) return;
  if (sameSched(hoursToSched(s.workingHours), c)) return;
  const now = Date.now();
  try {
    await setDoc(doc(db, "clinics", clinicId, "websiteSettings", "main"),
      { workingHours: schedToHours(c), hoursSource: "clinic", hoursUpdatedAt: now }, { merge: true });
    localStorage.setItem(appliedKey(), String(now));
  } catch (e) { console.warn("Website hours not updated:", e && e.message); }
}

function refreshPage() {
  document.dispatchEvent(new CustomEvent("cloud-sync-updated", { detail: { key: "clinic_bookings_v1" } }));
}

async function saveBookings(list) {
  // merge with the cloud copy first so another device's bookings are never overwritten
  try {
    const cur = await getDoc(doc(db, "clinics", clinicId, "appData", "clinic_bookings_v1"));
    const remote = cur.exists() ? JSON.parse(cur.data().json || "[]") : [];
    if (Array.isArray(remote)) {
      const ids = new Set(list.map((b) => b && b.id));
      remote.forEach((b) => { if (b && b.id && !ids.has(b.id)) list.push(b); });
    }
  } catch (e) { /* offline: keep the local list */ }
  const json = JSON.stringify(list);
  localStorage.setItem(key("clinic_bookings_v1"), json); // cloud-sync mirrors it too
  await setDoc(doc(db, "clinics", clinicId, "appData", "clinic_bookings_v1"), {
    json, updatedAt: new Date().toISOString(),
    updatedBy: (auth.currentUser && auth.currentUser.email) || "website-booking",
  });
}

function canonPhone(p) {
  let d = (p || "").toString().replace(/\D/g, "");
  if (d.startsWith("00")) d = d.slice(2);
  if (d.length === 12 && d.startsWith("20")) d = d.slice(2);
  if (d.length === 11 && d.startsWith("0")) d = d.slice(1);
  return d;
}

async function importRequest(snap) {
  const r = snap.data() || {};
  if (r.clinicId && r.clinicId !== clinicId) return; // never import another clinic's request
  const bookings = read("clinic_bookings_v1", []);
  const id = "web-" + (r.ref || snap.id);
  if (!bookings.some((b) => b.id === id)) {
    const admin = read("clinic_admin_v1", {});
    const docName = nameOfId(r.doctorId) || r.doctor || "";
    const clash = bookings.some((b) => b.appointmentDate === r.date && b.appointmentTime === r.time && isActive(b) &&
      (!b.doctor || bookingDoctorId(b) === r.doctorId));
    // returning patient: same mobile number → reuse the saved file (name + profile)
    const ph = canonPhone(r.phone);
    const prev = ph ? bookings.filter((b) => canonPhone(b.phone) === ph)
      .sort((a, b) => String(b.createdAt || "").localeCompare(String(a.createdAt || "")))[0] : null;
    const typed = (r.fullName || "").trim();
    const nameNote = prev && typed && prev.fullName && prev.fullName.trim() !== typed ? "الاسم المكتوب في الموقع: " + typed : "";
    const notes = [clash ? "⚠️ تعارض مع حجز آخر في نفس الموعد" : "", "حجز من الموقع — رقم " + (r.ref || ""), nameNote, r.notes || ""]
      .filter(Boolean).join(" — ");
    bookings.push({
      id,
      fullName: (prev && prev.fullName) || typed, idNumber: (prev && prev.idNumber) || "", birthDate: (prev && prev.birthDate) || "",
      phone: (prev && prev.phone) || r.phone || "", gender: (prev && prev.gender) || "", email: (prev && prev.email) || "",
      returningPatient: !!prev,
      specialty: "", condition: "",
      appointmentDate: r.date || "", doctor: docName, doctorId: r.doctorId || "",
      appointmentTime: r.time || "", duration: String(admin.slotMinutes || 30),
      paymentMethod: "نقدي", amount: "",
      status: "مجدول", notes,
      source: "website", websiteRef: r.ref || "", websiteSlot: snap.id,
      createdAt: new Date(r.createdAt || Date.now()).toISOString(),
    });
    await saveBookings(bookings);
    refreshPage();
  }
  // The booking now lives in the clinic list. The public slot lock is NOT touched here.
  await deleteDoc(snap.ref);
}

function busyList(doctors) {
  const t = today();
  const out = new Set();
  read("clinic_bookings_v1", [])
    .filter((b) => b.appointmentDate >= t && b.appointmentTime && isActive(b))
    .forEach((b) => {
      const did = bookingDoctorId(b);
      // a booking without a doctor blocks that time for every doctor
      const ids = did ? [did] : doctors.map((d) => d.id);
      ids.forEach((x) => out.add(b.appointmentDate + "|" + b.appointmentTime + "|" + x));
    });
  return [...out].sort();
}

async function publish() {
  if (!clinicId) return;
  const s = read("clinic_admin_v1", {});
  const base = {
    start: s.start || "09:00", end: s.end || "17:00",
    breakStart: s.breakStart || "", breakEnd: s.breakEnd || "",
    slotMinutes: Number(s.slotMinutes) || 30,
    days: Array.isArray(s.days) ? s.days.map(Number) : [0, 1, 2, 3, 4],
  };
  const docs = doctorsList().filter((d) => d.active !== false); // every active doctor → clinic-level website
  const sched = {};
  docs.forEach((d) => {
    const c = Object.assign({}, base, d.schedule || {});
    sched[d.id] = {
      start: c.start, end: c.end, breakStart: c.breakStart || "", breakEnd: c.breakEnd || "",
      slotMinutes: Number(c.slotMinutes) || 30, days: (c.days || []).map(Number),
      dayHours: c.dayHours || {},
    };
  });
  const data = {
    schedule: base,
    doctors: docs.map((d) => ({ id: d.id, name: d.name, specialty: d.specialty || "" })),
    doctorIds: docs.map((d) => d.id),
    sched,
    busy: busyList(docs),
  };
  pushHoursToSite(sched);
  const json = JSON.stringify(data);
  if (json === lastPublished) return;
  try {
    await setDoc(doc(db, "clinics", clinicId, "publicAvailability", "main"), Object.assign({ updatedAt: Date.now() }, data));
    lastPublished = json;
  } catch (e) { console.warn("Website availability not published:", e && e.message); }
}

// Source of truth = the clinic booking. A lock is released only when:
//  - its date is in the past, or
//  - the booking that owns it (websiteSlot == lock id) is cancelled, or
//  - that booking was moved to another date/time/doctor (and no active booking still uses the slot).
// A lock with no owning booking in this device's list is KEPT (it may not be imported yet,
// or this device's list may be stale).
async function releaseLocks() {
  try {
    const bookings = read("clinic_bookings_v1", []);
    const stillUsed = new Set(bookings.filter(isActive).filter((b) => bookingDoctorId(b))
      .map((b) => slotId(b.appointmentDate, b.appointmentTime, bookingDoctorId(b))));
    const owners = {};
    bookings.forEach((b) => { if (b.websiteSlot) (owners[b.websiteSlot] = owners[b.websiteSlot] || []).push(b); });
    const snap = await getDocs(collection(db, "clinics", clinicId, "bookedSlots"));
    const t = today();
    for (const l of snap.docs) {
      const x = l.data() || {};
      let free = x.date && x.date < t;
      const own = owners[l.id];
      if (!free && own && own.length && !stillUsed.has(l.id)) {
        free = own.every((b) => !isActive(b) ||
          slotId(b.appointmentDate, b.appointmentTime, bookingDoctorId(b)) !== l.id);
      }
      if (free) await deleteDoc(l.ref).catch(() => {});
    }
  } catch (e) { /* ignore */ }
}

// Called by script.js when staff delete a website booking.
window.releaseWebsiteSlot = async (b) => {
  if (!clinicId || !b || !b.websiteSlot) return;
  const bookings = read("clinic_bookings_v1", []);
  const used = bookings.some((x) => x.id !== b.id && isActive(x) &&
    slotId(x.appointmentDate, x.appointmentTime, bookingDoctorId(x)) === b.websiteSlot);
  if (!used) await deleteDoc(doc(db, "clinics", clinicId, "bookedSlots", b.websiteSlot)).catch(() => {});
  schedule();
};

function schedule() {
  clearTimeout(timer);
  timer = setTimeout(() => { publish(); releaseLocks(); }, 1500);
}

let queue = Promise.resolve();
const queued = new Set();
function enqueue(d) {            // import one request at a time (no lost bookings)
  if (queued.has(d.id)) return;
  queued.add(d.id);
  queue = queue.then(() => importRequest(d))
    .catch((e) => { console.warn("Website booking import failed:", e && e.message); showWarn("تعذر استيراد حجز من الموقع: " + (e && e.message)); })
    .finally(() => queued.delete(d.id));
}
function showWarn(msg) {
  let el = document.getElementById("webBookWarn");
  if (!el) {
    el = document.createElement("div"); el.id = "webBookWarn";
    el.style.cssText = "position:fixed;bottom:12px;left:12px;right:12px;z-index:9999;background:#fde8e8;color:#9b1c1c;border:1px solid #f5b5b5;border-radius:10px;padding:10px 14px;font-size:14px;direction:rtl;text-align:right";
    document.body.appendChild(el);
  }
  el.textContent = "⚠️ " + msg;
}
let tries = 0;
function start() {
  if (unsub) return;
  clinicId = window.CLINIC_ID;
  if (!clinicId || clinicId === "__anon__") {   // clinic not resolved yet → retry
    if (++tries < 60) setTimeout(start, 1000);
    return;
  }
  unsub = onSnapshot(collection(db, "clinics", clinicId, "websiteBookings"), (snap) => {
    snap.docs.forEach(enqueue);
    schedule();
  }, (e) => {
    console.warn("Website bookings listener stopped:", e && e.message);
    showWarn("لا يمكن استقبال حجوزات الموقع لهذا الحساب (" + clinicId + "): " + (e && e.message) + " — تأكد من ربط الحساب بالعيادة في clinic-members.");
    unsub = null;
  });
  document.addEventListener("cloud-sync-updated", schedule);
  document.addEventListener("doctors-saved", schedule); // staff edited a schedule → website updates in ~2s
  getDocs(query(collection(db, "websiteDirectory"), where("clinicId", "==", clinicId)))
    .then((q) => {
      const e = q.docs.map((d) => d.data()).find((x) => x.doctorId);
      siteDoctorId = e ? e.doctorId : "";
      siteDoctorReady = true;
      applyWebsiteHours();
      schedule();
    })
    .catch(() => { siteDoctorReady = true; schedule(); });
  onSnapshot(doc(db, "clinics", clinicId, "websiteSettings", "main"), (snap) => {
    siteSettings = Object.assign({ __exists: snap.exists() }, snap.data() || {});
    applyWebsiteHours();
    schedule();
  }, (e) => console.warn("Website settings listener stopped:", e && e.message));
  publish();
  setInterval(publish, 30000);
  setTimeout(releaseLocks, 8000);
  setInterval(releaseLocks, 5 * 60 * 1000);
}

onAuthStateChanged(auth, (user) => {
  if (user && !unsub) { tries = 0; setTimeout(start, 1200); } // let auth.js resolve the clinic first
  if (!user && unsub) { unsub(); unsub = null; }
});
