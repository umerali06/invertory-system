import type { ReportRange, ReportType } from '@/lib/app-types';
import { getReportStats } from '@/actions/reports';
import ReportsWorkspace from '@/components/ReportsWorkspace';

export default async function ReportsPage({
  searchParams,
}: {
  searchParams: Promise<{ range?: ReportRange; reportType?: ReportType }>;
}) {
  const params = await searchParams;
  const range = params.range ?? 'this-month';
  const reportType = params.reportType ?? 'inventory';
  const statsRes = await getReportStats(range);
  const stats = statsRes.data || {
    inventoryValue: 0,
    stockMovements: 0,
    lowStockItems: 0,
    outOfStock: 0,
    topBooks: [],
    trendPoints: [],
    recentReports: [],
  };

  return (
    <ReportsWorkspace
      range={range}
      reportType={reportType}
      stats={stats}
      topBooks={stats.topBooks}
      trendPoints={stats.trendPoints}
      recentReports={stats.recentReports}
    />
  );
}
