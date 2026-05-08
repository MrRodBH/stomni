import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger,
} from "@/components/ui/dialog";
import { unitsApi, type Unit, type UnitInput } from "@/lib/api";
import { Pencil, Plus, Trash2, Loader2 } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/admin/unidades")({
  head: () => ({ meta: [{ title: "Unidades — Admin STOMNI" }] }),
  component: UnitsPage,
});

const empty: UnitInput = { name: "", city: "", address: "", phone: "", is_active: true };

function UnitsPage() {
  const qc = useQueryClient();
  const { data: items, isLoading } = useQuery({ queryKey: ["units"], queryFn: unitsApi.list });
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Unit | null>(null);
  const [form, setForm] = useState<UnitInput>(empty);

  const startCreate = () => { setEditing(null); setForm(empty); setOpen(true); };
  const startEdit = (u: Unit) => {
    setEditing(u);
    setForm({
      name: u.name, city: u.city ?? "", address: u.address ?? "",
      phone: u.phone ?? "", is_active: u.is_active,
    });
    setOpen(true);
  };

  const save = useMutation({
    mutationFn: () => editing ? unitsApi.update(editing.id, form) : unitsApi.create(form),
    onSuccess: () => {
      toast.success(editing ? "Unidade atualizada" : "Unidade criada");
      qc.invalidateQueries({ queryKey: ["units"] });
      setOpen(false);
    },
    onError: (e: any) => toast.error(e?.response?.data?.message ?? "Erro ao salvar"),
  });

  const remove = useMutation({
    mutationFn: (id: string) => unitsApi.remove(id),
    onSuccess: () => {
      toast.success("Unidade removida");
      qc.invalidateQueries({ queryKey: ["units"] });
    },
    onError: (e: any) => {
      const status = e?.response?.status;
      const msg = e?.response?.data?.message ?? e?.response?.data?.detail;
      if (status === 409) toast.error(msg ?? "Existem triagens agendadas para esta unidade.");
      else toast.error(msg ?? "Erro ao remover");
    },
  });

  return (
    <div className="space-y-6">
      <header className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Unidades</h1>
          <p className="text-sm text-muted-foreground">Clínicas e endereços de atendimento.</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button onClick={startCreate}><Plus className="mr-2 h-4 w-4" /> Nova</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editing ? "Editar unidade" : "Nova unidade"}</DialogTitle>
            </DialogHeader>
            <div className="grid gap-4 py-2">
              <div className="space-y-1.5">
                <Label>Nome</Label>
                <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>Cidade</Label>
                  <Input value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} />
                </div>
                <div className="space-y-1.5">
                  <Label>Telefone</Label>
                  <Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label>Endereço</Label>
                <Input value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} />
              </div>
              <div className="flex items-center gap-3">
                <Switch checked={form.is_active}
                  onCheckedChange={(v) => setForm({ ...form, is_active: v })} />
                <Label>Ativa</Label>
              </div>
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

      <Card className="overflow-hidden">
        {isLoading ? (
          <div className="space-y-2 p-5">
            <Skeleton className="h-8 w-full" /><Skeleton className="h-8 w-full" />
          </div>
        ) : !items?.length ? (
          <p className="px-5 py-8 text-center text-sm text-muted-foreground">Nenhuma unidade.</p>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-muted/50 text-left text-xs uppercase text-muted-foreground">
              <tr>
                <th className="px-4 py-2.5">Nome</th>
                <th className="px-4 py-2.5">Cidade</th>
                <th className="px-4 py-2.5">Telefone</th>
                <th className="px-4 py-2.5">Status</th>
                <th className="px-4 py-2.5"></th>
              </tr>
            </thead>
            <tbody>
              {items.map((u) => (
                <tr key={u.id} className="border-t">
                  <td className="px-4 py-3">
                    <div className="font-medium">{u.name}</div>
                    <div className="text-xs text-muted-foreground">{u.address}</div>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">{u.city}</td>
                  <td className="px-4 py-3 text-muted-foreground">{u.phone}</td>
                  <td className="px-4 py-3">
                    <span className={
                      "rounded-full px-2 py-0.5 text-xs " +
                      (u.is_active ? "bg-emerald-100 text-emerald-700" : "bg-muted text-muted-foreground")
                    }>
                      {u.is_active ? "Ativa" : "Inativa"}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Button size="icon" variant="ghost" onClick={() => startEdit(u)}>
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button size="icon" variant="ghost"
                      onClick={() => { if (confirm(`Remover ${u.name}?`)) remove.mutate(u.id); }}>
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