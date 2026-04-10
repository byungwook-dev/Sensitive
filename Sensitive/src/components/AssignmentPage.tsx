'use client';

import { useState, useMemo } from 'react';
import {
  DndContext,
  DragOverlay,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  DragStartEvent,
  DragEndEvent,
  DragOverEvent,
} from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { useDroppable } from '@dnd-kit/core';
import { useStore } from '@/store/useStore';
import { autoAssign, reOptimize, calculateBalanceScore } from '@/services/assignmentEngine';
import { Student, Team, AssignmentMode, BalanceScore } from '@/types';
import StudentCard from './StudentCard';
import TeamCard from './TeamCard';

export default function AssignmentPage({ mode }: { mode: AssignmentMode }) {
  const { students, teams, setTeams, addTeam, updateTeam, deleteTeam, deleteStudent, moveStudent, presets, savePreset, loadPreset, deletePreset } = useStore();
  const [activeStudent, setActiveStudent] = useState<Student | null>(null);
  const [isAssigning, setIsAssigning] = useState(false);
  const [optimizerInput, setOptimizerInput] = useState('');
  const [optimizerLog, setOptimizerLog] = useState<string[]>([]);
  const [showBalanceDetail, setShowBalanceDetail] = useState(false);
  const [pendingResult, setPendingResult] = useState<{ teams: Team[]; changes: string[]; before: BalanceScore; after: BalanceScore } | null>(null);
  const [isOptimizing, setIsOptimizing] = useState(false);
  const [showPresets, setShowPresets] = useState(false);
  const [presetName, setPresetName] = useState('');
  const [newTeamName, setNewTeamName] = useState('');

  const label = mode === 'team' ? '팀' : '반';

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } })
  );

  // 미배정 학생
  const assignedIds = useMemo(() => new Set(teams.flatMap((t) => t.memberIds)), [teams]);
  const unassigned = useMemo(() => students.filter((s) => !assignedIds.has(s.id)), [students, assignedIds]);
  const unassignedIds = useMemo(() => unassigned.map((s) => s.id), [unassigned]);

  // Balance
  const balance = useMemo(() => calculateBalanceScore(teams, students), [teams, students]);

  // ── DnD handlers ──
  const handleDragStart = (event: DragStartEvent) => {
    const student = students.find((s) => s.id === event.active.id);
    if (student) setActiveStudent(student);
  };

  const findContainer = (id: string): string | null => {
    // Is it a team id?
    if (teams.some((t) => t.id === id)) return id;
    // Is it a student id? Find which team contains it
    for (const team of teams) {
      if (team.memberIds.includes(id)) return team.id;
    }
    // Check unassigned
    if (unassigned.some((s) => s.id === id)) return 'unassigned';
    return null;
  };

  const handleDragOver = (event: DragOverEvent) => {
    const { active, over } = event;
    if (!over) return;

    const activeContainer = findContainer(active.id as string);
    let overContainer = findContainer(over.id as string);

    // If dropped over 'unassigned' droppable
    if (over.id === 'unassigned') overContainer = 'unassigned';

    if (!activeContainer || !overContainer || activeContainer === overContainer) return;

    const studentId = active.id as string;
    const fromTeamId = activeContainer === 'unassigned' ? null : activeContainer;
    const toTeamId = overContainer === 'unassigned' ? null : overContainer;

    // Find index
    let index: number | undefined;
    if (toTeamId) {
      const toTeam = teams.find((t) => t.id === toTeamId);
      if (toTeam) {
        const overIndex = toTeam.memberIds.indexOf(over.id as string);
        index = overIndex >= 0 ? overIndex : toTeam.memberIds.length;
      }
    }

    moveStudent(studentId, fromTeamId, toTeamId, index);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveStudent(null);
    if (!over) return;

    const activeContainer = findContainer(active.id as string);
    let overContainer = findContainer(over.id as string);
    if (over.id === 'unassigned') overContainer = 'unassigned';

    if (!activeContainer || !overContainer) return;

    // Same container reorder
    if (activeContainer === overContainer && activeContainer !== 'unassigned') {
      const team = teams.find((t) => t.id === activeContainer);
      if (!team) return;
      const oldIndex = team.memberIds.indexOf(active.id as string);
      const newIndex = team.memberIds.indexOf(over.id as string);
      if (oldIndex !== -1 && newIndex !== -1 && oldIndex !== newIndex) {
        const newMemberIds = [...team.memberIds];
        newMemberIds.splice(oldIndex, 1);
        newMemberIds.splice(newIndex, 0, active.id as string);
        updateTeam(team.id, { memberIds: newMemberIds });
      }
    }
  };

  // ── AI Auto Assign ──
  const handleAutoAssign = async () => {
    if (teams.length === 0) return alert(`먼저 ${label}을 생성해주세요.`);
    setIsAssigning(true);

    // 1) 로컬 엔진으로 먼저 최적 배정
    const localResult = autoAssign(students, teams);
    const localScore = calculateBalanceScore(localResult, students).overall;

    // 2) AI API도 시도
    let aiTeams: Team[] | null = null;
    let aiExplanation = '';
    try {
      const res = await fetch('/api/ai/assign', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ students, teams }),
      });
      if (res.ok) {
        const result = await res.json();
        aiTeams = teams.map((t) => {
          const aiTeam = result.teams.find((at: { id: string }) => at.id === t.id);
          return aiTeam ? { ...t, memberIds: aiTeam.memberIds } : { ...t, memberIds: [] };
        });
        aiExplanation = result.explanation || '';

        // AI 결과도 로컬 엔진으로 추가 최적화
        aiTeams = autoAssign(students, aiTeams);
      }
    } catch {
      // API 실패 시 무시, 로컬 결과 사용
    }

    // 3) 로컬 vs AI+로컬 중 균형 점수 높은 쪽 선택
    let finalTeams = localResult;
    let finalSource = '로컬 엔진';
    if (aiTeams) {
      const aiScore = calculateBalanceScore(aiTeams, students).overall;
      if (aiScore >= localScore) {
        finalTeams = aiTeams;
        finalSource = 'AI + 로컬 최적화';
      }
    }

    setTeams(finalTeams);
    const finalBalance = calculateBalanceScore(finalTeams, students);
    const logLines = [
      `배정 완료 (${finalSource})`,
      `균형 점수: ${finalBalance.overall} (성적 ${finalBalance.scoreBalance} / 성격 ${finalBalance.personalityBalance} / 성향 ${finalBalance.traitBalance})`,
    ];
    if (aiExplanation) logLines.push(`AI: ${aiExplanation}`);
    logLines.push('---');
    setOptimizerLog((prev) => [...prev, ...logLines]);

    setIsAssigning(false);
  };

  // ── AI Re-optimize ──
  const handleReOptimize = async () => {
    if (!optimizerInput.trim()) return;
    const cmd = optimizerInput;
    setOptimizerInput('');
    setIsOptimizing(true);
    setOptimizerLog((prev) => [...prev, `> ${cmd}`, 'AI가 배정을 분석하고 있습니다...']);

    const beforeScore = calculateBalanceScore(teams, students);
    let newTeams: Team[] = [];
    let changes: string[] = [];

    try {
      const res = await fetch('/api/ai/reoptimize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ students, teams, command: cmd }),
      });

      if (res.ok) {
        const result = await res.json();
        newTeams = teams.map((t) => {
          const aiTeam = result.teams.find((at: { id: string }) => at.id === t.id);
          return aiTeam ? { ...t, memberIds: aiTeam.memberIds } : t;
        });
        changes = result.changes || [];
        if (result.explanation) changes.unshift(`AI: ${result.explanation}`);
      } else {
        throw new Error('API error');
      }
    } catch {
      const result = reOptimize(students, teams, cmd);
      newTeams = result.teams;
      changes = result.changes;
    }

    // 로컬 엔진으로도 한 번 더 최적화
    const localResult = reOptimize(students, teams, cmd);
    const localAfter = calculateBalanceScore(localResult.teams, students);
    const aiAfter = calculateBalanceScore(newTeams, students);

    // 더 좋은 결과 선택
    if (localAfter.overall > aiAfter.overall) {
      newTeams = localResult.teams;
      changes = localResult.changes;
    }

    const afterScore = calculateBalanceScore(newTeams, students);

    setOptimizerLog((prev) => prev.slice(0, -1)); // "분석 중..." 제거
    setIsOptimizing(false);

    // 확인 모달용 데이터 세팅
    setPendingResult({ teams: newTeams, changes, before: beforeScore, after: afterScore });
  };

  const applyPendingResult = () => {
    if (!pendingResult) return;
    setTeams(pendingResult.teams);
    setOptimizerLog((prev) => [
      ...prev,
      `균형 점수: ${pendingResult.before.overall} → ${pendingResult.after.overall}`,
      ...pendingResult.changes,
      '---',
    ]);
    setPendingResult(null);
  };

  const cancelPendingResult = () => {
    setOptimizerLog((prev) => [...prev, '변경이 취소되었습니다.', '---']);
    setPendingResult(null);
  };

  // ── Quick Create Teams ──
  const handleQuickCreate = (count: number) => {
    const existing = teams.length;
    const perTeam = Math.ceil(students.length / (existing + count));
    for (let i = 0; i < count; i++) {
      addTeam({
        id: `team-${Date.now()}-${i}`,
        name: `${label} ${existing + i + 1}`,
        maxMembers: perTeam,
        minMembers: Math.max(1, perTeam - 2),
        memberIds: [],
      });
    }
  };

  const handleAddTeam = () => {
    const name = newTeamName.trim() || `${label} ${teams.length + 1}`;
    const perTeam = Math.ceil(students.length / (teams.length + 1));
    addTeam({
      id: `team-${Date.now()}`,
      name,
      maxMembers: perTeam,
      minMembers: Math.max(1, perTeam - 2),
      memberIds: [],
    });
    setNewTeamName('');
  };

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDragEnd={handleDragEnd}
    >
      <div className="flex flex-1 flex-col gap-4">
        {/* Toolbar */}
        <div className="flex flex-wrap items-center gap-3">
          {/* Quick team creation */}
          <div className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2">
            <span className="text-xs font-semibold text-slate-500">빠른 생성:</span>
            {[2, 3, 4, 5, 6, 7, 8, 9, 10].map((n) => (
              <button key={n} onClick={() => handleQuickCreate(n)} className="rounded-md bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-600 transition hover:bg-blue-100 hover:text-blue-700">
                {n}{label}
              </button>
            ))}
          </div>
          {/* Add custom team */}
          <div className="flex items-center gap-2">
            <input
              placeholder={`${label} 이름 입력`}
              value={newTeamName}
              onChange={(e) => setNewTeamName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleAddTeam()}
              className="w-36 rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
            />
            <button onClick={handleAddTeam} className="rounded-lg bg-slate-800 px-3 py-2 text-sm font-semibold text-white transition hover:bg-slate-700">
              + {label} 추가
            </button>
          </div>

          <div className="ml-auto flex items-center gap-3">
            {/* Presets */}
            <button
              onClick={() => setShowPresets(!showPresets)}
              className={`flex items-center gap-1.5 rounded-lg border px-3 py-2 text-xs font-semibold transition ${showPresets ? 'border-blue-300 bg-blue-50 text-blue-700' : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'}`}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/></svg>
              프리셋 {presets.length > 0 && `(${presets.length})`}
            </button>
            {/* Reset & Delete */}
            {teams.length > 0 && (
              <>
                <button
                  onClick={() => {
                    if (confirm('모든 배정을 초기화하시겠습니까? 팀/반은 유지되고 학생 배정만 해제됩니다.')) {
                      setTeams(teams.map((t) => ({ ...t, memberIds: [] })));
                    }
                  }}
                  className="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-600 transition hover:bg-slate-50"
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M2.5 2v6h6M21.5 22v-6h-6"/><path d="M22 11.5A10 10 0 0 0 3.2 7.2M2 12.5a10 10 0 0 0 18.8 4.3"/></svg>
                  배정 초기화
                </button>
                <button
                  onClick={() => {
                    if (confirm(`모든 ${label}을 삭제하시겠습니까? 배정도 함께 삭제됩니다.`)) {
                      setTeams([]);
                    }
                  }}
                  className="flex items-center gap-1.5 rounded-lg border border-red-200 bg-white px-3 py-2 text-xs font-semibold text-red-600 transition hover:bg-red-50"
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
                  {label} 전체 삭제
                </button>
              </>
            )}
            {/* Balance Score */}
            {teams.length > 0 && (
              <button
                onClick={() => setShowBalanceDetail(!showBalanceDetail)}
                className="flex items-center gap-2 rounded-lg bg-white border border-slate-200 px-3 py-2 transition hover:border-blue-300 hover:shadow-sm"
              >
                <div className={`h-3 w-3 rounded-full ${balance.overall >= 80 ? 'bg-emerald-500' : balance.overall >= 60 ? 'bg-amber-500' : 'bg-red-500'}`} />
                <span className="text-xs text-slate-500">균형</span>
                <span className={`text-sm font-bold ${balance.overall >= 80 ? 'text-emerald-600' : balance.overall >= 60 ? 'text-amber-600' : 'text-red-600'}`}>
                  {balance.overall}
                </span>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="2" className={`transition ${showBalanceDetail ? 'rotate-180' : ''}`}><polyline points="6 9 12 15 18 9"/></svg>
              </button>
            )}
            {/* Auto Assign */}
            <button
              onClick={handleAutoAssign}
              disabled={isAssigning}
              className="flex items-center gap-2 rounded-lg bg-gradient-to-r from-blue-600 to-indigo-600 px-5 py-2 text-sm font-semibold text-white shadow-sm transition hover:from-blue-700 hover:to-indigo-700 disabled:opacity-50"
            >
              {isAssigning ? (
                <>
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                  AI 배정 중...
                </>
              ) : (
                <>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>
                  AI 자동 배정
                </>
              )}
            </button>
          </div>
        </div>

        {/* 프리셋 패널 */}
        {showPresets && (
          <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="mb-3 flex items-center justify-between">
              <h4 className="text-sm font-bold text-slate-900">저장된 프리셋</h4>
              {teams.length > 0 && (
                <div className="flex items-center gap-2">
                  <input
                    value={presetName}
                    onChange={(e) => setPresetName(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && presetName.trim()) {
                        savePreset(presetName.trim(), balance.overall);
                        setPresetName('');
                      }
                    }}
                    placeholder="프리셋 이름 입력..."
                    className="w-48 rounded-lg border border-slate-200 px-3 py-1.5 text-sm outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
                  />
                  <button
                    onClick={() => {
                      const name = presetName.trim() || `${label} 배정 ${new Date().toLocaleDateString('ko-KR')}`;
                      savePreset(name, balance.overall);
                      setPresetName('');
                    }}
                    className="rounded-lg bg-blue-600 px-3 py-1.5 text-sm font-semibold text-white transition hover:bg-blue-700"
                  >
                    현재 배정 저장
                  </button>
                </div>
              )}
            </div>
            {presets.length > 0 ? (
              <div className="space-y-2">
                {presets.map((p) => (
                  <div key={p.id} className="flex items-center gap-3 rounded-lg border border-slate-100 bg-slate-50/50 p-3 transition hover:bg-slate-50">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-semibold text-slate-800 truncate">{p.name}</span>
                        <span className="shrink-0 rounded bg-slate-200 px-1.5 py-0.5 text-[10px] font-medium text-slate-600">
                          {p.mode === 'team' ? '팀' : '반'}
                        </span>
                      </div>
                      <div className="mt-0.5 flex items-center gap-3 text-[11px] text-slate-400">
                        <span>{p.teams.length}개 {p.mode === 'team' ? '팀' : '반'}</span>
                        <span>·</span>
                        <span>{p.studentCount}명</span>
                        <span>·</span>
                        <span className={`font-semibold ${p.balanceScore >= 80 ? 'text-emerald-600' : p.balanceScore >= 60 ? 'text-amber-600' : 'text-red-600'}`}>
                          균형 {p.balanceScore}
                        </span>
                        <span>·</span>
                        <span>{new Date(p.createdAt).toLocaleDateString('ko-KR')} {new Date(p.createdAt).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })}</span>
                      </div>
                    </div>
                    <button
                      onClick={() => {
                        if (confirm(`"${p.name}" 프리셋을 불러오시겠습니까? 현재 배정이 대체됩니다.`)) {
                          loadPreset(p.id);
                        }
                      }}
                      className="shrink-0 rounded-lg bg-blue-50 px-3 py-1.5 text-xs font-semibold text-blue-700 transition hover:bg-blue-100"
                    >
                      불러오기
                    </button>
                    <button
                      onClick={() => {
                        if (confirm(`"${p.name}" 프리셋을 삭제하시겠습니까?`)) deletePreset(p.id);
                      }}
                      className="shrink-0 rounded p-1.5 text-slate-400 transition hover:bg-red-50 hover:text-red-500"
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <div className="py-6 text-center text-xs text-slate-400">
                저장된 프리셋이 없습니다. 배정 후 현재 상태를 저장해보세요.
              </div>
            )}
          </div>
        )}

        {/* 균형 점수 상세 */}
        {showBalanceDetail && teams.length > 0 && (
          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="mb-4 flex items-start justify-between">
              <div>
                <h4 className="text-sm font-bold text-slate-900">균형 점수란?</h4>
                <p className="mt-1 text-xs text-slate-500 max-w-xl leading-relaxed">
                  AI가 성적, 성별, 성격 유형, 나이, 인원 수 5가지 요소를 종합 분석하여 모든 팀/반이 얼마나 공정하게 구성되었는지를 0~100 점수로 나타낸 지표입니다.
                  점수가 높을수록 팀 간 차이가 적고 균형 잡힌 배정입니다.
                </p>
              </div>
              <div className="flex flex-col items-center">
                <span className={`text-4xl font-extrabold ${balance.overall >= 80 ? 'text-emerald-600' : balance.overall >= 60 ? 'text-amber-600' : 'text-red-600'}`}>
                  {balance.overall}
                </span>
                <span className={`mt-0.5 rounded-full px-2.5 py-0.5 text-[10px] font-bold ${
                  balance.overall >= 80 ? 'bg-emerald-100 text-emerald-700' : balance.overall >= 60 ? 'bg-amber-100 text-amber-700' : 'bg-red-100 text-red-700'
                }`}>
                  {balance.overall >= 90 ? '매우 우수' : balance.overall >= 80 ? '우수' : balance.overall >= 70 ? '양호' : balance.overall >= 60 ? '보통' : '개선 필요'}
                </span>
              </div>
            </div>
            <div className="grid grid-cols-6 gap-3">
              {[
                { label: '성적 균형', value: balance.scoreBalance, desc: '팀 간 평균 성적 차이' },
                { label: '성별 균형', value: balance.genderBalance, desc: '팀 간 남녀 비율 차이' },
                { label: '성격 균형', value: balance.personalityBalance, desc: '업무 성격 유형 분산' },
                { label: '성향 균형', value: balance.traitBalance, desc: '성향 유형 분산 정도' },
                { label: '나이 균형', value: balance.ageBalance, desc: '팀 간 평균 나이 차이' },
                { label: '인원 균형', value: balance.sizeBalance, desc: '팀 간 인원 수 차이' },
              ].map((item) => {
                const color = item.value >= 80 ? 'bg-emerald-500' : item.value >= 60 ? 'bg-amber-500' : 'bg-red-500';
                return (
                  <div key={item.label}>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-semibold text-slate-700">{item.label}</span>
                      <span className={`text-xs font-bold ${item.value >= 80 ? 'text-emerald-600' : item.value >= 60 ? 'text-amber-600' : 'text-red-600'}`}>{item.value}</span>
                    </div>
                    <div className="h-2.5 w-full overflow-hidden rounded-full bg-slate-100">
                      <div className={`h-full rounded-full transition-all duration-700 ${color}`} style={{ width: `${item.value}%` }} />
                    </div>
                    <p className="mt-1 text-[10px] text-slate-400">{item.desc}</p>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* AI 도우미 */}
        <div className="rounded-2xl border-2 border-blue-200 bg-white shadow-md overflow-hidden">
          {/* 헤더 */}
          <div className="flex items-center gap-3 bg-gradient-to-r from-blue-50 via-indigo-50 to-violet-50 border-b border-blue-100 px-5 py-3.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 shadow-md shadow-blue-200">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>
            </div>
            <div className="flex-1">
              <h4 className="text-[15px] font-bold text-slate-900 tracking-tight">AI 도우미</h4>
              <p className="text-[11px] text-slate-500">자연어로 배정을 조정해보세요</p>
            </div>
            {isOptimizing && (
              <div className="flex items-center gap-2">
                <div className="h-3 w-3 animate-spin rounded-full border-2 border-blue-200 border-t-blue-600" />
                <span className="text-[11px] text-blue-600">분석 중...</span>
              </div>
            )}
          </div>

          <div className="p-4 space-y-3">
            {/* 입력 */}
            <div className="flex gap-2">
              <input
                value={optimizerInput}
                onChange={(e) => setOptimizerInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleReOptimize()}
                placeholder="예: 성적 균형 맞춰줘, 리더형 분배해줘..."
                disabled={isOptimizing}
                className="flex-1 rounded-xl border-2 border-slate-200 bg-slate-50 px-4 py-3 text-sm font-medium outline-none placeholder:text-slate-400 placeholder:font-normal focus:border-blue-400 focus:bg-white focus:ring-4 focus:ring-blue-50 disabled:opacity-50 transition"
              />
              <button
                onClick={handleReOptimize}
                disabled={isOptimizing || !optimizerInput.trim()}
                className="flex items-center gap-2 rounded-xl bg-blue-600 px-6 py-3 text-sm font-bold text-white shadow-md shadow-blue-200 transition hover:bg-blue-700 active:scale-[0.97] disabled:opacity-40 shrink-0"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>
                실행
              </button>
            </div>

            {/* 추천 */}
            <div className="flex flex-wrap gap-1.5">
              {['성적 균형 맞춰줘', '성격 유형 골고루', '성향 균형 맞춰줘', '리더형 각 팀 1명씩', '김민준이랑 이서연 분리해줘', '8팀부터 10팀 삭제해줘'].map((cmd) => (
                <button
                  key={cmd}
                  onClick={() => setOptimizerInput(cmd)}
                  className="rounded-lg border border-slate-150 bg-slate-50 px-2.5 py-1.5 text-[11px] font-medium text-slate-600 transition hover:bg-slate-100 hover:text-slate-900"
                >
                  {cmd}
                </button>
              ))}
            </div>

            {/* 확인 모달 */}
            {pendingResult && (
              <div className="rounded-xl border border-blue-200 bg-blue-50/50 p-4">
                <p className="text-sm font-semibold text-slate-800 mb-3">이렇게 변경할까요?</p>
                <div className="grid grid-cols-2 gap-3 mb-3">
                  <div className="rounded-xl bg-white p-3 border border-slate-100">
                    <p className="text-[10px] font-semibold text-slate-400 mb-1">BEFORE</p>
                    <div className="flex items-baseline gap-1.5">
                      <span className={`text-xl font-bold ${pendingResult.before.overall >= 80 ? 'text-emerald-600' : pendingResult.before.overall >= 60 ? 'text-amber-600' : 'text-red-500'}`}>{pendingResult.before.overall}</span>
                      <span className="text-[10px] text-slate-400">/ 100</span>
                    </div>
                    <div className="mt-1.5 text-[10px] text-slate-500 leading-relaxed">
                      성적 {pendingResult.before.scoreBalance} · 성격 {pendingResult.before.personalityBalance} · 성향 {pendingResult.before.traitBalance}
                    </div>
                  </div>
                  <div className="rounded-xl bg-white p-3 border-2 border-blue-300">
                    <p className="text-[10px] font-semibold text-blue-500 mb-1">AFTER</p>
                    <div className="flex items-baseline gap-1.5">
                      <span className={`text-xl font-bold ${pendingResult.after.overall >= 80 ? 'text-emerald-600' : pendingResult.after.overall >= 60 ? 'text-amber-600' : 'text-red-500'}`}>{pendingResult.after.overall}</span>
                      {pendingResult.after.overall !== pendingResult.before.overall && (
                        <span className={`text-xs font-bold ${pendingResult.after.overall > pendingResult.before.overall ? 'text-emerald-600' : 'text-red-500'}`}>
                          {pendingResult.after.overall > pendingResult.before.overall ? '+' : ''}{(pendingResult.after.overall - pendingResult.before.overall).toFixed(1)}
                        </span>
                      )}
                    </div>
                    <div className="mt-1.5 text-[10px] text-slate-500 leading-relaxed">
                      성적 {pendingResult.after.scoreBalance} · 성격 {pendingResult.after.personalityBalance} · 성향 {pendingResult.after.traitBalance}
                    </div>
                  </div>
                </div>
                {pendingResult.changes.length > 0 && (
                  <div className="mb-3 max-h-16 overflow-y-auto rounded-lg bg-white p-2.5 text-[11px] text-slate-600 space-y-0.5 border border-slate-100">
                    {pendingResult.changes.map((c, i) => <p key={i}>{c}</p>)}
                  </div>
                )}
                <div className="flex justify-end gap-2">
                  <button onClick={cancelPendingResult} className="rounded-lg px-4 py-2 text-sm font-medium text-slate-500 transition hover:bg-slate-100">취소</button>
                  <button onClick={applyPendingResult} className="rounded-lg bg-blue-600 px-5 py-2 text-sm font-medium text-white transition hover:bg-blue-700">적용</button>
                </div>
              </div>
            )}

            {/* 로그 */}
            {optimizerLog.length > 0 && !pendingResult && (
              <div className="max-h-24 overflow-y-auto rounded-xl bg-slate-50 p-3 text-[11px] text-slate-600 space-y-0.5">
                {optimizerLog.map((log, i) => (
                  <p key={i} className={
                    log.startsWith('>') ? 'font-semibold text-slate-800' :
                    log.startsWith('AI:') ? 'text-blue-600' :
                    log.startsWith('균형') ? 'font-semibold text-emerald-600' :
                    log === '---' ? 'border-t border-slate-200 pt-1 mt-1' : ''
                  }>{log}</p>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Main Content: Unassigned + Teams */}
        <div className="flex flex-1 gap-5 overflow-hidden">
          {/* Unassigned Panel */}
          <UnassignedPanel students={unassigned} studentIds={unassignedIds} label={label} onDeleteStudent={deleteStudent} />

          {/* Teams Grid */}
          <div className="flex-1 overflow-y-auto">
            {teams.length > 0 ? (
              <div className="space-y-4">
                <div className="grid grid-cols-1 gap-4 xl:grid-cols-2 2xl:grid-cols-3">
                  {teams.map((team) => (
                    <TeamCard
                      key={team.id}
                      team={team}
                      students={students.filter((s) => team.memberIds.includes(s.id))}
                      allStudents={students}
                      onUpdateTeam={updateTeam}
                      onDeleteTeam={deleteTeam}
                      onDeleteStudent={deleteStudent}
                    />
                  ))}
                </div>
                {/* 하단 팀 추가 */}
                <button
                  onClick={handleAddTeam}
                  className="flex w-full items-center justify-center gap-2 rounded-xl border-2 border-dashed border-slate-300 bg-white py-4 text-sm font-semibold text-slate-500 transition hover:border-blue-400 hover:bg-blue-50/30 hover:text-blue-600"
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
                  {label} 추가
                </button>
              </div>
            ) : (
              <div className="flex h-full items-center justify-center rounded-xl border-2 border-dashed border-slate-200 bg-white">
                <div className="text-center">
                  <svg className="mx-auto mb-3 text-slate-300" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><rect x="2" y="7" width="20" height="14" rx="2" ry="2"/><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/></svg>
                  <p className="text-sm font-semibold text-slate-500">{label}을 생성해주세요</p>
                  <p className="mt-1 text-xs text-slate-400">상단의 빠른 생성 버튼 또는 {label} 추가를 사용하세요</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Drag Overlay */}
      <DragOverlay>
        {activeStudent ? <StudentCard student={activeStudent} isDragOverlay /> : null}
      </DragOverlay>
    </DndContext>
  );
}

function UnassignedPanel({ students, studentIds, label, onDeleteStudent }: { students: Student[]; studentIds: string[]; label: string; onDeleteStudent: (id: string) => void }) {
  const { setNodeRef, isOver } = useDroppable({ id: 'unassigned', data: { type: 'unassigned' } });

  return (
    <div
      ref={setNodeRef}
      className={`flex w-72 shrink-0 flex-col rounded-xl border-2 bg-white shadow-sm transition-all ${
        isOver ? 'border-blue-400 bg-blue-50/30' : 'border-slate-200'
      }`}
    >
      <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
        <div className="flex items-center gap-2">
          <h4 className="text-sm font-bold text-slate-900">미배정 학생</h4>
          <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-slate-600">{students.length}</span>
        </div>
      </div>
      <div className="flex-1 space-y-2 overflow-y-auto p-3">
        <SortableContext items={studentIds} strategy={verticalListSortingStrategy}>
          {students.map((s) => (
            <StudentCard key={s.id} student={s} onDelete={() => onDeleteStudent(s.id)} />
          ))}
        </SortableContext>
        {students.length === 0 && (
          <div className="flex h-20 items-center justify-center text-xs text-slate-400">
            모든 학생이 {label}에 배정되었습니다
          </div>
        )}
      </div>
    </div>
  );
}
