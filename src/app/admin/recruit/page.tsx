'use client';

import { useEffect, useMemo, useState } from 'react';
import { Badge, Empty, Note, PageHead, Search, Select, Skeleton, Stats, fmtDate, type BadgeTone } from '@/components/admin/ui';
import { RECRUIT_ROLES } from '@/data/contact';
import { supabase } from '@/lib/supabase';

type Recruit = {
  id: string;
  created_at: string;
  name: string | null;
  phone: string | null;
  email: string | null;
  url: string | null;
  role: string[] | null;
  file_url: string | null;
  status: string | null;
};

const STATUS: { value: string; label: string; tone: BadgeTone }[] = [
  { value: 'pending', label: '신규 접수', tone: 'blue' },
  { value: 'reviewing', label: '서류 검토', tone: 'amber' },
  { value: 'hired', label: '채용 확정', tone: 'green' },
  { value: 'rejected', label: '보류', tone: 'red' },
];

const statusMeta = (v: string | null) =>
  STATUS.find((s) => s.value === v) ?? { value: v ?? '', label: v || '미지정', tone: 'plain' as BadgeTone };

export default function RecruitPage() {
  const [rows, setRows] = useState<Recruit[]>([]);
  const [loading, setLoading] = useState(true);
  /** 테이블이 아직 없을 때(Join us 모달이 DB에 저장하지 않는 상태) 안내를 띄운다 */
  const [tableMissing, setTableMissing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [q, setQ] = useState('');
  const [role, setRole] = useState('all');

  useEffect(() => {
    let alive = true;
    (async () => {
      const { data, error } = await supabase
        .from('recruits')
        .select('*')
        .order('created_at', { ascending: false });
      if (!alive) return;
      if (error) {
        // PGRST205 / 42P01 = 테이블 없음. 그 외는 실제 오류로 노출.
        if (/does not exist|schema cache|42P01|PGRST205/i.test(`${error.code} ${error.message}`)) {
          setTableMissing(true);
        } else {
          setError(error.message);
        }
      } else {
        setRows((data ?? []) as Recruit[]);
      }
      setLoading(false);
    })();
    return () => {
      alive = false;
    };
  }, []);

  const visible = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return rows.filter((r) => {
      if (role !== 'all' && !(r.role ?? []).includes(role)) return false;
      if (!needle) return true;
      return [r.name, r.email, r.phone].some((v) => (v ?? '').toLowerCase().includes(needle));
    });
  }, [rows, q, role]);

  const count = (v: string) => rows.filter((r) => r.status === v).length;

  return (
    <>
      <PageHead href="/admin/recruit" />

      {tableMissing ? (
        <Note warn>
          <span>
            <b>recruits 테이블이 아직 없습니다</b> — Contact 페이지의 Join us 모달은 현재 지원서를 DB에
            저장하지 않습니다. Supabase 에 <code>recruits</code>(name · phone · email · url · role ·
            file_url · status) 테이블을 만들고 모달의 제출 핸들러를 연결하면 이 목록이 바로 채워집니다.
          </span>
        </Note>
      ) : null}
      {error ? <Note warn>{error}</Note> : null}

      <Stats
        items={[
          { label: '전체 지원', value: rows.length, unit: '명' },
          { label: '신규 접수', value: count('pending'), unit: '명' },
          { label: '서류 검토', value: count('reviewing'), unit: '명' },
          { label: '채용 확정', value: count('hired'), unit: '명' },
        ]}
      />

      <section className="adm-card">
        <div className="adm-toolbar">
          <Search value={q} onChange={setQ} placeholder="이름 · 이메일 · 연락처 검색" />
          <Select
            label="지원 직군"
            value={role}
            onChange={setRole}
            options={[{ value: 'all', label: '전체 직군' }, ...RECRUIT_ROLES.map((r) => ({ value: r, label: r }))]}
          />
          <span className="adm-toolbar-spacer" />
          <span className="adm-count">
            <b>{visible.length}</b> / {rows.length}명
          </span>
        </div>

        {loading ? (
          <Skeleton />
        ) : visible.length === 0 ? (
          <Empty
            title="접수된 지원서가 없습니다"
            desc="Join us 모달로 지원서가 접수되면 이곳에 표시됩니다."
          />
        ) : (
          <div className="adm-table-wrap">
            <table className="adm-table">
              <thead>
                <tr>
                  <th style={{ width: 150 }}>지원일시</th>
                  <th style={{ width: 140 }}>지원자</th>
                  <th style={{ width: 200 }}>연락처</th>
                  <th>지원 직군</th>
                  <th style={{ width: 130 }}>포트폴리오</th>
                  <th style={{ width: 120 }}>상태</th>
                </tr>
              </thead>
              <tbody>
                {visible.map((r) => (
                  <tr key={r.id}>
                    <td className="num">{fmtDate(r.created_at)}</td>
                    <td className="adm-td-strong">{r.name || '-'}</td>
                    <td>
                      <div className="nowrap">{r.phone || '-'}</div>
                      <div className="adm-td-sub">{r.email || '-'}</div>
                    </td>
                    <td>
                      <div className="adm-chips">
                        {(r.role ?? []).map((v) => (
                          <span className="adm-chip" key={v}>
                            {v}
                          </span>
                        ))}
                      </div>
                      {r.url ? <div className="adm-td-sub">{r.url}</div> : null}
                    </td>
                    <td>
                      {r.file_url ? (
                        <a className="adm-btn adm-btn-sm" href={r.file_url} target="_blank" rel="noreferrer">
                          내려받기
                        </a>
                      ) : (
                        <span className="num">-</span>
                      )}
                    </td>
                    <td>
                      <Badge tone={statusMeta(r.status).tone}>{statusMeta(r.status).label}</Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <div className="adm-card-foot">
          <span>최신 지원순으로 정렬됩니다.</span>
          <span>Supabase · recruits</span>
        </div>
      </section>
    </>
  );
}
