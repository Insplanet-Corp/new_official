'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { Badge, Empty, Note, PageHead, Search, Select } from '@/components/admin/ui';
import kit from '@/components/admin/kit.module.css';
import { USE_YN_FILTER } from '@/data/adminOptions';

/* 사용자관리 - 목록 (기획서 39p)
   조회 조건: 사용자명 · ID 키워드 + 사용여부.
   ※ 지금은 화면 틀 — 목록 데이터 연동은 다음 단계. */

type UserRow = {
  id: string;
  createdAt: string;
  name: string;
  loginId: string;
  phone: string;
  use: 'Y' | 'N';
};

const ROWS: UserRow[] = [];

export default function UsersListPage() {
  const [q, setQ] = useState('');
  const [use, setUse] = useState('all');

  const visible = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return ROWS.filter((r) => {
      if (use !== 'all' && r.use !== use) return false;
      if (!needle) return true;
      return [r.name, r.loginId].some((x) => x.toLowerCase().includes(needle));
    });
  }, [q, use]);

  return (
    <>
      <PageHead
        href="/admin/users"
        actions={
          <Link href="/admin/users/new" className={`${kit.btn} ${kit.btnPrimary}`}>
            + 등록
          </Link>
        }
      />

      <Note>
        <span>
          <b>화면 틀</b> — 기획서 6. 사용자관리 구조입니다. 목록 조회와 DB 연동은 아직 붙지
          않았습니다. 메뉴 권한이 있는 계정만 이 메뉴에 접근할 수 있어야 합니다(기획서 39p).
        </span>
      </Note>

      <section className={kit.card}>
        <div className={kit.toolbar}>
          <Search value={q} onChange={setQ} placeholder="사용자명 · ID" />
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
            desc="등록된 사용자가 없거나 조회 조건에 맞는 항목이 없습니다."
          />
        ) : (
          <div className={kit.tableWrap}>
            <table className={kit.table}>
              <thead>
                <tr>
                  <th style={{ width: 64 }}>No</th>
                  <th style={{ width: 130 }}>등록일</th>
                  <th>사용자명</th>
                  <th style={{ width: 180 }}>사용자 ID</th>
                  <th style={{ width: 160 }}>전화번호</th>
                  <th style={{ width: 90 }}>사용여부</th>
                </tr>
              </thead>
              <tbody>
                {visible.map((r, i) => (
                  <tr key={r.id}>
                    <td className={kit.num}>{visible.length - i}</td>
                    <td className={kit.num}>{r.createdAt}</td>
                    <td>
                      {/* 사용자명 · ID 클릭 -> 조회 화면 */}
                      <Link href={`/admin/users/${r.id}`} className={kit.tdStrong}>
                        {r.name}
                      </Link>
                    </td>
                    <td>
                      <Link href={`/admin/users/${r.id}`}>{r.loginId}</Link>
                    </td>
                    <td className={kit.nowrap}>{r.phone}</td>
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
          <span>어드민에 접근할 수 있는 계정입니다.</span>
          <span>기획서 6 · 사용자관리 목록</span>
        </div>
      </section>
    </>
  );
}
