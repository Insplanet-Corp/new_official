'use client';

import { use, useEffect, useState } from 'react';
import Link from 'next/link';
import UserForm from '@/components/admin/UserForm';
import { Empty, Note, Skeleton, SubHead } from '@/components/admin/ui';
import kit from '@/components/admin/kit.module.css';
import {
  MISSING_TABLE_NOTICE,
  isMissingTable,
  type AdminUser,
  type AdminUserProfile,
} from '@/lib/adminUsers';
import { supabase } from '@/lib/supabase';

/* 사용자관리 - 수정 (기획서 43p) — ID는 수정 불가 */
export default function UserEditPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [initial, setInitial] = useState<AdminUserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tableMissing, setTableMissing] = useState(false);

  useEffect(() => {
    let alive = true;
    (async () => {
      const { data, error } = await supabase
        .from('admin_users')
        .select('*')
        .eq('id', id)
        .maybeSingle();
      if (!alive) return;
      if (error) {
        if (isMissingTable(error)) setTableMissing(true);
        else setError(error.message);
      } else if (data) {
        const u = data as AdminUser;
        setInitial({
          name: u.name,
          login_id: u.login_id,
          email: u.email,
          phone: u.phone,
          use_yn: u.use_yn,
          permissions: u.permissions ?? [],
        });
      }
      setLoading(false);
    })();
    return () => {
      alive = false;
    };
  }, [id]);

  return (
    <>
      <SubHead
        eyebrow="Users"
        title="사용자관리 – 수정"
        desc="등록된 계정 정보를 수정합니다. ID와 이메일은 변경할 수 없습니다."
        actions={
          <>
            <Link href={`/admin/users/${id}`} className={kit.btn}>
              조회
            </Link>
            <Link href="/admin/users" className={kit.btn}>
              목록
            </Link>
          </>
        }
      />

      {tableMissing ? <Note warn>{MISSING_TABLE_NOTICE}</Note> : null}
      {error ? <Note warn>{error}</Note> : null}

      {loading ? (
        <section className={kit.card}>
          <Skeleton />
        </section>
      ) : !initial ? (
        <section className={kit.card}>
          <Empty title="계정을 찾을 수 없습니다" desc="이미 삭제되었거나 잘못된 주소입니다." />
        </section>
      ) : (
        <UserForm mode="edit" userId={id} initial={initial} />
      )}
    </>
  );
}
