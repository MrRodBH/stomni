const KEY = "stomni_patient_hint";
const TTL_DAYS = 30;

export interface PatientHintLocal {
  whatsapp: string;
  consent_at: string; // ISO
}

export function savePatientHint(whatsapp: string) {
  if (typeof localStorage === "undefined") return;
  const payload: PatientHintLocal = {
    whatsapp,
    consent_at: new Date().toISOString(),
  };
  localStorage.setItem(KEY, JSON.stringify(payload));
}

export function loadPatientHint(): PatientHintLocal | null {
  if (typeof localStorage === "undefined") return null;
  const raw = localStorage.getItem(KEY);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as PatientHintLocal;
    if (!parsed.whatsapp || !parsed.consent_at) return null;
    const ageMs = Date.now() - new Date(parsed.consent_at).getTime();
    if (ageMs > TTL_DAYS * 24 * 60 * 60 * 1000) {
      localStorage.removeItem(KEY);
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

export function clearPatientHint() {
  if (typeof localStorage !== "undefined") localStorage.removeItem(KEY);
}