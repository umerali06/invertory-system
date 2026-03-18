'use client';

import { useState } from 'react';
import type { AppUser, HeaderNotification } from '@/lib/app-types';
import Header from '@/components/Header';
import Sidebar from '@/components/Sidebar';

export default function AppShell({
  user,
  lowStockCount,
  recentActivityCount,
  notifications,
  children,
}: {
  user: AppUser;
  lowStockCount: number;
  recentActivityCount: number;
  notifications: HeaderNotification[];
  children: React.ReactNode;
}) {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  return (
    <div className="flex h-screen bg-slate-50 overflow-hidden">
      <Sidebar collapsed={sidebarCollapsed} onToggle={() => setSidebarCollapsed((current) => !current)} />
      <div className="flex-1 flex flex-col h-screen overflow-hidden min-w-0">
        <Header user={user} lowStockCount={lowStockCount} recentActivityCount={recentActivityCount} notifications={notifications} />
        <main className="flex-1 overflow-x-hidden overflow-y-auto bg-slate-50 p-6">
          {children}
        </main>
      </div>
    </div>
  );
}
