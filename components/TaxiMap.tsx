"use client";

import { useEffect, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import type { LatLng } from "@/lib/geo";

export type MapDriver = { id: string; lat: number; lng: number; label: string; selected?: boolean };

type Props = {
  center: LatLng;
  user?: LatLng | null;
  dest?: LatLng | null;
  drivers: MapDriver[];
  onSelect?: (id: string) => void;
};

const CAR_SVG =
  '<svg viewBox="0 0 24 24" width="17" height="17" aria-hidden="true"><path d="M5 11l1.5-4.5A2 2 0 0 1 8.4 5h7.2a2 2 0 0 1 1.9 1.5L19 11v6h-2v-1.5H7V17H5v-6z" fill="currentColor"/><circle cx="8" cy="13.4" r="1.2" fill="#fff"/><circle cx="16" cy="13.4" r="1.2" fill="#fff"/></svg>';

export default function TaxiMap({ center, user, dest, drivers, onSelect }: Props) {
  const el = useRef<HTMLDivElement>(null);
  const map = useRef<L.Map | null>(null);
  const layer = useRef<L.LayerGroup | null>(null);
  const onSelectRef = useRef(onSelect);
  onSelectRef.current = onSelect;

  useEffect(() => {
    if (!el.current || map.current) return;
    const m = L.map(el.current, { zoomControl: false }).setView([center.lat, center.lng], 14);
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      maxZoom: 19,
      attribution: "© OpenStreetMap",
    }).addTo(m);
    L.control.zoom({ position: "topright" }).addTo(m);
    layer.current = L.layerGroup().addTo(m);
    map.current = m;
    return () => {
      m.remove();
      map.current = null;
      layer.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    map.current?.setView([center.lat, center.lng], map.current.getZoom());
  }, [center.lat, center.lng]);

  useEffect(() => {
    const g = layer.current;
    if (!g) return;
    g.clearLayers();
    if (user) {
      L.marker([user.lat, user.lng], {
        icon: L.divIcon({ className: "", html: '<div class="tx-user"></div>', iconSize: [16, 16], iconAnchor: [8, 8] }),
        interactive: false,
      }).addTo(g);
    }
    if (dest) {
      L.marker([dest.lat, dest.lng], {
        icon: L.divIcon({ className: "", html: '<div class="tx-dest"></div>', iconSize: [18, 18], iconAnchor: [9, 9] }),
        interactive: false,
      }).addTo(g);
    }
    for (const d of drivers) {
      const marker = L.marker([d.lat, d.lng], {
        icon: L.divIcon({
          className: "",
          html: `<div class="tx-pin ${d.selected ? "tx-pin--on" : ""}">${CAR_SVG}</div>`,
          iconSize: [34, 34],
          iconAnchor: [17, 17],
        }),
        keyboard: false,
      });
      marker.bindTooltip(d.label, { direction: "top", offset: [0, -14] });
      marker.on("click", () => onSelectRef.current?.(d.id));
      marker.addTo(g);
    }
  }, [drivers, user, dest]);

  return <div ref={el} dir="ltr" className="h-full w-full" />;
}
