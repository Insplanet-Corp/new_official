'use client';

import { useEffect, useState, type ReactNode } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { ADMIN_TABS } from '@/components/admin/tabs';
import { isMissingTable } from '@/lib/adminUsers';
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
  /* Auth 계정은 있는데 admin_users 프로필이 없거나 사용여부가 N 인 경우.
     프로필이 없으면 메뉴 권한을 판정할 수 없어 빈 화면만 보이므로, 조용히 두지 않고 막는다.
     (002 마이그레이션의 트리거가 프로필을 자동 생성하지만, 미실행 상태를 대비한 방어) */
  const [blocked, setBlocked] = useState<'no-profile' | 'disabled' | null>(null);

  useEffect(() => {
    if (isLogin) return;
    let alive = true;

    const load = async (userEmail: string | null, userId: string) => {
      setEmail(userEmail);
      const { data, error } = await supabase
        .from('admin_users')
        .select('use_yn')
        .eq('id', userId)
        .maybeSingle();
      if (!alive) return;
      // 테이블이 아직 없으면(마이그레이션 미실행) 막지 않는다 — 각 화면이 안내를 띄운다
      if (error && !isMissingTable(error)) {
        setChecked(true);
        return;
      }
      if (!error) {
        if (!data) setBlocked('no-profile');
        else if ((data as { use_yn: string }).use_yn === 'N') setBlocked('disabled');
      }
      setChecked(true);
    };

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!alive) return;
      if (!session) {
        router.replace(LOGIN_PATH);
        return;
      }
      void load(session.user.email ?? null, session.user.id);
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

  if (blocked) {
    return (
      <div className={s.boot}>
        <div className={s.blocked}>
          <p className={s.blockedTitle}>
            {blocked === 'disabled' ? '사용할 수 없는 계정입니다' : '계정 프로필이 없습니다'}
          </p>
          <p className={s.blockedDesc}>
            {blocked === 'disabled'
              ? '이 계정은 사용여부가 N 으로 설정되어 있습니다. 관리자에게 문의해 주세요.'
              : `로그인은 되었지만 admin_users 에 프로필이 없어 메뉴 권한을 확인할 수 없습니다. ${email ?? ''} 계정의 프로필을 등록해 주세요.`}
          </p>
          <button type="button" className={kit.btn} onClick={signOut}>
            로그아웃
          </button>
        </div>
      </div>
    );
  }

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
