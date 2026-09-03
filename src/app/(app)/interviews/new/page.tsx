import type { Metadata } from "next";
import { requireUser } from "@/lib/auth";
import { NewInterviewFlow } from "@/components/new-interview-flow";

export const metadata: Metadata = { title: "New Interview" };

export default async function NewInterviewPage() {
  await requireUser();
  return <NewInterviewFlow />;
}
