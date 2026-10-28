import { redirect } from "next/navigation";

// Keep older bookmarks on the same approval workflow as all public labels.
export default function TranslationsPage() {
  redirect("/admin/interface");
}
