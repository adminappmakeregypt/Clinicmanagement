// ============ Shared file uploads (Firebase Storage) ============
// Uses the EXISTING Firebase project/app — no new storage architecture.
// Path: clinics/{clinicId}/attachments/{folder}/{timestamp}_{filename}
//
// window.ClinicFiles.upload(file, folder) -> { name, url, path, size, type }

import { app, auth } from "./firebase-config.js?v=1";
import {
  getStorage, ref, uploadBytesResumable, getDownloadURL,
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-storage.js";

const storage = getStorage(app);

function safeName(n) {
  return String(n || "file").replace(/[^\w.\-\u0600-\u06FF]+/g, "_").slice(-80);
}

function clinicId() {
  return window.CLINIC_ID || "__anon__";
}

// Wait (briefly) for auth to settle so uploads aren't rejected right after page load.
function waitForUser(ms = 8000) {
  if (auth.currentUser) return Promise.resolve(auth.currentUser);
  return new Promise((resolve) => {
    let done = false;
    const stop = auth.onAuthStateChanged((u) => {
      if (u && !done) { done = true; stop(); resolve(u); }
    });
    setTimeout(() => { if (!done) { done = true; try { stop(); } catch (e) {} resolve(auth.currentUser); } }, ms);
  });
}

function friendly(err) {
  const code = (err && err.code) || "";
  if (code === "storage/unauthorized") return "لا توجد صلاحية للرفع (قواعد التخزين في Firebase).";
  if (code === "storage/canceled") return "تم إلغاء الرفع.";
  if (code === "storage/retry-limit-exceeded" || code === "timeout") return "انتهت مهلة الرفع — تحقق من الاتصال.";
  if (code === "storage/unknown") return "تعذر الرفع (تحقق من إعدادات CORS/التخزين).";
  if (err && err.message === "not-signed-in") return "يجب تسجيل الدخول أولاً.";
  return (err && (err.message || err.code)) || "خطأ غير معروف";
}

async function upload(file, folder, onProgress) {
  await waitForUser();
  if (!auth.currentUser) { const e = new Error("not-signed-in"); e.friendly = friendly(e); throw e; }

  const path = `clinics/${clinicId()}/attachments/${folder || "general"}/${Date.now()}_${safeName(file.name)}`;
  const task = uploadBytesResumable(ref(storage, path), file, {
    contentType: file.type || "application/octet-stream",
  });

  await new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      try { task.cancel(); } catch (e) {}
      const e = new Error("timeout"); e.code = "timeout"; reject(e);
    }, 90000);

    task.on("state_changed",
      (snap) => {
        if (typeof onProgress === "function" && snap.totalBytes) {
          onProgress(Math.round((snap.bytesTransferred / snap.totalBytes) * 100));
        }
      },
      (err) => { clearTimeout(timer); reject(err); },
      () => { clearTimeout(timer); resolve(); }
    );
  }).catch((err) => { err.friendly = friendly(err); throw err; });

  const url = await getDownloadURL(task.snapshot.ref);
  return { name: file.name, url, path, size: file.size, type: file.type || "" };
}

window.ClinicFiles = { upload, friendly };
window.dispatchEvent(new CustomEvent("clinic-files-ready"));
