// ============ Doctor clinic branding (v55) ============
// Each signed-in account has its own clinic name + logo:
//   Firestore  doctorBranding/{uid}            { clinicName, logoUrl, logoPath, updatedAt }
//   Storage    doctorBranding/{uid}/logo-*      (image < 2MB, PNG/JPG/WebP)
// Security rules allow ONLY the owner UID to read/write their own branding.
import { app, auth, db } from "./firebase-config.js";
import { doc, getDoc, setDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { getStorage, ref, uploadBytes, getDownloadURL, deleteObject } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-storage.js";

const storage = getStorage(app);
const DEFAULT_NAME = "عيادتي";
const MAX_BYTES = 2 * 1024 * 1024;
const TYPES = ["image/png", "image/jpeg", "image/webp"];
const cacheKey = (uid) => "bmd::branding::" + uid;
const tr = (s) => (window.I18N && window.I18N.t ? window.I18N.t(s) : s);

let current = { clinicName: "", logoUrl: "", logoPath: "" };
let uid = null;

function render(b) {
  const logo = document.getElementById("brandLogo");
  const icon = document.getElementById("brandIcon");
  const name = document.getElementById("brandName");
  if (!name) return;
  name.textContent = (b.clinicName || "").trim() || DEFAULT_NAME;
  if (b.logoUrl) {
    logo.src = b.logoUrl; logo.hidden = false; icon.hidden = true;
  } else {
    logo.removeAttribute("src"); logo.hidden = true; icon.hidden = false;
  }
}

function toast(msg, ok = true) {
  let t = document.getElementById("brandToast");
  if (!t) { t = document.createElement("div"); t.id = "brandToast"; document.body.appendChild(t); }
  t.textContent = msg; t.className = "brand-toast " + (ok ? "ok" : "err");
  t.hidden = false; clearTimeout(t._h); t._h = setTimeout(() => (t.hidden = true), 3500);
}

async function load(u) {
  uid = u.uid;
  try { const c = JSON.parse(localStorage.getItem(cacheKey(uid)) || "null"); if (c) { current = c; render(c); } } catch {}
  try {
    const s = await getDoc(doc(db, "doctorBranding", uid));
    current = s.exists() ? { clinicName: s.data().clinicName || "", logoUrl: s.data().logoUrl || "", logoPath: s.data().logoPath || "" }
                         : { clinicName: "", logoUrl: "", logoPath: "" };
    localStorage.setItem(cacheKey(uid), JSON.stringify(current));
  } catch (e) { console.warn("branding load failed", e); }
  render(current);
  const btn = document.getElementById("brandEditBtn");
  if (btn) btn.hidden = false;
}

// ---------- settings modal ----------
let pendingFile = null, removeLogo = false;

function openModal() {
  const m = document.getElementById("brandModal");
  pendingFile = null; removeLogo = false;
  document.getElementById("brandNameInput").value = current.clinicName || "";
  document.getElementById("brandFile").value = "";
  document.getElementById("brandError").textContent = "";
  showPreview(current.logoUrl);
  m.hidden = false;
  document.getElementById("brandNameInput").focus();
}
function closeModal() { document.getElementById("brandModal").hidden = true; }
function showPreview(url) {
  const img = document.getElementById("brandPreview");
  const ph = document.getElementById("brandPreviewEmpty");
  const rm = document.getElementById("brandRemove");
  if (url) { img.src = url; img.hidden = false; ph.hidden = true; rm.hidden = false; }
  else { img.removeAttribute("src"); img.hidden = true; ph.hidden = false; rm.hidden = true; }
}

function onFile(e) {
  const f = e.target.files && e.target.files[0];
  const err = document.getElementById("brandError");
  err.textContent = "";
  if (!f) return;
  if (!TYPES.includes(f.type)) { err.textContent = tr("نوع الملف غير مدعوم — استخدم PNG أو JPG أو WebP"); e.target.value = ""; return; }
  if (f.size > MAX_BYTES) { err.textContent = tr("حجم الصورة أكبر من 2 ميجابايت"); e.target.value = ""; return; }
  pendingFile = f; removeLogo = false;
  showPreview(URL.createObjectURL(f));
}

async function save() {
  if (!uid) return;
  const btn = document.getElementById("brandSave");
  const err = document.getElementById("brandError");
  const clinicName = document.getElementById("brandNameInput").value.trim().slice(0, 80);
  err.textContent = ""; btn.disabled = true; btn.textContent = tr("جارٍ الحفظ...");
  try {
    let { logoUrl, logoPath } = current;
    const oldPath = logoPath;
    if (pendingFile) {
      const ext = pendingFile.type === "image/png" ? "png" : pendingFile.type === "image/webp" ? "webp" : "jpg";
      logoPath = `doctorBranding/${uid}/logo-${Date.now()}.${ext}`;
      const r = ref(storage, logoPath);
      await uploadBytes(r, pendingFile, { contentType: pendingFile.type });
      logoUrl = await getDownloadURL(r);
    } else if (removeLogo) { logoUrl = ""; logoPath = ""; }
    await setDoc(doc(db, "doctorBranding", uid), { clinicName, logoUrl, logoPath, updatedAt: serverTimestamp() });
    if (oldPath && oldPath !== logoPath) { try { await deleteObject(ref(storage, oldPath)); } catch {} }
    current = { clinicName, logoUrl, logoPath };
    localStorage.setItem(cacheKey(uid), JSON.stringify(current));
    render(current); closeModal();
    toast(tr("تم حفظ هوية العيادة"));
  } catch (e) {
    console.error(e);
    err.textContent = tr("تعذر الحفظ — تحقق من الاتصال وقواعد الأمان") + (e && e.code ? ` (${e.code})` : "");
    toast(tr("تعذر الحفظ"), false);
  } finally { btn.disabled = false; btn.textContent = tr("💾 حفظ التغييرات"); }
}

function wire() {
  const b = document.getElementById("brandEditBtn");
  if (!b) return;
  b.addEventListener("click", openModal);
  document.getElementById("brandClose").addEventListener("click", closeModal);
  document.getElementById("brandCancel").addEventListener("click", closeModal);
  document.getElementById("brandModal").addEventListener("click", (e) => { if (e.target.id === "brandModal") closeModal(); });
  document.getElementById("brandFile").addEventListener("change", onFile);
  document.getElementById("brandRemove").addEventListener("click", () => {
    pendingFile = null; removeLogo = true; document.getElementById("brandFile").value = ""; showPreview("");
  });
  document.getElementById("brandSave").addEventListener("click", save);
  document.addEventListener("keydown", (e) => { if (e.key === "Escape") closeModal(); });
}

if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", wire, { once: true }); else wire();
auth.onAuthStateChanged((u) => {
  if (u) load(u);
  else { uid = null; current = { clinicName: "", logoUrl: "", logoPath: "" }; render(current); }
});
