"use client";
import { useRouter } from "next/navigation";
import { ContentFormCore } from "@/components/shared/content-form";
export function DynamicContentForm({ stayOnPage = false, ...props }: Omit<Parameters<typeof ContentFormCore>[0], "navigate" | "refresh" | "transport"> & { stayOnPage?: boolean }) {
  const router = useRouter();
  return <ContentFormCore {...props} navigate={stayOnPage ? () => {} : router.push} refresh={router.refresh} />;
}
