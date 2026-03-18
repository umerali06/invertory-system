'use client';

import { FileText, Maximize, Plus } from 'lucide-react';
import { useState } from 'react';
import { batchUpdateStock } from '@/actions/inventory';
import CameraScannerPanel from '@/components/CameraScannerPanel';
import { toast } from 'sonner';

export default function QuickScanPage() {
  const [isbnInput, setIsbnInput] = useState('');
  const [scannedItems, setScannedItems] = useState<Record<string, number>>({});
  const [isProcessing, setIsProcessing] = useState(false);

  const addScannedCode = (value: string) => {
    const cleanIsbn = value.trim();
    if (!cleanIsbn) {
      toast.error('Scan or type an ISBN before adding it to the batch.');
      return;
    }

    setScannedItems(prev => ({
      ...prev,
      [cleanIsbn]: (prev[cleanIsbn] || 0) + 1
    }));
    setIsbnInput('');
  };

  const handleScan = () => {
    addScannedCode(isbnInput);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleScan();
  };

  const processBatch = async (actionType: 'ADD' | 'DEDUCT' | 'SET') => {
    const items = Object.entries(scannedItems).map(([isbn, count]) => ({ isbn, count }));
    if (items.length === 0) {
      toast.error('Add at least one scanned ISBN before processing.');
      return;
    }

    setIsProcessing(true);
    const res = await batchUpdateStock(items, actionType, { requireSession: true });
    setIsProcessing(false);

    if (res?.success) {
      setScannedItems({});
      toast.success(`Processed ${res.processedCount} inventory updates successfully.`);
    } else {
      toast.error(res?.failed?.[0]?.error || res?.error || 'Failed to process batch');
    }
  };

  const uniqueIsbns = Object.keys(scannedItems).length;
  const totalScans = Object.values(scannedItems).reduce((a, b) => a + b, 0);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
      <div className="col-span-1 lg:col-span-5 space-y-4">
        <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-6 relative overflow-hidden">
          <div className="flex gap-3 mb-6">
            <div className="bg-blue-50 p-2.5 rounded-lg text-blue-500 h-fit">
              <Maximize size={24} />
            </div>
            <div>
              <h2 className="font-semibold text-slate-800">Scan ISBN</h2>
              <p className="text-sm text-slate-500">Scan with camera, use a hardware barcode scanner, or type manually.</p>
            </div>
          </div>

          <CameraScannerPanel
            onDetected={(value) => {
              setIsbnInput(value);
              addScannedCode(value);
            }}
            collapsible
            launcherLabel="Open Camera Scanner"
            launcherDescription="Keep the batch page focused on manual and hardware scans until you need the live camera."
          />

          <div className="flex gap-2">
            <input 
              type="text" 
              value={isbnInput}
              onChange={(e) => setIsbnInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Scan or type ISBN..." 
              className="flex-1 px-4 py-3 bg-slate-50 border border-slate-200 rounded-lg text-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all font-medium text-slate-700"
              autoFocus
            />
            <button onClick={handleScan} className="bg-blue-500 hover:bg-blue-600 text-white p-3 rounded-lg shadow-md shadow-blue-500/20 transition-colors flex items-center justify-center aspect-square">
              <Plus size={24} />
            </button>
          </div>

          <p className="text-xs text-slate-400 mt-3 font-medium">
            Camera scans add automatically. Hardware scanners and manual entry can use Enter or the + button.
          </p>

          <div className="grid grid-cols-2 gap-4 mt-8">
            <div className="bg-slate-50 rounded-lg p-4 text-center border border-slate-100">
              <h3 className="text-3xl font-bold text-blue-600">{uniqueIsbns}</h3>
              <p className="text-xs font-semibold text-slate-500 mt-1 uppercase tracking-wide">Unique ISBNs</p>
            </div>
            <div className="bg-slate-50 rounded-lg p-4 text-center border border-slate-100">
              <h3 className="text-3xl font-bold text-blue-600">{totalScans}</h3>
              <p className="text-xs font-semibold text-slate-500 mt-1 uppercase tracking-wide">Total Scans</p>
            </div>
          </div>
        </div>
      </div>

      <div className="col-span-1 lg:col-span-7">
        <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden flex flex-col h-[500px]">
          <div className="p-5 border-b border-slate-100 font-semibold text-slate-800 flex justify-between items-center">
            <span>Scanned Books</span>
            {totalScans > 0 && <span className="text-xs font-normal text-slate-500 bg-slate-100 px-2 py-0.5 rounded cursor-pointer hover:bg-slate-200" onClick={() => { setScannedItems({}); toast.success('Scan queue cleared.'); }}>Clear</span>}
          </div>
          
          <div className="flex-1 p-5 overflow-auto bg-slate-50/50">
            <div className="border border-slate-200 rounded-lg bg-white overflow-hidden text-sm">
              <div className="flex justify-between px-4 py-2 bg-slate-50 border-b border-slate-200 font-semibold text-slate-600 text-xs tracking-wider uppercase">
                <span>ISBN</span>
                <span>Count</span>
              </div>
              
              {uniqueIsbns === 0 ? (
                <div className="py-12 text-center text-slate-400 bg-white">
                  No scans yet. Start scanning...
                </div>
              ) : (
                <div className="divide-y divide-slate-100">
                  {Object.entries(scannedItems).map(([isbn, count]) => (
                    <div key={isbn} className="flex justify-between px-4 py-3 hover:bg-slate-50">
                      <span className="font-mono text-slate-700">{isbn}</span>
                      <span className="font-bold text-blue-600 bg-blue-50 px-2 rounded-md">{count}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="p-5 border-t border-slate-100 bg-white space-y-3">
            <p className="text-sm font-semibold text-slate-600 mb-1">Confirm action for all scanned books:</p>
            <div className="flex gap-4">
              <button disabled={isProcessing || uniqueIsbns === 0} onClick={() => processBatch('DEDUCT')} className="disabled:opacity-50 flex-1 bg-amber-200 hover:bg-amber-300 text-amber-800 font-bold py-3.5 rounded-lg transition-colors flex items-center justify-center gap-2 shadow-sm">
                <FileText size={18} />
                Confirm Deduction
              </button>
              <button disabled={isProcessing || uniqueIsbns === 0} onClick={() => processBatch('ADD')} className="disabled:opacity-50 flex-1 bg-emerald-300 hover:bg-emerald-400 text-emerald-900 font-bold py-3.5 rounded-lg transition-colors flex items-center justify-center gap-2 shadow-sm">
                <Plus size={18} />
                Confirm Addition
              </button>
            </div>
            <button disabled={isProcessing || uniqueIsbns === 0} onClick={() => processBatch('SET')} className="disabled:opacity-50 w-full bg-slate-100 hover:bg-slate-200 text-slate-500 font-semibold py-3 rounded-lg transition-colors">
              Set Stock to Scanned Count
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
