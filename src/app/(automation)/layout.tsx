import { getAutomationOverview } from '@/actions/automation';
import { getNavigationSummary } from '@/actions/inventory';
import AppShell from '@/components/AppShell';
import AutomationShell from '@/components/AutomationShell';
import { requireCurrentUser } from '@/lib/session';

export default async function AutomationLayout({ children }: { children: React.ReactNode }) {
  const [user, overview, navigation] = await Promise.all([
    requireCurrentUser(),
    getAutomationOverview(),
    getNavigationSummary(),
  ]);

  return (
    <AppShell
      user={user}
      lowStockCount={navigation.lowStockCount}
      recentActivityCount={navigation.recentActivityCount}
      notifications={navigation.notifications}
    >
      <AutomationShell initialSession={overview.activeSession} recentSessions={overview.recentSessions}>
        {children}
      </AutomationShell>
    </AppShell>
  );
}
