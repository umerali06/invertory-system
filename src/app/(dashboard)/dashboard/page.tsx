import Link from 'next/link';
import { Activity, AlertTriangle, ArrowRight, Package, TrendingUp } from 'lucide-react';
import { getDashboardOverview } from '@/actions/inventory';

export default async function DashboardPage() {
  const overviewRes = await getDashboardOverview();
  const stats = overviewRes.data?.stats || { totalItems: 0, inStock: 0, todaysUpdates: 0, lowStockCount: 0, outOfStockCount: 0, inventoryValue: 0 };
  const recentActivity = overviewRes.data?.recentActivity || [];
  const lowStockItems = overviewRes.data?.lowStockItems || [];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-800">Inventory Dashboard</h1>
        <p className="text-sm text-slate-500 mt-1">Manage your bookstore inventory efficiently</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-blue-500 rounded-xl p-6 text-white flex justify-between items-center shadow-lg shadow-blue-500/20">
          <div className="bg-blue-400/30 p-3 rounded-lg">
            <Package size={28} />
          </div>
          <div className="text-right">
            <h2 className="text-4xl font-bold">{stats.totalItems}</h2>
            <p className="text-blue-100 font-medium">Total Items</p>
          </div>
        </div>
        
        <div className="bg-emerald-500 rounded-xl p-6 text-white flex justify-between items-center shadow-lg shadow-emerald-500/20">
          <div className="bg-emerald-400/30 p-3 rounded-lg">
            <TrendingUp size={28} />
          </div>
          <div className="text-right">
            <h2 className="text-4xl font-bold">{stats.inStock}</h2>
            <p className="text-emerald-100 font-medium">In Stock</p>
          </div>
        </div>

        <div className="bg-orange-500 rounded-xl p-6 text-white flex justify-between items-center shadow-lg shadow-orange-500/20">
          <div className="bg-orange-400/30 p-3 rounded-lg">
            <Activity size={28} />
          </div>
          <div className="text-right">
            <h2 className="text-4xl font-bold">{stats.todaysUpdates}</h2>
            <p className="text-orange-100 font-medium">Today&apos;s Updates</p>
          </div>
        </div>

        <div className="bg-slate-800 rounded-xl p-6 text-white flex justify-between items-center shadow-lg shadow-slate-800/20">
          <div className="bg-slate-700/50 p-3 rounded-lg">
            <TrendingUp size={28} />
          </div>
          <div className="text-right">
            <h2 className="text-4xl font-bold">${stats.inventoryValue.toLocaleString(undefined, { maximumFractionDigits: 0 })}</h2>
            <p className="text-slate-200 font-medium">Inventory Value</p>
          </div>
        </div>
      </div>

      {stats.lowStockCount > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex gap-3">
          <AlertTriangle className="text-amber-500 shrink-0" size={24} />
          <div>
            <h3 className="text-amber-800 font-semibold text-sm">Low Stock Alert</h3>
            <p className="text-amber-700 text-sm mt-0.5">{stats.lowStockCount} products are running low on stock. Consider restocking soon.</p>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 xl:grid-cols-[1.5fr_1fr] gap-6">
        <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-6 flex flex-col space-y-4">
          <div>
            <h3 className="font-semibold text-slate-800 text-lg flex items-center gap-2">
              <div className="p-1.5 bg-blue-50 text-blue-600 rounded-md">
                <Package size={18} />
              </div>
              Product Search
            </h3>
            <p className="text-sm text-slate-500 mt-1">Search inventory instantly by ISBN or SKU.</p>
          </div>
          <form action="/scan" className="flex gap-3">
            <input 
              type="text"
              name="q"
              placeholder="Enter or scan ISBN number..."
              className="flex-1 bg-slate-50 border border-slate-200 rounded-lg px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all"
            />
            <button className="bg-blue-500 hover:bg-blue-600 text-white font-medium px-8 py-3 rounded-lg transition-colors">
              Search
            </button>
          </form>
          <div className="flex gap-3 text-sm">
            <Link href="/scan" className="inline-flex items-center gap-2 text-blue-600 font-medium hover:text-blue-700">
              Open scanner
              <ArrowRight size={16} />
            </Link>
            <Link href="/automation/quick-scan" className="inline-flex items-center gap-2 text-slate-600 font-medium hover:text-slate-800">
              Open automation
              <ArrowRight size={16} />
            </Link>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-slate-800 text-lg">Low Stock Queue</h3>
            <Link href="/inventory?sort=stock" className="text-sm font-medium text-blue-600 hover:text-blue-700">
              View inventory
            </Link>
          </div>
          <div className="space-y-3">
            {lowStockItems.length > 0 ? lowStockItems.map((item) => (
              <div key={item.id} className="rounded-lg border border-amber-100 bg-amber-50/60 px-4 py-3">
                <p className="font-medium text-slate-800">{item.title}</p>
                <div className="mt-1 flex items-center justify-between text-xs text-slate-500">
                  <span>{item.isbn}</span>
                  <span>{item.stock} left / reorder at {item.reorderLevel}</span>
                </div>
              </div>
            )) : (
              <div className="rounded-lg border border-dashed border-slate-200 px-4 py-6 text-sm text-slate-500 text-center">
                No low-stock items right now.
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-6">
        <h3 className="font-semibold text-slate-800 text-lg flex items-center gap-2 mb-4">
          <Activity size={18} className="text-slate-400" />
          Recent Activity
        </h3>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="text-slate-500 border-b border-slate-100">
                <th className="pb-3 font-medium">ISBN</th>
                <th className="pb-3 font-medium">Book Title</th>
                <th className="pb-3 font-medium">Action</th>
                <th className="pb-3 font-medium">Quantity</th>
                <th className="pb-3 font-medium text-right">Time</th>
              </tr>
            </thead>
            <tbody>
              {recentActivity.length > 0 ? recentActivity.map((activity) => (
                <tr key={activity.id} className="border-b border-slate-100 last:border-b-0">
                  <td className="py-4 text-slate-500 font-mono text-xs">{activity.isbn}</td>
                  <td className="py-4 font-medium text-slate-800">{activity.title}</td>
                  <td className="py-4 text-slate-600">{activity.action}</td>
                  <td className="py-4 text-slate-600">{activity.quantity}</td>
                  <td className="py-4 text-right text-slate-500 text-xs">{activity.timeLabel}</td>
                </tr>
              )) : (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-slate-400 bg-slate-50/50 rounded-lg mt-2">
                    No recent activity found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
