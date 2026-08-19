/* Projects 페이지가 그리는 뷰 모델.

   예전엔 이 파일이 더미 40장을 시드 RNG 로 생성했다(이미지 11개·이름 15개 풀에서
   무작위 조합). 지금은 Supabase 의 portfolios 에서 온다 — 아래 매퍼가 DB 행을
   화면이 쓰는 모양으로 바꾼다. 실제 조회는 app/projects/page.tsx(서버)에서 한다.

   ⚠️ 클라이언트에서 뒤늦게 가져오면 안 된다. ProjectsExplorer 의 reveal 이펙트는
   마운트 시점에 DOM 의 .pj-card 를 세어서 첫 행을 계산하는데, 그때 카드가 없으면
   아무 카드에도 .in 이 붙지 않아 그리드 전체가 opacity:0 으로 남는다. */

import {
  type Portfolio,
  detailSrc,
  formatPeriod,
  titleLines,
  titleOneLine,
} from '@/lib/portfolios';

export type Category = 'all' | 'web' | 'mobile' | 'consulting';

export const CATEGORIES: { filter: Category; label: string }[] = [
  { filter: 'all', label: 'All' },
  { filter: 'web', label: 'Web' },
  { filter: 'mobile', label: 'Mobile' },
  { filter: 'consulting', label: 'Consulting' },
];

export type ProjectCard = {
  id: string;
  image: string;
  /** 프로젝트명을 줄 단위로 끊은 것 (\n 기준) */
  lines: string[];
  /** 카드에 표기하는 분류 라벨 — 'Web' 'Mobile' 'Consulting' */
  cat: string;
  /** 필터 비교용 소문자 — CATEGORIES 의 filter 값과 같아야 한다 */
  category: string;
  award: boolean;
  /** 상세 HTML 이 등록된 카드만 링크가 된다. 없으면 클릭해도 아무 일 없음 */
  href: string | null;
  /** 시트가 iframe 에 넣을 상세 경로. href 와 짝이다 — 목록에서 열 때 조회를 한 번 더
      하지 않으려고 서버에서 같이 내려보낸다 */
  detail: string | null;
};

export type OngoingRow = {
  id: string;
  /** 고객사 CI. 기획서에 고객사"명" 텍스트 필드는 없고 이 이미지가 그 칸을 채운다 */
  logo: string;
  project: string;
  category: string;
  period: string;
};

/** 종료 프로젝트 -> 카드 그리드 */
export const toCards = (rows: Portfolio[]): ProjectCard[] =>
  rows
    .filter((r) => r.status === 'done')
    .map((r) => ({
      id: r.id,
      image: r.thumb_pc ?? r.thumb_mobile ?? '',
      lines: titleLines(r.title),
      cat: r.category ?? '',
      category: (r.category ?? '').toLowerCase(),
      award: r.award,
      href: detailSrc(r.html_file) ? `/projects/${r.id}` : null,
      detail: detailSrc(r.html_file),
    }));

/** 진행 프로젝트 -> 표 */
export const toOngoingRows = (rows: Portfolio[]): OngoingRow[] =>
  rows
    .filter((r) => r.status === 'ongoing')
    .map((r) => ({
      id: r.id,
      logo: r.client_ci ?? '',
      project: titleOneLine(r.title),
      category: r.category ?? '',
      period: formatPeriod(r.started_on, r.ended_on),
    }));
