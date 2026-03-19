'use client';

import { Bell, ChevronDown, LogOut, Menu, Search, User } from 'lucide-react';
import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import type { AppUser, HeaderNotification } from '@/lib/app-types';
import { logout } from '@/actions/auth';

export default function Header({
  user,
  lowStockCount,
  recentActivityCount,
  notifications,
  onOpenSidebar,
}: {
  user: AppUser;
  lowStockCount: number;
  recentActivityCount: number;
  notifications: HeaderNotification[];
  onOpenSidebar?: () => void;
}) {
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [notificationDrawerOpen, setNotificationDrawerOpen] = useState(false);
  const profileRef = useRef<HTMLDivElement>(null);
  const notificationRef = useRef<HTMLDivElement>(null);

  const initials = user.name.split(' ').map((name) => name[0]).join('').toUpperCase().substring(0, 2) || 'U';
  const notificationCount = lowStockCount + recentActivityCount;

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;

      if (profileRef.current && !profileRef.current.contains(target)) {
        setDropdownOpen(false);
      }

      if (notificationRef.current && !notificationRef.current.contains(target)) {
        setNotificationDrawerOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <header className="sticky top-0 z-20 flex h-16 w-full items-center justify-between border-b border-slate-200 bg-white px-4 sm:px-6 lg:px-8">
      <div className="flex min-w-0 flex-1 items-center gap-3 sm:gap-4">
        <button
          onClick={onOpenSidebar}
          className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-slate-200 text-slate-600 transition-colors hover:bg-slate-50 lg:hidden"
          title="Open navigation"
          aria-label="Open navigation"
        >
          <Menu size={20} />
        </button>

        <form action="/inventory" className="relative w-full max-w-xl">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
          <input
            type="text"
            name="q"
            placeholder="Search products, ISBN, or SKU..."
            className="w-full min-w-0 rounded-lg border-transparent bg-slate-100/80 py-2 pl-10 pr-4 text-sm outline-none transition-all focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-200"
          />
        </form>
      </div>

      <div className="ml-3 flex items-center gap-2 sm:ml-4 sm:gap-4">
        <div className="relative" ref={notificationRef}>
          <button
            onClick={() => setNotificationDrawerOpen((current) => !current)}
            className="relative p-2 text-slate-500 hover:bg-slate-50 rounded-full transition-colors"
            title="Open notifications"
          >
            <Bell size={20} />
            {notificationCount > 0 && (
              <span className="absolute -top-0.5 -right-0.5 min-w-5 h-5 px-1 bg-red-500 rounded-full border-2 border-white text-[10px] font-semibold text-white flex items-center justify-center">
                {notificationCount > 99 ? '99+' : notificationCount}
              </span>
            )}
          </button>

          {notificationDrawerOpen && (
            <div className="absolute right-0 mt-2 w-[360px] max-w-[calc(100vw-2rem)] bg-white rounded-2xl shadow-xl border border-slate-100 z-50 overflow-hidden">
              <div className="px-5 py-4 border-b border-slate-100">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <p className="text-sm font-semibold text-slate-800">Notifications</p>
                    <p className="text-xs text-slate-500 mt-1">Recent app activity, stock alerts, and automation updates.</p>
                  </div>
                  <Link href="/activity" onClick={() => setNotificationDrawerOpen(false)} className="text-xs font-medium text-blue-600 hover:text-blue-700">
                    View all
                  </Link>
                </div>
              </div>

              <div className="max-h-[420px] overflow-y-auto">
                {notifications.length > 0 ? notifications.map((notification) => (
                  <Link
                    key={notification.id}
                    href={notification.href}
                    onClick={() => setNotificationDrawerOpen(false)}
                    className="block px-5 py-4 border-b border-slate-100 hover:bg-slate-50 transition-colors"
                  >
                    <div className="flex items-start gap-3">
                      <div className={`mt-1 h-2.5 w-2.5 rounded-full shrink-0 ${
                        notification.level === 'warning'
                          ? 'bg-amber-500'
                          : notification.level === 'error'
                            ? 'bg-red-500'
                            : notification.level === 'success'
                              ? 'bg-emerald-500'
                              : 'bg-blue-500'
                      }`} />
                      <div className="min-w-0">
                        <div className="flex items-center justify-between gap-3">
                          <p className="text-sm font-medium text-slate-800">{notification.title}</p>
                          <span className="text-[11px] text-slate-400 shrink-0">{notification.timeLabel}</span>
                        </div>
                        <p className="text-xs text-slate-500 mt-1 leading-5">{notification.description}</p>
                      </div>
                    </div>
                  </Link>
                )) : (
                  <div className="px-5 py-10 text-center text-sm text-slate-500">
                    No notifications yet.
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        <div className="relative" ref={profileRef}>
          <div
            onClick={() => setDropdownOpen(!dropdownOpen)}
            className="flex cursor-pointer select-none items-center gap-2 rounded-lg border-l border-slate-200 p-1.5 pl-2 transition-colors hover:bg-slate-50 sm:gap-3 sm:pl-4"
          >
            <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-bold text-sm shrink-0">
              {initials}
            </div>
            <div className="hidden md:block">
              <p className="text-sm font-medium text-slate-700 leading-none">{user.name}</p>
              <p className="text-xs text-slate-500 mt-1">{user.role}</p>
            </div>
            <ChevronDown size={16} className={`hidden text-slate-400 transition-transform sm:block ${dropdownOpen ? 'rotate-180' : ''}`} />
          </div>

          {dropdownOpen && (
            <div className="absolute right-0 mt-2 w-56 bg-white rounded-xl shadow-lg border border-slate-100 py-2 z-50 animate-in fade-in slide-in-from-top-2">
              <div className="px-4 py-3 border-b border-slate-100">
                <p className="text-sm font-medium text-slate-800">{user.name}</p>
                <p className="text-xs text-slate-500 truncate">{user.email}</p>
              </div>
              <div className="py-2">
                <Link href="/settings" onClick={() => setDropdownOpen(false)} className="flex items-center gap-3 px-4 py-2 text-sm text-slate-600 hover:bg-slate-50 hover:text-slate-900 transition-colors">
                  <User size={16} />
                  Profile Settings
                </Link>
              </div>
              <div className="border-t border-slate-100 py-2">
                <button
                  onClick={() => logout()}
                  className="w-full flex items-center gap-3 px-4 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors"
                >
                  <LogOut size={16} />
                  Log out
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
