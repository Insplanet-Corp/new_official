'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { CheckGrid, Inline, Input, Radios, Row } from '@/components/admin/form';
import kit from '@/components/admin/kit.module.css';
import s from '@/components/admin/form.module.css';
import { MENU_PERMISSIONS } from '@/components/admin/tabs';
import { USE_YN } from '@/data/adminOptions';

/* 사용자관리 등록 / 수정 폼 (기획서 40p · 43p).
   두 화면의 차이는 하나뿐 — 수정에서는 ID를 바꿀 수 없다 (기획서 43p 2번).
   ※ 화면 틀 단계: 중복확인·비밀번호 규칙 검증·저장은 다음 단계에서 붙인다. */

export type UserValues = {
  name: string;
  use: string;
  loginId: string;
  phone: string;
  password: string;
  passwordConfirm: string;
  permissions: string[];
};

const EMPTY: UserValues = {
  name: '',
  use: '',
  loginId: '',
  phone: '',
  password: '',
  passwordConfirm: '',
  permissions: [],
};

export default function UserForm({
  mode,
  initial,
}: {
  mode: 'create' | 'edit';
  initial?: UserValues;
}) {
  const router = useRouter();
  const [v, setV] = useState<UserValues>(initial ?? EMPTY);
  const set = <K extends keyof UserValues>(k: K, val: UserValues[K]) =>
    setV((cur) => ({ ...cur, [k]: val }));

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

  return (
    <form
      className={kit.card}
      onSubmit={(e) => {
        e.preventDefault();
        // 저장 + 필수값/비밀번호 검증은 다음 단계
      }}
    >
      <Row label="사용자명" required>
        <Input value={v.name} onChange={(x) => set('name', x)} placeholder="사용자명" size="medium" />
      </Row>

      <Row label="사용여부" required hint="N 선택 시 로그인할 수 없습니다.">
        <Radios name="use" value={v.use} onChange={(x) => set('use', x)} options={USE_YN} />
      </Row>

      <Row
        label="사용자 ID"
        required
        hint={
          mode === 'edit'
            ? 'ID는 수정할 수 없습니다.'
            : '중복확인을 거쳐야 저장할 수 있습니다.'
        }
      >
        <Inline>
          <Input
            value={v.loginId}
            onChange={(x) => set('loginId', x)}
            placeholder="사용자 ID"
            size="medium"
            disabled={mode === 'edit'}
          />
          {mode === 'create' ? (
            <button type="button" className={`${kit.btn} ${kit.btnSm}`}>
              중복확인
            </button>
          ) : null}
        </Inline>
      </Row>

      <Row label="전화번호" required>
        <Input
          value={v.phone}
          onChange={(x) => set('phone', x)}
          placeholder="010-0000-0000"
          size="medium"
        />
      </Row>

      <Row label="비밀번호" required hint="문자 + 숫자 조합으로 6자리 이상 입력합니다.">
        <Input
          value={v.password}
          onChange={(x) => set('password', x)}
          type="password"
          placeholder="비밀번호"
          size="medium"
        />
      </Row>

      <Row label="비밀번호 확인" required>
        <Input
          value={v.passwordConfirm}
          onChange={(x) => set('passwordConfirm', x)}
          type="password"
          placeholder="비밀번호 다시 입력"
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
        <button type="submit" className={`${kit.btn} ${kit.btnPrimary}`}>
          저장
        </button>
        <button type="button" className={kit.btn} onClick={() => router.push('/admin/users')}>
          취소
        </button>
      </div>
    </form>
  );
}
