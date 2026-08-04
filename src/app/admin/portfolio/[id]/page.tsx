"use client";

import { use } from "react";
import { Actions, ReadOnly, Row, ThumbView } from "@/components/admin/form";
import { Note, SubHead } from "@/components/admin/ui";
import kit from "@/components/admin/kit.module.css";
import Button from "@/components/button/Button";

/* 포트폴리오관리 - 조회 (기획서 27p) */
export default function PortfolioDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);

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

      <Note>
        <span>
          <b>화면 틀</b> — 데이터 조회는 아직 붙지 않았습니다 (요청 ID:{" "}
          <code>{id}</code>).
        </span>
      </Note>

      <section className={kit.card}>
        <Row label="프로젝트명">
          <ReadOnly>{null}</ReadOnly>
        </Row>
        <Row label="사용여부">
          <ReadOnly>{null}</ReadOnly>
        </Row>
        <Row label="분류">
          <ReadOnly>{null}</ReadOnly>
        </Row>
        <Row label="진행 상태">
          <ReadOnly>{null}</ReadOnly>
        </Row>
        <Row label="썸네일 – PC">
          <ThumbView />
        </Row>
        <Row label="썸네일 – 모바일">
          <ThumbView />
        </Row>
        <Row label="고객사 CI 이미지">
          <ThumbView />
        </Row>
        <Row label="프로젝트 기간">
          <ReadOnly>{null}</ReadOnly>
        </Row>
        <Row label="상세화면 HTML 파일명">
          <ReadOnly>{null}</ReadOnly>
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
          label="삭제"
          variant="outline"
          color="RED"
          size="2"
          radius="medium"
        />
      </Actions>
    </>
  );
}
