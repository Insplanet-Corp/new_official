"use client";

import { use, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Actions, ReadOnly, Row, ThumbView } from "@/components/admin/form";
import { Note, SubHead } from "@/components/admin/ui";
import kit from "@/components/admin/kit.module.css";
import { labelOf } from "@/data/adminOptions";
import { PORTFOLIO_STATUS_FILTER } from "@/data/adminOptions";
import { describeError, isMissingTable } from "@/lib/pgError";
import { refreshProjectCount } from "@/lib/projectCountActions";
import {
  type Portfolio,
  formatPeriod,
  titleOneLine,
} from "@/lib/portfolios";
import { supabase } from "@/lib/supabase";
import Button from "@/components/button/Button";

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
        <Row label="분류">
          <ReadOnly>{row?.category ?? null}</ReadOnly>
        </Row>
        <Row label="진행 상태">
          <ReadOnly>
            {row?.status ? labelOf(PORTFOLIO_STATUS_FILTER, row.status) : null}
          </ReadOnly>
        </Row>
        <Row label="수상">
          <ReadOnly>{row ? (row.award ? "수상작" : "해당 없음") : null}</ReadOnly>
        </Row>
        <Row label="메인">
          <ReadOnly>
            {row ? (row.is_main ? "메인 노출" : "해당 없음") : null}
          </ReadOnly>
        </Row>
        {row?.is_main ? (
          <Row label="썸네일 – 메인">
            <ThumbView src={row.thumb_main ?? undefined} />
          </Row>
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
