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
  doc, setDoc, deleteDoc, collection, onSnapshot, getDocs
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

function refreshPage() {
  document.dispatchEvent(new CustomEvent("cloud-sync-updated", { detail: { key: "clinic_bookings_v1" } }));
}

async function saveBookings(list) {
  const json = JSON.stringify(list);
  localStorage.setItem(key("clinic_bookings_v1"), json); // cloud-sync mirrors it too
  await setDoc(doc(db, "clinics", clinicId, "appData", "clinic_bookings_v1"), {
    json, updatedAt: new Date().toISOString(),
    updatedBy: (auth.currentUser && auth.currentUser.email) || "website-booking",
  });
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
    const notes = [clash ? "⚠️ تعارض مع حجز آخر في نفس الموعد" : "", "حجز من الموقع — رقم " + (r.ref || ""), r.notes || ""]
      .filter(Boolean).join(" — ");
    bookings.push({
      id,
      fullName: r.fullName || "", idNumber: "", birthDate: "",
      phone: r.phone || "", gender: "", email: "",
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
  const docs = doctorsList();
  const sched = {};
  docs.forEach((d) => {
    const c = Object.assign({}, base, d.schedule || {});
    sched[d.id] = {
      start: c.start, end: c.end, breakStart: c.breakStart || "", breakEnd: c.breakEnd || "",
      slotMinutes: Number(c.slotMinutes) || 30, days: (c.days || []).map(Number),
    };
  });
  const data = {
    schedule: base,
    doctors: docs.map((d) => ({ id: d.id, name: d.name, specialty: d.specialty || "" })),
    doctorIds: docs.map((d) => d.id),
    sched,
    busy: busyList(docs),
  };
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

function start() {
  clinicId = window.CLINIC_ID;
  if (!clinicId || clinicId === "__anon__") return;
  unsub = onSnapshot(collection(db, "clinics", clinicId, "websiteBookings"), (snap) => {
    snap.docs.forEach((d) => importRequest(d).catch((e) => console.warn("Website booking import failed:", e && e.message)));
    schedule();
  }, (e) => console.warn("Website bookings listener stopped:", e && e.message));
  document.addEventListener("cloud-sync-updated", schedule);
  publish();
  setInterval(publish, 30000);
  setTimeout(releaseLocks, 8000);
  setInterval(releaseLocks, 5 * 60 * 1000);
}

onAuthStateChanged(auth, (user) => {
  if (user && !unsub) setTimeout(start, 1200); // let auth.js resolve the clinic first
  if (!user && unsub) { unsub(); unsub = null; }
});
