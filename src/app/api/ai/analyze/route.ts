import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';

export async function POST(req: NextRequest) {
  try {
    const client = new Anthropic();
    const { team, members } = await req.json();

    const message = await client.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1024,
      messages: [
        {
          role: 'user',
          content: `당신은 교육 전문가이자 팀 구성 분석가입니다. 아래 팀 구성을 분석해주세요.

팀명: ${team.name}

멤버 (${members.length}명):
${members.map((m: Record<string, unknown>) => `- ${m.name} (${m.gender}, ${m.age}세, 성격:${m.personality}, 성향:${m.trait || '미정'}, 성적:${m.score}점${m.note ? `, 특이사항:${m.note}` : ''})`).join('\n')}

특이사항이 있는 학생이 있다면, 해당 학생이 이 팀에서 어떤 도움을 받을 수 있는지, 팀원 구성이 적절한지도 분석해주세요.

아래 JSON 형식으로만 응답하세요:
{
  "synergy": "이 팀의 성격+성향 조합이 만드는 시너지 효과 (1문장)",
  "traitBalance": "성향 밸런스 분석 (1문장)",
  "scoreInsight": "성적 분포 특징과 학습 관점 (1문장)",
  "demographics": "성별/나이 관점 분석 (1문장)",
  "caution": "주의사항 또는 잠재적 충돌 요인 (1문장)",
  "recommendation": "이 팀에 적합한 활동/수업 추천 (1문장)",
  "oneLineSum": "이 팀을 한마디로 표현 (짧은 별명 느낌, 예: 균형잡힌 실행력 팀)"
}`,
        },
      ],
    });

    const text = message.content[0].type === 'text' ? message.content[0].text : '';
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      return NextResponse.json({ error: 'AI 응답 파싱 실패' }, { status: 500 });
    }

    return NextResponse.json(JSON.parse(jsonMatch[0]));
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Unknown error';
    console.error('AI analyze error:', msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
