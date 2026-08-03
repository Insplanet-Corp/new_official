'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { CheckGrid, Inline, Input, Radios, Row } from '@/components/admin/form';
import { Note } from '@/components/admin/ui';
import kit from '@/components/admin/kit.module.css';
import s from '@/components/admin/form.module.css';
import { MENU_PERMISSIONS } from '@/components/admin/tabs';
import { USE_YN } from '@/data/adminOptions';
import type { AdminUserProfile } from '@/lib/adminUsers';
import { supabase } from '@/lib/supabase';

/* 사용자관리 등록 / 수정 폼 (기획서 40p · 43p).

   비밀번호는 Supabase Auth 소관이라 이 폼(=admin_users 프로필)에서 다루지 않는다.
   수정 화면에서는 ID 를 바꿀 수 없다 (기획서 43p 2번). */

const EMPTY: AdminUserProfile = {
  name: '',
  login_id: '',
  email: '',
  phone: '',
  use_yn: 'Y',
  permissions: [],
};

export default function UserForm({
  mode,
  userId,
  initial,
}: {
  mode: 'create' | 'edit';
  /** edit 일 때 admin_users.id (= auth.users.id) */
  userId?: string;
  initial?: AdminUserProfile;
}) {
  const router = useRouter();
  const [v, setV] = useState<AdminUserProfile>(initial ?? EMPTY);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [idCheck, setIdCheck] = useState<'idle' | 'ok' | 'taken'>('idle');

  const set = <K extends keyof AdminUserProfile>(k: K, val: AdminUserProfile[K]) => {
    setV((cur) => ({ ...cur, [k]: val }));
    if (k === 'login_id') setIdCheck('idle');
  };

  const togglePermission = (value: string) =>
    setV((cur) => ({
      ...cur,
      permissions: cur.permissions.includes(value)
        ? cur.permissions.filter((p) => p !== value)
        : [...cur.permissions, value],
    }));

  // 전체메뉴 ON -> 전부 체크, OFF -> 전부 해제 (기획서 40p 8번)
  const toggleAll = (next: boolean) =>
    set('permissions', next ? MENU_PERMISSIONS.map((m) => m.value) : []);

  /* ID 중복확인 — admin_users.login_id 는 unique 제약이 걸려 있다 */
  const checkId = async () => {
    const id = v.login_id.trim();
    if (!id) return;
    const { data, error } = await supabase
      .from('admin_users')
      .select('id')
      .eq('login_id', id)
      .neq('id', userId ?? '00000000-0000-0000-0000-000000000000')
      .maybeSingle();
    if (error) {
      setError(error.message);
      return;
    }
    setIdCheck(data ? 'taken' : 'ok');
  };

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (mode === 'create' || !userId) return; // 등록은 Auth 계정 생성이 선행돼야 한다
    setSaving(true);
    setError(null);
    const { error } = await supabase
      .from('admin_users')
      .update({
        name: v.name.trim(),
        login_id: v.login_id.trim(),
        phone: v.phone?.trim() || null,
        use_yn: v.use_yn,
        permissions: v.permissions,
      })
      .eq('id', userId);
    setSaving(false);
    if (error) {
      setError(error.message);
      return;
    }
    router.push('/admin/users');
    router.refresh();
  };

  return (
    <>
      {error ? <Note warn>{error}</Note> : null}

      <form className={kit.card} onSubmit={onSubmit}>
        <Row label="사용자명" required>
          <Input value={v.name} onChange={(x) => set('name', x)} placeholder="사용자명" size="medium" />
        </Row>

        <Row label="사용여부" required hint="N 선택 시 로그인할 수 없습니다.">
          <Radios name="use" value={v.use_yn} onChange={(x) => set('use_yn', x as 'Y' | 'N')} options={USE_YN} />
        </Row>

        <Row
          label="사용자 ID"
          required
          hint={
            mode === 'edit'
              ? 'ID는 수정할 수 없습니다.'
              : idCheck === 'ok'
                ? '사용 가능한 ID 입니다.'
                : idCheck === 'taken'
                  ? '이미 사용 중인 ID 입니다. 다른 ID를 입력해 주세요.'
                  : '중복확인을 거쳐야 저장할 수 있습니다.'
          }
        >
          <Inline>
            <Input
              value={v.login_id}
              onChange={(x) => set('login_id', x)}
              placeholder="insplanet01"
              size="medium"
              disabled={mode === 'edit'}
            />
            {mode === 'create' ? (
              <button type="button" className={`${kit.btn} ${kit.btnSm}`} onClick={checkId}>
                중복확인
              </button>
            ) : null}
          </Inline>
        </Row>

        <Row label="이메일" required hint="Supabase Auth 로그인에 쓰는 주소입니다. 변경은 Auth 쪽에서 해야 합니다.">
          <Input
            value={v.email}
            onChange={(x) => set('email', x)}
            type="email"
            placeholder="admin@insplanet.co.kr"
            size="medium"
            disabled={mode === 'edit'}
          />
        </Row>

        <Row label="전화번호" required>
          <Input
            value={v.phone ?? ''}
            onChange={(x) => set('phone', x)}
            placeholder="010-0000-0000"
            size="medium"
          />
        </Row>

        <Row label="메뉴권한" required hint="전체메뉴를 켜면 하위 메뉴가 모두 선택됩니다.">
          <CheckGrid
            options={MENU_PERMISSIONS}
            selected={v.permissions}
            onToggle={togglePermission}
            onToggleAll={toggleAll}
          />
        </Row>

        <div className={s.actions}>
          <button
            type="submit"
            className={`${kit.btn} ${kit.btnPrimary}`}
            disabled={mode === 'create' || saving}
          >
            {saving ? '저장 중…' : '저장'}
          </button>
          <button type="button" className={kit.btn} onClick={() => router.push('/admin/users')}>
            취소
          </button>
        </div>
      </form>
    </>
  );
}
