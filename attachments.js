// ============ Shared file uploads (Firebase Storage) ============
// Uses the EXISTING Firebase project/app — no new storage architecture.
// Path: clinics/{clinicId}/attachments/{folder}/{timestamp}_{filename}
//
// window.ClinicFiles.upload(file, folder) -> { name, url, path, size, type }

import { app, auth } from "./firebase-config.js?v=1";
import {
  getStorage, ref, uploadBytes, getDownloadURL,
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-storage.js";

const storage = getStorage(app);

function getClinicId() {
  return (
    window.CLINIC_ID ||
    localStorage.getItem(window.__BMD_LAST_CLINIC_KEY || "bmd::lastClinicId") ||
    "__anon__"
  );
}

function safeName(n) {
  return String(n || "file").replace(/[^\w.\-\u0600-\u06FF]+/g, "_").slice(-80);
}

// التأكد من استعادة جلسة Firebase Auth قبل الرفع
async function getAuthUser() {
  if (auth.currentUser) return auth.currentUser;
  return new Promise((resolve) => {
    const unsubscribe = auth.onAuthStateChanged((user) => {
      try { unsubscribe(); } catch {}
      resolve(user);
    });
    setTimeout(() => resolve(auth.currentUser), 2500);
  });
}

async function upload(file, folder) {
  const user = await getAuthUser();
  if (!user) throw new Error("not-signed-in");

  const clinicId = getClinicId();
  const path = `clinics/${clinicId}/attachments/${folder || "general"}/${Date.now()}_${safeName(file.name)}`;
  const r = ref(storage, path);
  await uploadBytes(r, file, { contentType: file.type || "application/octet-stream" });
  const url = await getDownloadURL(r);
  return { name: file.name, url, path, size: file.size, type: file.type || "" };
}

window.ClinicFiles = { upload };
