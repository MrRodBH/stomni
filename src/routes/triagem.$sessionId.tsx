import { createFileRoute } from "@tanstack/react-router";
import { TriageChat } from "@/components/triage-chat";

export const Route = createFileRoute("/triagem/$sessionId")({
  head: () => ({
    meta: [
      { title: "Triagem — STOMNI" },
      { name: "description", content: "Continue sua triagem conversacional." },
    ],
  }),
  component: SessionPage,
});

function SessionPage() {
  const { sessionId } = Route.useParams();
  return <TriageChat sessionId={sessionId} />;
}