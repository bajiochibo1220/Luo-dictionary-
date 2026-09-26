"use client";

import { useEffect } from "react";
import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import L from "leaflet";

// Fix default marker icon paths in Next.js
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl:
    "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
});

export function LocationMap({
  latitude,
  longitude,
  label,
  zoom = 11,
}: {
  latitude: number;
  longitude: number;
  label: string;
  zoom?: number;
}) {
  useEffect(() => {
    // Leaflet needs a moment after mount in dynamic imports
  }, []);

  return (
    <div className="rounded-xl overflow-hidden shadow-sm border border-stone-200">
      <MapContainer
        center={[latitude, longitude]}
        zoom={zoom}
        style={{ height: "320px", width: "100%" }}
        scrollWheelZoom={false}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <Marker position={[latitude, longitude]}>
          <Popup>{label}</Popup>
        </Marker>
      </MapContainer>
    </div>
  );
}