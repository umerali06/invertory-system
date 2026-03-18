'use client';

import { FileSpreadsheet, Play, AlertTriangle, Upload, X } from 'lucide-react';
import { useState, useRef } from 'react';
import { batchUpdateStock } from '@/actions/inventory';
import { toast } from 'sonner';

type QueueItem = {
  isbn: string;
  count: number;
  action: 'ADD' | 'DEDUCT' | 'SET';
  title?: string;
  sku?: string;
  author?: string;
  category?: string;
  reorderLevel?: number;
  unitPrice?: number;
  coverUrl?: string;
};

export default function BatchQueuePage() {
  const [queue, setQueue] = useState<QueueItem[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

      const reader = new FileReader();
      reader.onload = (event) => {
      const text = event.target?.result as string;
      const lines = text.split('\n');
      const newQueue: QueueItem[] = [];
      let skippedRows = 0;
      
      // Supported format:
      // ISBN,Quantity,Action,Title,SKU,Author,Category,ReorderLevel,UnitPrice,CoverUrl
      for (let i = 1; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line) continue;
        const [isbn, qtyStr, actionStr, title, sku, author, category, reorderLevel, unitPrice, coverUrl] = line.split(',');
        const count = parseInt(qtyStr, 10);
        const action = actionStr?.toUpperCase() as 'ADD' | 'DEDUCT' | 'SET';
        
        if (isbn && !isNaN(count) && ['ADD', 'DEDUCT', 'SET'].includes(action)) {
            newQueue.push({
              isbn,
              count,
              action,
              title,
              sku,
              author,
              category,
              reorderLevel: reorderLevel ? Number(reorderLevel) : undefined,
              unitPrice: unitPrice ? Number(unitPrice) : undefined,
              coverUrl,
            });
        } else {
          skippedRows += 1;
        }
      }
      setQueue(prev => [...prev, ...newQueue]);
      if (newQueue.length > 0) {
        toast.success(`Imported ${newQueue.length} row${newQueue.length === 1 ? '' : 's'} from CSV.`);
      }
      if (skippedRows > 0) {
        toast.warning(`Skipped ${skippedRows} invalid CSV row${skippedRows === 1 ? '' : 's'}.`);
      }
    };
    reader.readAsText(file);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleExecute = async () => {
    if (queue.length === 0) {
      toast.error('Import or add at least one queue row before executing the batch.');
      return;
    }
    setIsProcessing(true);
    
    try {
      const response = await batchUpdateStock(queue, 'ADD', { requireSession: true });

      if (!response.success) {
        toast.error(response.failed?.[0]?.error || response.error || 'Failed to execute batch');
      } else {
        toast.success(`Batch executed successfully. Processed ${response.processedCount} rows.`);
        setQueue([]);
      }
    } catch (error) {
      console.error(error);
      toast.error('Failed to execute batch');
    }
    
    setIsProcessing(false);
  };

  const removeRow = (index: number) => {
    setQueue(prev => prev.filter((_, i) => i !== index));
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-end mb-8">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Batch Queue</h1>
          <p className="text-sm text-slate-500 mt-1">Review and adjust each item before executing.</p>
        </div>
        <div className="flex gap-3">
          <input 
            type="file" 
            accept=".csv" 
            ref={fileInputRef} 
            onChange={handleFileUpload} 
            className="hidden" 
          />
          <button 
            onClick={() => fileInputRef.current?.click()}
            className="bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 font-medium px-4 py-2 rounded-lg transition-colors flex items-center gap-2 shadow-sm"
          >
            <FileSpreadsheet size={16} className="text-slate-400" />
            Import CSV
          </button>
          <button 
            onClick={handleExecute}
            disabled={isProcessing || queue.length === 0}
            className="bg-blue-500 hover:bg-blue-600 disabled:bg-blue-300 disabled:cursor-not-allowed text-white font-medium px-4 py-2 rounded-lg flex items-center gap-2 shadow-sm transition-colors"
          >
            <Play size={16} />
            {isProcessing ? 'Executing...' : 'Execute Batch'}
          </button>
        </div>
      </div>

      <div className="bg-[#fffdf0] border border-amber-200 rounded-lg p-4 flex gap-3 text-amber-800 text-sm shadow-sm">
        <AlertTriangle className="text-amber-500 shrink-0" size={20} />
        <p>Batch execution requires an active automation session. Open the session panel above and start one before executing.</p>
      </div>

      <div className="bg-slate-50 border border-slate-200 border-dashed rounded-lg p-4 text-xs text-slate-500 font-mono shadow-inner mt-4">
        CSV format: ISBN,Quantity,Action,Title,SKU,Author,Category,ReorderLevel,UnitPrice,CoverUrl. Only the first three columns are required for existing items.
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden mt-6">
        <div className="bg-slate-50 border-b border-slate-100 flex px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">
          <div className="flex-1">ISBN</div>
          <div className="w-24 text-center">Qty</div>
          <div className="w-32 text-right">Action</div>
          <div className="w-10"></div>
        </div>
        
        {queue.length === 0 ? (
          <div className="py-24 flex flex-col items-center justify-center text-slate-400 bg-white">
            <Upload size={32} className="mb-4 text-slate-300" />
            <p>Queue is empty - scan books or import a CSV.</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100 bg-white">
            {queue.map((item, idx) => (
              <div key={idx} className="flex px-6 py-3 text-sm items-center hover:bg-slate-50 group">
                <div className="flex-1 font-mono text-slate-700">{item.isbn}</div>
                <div className="w-24 text-center font-semibold text-slate-800">{item.count}</div>
                <div className="w-32 text-right">
                  <span className={`px-2 py-1 rounded text-xs font-bold ${
                    item.action === 'ADD' ? 'bg-emerald-100 text-emerald-700' :
                    item.action === 'DEDUCT' ? 'bg-amber-100 text-amber-700' :
                    'bg-blue-100 text-blue-700'
                  }`}>
                    {item.action}
                  </span>
                </div>
                <div className="w-10 flex justify-end">
                  <button onClick={() => removeRow(idx)} className="text-slate-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity">
                    <X size={16} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
