'use client';

import { useMemo, useState } from 'react';
import { Badge, Empty, Note, PageHead, Search, Select, Stats, type BadgeTone } from '@/components/admin/ui';
import { ONGOING_ROWS, PROJECT_CARDS } from '@/data/projectsPage';
import kit from '@/components/admin/kit.module.css';

const btnPrimary = `${kit.btn} ${kit.btnPrimary}`;
const btnSm = `${kit.btn} ${kit.btnSm}`;

/* 진행 + 종료를 한 표에서 관리한다. 두 원본(카드 / Ongoing 테이블)은 컬럼이 서로 달라서
   아래 Row 하나로 정규화하고, 없는 값은 '-'로 둔다.
   아직 DB 테이블이 없어 프로젝트 페이지가 쓰는 src/data/projectsPage.ts 를 그대로 읽는다. */

type State = 'ongoing' | 'completed';

type Row = {
  key: string;
  state: State;
  image: string;
  title: string;
  subtitle: string;
  client: string | null;
  category: string;
  period: string | null;
  award: boolean;
};

/* '2026.07.01~2027.07.01' -> 종료일이 가까우면 D-day, 지났으면 기간 종료 */
function ongoingBadge(period: string): { tone: BadgeTone; label: string } {
  const end = period.split('~')[1]?.trim();
  const d = end ? new Date(end.replace(/\./g, '-')) : null;
  if (!d || Number.isNaN(d.getTime())) return { tone: 'plain', label: '기간 미정' };
  const days = Math.ceil((d.getTime() - Date.now()) / 86400000);
  if (days < 0) return { tone: 'plain', label: '기간 종료' };
  if (days <= 90) return { tone: 'amber', label: `진행 중 D-${days}` };
  return { tone: 'blue', label: '진행 중' };
}

const ROWS: Row[] = [
  ...ONGOING_ROWS.map<Row>((r) => ({
    key: `ongoing-${r.client}-${r.project}`,
    state: 'ongoing',
    image: r.logo,
    title: r.project,
    subtitle: '',
    client: r.client,
    category: r.category,
    period: r.period,
    award: false,
  })),
  ...PROJECT_CARDS.map<Row>((c) => ({
    key: `completed-${c.id}`,
    state: 'completed',
    image: c.image,
    title: c.name[0],
    subtitle: c.name[1],
    client: null,
    category: c.cat,
    period: null,
    award: c.award,
  })),
];

const CATEGORIES = Array.from(new Set(ROWS.map((r) => r.category))).sort();

const STATES: { value: 'all' | State; label: string }[] = [
  { value: 'all', label: '전체' },
  { value: 'ongoing', label: '진행' },
  { value: 'completed', label: '종료' },
];

export default function PortfolioPage() {
  const [state, setState] = useState<'all' | State>('all');
  const [cat, setCat] = useState('all');
  const [q, setQ] = useState('');

  const visible = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return ROWS.filter((r) => {
      if (state !== 'all' && r.state !== state) return false;
      if (cat !== 'all' && r.category !== cat) return false;
      if (!needle) return true;
      return `${r.title} ${r.subtitle} ${r.client ?? ''}`.toLowerCase().includes(needle);
    });
  }, [state, cat, q]);

  const ongoing = ROWS.filter((r) => r.state === 'ongoing').length;
  const completed = ROWS.filter((r) => r.state === 'completed').length;
  const stateCount = (v: 'all' | State) => (v === 'all' ? ROWS.length : ROWS.filter((r) => r.state === v).length);

  return (
    <>
      <PageHead
        href="/admin/portfolio"
        actions={
          <button type="button" className={btnPrimary} disabled>
            + 포트폴리오 등록
          </button>
        }
      />

      <Note>
        <span>
          <b>연동 대기</b> — 현재 목록은 <code>src/data/projectsPage.ts</code> 의 정적 데이터입니다
          (진행: <code>ONGOING_ROWS</code>, 종료: <code>PROJECT_CARDS</code>). Supabase 에{' '}
          <code>projects</code> 테이블이 생기면 이 화면의 조회/등록/수정이 그대로 붙습니다.
        </span>
      </Note>

      <Stats
        items={[
          { label: '전체 프로젝트', value: ROWS.length, unit: '건' },
          { label: '진행 중', value: ongoing, unit: '건' },
          { label: '종료', value: completed, unit: '건' },
          { label: '수상작', value: ROWS.filter((r) => r.award).length, unit: '건' },
        ]}
      />

      <section className={kit.card}>
        <div className={kit.toolbar}>
          <div className={kit.seg} role="group" aria-label="진행 상태 필터">
            {STATES.map((s) => (
              <button
                key={s.value}
                type="button"
                aria-pressed={state === s.value}
                onClick={() => setState(s.value)}
              >
                {s.label}
                <span className={kit.segCount}>{stateCount(s.value)}</span>
              </button>
            ))}
          </div>
          <Search value={q} onChange={setQ} placeholder="프로젝트명 · 고객사 검색" />
          <Select
            label="카테고리"
            value={cat}
            onChange={setCat}
            options={[{ value: 'all', label: '전체 카테고리' }, ...CATEGORIES.map((c) => ({ value: c, label: c }))]}
          />
          <span className={kit.toolbarSpacer} />
          <span className={kit.count}>
            <b>{visible.length}</b> / {ROWS.length}건
          </span>
        </div>

        {visible.length === 0 ? (
          <Empty title="조건에 맞는 프로젝트가 없습니다" desc="상태 · 카테고리 · 검색어를 바꿔보세요." />
        ) : (
          <div className={kit.tableWrap}>
            <table className={kit.table}>
              <thead>
                <tr>
                  <th style={{ width: 56 }}>No.</th>
                  <th style={{ width: 88 }}>썸네일</th>
                  <th>프로젝트명</th>
                  <th style={{ width: 150 }}>고객사</th>
                  <th style={{ width: 120 }}>카테고리</th>
                  <th style={{ width: 190 }}>수행 기간</th>
                  <th style={{ width: 140 }}>상태</th>
                  <th style={{ width: 140 }} />
                </tr>
              </thead>
              <tbody>
                {visible.map((r, i) => {
                  const badge =
                    r.state === 'ongoing'
                      ? ongoingBadge(r.period ?? '')
                      : { tone: 'green' as BadgeTone, label: '종료' };
                  return (
                    <tr key={r.key}>
                      <td className={kit.num}>{String(i + 1).padStart(2, '0')}</td>
                      <td>
                        <img className={kit.thumb} src={r.image} alt="" />
                      </td>
                      <td>
                        <div className={kit.tdStrong}>
                          {r.title}
                          {r.award ? (
                            <>
                              {' '}
                              <Badge tone="amber">Award</Badge>
                            </>
                          ) : null}
                        </div>
                        {r.subtitle ? <div className={kit.tdSub}>{r.subtitle}</div> : null}
                      </td>
                      <td>{r.client ?? <span className={kit.num}>-</span>}</td>
                      <td>
                        <Badge tone="plain">{r.category}</Badge>
                      </td>
                      <td className={kit.num}>{r.period ?? '-'}</td>
                      <td>
                        <Badge tone={badge.tone}>{badge.label}</Badge>
                      </td>
                      <td className={kit.tdActions}>
                        <button type="button" className={btnSm} disabled>
                          수정
                        </button>{' '}
                        <button type="button" className={btnSm} disabled>
                          {r.state === 'ongoing' ? '종료 처리' : '삭제'}
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        <div className={kit.cardFoot}>
          <span>진행 프로젝트는 Ongoing 테이블에, 종료 프로젝트는 카드 그리드에 노출됩니다.</span>
          <span>src/data/projectsPage.ts</span>
        </div>
      </section>
    </>
  );
}
