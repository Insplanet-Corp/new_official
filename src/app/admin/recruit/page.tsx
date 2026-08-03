'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { Badge, Empty, Note, PageHead, Search, Select } from '@/components/admin/ui';
import kit from '@/components/admin/kit.module.css';
import {
  RECRUIT_CAREER_FILTER,
  RECRUIT_EMPLOYMENT_FILTER,
  RECRUIT_FIELD_FILTER,
  RECRUIT_GRADE_FILTER,
  labelOf,
} from '@/data/adminOptions';

/* 리크루트관리 - 목록 (기획서 35p)
   조회 조건: 지원자명 + 지원분야 + 기술등급 + 경력 + 재직상태.
   ※ 지금은 화면 틀 — 목록 데이터 연동은 다음 단계. */

type RecruitRow = {
  id: string;
  createdAt: string;
  name: string;
  phone: string;
  field: string;
  grade: string;
  career: string;
  employment: string;
};

const ROWS: RecruitRow[] = [];

export default function RecruitListPage() {
  const [q, setQ] = useState('');
  const [field, setField] = useState('all');
  const [grade, setGrade] = useState('all');
  const [career, setCareer] = useState('all');
  const [employment, setEmployment] = useState('all');

  const visible = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return ROWS.filter((r) => {
      if (field !== 'all' && r.field !== field) return false;
      if (grade !== 'all' && r.grade !== grade) return false;
      if (career !== 'all' && r.career !== career) return false;
      if (employment !== 'all' && r.employment !== employment) return false;
      if (needle && !r.name.toLowerCase().includes(needle)) return false;
      return true;
    });
  }, [q, field, grade, career, employment]);

  return (
    <>
      <PageHead href="/admin/recruit" />

      <Note>
        <span>
          <b>화면 틀</b> — 기획서 5. 리크루트관리 구조입니다. 목록 조회와 DB 연동은 아직 붙지
          않았습니다.
        </span>
      </Note>

      <section className={kit.card}>
        <div className={kit.toolbar}>
          <Search value={q} onChange={setQ} placeholder="지원자" />
          <Select label="지원분야" value={field} onChange={setField} options={RECRUIT_FIELD_FILTER} />
          <Select label="기술등급" value={grade} onChange={setGrade} options={RECRUIT_GRADE_FILTER} />
          <Select label="경력" value={career} onChange={setCareer} options={RECRUIT_CAREER_FILTER} />
          <Select
            label="재직상태"
            value={employment}
            onChange={setEmployment}
            options={RECRUIT_EMPLOYMENT_FILTER}
          />
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
            desc="접수된 지원서가 없거나 조회 조건에 맞는 항목이 없습니다."
          />
        ) : (
          <div className={kit.tableWrap}>
            <table className={kit.table}>
              <thead>
                <tr>
                  <th style={{ width: 64 }}>No</th>
                  <th style={{ width: 140 }}>지원일시</th>
                  <th style={{ width: 130 }}>지원자</th>
                  <th style={{ width: 150 }}>연락처</th>
                  <th style={{ width: 120 }}>지원분야</th>
                  <th style={{ width: 100 }}>기술등급</th>
                  <th style={{ width: 90 }}>경력</th>
                  <th style={{ width: 110 }}>재직상태</th>
                </tr>
              </thead>
              <tbody>
                {visible.map((r, i) => (
                  <tr key={r.id}>
                    <td className={kit.num}>{visible.length - i}</td>
                    <td className={kit.num}>{r.createdAt}</td>
                    <td>
                      <Link href={`/admin/recruit/${r.id}`} className={kit.tdStrong}>
                        {r.name}
                      </Link>
                    </td>
                    <td className={kit.nowrap}>{r.phone}</td>
                    <td>
                      <Badge tone="plain">{labelOf(RECRUIT_FIELD_FILTER, r.field)}</Badge>
                    </td>
                    <td>{labelOf(RECRUIT_GRADE_FILTER, r.grade)}</td>
                    <td className={kit.num}>{labelOf(RECRUIT_CAREER_FILTER, r.career)}</td>
                    <td>{labelOf(RECRUIT_EMPLOYMENT_FILTER, r.employment)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <div className={kit.cardFoot}>
          <span>최신 지원순으로 정렬됩니다.</span>
          <span>기획서 5 · 리크루트관리 목록</span>
        </div>
      </section>
    </>
  );
}
