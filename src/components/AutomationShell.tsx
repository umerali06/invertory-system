'use client';

import { PlayCircle, Square } from 'lucide-react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';
import { toast } from 'sonner';
import type { AutomationSession } from '@/lib/app-types';
import { endAutomationSession, startAutomationSession } from '@/actions/automation';

export default function AutomationShell({
  initialSession,
  recentSessions,
  children,
}: {
  initialSession: AutomationSession | null;
  recentSessions: AutomationSession[];
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [activeSession, setActiveSession] = useState(initialSession);
  const [sessionName, setSessionName] = useState('');
  const [sessionNotes, setSessionNotes] = useState('');
  const [expanded, setExpanded] = useState(Boolean(initialSession));
  const [isPending, startTransition] = useTransition();

  const tabs = [
    { name: 'Quick Scan Batch', href: '/automation/quick-scan', active: pathname.includes('quick-scan') },
    { name: 'Batch Update', href: '/automation/batch-update', active: pathname.includes('batch-update') },
  ];

  const handleStartSession = () => {
    startTransition(async () => {
      const response = await startAutomationSession({
        name: sessionName,
        notes: sessionNotes,
      });

      if (!response.success || !response.data) {
        toast.error('Unable to start an automation session.');
        return;
      }

      setActiveSession(response.data);
      setExpanded(true);
      setSessionName('');
      setSessionNotes('');
      toast.success(`Automation session "${response.data.name}" started.`);
      router.refresh();
    });
  };

  const handleEndSession = () => {
    startTransition(async () => {
      const response = await endAutomationSession();
      if (!response.success) {
        toast.error(response.error ?? 'Unable to end the automation session.');
        return;
      }

      setActiveSession(null);
      toast.success('Automation session completed.');
      router.refresh();
    });
  };

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
        <button onClick={() => setExpanded((current) => !current)} className="w-full flex items-center justify-between px-6 py-4 border-b border-slate-100 hover:bg-slate-50 transition-colors">
          <div className="text-left">
            <p className="font-semibold text-slate-800 text-sm">Automation Session</p>
            <p className="text-sm text-slate-500">
              {activeSession
                ? `${activeSession.name} - ${activeSession.processedItems} items / ${activeSession.processedUnits} units`
                : 'Open this panel to start a tracked automation session.'}
            </p>
          </div>
          <div className={`flex items-center gap-3 text-xs font-semibold px-3 py-1.5 rounded-full border ${
            activeSession ? 'text-emerald-700 bg-emerald-50 border-emerald-200' : 'text-slate-500 bg-slate-50 border-slate-200'
          }`}>
            <div className={`w-2 h-2 rounded-full ${activeSession ? 'bg-emerald-500' : 'bg-slate-300'}`}></div>
            {activeSession ? 'Session Active' : 'No Session'}
          </div>
        </button>

        {expanded && (
          <div className="px-6 py-5 grid grid-cols-1 lg:grid-cols-[1.3fr_1fr] gap-6 bg-slate-50/50">
            <div className="space-y-3">
              {activeSession ? (
                <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4">
                  <p className="font-semibold text-emerald-800">{activeSession.name}</p>
                  <p className="text-sm text-emerald-700 mt-1">{activeSession.notes || 'No notes added for this session.'}</p>
                  <div className="mt-3 flex flex-wrap gap-3 text-xs text-emerald-700">
                    <span>Started: {activeSession.startedAtLabel}</span>
                    <span>Processed items: {activeSession.processedItems}</span>
                    <span>Processed units: {activeSession.processedUnits}</span>
                  </div>
                  <button onClick={handleEndSession} disabled={isPending} className="mt-4 inline-flex items-center gap-2 rounded-lg bg-white px-4 py-2 text-sm font-medium text-emerald-700 border border-emerald-300 hover:bg-emerald-100">
                    <Square size={16} />
                    {isPending ? 'Ending...' : 'End Session'}
                  </button>
                </div>
              ) : (
                <div className="space-y-3">
                  <input value={sessionName} onChange={(event) => setSessionName(event.target.value)} placeholder="Session name (optional)" className="w-full rounded-lg border border-slate-200 px-4 py-3 text-sm bg-white" />
                  <textarea value={sessionNotes} onChange={(event) => setSessionNotes(event.target.value)} placeholder="Notes for this automation run (optional)" className="w-full rounded-lg border border-slate-200 px-4 py-3 text-sm min-h-24 bg-white" />
                  <button onClick={handleStartSession} disabled={isPending} className="inline-flex items-center gap-2 rounded-lg bg-blue-500 px-4 py-2.5 text-sm font-medium text-white hover:bg-blue-600 disabled:bg-blue-300">
                    <PlayCircle size={16} />
                    {isPending ? 'Starting...' : 'Start Session'}
                  </button>
                </div>
              )}
            </div>

            <div className="rounded-xl border border-slate-200 bg-white p-4">
              <p className="text-sm font-semibold text-slate-800 mb-3">Recent Sessions</p>
              <div className="space-y-3">
                {recentSessions.length > 0 ? recentSessions.map((session) => (
                  <div key={session.id} className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                    <p className="font-medium text-slate-800 text-sm">{session.name}</p>
                    <p className="text-xs text-slate-500 mt-1">{session.startedAtLabel}</p>
                    <p className="text-xs text-slate-500 mt-1">{session.processedItems} items - {session.processedUnits} units</p>
                  </div>
                )) : (
                  <div className="text-sm text-slate-500">No sessions recorded yet.</div>
                )}
              </div>
            </div>
          </div>
        )}

        <nav className="flex items-center gap-4 overflow-x-auto whitespace-nowrap border-t border-slate-100 bg-white px-4 pt-2 sm:gap-6 sm:px-6">
          {tabs.map((tab) => (
            <Link
              key={tab.name}
              href={tab.href}
              className={`py-3 px-1 border-b-2 font-medium text-sm transition-colors ${
                tab.active
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
              }`}
            >
              {tab.name}
            </Link>
          ))}
        </nav>
      </div>

      {children}
    </div>
  );
}

