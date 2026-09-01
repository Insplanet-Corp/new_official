'use client';

import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';
import type { LegalDocId } from '@/data/legal';

/* 이용약관 · 개인정보처리방침 팝업의 열림 상태.

   PC 폼(ContactForm)과 모바일 폼(MobileContactForm)의 **동의 문구 링크 두 벌**이 같은 팝업
   하나(LegalModal)를 연다. 두 트리는 폭으로만 갈릴 뿐 항상 함께 마운트되므로(34번),
   상태를 각자 들면 경계를 넘을 때 열려 있던 팝업이 닫힌다. RecruitProvider 와 같은 이유다.

   ⚠️ 단 RecruitContext 와 달리 여기에는 폭 판정(isDesktop)이 없다 — 팝업 트리 자체가
   한 벌이고 CSS 미디어쿼리로만 모습이 바뀌기 때문이다(LegalModal 주석 참고). */
type LegalState = {
  /** 지금 열려 있는 문서. null 이면 닫힘 */
  doc: LegalDocId | null;
  openDoc: (id: LegalDocId) => void;
  closeDoc: () => void;
};

const Ctx = createContext<LegalState | null>(null);

export function LegalProvider({ children }: { children: ReactNode }) {
  const [doc, setDoc] = useState<LegalDocId | null>(null);
  const openDoc = useCallback((id: LegalDocId) => setDoc(id), []);
  const closeDoc = useCallback(() => setDoc(null), []);
  const value = useMemo(() => ({ doc, openDoc, closeDoc }), [doc, openDoc, closeDoc]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useLegal(): LegalState {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useLegal 는 <LegalProvider> 안에서만 쓸 수 있다');
  return ctx;
}
