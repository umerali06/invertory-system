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
  onToggle,
}: {
  collapsed: boolean;
  onToggle: () => void;
}) {
  const pathname = usePathname();

  return (
    <aside className={`bg-white border-r border-slate-200 flex flex-col h-screen sticky top-0 transition-all duration-200 ${
      collapsed ? 'w-20' : 'w-64'
    }`}>
      <div className={`p-6 flex items-center ${collapsed ? 'justify-center' : 'gap-3'}`}>
        <div className="bg-blue-500 text-white p-2 rounded-lg shrink-0">
          <BookOpen size={24} />
        </div>
        {!collapsed && (
          <div>
            <h1 className="font-bold text-lg leading-tight text-slate-800">Shopline</h1>
            <p className="text-xs text-slate-500">Inventory</p>
          </div>
        )}
      </div>

      <nav className="flex-1 px-3 py-2 overflow-y-auto space-y-1">
        {navItems.map((item) => {
          const isActive = pathname === item.href || (pathname.startsWith(item.href) && item.href !== '/');
          const Icon = item.icon;
          return (
            <Link
              key={item.name}
              href={item.href}
              title={collapsed ? item.name : undefined}
              className={`flex items-center ${collapsed ? 'justify-center px-3' : 'gap-3 px-4'} py-3 rounded-xl transition-colors font-medium text-sm ${
                isActive
                  ? 'bg-blue-500 text-white shadow-md shadow-blue-500/20'
                  : 'text-slate-600 hover:bg-slate-50'
              }`}
            >
              <Icon size={20} className={isActive ? 'text-white' : 'text-slate-400'} />
              {!collapsed && item.name}
            </Link>
          );
        })}

        <div className="pt-6 pb-2">
          {!collapsed ? (
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
              title={collapsed ? item.name : undefined}
              className={`flex items-center ${collapsed ? 'justify-center px-3' : 'gap-3 px-4'} py-3 rounded-xl transition-colors font-medium text-sm ${
                isActive
                  ? 'bg-blue-500 text-white shadow-md shadow-blue-500/20'
                  : 'text-slate-600 hover:bg-slate-50'
              }`}
            >
              <Icon size={20} className={isActive ? 'text-white' : 'text-slate-400'} />
              {!collapsed && item.name}
            </Link>
          );
        })}
      </nav>

      <div className="p-3 border-t border-slate-100 mt-auto">
        <button
          onClick={onToggle}
          className={`flex items-center ${collapsed ? 'justify-center px-3' : 'gap-3 px-4'} py-3 text-slate-600 hover:bg-slate-50 w-full rounded-xl transition-colors font-medium text-sm`}
          title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          <ChevronLeft size={20} className={`text-slate-400 transition-transform ${collapsed ? 'rotate-180' : ''}`} />
          {!collapsed && 'Collapse'}
        </button>
      </div>
    </aside>
  );
}
