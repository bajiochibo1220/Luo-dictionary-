import Link from "next/link";
import { prisma } from "@/lib/db";
import {
  VisitorTrend,
  DevicePie,
  TopSearches,
  GeoBar,
} from "@/components/admin/analytics-charts";

export default async function AnalyticsPage({
  searchParams,
}: {
  searchParams: { days?: string; lang?: string };
}) {
  const days = Math.max(1, Math.min(90, Number(searchParams.days) || 30));
  const since = new Date();
  since.setDate(since.getDate() - days);

  const languages = await prisma.language.findMany({
    where: { isActive: true },
    orderBy: { displayOrder: "asc" },
  });

  const langCode = searchParams.lang;
  const language = langCode
    ? languages.find((l) => l.code === langCode)
    : null;

  const where: any = { createdAt: { gte: since } };
  if (language) where.languageId = language.id;

  const [totalEvents, uniqueUserIds] = await Promise.all([
    prisma.analyticsEvent.count({ where }),
    prisma.analyticsEvent.findMany({
      where: { ...where, userId: { not: null } },
      distinct: ["userId"],
      select: { userId: true },
    }),
  ]);

  const events = await prisma.analyticsEvent.findMany({
    where,
    select: {
      createdAt: true,
      eventType: true,
      metadata: true,
      entityId: true,
      userAgent: true,
    },
    orderBy: { createdAt: "asc" },
  });

  // Trend
  const trendMap = new Map<string, number>();
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    trendMap.set(d.toISOString().slice(0, 10), 0);
  }
  for (const e of events) {
    const key = e.createdAt.toISOString().slice(0, 10);
    if (trendMap.has(key)) trendMap.set(key, (trendMap.get(key) ?? 0) + 1);
  }
  const trend = Array.from(trendMap.entries()).map(([date, count]) => ({
    date,
    count,
  }));

  // Searches
  const searchCounts = new Map<string, number>();
  for (const e of events) {
    if (e.eventType === "search") {
      const q = (e.metadata as any)?.query;
      if (typeof q === "string" && q.trim()) {
        searchCounts.set(q, (searchCounts.get(q) ?? 0) + 1);
      }
    }
  }
  const topSearches = Array.from(searchCounts.entries())
    .map(([query, count]) => ({ query, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 8);

  // Geo
  const geoMap = new Map<string, number>();
  for (const e of events) {
    const c = (e.metadata as any)?.country;
    if (typeof c === "string") geoMap.set(c, (geoMap.get(c) ?? 0) + 1);
  }
  const geo = Array.from(geoMap.entries())
    .map(([country, count]) => ({ country, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 6);

  // Devices
  const deviceMap = new Map<string, number>([
    ["mobile", 0],
    ["desktop", 0],
    ["tablet", 0],
  ]);
  for (const e of events) {
    const d = (e.metadata as any)?.device;
    const ua = e.userAgent ?? "";
    let device = "desktop";
    if (typeof d === "string") device = d;
    else if (/Mobile|Android|iPhone/i.test(ua)) device = "mobile";
    else if (/iPad|Tablet/i.test(ua)) device = "tablet";
    deviceMap.set(device, (deviceMap.get(device) ?? 0) + 1);
  }
  const devices = Array.from(deviceMap.entries()).map(([device, count]) => ({
    device,
    count,
  }));

  return (
    <div>
      <header className="mb-6 flex items-start justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-3xl font-serif text-stone-800 mb-1">Analytics</h1>
          <p className="text-sm text-stone-500">
            {totalEvents} events · {uniqueUserIds.length} unique users · last{" "}
            {days} days
          </p>
        </div>

        <div className="flex gap-2">
          {[7, 30, 90].map((d) => (
            <Link
              key={d}
              href={`/admin/analytics?days=${d}${langCode ? `&lang=${langCode}` : ""}`}
              className={`text-xs px-3 py-1.5 rounded-full ${
                days === d
                  ? "bg-amber-600 text-white"
                  : "bg-white border border-stone-200 text-stone-600 hover:border-amber-400"
              }`}
            >
              {d}d
            </Link>
          ))}
        </div>
      </header>

      {/* Language filter */}
      <div className="mb-6 flex flex-wrap gap-2">
        <Link
          href={`/admin/analytics?days=${days}`}
          className={`text-xs px-3 py-1.5 rounded-full ${
            !langCode
              ? "bg-amber-600 text-white"
              : "bg-white border border-stone-200 text-stone-600 hover:border-amber-400"
          }`}
        >
          All languages
        </Link>
        {languages.map((l) => (
          <Link
            key={l.code}
            href={`/admin/analytics?days=${days}&lang=${l.code}`}
            className={`text-xs px-3 py-1.5 rounded-full ${
              langCode === l.code
                ? "bg-amber-600 text-white"
                : "bg-white border border-stone-200 text-stone-600 hover:border-amber-400"
            }`}
          >
            {l.nativeName}
          </Link>
        ))}
      </div>

      {/* Visitor trend — full width */}
      <div className="mb-6">
        <VisitorTrend data={trend} />
      </div>

      {/* Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <TopSearches data={topSearches} />
        <GeoBar data={geo} />
        <DevicePie data={devices} />
      </div>
    </div>
  );
}