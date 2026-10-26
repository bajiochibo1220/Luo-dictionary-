"use client";
import { useRouter } from "next/navigation";
import { ContentFormCore } from "@/components/shared/content-form";
export function DynamicContentForm(props: Omit<Parameters<typeof ContentFormCore>[0], "navigate" | "refresh" | "transport">) {
  const router = useRouter();
  return <ContentFormCore {...props} navigate={router.push} refresh={router.refresh} />;
}
