'use client';

import { useMemo, useState } from 'react';
import { Badge, Empty, Note, PageHead, Search, Select, Stats } from '@/components/admin/ui';
import { ONGOING_ROWS } from '@/data/projectsPage';

/* 진행 중 포트폴리오 = 프로젝트 페이지 하단 Ongoing 테이블의 원본.
   completed 탭과 같은 이유로 아직 정적 데이터를 읽는다. */

const CATS = ['Web', 'Mobile', 'Consulting', 'Etc.'];

/* '2026.07.01~2027.07.01' -> 종료일이 오늘 이후면 진행 중, 아니면 종료 예정/완료 */
function periodState(period: string): { tone: 'green' | 'amber' | 'plain'; label: string } {
  const end = period.split('~')[1]?.trim();
  const d = end ? new Date(end.replace(/\./g, '-')) : null;
  if (!d || Number.isNaN(d.getTime())) return { tone: 'plain', label: '기간 미정' };
  const days = Math.ceil((d.getTime() - Date.now()) / 86400000);
  if (days < 0) return { tone: 'plain', label: '기간 종료' };
  if (days <= 90) return { tone: 'amber', label: `D-${days}` };
  return { tone: 'green', label: '진행 중' };
}

export default function PortfolioOngoingPage() {
  const [q, setQ] = useState('');
  const [cat, setCat] = useState('all');

  const visible = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return ONGOING_ROWS.filter((r) => {
      if (cat !== 'all' && r.category !== cat) return false;
      if (!needle) return true;
      return `${r.client} ${r.project}`.toLowerCase().includes(needle);
    });
  }, [q, cat]);

  const soon = ONGOING_ROWS.filter((r) => periodState(r.period).tone === 'amber').length;

  return (
    <>
      <PageHead
        href="/admin/portfolio/ongoing"
        actions={
          <button type="button" className="adm-btn adm-btn-primary" disabled>
            + 진행 프로젝트 등록
          </button>
        }
      />

      <Note>
        <span>
          <b>연동 대기</b> — 현재 목록은 <code>src/data/projectsPage.ts</code> 의{' '}
          <code>ONGOING_ROWS</code> 입니다. 테이블만 교체하면 등록/수정이 그대로 동작합니다.
        </span>
      </Note>

      <Stats
        items={[
          { label: '진행 프로젝트', value: ONGOING_ROWS.length, unit: '건' },
          { label: '고객사', value: new Set(ONGOING_ROWS.map((r) => r.client)).size, unit: '곳' },
          { label: '90일 내 종료', value: soon, unit: '건' },
          { label: '카테고리', value: new Set(ONGOING_ROWS.map((r) => r.category)).size, unit: '종' },
        ]}
      />

      <section className="adm-card">
        <div className="adm-toolbar">
          <Search value={q} onChange={setQ} placeholder="고객사 · 프로젝트명 검색" />
          <Select
            label="카테고리"
            value={cat}
            onChange={setCat}
            options={[{ value: 'all', label: '전체 카테고리' }, ...CATS.map((c) => ({ value: c, label: c }))]}
          />
          <span className="adm-toolbar-spacer" />
          <span className="adm-count">
            <b>{visible.length}</b> / {ONGOING_ROWS.length}건
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
                  <th style={{ width: 210 }}>고객사</th>
                  <th>프로젝트명</th>
                  <th style={{ width: 130 }}>카테고리</th>
                  <th style={{ width: 210 }}>수행 기간</th>
                  <th style={{ width: 120 }}>상태</th>
                  <th style={{ width: 140 }} />
                </tr>
              </thead>
              <tbody>
                {visible.map((r, i) => {
                  const st = periodState(r.period);
                  return (
                    <tr key={`${r.client}-${r.project}`}>
                      <td className="num">{String(i + 1).padStart(2, '0')}</td>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                          <img className="adm-thumb" style={{ width: 38, height: 38 }} src={r.logo} alt="" />
                          <span className="adm-td-strong">{r.client}</span>
                        </div>
                      </td>
                      <td>{r.project}</td>
                      <td>
                        <Badge tone="plain">{r.category}</Badge>
                      </td>
                      <td className="num">{r.period}</td>
                      <td>
                        <Badge tone={st.tone}>{st.label}</Badge>
                      </td>
                      <td className="adm-td-actions">
                        <button type="button" className="adm-btn adm-btn-sm" disabled>
                          수정
                        </button>{' '}
                        <button type="button" className="adm-btn adm-btn-sm" disabled>
                          종료 처리
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        <div className="adm-card-foot">
          <span>프로젝트 페이지 하단 Ongoing 테이블에 노출되는 목록입니다.</span>
          <span>src/data/projectsPage.ts</span>
        </div>
      </section>
    </>
  );
}
