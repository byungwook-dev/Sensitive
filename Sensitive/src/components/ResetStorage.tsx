'use client';

import { useEffect } from 'react';

export default function ResetStorage() {
  useEffect(() => {
    const ver = localStorage.getItem('tb-data-version');
    if (ver !== 'v7') {
      localStorage.removeItem('teambuilder-ai-storage');
      localStorage.setItem('tb-data-version', 'v7');
      window.location.reload();
    }
  }, []);
  return null;
}
