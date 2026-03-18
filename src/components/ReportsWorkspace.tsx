'use client';

import Link from 'next/link';
import { Download, FileText } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';
import { toast } from 'sonner';
import { generateReport } from '@/actions/reports';
import type { GeneratedReport, InventoryItem, ReportRange, ReportType, TrendPoint } from '@/lib/app-types';

export default function ReportsWorkspace({
  range,
  reportType,
  stats,
  topBooks,
  trendPoints,
  recentReports,
}: {
  range: ReportRange;
  reportType: ReportType;
  stats: {
    inventoryValue: number;
    stockMovements: number;
    lowStockItems: number;
    outOfStock: number;
  };
  topBooks: InventoryItem[];
  trendPoints: TrendPoint[];
  recentReports: GeneratedReport[];
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [latestReportId, setLatestReportId] = useState(recentReports[0]?.id ?? '');

  const handleGenerateReport = () => {
    startTransition(async () => {
      const response = await generateReport({ range, type: reportType });
      if (!response.success) {
        toast.error('Failed to generate report.');
        return;
      }

      setLatestReportId(response.reportId);
      toast.success(`${response.title} generated.`);
      router.refresh();
    });
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Reports & Analytics</h1>
          <p className="text-sm text-slate-500 mt-1">Generate exportable inventory, activity, and low-stock reports.</p>
        </div>
        <Link
          href={latestReportId ? `/api/reports/${latestReportId}` : '#'}
          className={`font-medium px-4 py-2 rounded-lg transition-colors flex items-center gap-2 shadow-sm ${
            latestReportId
              ? 'bg-blue-500 hover:bg-blue-600 text-white shadow-blue-500/20'
              : 'bg-slate-200 text-slate-500 pointer-events-none'
          }`}
        >
          <Download size={18} />
          Download Latest
        </Link>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-5">
        <h3 className="text-sm font-semibold text-slate-700 flex items-center gap-2 mb-4">
          <FileText size={16} className="text-slate-400" />
          Report Filters
        </h3>
        <form className="flex flex-col md:flex-row gap-4">
          <div className="flex-1 space-y-1.5">
            <label className="text-xs font-medium text-slate-500">Date Range</label>
            <select name="range" defaultValue={range} className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500">
              <option value="today">Today</option>
              <option value="this-week">This Week</option>
              <option value="this-month">This Month</option>
              <option value="this-year">This Year</option>
              <option value="all-time">All Time</option>
            </select>
          </div>
          <div className="flex-1 space-y-1.5">
            <label className="text-xs font-medium text-slate-500">Report Type</label>
            <select name="reportType" defaultValue={reportType} className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500">
              <option value="inventory">Inventory Report</option>
              <option value="activity">Activity Report</option>
              <option value="low-stock">Low Stock Report</option>
            </select>
          </div>
          <div className="flex items-end gap-3">
            <button className="bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium px-6 py-2.5 rounded-lg transition-colors h-[42px]">
              Apply
            </button>
            <button
              type="button"
              onClick={handleGenerateReport}
              disabled={isPending}
              className="bg-blue-500 hover:bg-blue-600 disabled:bg-blue-300 text-white font-medium px-6 py-2.5 rounded-lg transition-colors h-[42px]"
            >
              {isPending ? 'Generating...' : 'Generate Report'}
            </button>
          </div>
        </form>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-blue-500 rounded-xl p-5 text-white shadow-md shadow-blue-500/20 relative overflow-hidden">
          <p className="text-blue-100 text-sm font-medium mb-1">Inventory Value</p>
          <h2 className="text-3xl font-bold">${stats.inventoryValue.toLocaleString(undefined, { maximumFractionDigits: 0 })}</h2>
        </div>

        <div className="bg-emerald-500 rounded-xl p-5 text-white shadow-md shadow-emerald-500/20 relative overflow-hidden">
          <p className="text-emerald-100 text-sm font-medium mb-1">Stock Movements</p>
          <h2 className="text-3xl font-bold">{stats.stockMovements}</h2>
        </div>

        <div className="bg-amber-500 rounded-xl p-5 text-white shadow-md shadow-amber-500/20 relative overflow-hidden">
          <p className="text-amber-100 text-sm font-medium mb-1">Low Stock Items</p>
          <h2 className="text-3xl font-bold">{stats.lowStockItems}</h2>
        </div>

        <div className="bg-red-500 rounded-xl p-5 text-white shadow-md shadow-red-500/20 relative overflow-hidden">
          <p className="text-red-100 text-sm font-medium mb-1">Out of Stock</p>
          <h2 className="text-3xl font-bold">{stats.outOfStock}</h2>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-6">
          <div className="flex justify-between items-center mb-6">
            <h3 className="font-semibold text-slate-800">Inventory Trends</h3>
            <span className="text-xs text-slate-400">Last 7 days</span>
          </div>
          <div className="space-y-4">
            {trendPoints.map((point, index) => {
              const maxCount = Math.max(...trendPoints.map((trendPoint) => trendPoint.count), 1);
              const width = point.count === 0 ? 8 : Math.max(16, (point.count / maxCount) * 100);

              return (
                <div key={`${point.label}-${index}`} className="flex items-center gap-3">
                  <span className="text-xs text-slate-400 w-8">{point.label}</span>
                  <div className="flex-1 bg-slate-50 rounded-full h-5 overflow-hidden flex">
                    <div className="bg-blue-500 h-full rounded-full transition-all" style={{ width: `${width}%` }} />
                  </div>
                  <span className="text-xs text-slate-500 w-5 text-right">{point.count}</span>
                </div>
              );
            })}
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-6">
          <div className="flex justify-between items-center mb-6">
            <h3 className="font-semibold text-slate-800">Top Inventory Items</h3>
            <span className="text-xs text-slate-400">By current stock</span>
          </div>
          <div className="space-y-4 divide-y divide-slate-50">
            {topBooks.map((book, index) => (
              <div key={book.id} className="flex items-center justify-between pt-3 first:pt-0">
                <div className="flex items-center gap-3">
                  <span className="text-xs font-bold text-slate-400 bg-slate-100 w-6 h-6 rounded flex items-center justify-center">#{index + 1}</span>
                  <div>
                    <p className="text-sm font-medium text-slate-800">{book.title}</p>
                    <p className="text-xs text-slate-500">{book.stock} units · ${book.inventoryValue.toLocaleString(undefined, { maximumFractionDigits: 0 })}</p>
                  </div>
                </div>
                <span className="text-xs font-medium px-2 py-1 rounded text-emerald-500 bg-emerald-50">
                  In Stock
                </span>
              </div>
            ))}
            {topBooks.length === 0 && (
              <div className="text-center py-4 text-slate-400 text-sm">No inventory items found to rank.</div>
            )}
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-6">
        <h3 className="font-semibold text-slate-800 flex items-center gap-2 mb-4">
          <FileText size={18} className="text-slate-400" />
          Recent Reports
        </h3>
        <div className="space-y-3">
          {recentReports.length > 0 ? recentReports.map((report) => (
            <div key={report.id} className="border border-slate-100 rounded-lg p-4 flex items-center justify-between hover:bg-slate-50 transition-colors">
              <div>
                <p className="font-medium text-slate-800 text-sm">{report.title}</p>
                <p className="text-xs text-slate-500 mt-0.5">{report.createdAtLabel} · {report.rowCount} rows</p>
              </div>
              <Link href={`/api/reports/${report.id}`} className="text-blue-500 hover:text-blue-700 font-medium text-sm flex items-center gap-1.5 transition-colors bg-white border border-slate-200 px-3 py-1.5 rounded shadow-sm">
                <Download size={14} />
                Download
              </Link>
            </div>
          )) : (
            <div className="rounded-lg border border-dashed border-slate-200 px-4 py-8 text-center text-sm text-slate-500">
              No reports have been generated yet.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
