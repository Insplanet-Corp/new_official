/* Contact page form options. */

export type ChipField = {
  key: string;
  label: string;
  multi?: boolean;
  options: string[];
};

export const PROJECT_FIELDS: ChipField[] = [
  {
    key: 'scope',
    label: '프로젝트 업무 범위',
    multi: true, // 업무 범위: 다중선택
    options: [
      '웹사이트',
      '앱',
      'AI',
      'CMS ∙ 시스템',
      '플랫폼 개발',
      '이커머스',
      '브랜딩',
      '연간 유지보수',
      '기타',
    ],
  },
  {
    key: 'nature',
    label: '프로젝트 성격',
    options: ['신규', '리뉴얼', '부분개편', '컨설팅', '기타'],
  },
  {
    key: 'budget',
    label: '프로젝트 예산',
    options: ['1억 미만', '1~2억', '2~3억', '3~4억', '4~5억', '5억~10억', '미정'],
  },
  {
    key: 'period',
    label: '프로젝트 기간',
    options: ['2개월', '4개월', '6개월', '8개월', '10개월', '1년 이상', '미정'],
  },
];

/* 모바일 칩 라벨 — 폭이 좁아 두 줄로 접히는 항목만 짧게 보여 준다.
   ⚠️ 바뀌는 것은 화면에 그려지는 글자뿐이고, 저장·필터에 쓰이는 값은 options 의 원문
   그대로다 (quotes.project_fields 에 그 문자열이 들어가고 adminOptions 의 필터가
   같은 문자열로 매칭한다 — 여기 값을 저장에 쓰면 어드민 필터가 아무것도 못 거른다).
   키는 options 원문이다. 지금은 업무 범위 두 개뿐이지만 모바일 칩 전체(입사지원
   지원분야 포함)에 적용되므로, 다른 그룹에 같은 문구가 생기면 함께 바뀐다. */
const MOBILE_CHIP_LABELS: Record<string, string> = {
  'CMS ∙ 시스템': 'CMS',
  '연간 유지보수': '유지보수',
};

/** 모바일에서 칩에 그릴 글자. 짧은 라벨이 없으면 원문 그대로. */
export function mobileChipLabel(option: string): string {
  return MOBILE_CHIP_LABELS[option] ?? option;
}

export const RECRUIT_ROLES = [
  '프로젝트 관리자/기획자',
  '디자이너',
  '프론트앤드 퍼블리셔',
  '기타',
];
