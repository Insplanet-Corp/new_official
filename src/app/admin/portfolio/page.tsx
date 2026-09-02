"use client";

import type { DragEvent, MouseEvent as ReactMouseEvent } from "react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  CategoryCell,
  Empty,
  Note,
  PageHead,
  PORTFOLIO_STATUS_COLOR,
  Search,
  Select,
  ValueBadge,
} from "@/components/admin/ui";
import kit from "@/components/admin/kit.module.css";
import {
  PORTFOLIO_CATEGORY_FILTER,
  PORTFOLIO_MAIN_FILTER,
  PORTFOLIO_STATUS_FILTER,
  USE_YN_FILTER,
  labelOf,
} from "@/data/adminOptions";
import { describeError, isMissingTable } from "@/lib/pgError";
import {
  type Portfolio,
  type PortfolioCategory,
  categoriesOf,
  formatDay,
  titleOneLine,
  toDetailFolder,
} from "@/lib/portfolios";
import { supabase } from "@/lib/supabase";
import Button from "@/components/button/Button";
import Text from "@/components/text/Text";
import Flex from "@/components/layouts/Flex";
import { Icon } from "@/components/icon/Icon";
import { VerticalDivider } from "@/components/divider/Divider";
import { Color } from "@/styles/theme";

/* 포트폴리오관리 - 목록 (기획서 23p)
   조회 조건: 포트폴리오명 키워드 + 분류 + 진행 상태 + 사용여부 + 메인.

   필터는 클라이언트에서 건다 — 건수가 수백 단위를 넘어가면 PostgREST 쿼리로
   옮겨야 한다(견적문의와 같은 판단).

   ── 표시 순서 (012) ────────────────────────────────────────────────────────
   행을 드래그해서 순서를 바꾸면 그 순서가 곧 홈페이지 순서다(/projects 그리드·
   진행중 표·홈 메인 슬라이드 전부 sort_order 오름차순으로 읽는다).
   "No" 는 sort_order 값이 아니라 정렬한 뒤의 위치(1,2,3…)를 그린다 — 드래그를
   거치면 값이 촘촘하지 않을 수 있어 값을 그대로 보여주면 번호가 튄다. */

const MISSING =
  "portfolios 스키마가 아직 없습니다. supabase/migrations/004_portfolios.sql 을 Supabase SQL Editor 에서 실행해 주세요.";

const SORT_MISSING =
  "표시 순서(sort_order) 컬럼이 없어 예전 순서(최근 등록 순)로 보여 주고 있습니다. supabase/migrations/012_portfolio_sort_order.sql 을 실행하면 드래그로 순서를 바꿀 수 있습니다.";

/** PostgREST: 없는 컬럼으로 정렬/조회했을 때 */
const UNDEFINED_COLUMN = "42703";

/* ---- 드래그 중 가장자리 자동 스크롤 ----------------------------------------
   목록이 40건이 넘어가면 화면 밖으로 끌어야 하는데, HTML5 드래그는 스크롤을
   대신 해 주지 않는다. 포인터가 화면 위/아래 끝에 닿으면 그쪽으로 굴린다.

   어드민은 Lenis(부드러운 스크롤)를 안 쓴다 — LegacyRuntime 은 마케팅 페이지의
   PageShell 에서만 로드된다. 그래서 window.scrollBy 로 충분하다. */
/** 가장자리로 치는 두께(px) */
const EDGE = 110;
/** 한 프레임에 굴릴 최대 픽셀 — 60fps 에서 대략 1300px/s */
const EDGE_SPEED = 22;

/** 마지막 포인터 y. 컴포넌트 밖에 두는 이유는 아래 trackPointer 주석 참고 */
let lastPointerY = 0;
/* add/removeEventListener 가 같은 함수 참조여야 떼진다. 컴포넌트 안에서 만들면
   렌더마다 새 함수가 되어 리스너가 쌓인다. */
const trackPointer = (e: globalThis.DragEvent) => {
  lastPointerY = e.clientY;
};

/** 포인터의 뷰포트 y -> 이번 프레임에 굴릴 픽셀. 가운데면 0 */
const edgeVelocity = (y: number): number => {
  const h = window.innerHeight;
  const near = (d: number) => Math.min(1, Math.max(0, 1 - d / EDGE));
  if (y < EDGE) return -EDGE_SPEED * near(y);
  if (y > h - EDGE) return EDGE_SPEED * near(h - y);
  return 0;
};

/** 배열에서 fromId 를 뽑아 toId 자리에 끼운다. 드래그 중 실시간 미리보기용 */
const moveBefore = (
  list: Portfolio[],
  fromId: string,
  toId: string,
): Portfolio[] => {
  const from = list.findIndex((r) => r.id === fromId);
  const to = list.findIndex((r) => r.id === toId);
  if (from < 0 || to < 0 || from === to) return list;
  const next = list.slice();
  const [moved] = next.splice(from, 1);
  next.splice(to, 0, moved);
  return next;
};

export default function PortfolioListPage() {
  const router = useRouter();
  const [rows, setRows] = useState<Portfolio[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tableMissing, setTableMissing] = useState(false);
  const [sortMissing, setSortMissing] = useState(false);

  const [q, setQ] = useState("");
  const [category, setCategory] = useState("all");
  const [status, setStatus] = useState("all");
  const [use, setUse] = useState("all");
  const [main, setMain] = useState("all");

  /* 드래그 상태. dragId 는 화면(반투명 처리)에도 쓰이므로 state 다. */
  const [dragId, setDragId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  /* 드래그 중 순서가 실제로 바뀌었는지. dragend 때 한 번만 저장한다 —
     dragover 마다 저장하면 한 번 끄는 동안 수십 번 왕복한다. */
  const dirty = useRef(false);
  /* dragover 는 한 프레임에 여러 번 들어오는데 그 사이에 리렌더가 없을 수 있다.
     state 만 보고 옮기면 같은 계산을 반복하므로 최신 배열을 ref 로 들고 있는다.
     (setRows 의 updater 안에서 옮기면 순수하지 않은 updater 가 된다 —
     StrictMode 가 두 번 호출하면서 순서가 두 번 밀린다) */
  const rowsRef = useRef<Portfolio[]>([]);

  /* 자동 스크롤용. 좌표는 dragover 로 계속 갱신하고(lastPointerY), 실제로 굴리는
     건 rAF 다 — dragover 는 포인터가 멈춰 있으면 뜸해져서(브라우저마다 다르다)
     그것만 보고 굴리면 끝에 붙여 놔도 스크롤이 뚝뚝 끊긴다. */
  const rafId = useRef(0);

  useEffect(() => {
    let alive = true;
    (async () => {
      const base = () => supabase.from("portfolios").select("*");

      /* 012 를 아직 실행하지 않은 DB 에서는 sort_order 로 정렬할 수 없다.
         그때 목록이 통째로 안 나오면 안 되므로 예전 순서로 물러난다. */
      let { data, error: err } = await base()
        .order("sort_order", { ascending: true })
        .order("seq", { ascending: false });
      if (err?.code === UNDEFINED_COLUMN) {
        if (alive) setSortMissing(true);
        ({ data, error: err } = await base().order("seq", {
          ascending: false,
        }));
      }

      if (!alive) return;
      if (err) {
        if (isMissingTable(err)) setTableMissing(true);
        else setError(describeError(err));
      } else {
        const next = (data ?? []) as Portfolio[];
        rowsRef.current = next;
        setRows(next);
      }
      setLoading(false);
    })();
    return () => {
      alive = false;
    };
  }, []);

  const filtered =
    q.trim() !== "" || [category, status, use, main].some((v) => v !== "all");

  /* 순서를 바꿀 수 있는 건 "지금 보이는 목록 == 전체 목록" 일 때뿐이다.
     걸러진 화면에서 끌면 안 보이는 행들 사이의 어디에 놓인 것인지 알 수 없다. */
  const reorderable = !filtered && !sortMissing && !tableMissing && !loading;

  const visible = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return rows.filter((r) => {
      // 다중 분류(022) — 하나라도 걸리면 통과한다
      if (
        category !== "all" &&
        !categoriesOf(r).includes(category as PortfolioCategory)
      )
        return false;
      if (status !== "all" && r.status !== status) return false;
      if (use !== "all" && r.use_yn !== use) return false;
      // is_main 은 boolean, 필터 값은 'Y'/'N' 문자열이다
      if (main !== "all" && (r.is_main ? "Y" : "N") !== main) return false;
      if (needle && !titleOneLine(r.title).toLowerCase().includes(needle))
        return false;
      return true;
    });
  }, [rows, q, category, status, use, main]);

  /* No 는 걸러진 목록의 몇 번째가 아니라 전체 목록에서의 자리다 —
     필터를 걸었을 때 화면의 번호와 실제 순서가 어긋나면 안 된다. */
  const position = useMemo(() => {
    const m = new Map<string, number>();
    rows.forEach((r, i) => m.set(r.id, i + 1));
    return m;
  }, [rows]);

  const persistOrder = useCallback(async (ordered: Portfolio[]) => {
    setSaving(true);
    const { error: err } = await supabase.rpc("reorder_portfolios", {
      p_ids: ordered.map((r) => r.id),
    });
    setSaving(false);
    if (err) {
      setError(
        `순서를 저장하지 못했습니다. ${describeError(err)} (012 마이그레이션을 실행했는지 확인해 주세요)`,
      );
      return;
    }
    setError(null);
    // 저장한 순서를 로컬 값에도 반영해 둔다 (되읽지 않는다)
    const renumbered = ordered.map((r, i) => ({ ...r, sort_order: i + 1 }));
    rowsRef.current = renumbered;
    setRows(renumbered);
  }, []);

  const stopAutoScroll = useCallback(() => {
    if (rafId.current) cancelAnimationFrame(rafId.current);
    rafId.current = 0;
    document.removeEventListener("dragover", trackPointer);
  }, []);

  const startAutoScroll = () => {
    if (rafId.current) return;
    /* 문서 전체에서 좌표를 받는다 — 행 위가 아니라 표 바깥(고정 헤더·여백)으로
       끌고 갔을 때도 계속 굴러야 한다. preventDefault 는 하지 않는다:
       좌표만 필요하고, 드롭 허용 여부는 행의 onDragOver 가 정한다. */
    document.addEventListener("dragover", trackPointer);
    const tick = () => {
      const v = edgeVelocity(lastPointerY);
      if (v) window.scrollBy(0, v);
      rafId.current = requestAnimationFrame(tick);
    };
    rafId.current = requestAnimationFrame(tick);
  };

  // 드래그 도중에 페이지를 떠나면 rAF 가 남는다
  useEffect(() => stopAutoScroll, [stopAutoScroll]);

  const onDragStart = (e: DragEvent<HTMLElement>, id: string) => {
    setDragId(id);
    dirty.current = false;
    lastPointerY = e.clientY;
    startAutoScroll();
    e.dataTransfer.effectAllowed = "move";
    // Firefox 는 데이터가 없으면 드래그를 시작하지 않는다
    e.dataTransfer.setData("text/plain", id);
    /* 손잡이만 draggable 이라 기본 고스트가 아이콘 하나다 — 행 전체로 바꾼다 */
    const tr = (e.currentTarget as HTMLElement).closest("tr");
    if (tr) e.dataTransfer.setDragImage(tr, 24, tr.clientHeight / 2);
  };

  const onDragOverRow = (e: DragEvent<HTMLTableRowElement>, id: string) => {
    if (!dragId) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    if (id === dragId) return;
    const next = moveBefore(rowsRef.current, dragId, id);
    if (next === rowsRef.current) return;
    rowsRef.current = next;
    dirty.current = true;
    setRows(next);
  };

  const onDragEnd = () => {
    stopAutoScroll();
    setDragId(null);
    if (!dirty.current) return;
    dirty.current = false;
    void persistOrder(rowsRef.current);
  };

  /* ---- 행 전체를 눌러도 상세로 --------------------------------------------
     <tr> 는 <Link> 로 감쌀 수 없다(테이블 안에서 <a> 가 행을 감싸는 마크업은
     스펙 위반이고 브라우저가 테이블 밖으로 끄집어낸다). 그래서 router.push 다.

     ⚠️ 제목의 <Link> 는 그대로 둔다 — 키보드 포커스·스크린리더·새 탭으로 열기가
     거기에 달려 있다. 대신 링크를 직접 눌렀을 때 두 번 이동하지 않게 아래에서 거른다. */
  const detailHref = (id: string) => `/admin/portfolio/${id}`;

  const onRowClick = (e: ReactMouseEvent<HTMLTableRowElement>, id: string) => {
    // 링크·손잡이·폼 컨트롤을 직접 눌렀으면 그쪽에 맡긴다
    if (
      (e.target as HTMLElement).closest(
        "a, button, input, select, [draggable='true']",
      )
    )
      return;
    // 글자를 긁어 복사하려던 것이면 이동하지 않는다
    if (window.getSelection()?.toString()) return;
    // ⌘/Ctrl 클릭은 새 탭 — 링크에서 기대하는 동작을 행에서도 맞춰 준다
    if (e.metaKey || e.ctrlKey) {
      window.open(detailHref(id), "_blank", "noopener");
      return;
    }
    router.push(detailHref(id));
  };

  return (
    <>
      <PageHead
        href="/admin/portfolio"
        actions={
          <Button
            href="/admin/portfolio/new"
            label="등록"
            color="BLUE"
            startIcon="plus"
            variant="solid"
            size="2"
            radius="medium"
          />
        }
      />

      {tableMissing ? <Note warn>{MISSING}</Note> : null}
      {sortMissing ? <Note warn>{SORT_MISSING}</Note> : null}
      {error ? <Note warn>{error}</Note> : null}

      <section className={kit.card}>
        <Flex
          row
          gap={16}
          p="14px 18px"
          wrap="wrap"
          align="center"
          style={{
            borderBottom: "1px solid var(--line)",
          }}
        >
          <Search value={q} onChange={setQ} placeholder="포트폴리오명" />
          <VerticalDivider size={12} />
          <Flex gap={24} row align="center">
            <Flex gap={8} row align="center">
              <Text size="2" color={Color.GRAY_500}>
                분류
              </Text>
              <Select
                label="분류"
                value={category}
                onChange={setCategory}
                options={PORTFOLIO_CATEGORY_FILTER}
              />
            </Flex>

            <Flex gap={8} row align="center">
              <Text size="2" color={Color.GRAY_500}>
                진행 상태
              </Text>
              <Select
                label="진행 상태"
                value={status}
                onChange={setStatus}
                options={PORTFOLIO_STATUS_FILTER}
              />
            </Flex>

            <Flex gap={8} row align="center">
              <Text size="2" color={Color.GRAY_500}>
                사용여부
              </Text>
              <Select
                label="사용여부"
                value={use}
                onChange={setUse}
                options={USE_YN_FILTER}
              />
            </Flex>

            <Flex gap={8} row align="center">
              <Text size="2" color={Color.GRAY_500}>
                메인
              </Text>
              <Select
                label="메인"
                value={main}
                onChange={setMain}
                options={PORTFOLIO_MAIN_FILTER}
              />
            </Flex>
          </Flex>

          <span className={kit.toolbarSpacer} />
          <Text size="1" fontSize="12.5px" className={kit.count}>
            조회결과 : <b>{visible.length}</b>건
          </Text>
        </Flex>

        {loading ? (
          <Empty title="불러오는 중…" desc="포트폴리오를 조회하고 있습니다." />
        ) : visible.length === 0 ? (
          <Empty
            title="조회 결과가 없습니다"
            desc="등록된 데이터가 없거나 조회 조건에 맞는 항목이 없습니다."
          />
        ) : (
          <div className={kit.tableWrap}>
            <table className={kit.table}>
              <thead>
                <tr>
                  <th style={{ width: 40 }}>
                    <span className={kit.srOnly}>순서</span>
                  </th>
                  <th style={{ width: 56, textAlign: "center" }}>No</th>
                  <th style={{ width: 130, textAlign: "center" }}>
                    등록/수정일
                  </th>
                  <th>포트폴리오명</th>
                  {/* 폭은 힌트일 뿐이다 — 이 표는 table-layout:auto 라 브라우저가 내용에
                      맞춰 다시 나눈다. 한 줄 보장은 CategoryCell 의 nowrap 이 한다.
                      (배지 실측: Web 37 · Mobile 50 · Consulting 73 + gap 4 → 200px) */}
                  <th style={{ width: 200, textAlign: "center" }}>분류</th>
                  <th style={{ width: 110, textAlign: "center" }}>진행 상태</th>
                  <th style={{ width: 220, textAlign: "center" }}>
                    상세화면 폴더명
                  </th>
                  <th style={{ width: 80, textAlign: "center" }}>메인</th>
                  <th style={{ width: 90, textAlign: "center" }}>사용여부</th>
                </tr>
              </thead>
              <tbody>
                {visible.map((r) => (
                  <tr
                    key={r.id}
                    className={`${kit.rowLink}${dragId === r.id ? ` ${kit.rowDragging}` : ""}`}
                    onDragOver={
                      reorderable ? (e) => onDragOverRow(e, r.id) : undefined
                    }
                    onDrop={reorderable ? (e) => e.preventDefault() : undefined}
                    onClick={(e) => onRowClick(e, r.id)}
                    onMouseEnter={() => router.prefetch(detailHref(r.id))}
                  >
                    <td className={kit.dragCell}>
                      {reorderable ? (
                        <span
                          className={kit.dragHandle}
                          draggable
                          role="button"
                          tabIndex={-1}
                          aria-label={`${titleOneLine(r.title)} 순서 바꾸기`}
                          title="끌어서 순서 바꾸기"
                          onDragStart={(e) => onDragStart(e, r.id)}
                          onDragEnd={onDragEnd}
                        >
                          <Icon name="drag-vertical" size={16} />
                        </span>
                      ) : null}
                    </td>
                    <td className={kit.num} style={{ textAlign: "center" }}>
                      {position.get(r.id)}
                    </td>
                    <td className={kit.num} style={{ textAlign: "center" }}>
                      {formatDay(r.updated_at)}
                    </td>
                    <td>
                      <Link
                        href={`/admin/portfolio/${r.id}`}
                        className={kit.tdStrong}
                        draggable={false}
                      >
                        {titleOneLine(r.title)}
                      </Link>
                    </td>
                    <td style={{ textAlign: "center" }}>
                      <CategoryCell row={r} />
                    </td>
                    <td style={{ textAlign: "center" }}>
                      <ValueBadge
                        style={{ width: "100%" }}
                        label={labelOf(PORTFOLIO_STATUS_FILTER, r.status ?? "")}
                        color={PORTFOLIO_STATUS_COLOR[r.status ?? ""] ?? "GRAY"}
                      />
                    </td>
                    <td className={kit.clamp} style={{ textAlign: "center" }}>
                      {/* DB 에 옛 표기('/kb-app/index.html')가 남아 있어도
                          목록에는 폴더명만 보여 준다 */}
                      {toDetailFolder(r.html_file) || "-"}
                    </td>
                    <td style={{ textAlign: "center" }}>
                      <ValueBadge
                        label={r.is_main ? "메인" : null}
                        color="BLUE"
                        style={{ width: "100%" }}
                      />
                    </td>
                    <td style={{ textAlign: "center" }}>
                      <Text
                        size="2"
                        color={r.use_yn === "Y" ? "GREEN" : "GRAY"}
                      >
                        {r.use_yn}
                      </Text>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <div className={kit.cardFoot}>
          <Text size="1">
            {saving
              ? "순서를 저장하는 중…"
              : reorderable
                ? "손잡이를 끌어 순서를 바꾸면 홈페이지(Projects · 메인 슬라이드)도 같은 순서로 나옵니다."
                : sortMissing
                  ? "표시 순서 컬럼이 없어 순서를 바꿀 수 없습니다."
                  : "순서를 바꾸려면 검색어를 비우고 조회 조건을 모두 ‘전체’ 로 두세요."}
          </Text>
          <Text size="1">
            진행 프로젝트는 진행중 목록에, 종료 프로젝트는 종료 목록에
            노출됩니다. 사용여부 N 은 홈페이지에 나오지 않습니다.
          </Text>
        </div>
      </section>
    </>
  );
}
