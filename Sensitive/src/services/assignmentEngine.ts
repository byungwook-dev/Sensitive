import { Student, Team, PersonalityType, TraitType, TeamStats, BalanceScore, TRAIT_TYPES } from '@/types';

const ALL_PERSONALITIES: PersonalityType[] = ['리더형', '협동형', '분석형', '신중형', '적극형', '창의형'];
const ALL_TRAITS: TraitType[] = [...TRAIT_TYPES];

// ──────────────────────────────────────────────
// 팀 통계
// ──────────────────────────────────────────────
export function getTeamStats(team: Team, students: Student[]): TeamStats {
  const members = students.filter(s => team.memberIds.includes(s.id));
  if (members.length === 0) {
    return { memberCount: 0, avgScore: 0, maleCount: 0, femaleCount: 0, avgAge: 0, personalityDistribution: {}, traitDistribution: {} };
  }
  const mc = members.length;
  const personalityDistribution: Record<string, number> = {};
  ALL_PERSONALITIES.forEach(p => { personalityDistribution[p] = members.filter(m => m.personality === p).length; });
  const traitDistribution: Record<string, number> = {};
  ALL_TRAITS.forEach(t => { traitDistribution[t] = members.filter(m => (m.trait || '사교적') === t).length; });
  return {
    memberCount: mc,
    avgScore: members.reduce((s, m) => s + m.score, 0) / mc,
    maleCount: members.filter(m => m.gender === '남').length,
    femaleCount: members.filter(m => m.gender === '여').length,
    avgAge: members.reduce((s, m) => s + m.age, 0) / mc,
    personalityDistribution,
    traitDistribution,
  };
}

// ──────────────────────────────────────────────
// 균형 점수
// ──────────────────────────────────────────────
export function calculateBalanceScore(teams: Team[], students: Student[], weights?: { score: number; personality: number; trait: number; gender: number; age: number; size: number }): BalanceScore {
  const w = weights || { score: 30, personality: 26, trait: 26, gender: 10, age: 4, size: 4 };
  const active = teams.map(t => getTeamStats(t, students)).filter(s => s.memberCount > 0);
  if (active.length < 2) {
    return { overall: 100, scoreBalance: 100, genderBalance: 100, personalityBalance: 100, traitBalance: 100, ageBalance: 100, sizeBalance: 100 };
  }

  const scoreBalance = R(Math.max(0, 100 - rng(active.map(s => s.avgScore)) * 3 - std(active.map(s => s.avgScore)) * 5));

  const globalMR = active.reduce((s, t) => s + t.maleCount, 0) / active.reduce((s, t) => s + t.memberCount, 0);
  const gDevs = active.map(s => Math.abs((s.maleCount / s.memberCount) - globalMR));
  const genderBalance = R(Math.max(0, 100 - mean(gDevs) * 200 - Math.max(...gDevs) * 50));

  const pBalance = distBalance(active, 'personalityDistribution', ALL_PERSONALITIES);
  const tBalance = distBalance(active, 'traitDistribution', ALL_TRAITS);

  const ageBalance = R(Math.max(0, 100 - rng(active.map(s => s.avgAge)) * 10 - std(active.map(s => s.avgAge)) * 15));
  const sizes = active.map(s => s.memberCount);
  const sizeBalance = R(Math.max(0, 100 - rng(sizes) * 15 - std(sizes) * 20));

  // 로그 기반 곱연산 (한 항목이라도 낮으면 전체 급��)
  const total = w.score + w.personality + w.trait + w.gender + w.age + w.size;
  const scores = [
    { val: Math.max(1, scoreBalance), weight: w.score / total },
    { val: Math.max(1, pBalance), weight: w.personality / total },
    { val: Math.max(1, tBalance), weight: w.trait / total },
    { val: Math.max(1, genderBalance), weight: w.gender / total },
    { val: Math.max(1, ageBalance), weight: w.age / total },
    { val: Math.max(1, sizeBalance), weight: w.size / total },
  ];
  const logSum = scores.reduce((sum, s) => sum + s.weight * Math.log(s.val), 0);
  const overall = R(Math.min(100, Math.exp(logSum)));
  return { overall, scoreBalance, genderBalance, personalityBalance: pBalance, traitBalance: tBalance, ageBalance, sizeBalance };
}

function distBalance(active: TeamStats[], field: 'personalityDistribution' | 'traitDistribution', types: string[]): number {
  const entropies = active.map(s => {
    const d = s[field] as Record<string, number>;
    const total = Object.values(d).reduce((a, b) => a + b, 0);
    if (total === 0) return 0;
    const ps = Object.values(d).map(v => v / total).filter(p => p > 0);
    return (-ps.reduce((sum, p) => sum + p * Math.log2(p), 0) / Math.log2(types.length)) * 100;
  });
  const crossDevs = types.map(t => {
    const ratios = active.map(s => ((s[field] as Record<string, number>)[t] || 0) / s.memberCount);
    return std(ratios);
  });
  return R(mean(entropies) * 0.5 + Math.max(0, 100 - mean(crossDevs) * 400) * 0.5);
}

// ──────────────────────────────────────────────
// 자동 배정 엔진
// 핵심: 성격+성향을 먼저 균등 분배 → 성적 균형 스왑
// ──────────────────────────────────────────────
export function autoAssign(students: Student[], teams: Team[]): Team[] {
  if (teams.length === 0 || students.length === 0) return teams;
  const tc = teams.length;
  const sm = new Map(students.map(s => [s.id, s]));
  const globalAvg = students.reduce((s, x) => s + x.score, 0) / students.length;

  // ════════════════════════════════════════════
  // 1단계: 성격+성향 균등 배분 (핵심)
  // 각 성격 유형을 팀에 라운드로빈으로 배분
  // ════════════════════════════════════════════
  function balancedInit(): Team[] {
    const t = teams.map(x => ({ ...x, memberIds: [] as string[] }));

    // 성격별 그룹화
    const byPersonality: Record<string, Student[]> = {};
    ALL_PERSONALITIES.forEach(p => { byPersonality[p] = []; });
    students.forEach(s => { byPersonality[s.personality].push(s); });

    // 각 성격 그룹 내에서 성향 다양하게 정렬
    Object.values(byPersonality).forEach(arr => {
      arr.sort((a, b) => {
        const ta = a.trait || '사교적', tb = b.trait || '사교적';
        if (ta !== tb) return ta.localeCompare(tb);
        return b.score - a.score;
      });
    });

    // 각 성격 유형을 팀에 1명씩 분산 (같은 성격이 한 팀에 몰리지 않도록)
    // 성격 유형마다 독립적인 팀 인덱스 사용
    const personalityTeamIdx: Record<string, number> = {};
    ALL_PERSONALITIES.forEach((p, i) => { personalityTeamIdx[p] = i % tc; }); // 시작점을 다르게

    for (const p of ALL_PERSONALITIES) {
      let idx = personalityTeamIdx[p];
      for (const s of byPersonality[p]) {
        // 해당 성격이 가장 적은 팀 찾기
        let bestIdx = idx;
        let bestCount = Infinity;
        for (let k = 0; k < tc; k++) {
          const ci = (idx + k) % tc;
          if (t[ci].memberIds.length >= t[ci].maxMembers) continue;
          const count = t[ci].memberIds.filter(id => sm.get(id)!.personality === p).length;
          if (count < bestCount || (count === bestCount && t[ci].memberIds.length < t[bestIdx].memberIds.length)) {
            bestCount = count;
            bestIdx = ci;
          }
        }
        t[bestIdx].memberIds.push(s.id);
        idx = (bestIdx + 1) % tc;
      }
    }
    return t;
  }

  // ════════════════════════════════════════════
  // 2단계: 성적 균형 스왑
  // 모든 팀 평균을 전체 평균에 수렴시킴
  // ════════════════════════════════════════════
  function balanceScores(t: Team[]): Team[] {
    for (let round = 0; round < 300; round++) {
      let improved = false;
      const avgs = t.map(team => {
        const m = team.memberIds.map(id => sm.get(id)!).filter(Boolean);
        return m.length > 0 ? m.reduce((s, x) => s + x.score, 0) / m.length : 0;
      });
      const totalDev = avgs.reduce((s, a) => s + Math.abs(a - globalAvg), 0);

      for (let i = 0; i < tc; i++) {
        for (let j = i + 1; j < tc; j++) {
          for (let mi = 0; mi < t[i].memberIds.length; mi++) {
            for (let mj = 0; mj < t[j].memberIds.length; mj++) {
              const sA = sm.get(t[i].memberIds[mi])!, sB = sm.get(t[j].memberIds[mj])!;
              if (Math.abs(sA.score - sB.score) < 1) continue;

              // 교환 후 성격/성향 쏠림 체크
              const countPinI = t[i].memberIds.filter(id => sm.get(id)!.personality === sB.personality).length;
              const countPinJ = t[j].memberIds.filter(id => sm.get(id)!.personality === sA.personality).length;
              // 교환 후 한 팀에 같은 성격이 3명 이상 되면 거부
              if (sA.personality !== sB.personality) {
                if (countPinI + 1 >= 2 || countPinJ + 1 >= 2) continue;
              }

              t[i].memberIds[mi] = sB.id; t[j].memberIds[mj] = sA.id;
              const newAvgs = [
                t[i].memberIds.map(id => sm.get(id)!.score).reduce((a, b) => a + b, 0) / t[i].memberIds.length,
                t[j].memberIds.map(id => sm.get(id)!.score).reduce((a, b) => a + b, 0) / t[j].memberIds.length,
              ];
              const newDev = avgs.map((a, k) => k === i ? Math.abs(newAvgs[0] - globalAvg) : k === j ? Math.abs(newAvgs[1] - globalAvg) : Math.abs(a - globalAvg)).reduce((a, b) => a + b, 0);

              if (newDev < totalDev - 0.1) {
                improved = true;
              } else {
                t[i].memberIds[mi] = sA.id; t[j].memberIds[mj] = sB.id;
              }
            }
          }
        }
      }
      if (!improved) break;
    }
    return t;
  }

  // ════════════════════════════════════════════
  // 3단계: 전체 균형 미세 조정
  // 성적을 크게 해치지 않으면서 성격/성향/성별 개선
  // ════════════════════════════════════════════
  function finetune(t: Team[]): Team[] {
    let bestS = qScore(t, sm);
    for (let round = 0; round < 50; round++) {
      let improved = false;
      for (let i = 0; i < tc; i++) for (let j = i + 1; j < tc; j++)
        for (let mi = 0; mi < t[i].memberIds.length; mi++)
          for (let mj = 0; mj < t[j].memberIds.length; mj++) {
            const a = t[i].memberIds[mi], b = t[j].memberIds[mj];
            const beforeDev = scoreDeviation(t, sm, globalAvg);
            t[i].memberIds[mi] = b; t[j].memberIds[mj] = a;
            const afterDev = scoreDeviation(t, sm, globalAvg);
            // 성적 편차가 3 이상 나빠지면 거부
            if (afterDev > beforeDev + 3) { t[i].memberIds[mi] = a; t[j].memberIds[mj] = b; continue; }
            const ns = qScore(t, sm);
            if (ns > bestS + 0.01) { bestS = ns; improved = true; }
            else { t[i].memberIds[mi] = a; t[j].memberIds[mj] = b; }
          }
      if (!improved) break;
    }
    return t;
  }

  // ════════════════════════════════════════════
  // 실행: 여러 전략 시도 후 최선 선택
  // ════════════════════════════════════════════
  const attempts: Team[][] = [];

  // 전략 1: 성격+성향 균등 → 성적 스왑 → 미세조정
  const a1 = finetune(balanceScores(balancedInit()));
  attempts.push(a1);

  // 전략 2: 성적 스네이크 → 성적 스왑 → 미세조정
  const a2 = finetune(balanceScores(snakeDraft([...students].sort((a, b) => b.score - a.score), teams)));
  attempts.push(a2);

  // 전략 3: 성격 라운드로빈 + 성적 스네이크 → 성적 스왑 → 미세조정
  const a3 = finetune(balanceScores(snakeDraft(roundRobin(students, s => s.personality, ALL_PERSONALITIES), teams)));
  attempts.push(a3);

  // 전략 4: 성향 라운드로빈 → 성적 스왑 → 미세조정
  const a4 = finetune(balanceScores(snakeDraft(roundRobin(students, s => s.trait || '사교적', ALL_TRAITS), teams)));
  attempts.push(a4);

  // 최선 선택
  let best = attempts[0];
  let bestS = qScore(best, sm);
  for (let i = 1; i < attempts.length; i++) {
    const s = qScore(attempts[i], sm);
    if (s > bestS) { best = attempts[i]; bestS = s; }
  }

  // 최종 성적 재확인
  best = balanceScores(best);

  return best;
}

// ──────────────────────────────────────────────
// 스네이크 드래프트
// ──────────────────────────────────────────────
function snakeDraft(ordered: Student[], teams: Team[]): Team[] {
  const t = teams.map(x => ({ ...x, memberIds: [] as string[] }));
  const n = t.length;
  if (n === 0) return t;
  const order: number[] = [];
  let forward = true;
  while (order.length < ordered.length) {
    if (forward) { for (let i = 0; i < n && order.length < ordered.length; i++) order.push(i); }
    else { for (let i = n - 1; i >= 0 && order.length < ordered.length; i--) order.push(i); }
    forward = !forward;
  }
  for (let i = 0; i < ordered.length; i++) {
    let idx = order[i];
    if (t[idx].memberIds.length >= t[idx].maxMembers) {
      let found = false;
      for (let k = 0; k < n; k++) { if (t[k].memberIds.length < t[k].maxMembers) { idx = k; found = true; break; } }
      if (!found) break;
    }
    t[idx].memberIds.push(ordered[i].id);
  }
  return t;
}

function roundRobin(students: Student[], keyFn: (s: Student) => string, allKeys: string[]): Student[] {
  const buckets: Record<string, Student[]> = {};
  allKeys.forEach(k => { buckets[k] = []; });
  students.forEach(s => { buckets[keyFn(s)].push(s); });
  Object.values(buckets).forEach(arr => arr.sort((a, b) => b.score - a.score));
  const result: Student[] = [];
  let go = true, round = 0;
  while (go) { go = false; for (const k of allKeys) { if (round < buckets[k].length) { result.push(buckets[k][round]); go = true; } } round++; }
  return result;
}

// ──────────────────────────────────────────────
// 점수 계산
// ──────────────────────────────────────────────
function qScore(teams: Team[], sm: Map<string, Student>): number {
  const data = teams.map(t => {
    const m = t.memberIds.map(id => sm.get(id)!).filter(Boolean);
    if (m.length === 0) return null;
    const mc = m.length;
    const avgScore = m.reduce((s, x) => s + x.score, 0) / mc;
    const maleRatio = m.filter(x => x.gender === '남').length / mc;
    const pDist: Record<string, number> = {};
    ALL_PERSONALITIES.forEach(p => { pDist[p] = m.filter(x => x.personality === p).length; });
    const tDist: Record<string, number> = {};
    ALL_TRAITS.forEach(tr => { tDist[tr] = m.filter(x => (x.trait || '사교적') === tr).length; });
    return { mc, avgScore, maleRatio, pDist, tDist };
  }).filter(Boolean) as { mc: number; avgScore: number; maleRatio: number; pDist: Record<string, number>; tDist: Record<string, number> }[];

  if (data.length < 2) return 100;

  // 각 항목별 점수 (0~100)
  const sScore = Math.max(1, 100 - rng(data.map(d => d.avgScore)) * 3 - std(data.map(d => d.avgScore)) * 5);
  let pPen = 0;
  ALL_PERSONALITIES.forEach(p => { pPen += std(data.map(d => d.pDist[p] / d.mc)); });
  const pScore = Math.max(1, 100 - pPen * 55);
  let tPen = 0;
  ALL_TRAITS.forEach(tr => { tPen += std(data.map(d => d.tDist[tr] / d.mc)); });
  const tScore = Math.max(1, 100 - tPen * 65);
  const gScore = Math.max(1, 100 - std(data.map(d => d.maleRatio)) * 100);
  const szDiff = rng(data.map(d => d.mc));
  const szScore = Math.max(1, 100 - (szDiff <= 1 ? 0 : szDiff * 15));

  // 로그 기반 곱연산
  const w = { s: 0.3, p: 0.26, t: 0.26, g: 0.1, sz: 0.08 };
  const logSum = w.s * Math.log(sScore) + w.p * Math.log(pScore) + w.t * Math.log(tScore) + w.g * Math.log(gScore) + w.sz * Math.log(szScore);
  return Math.max(0, Math.min(100, Math.exp(logSum)));
}

function scoreDeviation(teams: Team[], sm: Map<string, Student>, globalAvg: number): number {
  return teams.reduce((s, t) => {
    const m = t.memberIds.map(id => sm.get(id)!).filter(Boolean);
    if (m.length === 0) return s;
    return s + Math.abs(m.reduce((a, x) => a + x.score, 0) / m.length - globalAvg);
  }, 0);
}

// ──────────────────────────────────────────────
// 재최적화 (AI 도우미 로컬 폴백)
// ──────────────────────────────────────────────
export function reOptimize(students: Student[], teams: Team[], command: string): { teams: Team[]; changes: string[] } {
  const changes: string[] = [];
  const nt = teams.map(t => ({ ...t, memberIds: [...t.memberIds] }));
  const sm = new Map(students.map(s => [s.id, s]));
  const cmd = command.toLowerCase();
  const tc = nt.length;
  const globalAvg = students.reduce((s, x) => s + x.score, 0) / students.length;
  const beforeBalance = calculateBalanceScore(nt, students);

  type Focus = 'score' | 'gender' | 'personality' | 'trait' | 'leader' | 'all';
  let focus: Focus = 'all';
  if (cmd.includes('성적') || cmd.includes('점수') || cmd.includes('평균')) focus = 'score';
  if (cmd.includes('성별') || cmd.includes('남녀')) focus = 'gender';
  if (cmd.includes('성격') && !cmd.includes('성향')) focus = 'personality';
  if (cmd.includes('성향')) focus = 'trait';
  if (cmd.includes('리더')) focus = 'leader';

  // 리더형 분배
  if (focus === 'leader' || focus === 'all') {
    for (const team of nt) {
      const members = team.memberIds.map(id => sm.get(id)!).filter(Boolean);
      if (members.some(m => m.personality === '리더형')) continue;
      for (const other of nt) {
        if (other.id === team.id) continue;
        const om = other.memberIds.map(id => sm.get(id)!).filter(Boolean);
        const leaders = om.filter(m => m.personality === '리더형');
        if (leaders.length > 1) {
          const l = leaders[0];
          let bestSw: Student | null = null, bestDiff = Infinity;
          for (const m of members) {
            if (m.personality === '리더형') continue;
            const diff = Math.abs(m.score - l.score);
            if (diff < bestDiff) { bestDiff = diff; bestSw = m; }
          }
          if (bestSw) {
            team.memberIds = team.memberIds.filter(id => id !== bestSw!.id); team.memberIds.push(l.id);
            other.memberIds = other.memberIds.filter(id => id !== l.id); other.memberIds.push(bestSw!.id);
            changes.push(`${l.name}(리더형) → ${team.name}, ${bestSw.name} → ${other.name}`);
            break;
          }
        }
      }
    }
  }

  // 집중 스왑
  if (focus === 'score') {
    // 성적 전용 스왑
    for (let round = 0; round < 200; round++) {
      let improved = false;
      for (let i = 0; i < tc; i++) for (let j = i + 1; j < tc; j++)
        for (let mi = 0; mi < nt[i].memberIds.length; mi++) for (let mj = 0; mj < nt[j].memberIds.length; mj++) {
          const sA = sm.get(nt[i].memberIds[mi])!, sB = sm.get(nt[j].memberIds[mj])!;
          if (Math.abs(sA.score - sB.score) < 1) continue;
          const bd = scoreDeviation(nt, sm, globalAvg);
          nt[i].memberIds[mi] = sB.id; nt[j].memberIds[mj] = sA.id;
          if (scoreDeviation(nt, sm, globalAvg) < bd) { improved = true; changes.push(`${sA.name}(${sA.score}) ↔ ${sB.name}(${sB.score})`); }
          else { nt[i].memberIds[mi] = sA.id; nt[j].memberIds[mj] = sB.id; }
        }
      if (!improved) break;
    }
  } else if (focus === 'gender') {
    const globalMR = students.filter(s => s.gender === '남').length / students.length;
    for (let round = 0; round < 50; round++) {
      let swapped = false;
      for (let i = 0; i < tc && !swapped; i++) {
        const mi = nt[i].memberIds.map(id => sm.get(id)!).filter(Boolean);
        const ratio = mi.filter(m => m.gender === '남').length / mi.length;
        if (Math.abs(ratio - globalMR) < 0.1) continue;
        const needMale = ratio < globalMR;
        for (let j = 0; j < tc && !swapped; j++) {
          if (i === j) continue;
          for (let a = 0; a < nt[i].memberIds.length && !swapped; a++) for (let b = 0; b < nt[j].memberIds.length && !swapped; b++) {
            const sA = sm.get(nt[i].memberIds[a])!, sB = sm.get(nt[j].memberIds[b])!;
            if (needMale && sA.gender === '여' && sB.gender === '남' && Math.abs(sA.score - sB.score) < 15) {
              nt[i].memberIds[a] = sB.id; nt[j].memberIds[b] = sA.id;
              changes.push(`${sA.name}(여) ↔ ${sB.name}(남)`); swapped = true;
            } else if (!needMale && sA.gender === '남' && sB.gender === '여' && Math.abs(sA.score - sB.score) < 15) {
              nt[i].memberIds[a] = sB.id; nt[j].memberIds[b] = sA.id;
              changes.push(`${sA.name}(남) ↔ ${sB.name}(여)`); swapped = true;
            }
          }
        }
      }
      if (!swapped) break;
    }
  } else if (focus === 'personality' || focus === 'trait' || focus === 'all') {
    let bestS = qScore(nt, sm);
    for (let round = 0; round < 50; round++) {
      let improved = false;
      for (let i = 0; i < tc; i++) for (let j = i + 1; j < tc; j++)
        for (let mi = 0; mi < nt[i].memberIds.length; mi++) for (let mj = 0; mj < nt[j].memberIds.length; mj++) {
          const a = nt[i].memberIds[mi], b = nt[j].memberIds[mj];
          const sA = sm.get(a)!, sB = sm.get(b)!;
          if (Math.abs(sA.score - sB.score) > 20) continue;
          const bd = scoreDeviation(nt, sm, globalAvg);
          nt[i].memberIds[mi] = b; nt[j].memberIds[mj] = a;
          if (scoreDeviation(nt, sm, globalAvg) > bd + 3) { nt[i].memberIds[mi] = a; nt[j].memberIds[mj] = b; continue; }
          const ns = qScore(nt, sm);
          if (ns > bestS + 0.01) { bestS = ns; improved = true; changes.push(`${sA.name} ↔ ${sB.name}`); }
          else { nt[i].memberIds[mi] = a; nt[j].memberIds[mj] = b; }
        }
      if (!improved) break;
    }
  }

  const afterBalance = calculateBalanceScore(nt, students);
  if (changes.length === 0) changes.push('현재 배정이 이미 최적 상태입니다.');
  else changes.unshift(`균형 ${beforeBalance.overall} → ${afterBalance.overall} (${changes.length}건 변경)`);
  return { teams: nt, changes };
}

// ── 유틸 ──
function mean(a: number[]) { return a.length === 0 ? 0 : a.reduce((s, v) => s + v, 0) / a.length; }
function std(a: number[]) { const m = mean(a); return Math.sqrt(a.reduce((s, v) => s + (v - m) ** 2, 0) / a.length); }
function rng(a: number[]) { return a.length < 2 ? 0 : Math.max(...a) - Math.min(...a); }
function R(n: number) { return Math.round(n * 10) / 10; }
