/* 견적문의 목록 CSV 내보내기.

   ⚠️ 이 파일에는 **원본** 연락처·이메일이 들어간다(마스킹하지 않는다). 그래서
   내보내기 전에 사유를 받고 quote_access_logs 에 'download' 로 남긴다
   (lib/quoteAccessLog.ts). 순서는 "사유 → 기록 성공 → 파일 생성" 이다 —
   기록이 실패하면 파일을 만들지 않는다. */

import { QUOTE_STATUS } from '@/data/adminOptions';
import { fieldText, type Quote } from '@/lib/quotes';

const HEADERS = [
  '접수일시',
  '기업명',
  '신청인',
  '연락처',
  '이메일',
  '기존 사이트 URL',
  '프로젝트 업무범위',
  '프로젝트 성격',
  '프로젝트 예산',
  '프로젝트 기간',
  '진행 상태',
  '프로젝트 내용',
];

const statusLabel = (v: string | null) =>
  QUOTE_STATUS.find((s) => s.value === v)?.label ?? v ?? '';

/* 스프레드시트가 셀 내용을 수식으로 해석하는 것을 막는다(CSV 인젝션).
   =cmd|... 같은 값이 그대로 들어가면 여는 사람 컴퓨터에서 실행될 수 있어
   맨 앞에 작은따옴표를 붙여 문자열로 고정한다. */
const defuse = (v: string) => (/^[=+\-@\t\r]/.test(v) ? `'${v}` : v);

const cell = (v: unknown): string => {
  const s = v == null ? '' : String(v);
  const safe = defuse(s);
  // 큰따옴표는 두 번, 개행·쉼표가 들어가므로 항상 감싼다
  return `"${safe.replace(/"/g, '""')}"`;
};

/** 화면에 보이는 것과 같은 형식(YYYY-MM-DD HH:mm)으로 — ui.tsx 의 fmtDate 와 짝 */
const fmt = (iso: string) => {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}`;
};

export function buildQuotesCsv(rows: Quote[]): string {
  const lines = [HEADERS.map(cell).join(',')];
  for (const r of rows) {
    lines.push(
      [
        fmt(r.created_at),
        r.company,
        r.person,
        r.phone,
        r.email,
        r.url,
        fieldText(r, 'scope'),
        fieldText(r, 'nature'),
        fieldText(r, 'budget'),
        fieldText(r, 'period'),
        statusLabel(r.status),
        r.content,
      ]
        .map(cell)
        .join(','),
    );
  }
  return lines.join('\r\n');
}

/** 파일명: 견적문의_20260901_1530.csv · 라벨을 주면 견적문의_인스플래닛_20260901_1530.csv

    ⚠️ 라벨(기업명)에는 무엇이든 들어올 수 있다 — 파일명에 못 쓰는 문자와 경로 구분자를
    지운다. 안 지우면 브라우저가 이름을 통째로 바꿔 버리거나 저장에 실패한다. */
export function csvFileName(label?: string | null, now = new Date()): string {
  const p = (n: number) => String(n).padStart(2, '0');
  const stamp = `${now.getFullYear()}${p(now.getMonth() + 1)}${p(now.getDate())}_${p(now.getHours())}${p(now.getMinutes())}`;
  const tag = (label ?? '')
    .replace(/[\\/:*?"<>|\r\n]/g, '')
    .trim()
    .slice(0, 40);
  return tag ? `견적문의_${tag}_${stamp}.csv` : `견적문의_${stamp}.csv`;
}

/** 브라우저에 파일을 내려준다.
    ⚠️ 맨 앞의 BOM 을 빼지 말 것 — 없으면 엑셀이 UTF-8 로 안 읽어 한글이 깨진다. */
export function downloadCsv(csv: string, fileName: string) {
  const blob = new Blob([`﻿${csv}`], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  a.remove();
  // 클릭 직후 바로 지우면 다운로드가 시작되기 전에 URL 이 사라질 수 있다
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
