import { ScoreSystem } from '@/types';

// 등급 → 정규화 점수 매핑
const GRADE_MAP: Record<string, number> = {
  'A+': 97, 'A': 93, 'A-': 90,
  'B+': 87, 'B': 83, 'B-': 80,
  'C+': 77, 'C': 73, 'C-': 70,
  'D+': 67, 'D': 63, 'D-': 60,
  'F': 30,
  // 한글
  '수': 95, '우': 85, '미': 75, '양': 65, '가': 40,
  // 1~9등급
  '1등급': 96, '2등급': 89, '3등급': 77, '4등급': 60,
  '5등급': 50, '6등급': 40, '7등급': 30, '8등급': 23, '9등급': 11,
};

/**
 * 원본 점수를 0~100 정규화 점수로 변환
 */
export function normalizeScore(
  raw: string | number,
  system: ScoreSystem,
  customMax?: number
): number | null {
  if (raw === '' || raw === null || raw === undefined) return null;

  switch (system) {
    case 'score100': {
      const n = typeof raw === 'number' ? raw : parseFloat(String(raw).replace(/[^0-9.]/g, ''));
      if (isNaN(n)) return null;
      return Math.min(100, Math.max(0, Math.round(n)));
    }
    case 'gpa45': {
      const n = typeof raw === 'number' ? raw : parseFloat(String(raw).replace(/[^0-9.]/g, ''));
      if (isNaN(n)) return null;
      return Math.round((n / 4.5) * 100);
    }
    case 'gpa43': {
      const n = typeof raw === 'number' ? raw : parseFloat(String(raw).replace(/[^0-9.]/g, ''));
      if (isNaN(n)) return null;
      return Math.round((n / 4.3) * 100);
    }
    case 'grade': {
      const s = String(raw).trim().toUpperCase();
      // 직접 매핑
      if (GRADE_MAP[s] !== undefined) return GRADE_MAP[s];
      // 원본 한글 키워드 시도
      const kr = String(raw).trim();
      if (GRADE_MAP[kr] !== undefined) return GRADE_MAP[kr];
      // 숫자등급 (1~9)
      const num = parseInt(String(raw));
      if (!isNaN(num) && num >= 1 && num <= 9) {
        return GRADE_MAP[`${num}등급`] ?? null;
      }
      return null;
    }
    case 'custom': {
      const max = customMax || 100;
      const n = typeof raw === 'number' ? raw : parseFloat(String(raw).replace(/[^0-9.]/g, ''));
      if (isNaN(n)) return null;
      return Math.round((n / max) * 100);
    }
    default:
      return null;
  }
}

/**
 * 정규화 점수(0~100)를 원래 체계로 역변환 (표시용)
 */
export function denormalizeScore(
  normalized: number,
  system: ScoreSystem,
  customMax?: number
): string {
  switch (system) {
    case 'score100':
      return `${normalized}점`;
    case 'gpa45':
      return `${((normalized / 100) * 4.5).toFixed(2)}`;
    case 'gpa43':
      return `${((normalized / 100) * 4.3).toFixed(2)}`;
    case 'grade': {
      if (normalized >= 97) return 'A+';
      if (normalized >= 93) return 'A';
      if (normalized >= 90) return 'A-';
      if (normalized >= 87) return 'B+';
      if (normalized >= 83) return 'B';
      if (normalized >= 80) return 'B-';
      if (normalized >= 77) return 'C+';
      if (normalized >= 73) return 'C';
      if (normalized >= 70) return 'C-';
      if (normalized >= 67) return 'D+';
      if (normalized >= 63) return 'D';
      if (normalized >= 60) return 'D-';
      return 'F';
    }
    case 'custom': {
      const max = customMax || 100;
      return `${((normalized / 100) * max).toFixed(1)}/${max}`;
    }
    default:
      return `${normalized}`;
  }
}
