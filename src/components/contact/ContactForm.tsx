"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import ChipGroup from "@/components/contact/ChipGroup";
import ConsentLinks from "@/components/contact/ConsentLinks";
import FileRow from "@/components/contact/FileRow";
import FilteredInput from "@/components/contact/FilteredInput";
import { PROJECT_FIELDS } from "@/data/contact";
import {
  bindScroll,
  clamp01,
  prefersReducedMotion,
  revealOnScroll,
} from "@/lib/dom";
import {
  allFilled,
  firstMissing,
  jumpToField,
  type RequiredField,
} from "@/lib/formGating";
import { submitQuote } from "@/lib/quotes";

/* 02 inquiry form.
   Chip groups: [multi] = 다중선택 (업무 범위); the others are single-select (성격/예산/기간, one per
   group, re-click clears). Inputs stay uncontrolled so the live character filters can rewrite the
   value without losing the caret — React owns the chip/consent visuals and the gating state. */
export default function ContactForm() {
  const [selected, setSelected] = useState<Record<string, string[]>>(() =>
    Object.fromEntries(PROJECT_FIELDS.map((f) => [f.key, [] as string[]])),
  );
  const [ready, setReady] = useState(false);

  const formRef = useRef<HTMLFormElement>(null);
  const groupRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const company = useRef<HTMLInputElement>(null);
  const person = useRef<HTMLInputElement>(null);
  const phone = useRef<HTMLInputElement>(null);
  const email = useRef<HTMLInputElement>(null);
  const url = useRef<HTMLInputElement>(null);
  const consent = useRef<HTMLInputElement>(null);
  const consentBox = useRef<HTMLSpanElement>(null);
  const consentLabel = useRef<HTMLLabelElement>(null);
  const fileInput = useRef<HTMLInputElement>(null);
  const fileName = useRef<HTMLInputElement>(null);
  const content = useRef<HTMLTextAreaElement>(null);
  const submitRef = useRef<HTMLButtonElement>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const toggleChip = (key: string, option: string, multi?: boolean) => {
    setSelected((prev) => {
      const cur = prev[key] ?? [];
      if (multi) {
        return {
          ...prev,
          [key]: cur.includes(option)
            ? cur.filter((o) => o !== option)
            : [...cur, option],
        };
      }
      return { ...prev, [key]: cur.includes(option) ? [] : [option] };
    });
  };

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // 1. 유효성 검사 (기존 코드 유지)
    const bad = firstMissing(requiredFields());
    if (bad) {
      jumpToField(bad, { useLenis: true, focusDelay: 650 });
      return;
    }

    // 2. 이미 제출 중이라면 Block
    if (isSubmitting) return;
    setIsSubmitting(true);

    try {
      /* 접수 규칙(첨부 업로드 → 행 insert)은 모바일 폼과 **같은** submitQuote 를 쓴다 */
      const { error, fileDropped } = await submitQuote({
        company: company.current?.value ?? "",
        person: person.current?.value ?? "",
        phone: phone.current?.value ?? "",
        email: email.current?.value ?? "",
        url: url.current?.value ?? "",
        content: content.current?.value ?? "",
        // 칩 선택 내역(selected)을 json 형태 그대로 DB에 저장!
        projectFields: selected,
        file: fileInput.current?.files?.[0] ?? null,
      });

      if (error) {
        console.error("Submit Error:", error);
        alert(`접수 중 오류가 발생했습니다.\n${error}`);
        return;
      }

      alert(
        fileDropped
          ? "문의가 접수되었습니다. 다만 첨부파일은 저장되지 않았습니다 — 담당자에게 메일로 보내 주세요."
          : "문의가 성공적으로 접수되었습니다. 빠르게 연락드리겠습니다!",
      );

      setSelected(
        Object.fromEntries(PROJECT_FIELDS.map((f) => [f.key, [] as string[]])),
      );

      formRef.current?.reset();
      /* ⚠️ reset() 은 파일 입력을 비우지만 **파일명 칸은 따라오지 않는다** —
         FileRow 가 그 값을 자기 ref(officialRef)로 잠그고 있어서, change 를 직접
         쏴야 이름과 잠금값이 같이 비워진다(RecruitContext 의 복원 로직과 같은 이유). */
      fileInput.current?.dispatchEvent(new Event("change", { bubbles: true }));

      setReady(false);
    } catch (err) {
      console.error("Submit Error:", err);
      alert("접수 중 오류가 발생했습니다. 다시 시도해 주세요.");
    } finally {
      setIsSubmitting(false);
    }
  };

  /* required fields in visual order — 기존 사이트 URL and 프로젝트 내용(+첨부) are optional */
  const requiredFields = useCallback((): RequiredField[] => {
    const fields: RequiredField[] = PROJECT_FIELDS.map((f) => {
      const group = groupRefs.current[f.key] ?? null;
      return {
        ok: () => (selected[f.key]?.length ?? 0) > 0,
        scroll: group?.closest<HTMLElement>(".ct-field") ?? null,
        focus: group?.querySelector<HTMLElement>(".ct-chip") ?? null,
        flash: group,
      };
    });
    for (const input of [company, person, phone, email]) {
      fields.push({
        ok: () => (input.current?.value.trim() ?? "") !== "",
        scroll: input.current,
        focus: input.current,
        flash: input.current,
      });
    }
    fields.push({
      ok: () => !!consent.current?.checked,
      scroll: consentLabel.current,
      focus: consent.current,
      flash: consentBox.current,
    });
    return fields;
  }, [selected]);

  const refresh = useCallback(
    () => setReady(allFilled(requiredFields())),
    [requiredFields],
  );

  useEffect(refresh, [refresh]);

  /* section headings: the dark colour fills in from the LEFT, line 1 first then line 2, as each
     scrolls up through the reading zone. The fill front sweeps at constant speed (proportional to
     text width). */
  useEffect(() => {
    const heads = [...document.querySelectorAll<HTMLElement>(".ct-block-head")];
    if (!heads.length) return;
    const paint = (head: HTMLElement, p: number) => {
      const lines = [...head.querySelectorAll<HTMLElement>(".ct-line")];
      const widths = lines.map((l) => l.getBoundingClientRect().width);
      const total = widths.reduce((a, b) => a + b, 0) || 1;
      let front = p * total;
      lines.forEach((line, i) => {
        const f = clamp01(front / (widths[i] || 1));
        line.style.setProperty("--fill", `${(f * 100).toFixed(1)}%`);
        front -= widths[i];
      });
    };
    if (prefersReducedMotion()) {
      heads.forEach((h) => paint(h, 1));
      return;
    }
    return bindScroll(() => {
      const vh = innerHeight;
      for (const head of heads) {
        // gray when it enters (top=100%vh) -> full at the upper third (top=33%vh)
        paint(
          head,
          clamp01((vh - head.getBoundingClientRect().top) / (vh * 0.67)),
        );
      }
    });
  }, []);

  /* ⚠️ is-ready 를 className 으로 넘기지 않고 손으로 토글한다.
     .ct-submit 은 스크롤 리빌 대상이라 `.in` 을 IO 가 **직접 classList 로** 붙이는데,
     className 을 state 로 만들면 ready 가 켜지는 순간 React 가 className 을 통째로 다시
     써서 그 `.in` 을 지워 버린다. IO 는 이미 unobserve 한 뒤라 다시 붙여 주지도 않는다
     → 필수값을 다 채우는 순간 문의하기 버튼이 opacity:0 + pointer-events:none 으로
     사라졌다(빌드·콘솔 모두 조용하다). className 을 상수 문자열로 두면 React 가 마운트
     이후 그 속성을 건드리지 않으므로 두 클래스가 공존한다.
     같은 함정을 ProjectsExplorer 의 필터 바에서 이미 밟았다(거기 주석 참고). */
  useEffect(() => {
    submitRef.current?.classList.toggle('is-ready', ready);
  }, [ready]);

  /* form areas rise + fade in as they scroll into view (same elastic rise as the svc-cards).
     Graceful: reduced motion keeps them visible via CSS; no IntersectionObserver -> unhide. */
  useEffect(() => {
    const form = formRef.current;
    if (!form) return;
    const scope = form.closest(".ct-rv");
    if (prefersReducedMotion()) return;
    const areas = [
      ...form.querySelectorAll(".ct-field, .ct-consent, .ct-submit"),
    ];
    if (!areas.length || !("IntersectionObserver" in window)) {
      scope?.classList.remove("ct-rv"); // can't observe -> unhide everything
      return;
    }
    return revealOnScroll(areas, 0.18);
  }, []);

  return (
    <section className="ct-form">
      <div className="ct-inner">
        <form
          className="ct-form-inner"
          autoComplete="off"
          ref={formRef}
          onSubmit={onSubmit}
          onInput={refresh}
          onChange={refresh}
          onClick={refresh}
        >
          {/* block A — project basics (chip groups) */}
          <div className="ct-block">
            <h2 className="ct-block-head">
              <span className="ct-line">프로젝트의</span>
              <span className="ct-line">기본정보를 확인할께요.</span>
            </h2>
            <div className="ct-fields">
              {PROJECT_FIELDS.map((field) => (
                <div className="ct-field" key={field.key}>
                  <p className="ct-field-label">{field.label}</p>
                  <ChipGroup
                    options={field.options}
                    selected={selected[field.key] ?? []}
                    multi={field.multi}
                    onToggle={(option) =>
                      toggleChip(field.key, option, field.multi)
                    }
                    groupRef={(el) => {
                      groupRefs.current[field.key] = el;
                    }}
                  />
                </div>
              ))}
            </div>
          </div>

          {/* block B — client info + project content + submit */}
          <div className="ct-block">
            <h2 className="ct-block-head">
              <span className="ct-line">의뢰하시는 분의</span>
              <span className="ct-line">정보와 내용을 확인할께요.</span>
            </h2>
            <div className="ct-fields">
              <div className="ct-field">
                <p className="ct-field-label">의뢰인 정보</p>
                <div className="ct-inputs">
                  <div className="ct-input-row">
                    <input
                      ref={company}
                      className="ct-input"
                      type="text"
                      placeholder="기업명*"
                    />
                    <input
                      ref={person}
                      className="ct-input"
                      type="text"
                      placeholder="성함*"
                    />
                  </div>
                  <div className="ct-input-row">
                    <FilteredInput
                      inputRef={phone}
                      type="tel"
                      inputMode="numeric"
                      filter="num"
                      placeholder="연락처*"
                      hint="숫자만 입력할 수 있어요."
                    />
                    <FilteredInput
                      inputRef={email}
                      type="email"
                      inputMode="email"
                      filter="ascii"
                      placeholder="이메일*"
                      hint="영문으로 입력해 주세요."
                    />
                  </div>
                  <div className="ct-input-row">
                    <FilteredInput
                      inputRef={url}
                      type="url"
                      inputMode="url"
                      filter="ascii"
                      placeholder="기존 사이트 URL"
                      hint="영문으로 입력해 주세요."
                      prefillScheme
                    />
                  </div>
                </div>
              </div>

              <div className="ct-content-group">
                <div className="ct-field">
                  <p className="ct-field-label">프로젝트 내용</p>
                  <div className="ct-content">
                    <textarea
                      ref={content}
                      className="ct-textarea"
                      placeholder="구체적일수록 자세한 상담이 가능해요."
                    />
                    <FileRow
                      placeholder="최대 50MB 까지 첨부가 가능해요."
                      fileInputRef={fileInput}
                      nameRef={fileName}
                    />
                  </div>
                </div>

                {/* consent: 40px circle checkbox + agreement text */}
                <label className="ct-consent" ref={consentLabel}>
                  <input
                    ref={consent}
                    type="checkbox"
                    className="ct-consent-input"
                  />
                  <span
                    className="ct-consent-box"
                    aria-hidden="true"
                    ref={consentBox}
                  >
                    <svg width="40" height="40" viewBox="0 0 40 40" fill="none">
                      <path
                        d="M11 20 17 26 29 14"
                        stroke="currentColor"
                        strokeWidth="1.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  </span>
                  {/* 두 링크는 약관/방침 팝업(LegalModal)을 연다 — 모바일 폼과 같은 컴포넌트 */}
                  <span className="ct-consent-text">
                    <ConsentLinks />
                  </span>
                </label>
              </div>

              <button type="submit" className="ct-submit" ref={submitRef}>
                <span>문의하기</span>
                <span className="ct-arrow" aria-hidden="true">
                  <img src="/assets/icon_arrow.svg" alt="" />
                </span>
              </button>
            </div>
          </div>
        </form>
      </div>
    </section>
  );
}
