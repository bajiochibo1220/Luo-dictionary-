import { InterfaceText } from "@/components/shared/interface-language";
export function AiUsageCard({
  queries,
  avgLatencyMs,
  satisfactionPct,
}: {
  queries: number;
  avgLatencyMs: number;
  satisfactionPct: number;
}) {
  return (
    <div className="bg-linear-to-br from-amber-50 to-stone-50 rounded-xl border border-amber-100 p-6">
      <h3 className="text-xs uppercase tracking-wider text-amber-700 mb-4"><InterfaceText source="AI Usage" /></h3>

      <div className="grid grid-cols-3 gap-4">
        <div>
          <p className="text-2xl font-serif text-stone-800">{queries}</p>
          <p className="text-xs text-stone-500 mt-1"><InterfaceText source="Queries" /></p>
        </div>
        <div>
          <p className="text-2xl font-serif text-stone-800">
            {avgLatencyMs > 0 ? `${(avgLatencyMs / 1000).toFixed(1)}s` : "—"}
          </p>
          <p className="text-xs text-stone-500 mt-1"><InterfaceText source="Avg response" /></p>
        </div>
        <div>
          <p className="text-2xl font-serif text-stone-800">
            {satisfactionPct > 0 ? `${satisfactionPct}%` : "—"}
          </p>
          <p className="text-xs text-stone-500 mt-1"><InterfaceText source="Satisfaction" /></p>
        </div>
      </div>
    </div>
  );
}