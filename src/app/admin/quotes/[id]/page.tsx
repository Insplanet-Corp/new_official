'use client';

import { use, useEffect, useState } from 'react';
import Link from 'next/link';
import { ReadOnly, Row, Section } from '@/components/admin/form';
import { Empty, Note, Skeleton, SubHead, fmtDate } from '@/components/admin/ui';
import kit from '@/components/admin/kit.module.css';
import s from '@/components/admin/form.module.css';
import { fieldText, type Quote } from '@/lib/quotes';
import { QUOTE_STATUS } from '@/data/adminOptions';
import { supabase } from '@/lib/supabase';

/* 견적문의관리 - 조회 (기획서 32p)
   세 덩어리로 나눠 출력: 의뢰인 정보 / 프로젝트 기본 정보 / 프로젝트 상세 정보. */
export default function QuoteDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [row, setRow] = useState<Quote | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    (async () => {
      const { data, error } = await supabase.from('quotes').select('*').eq('id', id).maybeSingle();
      if (!alive) return;
      if (error) setError(error.message);
      else setRow((data as Quote) ?? null);
      setLoading(false);
    })();
    return () => {
      alive = false;
    };
  }, [id]);

  const statusLabel =
    QUOTE_STATUS.find((x) => x.value === row?.status)?.label ?? row?.status ?? null;

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

      {error ? <Note warn>{error}</Note> : null}

      {loading ? (
        <section className={kit.card}>
          <Skeleton />
        </section>
      ) : !row ? (
        <section className={kit.card}>
          <Empty title="문의를 찾을 수 없습니다" desc="이미 삭제되었거나 잘못된 주소입니다." />
        </section>
      ) : (
        <>
          <Section title="의뢰인 정보">
            <Row label="기업명">
              <ReadOnly>{row.company}</ReadOnly>
            </Row>
            <Row label="신청인">
              <ReadOnly>{row.person}</ReadOnly>
            </Row>
            <Row label="연락처">
              <ReadOnly>{row.phone}</ReadOnly>
            </Row>
            <Row label="이메일">
              <ReadOnly>{row.email}</ReadOnly>
            </Row>
            <Row label="접수일시">
              <ReadOnly>{fmtDate(row.created_at)}</ReadOnly>
            </Row>
            <Row label="진행 상태">
              <ReadOnly>{statusLabel}</ReadOnly>
            </Row>
          </Section>

          <Section title="프로젝트 기본 정보">
            <Row label="프로젝트 업무범위">
              <ReadOnly>{fieldText(row, 'scope')}</ReadOnly>
            </Row>
            <Row label="프로젝트 성격">
              <ReadOnly>{fieldText(row, 'nature')}</ReadOnly>
            </Row>
            <Row label="프로젝트 예산">
              <ReadOnly>{fieldText(row, 'budget')}</ReadOnly>
            </Row>
            <Row label="프로젝트 기간">
              <ReadOnly>{fieldText(row, 'period')}</ReadOnly>
            </Row>
          </Section>

          <Section title="프로젝트 상세 정보">
            <Row label="기존 사이트 URL">
              <ReadOnly>{row.url}</ReadOnly>
            </Row>
            <Row label="프로젝트 내용">
              <ReadOnly>{row.content}</ReadOnly>
            </Row>
            <Row
              label="첨부파일"
              hint="Contact 폼이 파일을 업로드하지 않아 quotes 테이블에 첨부 컬럼이 없습니다. Storage 연동 후 연결 예정입니다."
            >
              <ReadOnly muted>{null}</ReadOnly>
            </Row>
          </Section>
        </>
      )}

      <div className={s.actions}>
        <Link href="/admin/quotes" className={kit.btn}>
          목록
        </Link>
      </div>
    </>
  );
}
