'use client';

import { Fragment, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useLegal } from '@/components/contact/LegalContext';
import { LEGAL_DOCS, type LegalBlock, type LegalDoc, type LegalDocId } from '@/data/legal';

type LenisLike = { stop?: () => void; start?: () => void };

/* 이용약관 · 개인정보처리방침 팝업 (.tm-*) — 동의 문구의 링크로 연다.

   ⚠️ **이 팝업만 트리가 한 벌이다.** 사이트의 다른 챕터는 PC(.ct-*)/모바일(.mc-*) 마크업을
   두 벌 그리고 CSS 로 가르지만, 여기는 `.tm-*` 한 벌을 미디어쿼리로 모습만 바꾼다
   (contact.css 의 ≤1023 블록: 카드 → 풀스크린 시트, 타이틀 64→40 등).
   이유는 두 가지다 —
     ① 약관·방침 **전문**이라 두 벌로 그리면 /contact 문서에 같은 장문이 통째로 두 번 실린다.
     ② 레거시 런타임(public/js)이 잡는 이름이 하나도 없는 새 마크업이라, 두 벌로 가를 때
        생기는 함정(전역 플래그 싸움·포탈된 쪽을 반대 폭에서 감추기 등)이 아예 없다.
   그래서 RecruitModal 이 필요로 했던 open/active 구분도 여기서는 필요 없다.

   #page-root 가 페이지 전환 때 transform 을 받으므로 body 로 포탈한다 — 그래야
   position:fixed 가 뷰포트 기준을 지킨다(RecruitModal 과 같은 이유). */
export default function LegalModal() {
  const { doc, closeDoc } = useLegal();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  /* 껍데기(.tm-modal)는 항상 그려 두고 **본문만** 처음 열 때 붙인다.
     - 껍데기가 미리 있어야 `.is-open` 이 붙는 순간 opacity 0→1 트랜지션이 실제로 돈다
       (새로 만들어진 요소는 시작 상태가 없어 트랜지션 없이 즉시 나타난다).
     - 본문은 장문이라 열기 전에는 DOM 에 없는 편이 낫다. 한 번 연 문서는 그대로 남겨 둔다 —
       닫는 0.4s 페이드 동안 글자가 먼저 사라지지 않게 하려면 어차피 남아 있어야 한다. */
  const [shown, setShown] = useState<LegalDocId | null>(null);
  useEffect(() => {
    if (doc) setShown(doc);
  }, [doc]);

  const cardRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const lastFocus = useRef<Element | null>(null);

  // 열림/닫힘: 페이지 스크롤 잠금(Lenis + html.rc-lock) + 팝업 자기 스크롤 초기화 + 포커스 이동
  useEffect(() => {
    if (!doc) return;
    const html = document.documentElement;
    const lenis = (window as Window & { __lenis?: LenisLike }).__lenis;
    lastFocus.current = document.activeElement;
    html.classList.add('rc-lock');
    lenis?.stop?.();
    if (scrollRef.current) scrollRef.current.scrollTop = 0;
    const t = setTimeout(() => {
      try {
        closeRef.current?.focus({ preventScroll: true });
      } catch {
        /* focus can throw mid-transition */
      }
    }, 80);
    return () => {
      clearTimeout(t);
      html.classList.remove('rc-lock');
      lenis?.start?.();
      const prev = lastFocus.current;
      if (prev instanceof HTMLElement) {
        try {
          prev.focus({ preventScroll: true });
        } catch {
          /* the opener may be gone */
        }
      }
    };
  }, [doc]);

  // ESC / 카드 바깥 클릭으로 닫기 (≤1023 은 카드가 화면 전체라 바깥이 없다 — 그대로 무해)
  useEffect(() => {
    if (!doc) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closeDoc();
    };
    const onDown = (e: MouseEvent) => {
      if (cardRef.current && !cardRef.current.contains(e.target as Node)) closeDoc();
    };
    addEventListener('keydown', onKey);
    addEventListener('mousedown', onDown);
    return () => {
      removeEventListener('keydown', onKey);
      removeEventListener('mousedown', onDown);
    };
  }, [doc, closeDoc]);

  if (!mounted) return null;
  const content: LegalDoc | null = shown ? LEGAL_DOCS[shown] : null;

  return createPortal(
    <div
      className={doc ? 'tm-modal is-open' : 'tm-modal'}
      id="legal-modal"
      role="dialog"
      aria-modal="true"
      aria-labelledby="tm-title"
      aria-hidden={!doc}
    >
      <div className="tm-modal-dim" aria-hidden="true" />
      <div className="tm-card" ref={cardRef}>
        {/* fixed top-right; floats over the scroll */}
        <button
          type="button"
          className="tm-close"
          aria-label="닫기"
          ref={closeRef}
          onClick={closeDoc}
        >
          <svg width="96" height="96" viewBox="0 0 96 96" fill="none">
            <path
              d="M24 24L72 72M72 24L24 72"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </button>
        <div className="tm-scroll" data-lenis-prevent="" ref={scrollRef}>
          {content && (
            <>
              <div className="tm-head">
                <p className="tm-title" id="tm-title">
                  {content.title}
                </p>
                <p className="tm-lead">
                  <Lines lines={content.lead} pcOnly={content.leadBreakPcOnly} />
                </p>
              </div>
              <div className="tm-list">
                {content.clauses.map((clause) => (
                  <div className="tm-item" key={clause.title}>
                    <p className="tm-item-title">{clause.title}</p>
                    {clause.blocks.map((block, i) => (
                      <p key={i} className={blockClass(block)}>
                        <Lines lines={block.lines} />
                      </p>
                    ))}
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </div>
    </div>,
    document.body,
  );
}

function blockClass(block: LegalBlock): string | undefined {
  const cls = [block.li ? 'tm-li' : '', block.brk ? 'tm-break' : ''].filter(Boolean).join(' ');
  return cls || undefined;
}

/* 여러 줄을 <br> 로 잇는다. pcOnly 면 그 <br> 를 .tm-br-pc 로 그려 ≤1023 에서 접는다 —
   문장 **중간**에서 끊는 줄바꿈은 좁은 화면에서 어색하기 때문이다(정적 사이트의
   mobile-contact.html 도 약관 도입문에서만 그 줄바꿈을 뺐다).
   ⚠️ 접힐 자리에는 공백이 남아야 한다 — display:none 만 하면 앞뒤 단어가 붙어 버린다. */
function Lines({ lines, pcOnly }: { lines: string[]; pcOnly?: boolean }) {
  return (
    <>
      {lines.map((line, i) => (
        <Fragment key={i}>
          {i > 0 &&
            (pcOnly ? (
              <>
                {' '}
                <br className="tm-br-pc" />
              </>
            ) : (
              <br />
            ))}
          {line}
        </Fragment>
      ))}
    </>
  );
}
