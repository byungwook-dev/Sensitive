'use client';

import { useState } from 'react';
import { useStore } from '@/store/useStore';
import { ScoreSystem, SCORE_SYSTEM_LABELS, SCORE_SYSTEM_DESC } from '@/types';

const SCORE_SYSTEMS: ScoreSystem[] = ['score100', 'gpa45', 'gpa43', 'grade', 'custom'];

export default function SettingsPage() {
  const { scoreSystem, setScoreSystem, customMax, setCustomMax } = useStore();

  return (
    <div className="max-w-2xl space-y-6">
      {/* 성적 체계 설정 */}
      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="mb-1 flex items-center gap-2">
          <h3 className="text-sm font-bold text-slate-900">성적 체계</h3>
          <span className="rounded-full bg-blue-50 px-2 py-0.5 text-[10px] font-semibold text-blue-600">중요</span>
        </div>
        <p className="mb-5 text-xs text-slate-500">
          기관의 성적 체계를 선택하면, 업로드/배정 시 자동으로 내부 점수(0~100)로 변환하여 균형 배정에 사용합니다.
        </p>

        <div className="grid grid-cols-1 gap-2.5">
          {SCORE_SYSTEMS.map((sys) => (
            <label
              key={sys}
              className={`flex cursor-pointer items-start gap-3 rounded-xl border-2 p-4 transition ${
                scoreSystem === sys
                  ? 'border-blue-500 bg-blue-50/50 shadow-sm'
                  : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50'
              }`}
            >
              <input
                type="radio"
                name="scoreSystem"
                value={sys}
                checked={scoreSystem === sys}
                onChange={() => setScoreSystem(sys)}
                className="mt-0.5 h-4 w-4 accent-blue-600"
              />
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold text-slate-800">{SCORE_SYSTEM_LABELS[sys]}</span>
                  {scoreSystem === sys && (
                    <span className="rounded bg-blue-600 px-1.5 py-0.5 text-[10px] font-bold text-white">사용 중</span>
                  )}
                </div>
                <p className="mt-0.5 text-xs text-slate-500">{SCORE_SYSTEM_DESC[sys]}</p>
              </div>
            </label>
          ))}
        </div>

        {scoreSystem === 'custom' && (
          <div className="mt-4 ml-7">
            <label className="mb-1 block text-xs font-semibold text-slate-600">만점 설정</label>
            <div className="flex items-center gap-2">
              <input
                type="number"
                value={customMax}
                onChange={(e) => setCustomMax(parseInt(e.target.value) || 100)}
                min={1}
                className="w-28 rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
              />
              <span className="text-xs text-slate-400">점 만점</span>
            </div>
          </div>
        )}

        {/* 변환 예시 미리보기 */}
        <div className="mt-5 rounded-lg bg-slate-50 p-4">
          <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-slate-400">변환 예시</p>
          <div className="flex flex-wrap gap-3">
            {getExamples(scoreSystem, customMax).map((ex, i) => (
              <div key={i} className="flex items-center gap-1.5 text-xs">
                <span className="rounded bg-white px-2 py-1 font-mono font-semibold text-slate-700 shadow-sm">{ex.raw}</span>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="2"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
                <span className="rounded bg-blue-100 px-2 py-1 font-mono font-bold text-blue-700">{ex.normalized}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* 일반 설정 */}
      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <h3 className="mb-4 text-sm font-bold text-slate-900">일반 설정</h3>
        <div className="space-y-4">
          <div>
            <label className="mb-1 block text-xs font-semibold text-slate-600">기관명</label>
            <input defaultValue="TeamBuilder AI 데모" className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100" />
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold text-slate-600">기본 팀/반 최대 인원</label>
            <input type="number" defaultValue={8} className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100" />
          </div>
        </div>
      </div>

      {/* AI 배정 가중치 */}
      <WeightsEditor />

      {/* MongoDB 동기화 */}
      <div className="rounded-xl border border-emerald-200 bg-gradient-to-r from-emerald-50/50 to-teal-50/50 p-6 shadow-sm">
        <div className="flex items-center gap-2 mb-4">
          <h3 className="text-sm font-bold text-slate-900">MongoDB 연동</h3>
          <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-700">데이터베이스</span>
        </div>
        <p className="mb-4 text-xs text-slate-500">현재 데이터를 MongoDB에 저장하거나, DB에서 불러올 수 있습니다.</p>
        <div className="flex gap-3">
          <button
            onClick={async () => {
              const { students, teams } = useStore.getState();
              const res = await fetch('/api/db/sync', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ students, teams }),
              });
              if (res.ok) {
                const result = await res.json();
                alert(`DB에 저장 완료! (학생 ${result.students}명, 팀 ${result.teams}개)`);
              } else {
                alert('DB 저장 실패');
              }
            }}
            className="flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-emerald-700"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
            DB에 저장
          </button>
          <button
            onClick={async () => {
              const res = await fetch('/api/db/sync');
              if (res.ok) {
                const data = await res.json();
                if (data.students.length === 0) {
                  alert('DB에 저장된 데이터가 없습니다.');
                  return;
                }
                if (confirm(`DB에서 전체 데이터를 불러오시겠습니까?\n학생 ${data.students.length}명, 팀 ${data.teams.length}개, 프리셋 ${data.presets?.length || 0}개`)) {
                  const store = useStore.getState();
                  store.setStudents(data.students);
                  store.setTeams(data.teams);
                  if (data.balanceWeights) store.setBalanceWeights(data.balanceWeights);
                  if (data.scoreSystem) store.setScoreSystem(data.scoreSystem);
                  if (data.customMax) store.setCustomMax(data.customMax);
                  if (data.teamAnalyses) store.setTeamAnalyses(data.teamAnalyses);
                  alert('DB에서 전체 데이터 불러오기 완료!');
                }
              } else {
                alert('DB 불러오기 실패');
              }
            }}
            className="flex items-center gap-2 rounded-lg border border-emerald-200 bg-white px-4 py-2.5 text-sm font-semibold text-emerald-700 transition hover:bg-emerald-50"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
            DB에서 불러오기
          </button>
        </div>
      </div>

      {/* 데이터 */}
      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <h3 className="mb-4 text-sm font-bold text-slate-900">데이터</h3>
        <div className="flex gap-3">
          <button className="rounded-lg border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-600 transition hover:bg-slate-50">
            학생 데이터 내보내기 (CSV)
          </button>
          <button
            onClick={() => {
              if (confirm('모든 데이터를 초기화하고 기본 더미 데이터로 되돌리시겠습니까?')) {
                localStorage.removeItem('teambuilder-ai-storage');
                window.location.reload();
              }
            }}
            className="rounded-lg border border-red-200 px-4 py-2.5 text-sm font-semibold text-red-600 transition hover:bg-red-50"
          >
            전체 데이터 초기화
          </button>
        </div>
      </div>
    </div>
  );
}

function getExamples(system: ScoreSystem, customMax: number) {
  switch (system) {
    case 'score100':
      return [
        { raw: '85', normalized: '85' },
        { raw: '62', normalized: '62' },
        { raw: '93', normalized: '93' },
      ];
    case 'gpa45':
      return [
        { raw: '4.2', normalized: '93' },
        { raw: '3.5', normalized: '78' },
        { raw: '2.8', normalized: '62' },
      ];
    case 'gpa43':
      return [
        { raw: '4.0', normalized: '93' },
        { raw: '3.3', normalized: '77' },
        { raw: '2.5', normalized: '58' },
      ];
    case 'grade':
      return [
        { raw: 'A+', normalized: '97' },
        { raw: 'B', normalized: '83' },
        { raw: 'C+', normalized: '77' },
        { raw: '2등급', normalized: '89' },
      ];
    case 'custom':
      return [
        { raw: `${customMax}`, normalized: '100' },
        { raw: `${Math.round(customMax * 0.7)}`, normalized: '70' },
        { raw: `${Math.round(customMax * 0.5)}`, normalized: '50' },
      ];
    default:
      return [];
  }
}

function WeightsEditor() {
  const { balanceWeights, setBalanceWeights } = useStore();
  const [weights, setWeights] = useState(balanceWeights);
  const [saved, setSaved] = useState(false);

  const total = weights.score + weights.personality + weights.trait + weights.gender + weights.age + weights.size;
  const isValid = total === 100;

  const items = [
    { key: 'score' as const, label: '성적 균형', color: 'text-blue-600', desc: '팀 간 평균 성적 차이를 최소화합니다. 높을수록 팀별 성적이 고르게 분배됩니다.' },
    { key: 'personality' as const, label: '성격 유형 균형', color: 'text-purple-600', desc: '외향/내향/분석/감성 등 성격 유형이 팀마다 골고루 섞이도록 합니다.' },
    { key: 'trait' as const, label: '성향 균형', color: 'text-pink-600', desc: '리더형/실행형/사교적/창의적 등 성향이 팀마다 균등하게 분포되도록 합니다.' },
    { key: 'gender' as const, label: '성별 균형', color: 'text-cyan-600', desc: '남녀 비율이 팀마다 비슷하도록 조정합니다.' },
    { key: 'age' as const, label: '나이 균형', color: 'text-amber-600', desc: '팀 간 평균 나이 차이를 최소화합니다.' },
    { key: 'size' as const, label: '인원 수 균형', color: 'text-slate-600', desc: '팀별 인원 수가 균등하도록 합니다.' },
  ];

  const handleSave = () => {
    if (!isValid) return;
    setBalanceWeights(weights);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const handleReset = () => {
    const defaults = { score: 30, personality: 26, trait: 26, gender: 10, age: 4, size: 4 };
    setWeights(defaults);
    setBalanceWeights(defaults);
  };

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="flex items-center justify-between mb-1">
        <h3 className="text-sm font-bold text-slate-900">AI 배정 가중치</h3>
        <div className={`rounded-full px-2.5 py-0.5 text-[11px] font-bold ${isValid ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>
          합계 {total}%{isValid ? ' ✓' : ' (100%로 맞춰주세요)'}
        </div>
      </div>
      <p className="mb-2 text-xs text-slate-500">균형 점수를 계산할 때 각 요소의 비중을 설정합니다. 합이 100%가 되어야 합니다.</p>
      <p className="mb-5 text-xs text-slate-400">※ 로그 기반 곱연산 방식: 한 항목이라도 점수가 낮으면 전체 균형 점수가 크게 떨어집니다. 가중치가 높은 항목일수록 균형 점수에 더 큰 영향을 미칩니다.</p>

      <div className="space-y-4">
        {items.map(({ key, label, color, desc }) => (
          <div key={key}>
            <div className="flex items-center justify-between mb-0.5">
              <span className="text-sm font-semibold text-slate-700">{label}</span>
              <span className={`text-sm font-bold tabular-nums ${color}`}>{weights[key]}%</span>
            </div>
            <p className="text-[11px] text-slate-400 mb-1.5">{desc}</p>
            <input
              type="range"
              min={0}
              max={100}
              value={weights[key]}
              onChange={(e) => setWeights({ ...weights, [key]: parseInt(e.target.value) })}
              className="w-full h-2 rounded-full appearance-none bg-slate-100 cursor-pointer accent-blue-600"
            />
          </div>
        ))}
      </div>

      {/* 비율 시각 바 */}
      <div className="mt-5 flex h-3 rounded-full overflow-hidden">
        <div className="bg-blue-500 transition-all" style={{ flex: weights.score }} title={`성적 ${weights.score}%`} />
        <div className="bg-purple-500 transition-all" style={{ flex: weights.personality }} title={`성격 ${weights.personality}%`} />
        <div className="bg-pink-500 transition-all" style={{ flex: weights.trait }} title={`성향 ${weights.trait}%`} />
        <div className="bg-cyan-500 transition-all" style={{ flex: weights.gender }} title={`성별 ${weights.gender}%`} />
        <div className="bg-amber-500 transition-all" style={{ flex: weights.age }} title={`나이 ${weights.age}%`} />
        <div className="bg-slate-400 transition-all" style={{ flex: weights.size }} title={`인원 ${weights.size}%`} />
      </div>
      <div className="mt-1.5 flex flex-wrap gap-x-3 gap-y-1">
        {items.map(({ key, label, color }) => (
          <span key={key} className={`text-[10px] ${color}`}>{label.replace(' 균형', '')} {weights[key]}%</span>
        ))}
      </div>

      {/* 버튼 */}
      <div className="mt-5 flex items-center gap-3">
        <button
          onClick={handleSave}
          disabled={!isValid}
          className="rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:opacity-40"
        >
          {saved ? '저장됨 ✓' : '가중치 저장'}
        </button>
        <button
          onClick={handleReset}
          className="rounded-lg border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-600 transition hover:bg-slate-50"
        >
          기본값으로 초기화
        </button>
      </div>
    </div>
  );
}
