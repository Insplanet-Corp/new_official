'use client';

import { use } from 'react';
import Link from 'next/link';
import { FileLink, ReadOnly, Row, Section } from '@/components/admin/form';
import { Note, SubHead } from '@/components/admin/ui';
import kit from '@/components/admin/kit.module.css';
import s from '@/components/admin/form.module.css';

/* 견적문의관리 - 조회 (기획서 32p)
   세 덩어리로 나눠 출력: 의뢰인 정보 / 프로젝트 기본 정보 / 프로젝트 상세 정보. */
export default function QuoteDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);

  return (
    <>
      <SubHead
        eyebrow="Inquiries"
        title="견적문의관리 – 조회"
        desc="접수된 견적 문의 상세 내용입니다."
        actions={
          <Link href="/admin/quotes" className={kit.btn}>
            목록
          </Link>
        }
      />

      <Note>
        <span>
          <b>화면 틀</b> — 데이터 조회는 아직 붙지 않았습니다 (요청 ID: <code>{id}</code>).
        </span>
      </Note>

      <Section title="의뢰인 정보">
        <Row label="기업명">
          <ReadOnly>{null}</ReadOnly>
        </Row>
        <Row label="신청인">
          <ReadOnly>{null}</ReadOnly>
        </Row>
        <Row label="연락처">
          <ReadOnly>{null}</ReadOnly>
        </Row>
        <Row label="이메일">
          <ReadOnly>{null}</ReadOnly>
        </Row>
      </Section>

      <Section title="프로젝트 기본 정보">
        <Row label="프로젝트 업무범위">
          <ReadOnly>{null}</ReadOnly>
        </Row>
        <Row label="프로젝트 성격">
          <ReadOnly>{null}</ReadOnly>
        </Row>
        <Row label="프로젝트 예산">
          <ReadOnly>{null}</ReadOnly>
        </Row>
        <Row label="프로젝트 기간">
          <ReadOnly>{null}</ReadOnly>
        </Row>
      </Section>

      <Section title="프로젝트 상세 정보">
        <Row label="기존 사이트 URL">
          <ReadOnly>{null}</ReadOnly>
        </Row>
        <Row label="프로젝트 내용">
          <ReadOnly>{null}</ReadOnly>
        </Row>
        <Row label="첨부파일" hint="파일명을 클릭하면 다운로드됩니다.">
          <FileLink />
        </Row>
      </Section>

      <div className={s.actions}>
        <Link href="/admin/quotes" className={kit.btn}>
          목록
        </Link>
      </div>
    </>
  );
}
