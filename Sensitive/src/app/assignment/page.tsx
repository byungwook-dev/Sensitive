'use client';

import { useStore } from '@/store/useStore';
import AssignmentPage from '@/components/AssignmentPage';
import Link from 'next/link';

export default function AssignmentMainPage() {
  const { assignmentMode, setAssignmentMode } = useStore();

  return (
    <div className="flex h-[calc(100vh-8rem)] flex-col gap-4">
      {/* 탭 */}
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-1 rounded-lg bg-slate-100 p-1">
          <span className="rounded-md bg-white px-4 py-1.5 text-sm font-bold text-slate-900 shadow-sm">팀/반 배정</span>
          <Link href="/board" className="rounded-md px-4 py-1.5 text-sm font-semibold text-slate-500 transition hover:text-slate-700 hover:bg-white/50">배정 보드</Link>
        </div>
        <div className="flex items-center gap-1 rounded-lg bg-slate-100 p-1">
          <button
            onClick={() => setAssignmentMode('team')}
            className={`rounded-md px-3 py-1.5 text-sm font-semibold transition ${assignmentMode === 'team' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
          >
            팀
          </button>
          <button
            onClick={() => setAssignmentMode('class')}
            className={`rounded-md px-3 py-1.5 text-sm font-semibold transition ${assignmentMode === 'class' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
          >
            반
          </button>
        </div>
      </div>

      <AssignmentPage mode={assignmentMode} />
    </div>
  );
}
