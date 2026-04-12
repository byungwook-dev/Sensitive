'use client';

import { useState } from 'react';
import { useStore } from '@/store/useStore';
import { getTeamStats, calculateBalanceScore } from '@/services/assignmentEngine';
import { PersonalityType, TRAIT_TYPES } from '@/types';

const ALL_PERSONALITIES: PersonalityType[] = ['리더형', '협동형', '분석형', '신중형', '적극형', '창의형'];
const PERSONALITY_COLORS: Record<string, string> = {
  '리더형': 'bg-red-100 text-red-700', '협동형': 'bg-blue-100 text-blue-700',
  '분석형': 'bg-purple-100 text-purple-700', '신중형': 'bg-amber-100 text-amber-700',
  '적극형': 'bg-emerald-100 text-emerald-700', '창의형': 'bg-pink-100 text-pink-700',
};
const P_HEX: Record<string, string> = {
  '리더형': '#f87171', '협동형': '#60a5fa', '분석형': '#c084fc',
  '신중형': '#fbbf24', '적극형': '#34d399', '창의형': '#f472b6',
};
const T_HEX: Record<string, string> = {
  '외향적': '#fb923c', '내향적': '#818cf8', '적극적': '#84cc16',
  '소심한편': '#94a3b8', '사교적': '#22d3ee', '독립적': '#a78bfa',
  '감성적': '#fb7185', '이성적': '#2dd4bf',
};
const P_BAR: Record<string, string> = {
  '리더형': 'bg-red-400', '협동형': 'bg-blue-400', '분석형': 'bg-purple-400',
  '신중형': 'bg-amber-400', '적극형': 'bg-emerald-400', '창의형': 'bg-pink-400',
};

// ─── Radar Chart (Spider Graph) ───
function RadarChart({ data, size = 260 }: { data: { label: string; value: number }[]; size?: number }) {
  const cx = size / 2, cy = size / 2;
  const levels = [20, 40, 60, 80, 100];
  const n = data.length;
  const angleStep = (2 * Math.PI) / n;
  const maxR = size / 2 - 36;

  const getPoint = (i: number, val: number) => {
    const angle = angleStep * i - Math.PI / 2;
    return { x: cx + (val / 100) * maxR * Math.cos(angle), y: cy + (val / 100) * maxR * Math.sin(angle) };
  };

  const [hover, setHover] = useState<number | null>(null);

  return (
    <svg width={size} height={size} className="select-none">
      {/* 배경 레벨 */}
      {levels.map(lv => {
        const pts = Array.from({ length: n }, (_, i) => getPoint(i, lv));
        return <polygon key={lv} points={pts.map(p => `${p.x},${p.y}`).join(' ')} fill="none" stroke="#e2e8f0" strokeWidth="1" />;
      })}
      {/* 축 선 */}
      {data.map((_, i) => {
        const p = getPoint(i, 100);
        return <line key={i} x1={cx} y1={cy} x2={p.x} y2={p.y} stroke="#e2e8f0" strokeWidth="1" />;
      })}
      {/* 데이터 영역 */}
      <polygon
        points={data.map((d, i) => { const p = getPoint(i, d.value); return `${p.x},${p.y}`; }).join(' ')}
        fill="rgba(99,102,241,0.15)" stroke="#6366f1" strokeWidth="2"
      />
      {/* 데이터 점 */}
      {data.map((d, i) => {
        const p = getPoint(i, d.value);
        return (
          <circle key={i} cx={p.x} cy={p.y} r={hover === i ? 5 : 4}
            fill={d.value >= 80 ? '#10b981' : d.value >= 60 ? '#f59e0b' : '#ef4444'}
            stroke="white" strokeWidth="2" className="cursor-pointer transition-all"
            onMouseEnter={() => setHover(i)} onMouseLeave={() => setHover(null)} />
        );
      })}
      {/* 라벨 */}
      {data.map((d, i) => {
        const p = getPoint(i, 118);
        return (
          <text key={i} x={p.x} y={p.y} textAnchor="middle" dominantBaseline="middle"
            className="text-[10px] font-semibold fill-slate-600 select-none">
            {d.label}
          </text>
        );
      })}
      {/* 호버 툴팁 */}
      {hover !== null && (() => {
        const d = data[hover];
        const p = getPoint(hover, d.value);
        return (
          <g>
            <rect x={p.x - 28} y={p.y - 26} width="56" height="20" rx="6" fill="#1e293b" opacity="0.9" />
            <text x={p.x} y={p.y - 14} textAnchor="middle" className="text-[10px] font-bold fill-white">{d.value}점</text>
          </g>
        );
      })()}
    </svg>
  );
}

// ─── Donut Chart ───
function DonutChart({ data, size = 160 }: { data: { label: string; value: number; color: string }[]; size?: number }) {
  const total = data.reduce((s, d) => s + d.value, 0);
  if (total === 0) return <div style={{ width: size, height: size }} className="rounded-full bg-slate-100 flex items-center justify-center text-xs text-slate-400">데이터 없음</div>;
  const r = size / 2 - 16;
  const circ = 2 * Math.PI * r;
  const [hover, setHover] = useState<number | null>(null);
  let offset = 0;

  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        {data.filter(d => d.value > 0).map((d, i) => {
          const pct = d.value / total;
          const dash = pct * circ;
          const seg = (
            <circle key={d.label} cx={size / 2} cy={size / 2} r={r} fill="none"
              stroke={d.color} strokeWidth={hover === i ? 24 : 20}
              strokeDasharray={`${dash} ${circ - dash}`} strokeDashoffset={-offset}
              className="transition-all duration-300 cursor-pointer"
              onMouseEnter={() => setHover(i)} onMouseLeave={() => setHover(null)} />
          );
          offset += dash;
          return seg;
        })}
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        {hover !== null ? (
          <>
            <span className="text-lg font-extrabold text-slate-800">{data[hover].value}명</span>
            <span className="text-[10px] font-medium text-slate-500">{data[hover].label} ({((data[hover].value / total) * 100).toFixed(0)}%)</span>
          </>
        ) : (
          <>
            <span className="text-lg font-extrabold text-slate-800">{total}명</span>
            <span className="text-[10px] text-slate-400">전체</span>
          </>
        )}
      </div>
    </div>
  );
}

export default function DashboardPage() {
  const { students, teams, teamAnalyses } = useStore();
  const assignedIds = new Set(teams.flatMap((t) => t.memberIds));
  const unassigned = students.filter((s) => !assignedIds.has(s.id));
  const balance = calculateBalanceScore(teams, students);
  const [teamSort, setTeamSort] = useState<'name' | 'score' | 'balance'>('name');
  const [selectedTeam, setSelectedTeam] = useState<string | null>(null);

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

  // 팀 정렬
  const sortedTeams = [...teams].sort((a, b) => {
    if (teamSort === 'score') {
      const sa = getTeamStats(a, students).avgScore, sb = getTeamStats(b, students).avgScore;
      return sb - sa;
    }
    if (teamSort === 'balance') {
      const ba = calculateBalanceScore([a], students).overall, bb = calculateBalanceScore([b], students).overall;
      return bb - ba;
    }
    return a.name.localeCompare(b.name);
  });

  return (
    <div className="space-y-6">
      {/* ═══ 1. 상단 요약 카드 ═══ */}
      <div className="grid grid-cols-4 gap-4">
        <SummaryCard
          icon={<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>}
          iconColor="bg-blue-100 text-blue-600"
          label="총 학생 수" value={students.length} sub={`남 ${maleCount} / 여 ${femaleCount}`}
        />
        <SummaryCard
          icon={<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="2" y="7" width="20" height="14" rx="2" ry="2"/><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/></svg>}
          iconColor="bg-indigo-100 text-indigo-600"
          label="팀/반 수" value={teams.length} sub={unassigned.length > 0 ? `미배정 ${unassigned.length}명` : '전원 배정 완료'}
        />
        <SummaryCard
          icon={<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 12h-4l-3 9L9 3l-3 9H2"/></svg>}
          iconColor="bg-emerald-100 text-emerald-600"
          label="전체 평균 성적" value={totalAvgScore} sub="점"
        />
        <SummaryCard
          icon={<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>}
          iconColor={balance.overall >= 80 ? 'bg-emerald-100 text-emerald-600' : balance.overall >= 60 ? 'bg-amber-100 text-amber-600' : 'bg-red-100 text-red-600'}
          label="균형 점수" value={balance.overall}
          sub={balance.overall >= 90 ? '매우 우수' : balance.overall >= 80 ? '우수' : balance.overall >= 70 ? '양호' : balance.overall >= 60 ? '보통' : '개선 필요'}
        />
      </div>

      {teams.length > 0 && (
        <div className="grid grid-cols-2 gap-4">
          {/* ═══ 2. 배정 균형 분석 — 레이더 차트 ═══ */}
          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <h3 className="mb-1 text-sm font-bold text-slate-900">배정 균형 분석</h3>
            <p className="mb-3 text-[10px] text-slate-400">각 꼭짓점이 100에 가까울수록 균형 잡힌 배정 · 점 위에 마우스를 올려보세요</p>
            <div className="flex justify-center">
              <RadarChart data={[
                { label: '성적', value: balance.scoreBalance },
                { label: '성격시너지', value: balance.personalityBalance },
                { label: '성향시너지', value: balance.traitBalance },
                { label: '성별', value: balance.genderBalance },
                { label: '나이', value: balance.ageBalance },
                { label: '인원', value: balance.sizeBalance },
              ]} />
            </div>
          </div>

          {/* ═══ 3. 팀별 성적 분포 — Box Plot 스타일 ═══ */}
          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <h3 className="mb-1 text-sm font-bold text-slate-900">팀별 성적 분포</h3>
            <p className="mb-3 text-[10px] text-slate-400">막대: 최저~최고 · 굵은 부분: 평균±편차 · 선: 평균</p>
            <div className="space-y-2.5">
              {teams.map(team => {
                const members = students.filter(s => team.memberIds.includes(s.id));
                if (members.length === 0) return null;
                const scores = members.map(m => m.score);
                const avg = scores.reduce((a, b) => a + b, 0) / scores.length;
                const min = Math.min(...scores);
                const max = Math.max(...scores);
                const stdDev = scores.length >= 2 ? Math.sqrt(scores.reduce((s, v) => s + (v - avg) ** 2, 0) / scores.length) : 0;
                const lo = Math.max(0, avg - stdDev);
                const hi = Math.min(100, avg + stdDev);
                return (
                  <div key={team.id} className="group flex items-center gap-2">
                    <span className="w-12 text-[11px] font-semibold text-slate-700 shrink-0 truncate">{team.name}</span>
                    <div className="flex-1 h-6 relative bg-slate-50 rounded-lg">
                      {/* 전체 범위 (얇은 선) */}
                      <div className="absolute top-1/2 -translate-y-1/2 h-[3px] bg-slate-200 rounded-full" style={{ left: `${min}%`, width: `${max - min}%` }} />
                      {/* ±1σ 범위 (굵은 바) */}
                      <div
                        className={`absolute top-1/2 -translate-y-1/2 h-3.5 rounded ${stdDev <= 10 ? 'bg-emerald-300' : stdDev <= 20 ? 'bg-amber-300' : 'bg-red-300'}`}
                        style={{ left: `${lo}%`, width: `${hi - lo}%` }}
                      />
                      {/* 평균 선 */}
                      <div className="absolute top-0.5 bottom-0.5 w-0.5 bg-slate-800 rounded-full z-10" style={{ left: `${avg}%` }} />
                      {/* 호버 정보 */}
                      <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity z-20">
                        <span className="bg-slate-900/80 text-white text-[9px] font-medium px-2 py-0.5 rounded-full">
                          평균 {avg.toFixed(1)} · 편차 ±{stdDev.toFixed(1)} · {min}~{max}
                        </span>
                      </div>
                    </div>
                    <span className={`text-[10px] w-8 shrink-0 text-right font-bold ${stdDev <= 10 ? 'text-emerald-600' : stdDev <= 20 ? 'text-amber-600' : 'text-red-600'}`}>
                      ±{stdDev.toFixed(0)}
                    </span>
                  </div>
                );
              })}
              {/* 전체 평균 기준선 */}
              <div className="flex items-center gap-2 pt-2 border-t border-dashed border-slate-200">
                <span className="w-12 text-[11px] font-semibold text-slate-400 shrink-0">전체</span>
                <div className="flex-1 h-6 relative bg-slate-50 rounded-lg">
                  <div className="absolute top-0.5 bottom-0.5 w-0.5 bg-slate-400 rounded-full" style={{ left: `${totalAvgScore}%` }} />
                  <div className="absolute inset-0 flex items-center justify-center">
                    <span className="text-[10px] font-bold text-slate-500">{totalAvgScore}점</span>
                  </div>
                </div>
                <span className="text-[10px] w-8 shrink-0 text-right text-slate-400">{students.length}명</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {teams.length > 0 && (
        <div className="grid grid-cols-2 gap-4">
          {/* ═══ 4. 성격 유형 분포 — 도넛 차트 ═══ */}
          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <h3 className="mb-4 text-sm font-bold text-slate-900">전체 성격 유형 분포</h3>
            <div className="flex items-center gap-6">
              <DonutChart data={ALL_PERSONALITIES.map(p => ({ label: p, value: pCounts[p], color: P_HEX[p] }))} />
              <div className="flex-1 space-y-2">
                {ALL_PERSONALITIES.map(p => {
                  const pct = students.length > 0 ? (pCounts[p] / students.length) * 100 : 0;
                  return (
                    <div key={p} className="flex items-center gap-2">
                      <div className="h-2.5 w-2.5 rounded-full shrink-0" style={{ background: P_HEX[p] }} />
                      <span className="text-[11px] text-slate-600 w-10">{p}</span>
                      <div className="flex-1 h-2 rounded-full bg-slate-100 overflow-hidden">
                        <div className="h-full rounded-full transition-all duration-500" style={{ width: `${pct}%`, background: P_HEX[p] }} />
                      </div>
                      <span className="text-[11px] font-bold text-slate-700 w-16 text-right">{pCounts[p]}명 ({pct.toFixed(0)}%)</span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* ═══ 5. 성향 분포 — 수평 바 (정렬) ═══ */}
          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <h3 className="mb-4 text-sm font-bold text-slate-900">전체 성향 분포</h3>
            <div className="space-y-2">
              {[...TRAIT_TYPES].sort((a, b) => tCounts[b] - tCounts[a]).map((t, i) => {
                const pct = students.length > 0 ? (tCounts[t] / students.length) * 100 : 0;
                const maxPct = Math.max(...TRAIT_TYPES.map(tt => students.length > 0 ? (tCounts[tt] / students.length) * 100 : 0), 1);
                return (
                  <div key={t} className="flex items-center gap-2">
                    <div className="h-2.5 w-2.5 rounded-full shrink-0" style={{ background: T_HEX[t] }} />
                    <span className="text-[11px] text-slate-600 w-14 shrink-0">{t}</span>
                    <div className="flex-1 h-5 rounded-lg bg-slate-50 overflow-hidden relative">
                      <div
                        className="h-full rounded-lg transition-all duration-700"
                        style={{
                          width: `${(pct / maxPct) * 100}%`,
                          background: `linear-gradient(90deg, ${T_HEX[t]}88, ${T_HEX[t]})`,
                        }}
                      />
                      <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] font-bold text-slate-600">
                        {tCounts[t]}명 ({pct.toFixed(0)}%)
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* ═══ 6. AI 팀 분석 요약 ═══ */}
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
                  <div className="flex items-center gap-2 mb-2.5">
                    <h4 className="text-sm font-bold text-slate-800">{team.name}</h4>
                    {a.oneLineSum && (
                      <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                        a.oneLineSum.includes('우수') || a.oneLineSum.includes('좋') ? 'bg-emerald-100 text-emerald-700' :
                        a.oneLineSum.includes('주의') || a.oneLineSum.includes('부족') ? 'bg-red-100 text-red-700' :
                        'bg-violet-100 text-violet-700'
                      }`}>{a.oneLineSum}</span>
                    )}
                  </div>
                  <div className="space-y-1.5 text-[11px] text-slate-600 leading-relaxed">
                    <p><span className="inline-block w-4 text-center">✨</span> <span className="font-semibold text-blue-700">시너지</span> {a.synergy}</p>
                    <p><span className="inline-block w-4 text-center">⚠️</span> <span className="font-semibold text-red-600">주의</span> {a.caution}</p>
                    <p><span className="inline-block w-4 text-center">✅</span> <span className="font-semibold text-indigo-700">추천</span> {a.recommendation}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ═══ 7. 팀/반별 상세 카드 ═══ */}
      {teams.length > 0 ? (
        <div>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-bold text-slate-900">팀/반별 상세</h3>
            <div className="flex gap-1">
              {[
                { key: 'name' as const, label: '이름순' },
                { key: 'score' as const, label: '성적순' },
              ].map(opt => (
                <button key={opt.key} onClick={() => setTeamSort(opt.key)}
                  className={`rounded-lg px-2.5 py-1 text-[11px] font-medium transition ${teamSort === opt.key ? 'bg-slate-800 text-white' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'}`}>
                  {opt.label}
                </button>
              ))}
            </div>
          </div>
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2 xl:grid-cols-3">
            {sortedTeams.map((team) => {
              const stats = getTeamStats(team, students);
              const members = students.filter(s => team.memberIds.includes(s.id));
              const scores = members.map(m => m.score);
              const stdDev = scores.length >= 2 ? Math.sqrt(scores.reduce((s, v) => s + (v - stats.avgScore) ** 2, 0) / scores.length) : 0;
              return (
                <div key={team.id}
                  className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm hover:shadow-md hover:border-slate-300 transition-all cursor-pointer"
                  onClick={() => setSelectedTeam(selectedTeam === team.id ? null : team.id)}>
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
                  {/* 상세 모달 (클릭 시 확장) */}
                  {selectedTeam === team.id && (
                    <div className="mt-3 pt-3 border-t border-slate-100 space-y-1.5">
                      <p className="text-[10px] font-semibold text-slate-500 mb-1.5">팀원 목록</p>
                      {members.map(m => (
                        <div key={m.id} className="flex items-center gap-2 text-[11px]">
                          <span className="font-semibold text-slate-700 w-14 truncate">{m.name}</span>
                          <span className="text-slate-400">{m.gender}/{m.age}세</span>
                          <span className={`rounded px-1 py-0.5 text-[9px] font-medium ${PERSONALITY_COLORS[m.personality]}`}>{m.personality}</span>
                          <span className="text-slate-400">{m.trait || '-'}</span>
                          <span className="ml-auto font-bold text-slate-700">{m.score}점</span>
                        </div>
                      ))}
                    </div>
                  )}
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

function SummaryCard({ icon, iconColor, label, value, sub }: { icon: React.ReactNode; iconColor: string; label: string; value: string | number; sub: string }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-center gap-3">
        <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${iconColor}`}>{icon}</div>
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">{label}</p>
          <div className="flex items-baseline gap-1.5">
            <span className="text-2xl font-extrabold text-slate-800">{value}</span>
            <span className="text-xs text-slate-400">{sub}</span>
          </div>
        </div>
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
