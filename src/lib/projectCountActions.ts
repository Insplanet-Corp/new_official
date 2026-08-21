/* 메뉴 배지 캐시를 즉시 터는 서버 액션.

   배지 숫자는 unstable_cache(300초)를 타므로(lib/projectCount.ts), 어드민에서
   포트폴리오를 등록·수정·삭제해도 /, /about, /contact 의 배지는 최대 5분 늦게
   바뀐다. 그 사이 "저장했는데 숫자가 그대로"로 보인다.

   ⚠️ 캐시 무효화는 서버에서만 할 수 있는데 어드민 폼은 클라이언트에서 supabase 로
   직접 저장한다(서버 라우트를 안 거친다). 그래서 태그만 터는 서버 액션을 따로 둔다.

   ⚠️ Next 16 에서 `revalidateTag(tag)` 는 인자 하나로 부르면 deprecated 경고가 뜬다 —
   두 번째 인자로 얼마나 오래 옛 값을 더 내줘도 되는지(profile)를 받게 바뀌었다.
   여기서는 서버 액션 전용인 `updateTag` 를 쓴다. 즉시 만료라 "저장한 사람이 자기가
   쓴 값을 바로 본다"가 성립한다. ⚠️ 라우트 핸들러에서는 던진다 — 그쪽에서 필요해지면
   `revalidateTag(PROJECT_COUNT_TAG, 'max')` 를 쓸 것.

   ⚠️ 'use server' 파일은 async 함수만 export 할 수 있다 — PROJECT_COUNT_TAG 상수를
   들고 있는 projectCount.ts 안에 같이 둘 수 없어 파일이 갈렸다.

   권한 검사를 두지 않았다. 서버 액션은 주소만 알면 누구나 부를 수 있지만 이 액션이
   하는 일은 캐시 태그를 무효화하는 것뿐이라, 최악이라도 count 쿼리가 한 번 더 도는
   정도다. 데이터를 읽지도 쓰지도 않는다. */

"use server";

import { updateTag } from "next/cache";
import { PROJECT_COUNT_TAG } from "@/lib/projectCount";

export async function refreshProjectCount() {
  updateTag(PROJECT_COUNT_TAG);
}
