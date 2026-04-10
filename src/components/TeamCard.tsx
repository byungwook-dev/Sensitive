'use client';

import { useDroppable } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { Team, Student, PersonalityType } from '@/types';
import { getTeamStats } from '@/services/assignmentEngine';
import StudentCard from './StudentCard';
import { useState } from 'react';

const ALL_PERSONALITIES: PersonalityType[] = ['리더형', '협동형', '분석형', '신중형', '적극형', '창의형'];
const PERSONALITY_DOT_COLORS: Record<string, string> = {
  '리더형': 'bg-red-400',
  '협동형': 'bg-blue-400',
  '분석형': 'bg-purple-400',
  '신중형': 'bg-amber-400',
  '적극형': 'bg-emerald-400',
  '창의형': 'bg-pink-400',
};

interface TeamCardProps {
  team: Team;
  students: Student[];
  allStudents: Student[];
  onUpdateTeam: (id: string, data: Partial<Team>) => void;
  onDeleteTeam: (id: string) => void;
  onDeleteStudent: (id: string) => void;
}

export default function TeamCard({ team, students, allStudents, onUpdateTeam, onDeleteTeam, onDeleteStudent }: TeamCardProps) {
  const { setNodeRef, isOver } = useDroppable({ id: team.id, data: { type: 'team', team } });
  const [isEditingName, setIsEditingName] = useState(false);
  const [editName, setEditName] = useState(team.name);
  const [isEditingMax, setIsEditingMax] = useState(false);
  const [editMax, setEditMax] = useState(team.maxMembers);

  const members = allStudents.filter((s) => team.memberIds.includes(s.id));
  const stats = getTeamStats(team, allStudents);
  const isOverCapacity = members.length > team.maxMembers;
  const isUnderCapacity = members.length > 0 && members.length < (team.minMembers || 0);

  const memberIds = team.memberIds;

  return (
    <div
      ref={setNodeRef}
      className={`flex flex-col rounded-xl border-2 bg-white shadow-sm transition-all ${
        isOver ? 'border-blue-400 bg-blue-50/30 shadow-lg' : isOverCapacity ? 'border-red-300' : isUnderCapacity ? 'border-amber-300' : 'border-slate-200'
      }`}
    >
      {/* Team Header */}
      <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
        <div className="flex items-center gap-2">
          {isEditingName ? (
            <input
              autoFocus
              className="w-32 rounded border border-blue-300 px-2 py-1 text-sm font-bold"
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
              onBlur={() => { onUpdateTeam(team.id, { name: editName }); setIsEditingName(false); }}
              onKeyDown={(e) => { if (e.key === 'Enter') { onUpdateTeam(team.id, { name: editName }); setIsEditingName(false); } }}
            />
          ) : (
            <h4 className="cursor-pointer text-sm font-bold text-slate-900 hover:text-blue-600" onClick={() => setIsEditingName(true)}>
              {team.name}
            </h4>
          )}
          <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${isOverCapacity ? 'bg-red-100 text-red-700' : isUnderCapacity ? 'bg-amber-100 text-amber-700' : 'bg-slate-100 text-slate-600'}`}>
            {members.length}/{team.maxMembers}
          </span>
          {isOverCapacity && <span className="text-[11px] font-semibold text-red-500">초과!</span>}
          {isUnderCapacity && <span className="text-[11px] font-semibold text-amber-500">부족 (최소 {team.minMembers}명)</span>}
        </div>
        <div className="flex items-center gap-1">
          {/* Max members edit */}
          {isEditingMax ? (
            <input
              autoFocus
              type="number"
              className="w-14 rounded border border-blue-300 px-2 py-1 text-xs"
              value={editMax}
              min={1}
              onChange={(e) => setEditMax(parseInt(e.target.value))}
              onBlur={() => { onUpdateTeam(team.id, { maxMembers: editMax }); setIsEditingMax(false); }}
              onKeyDown={(e) => { if (e.key === 'Enter') { onUpdateTeam(team.id, { maxMembers: editMax }); setIsEditingMax(false); } }}
            />
          ) : (
            <button onClick={() => setIsEditingMax(true)} className="rounded p-1 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600" title="최대 인원 수정">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06A1.65 1.65 0 0 0 15 19.4a1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>
            </button>
          )}
          <button onClick={() => { if (confirm(`${team.name}을(를) 삭제하시겠습니까?`)) onDeleteTeam(team.id); }} className="rounded p-1 text-slate-400 transition hover:bg-red-50 hover:text-red-500" title="팀 삭제">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
          </button>
        </div>
      </div>

      {/* Stats Row */}
      {members.length > 0 && (
        <div className="flex items-center gap-3 border-b border-slate-50 px-4 py-2">
          <span className="text-[11px] text-slate-400">평균 <span className="font-semibold text-slate-600">{stats.avgScore.toFixed(1)}</span></span>
          <span className="text-slate-200">|</span>
          <span className="text-[11px] text-slate-400">남<span className="font-semibold text-sky-600">{stats.maleCount}</span> 여<span className="font-semibold text-rose-600">{stats.femaleCount}</span></span>
          <span className="text-slate-200">|</span>
          <div className="flex gap-1">
            {ALL_PERSONALITIES.map((p) => {
              const count = stats.personalityDistribution[p] || 0;
              if (count === 0) return null;
              return (
                <div key={p} className="flex items-center gap-0.5" title={`${p}: ${count}명`}>
                  <div className={`h-2 w-2 rounded-full ${PERSONALITY_DOT_COLORS[p]}`} />
                  <span className="text-[10px] text-slate-500">{count}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Members */}
      <div className="flex-1 space-y-2 overflow-y-auto p-3" style={{ minHeight: 80, maxHeight: 400 }}>
        <SortableContext items={memberIds} strategy={verticalListSortingStrategy}>
          {members.map((s) => (
            <StudentCard key={s.id} student={s} onDelete={() => onDeleteStudent(s.id)} />
          ))}
        </SortableContext>
        {members.length === 0 && (
          <div className="flex h-20 items-center justify-center rounded-lg border-2 border-dashed border-slate-200 text-xs text-slate-400">
            학생을 여기로 드래그하세요
          </div>
        )}
      </div>
    </div>
  );
}
