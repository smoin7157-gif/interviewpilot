import dynamic from "next/dynamic";
import { Skeleton } from "@/components/ui/skeleton";

function WorkspaceShell() {
  return (
    <div className="flex min-h-[70dvh] flex-col gap-4 p-4 sm:p-6" aria-busy="true" aria-label="Loading practice workspace">
      <Skeleton className="h-8 w-48" />
      <div className="grid flex-1 gap-4 lg:grid-cols-[minmax(0,280px)_1fr]">
        <Skeleton className="hidden h-full min-h-[420px] rounded-2xl lg:block" />
        <Skeleton className="min-h-[420px] w-full rounded-2xl" />
      </div>
    </div>
  );
}

function MockShell() {
  return (
    <div className="mx-auto flex min-h-[70dvh] max-w-2xl flex-col items-center justify-center gap-4 px-4" aria-busy="true" aria-label="Loading mock interview">
      <Skeleton className="size-16 rounded-full" />
      <Skeleton className="h-6 w-56" />
      <Skeleton className="h-32 w-full max-w-md rounded-3xl" />
    </div>
  );
}

function DemoShell() {
  return (
    <div className="mx-auto mt-12 max-w-3xl space-y-4" aria-busy="true" aria-label="Loading sample question">
      <Skeleton className="h-11 w-64" />
      <Skeleton className="h-[22rem] w-full rounded-3xl" />
    </div>
  );
}

export const LandingDemoLazy = dynamic(
  () => import("@/components/landing-demo").then((mod) => mod.LandingDemo),
  { loading: () => <DemoShell /> }
);

export const InterviewWorkspaceLazy = dynamic(
  () => import("@/components/interview-workspace").then((mod) => mod.InterviewWorkspace),
  { loading: () => <WorkspaceShell /> }
);

export const MockInterviewLazy = dynamic(
  () => import("@/components/mock-interview").then((mod) => mod.MockInterview),
  { loading: () => <MockShell /> }
);