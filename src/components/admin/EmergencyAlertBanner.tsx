import { useEffect, useRef } from "react";
import { useNavigate } from "@tanstack/react-router";
import { AlertTriangle, Stethoscope, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { useEmergencyAlerts } from "@/hooks/useEmergencyAlerts";

export function EmergencyAlertBanner() {
  const { alerts, dismiss } = useEmergencyAlerts();
  const navigate = useNavigate();
  const seenIds = useRef<Set<string>>(new Set());

  useEffect(() => {
    for (const a of alerts) {
      if (seenIds.current.has(a.session_id)) continue;
      seenIds.current.add(a.session_id);
      toast.error(`🚨 Emergência: ${a.main_complaint ?? "ver detalhes"}`, {
        action: {
          label: "Atender",
          onClick: () =>
            navigate({ to: "/admin/triagens" }).catch(() => {
              window.location.href = "/admin/triagens";
            }),
        },
        duration: 12000,
      });
      try {
        new Audio("/sounds/alert.mp3").play().catch(() => {});
      } catch {
        // ignore
      }
    }
  }, [alerts, navigate]);

  if (alerts.length === 0) return null;

  return (
    <div className="mb-4 space-y-2">
      {alerts.slice(0, 3).map((a) => (
        <div
          key={a.session_id}
          className="flex items-start gap-3 rounded-lg border-2 border-destructive bg-destructive/5 p-4 shadow-sm"
        >
          <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 animate-pulse text-destructive" />
          <div className="min-w-0 flex-1 space-y-1.5">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-sm font-bold text-destructive">
                Emergência detectada
              </span>
              <span className="rounded-full bg-destructive px-2 py-0.5 text-[11px] font-semibold text-destructive-foreground">
                Urgência {a.urgency_score}/10
              </span>
            </div>
            <p className="text-sm font-medium">
              {a.patient_name ?? "Paciente identificando-se…"}
              {a.patient_whatsapp && (
                <span className="ml-2 font-normal text-muted-foreground">
                  {a.patient_whatsapp}
                </span>
              )}
            </p>
            {a.main_complaint && (
              <p className="text-sm italic text-muted-foreground">
                "{a.main_complaint}"
              </p>
            )}
            <p className="flex items-center gap-1 text-xs text-muted-foreground">
              <Stethoscope className="h-3 w-3" />
              {a.specialty ?? "especialidade não definida"}
            </p>
            <Button
              size="sm"
              variant="destructive"
              className="mt-1"
              onClick={() => navigate({ to: "/admin/triagens" })}
            >
              Atender agora →
            </Button>
          </div>
          <button
            onClick={() => dismiss(a.session_id)}
            data-testid={`emergency-alert-dismiss-${a.session_id}`}
            className="rounded p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
            aria-label="Dispensar alerta"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      ))}
    </div>
  );
}
