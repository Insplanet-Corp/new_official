'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { Badge, Empty, Note, PageHead, Search, Select } from '@/components/admin/ui';
import kit from '@/components/admin/kit.module.css';
import { USE_YN_FILTER } from '@/data/adminOptions';

/* 메인관리 - 목록 (기획서 10p / 16p, A타입 히스토리 관리형)
   조회 조건: 포트폴리오명 키워드 + 클라이언트 키워드 (둘 다 입력 시 AND) + 사용여부.
   ※ 지금은 화면 틀만 — 목록 데이터 연동은 다음 단계. */

type MainRow = {
  id: string;
  updatedAt: string;
  name: string;
  headline: string;
  subline: string;
  client: string;
  launch: string;
  use: 'Y' | 'N';
};

const ROWS: MainRow[] = [];

export default function MainListPage() {
  const [name, setName] = useState('');
  const [client, setClient] = useState('');
  const [use, setUse] = useState('all');

  const visible = useMemo(() => {
    const n = name.trim().toLowerCase();
    const c = client.trim().toLowerCase();
    return ROWS.filter((r) => {
      if (use !== 'all' && r.use !== use) return false;
      if (n && !r.name.toLowerCase().includes(n)) return false; // 둘 다 입력하면 AND
      if (c && !r.client.toLowerCase().includes(c)) return false;
      return true;
    });
  }, [name, client, use]);

  return (
    <>
      <PageHead
        href="/admin/main"
        actions={
          <Link href="/admin/main/new" className={`${kit.btn} ${kit.btnPrimary}`}>
            + 등록
          </Link>
        }
      />

      <Note>
        <span>
          <b>화면 틀</b> — 기획서 2-A(히스토리 관리형) 구조입니다. 조회·등록·수정·삭제 동작과 DB
          연동은 아직 붙지 않았습니다.
        </span>
      </Note>

      <section className={kit.card}>
        <div className={kit.toolbar}>
          <Search value={name} onChange={setName} placeholder="포트폴리오명" />
          <Search value={client} onChange={setClient} placeholder="클라이언트" />
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
                  <th style={{ width: 160 }}>상단 문구</th>
                  <th style={{ width: 160 }}>하단 문구</th>
                  <th style={{ width: 140 }}>클라이언트</th>
                  <th style={{ width: 110 }}>오픈일</th>
                  <th style={{ width: 90 }}>사용여부</th>
                </tr>
              </thead>
              <tbody>
                {visible.map((r, i) => (
                  <tr key={r.id}>
                    <td className={kit.num}>{visible.length - i}</td>
                    <td className={kit.num}>{r.updatedAt}</td>
                    <td>
                      {/* 포트폴리오명 클릭 -> 조회 화면 */}
                      <Link href={`/admin/main/${r.id}`} className={kit.tdStrong}>
                        {r.name}
                      </Link>
                    </td>
                    <td>{r.headline}</td>
                    <td>{r.subline}</td>
                    <td>{r.client}</td>
                    <td className={kit.num}>{r.launch}</td>
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
          <span>사용여부 Y가 여러 건이면 가장 최근 등록한 건이 홈페이지 메인에 노출됩니다.</span>
          <span>기획서 2-A · 메인관리 목록</span>
        </div>
      </section>
    </>
  );
}
