"use client";

import { useEffect, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import type { LatLng } from "@/lib/geo";

export type MapDriver = { id: string; lat: number; lng: number; label: string; selected?: boolean };

type Props = {
  /** Points à garder visibles (départ, destination, taxi choisi). */
  focus: LatLng[];
  user?: LatLng | null;
  dest?: LatLng | null;
  /** Textes affichés au-dessus des repères de départ et de destination. */
  userLabel?: string;
  destLabel?: string;
  drivers: MapDriver[];
  onSelect?: (id: string) => void;
  /** Hauteur (en px) masquée en bas par la feuille de réservation. */
  bottomPad?: number;
};

const CAR_SVG =
  '<svg viewBox="0 0 24 24" width="17" height="17" aria-hidden="true"><path d="M5 11l1.5-4.5A2 2 0 0 1 8.4 5h7.2a2 2 0 0 1 1.9 1.5L19 11v6h-2v-1.5H7V17H5v-6z" fill="currentColor"/><circle cx="8" cy="13.4" r="1.2" fill="#0f7a43"/><circle cx="16" cy="13.4" r="1.2" fill="#0f7a43"/></svg>';

const esc = (s: string) => s.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c] ?? c);

export default function TaxiMap({ focus, user, dest, userLabel, destLabel, drivers, onSelect, bottomPad = 0 }: Props) {
  const el = useRef<HTMLDivElement>(null);
  const map = useRef<L.Map | null>(null);
  const layer = useRef<L.LayerGroup | null>(null);
  const onSelectRef = useRef(onSelect);
  onSelectRef.current = onSelect;

  const first = focus[0] ?? { lat: 11.5886, lng: 43.145 };
  const focusKey = JSON.stringify(focus.map((p) => [Number(p.lat.toFixed(5)), Number(p.lng.toFixed(5))]));
  const pad = Math.round(bottomPad / 40) * 40;

  useEffect(() => {
    if (!el.current || map.current) return;
    const m = L.map(el.current, { zoomControl: false }).setView([first.lat, first.lng], 14);
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
    const m = map.current;
    if (!m || focus.length === 0) return;
    const bounds = L.latLngBounds(focus.map((p) => [p.lat, p.lng] as [number, number]));
    m.fitBounds(bounds, {
      paddingTopLeft: [28, 76],
      paddingBottomRight: [28, pad + 24],
      maxZoom: 15,
      animate: true,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [focusKey, pad]);

  useEffect(() => {
    const g = layer.current;
    if (!g) return;
    g.clearLayers();
    if (user && dest) {
      L.polyline(
        [
          [user.lat, user.lng],
          [dest.lat, dest.lng],
        ],
        { color: "#0f7a43", weight: 3, opacity: 0.7, dashArray: "6 8", interactive: false },
      ).addTo(g);
    }
    if (user) {
      L.marker([user.lat, user.lng], {
        icon: L.divIcon({ className: "", html: `<div class="tx-user"></div>${userLabel ? `<span class="tx-tag">${esc(userLabel)}</span>` : ""}`, iconSize: [16, 16], iconAnchor: [8, 8] }),
        interactive: false,
      }).addTo(g);
    }
    if (dest) {
      L.marker([dest.lat, dest.lng], {
        icon: L.divIcon({ className: "", html: `<div class="tx-dest"></div>${destLabel ? `<span class="tx-tag">${esc(destLabel)}</span>` : ""}`, iconSize: [18, 18], iconAnchor: [9, 9] }),
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
        zIndexOffset: d.selected ? 1000 : 0,
      });
      marker.bindTooltip(d.label, { direction: "top", offset: [0, -14] });
      marker.on("click", () => onSelectRef.current?.(d.id));
      marker.addTo(g);
    }
  }, [drivers, user, dest, userLabel, destLabel]);

  return <div ref={el} dir="ltr" className="h-full w-full" />;
}
