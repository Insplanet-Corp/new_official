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

export const RECRUIT_ROLES = [
  '프로젝트 관리자/기획자',
  '디자이너',
  '프론트앤드 퍼블리셔',
  '기타',
];
