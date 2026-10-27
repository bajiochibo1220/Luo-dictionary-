import { redirect } from "next/navigation";
import { PRD_SUBJECTS } from "@/lib/prd-content-catalog";

export default async function Page({ searchParams }: { searchParams: Promise<{ subject?: string }> }) {
  const { subject } = await searchParams;
  const valid = PRD_SUBJECTS.find(value => value === subject);
  redirect(`/application#/explore${valid ? `?subject=${encodeURIComponent(valid)}` : ""}`);
}
