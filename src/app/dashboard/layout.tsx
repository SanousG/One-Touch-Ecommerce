import { Header } from "@/components/dashboard/header";
import { Sidebar } from "@/components/dashboard/sidebar";
import { requireUser } from "@/lib/auth/session";
import { getActiveTenantForUser, listUserTenants } from "@/lib/tenants/service";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  // El layout prepara el shell; cada página vuelve a verificar la sesión
  // mediante requireDashboardContext().
  const user = await requireUser();
  const [tenants, activeTenant] = await Promise.all([
    listUserTenants(user.id),
    getActiveTenantForUser(user.id),
  ]);

  return (
    <div className="min-h-screen bg-background">
      <Sidebar
        tenants={tenants}
        activeTenant={activeTenant}
        userName={user.name}
        userEmail={user.email}
      />
      <div className="pl-60">
        <Header userName={user.name} />
        <main className="min-h-screen px-6 py-5 pt-[76px]">{children}</main>
      </div>
    </div>
  );
}
