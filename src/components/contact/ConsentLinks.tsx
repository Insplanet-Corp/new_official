'use client';

import { useLegal } from '@/components/contact/LegalContext';
import { LEGAL_LABEL } from '@/data/legal';

/* 동의 문구의 "이용약관 및 개인정보처리방침에 동의합니다." — PC(.ct-consent-text)와
   모바일(.mc-consent-text)이 **같은 것**을 쓴다. 클래스를 안 달고 링크만 그리므로
   두 트리를 클래스로 가르는 관례를 깨지 않는다(바깥 span 이 프리픽스를 준다).

   ⚠️ 이 링크는 <label> 안에 있다 — preventDefault 를 빠뜨리면 팝업을 여는 동시에
   동의 체크박스가 토글된다(라벨 활성화가 클릭의 기본 동작이다). 같은 preventDefault 가
   main.js 의 전역 링크 가로채기도 막아 준다(그쪽은 defaultPrevented 를 먼저 본다). */
export default function ConsentLinks() {
  const { openDoc } = useLegal();
  return (
    <>
      <a
        href="#"
        onClick={(e) => {
          e.preventDefault();
          openDoc('terms');
        }}
      >
        {LEGAL_LABEL.terms}
      </a>{' '}
      및{' '}
      <a
        href="#"
        onClick={(e) => {
          e.preventDefault();
          openDoc('privacy');
        }}
      >
        {LEGAL_LABEL.privacy}
      </a>
      에 동의합니다.
    </>
  );
}
