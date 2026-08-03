/* 기획서(관리자시스템_화면설계서)에 명시된 셀렉트/라디오 선택지 모음.
   화면마다 흩어지면 문구가 어긋나므로 여기 한 곳에만 둔다.
   앞의 '전체'는 목록 화면의 조회 조건에서만 쓰고, 등록/수정 화면에서는 뺀다. */

import { PROJECT_FIELDS } from '@/data/contact';

export type Option = { value: string; label: string };

const withAll = (opts: Option[]): Option[] => [{ value: 'all', label: '전체' }, ...opts];

/* ---- 공통 ---------------------------------------------------------------- */
/** 사용여부 Y/N (기획서: 목록 필터는 전체/진행/종료 표기지만 값은 Y/N) */
export const USE_YN: Option[] = [
  { value: 'Y', label: 'Y' },
  { value: 'N', label: 'N' },
];
export const USE_YN_FILTER = withAll(USE_YN);

/* ---- 포트폴리오관리 (기획서 23~28p) -------------------------------------- */
export const PORTFOLIO_CATEGORY: Option[] = [
  { value: 'Web', label: 'Web' },
  { value: 'Mobile', label: 'Mobile' },
  { value: 'Consulting', label: 'Consulting' },
];
export const PORTFOLIO_CATEGORY_FILTER = withAll(PORTFOLIO_CATEGORY);

export const PORTFOLIO_STATUS: Option[] = [
  { value: 'ongoing', label: '진행' },
  { value: 'done', label: '종료' },
];
export const PORTFOLIO_STATUS_FILTER = withAll(PORTFOLIO_STATUS);

/* ---- 견적문의관리 (기획서 31p) -------------------------------------------
   ⚠️ 값을 여기서 새로 정의하면 안 된다. Contact 폼이 칩에 적힌 한글 문자열을
   그대로 quotes.project_fields 에 넣기 때문에("웹사이트", "신규" …), 어드민 필터도
   같은 문자열이어야 매칭된다. 그래서 PROJECT_FIELDS 에서 파생시킨다.
   (영문 슬러그로 따로 만들었다가 필터가 아무것도 못 거르는 문제가 있었다.) */
const chipOptions = (key: string): Option[] =>
  PROJECT_FIELDS.find((f) => f.key === key)?.options.map((o) => ({ value: o, label: o })) ?? [];

/** 시스템 종류 = 프로젝트 업무범위 (project_fields.scope) */
export const QUOTE_SYSTEM: Option[] = chipOptions('scope');
export const QUOTE_SYSTEM_FILTER = withAll(QUOTE_SYSTEM);

/** 개발 구분 = 프로젝트 성격 (project_fields.nature) */
export const QUOTE_KIND: Option[] = chipOptions('nature');
export const QUOTE_KIND_FILTER = withAll(QUOTE_KIND);

/** 견적문의 진행 상태 — 기존 어드민이 쓰던 값 (quotes.status) */
export const QUOTE_STATUS: Option[] = [
  { value: 'pending', label: '신규 접수' },
  { value: 'in_progress', label: '검토 중' },
  { value: 'completed', label: '완료' },
];
export const QUOTE_STATUS_FILTER = withAll(QUOTE_STATUS);

/* ---- 리크루트관리 (기획서 35p) ------------------------------------------- */
export const RECRUIT_FIELD: Option[] = [
  { value: 'planning', label: '기획' },
  { value: 'design', label: '디자인' },
  { value: 'publishing', label: '퍼블리싱' },
  { value: 'dev', label: '개발' },
  { value: 'ai', label: 'AI' },
  { value: 'etc', label: '기타' },
];
export const RECRUIT_FIELD_FILTER = withAll(RECRUIT_FIELD);

export const RECRUIT_GRADE: Option[] = [
  { value: 'junior', label: '초급' },
  { value: 'mid', label: '중급' },
  { value: 'senior', label: '고급' },
  { value: 'expert', label: '특급' },
];
export const RECRUIT_GRADE_FILTER = withAll(RECRUIT_GRADE);

/** 경력 : 전체, 신입, 1~30년 */
export const RECRUIT_CAREER_FILTER: Option[] = [
  { value: 'all', label: '전체' },
  { value: '0', label: '신입' },
  ...Array.from({ length: 30 }, (_, i) => ({ value: String(i + 1), label: `${i + 1}년` })),
];

export const RECRUIT_EMPLOYMENT: Option[] = [
  { value: 'seeking', label: '구직중' },
  { value: 'employed', label: '재직중' },
  { value: 'leaving', label: '퇴사예정' },
];
export const RECRUIT_EMPLOYMENT_FILTER = withAll(RECRUIT_EMPLOYMENT);

/* 값 -> 라벨 (목록/조회 화면 표시용) */
export const labelOf = (opts: Option[], value: string | null | undefined) =>
  opts.find((o) => o.value === value)?.label ?? value ?? '-';
