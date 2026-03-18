'use client';

import { Barcode, Package, PlusCircle, Search } from 'lucide-react';
import { useEffect, useRef, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { adjustInventoryStock, findInventoryItem, saveInventoryItem } from '@/actions/inventory';
import CameraScannerPanel from '@/components/CameraScannerPanel';
import type { InventoryItem } from '@/lib/app-types';
import { normalizeIsbn } from '@/lib/utils';

type RecentScan = {
  id: string;
  title: string;
  isbn: string;
  timeLabel: string;
};

export default function ScanWorkspace({
  initialQuery,
  initialMode,
  recentScans,
}: {
  initialQuery: string;
  initialMode?: 'search' | 'create';
  recentScans: RecentScan[];
}) {
  const router = useRouter();
  const titleInputRef = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState(initialQuery);
  const [mode, setMode] = useState<'search' | 'create'>(initialQuery ? 'search' : (initialMode ?? 'search'));
  const [result, setResult] = useState<InventoryItem | null>(null);
  const [lookupError, setLookupError] = useState('');
  const [isLookupPending, startLookupTransition] = useTransition();
  const [isMutating, startMutationTransition] = useTransition();
  const [quantity, setQuantity] = useState(1);
  const [adjustment, setAdjustment] = useState<'ADD' | 'DEDUCT' | 'SET'>('ADD');
  const [createForm, setCreateForm] = useState({
    title: '',
    isbn: normalizeIsbn(initialQuery),
    sku: '',
    author: '',
    category: '',
    stock: 0,
    reorderLevel: 5,
    unitPrice: 0,
    coverUrl: '',
  });

  const runLookup = (nextQuery: string) => {
    startLookupTransition(async () => {
      const response = await findInventoryItem(nextQuery);
      if (response.success) {
        setMode('search');
        setResult(response.data ?? null);
        setLookupError('');
        setCreateForm((current) => ({
          ...current,
          title: response.data?.title ?? current.title,
          isbn: response.data?.isbn ?? normalizeIsbn(nextQuery),
          sku: response.data?.sku ?? current.sku,
          author: response.data?.author ?? current.author,
          category: response.data?.category ?? current.category,
          stock: response.data?.stock ?? current.stock,
          reorderLevel: response.data?.reorderLevel ?? current.reorderLevel,
          unitPrice: response.data?.unitPrice ?? current.unitPrice,
          coverUrl: response.data?.coverUrl ?? current.coverUrl,
        }));
        return;
      }

      setMode('create');
      setResult(null);
      setLookupError(response.error ?? 'No inventory item found.');
      setCreateForm((current) => ({
        ...current,
        isbn: normalizeIsbn(nextQuery),
      }));
    });
  };

  useEffect(() => {
    if (initialQuery) {
      runLookup(initialQuery);
    }
  }, [initialQuery]);

  useEffect(() => {
    if (mode === 'create') {
      titleInputRef.current?.focus();
    }
  }, [mode]);

  const handleSearch = () => {
    if (!query.trim()) {
      toast.error('Enter an ISBN or SKU first.');
      return;
    }

    runLookup(query);
  };

  const handleDetectedCode = (detectedValue: string) => {
    setQuery(detectedValue);
    runLookup(detectedValue);
  };

  const handleCreate = () => {
    startMutationTransition(async () => {
      const response = await saveInventoryItem({
        ...createForm,
        stock: Number(createForm.stock),
        reorderLevel: Number(createForm.reorderLevel),
        unitPrice: Number(createForm.unitPrice),
      });

      if ('error' in response && response.error) {
        toast.error(response.error);
        return;
      }

      toast.success('Inventory item created successfully.');
      setMode('search');
      setLookupError('');
      setQuery(createForm.isbn);
      router.refresh();
      runLookup(createForm.isbn);
    });
  };

  const handleAdjustment = () => {
    const code = result?.isbn || query;
    if (!code || quantity <= 0) {
      toast.error('Enter a quantity greater than zero.');
      return;
    }

    startMutationTransition(async () => {
      const response = await adjustInventoryStock({
        code,
        quantity,
        action: adjustment,
      });

      if (!response.success) {
        toast.error('error' in response ? response.error : 'Unable to update stock.');
        return;
      }

      toast.success(`Inventory updated with ${adjustment.toLowerCase()} action.`);
      router.refresh();
      runLookup(code);
    });
  };

  return (
    <div className="space-y-6 max-w-5xl">
      <div>
        <h1 className="text-2xl font-bold text-slate-800">{mode === 'create' ? 'Add Inventory Item' : 'Scan Product'}</h1>
        <p className="text-sm text-slate-500 mt-1">
          {mode === 'create'
            ? 'Create a new inventory record, then continue scanning or adjusting stock.'
            : 'Search inventory by ISBN or SKU, then create or adjust the record immediately.'}
        </p>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-6 space-y-6 transition-all duration-300">
        <div className="flex items-center gap-3">
          <div className="bg-slate-100 p-2 rounded-lg text-slate-500">
            <Barcode size={24} />
          </div>
          <div>
            <h2 className="font-semibold text-slate-800">Quick Lookup</h2>
            <p className="text-sm text-slate-500">Use camera scanning, a hardware barcode scanner, or enter the ISBN or SKU manually.</p>
          </div>
        </div>

        <CameraScannerPanel
          onDetected={handleDetectedCode}
          pauseAfterDetect
          collapsible
          launcherLabel="Open Camera Scanner"
          launcherDescription="Use the camera only when you want live barcode scanning. Manual and hardware input stay available below."
        />


        <div className="relative">
          <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 border-r border-slate-200 pr-3">
            <Barcode size={20} />
          </div>
          <input
            type="text"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter') {
                event.preventDefault();
                handleSearch();
              }
            }}
            placeholder="Enter or scan ISBN / SKU..."
            className="w-full pl-16 pr-4 py-4 border-2 border-blue-500 rounded-xl text-lg focus:outline-none focus:ring-4 focus:ring-blue-500/20 transition-all font-medium text-slate-700 shadow-sm"
            autoFocus={mode !== 'create'}
          />
        </div>

        <div className="flex gap-4">
          <button
            onClick={handleSearch}
            disabled={isLookupPending}
            className="flex-1 bg-blue-500 hover:bg-blue-600 disabled:bg-blue-300 text-white font-semibold py-4 rounded-xl transition-colors flex items-center justify-center gap-2"
          >
            <Search size={20} />
            {isLookupPending ? 'Searching...' : 'Search Inventory'}
          </button>
        </div>

        {lookupError && (
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-sm text-amber-800">
            {lookupError} Complete the form below to create a new inventory record.
          </div>
        )}
      </div>

      {result && mode !== 'create' ? (
        <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-6 space-y-6 transition-all duration-300">
          <div className="flex items-start justify-between gap-6">
            <div>
              <h3 className="text-xl font-semibold text-slate-800">{result.title}</h3>
              <p className="text-sm text-slate-500 mt-1">{result.author || 'No author provided'} | {result.category}</p>
              <div className="mt-3 flex flex-wrap gap-3 text-xs text-slate-500">
                <span className="rounded-md bg-slate-100 px-2 py-1 font-mono">{result.isbn}</span>
                <span className="rounded-md bg-slate-100 px-2 py-1 font-mono">{result.sku}</span>
                <span className="rounded-md bg-slate-100 px-2 py-1">Stock: {result.stock}</span>
                <span className="rounded-md bg-slate-100 px-2 py-1">Reorder Level: {result.reorderLevel}</span>
                <span className="rounded-md bg-slate-100 px-2 py-1">Value: ${result.inventoryValue.toLocaleString(undefined, { maximumFractionDigits: 2 })}</span>
              </div>
            </div>
            <div className={`rounded-full px-3 py-1 text-xs font-semibold ${
              result.stockStatus === 'out-of-stock'
                ? 'bg-red-50 text-red-700'
                : result.stockStatus === 'low-stock'
                  ? 'bg-amber-50 text-amber-700'
                  : 'bg-emerald-50 text-emerald-700'
            }`}>
              {result.stockStatus.replace(/-/g, ' ')}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Action</label>
              <select value={adjustment} onChange={(event) => setAdjustment(event.target.value as 'ADD' | 'DEDUCT' | 'SET')} className="w-full rounded-lg border border-slate-200 px-4 py-3 text-sm">
                <option value="ADD">Add stock</option>
                <option value="DEDUCT">Deduct stock</option>
                <option value="SET">Set stock</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Quantity</label>
              <input
                type="number"
                min={1}
                value={quantity}
                onChange={(event) => setQuantity(Number(event.target.value))}
                className="w-full rounded-lg border border-slate-200 px-4 py-3 text-sm"
              />
            </div>
            <div className="flex items-end">
              <button
                onClick={handleAdjustment}
                disabled={isMutating}
                className="w-full bg-slate-900 hover:bg-slate-800 disabled:bg-slate-400 text-white font-medium px-4 py-3 rounded-lg transition-colors flex items-center justify-center gap-2"
              >
                <Package size={18} />
                {isMutating ? 'Saving...' : 'Update Stock'}
              </button>
            </div>
          </div>
        </div>
      ) : (
        <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-6 space-y-4 transition-all duration-300">
          <div>
            <h3 className="text-lg font-semibold text-slate-800">Create Inventory Item</h3>
            <p className="text-sm text-slate-500 mt-1">This record does not exist yet. Add its details so it can be tracked properly.</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <input ref={titleInputRef} value={createForm.title} onChange={(event) => setCreateForm((current) => ({ ...current, title: event.target.value }))} placeholder="Title" className="rounded-lg border border-slate-200 px-4 py-3 text-sm" />
            <input value={createForm.author} onChange={(event) => setCreateForm((current) => ({ ...current, author: event.target.value }))} placeholder="Author" className="rounded-lg border border-slate-200 px-4 py-3 text-sm" />
            <input value={createForm.isbn} onChange={(event) => setCreateForm((current) => ({ ...current, isbn: normalizeIsbn(event.target.value) }))} placeholder="ISBN" className="rounded-lg border border-slate-200 px-4 py-3 text-sm" />
            <input value={createForm.sku} onChange={(event) => setCreateForm((current) => ({ ...current, sku: event.target.value }))} placeholder="SKU (optional)" className="rounded-lg border border-slate-200 px-4 py-3 text-sm" />
            <input value={createForm.category} onChange={(event) => setCreateForm((current) => ({ ...current, category: event.target.value }))} placeholder="Category" className="rounded-lg border border-slate-200 px-4 py-3 text-sm" />
            <input value={createForm.coverUrl} onChange={(event) => setCreateForm((current) => ({ ...current, coverUrl: event.target.value }))} placeholder="Cover image URL (optional)" className="rounded-lg border border-slate-200 px-4 py-3 text-sm" />
            <input type="number" min={0} value={createForm.stock} onChange={(event) => setCreateForm((current) => ({ ...current, stock: Number(event.target.value) }))} placeholder="Opening stock" className="rounded-lg border border-slate-200 px-4 py-3 text-sm" />
            <input type="number" min={0} value={createForm.reorderLevel} onChange={(event) => setCreateForm((current) => ({ ...current, reorderLevel: Number(event.target.value) }))} placeholder="Reorder level" className="rounded-lg border border-slate-200 px-4 py-3 text-sm" />
            <input type="number" min={0} step="0.01" value={createForm.unitPrice} onChange={(event) => setCreateForm((current) => ({ ...current, unitPrice: Number(event.target.value) }))} placeholder="Unit price" className="rounded-lg border border-slate-200 px-4 py-3 text-sm" />
          </div>
          <button
            onClick={handleCreate}
            disabled={isMutating}
            className="inline-flex items-center gap-2 bg-blue-500 hover:bg-blue-600 disabled:bg-blue-300 text-white font-medium px-5 py-3 rounded-lg transition-colors"
          >
            <PlusCircle size={18} />
            {isMutating ? 'Creating...' : 'Create Inventory Item'}
          </button>
        </div>
      )}

      <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center gap-2 text-slate-700 font-semibold">
          <Barcode size={18} className="text-slate-400" />
          Recent Searches
        </div>
        <div className="divide-y divide-slate-100">
          {recentScans.length > 0 ? recentScans.map((scan) => (
            <button key={scan.id} onClick={() => { setQuery(scan.isbn); runLookup(scan.isbn); }} className="w-full px-6 py-4 flex items-center justify-between hover:bg-slate-50 transition-colors text-left">
              <div>
                <p className="font-medium text-slate-800">{scan.title}</p>
                <p className="text-xs text-slate-500 font-mono mt-1 bg-slate-100 inline-block px-2 py-0.5 rounded">{scan.isbn}</p>
              </div>
              <span className="text-xs text-slate-400">{scan.timeLabel}</span>
            </button>
          )) : (
            <div className="px-6 py-8 text-center text-slate-400">No recent scan activity found.</div>
          )}
        </div>
      </div>
    </div>
  );
}
