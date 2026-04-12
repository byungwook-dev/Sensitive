'use client';

import { usePathname, useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';

const pageTitles: Record<string, { title: string; description: string }> = {
  '/': { title: 'Dashboard', description: '팀/반 배정 현황을 한눈에 확인하세요' },
  '/students': { title: '학생 관리', description: '학생 데이터를 관리하고 편집하세요' },
  '/upload': { title: '데이터 업로드', description: 'Excel/CSV 파일을 업로드하고 AI가 데이터를 정리합니다' },
  '/assignment': { title: '팀/반 배정', description: 'AI가 균형 잡힌 팀/반 구성을 자동으로 설계합니다' },
  '/board': { title: '배정 보드', description: '모든 팀/반 배정을 한눈에 확인합니다' },
  '/settings': { title: '설정', description: '서비스 설정을 관리합니다' },
};

interface UserInfo {
  name: string;
  email: string;
  organization: string;
}

export default function Header() {
  const pathname = usePathname();
  const router = useRouter();
  const page = pageTitles[pathname] || { title: 'TeamBuilder AI', description: '' };
  const [user, setUser] = useState<UserInfo | null>(null);
  const [showMenu, setShowMenu] = useState(false);
  const [aiActive, setAiActive] = useState(false);

  useEffect(() => {
    fetch('/api/auth/me').then(res => res.ok ? res.json() : null).then(data => {
      if (data?.user) setUser(data.user);
    }).catch(() => {});

    fetch('/api/ai/analyze', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ team: { name: 'test' }, members: [] }) })
      .then(res => setAiActive(res.ok))
      .catch(() => setAiActive(false));
  }, []);

  const handleLogout = async () => {
    await fetch('/api/auth/me', { method: 'DELETE' });
    router.push('/login');
    router.refresh();
  };

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-slate-200 bg-white/80 px-8 backdrop-blur-sm">
      <div>
        <h2 className="text-lg font-bold text-slate-900">{page.title}</h2>
        <p className="text-xs text-slate-500">{page.description}</p>
      </div>
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2 rounded-full bg-slate-100 px-4 py-2">
          <div className={`h-2 w-2 rounded-full ${aiActive ? 'bg-emerald-500 animate-pulse' : 'bg-red-400'}`} />
          <span className="text-xs font-medium text-slate-600">{aiActive ? 'AI 엔진 활성' : 'AI 엔진 비활성'}</span>
        </div>
        {/* 사용자 */}
        <div className="relative">
          <button
            onClick={() => setShowMenu(!showMenu)}
            className="flex items-center gap-2 rounded-full bg-gradient-to-br from-blue-600 to-indigo-600 pl-3 pr-1 py-1 transition hover:shadow-md"
          >
            <span className="text-xs font-semibold text-white">{user?.name || '게스트'}</span>
            <div className="flex h-7 w-7 items-center justify-center rounded-full bg-white/20 text-xs font-bold text-white">
              {user?.name?.[0] || 'G'}
            </div>
          </button>
          {showMenu && (
            <div className="absolute right-0 top-11 w-56 rounded-xl border border-slate-200 bg-white p-2 shadow-xl z-50">
              {user && (
                <div className="px-3 py-2 border-b border-slate-100 mb-1">
                  <p className="text-sm font-semibold text-slate-800">{user.name}</p>
                  <p className="text-[11px] text-slate-400">{user.email}</p>
                  {user.organization && <p className="text-[11px] text-blue-500">{user.organization}</p>}
                </div>
              )}
              <button
                onClick={handleLogout}
                className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-red-600 transition hover:bg-red-50"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
                로그아웃
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
