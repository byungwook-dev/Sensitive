'use client';

import { useState } from 'react';
import { useStore } from '@/store/useStore';
import { Student, PersonalityType, TraitType, Gender, WORK_PERSONALITIES, TRAIT_TYPES } from '@/types';

const ALL_PERSONALITIES = WORK_PERSONALITIES;
const ALL_TRAITS = TRAIT_TYPES;
const PERSONALITY_COLORS: Record<string, string> = {
  '리더형': 'bg-red-50 text-red-700 ring-red-200',
  '협동형': 'bg-blue-50 text-blue-700 ring-blue-200',
  '분석형': 'bg-purple-50 text-purple-700 ring-purple-200',
  '신중형': 'bg-amber-50 text-amber-700 ring-amber-200',
  '적극형': 'bg-emerald-50 text-emerald-700 ring-emerald-200',
  '창의형': 'bg-pink-50 text-pink-700 ring-pink-200',
};

function getMissing(s: Student): string[] {
  const m: string[] = [];
  if (!s.gender) m.push('성별');
  if (!s.age) m.push('나이');
  if (!s.personality) m.push('성격');
  if (!s.trait) m.push('성향');
  if (s.score === undefined || s.score === null) m.push('성적');
  return m;
}

export default function StudentsPage() {
  const { students, addStudent, updateStudent, deleteStudent, teams, studentGroups, activeGroupId, addStudentGroup, deleteStudentGroup, setActiveGroup, setStudents, setTeams, scoreSystem, renameStudentGroup } = useStore();
  const [search, setSearch] = useState('');
  const [genderFilter, setGenderFilter] = useState<string>('all');
  const [personalityFilter, setPersonalityFilter] = useState<string>('all');
  const [teamFilter, setTeamFilter] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'name' | 'score' | 'age'>('name');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');
  const [showIncompleteOnly, setShowIncompleteOnly] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showNoteHelp, setShowNoteHelp] = useState(false);
  const [showScoreHelp, setShowScoreHelp] = useState(false);
  const [editingGroupId, setEditingGroupId] = useState<string | null>(null);
  const [editingGroupName, setEditingGroupName] = useState('');
  const [newGroupName, setNewGroupName] = useState('');

  // 학생이 속한 팀 찾기
  const studentTeamMap = new Map<string, string>();
  teams.forEach(t => t.memberIds.forEach(id => studentTeamMap.set(id, t.name)));

  let filtered = students.filter((s) => {
    if (search && !s.name.includes(search)) return false;
    if (genderFilter !== 'all' && s.gender !== genderFilter) return false;
    if (personalityFilter !== 'all' && s.personality !== personalityFilter) return false;
    if (teamFilter === 'unassigned' && studentTeamMap.has(s.id)) return false;
    if (teamFilter !== 'all' && teamFilter !== 'unassigned' && studentTeamMap.get(s.id) !== teamFilter) return false;
    if (showIncompleteOnly && getMissing(s).length === 0) return false;
    return true;
  });

  filtered = [...filtered].sort((a, b) => {
    const dir = sortDir === 'asc' ? 1 : -1;
    if (sortBy === 'name') return a.name.localeCompare(b.name) * dir;
    if (sortBy === 'score') return (a.score - b.score) * dir;
    return (a.age - b.age) * dir;
  });

  const handleSort = (col: 'name' | 'score' | 'age') => {
    if (sortBy === col) setSortDir(sortDir === 'asc' ? 'desc' : 'asc');
    else { setSortBy(col); setSortDir('asc'); }
  };

  const incompleteCount = students.filter(s => getMissing(s).length > 0).length;

  return (
    <div className="space-y-5">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
          <input
            type="text"
            placeholder="이름 검색..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-lg border border-slate-200 bg-white py-2.5 pl-10 pr-4 text-sm outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
          />
        </div>
        <select value={genderFilter} onChange={(e) => setGenderFilter(e.target.value)} className="rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100">
          <option value="all">성별 전체</option>
          <option value="남">남</option>
          <option value="여">여</option>
        </select>
        <select value={personalityFilter} onChange={(e) => setPersonalityFilter(e.target.value)} className="rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100">
          <option value="all">성격 전체</option>
          {ALL_PERSONALITIES.map((p) => <option key={p} value={p}>{p}</option>)}
        </select>
        <select value={teamFilter} onChange={(e) => setTeamFilter(e.target.value)} className="rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100">
          <option value="all">팀/반 전체</option>
          <option value="unassigned">미배정</option>
          {teams.map(t => <option key={t.id} value={t.name}>{t.name}</option>)}
        </select>
        <div className="ml-auto flex items-center gap-2">
          <button
            onClick={() => setShowAddModal(true)}
            className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700 active:scale-[0.98]"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
            학생 추가
          </button>
        </div>
      </div>

      {/* 학생 그룹 */}
      <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#6366f1" strokeWidth="2"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/></svg>
            <h4 className="text-sm font-bold text-slate-900">학생 그룹</h4>
            <span className="text-[10px] text-slate-400">더블클릭으로 이름 변경</span>
          </div>
          <div className="flex items-center gap-1.5">
            <input
              value={newGroupName}
              onChange={(e) => setNewGroupName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  const name = newGroupName.trim() || `그룹 ${studentGroups.length + 1}`;
                  addStudentGroup({ id: `group-${Date.now()}`, name, students: [...students], teams: [...teams], createdAt: new Date().toISOString() });
                  setNewGroupName('');
                }
              }}
              placeholder="그룹 이름..."
              className="w-28 rounded-lg border border-slate-200 px-2.5 py-1.5 text-[11px] outline-none focus:border-blue-400"
            />
            <button
              onClick={() => {
                const name = newGroupName.trim() || `그룹 ${studentGroups.length + 1}`;
                addStudentGroup({ id: `group-${Date.now()}`, name, students: [...students], teams: [...teams], createdAt: new Date().toISOString() });
                setNewGroupName('');
              }}
              className="rounded-lg bg-slate-800 px-3 py-1.5 text-[11px] font-semibold text-white hover:bg-slate-700 transition whitespace-nowrap"
            >
              현재 저장
            </button>
            <button
              onClick={() => {
                const name = newGroupName.trim() || `새 그룹 ${studentGroups.length + 1}`;
                const newId = `group-${Date.now()}`;
                addStudentGroup({ id: newId, name, students: [], teams: [], createdAt: new Date().toISOString() });
                setActiveGroup(newId);
                setNewGroupName('');
              }}
              className="rounded-lg border border-blue-200 bg-blue-50 px-3 py-1.5 text-[11px] font-semibold text-blue-700 hover:bg-blue-100 transition whitespace-nowrap"
            >
              + 새 그룹
            </button>
          </div>
        </div>
        <div className="grid grid-cols-[repeat(auto-fill,minmax(160px,1fr))] gap-2">
          {/* 현재 그룹 */}
          <div
            onClick={() => setActiveGroup(null)}
            className={`flex items-center justify-between rounded-lg px-3 py-2.5 cursor-pointer transition ${!activeGroupId ? 'bg-blue-600 text-white shadow-sm' : 'bg-slate-50 text-slate-700 hover:bg-slate-100 border border-slate-200'}`}
          >
            <div>
              <p className={`text-xs font-bold ${!activeGroupId ? 'text-white' : 'text-slate-800'}`}>현재</p>
              <p className={`text-[10px] ${!activeGroupId ? 'text-blue-100' : 'text-slate-400'}`}>{students.length}명 · {teams.length}팀</p>
            </div>
            {!activeGroupId && <span className="text-[9px] bg-white/20 rounded px-1.5 py-0.5 font-medium">활성</span>}
          </div>
          {/* 저장된 그룹 */}
          {studentGroups.map(g => (
            <div
              key={g.id}
              onClick={() => {
                if (editingGroupId === g.id) return;
                if (confirm(`"${g.name}" (${g.students.length}명)을 불러올까요?`)) setActiveGroup(g.id);
              }}
              onDoubleClick={(e) => {
                e.stopPropagation();
                setEditingGroupId(g.id);
                setEditingGroupName(g.name);
              }}
              className={`group flex items-center justify-between rounded-lg px-3 py-2.5 cursor-pointer transition relative ${activeGroupId === g.id ? 'bg-blue-600 text-white shadow-sm' : 'bg-slate-50 text-slate-700 hover:bg-slate-100 border border-slate-200'}`}
            >
              <div className="min-w-0 flex-1">
                {editingGroupId === g.id ? (
                  <input
                    autoFocus
                    value={editingGroupName}
                    onChange={(e) => setEditingGroupName(e.target.value)}
                    onBlur={() => {
                      if (editingGroupName.trim()) renameStudentGroup(g.id, editingGroupName.trim());
                      setEditingGroupId(null);
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        if (editingGroupName.trim()) renameStudentGroup(g.id, editingGroupName.trim());
                        setEditingGroupId(null);
                      }
                      if (e.key === 'Escape') setEditingGroupId(null);
                    }}
                    onClick={(e) => e.stopPropagation()}
                    className="w-full bg-white text-slate-800 text-xs font-bold rounded px-1.5 py-0.5 outline-none border border-blue-400 ring-2 ring-blue-100"
                  />
                ) : (
                  <>
                    <p className={`text-xs font-bold truncate ${activeGroupId === g.id ? 'text-white' : 'text-slate-800'}`}>{g.name}</p>
                    <p className={`text-[10px] ${activeGroupId === g.id ? 'text-blue-100' : 'text-slate-400'}`}>
                      {g.students.length}명 · {g.teams.length}팀 · {new Date(g.createdAt).toLocaleDateString('ko-KR', { month: 'short', day: 'numeric' })}
                    </p>
                  </>
                )}
              </div>
              {activeGroupId === g.id && <span className="text-[9px] bg-white/20 rounded px-1.5 py-0.5 font-medium shrink-0 ml-1">활성</span>}
              {/* 삭제 버튼 */}
              <button
                onClick={(e) => { e.stopPropagation(); if (confirm(`"${g.name}" 삭제?`)) deleteStudentGroup(g.id); }}
                className={`absolute -top-1.5 -right-1.5 h-5 w-5 rounded-full flex items-center justify-center text-white opacity-0 group-hover:opacity-100 transition ${activeGroupId === g.id ? 'bg-blue-800' : 'bg-red-500'}`}
              >
                <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* 누락 알림 */}
      {incompleteCount > 0 && (
        <div className="flex items-center gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-amber-100">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#d97706" strokeWidth="2.5"><path d="M12 9v4m0 4h.01M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0z"/></svg>
          </div>
          <div>
            <p className="text-sm font-semibold text-amber-800">
              {incompleteCount}명의 학생 데이터가 불완전합니다
            </p>
            <p className="text-xs text-amber-600">
              누락된 항목을 채워야 AI 자동 배정 시 정확한 균형을 맞출 수 있습니다.
            </p>
            <button
              onClick={() => setShowIncompleteOnly(!showIncompleteOnly)}
              className={`mt-1 rounded-md px-2.5 py-1 text-xs font-semibold transition ${showIncompleteOnly ? 'bg-amber-600 text-white' : 'bg-amber-200 text-amber-800 hover:bg-amber-300'}`}
            >
              {showIncompleteOnly ? '전체 학생 보기' : '누락 학생만 보기'}
            </button>
          </div>
        </div>
      )}

      {/* Count */}
      <div className="text-xs text-slate-500">
        총 <span className="font-bold text-slate-700">{filtered.length}</span>명 표시 중
      </div>

      {/* Table */}
      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-100 bg-slate-50/80">
              <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 cursor-pointer select-none" onClick={() => handleSort('name')}>
                이름 {sortBy === 'name' && (sortDir === 'asc' ? '↑' : '↓')}
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500">성별</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 cursor-pointer select-none" onClick={() => handleSort('age')}>
                나이 {sortBy === 'age' && (sortDir === 'asc' ? '↑' : '↓')}
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500">업무 성격</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500">성향</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500">
                <div className="flex items-center gap-1.5 relative">
                  <span className="cursor-pointer select-none" onClick={() => handleSort('score')}>
                    성적 {sortBy === 'score' && (sortDir === 'asc' ? '↑' : '↓')}
                  </span>
                  <button
                    onClick={() => setShowScoreHelp(!showScoreHelp)}
                    className={`flex h-4 w-4 items-center justify-center rounded-full text-[9px] font-bold transition ${showScoreHelp ? 'bg-blue-600 text-white' : 'bg-slate-200 text-slate-500 hover:bg-blue-100 hover:text-blue-600'}`}
                  >
                    ?
                  </button>
                  {showScoreHelp && (
                    <div className="absolute top-6 left-0 z-50 w-72 rounded-xl border border-slate-200 bg-white p-4 shadow-xl text-xs font-normal text-slate-600 leading-relaxed">
                      <p className="font-bold text-slate-800 mb-2 text-[13px]">성적 체계 안내</p>
                      <p className="mb-2 text-slate-500">
                        현재 설정: <span className="font-semibold text-blue-600">
                          {scoreSystem === 'score100' ? '100점 만점' : scoreSystem === 'gpa45' ? '4.5 GPA' : scoreSystem === 'gpa43' ? '4.3 GPA' : scoreSystem === 'grade' ? '등급제 (A~F)' : '직접 입력'}
                        </span>
                      </p>
                      <div className="space-y-1.5">
                        <p><span className="font-semibold text-slate-700">100점 만점</span> → 0~100 (시험, 모의고사)</p>
                        <p><span className="font-semibold text-slate-700">4.5 / 4.3 GPA</span> → 대학 학점</p>
                        <p><span className="font-semibold text-slate-700">등급제</span> → A+, A, B+, ... F</p>
                      </div>
                      <p className="mt-2 text-[10px] text-slate-400">모든 성적은 내부적으로 100점 기준으로 변환되어 균형 계산에 사용됩니다. 설정에서 변경 가능합니다.</p>
                    </div>
                  )}
                </div>
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500">팀/반</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500">
                <div className="flex items-center gap-1.5 relative">
                  특이사항
                  <button
                    onClick={() => setShowNoteHelp(!showNoteHelp)}
                    className={`flex h-4 w-4 items-center justify-center rounded-full text-[9px] font-bold transition ${showNoteHelp ? 'bg-blue-600 text-white' : 'bg-slate-200 text-slate-500 hover:bg-blue-100 hover:text-blue-600'}`}
                  >
                    ?
                  </button>
                  {showNoteHelp && (
                    <div className="absolute top-6 left-0 z-50 w-72 rounded-xl border border-slate-200 bg-white p-4 shadow-xl text-xs font-normal text-slate-600 leading-relaxed">
                      <p className="font-bold text-slate-800 mb-2 text-[13px]">특이사항 활용 가이드</p>
                      <p className="mb-2 text-slate-500">여기에 적은 내용을 AI가 읽고 팀 배정에 반영합니다. 자유롭게 작성하세요.</p>
                      <div className="space-y-1.5">
                        <p><span className="font-semibold text-slate-700">장애/질환</span> → 배려심 있는 학생과 매칭</p>
                        <p><span className="font-semibold text-slate-700">영어 못함</span> → 영어 잘하는 학생과 매칭</p>
                        <p><span className="font-semibold text-slate-700">소심/왕따 경험</span> → 사교적인 학생과 매칭</p>
                        <p><span className="font-semibold text-slate-700">ADHD</span> → 차분한 성격 학생과 매칭</p>
                        <p><span className="font-semibold text-slate-700">유학생</span> → 도와줄 수 있는 학생과 매칭</p>
                        <p><span className="font-semibold text-slate-700">김OO과 분리</span> → 다른 팀으로 배정</p>
                      </div>
                      <p className="mt-2 text-[10px] text-slate-400">어떤 내용이든 AI가 맥락을 이해하고 최선의 배정을 합니다.</p>
                    </div>
                  )}
                </div>
              </th>
              <th className="px-4 py-3 text-right text-xs font-semibold text-slate-500">작업</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((s) => (
              <StudentRow
                key={s.id}
                student={s}
                teamName={studentTeamMap.get(s.id)}
                onSave={(data) => { updateStudent(s.id, data); }}
                onDelete={() => { if (confirm(`${s.name} 학생을 삭제하시겠습니까?`)) deleteStudent(s.id); }}
              />
            ))}
          </tbody>
        </table>
        {filtered.length === 0 && (
          <div className="py-12 text-center text-sm text-slate-400">검색 결과가 없습니다</div>
        )}
      </div>

      {/* Add Modal */}
      {showAddModal && (
        <AddStudentModal
          onClose={() => setShowAddModal(false)}
          onAdd={(s) => { addStudent(s); setShowAddModal(false); }}
        />
      )}
    </div>
  );
}

function StudentRow({
  student, teamName, onSave, onDelete,
}: {
  student: Student; teamName?: string;
  onSave: (data: Partial<Student>) => void; onDelete: () => void;
}) {
  const [editField, setEditField] = useState<string | null>(null);

  const missing = getMissing(student);
  const isMissing = (field: string) => missing.includes(field);

  function InlineCell({ field, children, missingLabel }: { field: string; children: React.ReactNode; missingLabel?: string }) {
    return (
      <td
        className={`px-4 h-[52px] cursor-pointer transition ${isMissing(missingLabel || field) ? 'bg-amber-50/50' : ''} hover:bg-blue-50/50`}
        onDoubleClick={() => setEditField(field)}
        title="더블클릭하여 수정"
      >
        <div className="flex items-center h-full">{children}</div>
      </td>
    );
  }

  return (
    <tr className={`border-b border-slate-50 transition ${missing.length > 0 ? 'bg-amber-50/20' : 'hover:bg-slate-50/80'}`}>
      {/* 이름 */}
      <td className="px-4 h-[52px]" onDoubleClick={() => setEditField('name')}>
        {editField === 'name' ? (
          <input autoFocus className="w-full rounded border border-blue-400 px-2 py-1.5 text-sm font-medium h-[28px]" defaultValue={student.name}
            onBlur={(e) => { onSave({ name: e.target.value }); setEditField(null); }}
            onKeyDown={(e) => { if (e.key === 'Enter') { onSave({ name: (e.target as HTMLInputElement).value }); setEditField(null); } if (e.key === 'Escape') setEditField(null); }}
          />
        ) : (
          <div className="flex items-center gap-2">
            <span className="font-medium text-slate-900 cursor-pointer hover:text-blue-600">{student.name}</span>
            {missing.length > 0 && (
              <span className="rounded bg-amber-100 px-1.5 py-0.5 text-[10px] font-semibold text-amber-700" title={`누락: ${missing.join(', ')}`}>
                {missing.length}개 누락
              </span>
            )}
          </div>
        )}
      </td>

      {/* 성별 */}
      <InlineCell field="gender" missingLabel="성별">
        {editField === 'gender' ? (
          <select autoFocus className="rounded border border-blue-400 px-2 py-0.5 text-sm h-[28px]" defaultValue={student.gender || ''}
            onChange={(e) => { onSave({ gender: e.target.value as Gender }); setEditField(null); }}
            onBlur={() => setEditField(null)}
          >
            <option value="">선택</option><option value="남">남</option><option value="여">여</option>
          </select>
        ) : student.gender ? (
          <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold ${student.gender === '남' ? 'bg-sky-50 text-sky-700' : 'bg-rose-50 text-rose-700'}`}>
            {student.gender}
          </span>
        ) : <span className="text-xs text-slate-300">-</span>}
      </InlineCell>

      {/* 나이 */}
      <InlineCell field="age" missingLabel="나이">
        {editField === 'age' ? (
          <input autoFocus type="number" className="w-16 rounded border border-blue-400 px-2 py-0.5 text-sm h-[28px]" defaultValue={student.age || ''}
            onBlur={(e) => { onSave({ age: parseInt(e.target.value) || undefined }); setEditField(null); }}
            onKeyDown={(e) => { if (e.key === 'Enter') { onSave({ age: parseInt((e.target as HTMLInputElement).value) || undefined }); setEditField(null); } if (e.key === 'Escape') setEditField(null); }}
          />
        ) : student.age ? (
          <span className="text-slate-600">{student.age}세</span>
        ) : <span className="text-xs text-slate-300">-</span>}
      </InlineCell>

      {/* 업무 성격 */}
      <InlineCell field="personality" missingLabel="성격">
        {editField === 'personality' ? (
          <select autoFocus className="rounded border border-blue-400 px-2 py-0.5 text-sm h-[28px]" defaultValue={student.personality || ''}
            onChange={(e) => { onSave({ personality: e.target.value as PersonalityType }); setEditField(null); }}
            onBlur={() => setEditField(null)}
          >
            <option value="">선택</option>
            {ALL_PERSONALITIES.map(p => <option key={p} value={p}>{p}</option>)}
          </select>
        ) : student.personality ? (
          <span className={`inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium ring-1 ring-inset ${PERSONALITY_COLORS[student.personality]}`}>
            {student.personality}
          </span>
        ) : <span className="text-xs text-slate-300">-</span>}
      </InlineCell>

      {/* 성향 */}
      <InlineCell field="trait" missingLabel="성향">
        {editField === 'trait' ? (
          <select autoFocus className="rounded border border-blue-400 px-2 py-0.5 text-sm h-[28px]" defaultValue={student.trait || ''}
            onChange={(e) => { onSave({ trait: (e.target.value || undefined) as TraitType | undefined }); setEditField(null); }}
            onBlur={() => setEditField(null)}
          >
            <option value="">선택</option>
            {ALL_TRAITS.map(t => <option key={t} value={t}>{t}</option>)}
          </select>
        ) : student.trait ? (
          <span className="inline-flex items-center rounded-md bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600">
            {student.trait}
          </span>
        ) : <span className="text-xs text-slate-300">-</span>}
      </InlineCell>

      {/* 성적 */}
      <InlineCell field="score" missingLabel="성적">
        {editField === 'score' ? (
          <input autoFocus type="number" className="w-16 rounded border border-blue-400 px-2 py-0.5 text-sm h-[28px]" defaultValue={student.score ?? ''}
            onBlur={(e) => { onSave({ score: parseInt(e.target.value) }); setEditField(null); }}
            onKeyDown={(e) => { if (e.key === 'Enter') { onSave({ score: parseInt((e.target as HTMLInputElement).value) }); setEditField(null); } if (e.key === 'Escape') setEditField(null); }}
          />
        ) : student.score !== undefined ? (
          <div className="flex items-center gap-2">
            <div className="h-1.5 w-16 overflow-hidden rounded-full bg-slate-100">
              <div className="h-full rounded-full bg-blue-500" style={{ width: `${student.score}%` }} />
            </div>
            <span className="text-xs font-semibold text-slate-700">{student.score}</span>
          </div>
        ) : <span className="text-xs text-slate-300">-</span>}
      </InlineCell>

      {/* 팀/반 */}
      <td className="px-4 h-[52px]">
        <div className="flex items-center h-full">
          {teamName ? (
            <span className="rounded-md bg-blue-50 px-2 py-0.5 text-[11px] font-semibold text-blue-700">{teamName}</span>
          ) : (
            <span className="text-[11px] text-slate-300">미배정</span>
          )}
        </div>
      </td>

      {/* 특이사항 */}
      <InlineCell field="note">
        {editField === 'note' ? (
          <input autoFocus className="w-full rounded border border-blue-400 px-2 py-0.5 text-sm h-[28px]" defaultValue={student.note || ''} placeholder="특이사항..."
            onBlur={(e) => { onSave({ note: e.target.value || undefined }); setEditField(null); }}
            onKeyDown={(e) => { if (e.key === 'Enter') { onSave({ note: (e.target as HTMLInputElement).value || undefined }); setEditField(null); } if (e.key === 'Escape') setEditField(null); }}
          />
        ) : student.note ? (
          <span className="inline-flex items-center gap-1 rounded-md bg-amber-50 px-2 py-0.5 text-xs text-amber-700" title={student.note}>
            <span className="truncate max-w-[120px]">{student.note}</span>
          </span>
        ) : <span className="text-xs text-slate-300">-</span>}
      </InlineCell>

      {/* 작업 */}
      <td className="px-4 py-3 text-right">
        <button onClick={onDelete} className="text-slate-400 transition hover:text-red-600" title="삭제">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
        </button>
      </td>
    </tr>
  );
}

function AddStudentModal({ onClose, onAdd }: { onClose: () => void; onAdd: (s: Student) => void }) {
  const [form, setForm] = useState({
    name: '', gender: '남' as Gender, age: 15, personality: '협동형' as PersonalityType, trait: '사교적' as string, score: 70, note: '',
  });

  const handleSubmit = () => {
    if (!form.name.trim()) return alert('이름을 입력해주세요.');
    onAdd({
      id: `student-${Date.now()}`,
      ...form,
      trait: (form.trait || undefined) as TraitType | undefined,
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm" onClick={onClose}>
      <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <h3 className="mb-5 text-lg font-bold text-slate-900">학생 추가</h3>
        <div className="space-y-4">
          <div>
            <label className="mb-1 block text-xs font-semibold text-slate-600">이름</label>
            <input className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-600">성별</label>
              <select className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100" value={form.gender} onChange={(e) => setForm({ ...form, gender: e.target.value as Gender })}>
                <option value="남">남</option><option value="여">여</option>
              </select>
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-600">나이</label>
              <input type="number" className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100" value={form.age} onChange={(e) => setForm({ ...form, age: parseInt(e.target.value) })} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-600">업무 성격</label>
              <select className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100" value={form.personality} onChange={(e) => setForm({ ...form, personality: e.target.value as PersonalityType })}>
                {ALL_PERSONALITIES.map((p) => <option key={p} value={p}>{p}</option>)}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-600">성향</label>
              <select className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100" value={form.trait} onChange={(e) => setForm({ ...form, trait: e.target.value })}>
                <option value="">선택 안함</option>
                {ALL_TRAITS.map((t) => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-600">성적</label>
              <input type="number" className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100" value={form.score} onChange={(e) => setForm({ ...form, score: parseInt(e.target.value) })} min={0} max={100} />
            </div>
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold text-slate-600">특이사항 (선택)</label>
            <textarea className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100 resize-none" rows={2} placeholder="알레르기, 친구 관계, 주의사항 등..." value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })} />
          </div>
        </div>
        <div className="mt-6 flex justify-end gap-3">
          <button onClick={onClose} className="rounded-lg px-4 py-2.5 text-sm font-semibold text-slate-600 transition hover:bg-slate-100">취소</button>
          <button onClick={handleSubmit} className="rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700">추가</button>
        </div>
      </div>
    </div>
  );
}
