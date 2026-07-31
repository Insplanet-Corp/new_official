'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ADMIN_TABS } from '@/components/admin/tabs';
import { supabase } from '@/lib/supabase';

const HOME = ADMIN_TABS[0].href;

export default function AdminLoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const router = useRouter();

  // 이미 로그인된 상태로 들어오면 곧장 어드민으로
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) router.replace(HOME);
    });
  }, [router]);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    setError(null);

    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      setError(
        error.message === 'Invalid login credentials'
          ? '이메일 또는 비밀번호가 올바르지 않습니다.'
          : error.message,
      );
      setBusy(false);
      return;
    }
    router.replace(HOME);
  };

  return (
    <div className="adm">
      <div className="adm-login">
        <div className="adm-login-card">
          <div className="adm-login-brand">
            <img src="/assets/ci_logo.svg" alt="Insplanet" />
            <span className="adm-brand-tag">ADMIN</span>
          </div>

          <h1 className="adm-login-title">관리자 로그인</h1>
          <p className="adm-login-desc">등록된 관리자 계정으로만 접근할 수 있습니다.</p>

          {error ? <p className="adm-error">{error}</p> : null}

          <form onSubmit={onSubmit} noValidate>
            <div className="adm-field">
              <label className="adm-label" htmlFor="adm-email">
                이메일
              </label>
              <input
                id="adm-email"
                className="adm-input"
                type="email"
                autoComplete="username"
                placeholder="admin@insplanet.co.kr"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>

            <div className="adm-field">
              <label className="adm-label" htmlFor="adm-pw">
                비밀번호
              </label>
              <input
                id="adm-pw"
                className="adm-input"
                type="password"
                autoComplete="current-password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>

            <button type="submit" className="adm-btn adm-btn-primary adm-login-submit" disabled={busy}>
              {busy ? '로그인 중…' : '로그인'}
            </button>
          </form>

          <p className="adm-login-foot">
            <Link href="/">← 인스플래닛 사이트로 돌아가기</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
