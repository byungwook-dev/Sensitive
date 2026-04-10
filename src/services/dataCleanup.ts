import { Student, PersonalityType, Gender, CleanedStudent, UploadedRow, TraitType } from '@/types';

// ──────────────────────────────────────────────
// 컬럼명 매핑
// ──────────────────────────────────────────────
const COLUMN_MAPPINGS: Record<string, string[]> = {
  name: ['이름', '성명', '학생명', '학생이름', 'name', '성함', '이름(성명)'],
  gender: ['성별', 'gender', 'sex', '남녀'],
  age: ['나이', '연령', 'age', '만나이', '학년'],
  personality: ['성격', '성격유형', '유형', 'personality', 'type', 'mbti', '성격타입', '업무성격'],
  trait: ['성향', 'trait', '성향유형', '성격성향', '타입'],
  score: ['점수', '성적', '총점', '평균', 'score', '평균점수', '총합', '성적(점수)'],
  note: ['비고', '메모', '참고', 'note', 'memo', '특이사항', '기타'],
};

function matchColumn(header: string): string | null {
  const h = header.trim().toLowerCase().replace(/\s/g, '');
  for (const [field, variants] of Object.entries(COLUMN_MAPPINGS)) {
    if (variants.some((v) => h === v.toLowerCase().replace(/\s/g, '') || h.includes(v.toLowerCase().replace(/\s/g, '')))) {
      return field;
    }
  }
  return null;
}

// ──────────────────────────────────────────────
// 값 표준화
// ──────────────────────────────────────────────
function normalizeGender(val: string): Gender | null {
  const v = val.trim().toLowerCase();
  if (['남', '남자', 'm', 'male', '남성'].includes(v)) return '남';
  if (['여', '여자', 'f', 'female', '여성'].includes(v)) return '여';
  return null;
}

function normalizePersonality(val: string): PersonalityType | null {
  const v = val.trim();
  const personalities: PersonalityType[] = ['리더형', '협동형', '분석형', '신중형', '적극형', '창의형'];
  // 정확한 매치
  const found = personalities.find((p) => v.includes(p.replace('형', '')) || v === p);
  if (found) return found;

  // 키워드 기반 추론
  const keywordMap: Record<string, PersonalityType> = {
    '리더': '리더형', '대장': '리더형', '주도': '리더형', '통솔': '리더형',
    '협동': '협동형', '협력': '협동형', '팀워크': '협동형', '배려': '협동형', '도움': '협동형',
    '분석': '분석형', '논리': '분석형', '꼼꼼': '분석형', '체계': '분석형',
    '신중': '신중형', '조심': '신중형', '차분': '신중형', '침착': '신중형', '조용': '신중형',
    '적극': '적극형', '활발': '적극형', '에너지': '적극형', '열정': '적극형', '활동': '적극형',
    '창의': '창의형', '독창': '창의형', '아이디어': '창의형', '상상': '창의형', '예술': '창의형',
  };
  for (const [keyword, personality] of Object.entries(keywordMap)) {
    if (v.includes(keyword)) return personality;
  }
  return null;
}

function normalizeTrait(val: string): TraitType | null {
  const v = val.trim();
  const traits: TraitType[] = ['외향적', '내향적', '적극적', '소심한편', '사교적', '독립적', '감성적', '이성적'];
  const found = traits.find(t => v.includes(t.replace('한편', '')) || v === t);
  if (found) return found;

  const keywordMap: Record<string, TraitType> = {
    '외향': '외향적', '활발': '외향적', '밝은': '외향적',
    '내향': '내향적', '조용': '내향적', '내성': '내향적',
    '적극': '적극적', '능동': '적극적', '열정': '적극적',
    '소심': '소심한편', '수줍': '소심한편', '소극': '소심한편',
    '사교': '사교적', '친화': '사교적', '사람': '사교적',
    '독립': '독립적', '자립': '독립적', '혼자': '독립적',
    '감성': '감성적', '감정': '감성적', '예술': '감성적',
    '이성': '이성적', '논리': '이성적', '합리': '이성적',
  };
  for (const [keyword, trait] of Object.entries(keywordMap)) {
    if (v.includes(keyword)) return trait;
  }
  return null;
}

function normalizeScore(val: string | number): number | null {
  if (typeof val === 'number') return val;
  const num = parseFloat(val.replace(/[^0-9.]/g, ''));
  return isNaN(num) ? null : num;
}

function normalizeAge(val: string | number): number | null {
  if (typeof val === 'number') return val;
  const num = parseInt(val.replace(/[^0-9]/g, ''), 10);
  return isNaN(num) ? null : num;
}

// ──────────────────────────────────────────────
// 메인 정리 함수
// ──────────────────────────────────────────────
export function cleanUploadedData(rows: UploadedRow[]): CleanedStudent[] {
  if (rows.length === 0) return [];

  // 컬럼 매핑 추론
  const headers = Object.keys(rows[0]);
  const columnMap: Record<string, string> = {};
  headers.forEach((h) => {
    const matched = matchColumn(h);
    if (matched) columnMap[h] = matched;
  });

  return rows.map((row, idx) => {
    const warnings: string[] = [];
    const cleaned: Partial<Student> = { id: `upload-${idx + 1}` };

    // 각 필드 매핑 & 표준화
    for (const [originalCol, field] of Object.entries(columnMap)) {
      const val = row[originalCol];
      if (val === undefined || val === null || val === '') {
        warnings.push(`${field} 값이 비어있습니다`);
        continue;
      }

      switch (field) {
        case 'name':
          cleaned.name = String(val).trim();
          break;
        case 'gender': {
          const g = normalizeGender(String(val));
          if (g) { cleaned.gender = g; }
          else { warnings.push(`성별 "${val}"을 인식할 수 없습니다`); }
          break;
        }
        case 'age': {
          const a = normalizeAge(val);
          if (a !== null) { cleaned.age = a; }
          else { warnings.push(`나이 "${val}"을 인식할 수 없습니다`); }
          break;
        }
        case 'personality': {
          const p = normalizePersonality(String(val));
          if (p) { cleaned.personality = p; }
          else { warnings.push(`성격 유형 "${val}"을 분류할 수 없습니다`); }
          break;
        }
        case 'trait': {
          const t = normalizeTrait(String(val));
          if (t) { cleaned.trait = t; }
          else { warnings.push(`성향 "${val}"을 분류할 수 없습니다`); }
          break;
        }
        case 'score': {
          const s = normalizeScore(val);
          if (s !== null) { cleaned.score = s; }
          else { warnings.push(`성적 "${val}"을 인식할 수 없습니다`); }
          break;
        }
        case 'note':
          cleaned.note = String(val).trim();
          break;
      }
    }

    // 필수 필드 누락 체크
    if (!cleaned.name) warnings.push('이름이 누락되었습니다');
    if (!cleaned.gender) warnings.push('성별이 누락되었습니다');
    if (!cleaned.age) warnings.push('나이가 누락되었습니다');
    if (!cleaned.score && cleaned.score !== 0) warnings.push('성적이 누락되었습니다');
    if (!cleaned.personality) warnings.push('성격 유형이 누락되었습니다');
    if (!cleaned.trait) warnings.push('성향이 누락되었습니다');

    return {
      original: row,
      cleaned,
      warnings,
      needsReview: warnings.length > 0,
    };
  });
}

export function cleanedToStudents(cleaned: CleanedStudent[]): Student[] {
  return cleaned
    .filter((c) => c.cleaned.name && c.cleaned.gender && c.cleaned.age && c.cleaned.score !== undefined && c.cleaned.personality)
    .map((c, i) => ({
      id: c.cleaned.id || `imported-${i + 1}`,
      name: c.cleaned.name!,
      gender: c.cleaned.gender!,
      age: c.cleaned.age!,
      personality: c.cleaned.personality!,
      trait: c.cleaned.trait,
      score: c.cleaned.score!,
      note: c.cleaned.note,
    }));
}
