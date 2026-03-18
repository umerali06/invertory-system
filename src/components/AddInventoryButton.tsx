'use client';

import { Plus } from 'lucide-react';
import { useRouter } from 'next/navigation';

type TransitionDocument = Document & {
  startViewTransition?: (callback: () => void) => void;
};

export default function AddInventoryButton() {
  const router = useRouter();

  const handleClick = () => {
    const currentDocument = document as TransitionDocument;

    if (typeof currentDocument.startViewTransition === 'function') {
      currentDocument.startViewTransition(() => {
        router.push('/scan?mode=create');
      });
      return;
    }

    router.push('/scan?mode=create');
  };

  return (
    <button
      onClick={handleClick}
      className="inline-flex items-center gap-2 bg-blue-500 hover:bg-blue-600 text-white font-medium px-4 py-2.5 rounded-lg transition-all duration-200 hover:-translate-y-0.5 shadow-sm shadow-blue-500/20"
    >
      <Plus size={18} />
      Add Inventory
    </button>
  );
}
