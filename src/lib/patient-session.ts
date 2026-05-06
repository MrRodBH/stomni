import type { PatientInfo } from "./api";

const KEY = "stomni_patient";

export function savePatient(p: PatientInfo) {
  if (typeof sessionStorage !== "undefined") {
    sessionStorage.setItem(KEY, JSON.stringify(p));
  }
}

export function loadPatient(): PatientInfo | null {
  if (typeof sessionStorage === "undefined") return null;
  const raw = sessionStorage.getItem(KEY);
  if (!raw) return null;
  try { return JSON.parse(raw) as PatientInfo; } catch { return null; }
}

export function clearPatient() {
  if (typeof sessionStorage !== "undefined") sessionStorage.removeItem(KEY);
}

export function maskWhatsapp(value: string) {
  const digits = value.replace(/\D/g, "").slice(0, 11);
  if (digits.length <= 2) return digits;
  if (digits.length <= 7) return `(${digits.slice(0,2)}) ${digits.slice(2)}`;
  return `(${digits.slice(0,2)}) ${digits.slice(2,7)}-${digits.slice(7)}`;
}

export function maskName(full: string) {
  const parts = full.trim().split(/\s+/);
  if (parts.length === 0) return "";
  return parts
    .map((p, i) => (i === 0 || i === parts.length - 1 ? p : p[0] + "."))
    .join(" ");
}
