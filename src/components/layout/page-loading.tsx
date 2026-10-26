import { InterfaceText } from "@/components/shared/interface-language";
export function PageLoading() {
  return (
    <div role="status" aria-live="polite" className="flex min-h-64 items-center justify-center gap-3 p-8 text-stone-800">
      <span className="h-5 w-5 animate-spin rounded-full border-2 border-amber-800 border-r-transparent" aria-hidden="true" />
      <p><InterfaceText source="Loading page…" /></p>
    </div>
  );
}
