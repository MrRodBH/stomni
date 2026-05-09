import { createFileRoute } from "@tanstack/react-router";
import { TriageEntry } from "@/components/triage-entry";

export const Route = createFileRoute("/triagem/")({
  head: () => ({
    meta: [
      { title: "Triagem — STOMNI" },
      { name: "description", content: "Triagem conversacional com IA clínica." },
    ],
  }),
  component: () => <TriageEntry />,
});