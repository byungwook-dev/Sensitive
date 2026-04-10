import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { Student, Team, AssignmentMode, ScoreSystem, Preset, StudentGroup } from '@/types';
// import { dummyStudents } from '@/utils/dummyData';

interface AppState {
  students: Student[];
  teams: Team[];
  assignmentMode: AssignmentMode;
  scoreSystem: ScoreSystem;
  customMax: number;
  balanceWeights: { score: number; personality: number; trait: number; gender: number; age: number; size: number };
  setBalanceWeights: (weights: { score: number; personality: number; trait: number; gender: number; age: number; size: number }) => void;
  presets: Preset[];
  setScoreSystem: (system: ScoreSystem) => void;
  setCustomMax: (max: number) => void;
  setStudents: (students: Student[]) => void;
  addStudent: (student: Student) => void;
  updateStudent: (id: string, student: Partial<Student>) => void;
  deleteStudent: (id: string) => void;
  setTeams: (teams: Team[]) => void;
  addTeam: (team: Team) => void;
  updateTeam: (id: string, team: Partial<Team>) => void;
  deleteTeam: (id: string) => void;
  setAssignmentMode: (mode: AssignmentMode) => void;
  moveStudent: (studentId: string, fromTeamId: string | null, toTeamId: string | null, index?: number) => void;
  savePreset: (name: string, balanceScore: number) => void;
  loadPreset: (id: string) => void;
  deletePreset: (id: string) => void;
  renamePreset: (id: string, name: string) => void;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  teamAnalyses: Record<string, any>;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  setTeamAnalyses: (analyses: Record<string, any>) => void;
  studentGroups: StudentGroup[];
  activeGroupId: string | null;
  addStudentGroup: (group: StudentGroup) => void;
  deleteStudentGroup: (id: string) => void;
  setActiveGroup: (id: string | null) => void;
  renameStudentGroup: (id: string, name: string) => void;
}

export const useStore = create<AppState>()(
  persist(
    (set, get) => ({
      students: [],
      teams: [],
      assignmentMode: 'team',
      scoreSystem: 'score100' as ScoreSystem,
      customMax: 100,
      balanceWeights: { score: 30, personality: 26, trait: 26, gender: 10, age: 4, size: 4 },
      setBalanceWeights: (weights) => set({ balanceWeights: weights }),
      teamAnalyses: {},
      setTeamAnalyses: (analyses) => set({ teamAnalyses: analyses }),
      studentGroups: [],
      activeGroupId: null,
      addStudentGroup: (group) => set((s) => ({ studentGroups: [...s.studentGroups, group] })),
      deleteStudentGroup: (id) => set((s) => ({
        studentGroups: s.studentGroups.filter((g) => g.id !== id),
        activeGroupId: s.activeGroupId === id ? null : s.activeGroupId,
      })),
      setActiveGroup: (id) => {
        const { students, teams, studentGroups, activeGroupId } = get();
        // 현재 데이터를 기존 그룹에 자동 저장
        if (activeGroupId) {
          const updated = studentGroups.map(g => g.id === activeGroupId ? { ...g, students: [...students], teams: [...teams] } : g);
          set({ studentGroups: updated });
        }
        // 새 그룹 불러오기
        if (id) {
          const group = studentGroups.find(g => g.id === id);
          if (group) {
            set({ students: [...group.students], teams: [...group.teams], activeGroupId: id });
            return;
          }
        }
        set({ activeGroupId: id });
      },
      renameStudentGroup: (id, name) => set((s) => ({
        studentGroups: s.studentGroups.map((g) => g.id === id ? { ...g, name } : g),
      })),
      presets: [],

      setScoreSystem: (system) => set({ scoreSystem: system }),
      setCustomMax: (max) => set({ customMax: max }),

      setStudents: (students) => set({ students }),
      addStudent: (student) => set((s) => ({ students: [...s.students, student] })),
      updateStudent: (id, data) =>
        set((s) => ({
          students: s.students.map((st) => (st.id === id ? { ...st, ...data } : st)),
        })),
      deleteStudent: (id) =>
        set((s) => ({
          students: s.students.filter((st) => st.id !== id),
          teams: s.teams.map((t) => ({
            ...t,
            memberIds: t.memberIds.filter((mid) => mid !== id),
          })),
        })),

      setTeams: (teams) => set({ teams }),
      addTeam: (team) => set((s) => ({ teams: [...s.teams, team] })),
      updateTeam: (id, data) =>
        set((s) => ({
          teams: s.teams.map((t) => (t.id === id ? { ...t, ...data } : t)),
        })),
      deleteTeam: (id) => set((s) => ({ teams: s.teams.filter((t) => t.id !== id) })),

      setAssignmentMode: (mode) => set({ assignmentMode: mode }),

      moveStudent: (studentId, fromTeamId, toTeamId, index) =>
        set((s) => {
          const newTeams = s.teams.map((t) => ({ ...t, memberIds: [...t.memberIds] }));
          if (fromTeamId) {
            const fromTeam = newTeams.find((t) => t.id === fromTeamId);
            if (fromTeam) fromTeam.memberIds = fromTeam.memberIds.filter((id) => id !== studentId);
          }
          if (toTeamId) {
            const toTeam = newTeams.find((t) => t.id === toTeamId);
            if (toTeam) {
              if (index !== undefined) toTeam.memberIds.splice(index, 0, studentId);
              else toTeam.memberIds.push(studentId);
            }
          }
          return { teams: newTeams };
        }),

      savePreset: (name, balanceScore) => {
        const { teams, assignmentMode, students } = get();
        const preset: Preset = {
          id: `preset-${Date.now()}`,
          name,
          mode: assignmentMode,
          teams: teams.map((t) => ({ ...t, memberIds: [...t.memberIds] })),
          balanceScore,
          studentCount: students.length,
          createdAt: new Date().toISOString(),
        };
        set((s) => ({ presets: [preset, ...s.presets] }));
      },

      loadPreset: (id) => {
        const { presets } = get();
        const preset = presets.find((p) => p.id === id);
        if (preset) {
          set({
            teams: preset.teams.map((t) => ({ ...t, memberIds: [...t.memberIds] })),
            assignmentMode: preset.mode,
          });
        }
      },

      deletePreset: (id) => set((s) => ({ presets: s.presets.filter((p) => p.id !== id) })),

      renamePreset: (id, name) =>
        set((s) => ({
          presets: s.presets.map((p) => (p.id === id ? { ...p, name } : p)),
        })),
    }),
    {
      name: 'teambuilder-ai-storage',
    }
  )
);
