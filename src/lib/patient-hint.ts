const KEY = "stomni_patient_hint";

export interface PatientHintLocal {
  full_name: string;
  whatsapp: string;
  consent_at: string; // ISO
}

// Privacy: never persist patient PII (name/whatsapp) on the device.
// Each triage starts blank. These helpers are kept as no-ops for back-compat
// and also proactively clear any legacy hint left over from prior versions.
export function savePatientHint(_full_name: string, _whatsapp: string) {
  clearPatientHint();
}

export function loadPatientHint(): PatientHintLocal | null {
  clearPatientHint();
  return null;
}

export function clearPatientHint() {
  if (typeof localStorage !== "undefined") {
    try { localStorage.removeItem(KEY); } catch { /* ignore */ }
  }
  if (typeof sessionStorage !== "undefined") {
    try { sessionStorage.removeItem(KEY); } catch { /* ignore */ }
  }
}