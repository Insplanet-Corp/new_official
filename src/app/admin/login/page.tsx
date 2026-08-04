"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ADMIN_TABS } from "@/components/admin/tabs";
import { supabase } from "@/lib/supabase";
import Badge from "@/components/badge/Badge";
import Button from "@/components/button/Button";
import Flex from "@/components/layouts/Flex";
import Heading from "@/components/text/Heading";
import Text from "@/components/text/Text";
import s from "./login.module.css";

const HOME = ADMIN_TABS[0].href;

export default function AdminLoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const router = useRouter();

  // 이미 로그인된 상태로 들어오면 곧장 어드민으로
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) router.replace(HOME);
    });
  }, [router]);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    setError(null);

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    if (error) {
      setError(
        error.message === "Invalid login credentials"
          ? "이메일 또는 비밀번호가 올바르지 않습니다."
          : error.message,
      );
      setBusy(false);
      return;
    }
    router.replace(HOME);
  };

  return (
    <div className={s.root}>
      <div className={s.login}>
        <div className={s.card}>
          <Flex row align="center" gap={10} className={s.brand}>
            <img src="/assets/ci_logo.svg" alt="Insplanet" />
            <Badge
              label="ADMIN"
              variant="solid"
              color="GRAY"
              size="1"
              radius="small"
            />
          </Flex>

          <Heading as="h1" size="5" weight="700" className={s.title}>
            관리자 로그인
          </Heading>
          <Text
            as="p"
            size="2"
            fontSize="13px"
            color="var(--muted)"
            className={s.desc}
          >
            등록된 관리자 계정으로만 접근할 수 있습니다.
          </Text>

          {error ? (
            <Text as="p" size="2" fontSize="12.5px" className={s.error}>
              {error}
            </Text>
          ) : null}

          <form onSubmit={onSubmit} noValidate>
            <div className={s.field}>
              <Text
                as="label"
                size="1"
                fontSize="12.5px"
                weight="700"
                color="var(--ink-2)"
                className={s.label}
                htmlFor="adm-email"
              >
                이메일
              </Text>
              <input
                id="adm-email"
                className={s.input}
                type="email"
                autoComplete="username"
                placeholder="admin@insplanet.co.kr"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>

            <div className={s.field}>
              <Text
                as="label"
                size="1"
                fontSize="12.5px"
                weight="700"
                color="var(--ink-2)"
                className={s.label}
                htmlFor="adm-pw"
              >
                비밀번호
              </Text>
              <input
                id="adm-pw"
                className={s.input}
                type="password"
                autoComplete="current-password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>

            <Button
              type="submit"
              label={busy ? "로그인 중…" : "로그인"}
              disabled={busy}
              color="BLUE"
              variant="solid"
              size="4"
              radius="large"
              width="100%"
              className={s.submit}
            />
          </form>

          <Text as="p" size="1" className={s.foot}>
            <Link href="/">← 인스플래닛 사이트로 돌아가기</Link>
          </Text>
        </div>
      </div>
    </div>
  );
}
