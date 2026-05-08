import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Tabs, TabsContent, TabsList, TabsTrigger,
} from "@/components/ui/tabs";
import {
  Collapsible, CollapsibleContent, CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  professionalsApi, unitsApi, workingHoursApi,
  type Weekday, type TimeRange, type WorkingHours, type ScheduleOverride,
} from "@/lib/api";
import { ArrowLeft, ChevronDown, Loader2, Plus, Trash2, X } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/admin/profissionais/$id/horarios")({
  head: () => ({ meta: [{ title: "Horários — Admin STOMNI" }] }),
  component: WorkingHoursPage,
});

const WEEKDAYS: { key: Weekday; label: string }[] = [
  { key: "monday", label: "Segunda" },
  { key: "tuesday", label: "Terça" },
  { key: "wednesday", label: "Quarta" },
  { key: "thursday", label: "Quinta" },
  { key: "friday", label: "Sexta" },
  { key: "saturday", label: "Sábado" },
  { key: "sunday", label: "Domingo" },
];

const emptyWeekly = (): Record<Weekday, TimeRange[]> => ({
  monday: [], tuesday: [], wednesday: [], thursday: [],
  friday: [], saturday: [], sunday: [],
});

function WorkingHoursPage() {
  const { id } = Route.useParams();
  const { data: pro, isLoading } = useQuery({
    queryKey: ["professional", id], queryFn: () => professionalsApi.get(id),
  });
  const { data: units = [] } = useQuery({ queryKey: ["units"], queryFn: unitsApi.list });

  if (isLoading) return <Skeleton className="h-64 w-full" />;
  if (!pro) return <p className="text-sm text-muted-foreground">Profissional não encontrado.</p>;

  const proUnits = units.filter((u) => pro.clinic_ids.includes(u.id));

  return (
    <div className="space-y-6">
      <header className="space-y-2">
        <Button asChild variant="ghost" size="sm" className="-ml-2">
          <Link to="/admin/profissionais">
            <ArrowLeft className="mr-1 h-4 w-4" /> Voltar
          </Link>
        </Button>
        <h1 className="text-2xl font-bold tracking-tight">Horários — {pro.name}</h1>
        <p className="text-sm text-muted-foreground">
          Configure agenda semanal e folgas por unidade.
        </p>
      </header>

      {proUnits.length === 0 ? (
        <Card className="p-6 text-sm text-muted-foreground">
          Este profissional ainda não está vinculado a nenhuma unidade.
        </Card>
      ) : (
        <div className="space-y-4">
          {proUnits.map((u) => (
            <ClinicSchedule key={u.id} professionalId={pro.id} clinicId={u.id} clinicName={u.name} />
          ))}
        </div>
      )}
    </div>
  );
}

function ClinicSchedule({
  professionalId, clinicId, clinicName,
}: { professionalId: string; clinicId: string; clinicName: string }) {
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: ["working-hours", professionalId, clinicId],
    queryFn: () => workingHoursApi.get(professionalId, clinicId).catch(() => null),
  });

  const [weekly, setWeekly] = useState<Record<Weekday, TimeRange[]>>(emptyWeekly());
  const [overrides, setOverrides] = useState<ScheduleOverride[]>([]);
  const [newDate, setNewDate] = useState("");
  const [newReason, setNewReason] = useState("");
  const [open, setOpen] = useState(true);

  useEffect(() => {
    if (data) {
      setWeekly({ ...emptyWeekly(), ...data.weekly });
      setOverrides(data.overrides ?? []);
    }
  }, [data]);

  const save = useMutation({
    mutationFn: () => workingHoursApi.save(professionalId, {
      professional_id: professionalId, clinic_id: clinicId, weekly, overrides,
    } as WorkingHours),
    onSuccess: () => {
      toast.success(`Horários de ${clinicName} salvos`);
      qc.invalidateQueries({ queryKey: ["working-hours", professionalId, clinicId] });
    },
    onError: (e: any) => toast.error(e?.response?.data?.message ?? "Erro ao salvar"),
  });

  const addRange = (day: Weekday) =>
    setWeekly((w) => ({ ...w, [day]: [...w[day], { start: "09:00", end: "12:00" }] }));
  const removeRange = (day: Weekday, idx: number) =>
    setWeekly((w) => ({ ...w, [day]: w[day].filter((_, i) => i !== idx) }));
  const updateRange = (day: Weekday, idx: number, patch: Partial<TimeRange>) =>
    setWeekly((w) => ({
      ...w,
      [day]: w[day].map((r, i) => i === idx ? { ...r, ...patch } : r),
    }));

  const addOverride = () => {
    if (!newDate) return;
    setOverrides((o) => [...o, { date: newDate, type: "off", reason: newReason || undefined }]);
    setNewDate(""); setNewReason("");
  };

  return (
    <Card className="overflow-hidden">
      <Collapsible open={open} onOpenChange={setOpen}>
        <CollapsibleTrigger asChild>
          <button className="flex w-full items-center justify-between gap-3 px-5 py-4 text-left">
            <span className="font-semibold">{clinicName}</span>
            <ChevronDown className={`h-4 w-4 transition ${open ? "rotate-180" : ""}`} />
          </button>
        </CollapsibleTrigger>
        <CollapsibleContent>
          {isLoading ? (
            <div className="px-5 pb-5"><Skeleton className="h-40 w-full" /></div>
          ) : (
            <Tabs defaultValue="weekly" className="px-5 pb-5">
              <TabsList>
                <TabsTrigger value="weekly">Agenda semanal</TabsTrigger>
                <TabsTrigger value="overrides">Folgas e exceções</TabsTrigger>
              </TabsList>

              <TabsContent value="weekly" className="mt-4 space-y-3">
                {WEEKDAYS.map(({ key, label }) => (
                  <div key={key} className="rounded-md border p-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">{label}</span>
                      <Button size="sm" variant="ghost" onClick={() => addRange(key)}>
                        <Plus className="mr-1 h-4 w-4" /> Turno
                      </Button>
                    </div>
                    {weekly[key].length === 0 ? (
                      <p className="mt-1 text-xs text-muted-foreground">Sem atendimento</p>
                    ) : (
                      <div className="mt-2 space-y-2">
                        {weekly[key].map((r, idx) => (
                          <div key={idx} className="flex items-center gap-2">
                            <Input type="time" value={r.start}
                              onChange={(e) => updateRange(key, idx, { start: e.target.value })}
                              className="w-32" />
                            <span className="text-muted-foreground">até</span>
                            <Input type="time" value={r.end}
                              onChange={(e) => updateRange(key, idx, { end: e.target.value })}
                              className="w-32" />
                            <Button size="icon" variant="ghost" onClick={() => removeRange(key, idx)}>
                              <X className="h-4 w-4" />
                            </Button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </TabsContent>

              <TabsContent value="overrides" className="mt-4 space-y-3">
                <div className="flex flex-wrap items-end gap-2">
                  <div className="space-y-1">
                    <Label className="text-xs">Data</Label>
                    <Input type="date" value={newDate}
                      onChange={(e) => setNewDate(e.target.value)} className="w-44" />
                  </div>
                  <div className="space-y-1 flex-1 min-w-[180px]">
                    <Label className="text-xs">Motivo</Label>
                    <Input value={newReason} placeholder="Ex.: feriado, congresso..."
                      onChange={(e) => setNewReason(e.target.value)} />
                  </div>
                  <Button onClick={addOverride}>
                    <Plus className="mr-2 h-4 w-4" /> Adicionar folga
                  </Button>
                </div>
                {overrides.length === 0 ? (
                  <p className="text-xs text-muted-foreground">Nenhuma folga cadastrada.</p>
                ) : (
                  <ul className="divide-y rounded-md border">
                    {overrides.map((o, idx) => (
                      <li key={idx} className="flex items-center justify-between px-3 py-2 text-sm">
                        <span>
                          <span className="font-medium">{o.date}</span>
                          {o.reason && <span className="text-muted-foreground"> · {o.reason}</span>}
                        </span>
                        <Button size="icon" variant="ghost"
                          onClick={() => setOverrides((arr) => arr.filter((_, i) => i !== idx))}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </li>
                    ))}
                  </ul>
                )}
              </TabsContent>
            </Tabs>
          )}

          <div className="flex justify-end border-t bg-muted/30 px-5 py-3">
            <Button onClick={() => save.mutate()} disabled={save.isPending}>
              {save.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Salvar horários
            </Button>
          </div>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
}