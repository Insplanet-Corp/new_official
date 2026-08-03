'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { Badge, Empty, Note, PageHead, Search, Select } from '@/components/admin/ui';
import kit from '@/components/admin/kit.module.css';
import { QUOTE_KIND_FILTER, QUOTE_SYSTEM_FILTER, labelOf } from '@/data/adminOptions';

/* 견적문의관리 - 목록 (기획서 31p)
   조회 조건: 기업명 + 신청인 키워드(둘 다 입력 시 AND) + 시스템 종류 + 개발 구분.
   ※ 지금은 화면 틀 — 목록 데이터 연동은 다음 단계. */

type QuoteRow = {
  id: string;
  createdAt: string;
  company: string;
  person: string;
  phone: string;
  system: string;
  kind: string;
};

const ROWS: QuoteRow[] = [];

export default function QuotesListPage() {
  const [company, setCompany] = useState('');
  const [person, setPerson] = useState('');
  const [system, setSystem] = useState('all');
  const [kind, setKind] = useState('all');

  const visible = useMemo(() => {
    const c = company.trim().toLowerCase();
    const p = person.trim().toLowerCase();
    return ROWS.filter((r) => {
      if (system !== 'all' && r.system !== system) return false;
      if (kind !== 'all' && r.kind !== kind) return false;
      if (c && !r.company.toLowerCase().includes(c)) return false; // 둘 다 입력하면 AND
      if (p && !r.person.toLowerCase().includes(p)) return false;
      return true;
    });
  }, [company, person, system, kind]);

  return (
    <>
      <PageHead href="/admin/quotes" />

      <Note>
        <span>
          <b>화면 틀</b> — 기획서 4. 견적문의관리 구조입니다. 목록 조회와 DB 연동은 아직 붙지
          않았습니다.
        </span>
      </Note>

      <section className={kit.card}>
        <div className={kit.toolbar}>
          <Search value={company} onChange={setCompany} placeholder="기업명" />
          <Search value={person} onChange={setPerson} placeholder="신청인" />
          <Select
            label="시스템 종류"
            value={system}
            onChange={setSystem}
            options={QUOTE_SYSTEM_FILTER}
          />
          <Select label="개발 구분" value={kind} onChange={setKind} options={QUOTE_KIND_FILTER} />
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
            desc="접수된 견적 문의가 없거나 조회 조건에 맞는 항목이 없습니다."
          />
        ) : (
          <div className={kit.tableWrap}>
            <table className={kit.table}>
              <thead>
                <tr>
                  <th style={{ width: 64 }}>No</th>
                  <th style={{ width: 140 }}>접수일시</th>
                  <th>기업명</th>
                  <th style={{ width: 120 }}>신청인</th>
                  <th style={{ width: 150 }}>연락처</th>
                  <th style={{ width: 140 }}>시스템 종류</th>
                  <th style={{ width: 110 }}>개발 구분</th>
                </tr>
              </thead>
              <tbody>
                {visible.map((r, i) => (
                  <tr key={r.id}>
                    <td className={kit.num}>{visible.length - i}</td>
                    <td className={kit.num}>{r.createdAt}</td>
                    <td>
                      {/* 기업명 또는 신청인 클릭 -> 조회 화면 */}
                      <Link href={`/admin/quotes/${r.id}`} className={kit.tdStrong}>
                        {r.company}
                      </Link>
                    </td>
                    <td>
                      <Link href={`/admin/quotes/${r.id}`}>{r.person}</Link>
                    </td>
                    <td className={kit.nowrap}>{r.phone}</td>
                    <td>
                      <Badge tone="plain">{labelOf(QUOTE_SYSTEM_FILTER, r.system)}</Badge>
                    </td>
                    <td>{labelOf(QUOTE_KIND_FILTER, r.kind)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <div className={kit.cardFoot}>
          <span>최신 접수순으로 정렬됩니다.</span>
          <span>기획서 4 · 견적문의관리 목록</span>
        </div>
      </section>
    </>
  );
}
