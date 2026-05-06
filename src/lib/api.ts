import axios from "axios";

const API_URL = (import.meta as any).env?.VITE_API_URL || "http://localhost:8000";

export const api = axios.create({
  baseURL: API_URL,
  headers: {
    "Content-Type": "application/json",
  },
});

api.interceptors.request.use((config) => {
  if (typeof window !== "undefined") {
    const token = localStorage.getItem("stomni_token");
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
  }
  return config;
});

export type UrgencyLevel = "low" | "medium" | "high";

export interface TriageMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: string;
}

export interface TriageProcessRequest {
  session_id: string;
  message: string;
  user_profile?: {
    name?: string;
    age?: number;
    [k: string]: unknown;
  };
}

export interface TriageProcessResponse {
  reply: string;
  classification: UrgencyLevel;
  confidence: number;
  suggested_questions: string[];
  action_required: "continue" | "transfer_human" | "schedule" | "emergency";
}

export interface QueuePatient {
  id: string;
  name: string;
  reason: string;
  classification: UrgencyLevel;
  confidence: number;
  waiting_since: string;
  last_messages: string[];
}

export interface KnowledgeDocument {
  id: string;
  filename: string;
  size: number;
  status: "processing" | "ready" | "error";
  uploaded_at: string;
}

export const triageApi = {
  process: async (payload: TriageProcessRequest) => {
    const { data } = await api.post<TriageProcessResponse>(
      "/api/v1/triage/process",
      payload,
    );
    return data;
  },
};

export const dashboardApi = {
  list: async () => {
    const { data } = await api.get<QueuePatient[]>("/api/v1/dashboard/queue");
    return data;
  },
};

export const adminApi = {
  list: async () => {
    const { data } = await api.get<KnowledgeDocument[]>(
      "/api/v1/admin/knowledge",
    );
    return data;
  },
  upload: async (file: File) => {
    const form = new FormData();
    form.append("file", file);
    const { data } = await api.post<KnowledgeDocument>(
      "/api/v1/admin/knowledge/upload",
      form,
      { headers: { "Content-Type": "multipart/form-data" } },
    );
    return data;
  },
};