'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import MobileChipGroup from '@/components/mobile/MobileChipGroup';
import MobileFileRow from '@/components/mobile/MobileFileRow';
import MobileFilteredInput from '@/components/mobile/MobileFilteredInput';
import { PROJECT_FIELDS } from '@/data/contact';
import { bindScroll, clamp01, prefersReducedMotion, revealOnScroll } from '@/lib/dom';
import { allFilled, firstMissing, jumpToField, type RequiredField } from '@/lib/formGating';
import { supabase } from '@/lib/supabase';

/* mobile-contact.html 의 form step1(칩)+step2(정보/내용/동의/제출) 을 그대로 옮긴다. PC
   ContactForm.tsx 와 같은 게이팅/제출 로직이지만 마크업이 <section class="mc-form"> 둘로 갈라져
   있다 — 칩 선택 state 를 이 컴포넌트가 들고 두 섹션에 나눠 그린다(정적 사이트가 document-wide
   핸들러로 두 섹션을 한 게이팅으로 묶은 것과 같은 구성). 옵션 라벨은 정적 mobile-contact.html 을
   손으로 다시 적지 않고 PC 와 같은 PROJECT_FIELDS 에서 가져온다 — quotes.project_fields 에
   저장되는 실제 값이라 어긋나면 안 된다. */
export default function MobileContactForm() {
  const [selected, setSelected] = useState<Record<string, string[]>>(() =>
    Object.fromEntries(PROJECT_FIELDS.map((f) => [f.key, [] as string[]])),
  );
  const [ready, setReady] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

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

  const toggleChip = (key: string, option: string, multi?: boolean) => {
    setSelected((prev) => {
      const cur = prev[key] ?? [];
      if (multi) {
        return {
          ...prev,
          [key]: cur.includes(option) ? cur.filter((o) => o !== option) : [...cur, option],
        };
      }
      return { ...prev, [key]: cur.includes(option) ? [] : [option] };
    });
  };

  /* required fields in visual order — 기존 사이트 URL and 프로젝트 내용(+첨부) are optional */
  const requiredFields = useCallback((): RequiredField[] => {
    const fields: RequiredField[] = PROJECT_FIELDS.map((f) => {
      const group = groupRefs.current[f.key] ?? null;
      return {
        ok: () => (selected[f.key]?.length ?? 0) > 0,
        scroll: group?.closest<HTMLElement>('.mc-field') ?? null,
        focus: group?.querySelector<HTMLElement>('.mc-chip') ?? null,
        flash: group,
      };
    });
    for (const input of [company, person, phone, email]) {
      fields.push({
        ok: () => (input.current?.value.trim() ?? '') !== '',
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

  const refresh = useCallback(() => setReady(allFilled(requiredFields())), [requiredFields]);
  useEffect(refresh, [refresh]);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const bad = firstMissing(requiredFields());
    if (bad) {
      jumpToField(bad, { flashClass: 'mc-flash' });
      return;
    }

    if (isSubmitting) return;
    setIsSubmitting(true);

    try {
      const { error } = await supabase.from('quotes').insert([
        {
          company: company.current?.value.trim() || '',
          person: person.current?.value.trim() || '',
          phone: phone.current?.value.trim() || '',
          email: email.current?.value.trim() || '',
          url: url.current?.value.trim() || null,
          content: content.current?.value.trim() || null,
          project_fields: selected,
          status: 'pending',
        },
      ]);

      if (error) throw error;

      alert('문의가 성공적으로 접수되었습니다. 빠르게 연락드리겠습니다!');
      setSelected(Object.fromEntries(PROJECT_FIELDS.map((f) => [f.key, [] as string[]])));
      formRef.current?.reset();
      setReady(false);
    } catch (err) {
      console.error('Submit Error:', err);
      alert('접수 중 오류가 발생했습니다. 다시 시도해 주세요.');
    } finally {
      setIsSubmitting(false);
    }
  };

  /* section headings: same left-fill colour sweep as PC .ct-block-head, ported to .mc-form-head/
     .mc-line — the fill front sweeps at constant speed (proportional to text width). */
  useEffect(() => {
    const heads = [...document.querySelectorAll<HTMLElement>('.mc-form-head')];
    if (!heads.length) return;
    const paint = (head: HTMLElement, p: number) => {
      const lines = [...head.querySelectorAll<HTMLElement>('.mc-line')];
      const widths = lines.map((l) => l.getBoundingClientRect().width);
      const total = widths.reduce((a, b) => a + b, 0) || 1;
      let front = p * total;
      lines.forEach((line, i) => {
        const f = clamp01(front / (widths[i] || 1));
        line.style.setProperty('--fill', `${(f * 100).toFixed(1)}%`);
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
        paint(head, clamp01((vh - head.getBoundingClientRect().top) / (vh * 0.67)));
      }
    });
  }, []);

  /* ⚠️ is-ready 를 className 으로 넘기지 않고 손으로 토글한다 — PC ContactForm 과 같은 이유다.
     .mc-submit 은 아래 스크롤 리빌 대상이라 `.in` 이 classList 로 직접 붙는데, className 을
     state 로 만들면 ready 가 켜지는 순간 React 가 className 을 다시 써서 그 `.in` 을 지운다.
     → 필수값을 다 채우는 순간 제출 버튼이 opacity:0 으로 사라진다. */
  useEffect(() => {
    submitRef.current?.classList.toggle('is-ready', ready);
  }, [ready]);

  /* form areas rise + fade in as they scroll into view — spans both <section class="mc-form">
     steps (step 1's chips + step 2's fields), same as the static build's document-wide selector. */
  useEffect(() => {
    const scope = document.querySelector('.m-contact.ct-rv');
    if (prefersReducedMotion()) return;
    const areas = [
      ...document.querySelectorAll('.mc-form .mc-field, .mc-form .mc-consent, .mc-form .mc-submit'),
    ];
    if (!areas.length || !('IntersectionObserver' in window)) {
      scope?.classList.remove('ct-rv');
      return;
    }
    return revealOnScroll(areas, 0.18);
  }, []);

  return (
    <>
      <section className="mc-form">
        <div className="mc-form-headwrap">
          <h2 className="mc-form-head">
            <span className="mc-line">프로젝트의</span>
            <span className="mc-line">기본정보를 확인할께요.</span>
          </h2>
        </div>
        <div className="mc-fields">
          {PROJECT_FIELDS.map((field) => (
            <div className="mc-field" key={field.key}>
              <p className="mc-field-label">{field.label}</p>
              <MobileChipGroup
                options={field.options}
                selected={selected[field.key] ?? []}
                multi={field.multi}
                onToggle={(option) => toggleChip(field.key, option, field.multi)}
                groupRef={(el) => {
                  groupRefs.current[field.key] = el;
                }}
              />
            </div>
          ))}
        </div>
      </section>

      <section className="mc-form mc-form2">
        <div className="mc-form-headwrap">
          <h2 className="mc-form-head">
            <span className="mc-line">의뢰하시는 분의</span>
            <span className="mc-line">정보와 내용을 확인할께요.</span>
          </h2>
        </div>
        <form
          className="mc-form2-inner"
          autoComplete="off"
          ref={formRef}
          onSubmit={onSubmit}
          onInput={refresh}
          onChange={refresh}
          onClick={refresh}
        >
          <div className="mc-fields mc-fields2">
            <div className="mc-field">
              <p className="mc-field-label">의뢰인 정보</p>
              <div className="mc-inputs">
                <div className="mc-input-row">
                  <input ref={company} className="mc-input" type="text" placeholder="기업명*" />
                  <input ref={person} className="mc-input" type="text" placeholder="성함*" />
                </div>
                <div className="mc-input-row">
                  <MobileFilteredInput
                    inputRef={phone}
                    type="tel"
                    inputMode="numeric"
                    filter="num"
                    placeholder="연락처*"
                    hint="숫자만 입력할 수 있어요."
                  />
                  <MobileFilteredInput
                    inputRef={email}
                    type="email"
                    inputMode="email"
                    filter="ascii"
                    placeholder="이메일*"
                    hint="영문으로 입력해 주세요."
                  />
                </div>
                <div className="mc-input-row">
                  <MobileFilteredInput
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

            <div className="mc-content-group">
              <div className="mc-field">
                <p className="mc-field-label mc-field-label--lg">프로젝트 내용</p>
                <textarea
                  ref={content}
                  className="mc-textarea"
                  placeholder="구체적일수록 자세한 상담이 가능해요."
                />
                <MobileFileRow
                  placeholder="최대 50MB 까지 첨부가능"
                  fileInputRef={fileInput}
                  nameRef={fileName}
                />
              </div>

              {/* consent: 24px circle checkbox + agreement text */}
              <label className="mc-consent" ref={consentLabel}>
                <input ref={consent} type="checkbox" className="mc-consent-input" />
                <span className="mc-consent-box" aria-hidden="true" ref={consentBox}>
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                    <path
                      d="M6.6 12 10.2 15.6 17.4 8.4"
                      stroke="currentColor"
                      strokeWidth="0.9"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </span>
                {/* 링크 목적지 미정 — PC 와 같이 href="#" 자리표시자다 */}
                <span className="mc-consent-text">
                  <a href="#">이용약관</a> 및 <a href="#">개인정보처리방침</a>에 동의합니다.
                </span>
              </label>
            </div>

            <button type="submit" className="mc-submit" ref={submitRef}>
              <span>문의하기</span>
              <span className="mc-arrow" aria-hidden="true">
                <img src="/assets/icon_arrow.svg" alt="" />
              </span>
            </button>
          </div>
        </form>
      </section>
    </>
  );
}
