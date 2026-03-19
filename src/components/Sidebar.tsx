'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Activity,
  BookOpen,
  ChevronLeft,
  FileText,
  LayoutDashboard,
  ListChecks,
  Maximize,
  Package,
  Settings,
  Zap,
  X,
} from 'lucide-react';

const navItems = [
  { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { name: 'Inventory', href: '/inventory', icon: Package },
  { name: 'Scan Product', href: '/scan', icon: Maximize },
  { name: 'Reports', href: '/reports', icon: FileText },
  { name: 'Activity Logs', href: '/activity', icon: Activity },
  { name: 'Settings', href: '/settings', icon: Settings },
];

const automationItems = [
  { name: 'Quick Scan Batch', href: '/automation/quick-scan', icon: Zap },
  { name: 'Batch Update', href: '/automation/batch-update', icon: ListChecks },
];

export default function Sidebar({
  collapsed,
  mobileOpen,
  onToggle,
  onClose,
}: {
  collapsed: boolean;
  mobileOpen: boolean;
  onToggle: () => void;
  onClose: () => void;
}) {
  const pathname = usePathname();
  const showExpandedContent = mobileOpen || !collapsed;

  return (
    <>
      <button
        type="button"
        aria-label="Close navigation"
        onClick={onClose}
        className={`fixed inset-0 z-30 bg-slate-900/40 transition-opacity lg:hidden ${
          mobileOpen ? 'opacity-100' : 'pointer-events-none opacity-0'
        }`}
      />

      <aside className={`fixed inset-y-0 left-0 z-40 flex h-screen w-72 max-w-[85vw] flex-col border-r border-slate-200 bg-white transition-transform duration-200 ease-out lg:sticky lg:top-0 lg:z-auto lg:max-w-none ${
        mobileOpen ? 'translate-x-0' : '-translate-x-full'
      } ${
        collapsed ? 'lg:w-20' : 'lg:w-64'
      } lg:translate-x-0`}>
        <div className={`flex items-center justify-between p-4 sm:p-6 ${showExpandedContent ? 'gap-3' : 'lg:justify-center'}`}>
          <div className={`flex items-center ${showExpandedContent ? 'gap-3' : 'lg:justify-center'}`}>
            <div className="shrink-0 rounded-lg bg-blue-500 p-2 text-white">
              <BookOpen size={24} />
            </div>
            {showExpandedContent && (
              <div>
                <h1 className="text-lg font-bold leading-tight text-slate-800">Shopline</h1>
                <p className="text-xs text-slate-500">Inventory</p>
              </div>
            )}
          </div>

          <button
            onClick={onClose}
            className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 text-slate-500 transition-colors hover:bg-slate-50 lg:hidden"
            aria-label="Close navigation"
          >
            <X size={18} />
          </button>
        </div>

        <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-2">
          {navItems.map((item) => {
            const isActive = pathname === item.href || (pathname.startsWith(item.href) && item.href !== '/');
            const Icon = item.icon;
            return (
              <Link
                key={item.name}
                href={item.href}
                onClick={onClose}
                title={showExpandedContent ? undefined : item.name}
                className={`flex items-center ${showExpandedContent ? 'gap-3 px-4' : 'lg:justify-center lg:px-3'} py-3 rounded-xl transition-colors font-medium text-sm ${
                  isActive
                    ? 'bg-blue-500 text-white shadow-md shadow-blue-500/20'
                    : 'text-slate-600 hover:bg-slate-50'
                }`}
              >
                <Icon size={20} className={isActive ? 'text-white' : 'text-slate-400'} />
                {showExpandedContent && item.name}
              </Link>
            );
          })}

          <div className="pt-6 pb-2">
            {showExpandedContent ? (
              <p className="px-4 text-xs font-semibold text-slate-400 uppercase tracking-wider">
                Automation
              </p>
            ) : (
              <div className="mx-auto h-px w-8 bg-slate-200" />
            )}
          </div>

          {automationItems.map((item) => {
            const isActive = pathname === item.href;
            const Icon = item.icon;
            return (
              <Link
                key={item.name}
                href={item.href}
                onClick={onClose}
                title={showExpandedContent ? undefined : item.name}
                className={`flex items-center ${showExpandedContent ? 'gap-3 px-4' : 'lg:justify-center lg:px-3'} py-3 rounded-xl transition-colors font-medium text-sm ${
                  isActive
                    ? 'bg-blue-500 text-white shadow-md shadow-blue-500/20'
                    : 'text-slate-600 hover:bg-slate-50'
                }`}
              >
                <Icon size={20} className={isActive ? 'text-white' : 'text-slate-400'} />
                {showExpandedContent && item.name}
              </Link>
            );
          })}
        </nav>

        <div className="mt-auto hidden border-t border-slate-100 p-3 lg:block">
          <button
            onClick={onToggle}
            className={`flex w-full items-center ${collapsed ? 'justify-center px-3' : 'gap-3 px-4'} rounded-xl py-3 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-50`}
            title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            <ChevronLeft size={20} className={`text-slate-400 transition-transform ${collapsed ? 'rotate-180' : ''}`} />
            {!collapsed && 'Collapse'}
          </button>
        </div>
      </aside>
    </>
  );
}
