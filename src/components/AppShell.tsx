'use client';

import { useEffect, useState } from 'react';
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
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  useEffect(() => {
    const mediaQuery = window.matchMedia('(min-width: 1024px)');
    const handleChange = (event: MediaQueryListEvent | MediaQueryList) => {
      if (event.matches) {
        setMobileSidebarOpen(false);
      }
    };

    handleChange(mediaQuery);
    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, []);

  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = mobileSidebarOpen ? 'hidden' : previousOverflow;

    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [mobileSidebarOpen]);

  return (
    <div className="flex min-h-screen bg-slate-50 lg:h-screen lg:overflow-hidden">
      <Sidebar
        collapsed={sidebarCollapsed}
        mobileOpen={mobileSidebarOpen}
        onToggle={() => setSidebarCollapsed((current) => !current)}
        onClose={() => setMobileSidebarOpen(false)}
      />
      <div className="flex min-w-0 flex-1 flex-col lg:h-screen lg:overflow-hidden">
        <Header
          user={user}
          lowStockCount={lowStockCount}
          recentActivityCount={recentActivityCount}
          notifications={notifications}
          onOpenSidebar={() => setMobileSidebarOpen(true)}
        />
        <main className="flex-1 overflow-x-hidden overflow-y-auto bg-slate-50 p-4 sm:p-6">
          {children}
        </main>
      </div>
    </div>
  );
}
