import type { ComponentType } from 'react';
import { Search, CheckCircle2, User, KeyRound, FileTerminal, MonitorSmartphone, MapPin, Clock, Activity } from 'lucide-react';
import { getActivities } from '@/actions/activity';
import type { ActivityLog } from '@/lib/app-types';

const ICONS: Record<string, ComponentType<{ size?: number; className?: string }>> = {
  'Login': CheckCircle2,
  'Inventory Update': CheckCircle2,
  'Product Search': User,
  'Profile Update': User,
  'Password Change': KeyRound,
  'Report Generated': FileTerminal,
};

const COLORS: Record<string, { color: string, bg: string }> = {
  'success': { color: 'text-emerald-500', bg: 'bg-emerald-50' },
  'info': { color: 'text-blue-500', bg: 'bg-blue-50' },
  'warning': { color: 'text-amber-500', bg: 'bg-amber-50' },
  'error': { color: 'text-red-500', bg: 'bg-red-50' },
};

export default async function ActivityLogsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; period?: 'all-time' | 'today' | 'this-week' | 'this-month' }>;
}) {
  const params = await searchParams;
  const activitiesRes = await getActivities({ query: params.q, period: params.period ?? 'all-time' });
  const activities = activitiesRes.data || [];
  const activePeriod = params.period ?? 'all-time';

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Activity Log</h1>
          <p className="text-sm text-slate-500 mt-1">Track your system activities and login history</p>
        </div>
        <div className="bg-blue-100 rounded-xl p-4 flex flex-col items-center justify-center min-w-[100px]">
          <span className="text-xs text-blue-600 font-medium tracking-wide uppercase">Total Activities</span>
          <span className="text-2xl font-bold text-blue-700">{activities.length}</span>
        </div>
      </div>

      <form className="flex gap-4 items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
          <input 
            type="text" 
            name="q"
            defaultValue={params.q ?? ''}
            placeholder="Search activities..." 
            className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
          />
        </div>
        <div className="flex bg-white border border-slate-200 rounded-lg overflow-hidden text-sm font-medium">
          {[
            ['all-time', 'All Time'],
            ['today', 'Today'],
            ['this-week', 'This Week'],
            ['this-month', 'This Month'],
          ].map(([value, label], index) => (
            <button
              key={value}
              type="submit"
              name="period"
              value={value}
              className={`px-4 py-2 transition-colors ${
                activePeriod === value ? 'bg-slate-50 text-slate-800' : 'text-slate-500 hover:bg-slate-50'
              } ${index < 3 ? 'border-r border-slate-200' : ''}`}
            >
              {label}
            </button>
          ))}
        </div>
      </form>

      <div className="space-y-3">
        {activities.map((item: ActivityLog) => {
          const Icon = ICONS[item.type] || Activity;
          const styling = COLORS[item.status] || COLORS['info'];
          return (
            <div key={item.id} className="bg-white rounded-xl shadow-sm border border-slate-100 p-5 flex items-start gap-4 transition-all hover:shadow-md">
              <div className={`p-3 rounded-full mt-1 ${styling.bg} ${styling.color}`}>
                <Icon size={20} />
              </div>
              <div className="flex-1">
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="font-semibold text-slate-800">{item.type}</h3>
                    <p className="text-sm text-slate-600 mt-0.5">{item.action}</p>
                  </div>
                  <span className={`px-2.5 py-1 rounded-full text-xs font-medium capitalize border ${
                    item.status === 'success' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                    item.status === 'warning' ? 'bg-amber-50 text-amber-700 border-amber-200' :
                    item.status === 'error' ? 'bg-red-50 text-red-700 border-red-200' :
                    'bg-blue-50 text-blue-700 border-blue-200'
                  }`}>
                    {item.status}
                  </span>
                </div>
                <div className="flex flex-wrap items-center gap-4 mt-3 text-xs text-slate-400 font-medium">
                  <div className="flex items-center gap-1.5"><Clock size={14} />{item.timeLabel}</div>
                  {item.browser && (
                    <div className="flex items-center gap-1.5"><MonitorSmartphone size={14} />{item.browser}</div>
                  )}
                  {item.ip && (
                    <div className="flex items-center gap-1.5"><MapPin size={14} />{item.ip}</div>
                  )}
                </div>
              </div>
            </div>
          )
        })}
        {activities.length === 0 && (
          <div className="text-center py-8 text-slate-500 bg-slate-50/50 rounded-xl border border-dashed border-slate-200">
            No activities found.
          </div>
        )}
      </div>
    </div>
  );
}
