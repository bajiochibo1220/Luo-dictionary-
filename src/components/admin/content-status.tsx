import { InterfaceText } from "@/components/shared/interface-language";
import { statusLabel } from "@/components/shared/collection-browser";

const styles: Record<string, string> = {
  submitted: "bg-amber-100 text-amber-900", needs_edit: "bg-purple-100 text-purple-900",
  under_review: "bg-blue-100 text-blue-900", published: "bg-green-100 text-green-900",
  published_source: "bg-green-100 text-green-900", rejected: "bg-red-100 text-red-900",
  rejection_review: "bg-red-100 text-red-900",
};

export function ContentStatus({ status, hasPublicVersion = false }: { status: string; hasPublicVersion?: boolean }) {
  return <div className="flex flex-col items-start gap-2"><span className={`inline-flex whitespace-nowrap rounded-full px-3 py-1 text-xs font-semibold ${styles[status] || "bg-stone-100 text-stone-700"}`}><InterfaceText source={statusLabel(status)} /></span>{hasPublicVersion && <span className="inline-flex whitespace-nowrap rounded-full border border-green-200 bg-green-50 px-3 py-1 text-xs text-green-900"><InterfaceText source="Public version available" /></span>}</div>;
}
