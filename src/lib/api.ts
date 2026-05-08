import axios from "axios";

const API_URL =
  (import.meta as any).env?.VITE_API_URL ||
  "https://smart-dental-clinic.preview.emergentagent.com/api/v1";

function getCookie(name: string): string | null {
  if (typeof document === "undefined") return null;
  const match = document.cookie.match(new RegExp("(^| )" + name + "=([^;]+)"));
  return match ? decodeURIComponent(match[2]) : null;
}

export const api = axios.create({
  baseURL: API_URL,
  headers: { "Content-Type": "application/json" },
  withCredentials: true,
  timeout: 15000,
});

api.interceptors.request.use((config) => {
  const token =
    getCookie("stomni_jwt") ||
    (typeof window !== "undefined" ? localStorage.getItem("stomni_token") : null);
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

export type UrgencyLevel = "low" | "medium" | "high";
export type AttendanceType =
  | "consulta"
  | "emergencia"
  | "retorno"
  | "remarcacao"
  | "cancelamento"
  | "outros";

export interface Clinic {
  id: string;
  name: string;
  city?: string;
}

export interface PatientInfo {
  full_name: string;
  whatsapp: string;
  clinic_id: string;
  consent: boolean;
}

export interface AppointmentSlot {
  time: string; // HH:mm
  available: boolean;
  urgency?: UrgencyLevel;
}

export interface TriageProcessRequest {
  patient: PatientInfo;
  attendance_type: AttendanceType;
  date: string; // ISO yyyy-MM-dd
  time: string;
  notes?: string;
  files?: TriageFileRef[];
}

export interface TriageFileRef {
  file_id: string;
  name: string;
  size: number;
  content_type: string;
  object_key?: string;
}

export interface SignedUploadResponse {
  upload_url: string;
  object_key: string;
  method?: "PUT" | "POST";
  headers?: Record<string, string>;
  expires_in?: number;
  mock?: boolean;
}

export interface ConfirmedUpload {
  file_id: string;
  object_key: string;
  filename: string;
  size: number;
  content_type: string;
  url?: string;
}

export interface TriageProcessResponse {
  protocol: string;
  classification: UrgencyLevel;
  message: string;
}

export interface AnalyticsPoint {
  label: string;
  value: number;
}

export interface AnalyticsMix {
  type: AttendanceType;
  label: string;
  value: number;
}

export interface AnalyticsMetrics {
  open_now: number;
  in_progress: number;
  avg_wait_minutes: number;
  nps_avg: number;
  volume_series: AnalyticsPoint[];
  mix: AnalyticsMix[];
  ai_insights: string[];
}

export interface KnowledgeDocument {
  id: string;
  filename: string;
  size: number;
  status: "processing" | "ready" | "error";
  uploaded_at: string;
}

export const clinicsApi = {
  list: async (): Promise<Clinic[]> => {
    try {
      const { data } = await api.get<Clinic[]>("/clinics");
      if (Array.isArray(data) && data.length) return data;
    } catch {}
    return [
      { id: "c1", name: "STOMNI Centro", city: "São Paulo" },
      { id: "c2", name: "STOMNI Vila Mariana", city: "São Paulo" },
      { id: "c3", name: "STOMNI Pinheiros", city: "São Paulo" },
      { id: "c4", name: "STOMNI Tatuapé", city: "São Paulo" },
    ];
  },
};

export const triageApi = {
  // ===== Multi-turn triage sessions (RAG) =====
  createSession: async (
    initialMessage?: string,
    tenant: string = "ten_stomni",
  ): Promise<TriageSession> => {
    const { data } = await api.post<TriageSession>(
      `/triage/sessions?tenant=${encodeURIComponent(tenant)}`,
      { initial_message: initialMessage, use_rag: true },
    );
    return data;
  },
  getSession: async (id: string): Promise<TriageSession> => {
    const { data } = await api.get<TriageSession>(`/triage/sessions/${id}`);
    return data;
  },
  sendMessage: async (id: string, message: string): Promise<TriageSession> => {
    const { data } = await api.post<TriageSession>(
      `/triage/sessions/${id}/messages`,
      { message, use_rag: true },
    );
    return data;
  },
  finalize: async (
    id: string,
    payload: {
      patient: PatientInfo;
      attendance_type: AttendanceType;
      date: string;
      time: string;
      files?: { name: string; size: number }[];
    },
  ): Promise<TriageProcessResponse> => {
    const { data } = await api.post<TriageProcessResponse>(
      `/triage/sessions/${id}/finalize`,
      payload,
    );
    return data;
  },

  // ===== Legacy single-shot triage (kept for compat) =====
  process: async (payload: TriageProcessRequest): Promise<TriageProcessResponse> => {
    try {
      const { data } = await api.post<TriageProcessResponse>("/triage/process", payload);
      return data;
    } catch {
      const cls: UrgencyLevel =
        payload.attendance_type === "emergencia" ? "high" : "medium";
      return {
        protocol: "STM-" + Math.random().toString(36).slice(2, 8).toUpperCase(),
        classification: cls,
        message: "Triagem registrada com sucesso (modo demo).",
      };
    }
  },
  availability: async (date: string): Promise<AppointmentSlot[]> => {
    try {
      const { data } = await api.get<AppointmentSlot[]>("/appointments/availability", {
        params: { date },
      });
      if (Array.isArray(data) && data.length) return data;
    } catch {}
    // Fallback mock
    const base = ["08:00","08:30","09:00","09:30","10:00","10:30","11:00","13:30","14:00","14:30","15:00","16:00","16:30","17:00"];
    return base.map((time, i) => ({
      time,
      available: i % 7 !== 3,
      urgency: i === 1 || i === 8 ? "high" : i === 4 ? "medium" : undefined,
    }));
  },
};

// ===== Triage sessions (multi-turn) =====
export type TriageSessionState =
  | "gathering"
  | "assessment"
  | "scheduling"
  | "confirmed";

export interface TriageMessage {
  role: "user" | "assistant";
  text: string;
  ts: string;
}

export interface TriageExtracted {
  main_complaint: string | null;
  pain_intensity: number | null;
  duration: string | null;
  associated_symptoms: string[];
}

export interface TriageSession {
  id: string;
  state: TriageSessionState;
  messages: TriageMessage[];
  extracted: TriageExtracted;
  urgency_score: number | null;
  specialty: string | null;
  is_emergency: boolean;
  patient_hint: Record<string, string>;
  linked_triage_id: string | null;
  created_at: string;
  updated_at: string;
  turn_count: number;
  share_url: string;
}

// ===== Knowledge Base (admin) =====
export interface KnowledgeDoc {
  id: string;
  filename: string;
  size: number;
  status: "indexed" | "empty" | "error" | "ready" | "processing";
  uploaded_at: string;
  chunks_indexed: number;
  indexed_status: string | null;
  has_file: boolean;
}

export const knowledgeApi = {
  list: async (): Promise<KnowledgeDoc[]> => {
    const { data } = await api.get<KnowledgeDoc[]>("/admin/knowledge");
    return Array.isArray(data) ? data : [];
  },
  stats: async (): Promise<{ total_chunks: number; total_documents: number; collection: string }> => {
    const { data } = await api.get<{ total_chunks: number; total_documents: number; collection: string }>(
      "/admin/knowledge/stats",
    );
    return data;
  },
  upload: async (file: File): Promise<KnowledgeDoc> => {
    const fd = new FormData();
    fd.append("file", file);
    const { data } = await api.post<KnowledgeDoc>("/admin/knowledge/upload", fd, {
      headers: { "Content-Type": "multipart/form-data" },
    });
    return data;
  },
  remove: async (id: string): Promise<{ deleted: string; chunks_removed: number }> => {
    const { data } = await api.delete<{ deleted: string; chunks_removed: number }>(
      `/admin/knowledge/${id}`,
    );
    return data;
  },
  downloadUrl: (id: string): string => `${api.defaults.baseURL}/admin/knowledge/${id}/download`,
};

export const analyticsApi = {
  metrics: async (range: "hour" | "day" | "month" | "custom" = "day"): Promise<AnalyticsMetrics> => {
    try {
      const { data } = await api.get<AnalyticsMetrics>("/analytics/metrics", { params: { range } });
      if (data && Array.isArray(data.volume_series)) return data;
    } catch {}
    return mockMetrics(range);
  },
};

export const adminApi = {
  list: async (): Promise<KnowledgeDocument[]> => {
    try {
      const { data } = await api.get<KnowledgeDocument[]>("/admin/knowledge");
      if (Array.isArray(data)) return data;
    } catch {}
    return [];
  },
  upload: async (file: File): Promise<KnowledgeDocument> => {
    const form = new FormData();
    form.append("file", file);
    try {
      const { data } = await api.post<KnowledgeDocument>(
        "/admin/knowledge/upload",
        form,
        { headers: { "Content-Type": "multipart/form-data" } },
      );
      return data;
    } catch {
      return {
        id: Math.random().toString(36).slice(2),
        filename: file.name,
        size: file.size,
        status: "ready",
        uploaded_at: new Date().toISOString(),
      };
    }
  },
};

function mockMetrics(range: "hour" | "day" | "month" | "custom"): AnalyticsMetrics {
  const labels =
    range === "hour"
      ? ["08h","09h","10h","11h","12h","13h","14h","15h","16h","17h"]
      : range === "month"
      ? ["Jan","Fev","Mar","Abr","Mai","Jun","Jul","Ago","Set","Out","Nov","Dez"]
      : ["Seg","Ter","Qua","Qui","Sex","Sáb","Dom"];
  const seed = range.length;
  const volume_series = labels.map((label, i) => ({
    label,
    value: Math.round(20 + Math.abs(Math.sin(i + seed)) * 80 + i * 3),
  }));
  return {
    open_now: 7,
    in_progress: 3,
    avg_wait_minutes: 12,
    nps_avg: 4.6,
    volume_series,
    mix: [
      { type: "consulta", label: "Consultas", value: 142 },
      { type: "emergencia", label: "Emergências", value: 28 },
      { type: "retorno", label: "Retorno", value: 64 },
      { type: "remarcacao", label: "Remarcação", value: 19 },
      { type: "cancelamento", label: "Cancelamentos", value: 11 },
    ],
    ai_insights: [
      "Aumento de 18% em emergências odontológicas nas últimas 2 semanas — avaliar plantão extra.",
      "Picos de remarcação concentrados às segundas — considerar lembrete proativo no domingo.",
      "Motivo recorrente: 'dor de dente intensa' em pacientes sem retorno há mais de 6 meses.",
    ],
  };
}

// Compat: dashboard antigo importava QueuePatient/dashboardApi; mantidos para evitar quebra.
export interface QueuePatient {
  id: string;
  name: string;
  reason: string;
  classification: UrgencyLevel;
  confidence: number;
  waiting_since: string;
  last_messages: string[];
}
export const dashboardApi = {
  list: async (): Promise<QueuePatient[]> => {
    try {
      const { data } = await api.get<QueuePatient[]>("/dashboard/queue");
      if (Array.isArray(data)) return data;
    } catch {}
    return [];
  },
};

export const uploadsApi = {
  sign: async (file: File): Promise<SignedUploadResponse> => {
    try {
      const { data } = await api.post<SignedUploadResponse>("/uploads/sign", {
        filename: file.name,
        content_type: file.type,
        size: file.size,
      });
      if (data && data.upload_url) return data;
    } catch {}
    return {
      upload_url: "mock://upload",
      object_key: `mock/${Date.now()}-${file.name}`,
      method: "PUT",
      mock: true,
    };
  },
  confirm: async (meta: {
    object_key: string;
    filename: string;
    size: number;
    content_type: string;
  }): Promise<ConfirmedUpload> => {
    try {
      const { data } = await api.post<ConfirmedUpload>("/uploads/confirm", meta);
      if (data && data.file_id) return data;
    } catch {}
    return {
      file_id: "mock-" + Math.random().toString(36).slice(2, 10),
      object_key: meta.object_key,
      filename: meta.filename,
      size: meta.size,
      content_type: meta.content_type,
    };
  },
  uploadWithProgress: (
    signed: SignedUploadResponse,
    file: File,
    onProgress: (pct: number) => void,
    signal?: AbortSignal,
  ): Promise<void> => {
    return new Promise((resolve, reject) => {
      // Mock mode: simulate progress without network
      if (signed.mock) {
        let p = 0;
        const tick = () => {
          if (signal?.aborted) return reject(new Error("aborted"));
          p = Math.min(100, p + Math.random() * 22 + 10);
          onProgress(p);
          if (p < 100) setTimeout(tick, 180);
          else resolve();
        };
        setTimeout(tick, 150);
        return;
      }
      const xhr = new XMLHttpRequest();
      xhr.open(signed.method ?? "PUT", signed.upload_url, true);
      const headers = signed.headers ?? { "Content-Type": file.type };
      Object.entries(headers).forEach(([k, v]) => xhr.setRequestHeader(k, v));
      xhr.upload.onprogress = (e) => {
        if (e.lengthComputable) onProgress((e.loaded / e.total) * 100);
      };
      xhr.onload = () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          onProgress(100);
          resolve();
        } else {
          reject(new Error(`Upload failed (${xhr.status})`));
        }
      };
      xhr.onerror = () => reject(new Error("Network error"));
      xhr.onabort = () => reject(new Error("aborted"));
      signal?.addEventListener("abort", () => xhr.abort());
      xhr.send(file);
    });
  },
};

// ===== Auth =====
export type UserRole = "reception" | "admin" | "super_admin" | "tenant_admin" | string;
export interface AuthUser {
  user_id: string;
  email: string;
  name?: string;
  role: UserRole;
  tenant_id?: string;
}
export const authApi = {
  me: async (): Promise<AuthUser> => {
    const { data } = await api.get<AuthUser>("/auth/me");
    return data;
  },
  login: async (email: string, password: string): Promise<AuthUser> => {
    const { data } = await api.post<{ access_token: string; refresh_token: string; user: AuthUser }>(
      "/auth/login",
      { email, password },
    );
    return data.user;
  },
  logout: async (): Promise<void> => {
    await api.post("/auth/logout");
  },
};

// ===== Admin: Specialties =====
export interface Specialty {
  id: string;
  code: string;
  name: string;
  default_duration_min: number;
  default_price: number;
  color: string;
  is_active?: boolean;
}
export type SpecialtyInput = Omit<Specialty, "id" | "is_active">;
export const specialtiesApi = {
  list: async (): Promise<Specialty[]> => {
    const { data } = await api.get<Specialty[]>("/admin/specialties");
    return Array.isArray(data) ? data : [];
  },
  create: async (payload: SpecialtyInput): Promise<Specialty> => {
    const { data } = await api.post<Specialty>("/admin/specialties", payload);
    return data;
  },
  update: async (id: string, payload: Partial<SpecialtyInput>): Promise<Specialty> => {
    const { data } = await api.patch<Specialty>(`/admin/specialties/${id}`, payload);
    return data;
  },
  remove: async (id: string): Promise<void> => {
    await api.delete(`/admin/specialties/${id}`);
  },
};

// ===== Admin: Units =====
export interface Unit {
  id: string;
  name: string;
  city?: string;
  address?: string;
  phone?: string;
  is_active: boolean;
}
export type UnitInput = Omit<Unit, "id">;
export const unitsApi = {
  list: async (): Promise<Unit[]> => {
    const { data } = await api.get<Unit[]>("/admin/units");
    return Array.isArray(data) ? data : [];
  },
  create: async (payload: UnitInput): Promise<Unit> => {
    const { data } = await api.post<Unit>("/admin/units", payload);
    return data;
  },
  update: async (id: string, payload: Partial<UnitInput>): Promise<Unit> => {
    const { data } = await api.patch<Unit>(`/admin/units/${id}`, payload);
    return data;
  },
  remove: async (id: string): Promise<void> => {
    await api.delete(`/admin/units/${id}`);
  },
};

// ===== Admin: Professionals =====
export interface Professional {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  photo_url?: string;
  registration_number?: string;
  bio?: string;
  specialty_ids: string[];
  clinic_ids: string[];
}
export type ProfessionalInput = Omit<Professional, "id">;
export const professionalsApi = {
  list: async (): Promise<Professional[]> => {
    const { data } = await api.get<Professional[]>("/admin/professionals");
    return Array.isArray(data) ? data : [];
  },
  get: async (id: string): Promise<Professional> => {
    const { data } = await api.get<Professional>(`/admin/professionals/${id}`);
    return data;
  },
  create: async (payload: ProfessionalInput): Promise<Professional> => {
    const { data } = await api.post<Professional>("/admin/professionals", payload);
    return data;
  },
  update: async (id: string, payload: Partial<ProfessionalInput>): Promise<Professional> => {
    const { data } = await api.patch<Professional>(`/admin/professionals/${id}`, payload);
    return data;
  },
  remove: async (id: string): Promise<void> => {
    await api.delete(`/admin/professionals/${id}`);
  },
};

// ===== Working hours =====
export type Weekday =
  | "monday" | "tuesday" | "wednesday" | "thursday" | "friday" | "saturday" | "sunday";
export interface TimeRange { start: string; end: string }
export interface ScheduleOverride {
  date: string;
  type: "off" | "custom";
  reason?: string;
  slots?: TimeRange[];
}
export interface WorkingHours {
  professional_id: string;
  clinic_id: string;
  weekly: Record<Weekday, TimeRange[]>;
  overrides: ScheduleOverride[];
}
export const workingHoursApi = {
  get: async (professionalId: string, clinicId: string): Promise<WorkingHours> => {
    const { data } = await api.get<WorkingHours>(
      `/admin/professionals/${professionalId}/working-hours`,
      { params: { clinic_id: clinicId } },
    );
    return data;
  },
  save: async (professionalId: string, payload: WorkingHours): Promise<WorkingHours> => {
    const { data } = await api.put<WorkingHours>(
      `/admin/professionals/${professionalId}/working-hours`,
      payload,
    );
    return data;
  },
};

// ===== Tenant Settings (Fase 4) =====
export interface TenantSettings {
  timezone?: string;
  language?: string;
  branding?: { logo_url?: string | null; primary_color?: string | null };
  triage_prompt_override?: string | null;
  weekly_insights_enabled?: boolean;
  weekly_insights_recipient?: string | null;
}

export const tenantSettingsApi = {
  get: async (): Promise<TenantSettings> => {
    const { data } = await api.get<TenantSettings>("/admin/tenant-settings");
    return data;
  },
  update: async (settings: TenantSettings): Promise<TenantSettings> => {
    const { data } = await api.put<TenantSettings>("/admin/tenant-settings", settings);
    return data;
  },
};

// ===== Admin Triage Sessions Dashboard (Fase 4) =====
export interface AdminTriageSessionItem {
  id: string;
  state: "gathering" | "assessment" | "scheduling" | "confirmed";
  main_complaint: string | null;
  urgency_score: number | null;
  is_emergency: boolean;
  specialty: string | null;
  turn_count: number;
  last_user_message: string | null;
  minutes_since_start: number;
  minutes_since_update: number;
  created_at: string;
  updated_at: string;
  linked_triage_id: string | null;
}

export const adminTriageApi = {
  list: async (states?: string[], limit = 50): Promise<AdminTriageSessionItem[]> => {
    const params = new URLSearchParams();
    if (states && states.length) params.set("state", states.join(","));
    params.set("limit", String(limit));
    const { data } = await api.get<AdminTriageSessionItem[]>(
      `/admin/triage-sessions?${params.toString()}`,
    );
    return Array.isArray(data) ? data : [];
  },
  getDetail: async (id: string): Promise<TriageSession> => {
    const { data } = await api.get<TriageSession>(`/admin/triage-sessions/${id}`);
    return data;
  },
};
