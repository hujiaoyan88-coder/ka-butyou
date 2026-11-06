import { createFileRoute } from "@tanstack/react-router";
import { VocabApp } from "@/components/vocab/vocab-app";

export const Route = createFileRoute("/")({ component: Home });

function Home() {
  return <VocabApp />;
}
