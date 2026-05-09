import {
  createContext, useContext, useEffect, useRef, useState, type ReactNode,
} from "react";

export interface EmergencyAlert {
  session_id: string;
  tenant_id: string;
  urgency_score: number;
  specialty: string | null;
  main_complaint: string | null;
  patient_name: string | null;
  patient_whatsapp: string | null;
  last_user_message: string | null;
  is_emergency: boolean;
  source: string;
  ts: string;
}

const RAW_API =
  (import.meta as any).env?.VITE_API_URL ||
  "https://smart-dental-clinic.preview.emergentagent.com/api/v1";
// Strip trailing /api/v1 if present so we can re-append it.
const ORIGIN = RAW_API.replace(/\/api\/v1\/?$/, "");
const SSE_URL = `${ORIGIN}/api/v1/alerts/stream`;

interface Ctx {
  alerts: EmergencyAlert[];
  connected: boolean;
  dismiss: (sessionId: string) => void;
}

const EmergencyAlertsContext = createContext<Ctx | null>(null);

export function EmergencyAlertsProvider({
  enabled = true, children,
}: { enabled?: boolean; children: ReactNode }) {
  const [alerts, setAlerts] = useState<EmergencyAlert[]>([]);
  const [connected, setConnected] = useState(false);
  const sourceRef = useRef<EventSource | null>(null);

  useEffect(() => {
    if (!enabled || typeof window === "undefined") return;
    const es = new EventSource(SSE_URL, { withCredentials: true });
    sourceRef.current = es;

    es.addEventListener("ready", () => setConnected(true));
    es.addEventListener("emergency", (ev: MessageEvent) => {
      try {
        const data = JSON.parse(ev.data) as EmergencyAlert;
        setAlerts((prev) =>
          prev.some((a) => a.session_id === data.session_id)
            ? prev
            : [data, ...prev].slice(0, 5),
        );
      } catch (e) {
        console.error("Bad emergency payload", e);
      }
    });
    es.onerror = () => setConnected(false);

    return () => {
      es.close();
      sourceRef.current = null;
      setConnected(false);
    };
  }, [enabled]);

  const dismiss = (sessionId: string) =>
    setAlerts((prev) => prev.filter((a) => a.session_id !== sessionId));

  return (
    <EmergencyAlertsContext.Provider value={{ alerts, connected, dismiss }}>
      {children}
    </EmergencyAlertsContext.Provider>
  );
}

export function useEmergencyAlerts(): Ctx {
  const ctx = useContext(EmergencyAlertsContext);
  if (!ctx) return { alerts: [], connected: false, dismiss: () => {} };
  return ctx;
}
