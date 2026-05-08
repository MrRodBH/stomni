import { createFileRoute } from "@tanstack/react-router";
import { TriageChat } from "@/components/triage-chat";

export const Route = createFileRoute("/triagem")({
  head: () => ({
    meta: [
      { title: "Triagem — STOMNI" },
      { name: "description", content: "Triagem conversacional com IA clínica." },
    ],
  }),
  component: () => <TriageChat />,
});