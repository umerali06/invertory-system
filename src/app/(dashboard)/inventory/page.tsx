import { AlertTriangle, DollarSign, Package, Search, TrendingUp } from 'lucide-react';
import Image from 'next/image';
import { getBooks, getInventorySummary } from '@/actions/inventory';
import type { InventoryItem } from '@/lib/app-types';
import AddInventoryButton from '@/components/AddInventoryButton';

export default async function InventoryPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; sort?: 'title' | 'stock' | 'recent' | 'value' }>;
}) {
  const params = await searchParams;
  const booksRes = await getBooks({ query: params.q, sort: params.sort });
  const books = booksRes.data || [];
  const summary = await getInventorySummary();

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Inventory</h1>
          <p className="text-sm text-slate-500 mt-1">Search, sort, and review every tracked inventory item.</p>
        </div>
        <div className="flex items-stretch gap-3">
          <div className="min-w-[180px] h-[58px] rounded-2xl bg-gradient-to-br from-sky-50 to-blue-100 border border-blue-200 px-5 shadow-sm flex items-center">
            <div className="flex items-center justify-between gap-4 w-full">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-blue-600">Visible Items</p>
                <p className="mt-1 text-3xl font-bold leading-none text-blue-700">{books.length}</p>
              </div>
              <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-white/80 text-blue-600 shadow-sm shrink-0">
                <Package size={18} />
              </div>
            </div>
          </div>
          <AddInventoryButton />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-blue-500 rounded-xl p-6 text-white flex justify-between items-center shadow-lg shadow-blue-500/20">
          <div className="bg-blue-400/30 p-3 rounded-lg">
            <Package size={28} />
          </div>
          <div className="text-right">
            <h2 className="text-4xl font-bold">{summary.totalTitles}</h2>
            <p className="text-blue-100 font-medium">Titles</p>
          </div>
        </div>
        <div className="bg-emerald-500 rounded-xl p-6 text-white flex justify-between items-center shadow-lg shadow-emerald-500/20">
          <div className="bg-emerald-400/30 p-3 rounded-lg">
            <TrendingUp size={28} />
          </div>
          <div className="text-right">
            <h2 className="text-4xl font-bold">{summary.totalUnits}</h2>
            <p className="text-emerald-100 font-medium">Units</p>
          </div>
        </div>
        <div className="bg-orange-500 rounded-xl p-6 text-white flex justify-between items-center shadow-lg shadow-orange-500/20">
          <div className="bg-orange-400/30 p-3 rounded-lg">
            <AlertTriangle size={28} />
          </div>
          <div className="text-right">
            <h2 className="text-4xl font-bold">{summary.lowStockCount}</h2>
            <p className="text-orange-100 font-medium">Low Stock</p>
          </div>
        </div>
        <div className="bg-slate-800 rounded-xl p-6 text-white flex justify-between items-center shadow-lg shadow-slate-800/20">
          <div className="bg-slate-700/50 p-3 rounded-lg">
            <DollarSign size={28} />
          </div>
          <div className="text-right">
            <h2 className="text-4xl font-bold">${summary.inventoryValue.toLocaleString(undefined, { maximumFractionDigits: 0 })}</h2>
            <p className="text-slate-200 font-medium">Inventory Value</p>
          </div>
        </div>
      </div>

      <form className="flex gap-4 items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
          <input 
            type="text" 
            name="q"
            defaultValue={params.q ?? ''}
            placeholder="Search by title, ISBN, or SKU..." 
            className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
          />
        </div>
        <select name="sort" defaultValue={params.sort ?? 'title'} className="border border-slate-200 rounded-lg px-4 py-2 text-sm text-slate-600 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all bg-white appearance-none pr-8 relative">
          <option value="title">Sort by: Title</option>
          <option value="stock">Sort by: Stock</option>
          <option value="recent">Sort by: Recent</option>
          <option value="value">Sort by: Value</option>
        </select>
        <button className="bg-blue-500 hover:bg-blue-600 text-white font-medium px-4 py-2 rounded-lg transition-colors">
          Apply
        </button>
      </form>

      <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
        <table className="w-full text-left text-sm whitespace-nowrap">
          <thead className="bg-slate-50/50 text-slate-500 font-medium">
            <tr>
              <th className="px-6 py-4 w-16">Book Cover</th>
              <th className="px-6 py-4">Title</th>
              <th className="px-6 py-4">ISBN</th>
              <th className="px-6 py-4">SKU</th>
              <th className="px-6 py-4">Category</th>
              <th className="px-6 py-4">Stock</th>
              <th className="px-6 py-4">Value</th>
              <th className="px-6 py-4 text-right">Last Updated</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {books.map((book: InventoryItem) => (
              <tr key={book.id} className="hover:bg-slate-50/50 transition-colors">
                <td className="px-6 py-3">
                  <div className="w-10 h-14 bg-slate-200 rounded overflow-hidden relative shadow-sm border border-slate-100">
                    {book.coverUrl ? (
                      <Image src={book.coverUrl} alt={`${book.title} cover`} fill className="object-cover" unoptimized />
                    ) : (
                      <div className="absolute inset-0 flex items-center justify-center bg-slate-100 text-slate-400 text-[10px] font-semibold">
                        No Image
                      </div>
                    )}
                  </div>
                </td>
                <td className="px-6 py-3 font-medium text-slate-800 whitespace-normal min-w-[200px]">{book.title}</td>
                <td className="px-6 py-3">
                  <span className="bg-slate-100 text-slate-600 px-2.5 py-1 rounded-md text-xs font-mono">{book.isbn}</span>
                </td>
                <td className="px-6 py-3">
                  <span className="text-slate-500 text-xs font-medium">{book.sku}</span>
                </td>
                <td className="px-6 py-3">
                  <span className="text-slate-600 text-xs font-medium">{book.category}</span>
                </td>
                <td className="px-6 py-3">
                  {book.stockStatus !== 'out-of-stock' ? (
                    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium ${
                      book.stockStatus === 'low-stock' ? 'bg-amber-50 text-amber-700' : 'bg-emerald-50 text-emerald-700'
                    }`}>
                      <Package size={14} /> {book.stock}
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium bg-red-50 text-red-700">
                      <Package size={14} /> 0
                    </span>
                  )}
                </td>
                <td className="px-6 py-3 text-slate-600">${book.inventoryValue.toLocaleString(undefined, { maximumFractionDigits: 0 })}</td>
                <td className="px-6 py-3 text-right text-slate-500 text-xs">
                  {book.updatedAtLabel}
                </td>
              </tr>
            ))}
            {books.length === 0 && (
              <tr>
                <td colSpan={8} className="px-6 py-8 text-center text-slate-400">
                  No inventory items matched your search.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
