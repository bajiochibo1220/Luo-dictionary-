"use client";

import { useState } from "react";
import Link from "next/link";
import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import L from "leaflet";

delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl:
    "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
});

type Site = {
  id: string;
  title: string;
  tags: string[];
  data: {
    description?: string;
    county?: string;
    latitude?: number;
    longitude?: number;
    history?: string;
    visiting_info?: string;
  };
  media: { url: string; type: string; thumbnailUrl?: string | null }[];
};

const KENYA_CENTER: [number, number] = [-0.4, 34.5];

export function SitesMap({
  sites,
  langCode,
}: {
  sites: Site[];
  langCode: string;
}) {
  const [filter, setFilter] = useState<string>("");

  const sitesWithCoords = sites.filter(
    (s) => s.data.latitude && s.data.longitude
  );

  const counties = Array.from(
    new Set(sites.map((s) => s.data.county).filter(Boolean))
  ) as string[];

  const filtered = filter
    ? sitesWithCoords.filter((s) => s.data.county === filter)
    : sitesWithCoords;

  if (sites.length === 0) {
    return (
      <div className="text-center py-16 text-stone-400">
        <p className="text-lg">No heritage sites published yet</p>
        <p className="text-sm mt-2">
          Sites are being documented across Luo regions
        </p>
      </div>
    );
  }

  return (
    <div>
      {/* Filter */}
      {counties.length > 0 && (
        <div className="mb-6 flex flex-wrap gap-2">
          <button
            onClick={() => setFilter("")}
            className={`text-xs px-3 py-1.5 rounded-full transition ${
              filter === ""
                ? "bg-amber-600 text-white"
                : "bg-white text-stone-600 border border-stone-200 hover:border-amber-400"
            }`}
          >
            All sites
          </button>
          {counties.map((c) => (
            <button
              key={c}
              onClick={() => setFilter(c)}
              className={`text-xs px-3 py-1.5 rounded-full transition ${
                filter === c
                  ? "bg-amber-600 text-white"
                  : "bg-white text-stone-600 border border-stone-200 hover:border-amber-400"
              }`}
            >
              {c}
            </button>
          ))}
        </div>
      )}

      {/* Map */}
      <div className="rounded-xl overflow-hidden shadow-sm border border-stone-200 mb-8">
        <MapContainer
          center={KENYA_CENTER}
          zoom={7}
          style={{ height: "500px", width: "100%" }}
          scrollWheelZoom={true}
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          {filtered.map((s) => (
            <Marker
              key={s.id}
              position={[s.data.latitude!, s.data.longitude!]}
            >
              <Popup>
                <div className="min-w-[180px]">
                  <p className="font-serif text-base text-stone-800 mb-1">
                    {s.title}
                  </p>
                  {s.data.county && (
                    <p className="text-xs text-stone-500 mb-2">
                      {s.data.county}
                    </p>
                  )}
                  <Link
                    href={`/${langCode}/piny-luo/${s.id}`}
                    className="text-xs text-amber-600 hover:underline"
                  >
                    View details →
                  </Link>
                </div>
              </Popup>
            </Marker>
          ))}
        </MapContainer>
      </div>

      {/* List */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filtered.map((s) => {
          const img = s.media.find((m) => m.type === "image");
          return (
            <Link
              key={s.id}
              href={`/${langCode}/piny-luo/${s.id}`}
              className="group bg-white rounded-lg shadow-sm hover:shadow-lg transition border border-stone-100 hover:border-amber-300 overflow-hidden"
            >
              {img && (
                <div className="aspect-video bg-stone-100 overflow-hidden">
                  <img
                    src={img.thumbnailUrl || img.url}
                    alt={s.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition"
                  />
                </div>
              )}
              <div className="p-4">
                <h3 className="font-serif text-lg text-stone-800 mb-1">
                  {s.title}
                </h3>
                {s.data.county && (
                  <p className="text-xs text-stone-500">{s.data.county}</p>
                )}
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}