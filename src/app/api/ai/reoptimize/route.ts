import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';

const client = new Anthropic({ apiKey: process.env.AI_API_KEY });

export async function POST(req: NextRequest) {
  try {
    const { students, teams, command } = await req.json();

    const message = await client.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 4096,
      messages: [
        {
          role: 'user',
          content: `당신은 팀/반 배정 최적화 AI입니다. 현재 배정 상태를 분석하고, 관리자의 명령에 따라 더 균형 잡힌 배정을 제안해주세요.

핵심 원칙:
- 기존 배정을 최대한 유지하면서 최소한의 변경으로 개선
- 평균 성적, 성별 비율, 성격 유형 분포, 나이 분포, 인원 수의 균형을 고려
- 관리자 명령에서 강조된 요소를 우선 최적화

중요: 학생의 특이사항(note)에 장애, 질환, 특수 상황이 적혀있으면 반드시 배려하여 적합한 팀원과 함께 배정해야 합니다.

현재 학생 데이터:
${JSON.stringify(students.map((s: Record<string, unknown>) => ({ id: s.id, name: s.name, gender: s.gender, age: s.age, personality: s.personality, trait: s.trait, score: s.score, note: s.note || '' })), null, 2)}

현재 팀 배정:
${JSON.stringify(teams.map((t: Record<string, unknown>) => ({ id: t.id, name: t.name, maxMembers: t.maxMembers, memberIds: t.memberIds })), null, 2)}

관리자 명령: "${command}"

반드시 아래 JSON 형식으로만 응답하세요:
{
  "teams": [
    { "id": "team-id", "memberIds": ["student-id-1", "student-id-2"] }
  ],
  "changes": ["변경사항 설명 1", "변경사항 설명 2"],
  "explanation": "전체 재배정 이유 요약"
}

teams 배열에는 각 팀의 id와 새로운 memberIds만 포함하세요.
모든 학생이 배정되어야 하며, maxMembers를 초과하지 마세요.`,
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
    console.error('AI reoptimize error:', message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
