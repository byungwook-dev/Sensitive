import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export async function POST(req: NextRequest) {
  try {
    const { students, teams } = await req.json();

    // 전체 통계 미리 계산해서 AI에게 제공
    const totalStudents = students.length;
    const totalMale = students.filter((s: Record<string, unknown>) => s.gender === '남').length;
    const totalFemale = totalStudents - totalMale;
    const avgScore = (students.reduce((sum: number, s: Record<string, unknown>) => sum + (s.score as number), 0) / totalStudents).toFixed(1);
    const idealPerTeam = Math.ceil(totalStudents / teams.length);
    const idealMalePerTeam = Math.round(totalMale / teams.length);
    const idealFemalePerTeam = Math.round(totalFemale / teams.length);

    // 성격 분포
    const personalityCounts: Record<string, number> = {};
    students.forEach((s: Record<string, unknown>) => {
      const p = s.personality as string;
      personalityCounts[p] = (personalityCounts[p] || 0) + 1;
    });

    const message = await client.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 4096,
      messages: [
        {
          role: 'user',
          content: `당신은 교육기관의 팀/반 배정 최적화 전문가입니다.
학생 데이터를 분석하여 **모든 팀이 최대한 동일한 조건**을 갖도록 배정해야 합니다.

═══ 현재 데이터 요약 ═══
- 총 학생: ${totalStudents}명 (남 ${totalMale}, 여 ${totalFemale})
- 전체 평균 성적: ${avgScore}점
- 팀 수: ${teams.length}개
- 이상적 팀당 인원: ${idealPerTeam}명 (남 ~${idealMalePerTeam}, 여 ~${idealFemalePerTeam})
- 성격 분포: ${JSON.stringify(personalityCounts)}

═══ 배정 원칙 (모두 만족해야 함) ═══

1. **성적 균형 (가장 중요)**
   - 각 팀의 평균 성적이 전체 평균(${avgScore})에 최대한 가까워야 함
   - 팀 간 평균 성적 차이가 3점 이내를 목표로 함
   - 상위권/중위권/하위권 학생이 각 팀에 고르게 분배되어야 함

2. **성별 균형**
   - 각 팀의 남녀 비율이 전체 비율(${totalMale}:${totalFemale})과 유사해야 함
   - 한 팀에 한 성별만 몰리면 절대 안 됨

3. **성격 유형 분산**
   - 6가지 성격 유형(리더형/협동형/분석형/신중형/적극형/창의형)이 각 팀에 골고루 분배
   - 특히 리더형은 각 팀에 최소 1명 배치를 시도
   - 같은 성격이 한 팀에 3명 이상 몰리지 않게

4. **나이 균형**
   - 각 팀의 평균 나이가 비슷해야 함

5. **인원 균형**
   - 팀 간 인원 차이는 최대 1명까지만 허용
   - maxMembers 절대 초과 금지

6. **전원 배정**
   - 모든 학생이 반드시 어떤 팀에 배정되어야 함
   - 누락 학생이 있으면 안 됨

7. **특이사항 배려 (매우 중요)**
   - 학생의 note(특이사항)에 장애, 질환, 심리적 어려움, 특수 상황 등이 적혀있을 수 있음
   - 이 내용을 반드시 읽고 해당 학생에게 도움이 될 수 있는 팀원과 함께 배정해야 함
   - 예: 지체장애 → 배려심 있는 협동형/사교적 학생과 같은 팀
   - 예: ADHD/과잉행동 → 차분한 신중형 학생과 함께
   - 예: 소심/왕따경험 → 사교적/외향적 학생이 있는 팀
   - 예: 한국어 서툼 → 배려심 있고 사교적인 학생과 함께
   - 어떤 자연어든 AI가 맥락을 이해하고 최선의 판단을 해야 함
   - 특이사항이 없는 학생은 일반 원칙대로 배정

═══ 학생 데이터 ═══
${JSON.stringify(students.map((s: Record<string, unknown>) => ({ id: s.id, name: s.name, gender: s.gender, age: s.age, personality: s.personality, trait: s.trait, score: s.score, note: s.note || '' })), null, 2)}

═══ 팀 정보 ═══
${JSON.stringify(teams.map((t: Record<string, unknown>) => ({ id: t.id, name: t.name, maxMembers: t.maxMembers })), null, 2)}

═══ 출력 형식 ═══
반드시 아래 JSON만 출력하세요:
{
  "teams": [
    { "id": "팀id", "memberIds": ["학생id1", "학생id2", ...] }
  ],
  "explanation": "배정 전략과 결과 요약 (각 팀의 평균 성적, 남녀 수, 핵심 특징을 포함해서 3~4문장)"
}`,
        },
      ],
    });

    const text = message.content[0].type === 'text' ? message.content[0].text : '';

    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      return NextResponse.json({ error: 'AI 응답 파싱 실패', raw: text }, { status: 500 });
    }

    const result = JSON.parse(jsonMatch[0]);
    return NextResponse.json(result);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('AI assign error:', message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
