import { getRecentScans } from '@/actions/inventory';
import ScanWorkspace from '@/components/ScanWorkspace';

export default async function ScanPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; mode?: 'create' }>;
}) {
  const params = await searchParams;
  const recentScans = await getRecentScans();

  return (
    <ScanWorkspace
      initialQuery={params.q ?? ''}
      initialMode={params.mode === 'create' ? 'create' : 'search'}
      recentScans={recentScans.data ?? []}
    />
  );
}
