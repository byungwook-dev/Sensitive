'use client';

import { useStore } from '@/store/useStore';
import { getTeamStats, calculateBalanceScore } from '@/services/assignmentEngine';
import { PersonalityType, TRAIT_TYPES } from '@/types';

const ALL_PERSONALITIES: PersonalityType[] = ['리더형', '협동형', '분석형', '신중형', '적극형', '창의형'];
const PERSONALITY_COLORS: Record<string, string> = {
  '리더형': 'bg-red-100 text-red-700', '협동형': 'bg-blue-100 text-blue-700',
  '분석형': 'bg-purple-100 text-purple-700', '신중형': 'bg-amber-100 text-amber-700',
  '적극형': 'bg-emerald-100 text-emerald-700', '창의형': 'bg-pink-100 text-pink-700',
};
const P_BAR: Record<string, string> = {
  '리더형': 'bg-red-400', '협동형': 'bg-blue-400', '분석형': 'bg-purple-400',
  '신중형': 'bg-amber-400', '적극형': 'bg-emerald-400', '창의형': 'bg-pink-400',
};
const T_BAR: Record<string, string> = {
  '외향적': 'bg-orange-400', '내향적': 'bg-indigo-400', '적극적': 'bg-lime-500',
  '소심한편': 'bg-slate-400', '사교적': 'bg-cyan-400', '독립적': 'bg-violet-400',
  '감성적': 'bg-rose-400', '이성적': 'bg-teal-400',
};

function CircleGauge({ value, label, size = 80, strokeWidth = 6, color }: { value: number; label: string; size?: number; strokeWidth?: number; color: string }) {
  const r = (size - strokeWidth) / 2;
  const circ = 2 * Math.PI * r;
  const offset = circ - (value / 100) * circ;
  const colorMap: Record<string, string> = {
    blue: '#3b82f6', purple: '#a855f7', pink: '#ec4899', cyan: '#06b6d4',
    amber: '#f59e0b', slate: '#64748b', emerald: '#10b981',
  };
  return (
    <div className="flex flex-col items-center gap-1.5">
      <div className="relative" style={{ width: size, height: size }}>
        <svg width={size} height={size} className="-rotate-90">
          <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#f1f5f9" strokeWidth={strokeWidth} />
          <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={colorMap[color] || '#3b82f6'} strokeWidth={strokeWidth}
            strokeDasharray={circ} strokeDashoffset={offset} strokeLinecap="round"
            className="transition-all duration-1000" />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className={`text-sm font-extrabold ${value >= 80 ? 'text-emerald-600' : value >= 60 ? 'text-amber-600' : 'text-red-500'}`}>{value}</span>
        </div>
      </div>
      <span className="text-[10px] font-semibold text-slate-500 text-center leading-tight">{label}</span>
    </div>
  );
}

export default function DashboardPage() {
  const { students, teams, teamAnalyses } = useStore();
  const assignedIds = new Set(teams.flatMap((t) => t.memberIds));
  const unassigned = students.filter((s) => !assignedIds.has(s.id));
  const balance = calculateBalanceScore(teams, students);

  const totalAvgScore = students.length > 0
    ? (students.reduce((s, st) => s + st.score, 0) / students.length).toFixed(1)
    : '0';
  const maleCount = students.filter((s) => s.gender === '남').length;
  const femaleCount = students.filter((s) => s.gender === '여').length;

  const pCounts: Record<string, number> = {};
  ALL_PERSONALITIES.forEach(p => { pCounts[p] = students.filter(s => s.personality === p).length; });
  const tCounts: Record<string, number> = {};
  TRAIT_TYPES.forEach(t => { tCounts[t] = students.filter(s => (s.trait || '사교적') === t).length; });

  const hasAnalyses = Object.keys(teamAnalyses).length > 0;

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-4 gap-4">
        <SummaryCard label="총 학생 수" value={students.length} sub={`남 ${maleCount} / 여 ${femaleCount}`} color="blue" />
        <SummaryCard label="팀/반 수" value={teams.length} sub={`미배정 ${unassigned.length}명`} color="indigo" />
        <SummaryCard label="전체 평균 성적" value={totalAvgScore} sub="점" color="emerald" />
        <SummaryCard label="균형 점수" value={balance.overall} sub="/ 100" color="amber" />
      </div>

      {teams.length > 0 && (
        <div className="grid grid-cols-2 gap-4">
          {/* 균형 점수 — 원형 게이지 */}
          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <h3 className="mb-2 text-sm font-bold text-slate-900">배정 균형 분석</h3>
            <p className="mb-4 text-[10px] text-slate-400">각 항목이 100에 가까울수록 균형 잡힌 배정</p>
            <div className="flex items-center gap-6">
              {/* 전체 점수 큰 원 */}
              <div className="flex flex-col items-center">
                <CircleGauge value={balance.overall} label="전체" size={110} strokeWidth={8} color="emerald" />
                <span className={`mt-1 text-[10px] font-bold ${balance.overall >= 90 ? 'text-emerald-600' : balance.overall >= 80 ? 'text-emerald-500' : balance.overall >= 70 ? 'text-amber-500' : 'text-red-500'}`}>
                  {balance.overall >= 90 ? '매우 우수' : balance.overall >= 80 ? '우수' : balance.overall >= 70 ? '양호' : balance.overall >= 60 ? '보통' : '개선 필요'}
                </span>
              </div>
              {/* 항목별 작은 원들 */}
              <div className="grid grid-cols-3 gap-x-5 gap-y-3 flex-1">
                <CircleGauge value={balance.scoreBalance} label="성적 균형" color="blue" />
                <CircleGauge value={balance.personalityBalance} label="성격 시너지" color="purple" />
                <CircleGauge value={balance.traitBalance} label="성향 시너지" color="pink" />
                <CircleGauge value={balance.genderBalance} label="성별 균형" color="cyan" />
                <CircleGauge value={balance.ageBalance} label="나이 균형" color="amber" />
                <CircleGauge value={balance.sizeBalance} label="인원 균형" color="slate" />
              </div>
            </div>
          </div>

          {/* 팀별 성적 비교 — 범위 바 */}
          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <h3 className="mb-2 text-sm font-bold text-slate-900">팀별 성적 분포</h3>
            <p className="mb-3 text-[10px] text-slate-400">막대: 최저~최고 범위 · 점: 평균 · 우측: 편차</p>
            <div className="space-y-2">
              {teams.map(team => {
                const stats = getTeamStats(team, students);
                if (stats.memberCount === 0) return null;
                const members = students.filter(s => team.memberIds.includes(s.id));
                const scores = members.map(m => m.score);
                const avg = stats.avgScore;
                const min = Math.min(...scores);
                const max = Math.max(...scores);
                const stdDev = scores.length >= 2 ? Math.sqrt(scores.reduce((s, v) => s + (v - avg) ** 2, 0) / scores.length) : 0;
                return (
                  <div key={team.id} className="flex items-center gap-2">
                    <span className="w-12 text-[11px] font-semibold text-slate-700 shrink-0 truncate">{team.name}</span>
                    <div className="flex-1 h-7 relative bg-slate-50 rounded-lg overflow-hidden">
                      {/* 범위 바 (min~max) */}
                      <div
                        className="absolute h-full bg-blue-100 rounded"
                        style={{ left: `${min}%`, width: `${Math.max(max - min, 1)}%` }}
                      />
                      {/* 평균 점 */}
                      <div
                        className="absolute top-1/2 -translate-y-1/2 w-3 h-3 rounded-full bg-blue-500 border-2 border-white shadow-sm z-10"
                        style={{ left: `${avg}%`, marginLeft: '-6px' }}
                        title={`평균: ${avg.toFixed(1)}`}
                      />
                      {/* 범위 텍스트 */}
                      <div className="absolute inset-0 flex items-center px-2 justify-between">
                        <span className="text-[9px] text-slate-400 font-medium">{min}</span>
                        <span className="text-[10px] font-bold text-blue-700">{avg.toFixed(1)}</span>
                        <span className="text-[9px] text-slate-400 font-medium">{max}</span>
                      </div>
                    </div>
                    <span className={`text-[10px] w-10 shrink-0 text-right font-semibold ${stdDev <= 10 ? 'text-emerald-500' : stdDev <= 20 ? 'text-amber-500' : 'text-red-500'}`}>
                      ±{stdDev.toFixed(1)}
                    </span>
                  </div>
                );
              })}
              {/* 전체 기준선 */}
              <div className="flex items-center gap-2 pt-1.5 border-t border-dashed border-slate-200">
                <span className="w-12 text-[11px] font-semibold text-slate-400 shrink-0">전체</span>
                <div className="flex-1 h-7 relative bg-slate-50 rounded-lg overflow-hidden">
                  <div
                    className="absolute top-1/2 -translate-y-1/2 w-3 h-3 rounded-full bg-slate-400 border-2 border-white shadow-sm z-10"
                    style={{ left: `${totalAvgScore}%`, marginLeft: '-6px' }}
                  />
                  <div className="absolute inset-0 flex items-center justify-center">
                    <span className="text-[10px] font-bold text-slate-500">{totalAvgScore}</span>
                  </div>
                </div>
                <span className="text-[10px] w-10 shrink-0 text-right text-slate-400">{students.length}명</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {teams.length > 0 && (
        <div className="grid grid-cols-2 gap-4">
          {/* 성격 분포 — 도넛 스타일 */}
          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <h3 className="mb-4 text-sm font-bold text-slate-900">전체 성격 유형 분포</h3>
            <div className="flex items-center gap-6">
              <DonutChart data={ALL_PERSONALITIES.map(p => ({ label: p, value: pCounts[p], color: P_BAR[p] }))} size={120} />
              <div className="flex-1 space-y-1.5">
                {ALL_PERSONALITIES.map(p => {
                  const pct = students.length > 0 ? ((pCounts[p] / students.length) * 100).toFixed(0) : '0';
                  return (
                    <div key={p} className="flex items-center gap-2">
                      <div className={`h-2.5 w-2.5 rounded-full ${P_BAR[p]} shrink-0`} />
                      <span className="text-[11px] text-slate-600 w-12">{p}</span>
                      <div className="flex-1 h-2 rounded-full bg-slate-100 overflow-hidden">
                        <div className={`h-full rounded-full ${P_BAR[p]} transition-all`} style={{ width: `${pct}%` }} />
                      </div>
                      <span className="text-[11px] font-bold text-slate-700 w-12 text-right">{pCounts[p]}명 ({pct}%)</span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* 성향 분포 — 도넛 스타일 */}
          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <h3 className="mb-4 text-sm font-bold text-slate-900">전체 성향 분포</h3>
            <div className="flex items-center gap-6">
              <DonutChart data={TRAIT_TYPES.map(t => ({ label: t, value: tCounts[t], color: T_BAR[t] }))} size={120} />
              <div className="flex-1 space-y-1.5">
                {TRAIT_TYPES.map(t => {
                  const pct = students.length > 0 ? ((tCounts[t] / students.length) * 100).toFixed(0) : '0';
                  return (
                    <div key={t} className="flex items-center gap-2">
                      <div className={`h-2.5 w-2.5 rounded-full ${T_BAR[t]} shrink-0`} />
                      <span className="text-[11px] text-slate-600 w-14">{t}</span>
                      <div className="flex-1 h-2 rounded-full bg-slate-100 overflow-hidden">
                        <div className={`h-full rounded-full ${T_BAR[t]} transition-all`} style={{ width: `${pct}%` }} />
                      </div>
                      <span className="text-[11px] font-bold text-slate-700 w-12 text-right">{tCounts[t]}명 ({pct}%)</span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* AI 분석 요약 */}
      {hasAnalyses && teams.length > 0 && (
        <div className="rounded-xl border border-violet-200 bg-gradient-to-r from-violet-50/50 to-purple-50/50 p-5 shadow-sm">
          <div className="flex items-center gap-2 mb-4">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-violet-600">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>
            </div>
            <h3 className="text-sm font-bold text-slate-900">AI 팀 분석 요약</h3>
          </div>
          <div className="grid grid-cols-1 gap-3 lg:grid-cols-2 xl:grid-cols-3">
            {teams.map(team => {
              const a = teamAnalyses[team.id];
              if (!a) return null;
              return (
                <div key={team.id} className="rounded-xl bg-white border border-slate-100 p-4 shadow-sm">
                  <div className="flex items-center gap-2 mb-2">
                    <h4 className="text-sm font-bold text-slate-800">{team.name}</h4>
                    {a.oneLineSum && <span className="rounded-full bg-violet-100 px-2 py-0.5 text-[10px] font-semibold text-violet-700">{a.oneLineSum}</span>}
                  </div>
                  <div className="space-y-1.5 text-[11px] text-slate-600 leading-relaxed">
                    <p><span className="font-semibold text-blue-700">시너지</span> {a.synergy}</p>
                    <p><span className="font-semibold text-red-600">주의</span> {a.caution}</p>
                    <p><span className="font-semibold text-indigo-700">추천</span> {a.recommendation}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Team Cards */}
      {teams.length > 0 ? (
        <div>
          <h3 className="mb-4 text-sm font-bold text-slate-900">팀/반별 상세</h3>
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2 xl:grid-cols-3">
            {teams.map((team) => {
              const stats = getTeamStats(team, students);
              const members = students.filter(s => team.memberIds.includes(s.id));
              const scores = members.map(m => m.score);
              const stdDev = scores.length >= 2 ? Math.sqrt(scores.reduce((s, v) => s + (v - stats.avgScore) ** 2, 0) / scores.length) : 0;
              return (
                <div key={team.id} className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
                  <div className="mb-3 flex items-center justify-between">
                    <h4 className="font-bold text-slate-900">{team.name}</h4>
                    <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-semibold text-slate-600">{stats.memberCount}명</span>
                  </div>
                  <div className="mb-3 grid grid-cols-4 gap-2">
                    <MiniStat label="평균" value={stats.avgScore.toFixed(1)} />
                    <MiniStat label="편차" value={`±${stdDev.toFixed(1)}`} highlight={stdDev > 20 ? 'red' : stdDev > 10 ? 'amber' : 'green'} />
                    <MiniStat label="나이" value={stats.avgAge.toFixed(1)} />
                    <MiniStat label="성별" value={`${stats.maleCount}:${stats.femaleCount}`} />
                  </div>
                  {/* 성격 분포 바 */}
                  <div className="flex gap-0.5 h-2.5 rounded-full overflow-hidden mb-2">
                    {ALL_PERSONALITIES.map(p => {
                      const count = stats.personalityDistribution[p] || 0;
                      return count > 0 ? <div key={p} className={`${P_BAR[p]} rounded-full`} style={{ flex: count }} title={`${p}: ${count}`} /> : null;
                    })}
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {ALL_PERSONALITIES.map((p) => {
                      const count = stats.personalityDistribution[p] || 0;
                      if (count === 0) return null;
                      return (
                        <span key={p} className={`rounded px-1.5 py-0.5 text-[10px] font-medium ${PERSONALITY_COLORS[p]}`}>
                          {p} {count}
                        </span>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-slate-200 bg-white py-20">
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="1.5"><rect x="2" y="7" width="20" height="14" rx="2" ry="2" /><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16" /></svg>
          <p className="mt-4 text-sm font-semibold text-slate-500">아직 배정된 팀/반이 없습니다</p>
          <p className="mt-1 text-xs text-slate-400">팀 배정 또는 반 배정 메뉴에서 배정을 시작하세요</p>
        </div>
      )}
    </div>
  );
}

function SummaryCard({ label, value, sub, color }: { label: string; value: string | number; sub: string; color: string }) {
  const colorMap: Record<string, string> = {
    blue: 'from-blue-500 to-blue-600', indigo: 'from-indigo-500 to-indigo-600',
    emerald: 'from-emerald-500 to-emerald-600', amber: 'from-amber-500 to-amber-600',
  };
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">{label}</p>
      <div className="mt-2 flex items-baseline gap-2">
        <span className={`bg-gradient-to-r ${colorMap[color]} bg-clip-text text-3xl font-extrabold text-transparent`}>{value}</span>
        <span className="text-xs text-slate-400">{sub}</span>
      </div>
    </div>
  );
}

function MiniStat({ label, value, highlight }: { label: string; value: string; highlight?: string }) {
  const hColor = highlight === 'red' ? 'text-red-600' : highlight === 'amber' ? 'text-amber-600' : highlight === 'green' ? 'text-emerald-600' : 'text-slate-700';
  return (
    <div className="rounded-lg bg-slate-50 p-2 text-center">
      <p className="text-[10px] font-medium text-slate-400">{label}</p>
      <p className={`mt-0.5 text-sm font-bold ${hColor}`}>{value}</p>
    </div>
  );
}

// CSS 도넛 차트 (SVG)
function DonutChart({ data, size = 120 }: { data: { label: string; value: number; color: string }[]; size?: number }) {
  const total = data.reduce((s, d) => s + d.value, 0);
  if (total === 0) return <div style={{ width: size, height: size }} className="rounded-full bg-slate-100" />;
  const r = size / 2 - 12;
  const circ = 2 * Math.PI * r;
  // tailwind bg class → hex
  const colorHex: Record<string, string> = {
    'bg-red-400': '#f87171', 'bg-blue-400': '#60a5fa', 'bg-purple-400': '#c084fc',
    'bg-amber-400': '#fbbf24', 'bg-emerald-400': '#34d399', 'bg-pink-400': '#f472b6',
    'bg-orange-400': '#fb923c', 'bg-indigo-400': '#818cf8', 'bg-lime-500': '#84cc16',
    'bg-slate-400': '#94a3b8', 'bg-cyan-400': '#22d3ee', 'bg-violet-400': '#a78bfa',
    'bg-rose-400': '#fb7185', 'bg-teal-400': '#2dd4bf',
  };
  let offset = 0;
  return (
    <div className="shrink-0" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        {data.filter(d => d.value > 0).map((d) => {
          const pct = d.value / total;
          const dash = pct * circ;
          const seg = (
            <circle key={d.label} cx={size / 2} cy={size / 2} r={r} fill="none"
              stroke={colorHex[d.color] || '#94a3b8'} strokeWidth={20}
              strokeDasharray={`${dash} ${circ - dash}`} strokeDashoffset={-offset}
              className="transition-all duration-700" />
          );
          offset += dash;
          return seg;
        })}
        <circle cx={size / 2} cy={size / 2} r={r - 14} fill="white" />
      </svg>
      <div className="relative -mt-[calc(100%)] flex items-center justify-center" style={{ height: size }}>
        <span className="text-sm font-extrabold text-slate-700">{total}명</span>
      </div>
    </div>
  );
}
