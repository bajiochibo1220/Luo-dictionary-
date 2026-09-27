import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const days = Math.max(1, Math.min(90, Number(searchParams.get("days") || 30)));
    const languageId = Number(searchParams.get("languageId") || 0);

    const since = new Date();
    since.setDate(since.getDate() - days);

    const where: any = { createdAt: { gte: since } };
    if (languageId > 0) where.languageId = languageId;

    // Total events
    const totalEvents = await prisma.analyticsEvent.count({ where });

    // Visitors (unique user+IP per day — simplified as unique userId)
    const uniqueUsers = await prisma.analyticsEvent.findMany({
      where: { ...where, userId: { not: null } },
      distinct: ["userId"],
      select: { userId: true },
    });

    // Trend — events per day
    const events = await prisma.analyticsEvent.findMany({
      where,
      select: { createdAt: true, eventType: true },
      orderBy: { createdAt: "asc" },
    });

    const trendMap = new Map<string, number>();
    for (let i = days - 1; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const key = d.toISOString().slice(0, 10);
      trendMap.set(key, 0);
    }
    for (const e of events) {
      const key = e.createdAt.toISOString().slice(0, 10);
      if (trendMap.has(key)) trendMap.set(key, (trendMap.get(key) ?? 0) + 1);
    }
    const trend = Array.from(trendMap.entries()).map(([date, count]) => ({
      date,
      count,
    }));

    // Top searches
    const searchEvents = await prisma.analyticsEvent.findMany({
      where: { ...where, eventType: "search" },
      select: { metadata: true },
      take: 500,
    });

    const searchCounts = new Map<string, number>();
    for (const e of searchEvents) {
      const q = (e.metadata as any)?.query;
      if (typeof q === "string" && q.trim()) {
        searchCounts.set(q, (searchCounts.get(q) ?? 0) + 1);
      }
    }
    const topSearches = Array.from(searchCounts.entries())
      .map(([query, count]) => ({ query, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    // Top content (by views/plays)
    const contentEvents = await prisma.analyticsEvent.findMany({
      where: { ...where, eventType: { in: ["page_view", "audio_play", "view"] } },
      select: { entityId: true, entityType: true },
    });

    const contentCounts = new Map<string, number>();
    for (const e of contentEvents) {
      if (e.entityId) {
        contentCounts.set(
          e.entityId,
          (contentCounts.get(e.entityId) ?? 0) + 1
        );
      }
    }

    const topContentIds = Array.from(contentCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5);

    const topContentRecords = await prisma.culturalRecord.findMany({
      where: { id: { in: topContentIds.map(([id]) => id) } },
      select: { id: true, title: true },
    });

    const topContent = topContentIds.map(([id, count]) => {
      const rec = topContentRecords.find((r) => r.id === id);
      return { id, title: rec?.title ?? "Unknown", count };
    });

    // Geographic reach — from IP or metadata country (simplified: read from metadata)
    const geoMap = new Map<string, number>();
    for (const e of events) {
      const country = (e as any).metadata?.country;
      if (typeof country === "string") {
        geoMap.set(country, (geoMap.get(country) ?? 0) + 1);
      }
    }
    const geo = Array.from(geoMap.entries())
      .map(([country, count]) => ({ country, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    // Device breakdown — from metadata.device
    const deviceMap = new Map<string, number>([
      ["mobile", 0],
      ["desktop", 0],
      ["tablet", 0],
    ]);
    const allEvents = await prisma.analyticsEvent.findMany({
      where,
      select: { userAgent: true, metadata: true },
    });
    for (const e of allEvents) {
      const d = (e.metadata as any)?.device;
      const ua = e.userAgent ?? "";
      let device = "desktop";
      if (typeof d === "string") device = d;
      else if (/Mobile|Android|iPhone/i.test(ua)) device = "mobile";
      else if (/iPad|Tablet/i.test(ua)) device = "tablet";
      deviceMap.set(device, (deviceMap.get(device) ?? 0) + 1);
    }
    const devices = Array.from(deviceMap.entries()).map(
      ([device, count]) => ({ device, count })
    );

    return NextResponse.json({
      success: true,
      data: {
        totalEvents,
        uniqueVisitors: uniqueUsers.length,
        trend,
        topSearches,
        topContent,
        geo,
        devices,
      },
    });
  } catch (err: any) {
    console.error("[analytics GET]", err);
    return NextResponse.json(
      { success: false, error: "Failed to fetch analytics" },
      { status: 500 }
    );
  }
}