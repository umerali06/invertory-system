import AppShell from "@/components/AppShell";
import { getNavigationSummary } from "@/actions/inventory";
import { requireCurrentUser } from "@/lib/session";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [user, navigation] = await Promise.all([requireCurrentUser(), getNavigationSummary()]);

  return (
    <AppShell
      user={user}
      lowStockCount={navigation.lowStockCount}
      recentActivityCount={navigation.recentActivityCount}
      notifications={navigation.notifications}
    >
      {children}
    </AppShell>
  );
}
