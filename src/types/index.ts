export type PersonalityType = '리더형' | '협동형' | '분석형' | '신중형' | '적극형' | '창의형';
export type TraitType = '외향적' | '내향적' | '적극적' | '소심한편' | '사교적' | '독립적' | '감성적' | '이성적';
export type PersonalityMode = 'work' | 'trait';
export type Gender = '남' | '여';

export const WORK_PERSONALITIES: PersonalityType[] = ['리더형', '협동형', '분석형', '신중형', '적극형', '창의형'];
export const TRAIT_TYPES: TraitType[] = ['외향적', '내향적', '적극적', '소심한편', '사교적', '독립적', '감성적', '이성적'];

export interface Student {
  id: string;
  name: string;
  gender: Gender;
  age: number;
  personality: PersonalityType;
  trait?: TraitType;
  score: number;
  note?: string;
}

export interface Team {
  id: string;
  name: string;
  maxMembers: number;
  minMembers: number;
  memberIds: string[];
}

export type AssignmentMode = 'team' | 'class';

export type ScoreSystem = 'score100' | 'gpa45' | 'gpa43' | 'grade' | 'custom';

export const SCORE_SYSTEM_LABELS: Record<ScoreSystem, string> = {
  score100: '100점 만점',
  gpa45: '4.5 GPA',
  gpa43: '4.3 GPA',
  grade: '등급제 (A~F)',
  custom: '직접 입력',
};

export const SCORE_SYSTEM_DESC: Record<ScoreSystem, string> = {
  score100: '0~100점 (학교 시험, 학원 모의고사 등)',
  gpa45: '0.0~4.5 (대학교 학점)',
  gpa43: '0.0~4.3 (대학교 학점)',
  grade: 'A+, A, B+, B, C+, C, D, F',
  custom: '만점을 직접 설정합니다',
};

export interface UploadedRow {
  [key: string]: string | number | undefined;
}

export interface CleanedStudent {
  original: UploadedRow;
  cleaned: Partial<Student>;
  warnings: string[];
  needsReview: boolean;
}

export interface TeamStats {
  memberCount: number;
  avgScore: number;
  maleCount: number;
  femaleCount: number;
  avgAge: number;
  personalityDistribution: Record<string, number>;
  traitDistribution: Record<string, number>;
}

export interface BalanceScore {
  overall: number;
  scoreBalance: number;
  genderBalance: number;
  personalityBalance: number;
  traitBalance: number;
  ageBalance: number;
  sizeBalance: number;
}

export interface StudentGroup {
  id: string;
  name: string;
  students: Student[];
  teams: Team[];
  createdAt: string;
}

export interface Preset {
  id: string;
  name: string;
  mode: AssignmentMode;
  teams: Team[];
  balanceScore: number;
  studentCount: number;
  createdAt: string;
}
