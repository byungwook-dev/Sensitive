'use client';

import { useState, useMemo } from 'react';
import {
  DndContext, DragOverlay, closestCenter, PointerSensor, useSensor, useSensors,
  DragStartEvent, DragEndEvent, DragOverEvent,
} from '@dnd-kit/core';
import { SortableContext, useSortable, rectSortingStrategy } from '@dnd-kit/sortable';
import { useDroppable } from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';
import Link from 'next/link';
import { useStore } from '@/store/useStore';
import { getTeamStats, calculateBalanceScore } from '@/services/assignmentEngine';
import { Student, PersonalityType } from '@/types';

const P_COLORS: Record<string, string> = {
  '리더형': 'bg-red-400', '협동형': 'bg-blue-400', '분석형': 'bg-purple-400',
  '신중형': 'bg-amber-400', '적극형': 'bg-emerald-400', '창의형': 'bg-pink-400',
};
const P_TEXT: Record<string, string> = {
  '리더형': 'text-red-700 bg-red-50', '협동형': 'text-blue-700 bg-blue-50',
  '분석형': 'text-purple-700 bg-purple-50', '신중형': 'text-amber-700 bg-amber-50',
  '적극형': 'text-emerald-700 bg-emerald-50', '창의형': 'text-pink-700 bg-pink-50',
};

interface TeamAnalysis {
  synergy: string; traitBalance: string; scoreInsight: string;
  demographics: string; caution: string; recommendation: string; oneLineSum: string;
}

export default function BoardPage() {
  const { students, teams, updateTeam, moveStudent, teamAnalyses, setTeamAnalyses } = useStore();
  const [activeStudent, setActiveStudent] = useState<Student | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [showAnalysis, setShowAnalysis] = useState(Object.keys(teamAnalyses).length > 0);
  const [selectedTeam, setSelectedTeam] = useState<string | null>(null);
  const [analyzingTeamId, setAnalyzingTeamId] = useState<string | null>(null);
  const analyses = teamAnalyses as Record<string, TeamAnalysis>;

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));
  const balance = useMemo(() => calculateBalanceScore(teams, students), [teams, students]);
  const assignedIds = useMemo(() => new Set(teams.flatMap(t => t.memberIds)), [teams]);
  const unassigned = useMemo(() => students.filter(s => !assignedIds.has(s.id)), [students, assignedIds]);

  const findContainer = (id: string): string | null => {
    if (teams.some(t => t.id === id) || id === 'unassigned') return id;
    for (const t of teams) { if (t.memberIds.includes(id)) return t.id; }
    if (unassigned.some(s => s.id === id)) return 'unassigned';
    return null;
  };

  const handleDragStart = (e: DragStartEvent) => {
    setActiveStudent(students.find(s => s.id === e.active.id) || null);
  };
  const handleDragOver = (e: DragOverEvent) => {
    const { active, over } = e;
    if (!over) return;
    const from = findContainer(active.id as string);
    let to = findContainer(over.id as string);
    if (over.id === 'unassigned') to = 'unassigned';
    if (!from || !to || from === to) return;
    moveStudent(active.id as string, from === 'unassigned' ? null : from, to === 'unassigned' ? null : to);
  };
  const handleDragEnd = (e: DragEndEvent) => {
    const { active, over } = e;
    setActiveStudent(null);
    if (!over) return;
    const from = findContainer(active.id as string);
    const to = findContainer(over.id as string);
    if (from === to && from && from !== 'unassigned') {
      const team = teams.find(t => t.id === from);
      if (!team) return;
      const oi = team.memberIds.indexOf(active.id as string);
      const ni = team.memberIds.indexOf(over.id as string);
      if (oi !== -1 && ni !== -1 && oi !== ni) {
        const ids = [...team.memberIds]; ids.splice(oi, 1); ids.splice(ni, 0, active.id as string);
        updateTeam(team.id, { memberIds: ids });
      }
    }
  };

  const handleAnalyzeAll = async () => {
    setIsAnalyzing(true); setShowAnalysis(true);
    const results: Record<string, TeamAnalysis> = {};
    for (const team of teams) {
      const members = students.filter(s => team.memberIds.includes(s.id));
      if (members.length === 0) continue;
      try {
        const res = await fetch('/api/ai/analyze', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ team, members }) });
        if (res.ok) {
          const data = await res.json();
          if (data.synergy) {
            results[team.id] = data;
            setTeamAnalyses({ ...results });
          }
        }
      } catch (err) {
        console.error('팀 분석 실패:', team.name, err);
      }
    }
    setTeamAnalyses(results); setIsAnalyzing(false);
  };

  const handleAnalyzeTeam = async (teamId: string) => {
    if (selectedTeam === teamId) { setSelectedTeam(null); return; }
    setSelectedTeam(teamId);
    if (analyses[teamId]) return;
    const team = teams.find(t => t.id === teamId);
    if (!team) return;
    const members = students.filter(s => team.memberIds.includes(s.id));
    if (members.length === 0) return;
    setAnalyzingTeamId(teamId);
    try {
      const res = await fetch('/api/ai/analyze', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ team, members }) });
      if (res.ok) {
        const data = await res.json();
        if (data.synergy) setTeamAnalyses({ ...analyses, [teamId]: data });
      }
    } catch (err) {
      console.error('팀 분석 실패:', team.name, err);
    }
    setAnalyzingTeamId(null);
  };

  if (teams.length === 0) {
    return (
      <div className="flex h-[calc(100vh-10rem)] items-center justify-center">
        <div className="text-center">
          <p className="text-sm font-semibold text-slate-500">배정된 팀/반이 없습니다</p>
          <p className="mt-1 text-xs text-slate-400">팀/반 배정 메뉴에서 먼저 배정을 진행해주세요</p>
          <Link href="/assignment" className="mt-4 inline-block rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white">배정하러 가기</Link>
        </div>
      </div>
    );
  }

  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragStart={handleDragStart} onDragOver={handleDragOver} onDragEnd={handleDragEnd}>
      <div className="space-y-4">
        {/* 상단 바 */}
        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex items-center gap-1 rounded-lg bg-slate-100 p-1">
            <Link href="/assignment" className="rounded-md px-4 py-1.5 text-sm font-semibold text-slate-500 hover:text-slate-700 hover:bg-white/50 transition">팀/반 배정</Link>
            <span className="rounded-md bg-white px-4 py-1.5 text-sm font-bold text-slate-900 shadow-sm">배정 보드</span>
          </div>
          <div className="flex items-center gap-2 rounded-full bg-white border border-slate-200 px-3 py-1.5">
            <div className={`h-2 w-2 rounded-full ${balance.overall >= 80 ? 'bg-emerald-500' : balance.overall >= 60 ? 'bg-amber-500' : 'bg-red-500'}`} />
            <span className={`text-sm font-bold ${balance.overall >= 80 ? 'text-emerald-600' : balance.overall >= 60 ? 'text-amber-600' : 'text-red-600'}`}>{balance.overall}</span>
          </div>
          <span className="text-xs text-slate-400">{students.length}명 · {teams.length}팀</span>
          <div className="ml-auto flex items-center gap-2">
            <button
              onClick={() => showAnalysis ? setShowAnalysis(false) : handleAnalyzeAll()}
              disabled={isAnalyzing}
              className="flex items-center gap-1.5 rounded-lg bg-violet-600 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-violet-700 disabled:opacity-50"
            >
              {isAnalyzing ? <><div className="h-3 w-3 animate-spin rounded-full border-2 border-white/30 border-t-white" /> 분석 중</> :
               showAnalysis ? '분석 닫기' : <><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg> AI 팀 분석</>}
            </button>
          </div>
        </div>

        {/* 보드 캔버스 */}
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm min-h-[calc(100vh-15rem)]">
          {/* 미배정 */}
          {unassigned.length > 0 && (
            <TeamRow id="unassigned" title="미배정" count={unassigned.length} color="slate" studentIds={unassigned.map(s => s.id)}>
              {unassigned.map(s => <Chip key={s.id} student={s} />)}
            </TeamRow>
          )}

          {/* 팀들 */}
          {teams.map(team => {
            const stats = getTeamStats(team, students);
            const members = students.filter(s => team.memberIds.includes(s.id));
            const a = analyses[team.id];
            const isSelected = selectedTeam === team.id;
            return (
              <div key={team.id}>
                <TeamRow
                  id={team.id}
                  title={team.name}
                  count={members.length}
                  color="blue"
                  stats={stats}
                  badge={a?.oneLineSum}
                  studentIds={team.memberIds}
                  onClickTitle={() => handleAnalyzeTeam(team.id)}
                  isSelected={isSelected}
                >
                  {members.map(s => <Chip key={s.id} student={s} />)}
                  {members.length === 0 && <span className="text-[11px] text-slate-400 py-2">드래그하여 학생 추가</span>}
                </TeamRow>

                {/* 인라인 분석 - 팀 이름 클릭으로 AI 분석 자동 실행 */}
                {isSelected && analyzingTeamId === team.id && (
                  <div className="ml-[140px] mb-3 flex items-center gap-2 text-xs text-violet-600">
                    <div className="h-3 w-3 animate-spin rounded-full border-2 border-violet-300 border-t-violet-600" />
                    AI가 팀을 분석하고 있습니다...
                  </div>
                )}
                {a && isSelected && (
                  <div className="ml-[140px] mb-3 grid grid-cols-3 gap-2 text-[11px] text-slate-600 animate-[fadeIn_0.2s]">
                    <div className="rounded-lg bg-blue-50 p-2.5"><strong className="text-blue-700">시너지</strong><br/>{a.synergy}</div>
                    <div className="rounded-lg bg-emerald-50 p-2.5"><strong className="text-emerald-700">성향 시너지</strong><br/>{a.traitBalance}</div>
                    <div className="rounded-lg bg-amber-50 p-2.5"><strong className="text-amber-700">성적</strong><br/>{a.scoreInsight}</div>
                    <div className="rounded-lg bg-pink-50 p-2.5"><strong className="text-pink-700">구성</strong><br/>{a.demographics}</div>
                    <div className="rounded-lg bg-red-50 p-2.5"><strong className="text-red-700">주의</strong><br/>{a.caution}</div>
                    <div className="rounded-lg bg-indigo-50 p-2.5"><strong className="text-indigo-700">추천</strong><br/>{a.recommendation}</div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      <DragOverlay>
        {activeStudent && <Chip student={activeStudent} isOverlay />}
      </DragOverlay>
    </DndContext>
  );
}

// ── 팀 행 ──
function TeamRow({ id, title, count, color, stats, badge, studentIds, children, onClickTitle, isSelected }: {
  id: string; title: string; count: number; color: 'slate' | 'blue';
  stats?: ReturnType<typeof getTeamStats>; badge?: string;
  studentIds: string[]; children: React.ReactNode;
  onClickTitle?: () => void; isSelected?: boolean;
}) {
  const { setNodeRef, isOver } = useDroppable({ id });

  return (
    <div ref={setNodeRef} className={`flex items-start gap-4 py-3 border-b border-slate-100 last:border-0 transition ${isOver ? 'bg-blue-50/50' : ''}`}>
      {/* 라벨 */}
      <div className="w-[120px] shrink-0 pt-1">
        <div className="flex items-center gap-2">
          <h4
            className={`text-sm font-bold cursor-pointer transition ${isSelected ? 'text-blue-600' : 'text-slate-800 hover:text-blue-600'}`}
            onClick={onClickTitle}
          >
            {title}
          </h4>
          <span className={`rounded-full px-1.5 py-0.5 text-[10px] font-bold ${color === 'blue' ? 'bg-blue-50 text-blue-600' : 'bg-slate-100 text-slate-500'}`}>{count}</span>
          {badge && (
            <button onClick={onClickTitle} className={`rounded-full p-0.5 transition ${isSelected ? 'bg-violet-600 text-white' : 'bg-violet-100 text-violet-600 hover:bg-violet-200'}`} title="AI 분석 보기">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>
            </button>
          )}
        </div>
        {stats && stats.memberCount > 0 && (
          <div className="mt-1 space-y-1">
            <div className="text-[10px] text-slate-500">
              <span className="font-semibold text-slate-700">{stats.avgScore.toFixed(1)}</span>점
              <span className="ml-1.5 text-sky-600">남{stats.maleCount}</span>
              <span className="ml-0.5 text-rose-600">여{stats.femaleCount}</span>
            </div>
            <div className="flex gap-0.5 h-1 rounded-full overflow-hidden w-20">
              {Object.entries(stats.personalityDistribution).filter(([, v]) => v > 0).map(([k, v]) => (
                <div key={k} className={`${P_COLORS[k]} rounded-full`} style={{ flex: v }} />
              ))}
            </div>
            {badge && <span className="inline-block mt-1 rounded bg-violet-50 px-1.5 py-0.5 text-[9px] font-semibold text-violet-700">{badge}</span>}
          </div>
        )}
      </div>
      {/* 학생 칩들 */}
      <div className="flex-1 flex flex-wrap gap-1.5 min-h-[36px] items-start">
        <SortableContext items={studentIds} strategy={rectSortingStrategy}>
          {children}
        </SortableContext>
      </div>
    </div>
  );
}

// ── 학생 칩 ──
function Chip({ student, isOverlay }: { student: Student; isOverlay?: boolean }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: student.id, data: { type: 'student', student },
  });
  const style = !isOverlay ? { transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.3 : 1 } : undefined;

  const sc = student.score >= 80 ? 'text-emerald-700' : student.score >= 60 ? 'text-blue-700' : 'text-amber-700';

  return (
    <div
      ref={!isOverlay ? setNodeRef : undefined}
      style={style}
      {...(!isOverlay ? attributes : {})}
      {...(!isOverlay ? listeners : {})}
      className={`group inline-flex items-center gap-1.5 rounded-lg border bg-white px-2.5 py-1.5 cursor-grab active:cursor-grabbing transition ${
        isOverlay ? 'shadow-xl ring-2 ring-blue-400 scale-105 border-blue-300' : 'border-slate-200 shadow-sm hover:shadow-md hover:border-blue-200'
      }`}
    >
      <div className={`h-5 w-5 rounded-md flex items-center justify-center text-[9px] font-bold ${student.gender === '남' ? 'bg-sky-50 text-sky-700' : 'bg-rose-50 text-rose-700'}`}>
        {student.name[0]}
      </div>
      <span className="text-[12px] font-semibold text-slate-800 whitespace-nowrap">{student.name}</span>
      <span className={`text-[10px] font-bold tabular-nums ${sc}`}>{student.score}</span>
      <span className={`rounded px-1 py-0.5 text-[8px] font-semibold ${P_TEXT[student.personality]}`}>{student.personality.replace('형', '')}</span>
    </div>
  );
}
