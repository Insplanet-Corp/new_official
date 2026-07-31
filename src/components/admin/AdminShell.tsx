'use client';

import { useEffect, useState, type ReactNode } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { ADMIN_TABS } from '@/components/admin/tabs';
import { supabase } from '@/lib/supabase';

const LOGIN_PATH = '/admin/login';

/* Chrome for every /admin route: session gate + header + tab bar.
   /admin/login renders bare (it's the way *in*, so it can't sit behind the gate). */
export default function AdminShell({ children }: { children: ReactNode }) {
  const pathname = usePathname() ?? '';
  const router = useRouter();
  const isLogin = pathname === LOGIN_PATH;

  const [email, setEmail] = useState<string | null>(null);
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    if (isLogin) return;
    let alive = true;

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!alive) return;
      if (!session) {
        router.replace(LOGIN_PATH);
        return;
      }
      setEmail(session.user.email ?? null);
      setChecked(true);
    });

    // signing out in another tab (or a token expiring) kicks this tab back to the login page
    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!alive) return;
      if (!session) router.replace(LOGIN_PATH);
      else setEmail(session.user.email ?? null);
    });

    return () => {
      alive = false;
      sub.subscription.unsubscribe();
    };
  }, [isLogin, router]);

  const signOut = async () => {
    await supabase.auth.signOut();
    router.replace(LOGIN_PATH);
  };

  if (isLogin) return <>{children}</>;
  if (!checked) return <div className="adm-boot">세션을 확인하는 중…</div>;

  return (
    <div className="adm">
      <header className="adm-head">
        <div className="adm-bar">
          <Link href="/" className="adm-brand" aria-label="Insplanet 홈">
            <img src="/assets/ci_logo.svg" alt="Insplanet" />
            <span className="adm-brand-tag">ADMIN</span>
          </Link>
          <span className="adm-bar-sep" />
          <span className="adm-bar-title">콘텐츠 · 문의 관리</span>

          <span className="adm-bar-spacer" />

          <div className="adm-head-right">
            <Link href="/" className="adm-btn adm-btn-ghost">
              사이트 보기
            </Link>
            <div className="adm-account" title={email ?? undefined}>
              <span className="adm-avatar">{(email ?? '?').charAt(0).toUpperCase()}</span>
              <span className="adm-account-mail">{email ?? '알 수 없는 계정'}</span>
            </div>
            <button type="button" className="adm-btn" onClick={signOut}>
              로그아웃
            </button>
          </div>
        </div>

        <nav className="adm-tabs" aria-label="관리 메뉴">
          {ADMIN_TABS.map((tab) => {
            const active = pathname === tab.href || pathname.startsWith(`${tab.href}/`);
            return (
              <Link
                key={tab.href}
                href={tab.href}
                className={`adm-tab${active ? ' is-active' : ''}`}
                aria-current={active ? 'page' : undefined}
              >
                {tab.label}
                {tab.sub ? <span className="adm-tab-sub">{tab.sub}</span> : null}
              </Link>
            );
          })}
        </nav>
      </header>

      <main className="adm-main">{children}</main>
    </div>
  );
}
