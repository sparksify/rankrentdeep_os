"use client";

import { MapContainer, TileLayer, CircleMarker, Popup, Tooltip } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import type { RenterMarket } from "@/lib/queries";

export function RentersMap({ markets, focusId }: { markets: RenterMarket[]; focusId: string | null }) {
  const focused = markets.find((m) => m.candidate.id === focusId) ?? markets[0];

  const center: [number, number] = focused?.place?.latitude
    ? [focused.place.latitude, focused.place.longitude ?? 0]
    : [39.8283, -98.5795];

  return (
    <MapContainer
      center={center}
      zoom={focused ? 11 : 4}
      scrollWheelZoom
      style={{ height: "100%", width: "100%" }}
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      {markets.map((m) => {
        if (!m.place?.latitude) return null;
        return (
          <CircleMarker
            key={m.candidate.id}
            center={[m.place.latitude, m.place.longitude ?? 0]}
            radius={m.candidate.id === focusId ? 10 : 6}
            pathOptions={{ color: "#4f8cff", fillColor: "#4f8cff", fillOpacity: 0.6 }}
          >
            <Tooltip>
              {m.place.canonical_name} — {m.businesses.length} businesses
            </Tooltip>
          </CircleMarker>
        );
      })}
      {focused?.businesses.map((b) => {
        if (!b.latitude || !b.longitude) return null;
        return (
          <CircleMarker
            key={b.id}
            center={[b.latitude, b.longitude]}
            radius={5}
            pathOptions={{ color: "#f59e0b", fillColor: "#f59e0b", fillOpacity: 0.7 }}
          >
            <Popup>
              <div className="text-sm">
                <div className="font-semibold">{b.name}</div>
                <div>{b.address}</div>
                {b.rating != null && <div>★ {b.rating.toFixed(1)} ({b.review_count} reviews)</div>}
                {b.website && (
                  <a href={b.website} target="_blank" rel="noreferrer" className="text-blue-400 underline">
                    website
                  </a>
                )}
              </div>
            </Popup>
          </CircleMarker>
        );
      })}
    </MapContainer>
  );
}
