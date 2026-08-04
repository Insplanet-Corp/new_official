"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Actions,
  CheckGrid,
  Inline,
  Input,
  Radios,
  Row,
} from "@/components/admin/form";
import { Note } from "@/components/admin/ui";
import kit from "@/components/admin/kit.module.css";
import { MENU_PERMISSIONS } from "@/components/admin/tabs";
import { USE_YN } from "@/data/adminOptions";
import { describeError, type AdminUserProfile } from "@/lib/adminUsers";
import { supabase } from "@/lib/supabase";
import Button from "../button/Button";

/* 사용자관리 등록 / 수정 폼 (기획서 40p · 43p).

   등록: Auth 계정 생성이 필요해 서버 라우트(/api/admin/users)가 처리한다.
         브라우저의 anon 키로는 계정을 만들 수 없기 때문 — 라우트 주석 참고.
   수정: 프로필만 바뀌므로 anon 키 + RLS 로 충분하다. ID·이메일은 못 바꾼다
         (기획서 43p 2번, 이메일은 Auth credential 이라 별도 절차).

   비밀번호는 등록할 때만 받는다. 변경은 Auth 쪽 소관이다. */

const MIN_PASSWORD = 6;

const EMPTY: AdminUserProfile = {
  name: "",
  login_id: "",
  email: "",
  phone: "",
  use_yn: "Y",
  permissions: [],
};

export default function UserForm({
  mode,
  userId,
  initial,
}: {
  mode: "create" | "edit";
  /** edit 일 때 admin_users.id (= auth.users.id) */
  userId?: string;
  initial?: AdminUserProfile;
}) {
  const router = useRouter();
  const [v, setV] = useState<AdminUserProfile>(initial ?? EMPTY);
  const [password, setPassword] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [idCheck, setIdCheck] = useState<"idle" | "ok" | "taken">("idle");

  const set = <K extends keyof AdminUserProfile>(
    k: K,
    val: AdminUserProfile[K],
  ) => {
    setV((cur) => ({ ...cur, [k]: val }));
    if (k === "login_id") setIdCheck("idle");
  };

  const togglePermission = (value: string) =>
    setV((cur) => ({
      ...cur,
      permissions: cur.permissions.includes(value)
        ? cur.permissions.filter((p) => p !== value)
        : [...cur.permissions, value],
    }));

  // 전체메뉴 ON -> 전부 체크, OFF -> 전부 해제 (기획서 40p 8번)
  const toggleAll = (next: boolean) =>
    set("permissions", next ? MENU_PERMISSIONS.map((m) => m.value) : []);

  /* ID 중복확인 — admin_users.login_id 는 unique 제약이 걸려 있다 */
  const checkId = async () => {
    const id = v.login_id.trim();
    if (!id) return;
    const { data, error } = await supabase
      .from("admin_users")
      .select("id")
      .eq("login_id", id)
      .neq("id", userId ?? "00000000-0000-0000-0000-000000000000")
      .maybeSingle();
    if (error) {
      setError(describeError(error));
      return;
    }
    setIdCheck(data ? "taken" : "ok");
  };

  /* 등록 — 서버 라우트가 Auth 계정과 프로필을 함께 만든다.
     로그인 세션의 access token 을 실어 보내야 라우트가 권한을 확인할 수 있다. */
  const create = async (): Promise<string | null> => {
    if (!v.name.trim()) return "사용자명을 입력해 주세요.";
    if (!v.login_id.trim()) return "사용자 ID를 입력해 주세요.";
    if (idCheck !== "ok") return "사용자 ID 중복확인을 해주세요.";
    if (!v.email.trim()) return "이메일을 입력해 주세요.";
    if (password.length < MIN_PASSWORD)
      return `비밀번호는 ${MIN_PASSWORD}자 이상이어야 합니다.`;

    const {
      data: { session },
    } = await supabase.auth.getSession();
    if (!session) return "세션이 만료되었습니다. 다시 로그인해 주세요.";

    const res = await fetch("/api/admin/users", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${session.access_token}`,
      },
      body: JSON.stringify({ ...v, password }),
    });
    if (!res.ok) {
      const body = await res.json().catch(() => null);
      return body?.error ?? `등록에 실패했습니다. (HTTP ${res.status})`;
    }
    return null;
  };

  /* 수정 — 프로필만 바뀌므로 anon 키 + RLS 로 처리한다 */
  const update = async (id: string): Promise<string | null> => {
    const { error } = await supabase
      .from("admin_users")
      .update({
        name: v.name.trim(),
        login_id: v.login_id.trim(),
        phone: v.phone?.trim() || null,
        use_yn: v.use_yn,
        permissions: v.permissions,
      })
      .eq("id", id);
    return error ? describeError(error) : null;
  };

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (saving) return;
    setSaving(true);
    setError(null);

    const message =
      mode === "create"
        ? await create()
        : userId
          ? await update(userId)
          : "대상 계정을 찾을 수 없습니다.";

    setSaving(false);
    if (message) {
      setError(message);
      return;
    }
    router.push("/admin/users");
    router.refresh();
  };

  return (
    <>
      {error ? <Note warn>{error}</Note> : null}

      <form className={kit.card} onSubmit={onSubmit}>
        <Row label="사용자명" required>
          <Input
            value={v.name}
            onChange={(x) => set("name", x)}
            placeholder="사용자명"
            size="medium"
          />
        </Row>

        <Row label="사용여부" required hint="N 선택 시 로그인할 수 없습니다.">
          <Radios
            name="use"
            value={v.use_yn}
            onChange={(x) => set("use_yn", x as "Y" | "N")}
            options={USE_YN}
          />
        </Row>

        <Row
          label="사용자 ID"
          required
          hint={
            mode === "edit"
              ? "ID는 수정할 수 없습니다."
              : idCheck === "ok"
                ? "사용 가능한 ID 입니다."
                : idCheck === "taken"
                  ? "이미 사용 중인 ID 입니다. 다른 ID를 입력해 주세요."
                  : "중복확인을 거쳐야 저장할 수 있습니다."
          }
        >
          <Inline>
            <Input
              value={v.login_id}
              onChange={(x) => set("login_id", x)}
              placeholder="insplanet01"
              size="medium"
              disabled={mode === "edit"}
            />
            {mode === "create" ? (
              <Button
                label="중복확인"
                variant="outline"
                color="GRAY"
                size="1"
                radius="medium"
                onClick={checkId}
              />
            ) : null}
          </Inline>
        </Row>

        <Row
          label="이메일"
          required
          hint="Supabase Auth 로그인에 쓰는 주소입니다. 변경은 Auth 쪽에서 해야 합니다."
        >
          <Input
            value={v.email}
            onChange={(x) => set("email", x)}
            type="email"
            placeholder="admin@insplanet.co.kr"
            size="medium"
            disabled={mode === "edit"}
          />
        </Row>

        {mode === "create" ? (
          <Row
            label="비밀번호"
            required
            hint={`${MIN_PASSWORD}자 이상. 등록 후 변경은 본인이 Auth 쪽에서 해야 합니다.`}
          >
            <Input
              value={password}
              onChange={setPassword}
              type="password"
              placeholder="••••••••"
              size="medium"
            />
          </Row>
        ) : null}

        <Row label="전화번호" required>
          <Input
            value={v.phone ?? ""}
            onChange={(x) => set("phone", x)}
            placeholder="010-0000-0000"
            size="medium"
          />
        </Row>

        <Row
          label="메뉴권한"
          required
          hint="전체메뉴를 켜면 하위 메뉴가 모두 선택됩니다."
        >
          <CheckGrid
            options={MENU_PERMISSIONS}
            selected={v.permissions}
            onToggle={togglePermission}
            onToggleAll={toggleAll}
          />
        </Row>

        <Actions>
          <Button
            type="submit"
            label={saving ? "저장 중…" : mode === "create" ? "등록" : "저장"}
            variant="solid"
            color="BLUE"
            size="2"
            radius="medium"
            disabled={saving}
          />
          <Button
            label="취소"
            variant="outline"
            color="GRAY"
            size="2"
            radius="medium"
            onClick={() => router.push("/admin/users")}
          />
        </Actions>
      </form>
    </>
  );
}
