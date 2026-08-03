'use client';

import { use } from 'react';
import Link from 'next/link';
import { ReadOnly, Row, ThumbView } from '@/components/admin/form';
import { Note, SubHead } from '@/components/admin/ui';
import kit from '@/components/admin/kit.module.css';
import s from '@/components/admin/form.module.css';

/* 메인관리 - 조회 (기획서 13p)
   기존 등록된 데이터를 읽기 전용으로 출력하고, 수정 / 목록 / 삭제로 이동한다. */
export default function MainDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);

  return (
    <>
      <SubHead
        eyebrow="Main"
        title="메인관리 – 조회"
        desc="등록된 메인 노출 항목입니다."
        actions={
          <Link href="/admin/main" className={kit.btn}>
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
        <Row label="포트폴리오명">
          <ReadOnly>{null}</ReadOnly>
        </Row>
        <Row label="사용여부">
          <ReadOnly>{null}</ReadOnly>
        </Row>
        <Row label="상단 문구">
          <ReadOnly>{null}</ReadOnly>
        </Row>
        <Row label="하단 문구">
          <ReadOnly>{null}</ReadOnly>
        </Row>
        <Row label="클라이언트">
          <ReadOnly>{null}</ReadOnly>
        </Row>
        <Row label="오픈일">
          <ReadOnly>{null}</ReadOnly>
        </Row>
        <Row label="썸네일 – PC">
          <ThumbView />
        </Row>
        <Row label="썸네일 – 모바일">
          <ThumbView />
        </Row>
      </section>

      <div className={s.actions}>
        <Link href={`/admin/main/${id}/edit`} className={`${kit.btn} ${kit.btnPrimary}`}>
          수정
        </Link>
        <Link href="/admin/main" className={kit.btn}>
          취소
        </Link>
        <button type="button" className={kit.btn}>
          삭제
        </button>
      </div>
    </>
  );
}
