'use client';

import Sidebar from './Sidebar';
import Header from './Header';
import AIChatBot from './AIChatBot';
import ResetStorage from './ResetStorage';
import { useHydrated } from '@/store/useHydrated';
import { useAutoSync } from '@/store/useAutoSync';

function AutoSyncWrapper() {
  useAutoSync();
  return null;
}

export default function ClientLayout({ children }: { children: React.ReactNode }) {
  const hydrated = useHydrated();

  if (!hydrated) {
    return (
      <div className="flex h-screen items-center justify-center bg-slate-50">
        <div className="flex flex-col items-center gap-3">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-blue-200 border-t-blue-600" />
          <p className="text-sm font-medium text-slate-500">TeamBuilder AI 로딩 중...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full">
      <ResetStorage />
      <AutoSyncWrapper />
      <Sidebar />
      <div className="flex flex-1 flex-col pl-64">
        <Header />
        <main className="flex-1 overflow-auto p-8">{children}</main>
      </div>
      <AIChatBot />
    </div>
  );
}
