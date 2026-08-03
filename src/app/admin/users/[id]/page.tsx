'use client';

import { use } from 'react';
import Link from 'next/link';
import { ReadOnly, Row } from '@/components/admin/form';
import { Note, SubHead } from '@/components/admin/ui';
import kit from '@/components/admin/kit.module.css';
import s from '@/components/admin/form.module.css';

/* 사용자관리 - 조회 (기획서 42p) */
export default function UserDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);

  return (
    <>
      <SubHead
        eyebrow="Users"
        title="사용자관리 – 조회"
        desc="등록된 계정 정보입니다."
        actions={
          <Link href="/admin/users" className={kit.btn}>
            목록
          </Link>
        }
      />

      <Note>
        <span>
          <b>화면 틀</b> — 데이터 조회는 아직 붙지 않았습니다 (요청 ID: <code>{id}</code>).
        </span>
      </Note>

      <section className={kit.card}>
        <Row label="사용자명">
          <ReadOnly>{null}</ReadOnly>
        </Row>
        <Row label="사용여부">
          <ReadOnly>{null}</ReadOnly>
        </Row>
        <Row label="사용자 ID">
          <ReadOnly>{null}</ReadOnly>
        </Row>
        <Row label="전화번호">
          <ReadOnly>{null}</ReadOnly>
        </Row>
        <Row label="메뉴권한">
          <ReadOnly>{null}</ReadOnly>
        </Row>
      </section>

      <div className={s.actions}>
        <Link href={`/admin/users/${id}/edit`} className={`${kit.btn} ${kit.btnPrimary}`}>
          수정
        </Link>
        <Link href="/admin/users" className={kit.btn}>
          취소
        </Link>
      </div>
    </>
  );
}
