/* 견적문의(quotes) 도메인 — 어드민 목록/조회가 함께 쓰는 타입과 헬퍼.

   실제 Supabase 스키마 (anon 키로 컬럼 존재 확인함):
     id uuid · created_at timestamptz · company · person · phone · email
     url · content · status · project_fields jsonb

   project_fields 는 Contact 폼의 칩 선택이 그대로 들어간 JSON 이다:
     { scope: string[], nature: string[], budget: string[], period: string[] }
   기획서의 "프로젝트 업무범위 / 성격 / 예산 / 기간" 이 각각 여기에 대응한다.
   값은 칩에 적힌 한글 문자열 그대로다 (src/data/contact.ts PROJECT_FIELDS). */

export type Quote = {
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

/** project_fields 의 한 그룹을 배열로 꺼낸다 (없으면 빈 배열) */
export const fieldValues = (q: Quote, key: string): string[] => q.project_fields?.[key] ?? [];

/** 목록 셀처럼 한 줄로 보여줄 때 */
export const fieldText = (q: Quote, key: string): string => fieldValues(q, key).join(', ');

/** 선택된 필터 값이 그 그룹에 포함되는지 (다중선택이라 includes) */
export const hasField = (q: Quote, key: string, value: string): boolean =>
  value === 'all' || fieldValues(q, key).includes(value);
