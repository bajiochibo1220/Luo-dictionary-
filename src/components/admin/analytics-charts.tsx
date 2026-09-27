"use client";

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
} from "recharts";

type Trend = { date: string; count: number };

const DEVICE_COLORS = ["#d97706", "#10b981", "#3b82f6"];

export function VisitorTrend({ data }: { data: Trend[] }) {
  return (
    <div className="bg-white rounded-xl shadow-sm border border-stone-100 p-6">
      <h3 className="text-xs uppercase tracking-wider text-stone-400 mb-4">
        Visitor Trend
      </h3>
      <ResponsiveContainer width="100%" height={240}>
        <LineChart data={data}>
          <XAxis
            dataKey="date"
            tick={{ fontSize: 11, fill: "#78716c" }}
            tickFormatter={(v) => v.slice(5)}
          />
          <YAxis tick={{ fontSize: 11, fill: "#78716c" }} />
          <Tooltip
            contentStyle={{
              borderRadius: 8,
              border: "1px solid #e7e5e4",
              fontSize: 12,
            }}
          />
          <Line
            type="monotone"
            dataKey="count"
            stroke="#d97706"
            strokeWidth={2}
            dot={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

export function DevicePie({
  data,
}: {
  data: { device: string; count: number }[];
}) {
  const filtered = data.filter((d) => d.count > 0);
  return (
    <div className="bg-white rounded-xl shadow-sm border border-stone-100 p-6">
      <h3 className="text-xs uppercase tracking-wider text-stone-400 mb-4">
        Devices
      </h3>
      {filtered.length === 0 ? (
        <p className="text-sm text-stone-400 py-12 text-center">No data yet</p>
      ) : (
        <>
          <ResponsiveContainer width="100%" height={200}>
            <PieChart>
              <Pie
                data={filtered}
                dataKey="count"
                nameKey="device"
                cx="50%"
                cy="50%"
                innerRadius={45}
                outerRadius={75}
              >
                {filtered.map((_, i) => (
                  <Cell key={i} fill={DEVICE_COLORS[i % DEVICE_COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
          <ul className="mt-4 space-y-1 text-sm">
            {filtered.map((d, i) => (
              <li key={d.device} className="flex items-center gap-2">
                <span
                  className="w-3 h-3 rounded-full"
                  style={{ background: DEVICE_COLORS[i % DEVICE_COLORS.length] }}
                />
                <span className="text-stone-700 capitalize">{d.device}</span>
                <span className="text-stone-400 ml-auto">{d.count}</span>
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}

export function TopSearches({
  data,
}: {
  data: { query: string; count: number }[];
}) {
  return (
    <div className="bg-white rounded-xl shadow-sm border border-stone-100 p-6">
      <h3 className="text-xs uppercase tracking-wider text-stone-400 mb-4">
        Top Searches
      </h3>
      {data.length === 0 ? (
        <p className="text-sm text-stone-400 py-4 text-center">No searches yet</p>
      ) : (
        <ul className="space-y-2">
          {data.map((s, i) => (
            <li key={s.query} className="flex items-center text-sm gap-3">
              <span className="text-stone-400 w-4">{i + 1}</span>
              <span className="text-stone-700 flex-1 truncate">{s.query}</span>
              <span className="text-stone-500 tabular-nums">{s.count}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export function GeoBar({
  data,
}: {
  data: { country: string; count: number }[];
}) {
  return (
    <div className="bg-white rounded-xl shadow-sm border border-stone-100 p-6">
      <h3 className="text-xs uppercase tracking-wider text-stone-400 mb-4">
        Geographic Reach
      </h3>
      {data.length === 0 ? (
        <p className="text-sm text-stone-400 py-8 text-center">No data yet</p>
      ) : (
        <ResponsiveContainer width="100%" height={220}>
          <BarChart data={data} layout="vertical">
            <XAxis type="number" tick={{ fontSize: 11, fill: "#78716c" }} />
            <YAxis
              type="category"
              dataKey="country"
              tick={{ fontSize: 11, fill: "#78716c" }}
              width={70}
            />
            <Tooltip />
            <Bar dataKey="count" fill="#d97706" radius={[0, 4, 4, 0]} />
          </BarChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}