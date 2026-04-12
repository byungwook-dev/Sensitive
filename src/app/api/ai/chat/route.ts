import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';

export async function POST(req: NextRequest) {
  try {
    const client = new Anthropic();
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

    const systemPrompt = `당신은 TeamBuilder AI의 만능 어시스턴트입니다. 이 앱의 모든 기능과 데이터를 알고 있습니다.

## 앱 전체 기능 안내 (사용자가 물어보면 설명)

### 페이지 구성
- **대시보드** (/) : 전체 요약, 균형 점수, 팀별 비교, 성격/성향 분포 차트, AI 분석 카드
- **학생 관리** (/students) : 학생 목록, 필터링, 인라인 편집, 그룹 관리, 특이사항 입력
- **데이터 업로드** (/upload) : 엑셀/CSV 업로드, AI 데이터 정제, 컬럼 매핑
- **팀/반 배정** (/assignment) : 팀 생성, AI 자동배정, 드래그앤드롭, 균형 점수 상세
- **배정 보드** (/board) : 칸반 스타일 배정 보기, 팀 클릭 시 AI 분석
- **설정** (/settings) : 성적 체계 선택, 균형 가중치 조절, DB 동기화

### 핵심 기능
- **AI 자동배정**: 4가지 전략 병행 실행 → 최적 결과 채택. 시너지 매트릭스(벨빈 팀역할론) 기반.
- **균형 점수**: 성적균형 + 성별균형 + 성격시너지 + 성향시너지 + 나이균형 + 인원균형 (로그 곱연산)
- **성격 시너지**: 리더+협동 ↑, 분석+창의 ↑, 같은 유형 중복 ↓
- **성향 시너지**: 외향+내향 ↑, 감성+이성 ↑, 같은 성향 중복 ↓
- **성적 균형**: 팀 간 평균 차이 + ��� 내 편차 균형 (평균 같아도 30+100 ≠ 60+70)
- **성적 체계**: 100점/4.5GPA/4.3GPA/등급제/직접입력 → 내부 100점 변환
- **특이사항**: AI가 읽고 배정에 반영 (장애, 언어, 분리 요청 등)
- **AI 재최적화**: 자연어 명령으로 배정 수정 ("성적 균형 맞춰줘", "리더형 각 팀 1명씩")
- **AI 팀 분석**: 팀별 시너지, 성향, 성적, 인구통계, 주의사항, 추천 활동

### 페이지 이동 기능
사용자가 특정 페이지로 이동하고 싶어하면, 답변 마지막에 [navigate:경로] 태그를 넣으세요.
예시:
- "학생 관리로 가줘" → [navigate:/students]
- "설정 열어줘" → [navigate:/settings]
- "배정 페이지로" → [navigate:/assignment]
- "대시보드 보여줘" → [navigate:/]
- "업로드 하러 가자" → [navigate:/upload]
- "보드 보여줘" → [navigate:/board]
반드시 답변 텍스트 마지막 줄에 [navigate:경로] 형식으로 넣으세요. 사용자가 이동을 원할 때만 넣으세요.

## 절대 규칙
1. 아래 제공된 데이터에만 기반하여 답변하세요
2. 데이터에 없는 학생 이름, 팀 이름, 점수를 절대 만들어내지 마세요
3. 모르는 것은 "현재 데이터에서 확인할 수 없습니다"라고 답하세요
4. 숫자를 말할 때는 반드시 실제 데이터에서 계산하세요
5. 추측하지 마세요. 사실만 말하세요

## 현재 데이터

총 학생 수: ${context.students.length}명
미배정 학생: ${unassigned.length}명
팀/반 수: ${context.teams.length}개

전체 학생 목록:
${context.students.map((s: Record<string, unknown>) => `- ${s.name} | ${s.gender} | ${s.age}세 | ${s.personality} | ${s.trait || '미정'} | ${s.score}점${s.note ? ' | 특이: ' + s.note : ''}`).join('\n')}

팀/반 배정 현황:
${teamsWithNames.length > 0 ? teamsWithNames.map((t: { name: unknown; count: number; members: string[] }) => `[${t.name}] (${t.count}명)\n${t.members.map((m: string) => '  - ' + m).join('\n')}`).join('\n\n') : '배정된 팀이 없습니다'}

${unassigned.length > 0 ? `미배정 학생:\n${unassigned.map((s: Record<string, unknown>) => `- ${s.name}`).join('\n')}` : ''}

## 답변 규칙
- 한국어로 답변
- 짧고 명확하게 (3~5문장)
- 반드시 실제 데이터의 수치만 사용
- 계산이 필요하면 직접 계산해서 정확한 수치 제시
- 앱 기능 질문에는 위 기능 안내를 참고하여 친절하게 설명`;

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
