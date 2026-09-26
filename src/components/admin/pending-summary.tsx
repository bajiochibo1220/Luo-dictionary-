import Link from "next/link";

export function PendingSummary({
  total,
  byModule,
}: {
  total: number;
  byModule: { label: string; count: number }[];
}) {
  return (
    <div className="bg-white rounded-xl shadow-sm border border-stone-100 p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-xs uppercase tracking-wider text-stone-400">
          Pending Review
        </h3>
        <span className="text-2xl font-serif text-amber-600">{total}</span>
      </div>

      {total === 0 ? (
        <p className="text-sm text-stone-400 py-4">
          Nothing waiting for review
        </p>
      ) : (
        <>
          <ul className="space-y-2 mb-4">
            {byModule.map((m) => (
              <li
                key={m.label}
                className="flex items-center justify-between text-sm"
              >
                <span className="text-stone-700">{m.label}</span>
                <span className="text-amber-600 font-medium tabular-nums">
                  {m.count}
                </span>
              </li>
            ))}
          </ul>
          <Link
            href="/admin/review-queue"
            className="block text-xs uppercase tracking-wider text-amber-600 hover:text-amber-700 text-center pt-3 border-t border-stone-100"
          >
            Go to queue →
          </Link>
        </>
      )}
    </div>
  );
}