import type { Metadata } from "next";
import { notFound } from "next/navigation";
import BodyClass from "@/components/BodyClass";
import PageShell from "@/components/PageShell";
import DetailFrame from "@/components/projects/DetailFrame";
import { type Portfolio, detailSrc, titleOneLine } from "@/lib/portfolios";
import { supabase } from "@/lib/supabase";
import "@/styles/projects.css";

export const dynamic = "force-dynamic";

async function load(id: string): Promise<Portfolio | null> {
  const { data, error } = await supabase
    .from("portfolios")
    .select("*")
    .eq("id", id)
    .eq("use_yn", "Y") // RLS 와 이중으로 — 007 참고
    .maybeSingle();
  if (error) {
    console.error("[projects/detail] 조회 실패:", error.message, error.code);
    return null;
  }
  return (data as Portfolio) ?? null;
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const row = await load((await params).id);
  return {
    title: row
      ? `Insplanet — ${titleOneLine(row.title)}`
      : "Insplanet — Projects",
  };
}

export default async function ProjectDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const row = await load(id);
  if (!row) notFound();

  // 경로 검증은 detailSrc 안에 있다 (목록의 시트도 같은 함수를 쓴다)
  const src = detailSrc(row.html_file);
  if (!src) notFound();

  /* 사이트 헤더·푸터는 iframe 밖(PageShell)에 둔다. 케이스 스터디 본문만
     iframe 안에 있으므로 공통 크롬은 그대로 붙는다.

     퍼블리셔 산출물은 public/portfolio/<폴더>/ 에 그대로 올린다 — index.html 이
     css/·img/ 를 상대경로로 참조하므로 같은 폴더에 두면 경로가 저절로 맞는다.
     (Storage 에 올리고 프록시가 상대경로를 고쳐 쓰는 방식도 만들어 봤지만,
      인라인 style 의 url()·srcset·JS 로 조립하는 경로를 정규식이 못 잡아
      산출물 형태에 따라 조용히 깨진다. 폴더째 두는 쪽이 훨씬 견고하다.)

     ⚠️ 본문이 iframe 안이라 검색엔진이 내용을 읽지 못한다. 최소한 제목만이라도
     문서에 남기려고 아래 h1 을 iframe 밖에 둔다(화면에는 안 보이게). */
  return (
    <>
      <BodyClass name="projects-page" />
      <PageShell>
        <main className="pj">
          <h1
            style={{
              position: "absolute",
              width: 1,
              height: 1,
              overflow: "hidden",
              clip: "rect(0 0 0 0)",
              whiteSpace: "nowrap",
            }}
          >
            {titleOneLine(row.title)}
          </h1>
          <DetailFrame src={src} title={`${titleOneLine(row.title)} 상세`} />
        </main>
      </PageShell>
    </>
  );
}
