'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { Badge, Empty, Note, PageHead, Search, Select } from '@/components/admin/ui';
import kit from '@/components/admin/kit.module.css';
import {
  PORTFOLIO_CATEGORY_FILTER,
  PORTFOLIO_STATUS_FILTER,
  USE_YN_FILTER,
  labelOf,
} from '@/data/adminOptions';

/* 포트폴리오관리 - 목록 (기획서 23p)
   조회 조건: 포트폴리오명 키워드 + 분류 + 진행 상태 + 사용여부.
   ※ 지금은 화면 틀 — 목록 데이터 연동은 다음 단계. */

type PortfolioRow = {
  id: string;
  updatedAt: string;
  name: string;
  category: string;
  status: string;
  htmlFile: string;
  use: 'Y' | 'N';
};

const ROWS: PortfolioRow[] = [];

export default function PortfolioListPage() {
  const [q, setQ] = useState('');
  const [category, setCategory] = useState('all');
  const [status, setStatus] = useState('all');
  const [use, setUse] = useState('all');

  const visible = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return ROWS.filter((r) => {
      if (category !== 'all' && r.category !== category) return false;
      if (status !== 'all' && r.status !== status) return false;
      if (use !== 'all' && r.use !== use) return false;
      if (needle && !r.name.toLowerCase().includes(needle)) return false;
      return true;
    });
  }, [q, category, status, use]);

  return (
    <>
      <PageHead
        href="/admin/portfolio"
        actions={
          <Link href="/admin/portfolio/new" className={`${kit.btn} ${kit.btnPrimary}`}>
            + 등록
          </Link>
        }
      />

      <Note>
        <span>
          <b>화면 틀</b> — 기획서 3. 포트폴리오관리 구조입니다. 조회·등록·수정·삭제 동작과 DB 연동은
          아직 붙지 않았습니다.
        </span>
      </Note>

      <section className={kit.card}>
        <div className={kit.toolbar}>
          <Search value={q} onChange={setQ} placeholder="포트폴리오명" />
          <Select
            label="분류"
            value={category}
            onChange={setCategory}
            options={PORTFOLIO_CATEGORY_FILTER}
          />
          <Select
            label="진행 상태"
            value={status}
            onChange={setStatus}
            options={PORTFOLIO_STATUS_FILTER}
          />
          <Select label="사용여부" value={use} onChange={setUse} options={USE_YN_FILTER} />
          <button type="button" className={kit.btn}>
            조회
          </button>
          <span className={kit.toolbarSpacer} />
          <span className={kit.count}>
            조회결과 : <b>{visible.length}</b>건
          </span>
        </div>

        {visible.length === 0 ? (
          <Empty
            title="조회 결과가 없습니다"
            desc="등록된 데이터가 없거나 조회 조건에 맞는 항목이 없습니다."
          />
        ) : (
          <div className={kit.tableWrap}>
            <table className={kit.table}>
              <thead>
                <tr>
                  <th style={{ width: 64 }}>No</th>
                  <th style={{ width: 130 }}>등록/수정일</th>
                  <th>포트폴리오명</th>
                  <th style={{ width: 120 }}>분류</th>
                  <th style={{ width: 110 }}>진행 상태</th>
                  <th style={{ width: 220 }}>HTML 파일명</th>
                  <th style={{ width: 90 }}>사용여부</th>
                </tr>
              </thead>
              <tbody>
                {visible.map((r, i) => (
                  <tr key={r.id}>
                    <td className={kit.num}>{visible.length - i}</td>
                    <td className={kit.num}>{r.updatedAt}</td>
                    <td>
                      <Link href={`/admin/portfolio/${r.id}`} className={kit.tdStrong}>
                        {r.name}
                      </Link>
                    </td>
                    <td>
                      <Badge tone="plain">{r.category}</Badge>
                    </td>
                    <td>
                      <Badge tone={r.status === 'ongoing' ? 'blue' : 'green'}>
                        {labelOf(PORTFOLIO_STATUS_FILTER, r.status)}
                      </Badge>
                    </td>
                    <td className={kit.clamp}>{r.htmlFile}</td>
                    <td>
                      <Badge tone={r.use === 'Y' ? 'green' : 'plain'}>{r.use}</Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <div className={kit.cardFoot}>
          <span>진행 프로젝트는 진행중 목록에, 종료 프로젝트는 종료 목록에 노출됩니다.</span>
          <span>기획서 3 · 포트폴리오관리 목록</span>
        </div>
      </section>
    </>
  );
}
