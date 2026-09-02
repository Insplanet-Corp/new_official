"use client";

import { use, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Actions, ReadOnly, Row, ThumbView } from "@/components/admin/form";
import {
  CategoryCell,
  Note,
  PORTFOLIO_STATUS_COLOR,
  SubHead,
  ValueBadge,
} from "@/components/admin/ui";
import kit from "@/components/admin/kit.module.css";
import { labelOf } from "@/data/adminOptions";
import { PORTFOLIO_STATUS_FILTER } from "@/data/adminOptions";
import { describeError, isMissingTable } from "@/lib/pgError";
import { refreshProjectCount } from "@/lib/projectCountActions";
import {
  type Portfolio,
  categoriesOf,
  formatPeriod,
  mainTitleOf,
  titleLines,
  titleOneLine,
} from "@/lib/portfolios";
import { supabase } from "@/lib/supabase";
import Button from "@/components/button/Button";
import Text from "@/components/text/Text";

/* 포트폴리오관리 - 조회 (기획서 27p) */
export default function PortfolioDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();

  const [row, setRow] = useState<Portfolio | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    let alive = true;
    (async () => {
      const { data, error: err } = await supabase
        .from("portfolios")
        .select("*")
        .eq("id", id)
        .maybeSingle();
      if (!alive) return;
      if (err) {
        setError(
          isMissingTable(err)
            ? "portfolios 스키마가 아직 없습니다. 004 마이그레이션을 실행해 주세요."
            : describeError(err),
        );
      } else {
        setRow((data as Portfolio) ?? null);
      }
      setLoading(false);
    })();
    return () => {
      alive = false;
    };
  }, [id]);

  /* 삭제는 되돌릴 수 없다 — 기획서에 얼랏이 명시돼 있지는 않지만 확인을 받는다 */
  const onDelete = async () => {
    if (deleting || !row) return;
    if (
      !window.confirm(
        `"${titleOneLine(row.title)}" 을(를) 삭제합니다. 되돌릴 수 없습니다. 계속할까요?`,
      )
    )
      return;

    setDeleting(true);
    setError(null);
    const { error: err } = await supabase
      .from("portfolios")
      .delete()
      .eq("id", id);
    setDeleting(false);
    if (err) {
      setError(describeError(err));
      return;
    }
    /* 등록·수정과 같은 이유로 메뉴 배지 캐시를 턴다 (lib/projectCountActions.ts) */
    await refreshProjectCount().catch((e) =>
      console.error("[portfolio] 메뉴 배지 캐시 무효화 실패:", e),
    );
    router.push("/admin/portfolio");
    router.refresh();
  };

  return (
    <>
      <SubHead
        eyebrow="Portfolio"
        title="포트폴리오관리 – 조회"
        desc="등록된 프로젝트 정보입니다."
        actions={
          <Button
            href="/admin/portfolio"
            label="목록"
            variant="outline"
            color="GRAY"
            size="2"
            radius="medium"
          />
        }
      />

      {error ? <Note warn>{error}</Note> : null}
      {!loading && !row && !error ? (
        <Note warn>해당 포트폴리오를 찾을 수 없습니다.</Note>
      ) : null}

      <section className={kit.card}>
        <Row label="프로젝트명">
          <ReadOnly>{row ? titleOneLine(row.title) : null}</ReadOnly>
        </Row>
        <Row label="사용여부">
          <ReadOnly>{row?.use_yn ?? null}</ReadOnly>
        </Row>
        {/* 목록과 같은 배지로 그린다 — 색·모양은 ui.tsx 한 곳에 있다.
            ReadOnly 는 여전히 값 슬롯 역할(입력칸과 같은 40px 높이)로 남는다. */}
        <Row label="분류">
          <ReadOnly>{row ? row.categories : null}</ReadOnly>
        </Row>
        <Row label="진행 상태">
          <ReadOnly>
            {row ? labelOf(PORTFOLIO_STATUS_FILTER, row.status ?? "") : null}
          </ReadOnly>
        </Row>
        <Row label="수상">
          <ReadOnly>
            {row ? (
              <ValueBadge label={row.award ? "수상작" : null} color="ORANGE" />
            ) : null}
          </ReadOnly>
        </Row>
        <Row label="메인">
          <ReadOnly>{row ? (row.is_main ? "메인" : "-") : null}</ReadOnly>
        </Row>
        {/* 메인으로 걸린 행은 메인 관련 값을 여기서 다 보여 준다 — 예전에는 썸네일만
            나오고 title·Client·Launch 는 [수정] 을 눌러야 볼 수 있었다. 조회만 해서는
            무엇이 홈 슬라이드에 나가는지 알 수 없었다(사용자 지적, 2026-09-02).
            등록/수정 폼과 **같은 순서·같은 라벨**로 둔다. */}
        {row?.is_main ? (
          <>
            <Row label="썸네일 – 메인">
              <ThumbView src={row.thumb_main ?? undefined} />
            </Row>
            <Row
              label="메인 - title"
              hint={
                mainTitleOf(row) === row.title
                  ? "따로 입력하지 않아 프로젝트명이 그대로 나갑니다."
                  : undefined
              }
            >
              {/* 줄바꿈이 실제로 어디서 걸리는지 보여야 하므로 줄 단위로 그린다 */}
              <ReadOnly>
                {titleLines(mainTitleOf(row)).map((line, i) => (
                  <div key={i}>{line}</div>
                ))}
              </ReadOnly>
            </Row>
            <Row label="메인 - Client">
              <ReadOnly>{row.client || null}</ReadOnly>
            </Row>
            <Row label="메인 - Launch">
              <ReadOnly>{row.launch || null}</ReadOnly>
            </Row>
          </>
        ) : null}
        <Row label="썸네일 – PC">
          <ThumbView src={row?.thumb_pc ?? undefined} />
        </Row>
        <Row label="썸네일 – 모바일">
          <ThumbView src={row?.thumb_mobile ?? undefined} />
        </Row>
        <Row label="고객사 CI 이미지">
          <ThumbView src={row?.client_ci ?? undefined} />
        </Row>
        <Row label="프로젝트 기간">
          <ReadOnly>
            {row ? formatPeriod(row.started_on, row.ended_on) : null}
          </ReadOnly>
        </Row>
        <Row
          label="상세화면 폴더명"
          hint={
            row?.html_file
              ? "홈페이지에서 이 프로젝트 카드를 누르면 이 화면으로 이동합니다."
              : undefined
          }
        >
          <ReadOnly>
            {row?.html_file ? (
              <a href={`/projects/${id}`} target="_blank" rel="noreferrer">
                상세 화면 열기
              </a>
            ) : null}
          </ReadOnly>
        </Row>
      </section>

      <Actions>
        <Button
          href={`/admin/portfolio/${id}/edit`}
          label="수정"
          variant="solid"
          color="BLUE"
          size="2"
          radius="medium"
        />
        <Button
          href="/admin/portfolio"
          label="취소"
          variant="outline"
          color="GRAY"
          size="2"
          radius="medium"
        />
        <Button
          label={deleting ? "삭제 중…" : "삭제"}
          variant="outline"
          color="RED"
          size="2"
          radius="medium"
          disabled={deleting || !row}
          onClick={onDelete}
        />
      </Actions>
    </>
  );
}
