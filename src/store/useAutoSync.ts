'use client';

import { useEffect, useRef } from 'react';
import { useStore } from './useStore';

export function useAutoSync() {
  const students = useStore((s) => s.students);
  const teams = useStore((s) => s.teams);
  const presets = useStore((s) => s.presets);
  const studentGroups = useStore((s) => s.studentGroups);
  const balanceWeights = useStore((s) => s.balanceWeights);
  const scoreSystem = useStore((s) => s.scoreSystem);
  const customMax = useStore((s) => s.customMax);
  const teamAnalyses = useStore((s) => s.teamAnalyses);

  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const initialRef = useRef(true);

  useEffect(() => {
    if (initialRef.current) {
      initialRef.current = false;
      return;
    }

    if (timerRef.current) clearTimeout(timerRef.current);

    timerRef.current = setTimeout(async () => {
      try {
        await fetch('/api/db/sync', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            students,
            teams,
            presets,
            studentGroups,
            balanceWeights,
            scoreSystem,
            customMax,
            teamAnalyses,
          }),
        });
      } catch {
        // 네트워크 오류 시 무시
      }
    }, 2000);

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [students, teams, presets, studentGroups, balanceWeights, scoreSystem, customMax, teamAnalyses]);
}
