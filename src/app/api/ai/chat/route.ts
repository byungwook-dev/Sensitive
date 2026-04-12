import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';

export async function POST(req: NextRequest) {
  try {
    const apiKey = process.env['AI_API_KEY'];
    const client = new Anthropic({ apiKey });
    const { messages, context } = await req.json();

    // 학생 ID → 이름 매핑
    const studentMap = new Map(context.students.map((s: Record<string, unknown>) => [s.id, s]));

    // 팀별 멤버를 이름으로 변환
    const teamsWithNames = context.teams.map((t: Record<string, unknown>) => {
      const memberIds = (t.memberIds as string[]) || [];
      const members = memberIds.map((id: string) => {
        const s = studentMap.get(id) as Record<string, unknown> | undefined;
        return s ? `${s.name}(${s.gender},${s.age}세,${s.personality},${s.trait || '미정'},${s.score}점${s.note ? ',특이:' + s.note : ''})` : id;
      });
      return { name: t.name, members, count: members.length };
    });

    const assignedIds = new Set(context.teams.flatMap((t: Record<string, unknown>) => (t.memberIds as string[]) || []));
    const unassigned = context.students.filter((s: Record<string, unknown>) => !assignedIds.has(s.id as string));

    const systemPrompt = `당신은 TeamBuilder AI의 데이터 분석 어시스턴트입니다.

절대 규칙 (반드시 지켜야 함):
1. 아래 제공된 데이터에만 기반하여 답변하세요
2. 데이터에 없는 학생 이름, 팀 이름, 점수를 절대 만들어내지 마세요
3. 모르는 것은 "현재 데이터에서 확인할 수 없습니다"라고 답하세요
4. 숫자를 말할 때는 반드시 실제 데이터에서 계산하세요
5. 추측하지 마세요. 사실만 말하세요

현재 데이터:

총 학생 수: ${context.students.length}명
미배정 학생: ${unassigned.length}명
팀/반 수: ${context.teams.length}개

전체 학생 목록:
${context.students.map((s: Record<string, unknown>) => `- ${s.name} | ${s.gender} | ${s.age}세 | ${s.personality} | ${s.trait || '미정'} | ${s.score}점${s.note ? ' | 특이: ' + s.note : ''}`).join('\n')}

팀/반 배정 현황:
${teamsWithNames.length > 0 ? teamsWithNames.map((t: { name: unknown; count: number; members: string[] }) => `[${t.name}] (${t.count}명)\n${t.members.map((m: string) => '  - ' + m).join('\n')}`).join('\n\n') : '배정된 팀이 없습니다'}

${unassigned.length > 0 ? `미배정 학생:\n${unassigned.map((s: Record<string, unknown>) => `- ${s.name}`).join('\n')}` : ''}

답변 규칙:
- 한국어로 답변
- 짧고 명확하게 (3~5문장)
- 반드시 실제 데이터의 수치만 사용
- 계산이 필요하면 직접 계산해서 정확한 수치 제시`;

    const response = await client.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1024,
      system: systemPrompt,
      messages: messages.map((m: { role: string; content: string }) => ({
        role: m.role as 'user' | 'assistant',
        content: m.content,
      })),
    });

    const text = response.content[0].type === 'text' ? response.content[0].text : '';
    return NextResponse.json({ reply: text });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('AI chat error:', message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
