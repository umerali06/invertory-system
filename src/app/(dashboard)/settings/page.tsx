import { getUserSettings } from '@/actions/auth';
import SettingsWorkspace from '@/components/SettingsWorkspace';

export default async function SettingsPage() {
  const userSettings = await getUserSettings();

  return <SettingsWorkspace user={userSettings} />;
}
