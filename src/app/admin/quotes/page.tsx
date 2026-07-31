'use client';

import { useEffect, useMemo, useState } from 'react';
import { Badge, Empty, Note, PageHead, Search, Select, Skeleton, Stats, fmtDate, selectClass, type BadgeTone } from '@/components/admin/ui';
import { PROJECT_FIELDS } from '@/data/contact';
import { supabase } from '@/lib/supabase';
import kit from '@/components/admin/kit.module.css';

type Quote = {
  id: string;
  created_at: string;
  company: string | null;
  person: string | null;
  phone: string | null;
  email: string | null;
  url: string | null;
  content: string | null;
  status: string | null;
  project_fields: Record<string, string[]> | null;
};

const STATUS: { value: string; label: string; tone: BadgeTone }[] = [
  { value: 'pending', label: '신규 접수', tone: 'blue' },
  { value: 'in_progress', label: '검토 중', tone: 'amber' },
  { value: 'completed', label: '완료', tone: 'green' },
];

const statusMeta = (v: string | null) =>
  STATUS.find((s) => s.value === v) ?? { value: v ?? '', label: v || '미지정', tone: 'plain' as BadgeTone };

/* chip group key -> the human label used on the contact form */
const FIELD_LABEL: Record<string, string> = Object.fromEntries(
  PROJECT_FIELDS.map((f) => [f.key, f.label]),
);

export default function QuotesPage() {
  const [rows, setRows] = useState<Quote[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState<string | null>(null);
  const [q, setQ] = useState('');
  const [filter, setFilter] = useState('all');

  useEffect(() => {
    let alive = true;
    (async () => {
      const { data, error } = await supabase
        .from('quotes')
        .select('*')
        .order('created_at', { ascending: false });
      if (!alive) return;
      if (error) setError(error.message);
      else setRows((data ?? []) as Quote[]);
      setLoading(false);
    })();
    return () => {
      alive = false;
    };
  }, []);

  const changeStatus = async (id: string, next: string) => {
    const prev = rows;
    setSaving(id);
    setRows((r) => r.map((row) => (row.id === id ? { ...row, status: next } : row))); // optimistic
    const { error } = await supabase.from('quotes').update({ status: next }).eq('id', id);
    setSaving(null);
    if (error) {
      setRows(prev); // roll back
      setError(`상태 변경 실패: ${error.message}`);
    } else {
      setError(null);
    }
  };

  const visible = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return rows.filter((r) => {
      if (filter !== 'all' && r.status !== filter) return false;
      if (!needle) return true;
      return [r.company, r.person, r.email, r.phone, r.content]
        .some((v) => (v ?? '').toLowerCase().includes(needle));
    });
  }, [rows, q, filter]);

  const count = (v: string) => rows.filter((r) => r.status === v).length;

  return (
    <>
      <PageHead href="/admin/quotes" />

      <Stats
        items={[
          { label: '전체 문의', value: rows.length, unit: '건' },
          { label: '신규 접수', value: count('pending'), unit: '건' },
          { label: '검토 중', value: count('in_progress'), unit: '건' },
          { label: '완료', value: count('completed'), unit: '건' },
        ]}
      />

      {error ? <Note warn>{error}</Note> : null}

      <section className={kit.card}>
        <div className={kit.toolbar}>
          <Search value={q} onChange={setQ} placeholder="기업명 · 담당자 · 이메일 · 내용 검색" />
          <Select
            label="진행 상태"
            value={filter}
            onChange={setFilter}
            options={[{ value: 'all', label: '전체 상태' }, ...STATUS.map((s) => ({ value: s.value, label: s.label }))]}
          />
          <span className={kit.toolbarSpacer} />
          <span className={kit.count}>
            <b>{visible.length}</b> / {rows.length}건
          </span>
        </div>

        {loading ? (
          <Skeleton />
        ) : visible.length === 0 ? (
          <Empty
            title={rows.length === 0 ? '접수된 견적 문의가 없습니다' : '조건에 맞는 문의가 없습니다'}
            desc={rows.length === 0 ? 'Contact 페이지에서 문의가 접수되면 이곳에 표시됩니다.' : '검색어나 상태 필터를 바꿔보세요.'}
          />
        ) : (
          <div className={kit.tableWrap}>
            <table className={kit.table}>
              <thead>
                <tr>
                  <th style={{ width: 150 }}>접수일시</th>
                  <th style={{ width: 190 }}>기업 / 담당자</th>
                  <th style={{ width: 200 }}>연락처</th>
                  <th>의뢰 내용</th>
                  <th style={{ width: 150 }}>진행 상태</th>
                </tr>
              </thead>
              <tbody>
                {visible.map((r) => (
                  <tr key={r.id}>
                    <td className={kit.num}>{fmtDate(r.created_at)}</td>
                    <td>
                      <div className={kit.tdStrong}>{r.company || '-'}</div>
                      <div className={kit.tdSub}>{r.person || '-'}</div>
                    </td>
                    <td>
                      <div className={kit.nowrap}>{r.phone || '-'}</div>
                      <div className={kit.tdSub}>{r.email || '-'}</div>
                    </td>
                    <td>
                      <p className={kit.clamp}>{r.content || '내용 없음'}</p>
                      {r.url ? <div className={kit.tdSub}>{r.url}</div> : null}
                      <div className={kit.chips} style={{ marginTop: 8 }}>
                        {Object.entries(r.project_fields ?? {}).flatMap(([key, values]) =>
                          (values ?? []).map((v) => (
                            <span className={kit.chip} key={`${key}-${v}`}>
                              <span className={kit.chipKey}>{FIELD_LABEL[key] ?? key}</span>
                              {v}
                            </span>
                          )),
                        )}
                      </div>
                    </td>
                    <td>
                      <Badge tone={statusMeta(r.status).tone}>{statusMeta(r.status).label}</Badge>
                      <select
                        className={selectClass}
                        style={{ marginTop: 8, width: '100%', height: 30, fontSize: 12.5 }}
                        aria-label="진행 상태 변경"
                        value={r.status ?? ''}
                        disabled={saving === r.id}
                        onChange={(e) => changeStatus(r.id, e.target.value)}
                      >
                        {STATUS.map((s) => (
                          <option key={s.value} value={s.value}>
                            {s.label}
                          </option>
                        ))}
                      </select>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <div className={kit.cardFoot}>
          <span>최신 접수순으로 정렬됩니다.</span>
          <span>Supabase · quotes</span>
        </div>
      </section>
    </>
  );
}
