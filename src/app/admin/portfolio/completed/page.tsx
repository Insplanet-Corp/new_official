'use client';

import { useMemo, useState } from 'react';
import { Badge, Empty, Note, PageHead, Search, Select, Stats } from '@/components/admin/ui';
import { PROJECT_CARDS, CATEGORIES } from '@/data/projectsPage';

/* 종료된 포트폴리오. 아직 DB 테이블이 없어서 프로젝트 페이지가 쓰는 것과 같은
   src/data/projectsPage.ts 를 그대로 읽는다 — 목록/검색/필터 틀은 완성이고,
   테이블만 나중에 supabase 쿼리로 바꾸면 된다. */
export default function PortfolioCompletedPage() {
  const [q, setQ] = useState('');
  const [cat, setCat] = useState('all');

  const visible = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return PROJECT_CARDS.filter((c) => {
      if (cat !== 'all' && c.category !== cat) return false;
      if (!needle) return true;
      return c.name.join(' ').toLowerCase().includes(needle);
    });
  }, [q, cat]);

  return (
    <>
      <PageHead
        href="/admin/portfolio/completed"
        actions={
          <button type="button" className="adm-btn adm-btn-primary" disabled>
            + 포트폴리오 등록
          </button>
        }
      />

      <Note>
        <span>
          <b>연동 대기</b> — 현재 목록은 <code>src/data/projectsPage.ts</code> 의 정적 데이터입니다.
          Supabase 에 <code>projects</code> 테이블이 생기면 이 화면의 조회/등록/수정이 그대로 붙습니다.
        </span>
      </Note>

      <Stats
        items={[
          { label: '종료 프로젝트', value: PROJECT_CARDS.length, unit: '건' },
          { label: 'Web', value: PROJECT_CARDS.filter((c) => c.category === 'web').length, unit: '건' },
          { label: 'Mobile', value: PROJECT_CARDS.filter((c) => c.category === 'mobile').length, unit: '건' },
          { label: '수상작', value: PROJECT_CARDS.filter((c) => c.award).length, unit: '건' },
        ]}
      />

      <section className="adm-card">
        <div className="adm-toolbar">
          <Search value={q} onChange={setQ} placeholder="프로젝트명 검색" />
          <Select
            label="카테고리"
            value={cat}
            onChange={setCat}
            options={CATEGORIES.map((c) => ({
              value: c.filter,
              label: c.filter === 'all' ? '전체 카테고리' : c.label,
            }))}
          />
          <span className="adm-toolbar-spacer" />
          <span className="adm-count">
            <b>{visible.length}</b> / {PROJECT_CARDS.length}건
          </span>
        </div>

        {visible.length === 0 ? (
          <Empty title="조건에 맞는 프로젝트가 없습니다" desc="검색어나 카테고리를 바꿔보세요." />
        ) : (
          <div className="adm-table-wrap">
            <table className="adm-table">
              <thead>
                <tr>
                  <th style={{ width: 60 }}>No.</th>
                  <th style={{ width: 88 }}>썸네일</th>
                  <th>프로젝트명</th>
                  <th style={{ width: 130 }}>카테고리</th>
                  <th style={{ width: 110 }}>수상</th>
                  <th style={{ width: 150 }}>노출</th>
                  <th style={{ width: 140 }} />
                </tr>
              </thead>
              <tbody>
                {visible.map((c, i) => (
                  <tr key={c.id}>
                    <td className="num">{String(i + 1).padStart(2, '0')}</td>
                    <td>
                      <img className="adm-thumb" src={c.image} alt="" />
                    </td>
                    <td>
                      <div className="adm-td-strong">{c.name[0]}</div>
                      <div className="adm-td-sub">{c.name[1]}</div>
                    </td>
                    <td>
                      <Badge tone="plain">{c.cat}</Badge>
                    </td>
                    <td>{c.award ? <Badge tone="amber">Award</Badge> : <span className="num">-</span>}</td>
                    <td>
                      <Badge tone="green">공개</Badge>
                    </td>
                    <td className="adm-td-actions">
                      <button type="button" className="adm-btn adm-btn-sm" disabled>
                        수정
                      </button>{' '}
                      <button type="button" className="adm-btn adm-btn-sm" disabled>
                        삭제
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <div className="adm-card-foot">
          <span>프로젝트 페이지 카드 그리드에 노출되는 목록입니다.</span>
          <span>src/data/projectsPage.ts</span>
        </div>
      </section>
    </>
  );
}
