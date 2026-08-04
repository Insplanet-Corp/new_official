"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { ADMIN_TABS, tabForPath } from "@/components/admin/tabs";
import { describeError, isMissingTable } from "@/lib/adminUsers";
import { Note } from "@/components/admin/ui";
import { supabase } from "@/lib/supabase";
import s from "./AdminShell.module.css";
import Flex from "../layouts/Flex";
import Badge from "../badge/Badge";
import Button from "../button/Button";
import Avatar from "../avatar/Avatar";
import Heading from "../text/Heading";
import Text from "../text/Text";
import { VerticalDivider } from "../divider/Divider";

const LOGIN_PATH = "/admin/login";

/* Chrome for every /admin route: session gate + header + tab bar.
   /admin/login renders bare (it's the way *in*, so it can't sit behind the gate). */
export default function AdminShell({ children }: { children: ReactNode }) {
  const pathname = usePathname() ?? "";
  const router = useRouter();
  const isLogin = pathname === LOGIN_PATH;

  const [email, setEmail] = useState<string | null>(null);
  const [checked, setChecked] = useState(false);
  /* Auth 계정은 있는데 admin_users 프로필이 없거나 사용여부가 N 인 경우.
     프로필이 없으면 메뉴 권한을 판정할 수 없어 빈 화면만 보이므로, 조용히 두지 않고 막는다.
     (002 마이그레이션의 트리거가 프로필을 자동 생성하지만, 미실행 상태를 대비한 방어) */
  const [blocked, setBlocked] = useState<"no-profile" | "disabled" | null>(
    null,
  );
  /* 프로필 조회가 실패했을 때의 사유. 예전엔 조용히 삼켰는데, 그 바람에
     RLS 무한재귀(42P17) 같은 설정 오류가 "데이터가 없는 화면"으로만 보였다.
     화면을 막지는 않고(일시적 네트워크 오류로 어드민 전체가 잠기면 곤란하다)
     본문 위에 띠로 띄운다. */
  const [fault, setFault] = useState<string | null>(null);
  /* 이 계정의 메뉴권한 (admin_users.permissions).

     null 은 "아직 모른다" 다 — 조회 전이거나, 테이블이 없거나, 조회가 실패한
     경우. 이때는 탭을 거르지 않고 전부 보여준다. 설정 오류 때문에 어드민이
     통째로 잠기는 것보다 낫고, 어차피 실제 차단은 DB 의 RLS 가 한다. */
  const [permissions, setPermissions] = useState<string[] | null>(null);

  useEffect(() => {
    if (isLogin) return;
    let alive = true;

    const load = async (userEmail: string | null, userId: string) => {
      setEmail(userEmail);
      const { data, error } = await supabase
        .from("admin_users")
        .select("use_yn, permissions")
        .eq("id", userId)
        .maybeSingle();
      if (!alive) return;
      // 테이블이 아직 없으면(마이그레이션 미실행) 막지 않는다 — 각 화면이 안내를 띄운다
      if (error && !isMissingTable(error)) {
        setFault(describeError(error));
        setChecked(true);
        return;
      }
      setFault(null);
      if (!error) {
        const row = data as {
          use_yn: string;
          permissions: string[] | null;
        } | null;
        if (!row) setBlocked("no-profile");
        else if (row.use_yn === "N") setBlocked("disabled");
        else setPermissions(row.permissions ?? []);
      }
      setChecked(true);
    };

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!alive) return;
      if (!session) {
        router.replace(LOGIN_PATH);
        return;
      }
      void load(session.user.email ?? null, session.user.id);
    });

    // signing out in another tab (or a token expiring) kicks this tab back to the login page
    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!alive) return;
      if (!session) router.replace(LOGIN_PATH);
      else setEmail(session.user.email ?? null);
    });

    return () => {
      alive = false;
      sub.subscription.unsubscribe();
    };
  }, [isLogin, router]);

  /* permissions 를 아직 모르면(null) 거르지 않는다 — 위 상태 주석 참고.
     useMemo 는 아래 리다이렉트 effect 가 매 렌더마다 다시 돌지 않게 하기 위함이다
     (배열을 새로 만들면 의존성이 매번 바뀐다). */
  const allowedTabs = useMemo(
    () =>
      permissions
        ? ADMIN_TABS.filter((t) => permissions.includes(t.href))
        : ADMIN_TABS,
    [permissions],
  );

  const currentTab = tabForPath(pathname);
  const denied =
    permissions !== null &&
    currentTab !== undefined &&
    !permissions.includes(currentTab.href);

  /* /admin 은 서버에서 첫 탭(/admin/main)으로 보낸다. 그 탭에 권한이 없는
     계정은 로그인하자마자 "권한 없음" 을 보게 되므로, 접근 가능한 첫 탭으로
     한 번 더 돌린다. 사용자가 직접 친 다른 경로는 그대로 막는다. */
  useEffect(() => {
    if (denied && pathname === ADMIN_TABS[0].href && allowedTabs.length > 0) {
      router.replace(allowedTabs[0].href);
    }
  }, [denied, pathname, allowedTabs, router]);

  const signOut = async () => {
    await supabase.auth.signOut();
    router.replace(LOGIN_PATH);
  };

  if (isLogin) return <>{children}</>;
  if (!checked)
    return (
      <div className={s.boot}>
        <Text size="2" fontSize="13px" color="var(--muted)">
          세션을 확인하는 중…
        </Text>
      </div>
    );

  if (blocked) {
    return (
      <div className={s.boot}>
        <Flex align="center" gap={8} className={s.blocked}>
          <Heading as="h1" size="4" fontSize="15px" weight="700">
            {blocked === "disabled"
              ? "사용할 수 없는 계정입니다"
              : "계정 프로필이 없습니다"}
          </Heading>
          <Text
            as="p"
            size="2"
            fontSize="13px"
            align="center"
            color="var(--muted)"
          >
            {blocked === "disabled"
              ? "이 계정은 사용여부가 N 으로 설정되어 있습니다. 관리자에게 문의해 주세요."
              : `로그인은 되었지만 admin_users 에 프로필이 없어 메뉴 권한을 확인할 수 없습니다. ${email ?? ""} 계정의 프로필을 등록해 주세요.`}
          </Text>
          <Button
            label="로그아웃"
            variant="outline"
            color="GRAY"
            size="2"
            radius="large"
            onClick={signOut}
          />
        </Flex>
      </div>
    );
  }

  /* 권한 없는 메뉴 — 탭을 숨기는 것만으로는 부족하다. 주소를 직접 치면
     그대로 들어와지므로 화면 자체를 막는다.
     (기획서 44~45p 는 "숨긴다 / 보여주되 얼랏" 두 안을 병기해 뒀는데,
      숨기는 쪽으로 구현했다. 얼랏 방식으로 바꾸려면 allowedTabs 를
      ADMIN_TABS 로 되돌리고 이 화면만 남기면 된다.) */
  if (denied) {
    return (
      <div className={s.boot}>
        <Flex align="center" gap={8} className={s.blocked}>
          <Heading as="h1" size="4" fontSize="15px" weight="700">
            접근 권한이 없습니다
          </Heading>
          <Text as="p" size="2" fontSize="13px" align="center" color="var(--muted)">
            {allowedTabs.length > 0
              ? `${currentTab?.label} 메뉴에 대한 권한이 없습니다. 필요하면 관리자에게 요청해 주세요.`
              : "부여된 메뉴 권한이 없습니다. 관리자에게 권한을 요청해 주세요."}
          </Text>
          <Flex row align="center" gap={8}>
            {allowedTabs.length > 0 ? (
              <Button
                href={allowedTabs[0].href}
                label={`${allowedTabs[0].label}(으)로 이동`}
                variant="solid"
                color="BLUE"
                size="2"
                radius="large"
              />
            ) : null}
            <Button
              label="로그아웃"
              variant="outline"
              color="GRAY"
              size="2"
              radius="large"
              onClick={signOut}
            />
          </Flex>
        </Flex>
      </div>
    );
  }

  return (
    <div className={s.root}>
      <header className={s.head}>
        <Flex
          row
          align="center"
          gap={20}
          px={32}
          height="64px"
          mx="auto"
          style={{
            maxWidth: "1520px",
          }}
        >
          <Link href="/" className={s.brand} aria-label="Insplanet 홈">
            <Flex row gap={6}>
              <img src="/assets/ci_logo.svg" alt="Insplanet" />
              <Badge
                variant="solid"
                label="ADMIN"
                color="GRAY"
                size="1"
                radius="small"
              />
            </Flex>
          </Link>
          <VerticalDivider size={20} color="var(--line)" />
          <Text size="1" fontSize="13px" weight="700" className={s.barTitle}>
            콘텐츠 · 문의 관리
          </Text>

          <span className={s.barSpacer} />

          <Flex row align="center" gap={8} className={s.headRight}>
            <Button
              href="/"
              label="사이트 보기"
              variant="ghost"
              color="GRAY"
              size="2"
              radius="large"
              className={s.siteLink}
            />
            <Flex
              row
              align="center"
              gap={8}
              className={s.account}
              title={email ?? undefined}
            >
              <Avatar
                size={24}
                radius="full"
                color="var(--ink-2)"
                fallback={
                  <Text size="1" weight="700" color="#fff">
                    {(email ?? "?").charAt(0).toUpperCase()}
                  </Text>
                }
              />
              <Text
                size="1"
                fontSize="12.5px"
                truncate
                className={s.accountMail}
              >
                {email ?? "알 수 없는 계정"}
              </Text>
            </Flex>
            <Button
              label="로그아웃"
              variant="outline"
              color="GRAY"
              size="2"
              radius="large"
              onClick={signOut}
            />
          </Flex>
        </Flex>

        <nav className={s.tabs} aria-label="관리 메뉴">
          {allowedTabs.map((tab) => {
            const active =
              pathname === tab.href || pathname.startsWith(`${tab.href}/`);
            return (
              <Link
                key={tab.href}
                href={tab.href}
                className={`${s.tab}${active ? ` ${s.isActive}` : ""}`}
                aria-current={active ? "page" : undefined}
              >
                {tab.label}
                {tab.sub ? (
                  <Text
                    size="1"
                    fontSize="11px"
                    weight="700"
                    className={s.tabSub}
                  >
                    {tab.sub}
                  </Text>
                ) : null}
              </Link>
            );
          })}
        </nav>
      </header>

      <main className={s.main}>
        {fault ? <Note warn>{fault}</Note> : null}
        {children}
      </main>
    </div>
  );
}
