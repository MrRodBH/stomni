import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { SiteHeader } from "@/components/site-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Loader2, Send, AlertTriangle, Stethoscope } from "lucide-react";
import { triageApi, type TriageMessage, type TriageProcessResponse } from "@/lib/api";
import { toast } from "sonner";

export const Route = createFileRoute("/triagem")({
  head: () => ({
    meta: [
      { title: "Triagem — STOMNI" },
      { name: "description", content: "Inicie sua triagem com a assistência virtual STOMNI." },
    ],
  }),
  component: TriagePage,
});

function uid() {
  return Math.random().toString(36).slice(2);
}

function TriagePage() {
  const [sessionId] = useState(() => `s_${uid()}`);
  const [messages, setMessages] = useState<TriageMessage[]>([
    {
      id: uid(),
      role: "assistant",
      content: "Olá! Sou a assistente STOMNI. Conte-me, em poucas palavras, o que você está sentindo hoje.",
      timestamp: new Date().toISOString(),
    },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [last, setLast] = useState<TriageProcessResponse | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, loading]);

  const send = async () => {
    const text = input.trim();
    if (!text || loading) return;
    const userMsg: TriageMessage = {
      id: uid(),
      role: "user",
      content: text,
      timestamp: new Date().toISOString(),
    };
    setMessages((m) => [...m, userMsg]);
    setInput("");
    setLoading(true);
    try {
      const res = await triageApi.process({ session_id: sessionId, message: text });
      setLast(res);
      setMessages((m) => [
        ...m,
        {
          id: uid(),
          role: "assistant",
          content: res.reply,
          timestamp: new Date().toISOString(),
        },
      ]);
    } catch (e) {
      toast.error("Não foi possível processar a mensagem.");
    } finally {
      setLoading(false);
    }
  };

  const requestHuman = () => {
    toast("Encaminhando para um atendente humano...", { icon: "🚑" });
  };

  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />
      <div className="mx-auto grid max-w-5xl gap-6 px-6 py-10 lg:grid-cols-[1fr_320px]">
        <Card className="flex h-[70vh] flex-col overflow-hidden">
          <div className="flex items-center justify-between border-b px-5 py-4">
            <div className="flex items-center gap-3">
              <div className="grid h-9 w-9 place-items-center rounded-full" style={{ background: "var(--gradient-hero)" }}>
                <Stethoscope className="h-4 w-4 text-primary-foreground" />
              </div>
              <div>
                <p className="text-sm font-semibold">Assistente STOMNI</p>
                <p className="text-xs text-muted-foreground">Sessão {sessionId.slice(-6)}</p>
              </div>
            </div>
            <Button size="sm" variant="destructive" onClick={requestHuman}>
              <AlertTriangle className="mr-1 h-4 w-4" /> Emergência
            </Button>
          </div>

          <div ref={scrollRef} className="flex-1 space-y-3 overflow-y-auto px-5 py-4">
            {messages.map((m) => (
              <div key={m.id} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
                <div
                  className={`max-w-[80%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${
                    m.role === "user"
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted text-foreground"
                  }`}
                >
                  {m.content}
                </div>
              </div>
            ))}
            {loading && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" /> Processando triagem...
              </div>
            )}
          </div>

          <form
            onSubmit={(e) => { e.preventDefault(); send(); }}
            className="flex gap-2 border-t bg-card px-5 py-4"
          >
            <Input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Descreva seus sintomas..."
              disabled={loading}
            />
            <Button type="submit" disabled={loading || !input.trim()}>
              <Send className="h-4 w-4" />
            </Button>
          </form>
        </Card>

        <aside className="space-y-4">
          <Card className="p-5">
            <h3 className="text-sm font-semibold">Status atual</h3>
            {last ? (
              <div className="mt-3 space-y-3 text-sm">
                <UrgencyBadge level={last.classification} />
                <p className="text-muted-foreground">
                  Confiança: <span className="font-medium text-foreground">{Math.round(last.confidence * 100)}%</span>
                </p>
                {last.suggested_questions?.length > 0 && (
                  <div>
                    <p className="text-xs font-medium text-muted-foreground uppercase">Sugestões</p>
                    <ul className="mt-1 list-disc space-y-1 pl-4 text-muted-foreground">
                      {last.suggested_questions.map((q, i) => <li key={i}>{q}</li>)}
                    </ul>
                  </div>
                )}
              </div>
            ) : (
              <p className="mt-2 text-sm text-muted-foreground">Aguardando primeira resposta...</p>
            )}
          </Card>
        </aside>
      </div>
    </div>
  );
}

function UrgencyBadge({ level }: { level: "low" | "medium" | "high" }) {
  const map = {
    low: { label: "Baixa urgência", color: "bg-urgency-low" },
    medium: { label: "Urgência moderada", color: "bg-urgency-medium" },
    high: { label: "Alta urgência", color: "bg-urgency-high" },
  } as const;
  const m = map[level];
  return (
    <span className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-medium text-white ${m.color}`}>
      <span className="h-2 w-2 rounded-full bg-white/90" />
      {m.label}
    </span>
  );
}