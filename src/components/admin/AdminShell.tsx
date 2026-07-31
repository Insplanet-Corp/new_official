'use client';

import { useEffect, useState, type ReactNode } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { ADMIN_TABS } from '@/components/admin/tabs';
import { supabase } from '@/lib/supabase';
import s from './AdminShell.module.css';
import kit from './kit.module.css';

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
  if (!checked) return <div className={s.boot}>세션을 확인하는 중…</div>;

  return (
    <div className={s.root}>
      <header className={s.head}>
        <div className={s.bar}>
          <Link href="/" className={s.brand} aria-label="Insplanet 홈">
            <img src="/assets/ci_logo.svg" alt="Insplanet" />
            <span className={kit.brandTag}>ADMIN</span>
          </Link>
          <span className={s.barSep} />
          <span className={s.barTitle}>콘텐츠 · 문의 관리</span>

          <span className={s.barSpacer} />

          <div className={s.headRight}>
            <Link href="/" className={s.siteLink}>
              사이트 보기
            </Link>
            <div className={s.account} title={email ?? undefined}>
              <span className={kit.avatar}>{(email ?? '?').charAt(0).toUpperCase()}</span>
              <span className={s.accountMail}>{email ?? '알 수 없는 계정'}</span>
            </div>
            <button type="button" className={kit.btn} onClick={signOut}>
              로그아웃
            </button>
          </div>
        </div>

        <nav className={s.tabs} aria-label="관리 메뉴">
          {ADMIN_TABS.map((tab) => {
            const active = pathname === tab.href || pathname.startsWith(`${tab.href}/`);
            return (
              <Link
                key={tab.href}
                href={tab.href}
                className={`${s.tab}${active ? ` ${s.isActive}` : ''}`}
                aria-current={active ? 'page' : undefined}
              >
                {tab.label}
                {tab.sub ? <span className={s.tabSub}>{tab.sub}</span> : null}
              </Link>
            );
          })}
        </nav>
      </header>

      <main className={s.main}>{children}</main>
    </div>
  );
}
