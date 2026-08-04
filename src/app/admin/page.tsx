import { redirect } from "next/navigation";
import { ADMIN_TABS } from "@/components/admin/tabs";

/* /admin has no dashboard of its own — it opens on the first tab. */
export default function AdminIndexPage() {
  redirect(ADMIN_TABS[0].href);
}
