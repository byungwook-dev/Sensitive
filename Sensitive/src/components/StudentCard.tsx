'use client';

import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Student } from '@/types';

const PERSONALITY_COLORS: Record<string, string> = {
  '리더형': 'bg-red-50 text-red-600 border-red-200',
  '협동형': 'bg-blue-50 text-blue-600 border-blue-200',
  '분석형': 'bg-purple-50 text-purple-600 border-purple-200',
  '신중형': 'bg-amber-50 text-amber-600 border-amber-200',
  '적극형': 'bg-emerald-50 text-emerald-600 border-emerald-200',
  '창의형': 'bg-pink-50 text-pink-600 border-pink-200',
};

const TRAIT_COLORS: Record<string, string> = {
  '외향적': 'bg-orange-50 text-orange-600',
  '내향적': 'bg-indigo-50 text-indigo-600',
  '적극적': 'bg-lime-50 text-lime-700',
  '소심한편': 'bg-slate-100 text-slate-600',
  '사교적': 'bg-cyan-50 text-cyan-700',
  '독립적': 'bg-violet-50 text-violet-600',
  '감성적': 'bg-rose-50 text-rose-600',
  '이성적': 'bg-teal-50 text-teal-700',
};

export default function StudentCard({ student, isDragOverlay, onDelete }: { student: Student; isDragOverlay?: boolean; onDelete?: () => void }) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: student.id, data: { type: 'student', student } });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
  };

  const scoreColor = student.score >= 80 ? 'text-emerald-600' : student.score >= 60 ? 'text-blue-600' : student.score >= 40 ? 'text-amber-600' : 'text-red-600';

  return (
    <div
      ref={!isDragOverlay ? setNodeRef : undefined}
      style={!isDragOverlay ? style : undefined}
      {...(!isDragOverlay ? attributes : {})}
      {...(!isDragOverlay ? listeners : {})}
      className={`group flex cursor-grab items-center gap-3 rounded-xl border border-slate-200 bg-white p-3 shadow-sm transition-all hover:border-blue-300 hover:shadow-md active:cursor-grabbing ${isDragOverlay ? 'drag-overlay shadow-xl ring-2 ring-blue-400' : ''}`}
    >
      {/* Avatar */}
      <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-sm font-bold ${student.gender === '남' ? 'bg-sky-100 text-sky-700' : 'bg-rose-100 text-rose-700'}`}>
        {student.name[0]}
      </div>
      {/* Info */}
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="truncate text-sm font-semibold text-slate-800">{student.name}</span>
          <span className={`shrink-0 rounded border px-1.5 py-0.5 text-[10px] font-semibold ${PERSONALITY_COLORS[student.personality]}`}>
            {student.personality}
          </span>
          {student.trait && (
            <span className={`shrink-0 rounded px-1.5 py-0.5 text-[10px] font-medium ${TRAIT_COLORS[student.trait] || 'bg-slate-100 text-slate-500'}`}>
              {student.trait}
            </span>
          )}
        </div>
        <div className="mt-0.5 flex items-center gap-2 text-[11px] text-slate-400">
          <span>{student.gender}</span>
          <span>·</span>
          <span>{student.age}세</span>
          <span>·</span>
          <span className={`font-semibold ${scoreColor}`}>{student.score}점</span>
        </div>
      </div>
      {/* Actions */}
      <div className="shrink-0 flex items-center gap-0.5 opacity-0 transition group-hover:opacity-100">
        {onDelete && (
          <button
            onClick={(e) => { e.stopPropagation(); if (confirm(`${student.name} 학생을 삭제하시겠습니까?`)) onDelete(); }}
            onPointerDown={(e) => e.stopPropagation()}
            className="rounded p-1 text-slate-300 transition hover:bg-red-50 hover:text-red-500"
            title="학생 삭제"
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
          </button>
        )}
        <div className="text-slate-300">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
            <circle cx="8" cy="4" r="2" /><circle cx="16" cy="4" r="2" />
            <circle cx="8" cy="12" r="2" /><circle cx="16" cy="12" r="2" />
            <circle cx="8" cy="20" r="2" /><circle cx="16" cy="20" r="2" />
          </svg>
        </div>
      </div>
    </div>
  );
}
