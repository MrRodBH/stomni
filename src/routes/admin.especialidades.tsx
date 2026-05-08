import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger,
} from "@/components/ui/dialog";
import { specialtiesApi, type Specialty, type SpecialtyInput } from "@/lib/api";
import { Pencil, Plus, Trash2, Loader2 } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/admin/especialidades")({
  head: () => ({ meta: [{ title: "Especialidades — Admin STOMNI" }] }),
  component: SpecialtiesPage,
});

const empty: SpecialtyInput = {
  code: "", name: "", default_duration_min: 30, default_price: 0, color: "#3b82f6",
};

function SpecialtiesPage() {
  const qc = useQueryClient();
  const { data: items, isLoading } = useQuery({
    queryKey: ["specialties"],
    queryFn: specialtiesApi.list,
  });

  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Specialty | null>(null);
  const [form, setForm] = useState<SpecialtyInput>(empty);

  const startCreate = () => { setEditing(null); setForm(empty); setOpen(true); };
  const startEdit = (s: Specialty) => {
    setEditing(s);
    setForm({
      code: s.code, name: s.name,
      default_duration_min: s.default_duration_min,
      default_price: s.default_price, color: s.color,
    });
    setOpen(true);
  };

  const save = useMutation({
    mutationFn: async () => editing
      ? specialtiesApi.update(editing.id, form)
      : specialtiesApi.create(form),
    onSuccess: () => {
      toast.success(editing ? "Especialidade atualizada" : "Especialidade criada");
      qc.invalidateQueries({ queryKey: ["specialties"] });
      setOpen(false);
    },
    onError: (e: any) => toast.error(e?.response?.data?.message ?? "Erro ao salvar"),
  });

  const remove = useMutation({
    mutationFn: (id: string) => specialtiesApi.remove(id),
    onSuccess: () => {
      toast.success("Especialidade removida");
      qc.invalidateQueries({ queryKey: ["specialties"] });
    },
    onError: (e: any) => toast.error(e?.response?.data?.message ?? "Erro ao remover"),
  });

  return (
    <div className="space-y-6">
      <header className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Especialidades</h1>
          <p className="text-sm text-muted-foreground">Cadastro de especialidades clínicas.</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button onClick={startCreate}>
              <Plus className="mr-2 h-4 w-4" /> Nova
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editing ? "Editar especialidade" : "Nova especialidade"}</DialogTitle>
            </DialogHeader>
            <div className="grid gap-4 py-2">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>Código</Label>
                  <Input value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} />
                </div>
                <div className="space-y-1.5">
                  <Label>Cor</Label>
                  <Input type="color" value={form.color}
                    onChange={(e) => setForm({ ...form, color: e.target.value })} />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label>Nome</Label>
                <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>Duração (min)</Label>
                  <Input type="number" min={5} step={5} value={form.default_duration_min}
                    onChange={(e) => setForm({ ...form, default_duration_min: Number(e.target.value) })} />
                </div>
                <div className="space-y-1.5">
                  <Label>Preço (R$)</Label>
                  <Input type="number" min={0} step={0.01} value={form.default_price}
                    onChange={(e) => setForm({ ...form, default_price: Number(e.target.value) })} />
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
              <Button onClick={() => save.mutate()} disabled={save.isPending}>
                {save.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Salvar
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </header>

      <Card className="overflow-hidden">
        {isLoading ? (
          <div className="space-y-2 p-5">
            <Skeleton className="h-8 w-full" />
            <Skeleton className="h-8 w-full" />
            <Skeleton className="h-8 w-full" />
          </div>
        ) : !items?.length ? (
          <p className="px-5 py-8 text-center text-sm text-muted-foreground">
            Nenhuma especialidade cadastrada.
          </p>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-muted/50 text-left text-xs uppercase text-muted-foreground">
              <tr>
                <th className="px-4 py-2.5">Nome</th>
                <th className="px-4 py-2.5">Duração</th>
                <th className="px-4 py-2.5">Preço</th>
                <th className="px-4 py-2.5">Cor</th>
                <th className="px-4 py-2.5">Ativo</th>
                <th className="px-4 py-2.5"></th>
              </tr>
            </thead>
            <tbody>
              {items.map((s) => (
                <tr key={s.id} className="border-t">
                  <td className="px-4 py-3">
                    <div className="font-medium">{s.name}</div>
                    <div className="text-xs text-muted-foreground">{s.code}</div>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">{s.default_duration_min} min</td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {s.default_price.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                  </td>
                  <td className="px-4 py-3">
                    <span className="inline-flex items-center gap-2">
                      <span className="h-4 w-4 rounded-full border" style={{ backgroundColor: s.color }} />
                      <span className="text-xs text-muted-foreground">{s.color}</span>
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={
                      "rounded-full px-2 py-0.5 text-xs " +
                      (s.is_active === false ? "bg-muted text-muted-foreground" : "bg-emerald-100 text-emerald-700")
                    }>
                      {s.is_active === false ? "Inativo" : "Ativo"}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Button size="icon" variant="ghost" onClick={() => startEdit(s)}>
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button size="icon" variant="ghost"
                      onClick={() => { if (confirm(`Remover ${s.name}?`)) remove.mutate(s.id); }}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>
    </div>
  );
}