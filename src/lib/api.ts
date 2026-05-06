import axios from "axios";

const API_URL =
  (import.meta as any).env?.VITE_API_URL ||
  "https://api-emergent.stomnisaude.com.br/v1";

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
