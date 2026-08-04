"use client";

import UserForm from "@/components/admin/UserForm";
import { SubHead } from "@/components/admin/ui";
import Button from "@/components/button/Button";

/* 사용자관리 - 등록 (기획서 40p)

   Auth 계정 + admin_users 프로필을 한 번에 만든다. 브라우저의 anon 키로는
   계정을 만들 수 없어서(service_role 필요), 실제 생성은 서버 라우트
   src/app/api/admin/users/route.ts 가 맡는다. */
export default function UserNewPage() {
  return (
    <>
      <SubHead
        eyebrow="Users"
        title="사용자관리 – 등록"
        desc="어드민에 접근할 계정을 등록합니다."
        actions={
          <Button
            href="/admin/users"
            label="목록"
            variant="outline"
            color="GRAY"
            size="2"
            radius="medium"
          />
        }
      />

      <UserForm mode="create" />
    </>
  );
}
