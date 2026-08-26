"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Row, Section } from "@/components/admin/form";
import { Note, PageHead, Skeleton, fmtDate } from "@/components/admin/ui";
import { BRIEF_BUCKET, BRIEF_PATH, BRIEF_PDF } from "@/data/site";
import { supabase } from "@/lib/supabase";
import Button from "@/components/button/Button";
import Flex from "@/components/layouts/Flex";
import Text from "@/components/text/Text";
import BriefGuide from "./BriefGuide";

/* 회사소개서관리 — Company Brief Download 버튼이 받아가는 PDF 를 교체한다.

   ⚠️ 파일은 **고정 경로 한 자리**(brief/insplanet_brief.pdf)에 계속 덮어쓴다(`upsert`).
      그래야 공개 URL 이 안 변해서 사이트 쪽은 상수 하나(BRIEF_PDF)로 끝나고, 옛 파일이
      쌓여 저장 용량을 먹지도 않는다. 016_brief_storage.sql 이 그 짝이다.
   ⚠️ 업로드에는 '/admin/brief' 메뉴권한이 필요하다(RLS). 화면이 보인다고 되는 게 아니라
      Storage 정책이 계정의 permissions 배열을 직접 본다 — 새로 생긴 권한이라 기존 계정에는
      없다. 사용자관리에서 체크해 줘야 한다. */
const MAX_MB = 60;

type Info = { size: number; updatedAt: string } | null;

export default function BriefPage() {
  const inputRef = useRef<HTMLInputElement>(null);
  const [info, setInfo] = useState<Info>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  /* 제목 옆 ⓘ 를 누르면 뜨는 "PDF 용량 줄이는 법" 안내 */
  const [guide, setGuide] = useState(false);

  /* 지금 올라가 있는 파일의 크기·수정일. list 로 한 건만 집어 온다 */
  const load = useCallback(async () => {
    const { data, error } = await supabase.storage
      .from(BRIEF_BUCKET)
      .list("", { search: BRIEF_PATH, limit: 1 });
    if (error) {
      setErr(
        /bucket/i.test(error.message)
          ? `Storage 버킷 '${BRIEF_BUCKET}' 이 없습니다. 016_brief_storage.sql 을 실행해 주세요.`
          : error.message,
      );
      setLoading(false);
      return;
    }
    const f = data?.find((x) => x.name === BRIEF_PATH);
    setInfo(
      f
        ? {
            size: (f.metadata?.size as number) ?? 0,
            updatedAt: f.updated_at ?? f.created_at ?? "",
          }
        : null,
    );
    setLoading(false);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const upload = async (file: File) => {
    setErr(null);
    setMsg(null);
    if (file.type !== "application/pdf") {
      setErr("PDF 파일만 올릴 수 있습니다.");
      return;
    }
    if (file.size > MAX_MB * 1024 * 1024) {
      setErr(
        `${MAX_MB}MB 이하만 올릴 수 있습니다. (선택한 파일 ${mb(file.size)})`,
      );
      return;
    }
    setBusy(true);
    /* cacheControl 1시간.
       처음엔 "덮어썼는데 옛 파일이 계속 나올까 봐" 60초로 뒀는데, **실측해 보니 그럴 일이
       없다** — 같은 경로에 덮어쓰면 Supabase 가 CDN 캐시를 즉시 무효화한다(max-age 3600 인
       파일을 덮어쓴 직후 조회했더니 새 내용이 나왔다. cf-cache-status 는 HIT 인데도 내용이
       바뀌어 있었다).
       그래서 짧게 둘 이유가 없고, 오히려 손해다 — 14MB 짜리라 같은 사람이 여러 번 눌렀을 때
       max-age 안에서는 브라우저 캐시가 받아 주지만 60초로는 그 효과가 거의 없다.
       Storage 전송량은 무료 플랜에서 월 5GB 라 이 파일 360회면 소진된다. */
    const { error } = await supabase.storage
      .from(BRIEF_BUCKET)
      .upload(BRIEF_PATH, file, {
        upsert: true,
        cacheControl: "3600",
        contentType: "application/pdf",
      });
    setBusy(false);
    if (error) {
      setErr(
        /policy|permission|unauthor/i.test(error.message)
          ? "업로드 권한이 없습니다. 사용자관리에서 이 계정에 '회사소개서관리' 권한을 주세요."
          : error.message,
      );
      return;
    }
    setMsg(
      "회사소개서를 교체했습니다. 사이트의 Company Brief Download 버튼이 바로 새 파일을 받습니다.",
    );
    await load();
  };

  return (
    <>
      <PageHead href="/admin/brief" />

      {err ? <Note warn>{err}</Note> : null}
      {msg ? <Note>{msg}</Note> : null}

      <Section title="현재 파일">
        {loading ? (
          <Skeleton />
        ) : (
          <>
            <Row label="파일명">
              <Text as="div" size="2" fontSize="13.5px">
                {BRIEF_PATH}
              </Text>
            </Row>
            <Row label="크기">
              <Text as="div" size="2" fontSize="13.5px">
                {info ? mb(info.size) : "올라간 파일이 없습니다"}
              </Text>
            </Row>
            <Row label="최근 수정">
              <Text as="div" size="2" fontSize="13.5px">
                {info?.updatedAt ? fmtDate(info.updatedAt) : "-"}
              </Text>
            </Row>
            <Row
              label="다운로드 확인"
              hint="사이트의 Company Brief Download 버튼과 같은 주소입니다."
            >
              <Button
                color="GRAY"
                variant="outline"
                href={BRIEF_PDF}
                reload
                label="지금 파일 받아보기"
              />
            </Row>
          </>
        )}
      </Section>

      <Section title="새 파일로 교체" onClick={() => setGuide(true)}>
        <Row
          label="PDF 파일"
          required
          hint={`PDF 만, ${MAX_MB}MB 이하. 올리는 즉시 사이트에 반영되며 배포는 필요 없습니다. 이전 파일은 덮어써집니다.`}
        >
          <Flex row gap={10} align="center">
            <input
              ref={inputRef}
              type="file"
              accept="application/pdf"
              hidden
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) void upload(f);
                e.target.value = ""; // 같은 파일을 다시 골라도 change 가 오도록
              }}
            />
            <Button
              color="BLUE"
              variant="solid"
              disabled={busy}
              onClick={() => inputRef.current?.click()}
              label={busy ? "업로드 중…" : "파일 선택"}
            />
          </Flex>
        </Row>
      </Section>

      <BriefGuide open={guide} onClose={() => setGuide(false)} maxMb={MAX_MB} />
    </>
  );
}

function mb(bytes: number) {
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}
