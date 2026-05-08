import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger,
} from "@/components/ui/dialog";
import {
  professionalsApi, specialtiesApi, unitsApi,
  type Professional, type ProfessionalInput,
} from "@/lib/api";
import { Pencil, Plus, Trash2, Loader2, CalendarClock, User } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/admin/profissionais")({
  head: () => ({ meta: [{ title: "Profissionais — Admin STOMNI" }] }),
  component: ProfessionalsPage,
});

const empty: ProfessionalInput = {
  name: "", email: "", phone: "", photo_url: "", registration_number: "",
  bio: "", specialty_ids: [], clinic_ids: [],
};

function ProfessionalsPage() {
  const qc = useQueryClient();
  const { data: pros, isLoading } = useQuery({
    queryKey: ["professionals"], queryFn: professionalsApi.list,
  });
  const { data: specialties = [] } = useQuery({
    queryKey: ["specialties"], queryFn: specialtiesApi.list,
  });
  const { data: units = [] } = useQuery({ queryKey: ["units"], queryFn: unitsApi.list });

  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Professional | null>(null);
  const [form, setForm] = useState<ProfessionalInput>(empty);

  const startCreate = () => { setEditing(null); setForm(empty); setOpen(true); };
  const startEdit = (p: Professional) => {
    setEditing(p);
    setForm({
      name: p.name, email: p.email ?? "", phone: p.phone ?? "",
      photo_url: p.photo_url ?? "", registration_number: p.registration_number ?? "",
      bio: p.bio ?? "", specialty_ids: p.specialty_ids ?? [], clinic_ids: p.clinic_ids ?? [],
    });
    setOpen(true);
  };

  const save = useMutation({
    mutationFn: () => editing
      ? professionalsApi.update(editing.id, form)
      : professionalsApi.create(form),
    onSuccess: () => {
      toast.success(editing ? "Profissional atualizado" : "Profissional criado");
      qc.invalidateQueries({ queryKey: ["professionals"] });
      setOpen(false);
    },
    onError: (e: any) => toast.error(e?.response?.data?.message ?? "Erro ao salvar"),
  });

  const remove = useMutation({
    mutationFn: (id: string) => professionalsApi.remove(id),
    onSuccess: () => {
      toast.success("Profissional removido");
      qc.invalidateQueries({ queryKey: ["professionals"] });
    },
    onError: (e: any) => toast.error(e?.response?.data?.message ?? "Erro ao remover"),
  });

  const toggle = (key: "specialty_ids" | "clinic_ids", id: string) => {
    setForm((f) => {
      const set = new Set(f[key]);
      set.has(id) ? set.delete(id) : set.add(id);
      return { ...f, [key]: Array.from(set) };
    });
  };

  return (
    <div className="space-y-6">
      <header className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Profissionais</h1>
          <p className="text-sm text-muted-foreground">Equipe clínica e horários.</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button onClick={startCreate}><Plus className="mr-2 h-4 w-4" /> Novo</Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>{editing ? "Editar profissional" : "Novo profissional"}</DialogTitle>
            </DialogHeader>
            <div className="grid gap-4 py-2 md:grid-cols-2">
              <div className="space-y-1.5 md:col-span-2">
                <Label>Nome</Label>
                <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <Label>E-mail</Label>
                <Input type="email" value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <Label>Telefone</Label>
                <Input value={form.phone}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <Label>Registro (CRO/CRM)</Label>
                <Input value={form.registration_number}
                  onChange={(e) => setForm({ ...form, registration_number: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <Label>Foto (URL)</Label>
                <Input value={form.photo_url}
                  onChange={(e) => setForm({ ...form, photo_url: e.target.value })} />
              </div>
              <div className="space-y-1.5 md:col-span-2">
                <Label>Bio</Label>
                <Textarea rows={3} value={form.bio}
                  onChange={(e) => setForm({ ...form, bio: e.target.value })} />
              </div>
              <MultiSelect
                label="Especialidades"
                options={specialties.map((s) => ({ id: s.id, label: s.name }))}
                selected={form.specialty_ids}
                onToggle={(id) => toggle("specialty_ids", id)}
              />
              <MultiSelect
                label="Unidades onde atende"
                options={units.map((u) => ({ id: u.id, label: u.name }))}
                selected={form.clinic_ids}
                onToggle={(id) => toggle("clinic_ids", id)}
              />
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
              <Button onClick={() => save.mutate()} disabled={save.isPending}>
                {save.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Salvar
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </header>

      {isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2">
          <Skeleton className="h-40 w-full" /><Skeleton className="h-40 w-full" />
        </div>
      ) : !pros?.length ? (
        <Card className="p-8 text-center text-sm text-muted-foreground">
          Nenhum profissional cadastrado.
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {pros.map((p) => (
            <Card key={p.id} className="p-5">
              <div className="flex gap-4">
                {p.photo_url ? (
                  <img src={p.photo_url} alt={p.name}
                    className="h-16 w-16 rounded-full object-cover" />
                ) : (
                  <div className="grid h-16 w-16 place-items-center rounded-full bg-accent text-primary">
                    <User className="h-7 w-7" />
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <h3 className="truncate font-semibold">{p.name}</h3>
                  <p className="text-xs text-muted-foreground">{p.registration_number || "—"}</p>
                  <p className="mt-2 flex flex-wrap gap-1">
                    {p.specialty_ids.map((id) => {
                      const s = specialties.find((x) => x.id === id);
                      if (!s) return null;
                      return (
                        <span key={id}
                          className="rounded-full px-2 py-0.5 text-[10px] font-medium text-white"
                          style={{ backgroundColor: s.color }}>{s.name}</span>
                      );
                    })}
                  </p>
                  <p className="mt-2 text-xs text-muted-foreground">
                    Unidades: {p.clinic_ids.map((id) => units.find((u) => u.id === id)?.name).filter(Boolean).join(", ") || "—"}
                  </p>
                </div>
              </div>
              <div className="mt-4 flex flex-wrap items-center gap-2">
                <Button asChild size="sm" variant="outline">
                  <Link to="/admin/profissionais/$id/horarios" params={{ id: p.id }}>
                    <CalendarClock className="mr-2 h-4 w-4" /> Horários
                  </Link>
                </Button>
                <Button size="sm" variant="ghost" onClick={() => startEdit(p)}>
                  <Pencil className="mr-2 h-4 w-4" /> Editar
                </Button>
                <Button size="sm" variant="ghost"
                  onClick={() => { if (confirm(`Remover ${p.name}?`)) remove.mutate(p.id); }}>
                  <Trash2 className="mr-2 h-4 w-4" /> Remover
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

function MultiSelect({
  label, options, selected, onToggle,
}: {
  label: string;
  options: { id: string; label: string }[];
  selected: string[];
  onToggle: (id: string) => void;
}) {
  return (
    <div className="space-y-1.5">
      <Label>{label}</Label>
      <div className="max-h-40 space-y-1 overflow-y-auto rounded-md border p-2">
        {options.length === 0 && (
          <p className="px-1 py-2 text-xs text-muted-foreground">Nenhum item disponível.</p>
        )}
        {options.map((o) => (
          <label key={o.id} className="flex cursor-pointer items-center gap-2 rounded px-2 py-1 hover:bg-muted">
            <Checkbox checked={selected.includes(o.id)} onCheckedChange={() => onToggle(o.id)} />
            <span className="text-sm">{o.label}</span>
          </label>
        ))}
      </div>
    </div>
  );
}