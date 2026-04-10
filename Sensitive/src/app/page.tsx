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

  // 전체 성격 분포
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
          {/* 균형 점수 시각화 */}
          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <h3 className="mb-4 text-sm font-bold text-slate-900">배정 균형 분석</h3>
            <div className="space-y-3">
              {[
                { label: '성적 균형', value: balance.scoreBalance, color: 'bg-blue-500' },
                { label: '성격 균형', value: balance.personalityBalance, color: 'bg-purple-500' },
                { label: '성향 균형', value: balance.traitBalance, color: 'bg-pink-500' },
                { label: '성별 균형', value: balance.genderBalance, color: 'bg-cyan-500' },
                { label: '나이 균형', value: balance.ageBalance, color: 'bg-amber-500' },
                { label: '인원 균형', value: balance.sizeBalance, color: 'bg-slate-500' },
              ].map((item) => (
                <div key={item.label} className="flex items-center gap-3">
                  <span className="w-16 text-xs font-medium text-slate-600 shrink-0">{item.label}</span>
                  <div className="flex-1 h-3 overflow-hidden rounded-full bg-slate-100">
                    <div className={`h-full rounded-full transition-all duration-700 ${item.value >= 80 ? 'bg-emerald-500' : item.value >= 60 ? 'bg-amber-500' : 'bg-red-500'}`} style={{ width: `${item.value}%` }} />
                  </div>
                  <span className={`w-8 text-right text-xs font-bold ${item.value >= 80 ? 'text-emerald-600' : item.value >= 60 ? 'text-amber-600' : 'text-red-600'}`}>{item.value}</span>
                </div>
              ))}
            </div>
          </div>

          {/* 팀별 성적 비교 차트 */}
          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <h3 className="mb-4 text-sm font-bold text-slate-900">팀별 평균 성적 비교</h3>
            <div className="space-y-2.5">
              {teams.map(team => {
                const stats = getTeamStats(team, students);
                if (stats.memberCount === 0) return null;
                const width = Math.max(10, stats.avgScore);
                return (
                  <div key={team.id} className="flex items-center gap-3">
                    <span className="w-14 text-xs font-semibold text-slate-700 shrink-0 truncate">{team.name}</span>
                    <div className="flex-1 h-6 overflow-hidden rounded-lg bg-slate-50 relative">
                      <div className="h-full rounded-lg bg-gradient-to-r from-blue-400 to-blue-500 transition-all duration-700 flex items-center justify-end pr-2" style={{ width: `${width}%` }}>
                        <span className="text-[10px] font-bold text-white">{stats.avgScore.toFixed(1)}</span>
                      </div>
                    </div>
                    <span className="text-[10px] text-slate-400 w-10 shrink-0">{stats.memberCount}명</span>
                  </div>
                );
              })}
              {/* 전체 평균 라인 */}
              <div className="flex items-center gap-3 pt-1 border-t border-dashed border-slate-200">
                <span className="w-14 text-xs font-semibold text-slate-400 shrink-0">전체</span>
                <div className="flex-1 h-6 overflow-hidden rounded-lg bg-slate-50">
                  <div className="h-full rounded-lg bg-slate-300 flex items-center justify-end pr-2" style={{ width: `${totalAvgScore}%` }}>
                    <span className="text-[10px] font-bold text-white">{totalAvgScore}</span>
                  </div>
                </div>
                <span className="text-[10px] text-slate-400 w-10 shrink-0">{students.length}명</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {teams.length > 0 && (
        <div className="grid grid-cols-2 gap-4">
          {/* 전체 성격 분포 */}
          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <h3 className="mb-4 text-sm font-bold text-slate-900">전체 성격 유형 분포</h3>
            <div className="flex gap-1 h-4 rounded-full overflow-hidden mb-3">
              {ALL_PERSONALITIES.map(p => pCounts[p] > 0 && (
                <div key={p} className={`${P_BAR[p]} rounded-full transition-all`} style={{ flex: pCounts[p] }} title={`${p}: ${pCounts[p]}명`} />
              ))}
            </div>
            <div className="flex flex-wrap gap-2">
              {ALL_PERSONALITIES.map(p => (
                <div key={p} className="flex items-center gap-1.5">
                  <div className={`h-2.5 w-2.5 rounded-full ${P_BAR[p]}`} />
                  <span className="text-[11px] text-slate-600">{p}</span>
                  <span className="text-[11px] font-bold text-slate-800">{pCounts[p]}</span>
                </div>
              ))}
            </div>
          </div>

          {/* 전체 성향 분포 */}
          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <h3 className="mb-4 text-sm font-bold text-slate-900">전체 성향 분포</h3>
            <div className="flex gap-1 h-4 rounded-full overflow-hidden mb-3">
              {TRAIT_TYPES.map(t => tCounts[t] > 0 && (
                <div key={t} className={`${T_BAR[t]} rounded-full transition-all`} style={{ flex: tCounts[t] }} title={`${t}: ${tCounts[t]}명`} />
              ))}
            </div>
            <div className="flex flex-wrap gap-2">
              {TRAIT_TYPES.map(t => (
                <div key={t} className="flex items-center gap-1.5">
                  <div className={`h-2.5 w-2.5 rounded-full ${T_BAR[t]}`} />
                  <span className="text-[11px] text-slate-600">{t}</span>
                  <span className="text-[11px] font-bold text-slate-800">{tCounts[t]}</span>
                </div>
              ))}
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
              return (
                <div key={team.id} className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
                  <div className="mb-3 flex items-center justify-between">
                    <h4 className="font-bold text-slate-900">{team.name}</h4>
                    <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-semibold text-slate-600">{stats.memberCount}명</span>
                  </div>
                  <div className="mb-3 grid grid-cols-3 gap-2">
                    <MiniStat label="평균 성적" value={stats.avgScore.toFixed(1)} />
                    <MiniStat label="평균 나이" value={stats.avgAge.toFixed(1)} />
                    <MiniStat label="성별" value={`남${stats.maleCount}/여${stats.femaleCount}`} />
                  </div>
                  {/* 성격 분포 바 */}
                  <div className="flex gap-0.5 h-2 rounded-full overflow-hidden mb-2">
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

function MiniStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg bg-slate-50 p-2 text-center">
      <p className="text-[10px] font-medium text-slate-400">{label}</p>
      <p className="mt-0.5 text-sm font-bold text-slate-700">{value}</p>
    </div>
  );
}
