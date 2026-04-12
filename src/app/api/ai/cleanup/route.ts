import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';

const client = new Anthropic({ apiKey: process.env.AI_API_KEY });

export async function POST(req: NextRequest) {
  try {
    const { rows } = await req.json();

    const message = await client.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 4096,
      messages: [
        {
          role: 'user',
          content: `당신은 학생 데이터 정리 AI입니다. 아래 원본 데이터를 분석하여 표준화된 학생 데이터로 변환해주세요.

표준 필드:
- name: 학생 이름 (문자열)
- gender: "남" 또는 "여"
- age: 나이 (숫자)
- personality: "리더형", "협동형", "분석형", "신중형", "적극형", "창의형" 중 하나 (메모/설명에서 추론)
- trait: "외향적", "내향적", "적극적", "소심한편", "사교적", "독립적", "감성적", "이성적" 중 하나 (메모/설명에서 추론)
- score: 성적 점수 (0~100 숫자)
- note: 비고 (선택)

규칙:
1. 컬럼명이 다양할 수 있음 (이름/성명/학생명, 점수/성적/총점, 성격메모 등) → 표준 필드에 매핑
2. 성별: 남/남자/M/male → "남", 여/여자/F/female → "여"
3. personality 추론: 리더십/주도적 → 리더형, 협동/배려/팀워크 → 협동형, 논리/분석/꼼꼼 → 분석형, 조심/차분/신중 → 신중형, 적극/활발/에너지 → 적극형, 창의/독창/상상/예술 → 창의형
4. trait 추론: 활발/사교적 → 외향적, 조용/내성적 → 내향적, 적극적/에너지 → 적극적, 소심/조심 → 소심한편, 친구많음/사교 → 사교적, 혼자/독립 → 독립적, 감성/예술/감정 → 감성적, 논리/이성 → 이성적
5. 성격/성향 메모가 없으면 personality과 trait을 null로, warnings에 추가, needsReview: true
6. 누락/애매한 값은 warnings 배열에 설명 추가

원본 데이터 (${rows.length}행):
${JSON.stringify(rows.slice(0, 50), null, 2)}

반드시 아래 JSON 배열 형식으로만 응답하세요. 다른 텍스트 없이:
[
  {
    "cleaned": { "name": "홍길동", "gender": "남", "age": 15, "personality": "리더형", "trait": "외향적", "score": 85, "note": "" },
    "warnings": [],
    "needsReview": false
  }
]`,
        },
      ],
    });

    const text = message.content[0].type === 'text' ? message.content[0].text : '';
    console.log('AI cleanup response length:', text.length);

    const jsonMatch = text.match(/\[[\s\S]*\]/);
    if (!jsonMatch) {
      console.error('AI cleanup: no JSON found in response');
      return NextResponse.json({ error: 'AI 응답 파싱 실패' }, { status: 500 });
    }

    const cleaned = JSON.parse(jsonMatch[0]);
    console.log('AI cleanup: parsed', cleaned.length, 'rows');
    return NextResponse.json({ cleaned });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Unknown error';
    console.error('AI cleanup error:', msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
