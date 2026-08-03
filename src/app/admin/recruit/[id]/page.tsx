'use client';

import { use } from 'react';
import Link from 'next/link';
import { FileLink, ReadOnly, Row, Section } from '@/components/admin/form';
import { Note, SubHead } from '@/components/admin/ui';
import kit from '@/components/admin/kit.module.css';
import s from '@/components/admin/form.module.css';

/* 리크루트관리 - 조회 (기획서 36p)
   지원자 정보 + 경력 정보, 첨부파일 다운로드, 포트폴리오 URL(피그마·깃허브 등). */
export default function RecruitDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);

  return (
    <>
      <SubHead
        eyebrow="Recruit"
        title="리크루트관리 – 조회"
        desc="접수된 지원서 상세 내용입니다."
        actions={
          <Link href="/admin/recruit" className={kit.btn}>
            목록
          </Link>
        }
      />

      <Note>
        <span>
          <b>화면 틀</b> — 데이터 조회는 아직 붙지 않았습니다 (요청 ID: <code>{id}</code>).
        </span>
      </Note>

      <Section title="지원자 정보">
        <Row label="지원자 성명">
          <ReadOnly>{null}</ReadOnly>
        </Row>
        <Row label="지원분야">
          <ReadOnly>{null}</ReadOnly>
        </Row>
        <Row label="연락처">
          <ReadOnly>{null}</ReadOnly>
        </Row>
        <Row label="이메일">
          <ReadOnly>{null}</ReadOnly>
        </Row>
      </Section>

      <Section title="경력 정보">
        <Row label="기술등급">
          <ReadOnly>{null}</ReadOnly>
        </Row>
        <Row label="경력">
          <ReadOnly>{null}</ReadOnly>
        </Row>
        <Row label="재직상태">
          <ReadOnly>{null}</ReadOnly>
        </Row>
      </Section>

      <Section title="첨부 자료">
        <Row label="첨부파일" hint="파일명을 클릭하면 다운로드됩니다.">
          <FileLink />
        </Row>
        <Row label="포트폴리오 URL" hint="지원 화면에서 입력한 피그마 · 깃허브 등의 주소입니다.">
          <ReadOnly>{null}</ReadOnly>
        </Row>
      </Section>

      <div className={s.actions}>
        <Link href="/admin/recruit" className={kit.btn}>
          목록
        </Link>
      </div>
    </>
  );
}
