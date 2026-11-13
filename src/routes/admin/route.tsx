import { createFileRoute, Outlet, redirect, useRouterState } from "@tanstack/react-router";
import { AdminShell } from "@/components/admin/admin-shell";
import { adminMe } from "@/fn/admin";

export const Route = createFileRoute("/admin")({
  beforeLoad: async ({ location }) => {
    if (location.pathname === "/admin/login") return;
    const me = await adminMe();
    if (!me) throw redirect({ to: "/admin/login" });
  },
  component: AdminLayout,
});

function AdminLayout() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  if (pathname === "/admin/login") return <Outlet />;
  return (
    <AdminShell>
      <Outlet />
    </AdminShell>
  );
}
