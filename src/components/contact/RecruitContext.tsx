'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
  type RefObject,
} from 'react';

/* Careers 팝업의 상태를 PC 트리(ContactPageBody)와 모바일 트리(MobileContact)가 **함께** 쓴다.
   두 트리는 폭으로만 갈리고 항상 같이 마운트되므로(34번, home-responsive 패턴), 상태를 따로
   들면 "PC 에서 열어 둔 채 창을 줄이면 PC 모달이 찌그러진 채 남고 모바일 시트는 안 뜨는"
   상태가 된다. 여기서 셋을 공유한다 — 열림(open) · 폭 판정(isDesktop) · 폼 값(draft/role).

   ⚠️ **폭 판정을 두 모달이 각자 하면 안 된다.** 각자 하면 상태 갱신이 서로 다른 커밋에
   떨어져, 나가는 쪽의 effect cleanup 이 들어오는 쪽의 setup **뒤에** 돌 수 있다. 그러면
   ① 시트는 떠 있는데 페이지 스크롤 잠금(`html.rc-lock` + `lenis.stop()`)이 풀리고
   ② 아래 draft 동기화가 **저장 전에 복원**돼 입력값이 통째로 날아간다.
   한 곳에서 판정해야 두 모달이 **같은 커밋**에서 리렌더되고, React 가 그 커밋의 cleanup 을
   전부 돌린 뒤 setup 을 돌리므로 "나가는 쪽 저장 → 들어오는 쪽 복원" 순서가 보장된다.

   ⚠️ `matchMedia` 의 change 이벤트만 믿지 않고 resize 로도 같은 판정을 한다 — change 가 안
   오는 환경이 실제로 있다(ResponsiveSlot·ResponsiveScrollKeeper 와 같은 이유). 같은 값으로
   setState 하면 React 가 리렌더를 건너뛰므로 resize 마다 불러도 싸다. */
const DESKTOP = '(min-width: 1024px)';

/** 경계를 넘을 때 옮겨 실어야 하는 폼 값. 텍스트 입력은 uncontrolled 라 DOM 이 진실이다. */
type Draft = {
  name: string;
  phone: string;
  email: string;
  url: string;
  file: File | null;
};

/** 두 모달이 각자 들고 있는 입력 ref 들 — 이름은 같고 클래스 프리픽스만 다르다. */
export type DraftRefs = {
  name: RefObject<HTMLInputElement | null>;
  phone: RefObject<HTMLInputElement | null>;
  email: RefObject<HTMLInputElement | null>;
  url: RefObject<HTMLInputElement | null>;
  fileInput: RefObject<HTMLInputElement | null>;
};

const EMPTY: Draft = { name: '', phone: '', email: '', url: '', file: null };

type RecruitState = {
  open: boolean;
  /** 지금 폭에서 PC 모달(.rc-modal)을 쓰는가. false 면 모바일 풀스크린 시트(.mr-popup). */
  isDesktop: boolean;
  openRecruit: () => void;
  closeRecruit: () => void;
  /** 지원분야 칩 — 단일선택(다시 누르면 해제). 두 트리가 같은 값을 본다. */
  role: string[];
  toggleRole: (option: string) => void;
  draft: RefObject<Draft>;
  /** 접수 성공 뒤 폼을 비운다. 칩(state)과 공유 draft 를 함께 비워야 한다 —
      draft 만 비우면 반대편 트리가 옛 값을 들고 있다가 경계를 넘을 때 되살린다. */
  resetRecruit: () => void;
};

const Ctx = createContext<RecruitState | null>(null);

function setValue(ref: RefObject<HTMLInputElement | null>, v: string) {
  const el = ref.current;
  if (el && el.value !== v) el.value = v;
}

function restore(d: Draft, refs: DraftRefs) {
  setValue(refs.name, d.name);
  setValue(refs.phone, d.phone);
  setValue(refs.email, d.email);
  setValue(refs.url, d.url);

  const fi = refs.fileInput.current;
  if (!fi) return;
  if ((fi.files?.[0] ?? null) === d.file) return; // 같은 File 이면 건드리지 않는다
  try {
    if (d.file) {
      const dt = new DataTransfer();
      dt.items.add(d.file);
      fi.files = dt.files;
    } else {
      fi.value = '';
    }
    /* ⚠️ `files` 만 바꾸면 화면의 파일명 칸이 안 따라온다 — 그 칸과 내부 잠금값은 FileRow 가
       `change` 로만 갱신한다. 그래서 직접 쏜다. 이 이벤트는 `isTrusted:false` 라 FileRow 가
       포커스를 옮기지 않고(사용자가 고른 게 아니므로), 버블링돼서 폼의 onChange → 제출 게이팅
       재계산까지 같이 태운다. */
    fi.dispatchEvent(new Event('change', { bubbles: true }));
  } catch {
    /* DataTransfer 미지원 — 파일만 못 옮기고 나머지는 이미 복원됐다 */
  }
}

function capture(refs: DraftRefs, prev: Draft): Draft {
  const fi = refs.fileInput.current;
  return {
    name: refs.name.current?.value ?? prev.name,
    phone: refs.phone.current?.value ?? prev.phone,
    email: refs.email.current?.value ?? prev.email,
    url: refs.url.current?.value ?? prev.url,
    file: fi ? (fi.files?.[0] ?? null) : prev.file,
  };
}

/* 이 모달이 "지금 쓰이는 쪽" 이 되면 공유 draft 를 자기 DOM 에 복원하고, 쓰이지 않게 되면
   자기 DOM 값을 draft 에 담아 둔다. 닫을 때도 담기므로 다시 열면 값이 남아 있다
   (uncontrolled 입력이라 원래 그렇게 동작했다 — 그 성질을 두 트리로 넓힌 것). */
export function useRecruitDraftSync(active: boolean, refs: DraftRefs, onRestored?: () => void) {
  const { draft } = useRecruit();
  /* refs 객체와 콜백은 렌더마다 새로 만들어진다. effect 를 active 에만 반응시키려고 최신값을
     ref 에 담아 둔다 — 안 그러면 매 렌더마다 저장/복원이 한 번씩 더 돈다. */
  const latest = useRef({ refs, onRestored });
  latest.current = { refs, onRestored };

  useEffect(() => {
    if (!active) return;
    restore(draft.current, latest.current.refs);
    latest.current.onRestored?.();
    return () => {
      draft.current = capture(latest.current.refs, draft.current);
    };
  }, [active, draft]);
}

export function RecruitProvider({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);
  /* 서버는 뷰포트를 모른다. 이 값은 마크업을 가르지 않고(가르는 것은 CSS 다) effect 게이팅에만
     쓰이므로 초기값이 무엇이든 하이드레이션에 영향이 없다 — 팝업은 닫힌 채로 시작한다. */
  const [isDesktop, setIsDesktop] = useState(true);
  const [role, setRole] = useState<string[]>([]);
  const draft = useRef<Draft>({ ...EMPTY });

  useEffect(() => {
    const mq = matchMedia(DESKTOP);
    const sync = () => setIsDesktop(mq.matches);
    sync();
    mq.addEventListener?.('change', sync);
    addEventListener('resize', sync);
    return () => {
      mq.removeEventListener?.('change', sync);
      removeEventListener('resize', sync);
    };
  }, []);

  const openRecruit = useCallback(() => setOpen(true), []);
  const closeRecruit = useCallback(() => setOpen(false), []);
  const toggleRole = useCallback(
    (option: string) => setRole((cur) => (cur.includes(option) ? [] : [option])),
    [],
  );
  /* ⚠️ DOM 입력값은 여기서 못 지운다 — uncontrolled 라 각 모달이 자기 <form>.reset() 을
     불러야 한다. 여기는 **공유 상태만** 비운다. 순서는 각 모달에서
     "DOM reset → resetRecruit() → onClose()" 다: 닫히면서 도는 draft 동기화 cleanup 이
     이미 비워진 DOM 을 담게 되므로 값이 되살아나지 않는다. */
  const resetRecruit = useCallback(() => {
    setRole([]);
    draft.current = { ...EMPTY };
  }, []);

  const value = useMemo(
    () => ({ open, isDesktop, openRecruit, closeRecruit, role, toggleRole, draft, resetRecruit }),
    [open, isDesktop, openRecruit, closeRecruit, role, toggleRole, resetRecruit],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useRecruit(): RecruitState {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useRecruit 는 <RecruitProvider> 안에서만 쓸 수 있다');
  return ctx;
}
