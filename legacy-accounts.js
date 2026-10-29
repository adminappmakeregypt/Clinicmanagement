// v71: the old hard-coded account list was REMOVED from the code (it held real customer emails
// and the repository is public). The one-time migration (v32-v34) already stored every account in
// Firestore (clinicMembers/{email}). «🔧 ترحيل/إصلاح الحسابات الحالية» in users-admin.js now reads
// that collection instead. Kept as an empty export so existing imports keep working.
export const LEGACY_ACCOUNTS = {};
