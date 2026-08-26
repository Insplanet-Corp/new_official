"use client";

import { useState } from "react";
import Modal from "@/components/admin/Modal";
import Button from "@/components/button/Button";
import Flex from "@/components/layouts/Flex";
import Heading from "@/components/text/Heading";
import Text from "@/components/text/Text";
import s from "./BriefGuide.module.css";

/* PDF 용량 줄이는 법 안내 — 소개서를 만드는 담당자에게 그대로 전달할 내용이다.

   ⚠️ 화면과 "복사" 버튼이 **같은 데이터에서** 나온다. JSX 와 복사용 문자열을 따로
      적어 두면 한쪽만 고쳐져서 담당자에게 옛 안내가 전달된다.
   문단은 string, 글머리 목록은 string[] 로 적는다. */
type Block = string | string[];

const guide = (maxMb: number): { title: string; body: Block[] }[] => [
  {
    title: "파일 조건",
    body: [
      [
        "PDF 만 가능합니다.",
        `업로드 한계는 ${maxMb}MB, 권장은 15MB 이하입니다.`,
        "파일 이름은 아무거나 상관없습니다. 올리면 정해진 이름으로 저장됩니다.",
      ],
    ],
  },
  {
    title: "용량을 줄여야하는 이유",
    body: [
      "PDF 가 커지는 이유는 페이지 수가 아니라, 안에 들어간 이미지가 무손실로 저장되기 때문입니다.",
      "파일이 크면 방문자가 다운로드를 누르고 한참 기다리게 되고, 모바일에서는 사실상 받지 못합니다.",
      "지난번 소개서는 원본이 194MB 였는데, 화질을 유지한 채 14MB 로 줄여서 올렸습니다.",
      "현재 사용중인 DB에서 무료로 제공해주는게 5GB입니다. PDF가 크면 클수록 한달에 다운 받는 양이 줍니다.",
    ],
  },
  {
    title: "방법 1 — 만들 때부터 줄이기",
    body: [
      "내보내기 설정만 바꾸면 대부분 해결됩니다. 이미 커진 파일을 나중에 줄이는 것보다 낫습니다.",
      [
        '파워포인트: 파일 > 옵션 > 고급 > 이미지 크기 및 품질에서 "파일의 이미지 품질 저하 안 함" 체크를 끄고, 기본 해상도를 150ppi 로 바꾼 뒤 PDF 로 내보냅니다.',
        '키노트: 파일 > 내보내기 > PDF 에서 이미지 품질을 "최상" 이 아니라 "좋음" 으로 합니다.',
        '인디자인: 내보내기 프리셋을 "고품질 인쇄" 가 아니라 "최소 파일 크기" 로 하거나, [압축] 탭에서 150ppi + JPEG 중간을 고릅니다.',
      ],
    ],
  },
  {
    title: "방법 2 — 이미 만든 PDF 를 줄이기",
    body: [
      ["Acrobat Pro 가 있으면: 파일 > 다른 이름으로 저장 > 크기가 축소된 PDF"],
    ],
  },
  {
    title: "방법 3 — 최후의 수단",
    body: [
      "원본 파일을 그대로 개발팀에 보내주세요. 화질을 거의 그대로 두면서 10분의 1로 줄이는 방법이 따로 있습니다. (Ghostscript를 사용)",
      "GhostScript란, 어도비의 PDF 파일을 해석하고 변환할 수 있는 오픈소스입니다.",
    ],
  },
  {
    title: "줄인 다음 반드시 확인할 것",
    body: [
      "용량만 보고 끝내지 마세요. 같은 14MB 라도 화질이 완전히 다를 수 있습니다.",
      "화면 목업이나 표처럼 작은 글씨가 있는 페이지를 200% 로 확대해 보세요. 글씨가 뭉개져 읽기 어려우면 너무 많이 줄인 것입니다.",
    ],
  },
  {
    title: "주의",
    body: [
      [
        '맥의 "미리보기 > 파일 크기 줄이기" 는 쓰지 마세요. 화질이 많이 상합니다.',
        "업로드하면 즉시 사이트에 반영되고 이전 파일은 사라집니다. 되돌릴 수 없으니 원본은 꼭 따로 보관해 주세요.",
      ],
    ],
  },
];

export default function BriefGuide({
  open,
  onClose,
  maxMb,
}: {
  open: boolean;
  onClose: () => void;
  maxMb: number;
}) {
  return (
    <Modal
      open={open}
      onClose={onClose}
      title="PDF 용량 줄이는 법"
      footer={
        <Button
          color="BLUE"
          variant="solid"
          radius="medium"
          onClick={onClose}
          label="닫기"
        />
      }
    >
      <Flex gap={22}>
        {guide(maxMb).map((sec) => (
          <Flex gap={8} key={sec.title}>
            <Heading as="h3" size="2" fontSize="13.5px" weight="700">
              {sec.title}
            </Heading>
            {sec.body.map((block, i) =>
              Array.isArray(block) ? (
                <ul className={s.list} key={i}>
                  {block.map((li) => (
                    <li key={li}>
                      <Text size="2" fontSize="13.5px" color="var(--ink-2)">
                        {li}
                      </Text>
                    </li>
                  ))}
                </ul>
              ) : (
                <Text
                  as="p"
                  size="2"
                  fontSize="13.5px"
                  color="var(--ink-2)"
                  key={i}
                >
                  {block}
                </Text>
              ),
            )}
          </Flex>
        ))}
      </Flex>
    </Modal>
  );
}
