import { createFileRoute, Outlet } from "@tanstack/react-router";
import { LensProvider } from "@/lib/lens";
import { LensShell } from "@/components/lens-shell";

export const Route = createFileRoute("/app")({ component: AppLayout });

function AppLayout() {
  return (
    <LensProvider>
      <LensShell>
        <Outlet />
      </LensShell>
    </LensProvider>
  );
}
