'use client';

import { useEffect, useMemo, useState } from 'react';
import { Badge, Empty, Note, PageHead, Search, Skeleton, Stats, fmtDate, type BadgeTone } from '@/components/admin/ui';
import { supabase } from '@/lib/supabase';
import kit from '@/components/admin/kit.module.css';

const btnPrimary = `${kit.btn} ${kit.btnPrimary}`;
const btnSm = `${kit.btn} ${kit.btnSm}`;

type AdminUser = {
  id: string;
  created_at: string;
  email: string | null;
  name: string | null;
  role: string | null;
  last_sign_in_at: string | null;
};

const ROLE_TONE: Record<string, BadgeTone> = { owner: 'green', admin: 'blue', viewer: 'plain' };

export default function UsersPage() {
  const [rows, setRows] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  /** admin_users 프로필 테이블이 아직 없을 때 */
  const [tableMissing, setTableMissing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [q, setQ] = useState('');

  useEffect(() => {
    let alive = true;
    (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      const { data, error } = await supabase
        .from('admin_users')
        .select('*')
        .order('created_at', { ascending: false });
      if (!alive) return;

      if (error) {
        if (/does not exist|schema cache|42P01|PGRST205/i.test(`${error.code} ${error.message}`)) {
          setTableMissing(true);
          // 테이블이 없어도 화면이 비지 않도록 현재 로그인한 계정만 보여준다
          if (session?.user) {
            setRows([
              {
                id: session.user.id,
                created_at: session.user.created_at,
                email: session.user.email ?? null,
                name: null,
                role: 'admin',
                last_sign_in_at: session.user.last_sign_in_at ?? null,
              },
            ]);
          }
        } else {
          setError(error.message);
        }
      } else {
        setRows((data ?? []) as AdminUser[]);
      }
      setLoading(false);
    })();
    return () => {
      alive = false;
    };
  }, []);

  const visible = useMemo(() => {
    const needle = q.trim().toLowerCase();
    if (!needle) return rows;
    return rows.filter((r) => [r.email, r.name].some((v) => (v ?? '').toLowerCase().includes(needle)));
  }, [rows, q]);

  return (
    <>
      <PageHead
        href="/admin/users"
        actions={
          <button type="button" className={btnPrimary} disabled>
            + 관리자 초대
          </button>
        }
      />

      {tableMissing ? (
        <Note warn>
          <span>
            <b>admin_users 테이블이 아직 없습니다</b> — 브라우저의 anon 키로는 Supabase Auth 사용자
            목록을 조회할 수 없습니다(service-role 키가 필요). <code>admin_users</code>(email · name ·
            role) 프로필 테이블을 만들어 auth 사용자와 매핑하거나, 서버 라우트에서 service-role 키로
            조회하도록 붙이면 전체 목록이 표시됩니다. 지금은 로그인한 계정만 보여 줍니다.
          </span>
        </Note>
      ) : null}
      {error ? <Note warn>{error}</Note> : null}

      <Stats
        items={[
          { label: '관리자 계정', value: rows.length, unit: '개' },
          { label: '최근 30일 로그인', value: rows.filter((r) => {
              if (!r.last_sign_in_at) return false;
              return Date.now() - new Date(r.last_sign_in_at).getTime() < 30 * 86400000;
            }).length, unit: '개' },
        ]}
      />

      <section className={kit.card}>
        <div className={kit.toolbar}>
          <Search value={q} onChange={setQ} placeholder="이메일 · 이름 검색" />
          <span className={kit.toolbarSpacer} />
          <span className={kit.count}>
            <b>{visible.length}</b> / {rows.length}개
          </span>
        </div>

        {loading ? (
          <Skeleton />
        ) : visible.length === 0 ? (
          <Empty title="표시할 계정이 없습니다" desc="Supabase Auth 에 관리자 계정을 추가해 주세요." />
        ) : (
          <div className={kit.tableWrap}>
            <table className={kit.table}>
              <thead>
                <tr>
                  <th>계정</th>
                  <th style={{ width: 130 }}>권한</th>
                  <th style={{ width: 170 }}>생성일</th>
                  <th style={{ width: 170 }}>최근 로그인</th>
                  <th style={{ width: 120 }} />
                </tr>
              </thead>
              <tbody>
                {visible.map((r) => (
                  <tr key={r.id}>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <span className={kit.avatar}>{(r.email ?? '?').charAt(0).toUpperCase()}</span>
                        <span>
                          <span className={kit.tdStrong}>{r.email || '-'}</span>
                          {r.name ? <span className={kit.tdSub}>{r.name}</span> : null}
                        </span>
                      </div>
                    </td>
                    <td>
                      <Badge tone={ROLE_TONE[r.role ?? ''] ?? 'plain'}>{r.role || 'admin'}</Badge>
                    </td>
                    <td className={kit.num}>{fmtDate(r.created_at)}</td>
                    <td className={kit.num}>{r.last_sign_in_at ? fmtDate(r.last_sign_in_at) : '-'}</td>
                    <td className={kit.tdActions}>
                      <button type="button" className={btnSm} disabled>
                        권한 변경
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <div className={kit.cardFoot}>
          <span>어드민 접근 권한이 있는 계정입니다.</span>
          <span>Supabase · auth / admin_users</span>
        </div>
      </section>
    </>
  );
}
