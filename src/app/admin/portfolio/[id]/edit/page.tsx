"use client";

import { use, useEffect, useState } from "react";
import PortfolioForm from "@/components/admin/PortfolioForm";
import { Note, SubHead } from "@/components/admin/ui";
import { describeError, isMissingTable } from "@/lib/pgError";
import { type Portfolio, type PortfolioDraft, toDraft } from "@/lib/portfolios";
import { supabase } from "@/lib/supabase";
import Button from "@/components/button/Button";

/* 포트폴리오관리 - 수정 (기획서 28p) — 항목은 등록 화면과 동일 */
export default function PortfolioEditPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);

  const [initial, setInitial] = useState<PortfolioDraft | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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
      } else if (data) {
        setInitial(toDraft(data as Portfolio));
      }
      setLoading(false);
    })();
    return () => {
      alive = false;
    };
  }, [id]);

  return (
    <>
      <SubHead
        eyebrow="Portfolio"
        title="포트폴리오관리 – 수정"
        desc="등록된 프로젝트 정보를 수정합니다."
        actions={
          <>
            <Button
              href={`/admin/portfolio/${id}`}
              label="조회"
              variant="outline"
              color="GRAY"
              size="2"
              radius="medium"
            />
            <Button
              href="/admin/portfolio"
              label="목록"
              variant="outline"
              color="GRAY"
              size="2"
              radius="medium"
            />
          </>
        }
      />

      {error ? <Note warn>{error}</Note> : null}

      {/* 기존 값을 다 받은 뒤에 폼을 그린다 — initial 은 마운트 시 한 번만
          읽히므로, 로딩 중에 그리면 빈 폼이 그대로 굳어 버린다. */}
      {loading ? (
        <Note>불러오는 중…</Note>
      ) : initial ? (
        <PortfolioForm mode="edit" portfolioId={id} initial={initial} />
      ) : !error ? (
        <Note warn>해당 포트폴리오를 찾을 수 없습니다.</Note>
      ) : null}
    </>
  );
}
