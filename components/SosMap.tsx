'use client';

import { useEffect, useRef } from 'react';
import { MapContainer, Marker, Popup, TileLayer, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

export type MapPoint = {
  latitude: number;
  longitude: number;
  label: string;
  color: 'accent' | 'calm';
  updatedAt?: string;
};

const COLOR_HEX: Record<MapPoint['color'], string> = {
  accent: '#FF6B35',
  calm: '#4C8DFF',
};

// Marker chấm tròn tự vẽ bằng CSS thay vì icon pin mặc định của Leaflet (vốn
// xấu và lệch màu theme) — có vòng pulse nhẹ để trông "sống" và rõ là vị trí
// đang cập nhật realtime, không phải điểm tĩnh.
function createDotIcon(color: MapPoint['color']) {
  const hex = COLOR_HEX[color];
  return L.divIcon({
    className: '',
    html: `
      <div style="position:relative;width:22px;height:22px;">
        <div style="position:absolute;inset:-10px;border-radius:9999px;background:${hex};opacity:0.25;animation:sos-pulse 2s ease-out infinite;"></div>
        <div style="position:absolute;inset:0;border-radius:9999px;background:${hex};border:3px solid #0E1116;box-shadow:0 2px 8px rgba(0,0,0,0.4);"></div>
      </div>
    `,
    iconSize: [22, 22],
    iconAnchor: [11, 11],
  });
}

function FitToPoints({ points }: { points: MapPoint[] }) {
  const map = useMap();
  const hasFitOnce = useRef(false);

  useEffect(() => {
    if (points.length === 0) return;

    if (points.length === 1) {
      map.setView([points[0].latitude, points[0].longitude], hasFitOnce.current ? map.getZoom() : 16);
    } else {
      const bounds = L.latLngBounds(points.map((p) => [p.latitude, p.longitude] as [number, number]));
      map.fitBounds(bounds, { padding: [48, 48], maxZoom: 16 });
    }
    hasFitOnce.current = true;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [JSON.stringify(points.map((p) => [p.latitude, p.longitude]))]);

  return null;
}

export function SosMap({ points }: { points: MapPoint[] }) {
  if (points.length === 0) return null;

  return (
    <>
      <style>{`
        @keyframes sos-pulse {
          0% { transform: scale(0.6); opacity: 0.35; }
          100% { transform: scale(1.8); opacity: 0; }
        }
        .leaflet-popup-content-wrapper {
          background: #1F2430;
          color: #EDEFF2;
          border-radius: 12px;
        }
        .leaflet-popup-tip { background: #1F2430; }
        .leaflet-control-attribution {
          background: rgba(14,17,22,0.7) !important;
          color: #8890A0 !important;
        }
        .leaflet-control-attribution a { color: #8890A0 !important; }
        .leaflet-control-zoom a {
          background: #1F2430 !important;
          color: #EDEFF2 !important;
          border-color: #2A2F3B !important;
        }
      `}</style>
      <MapContainer
        center={[points[0].latitude, points[0].longitude]}
        zoom={16}
        scrollWheelZoom
        style={{ height: '100%', width: '100%', background: '#0E1116' }}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>'
          url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
          subdomains="abcd"
          maxZoom={20}
        />
        {points.map((p) => (
          <Marker key={p.label} position={[p.latitude, p.longitude]} icon={createDotIcon(p.color)}>
            <Popup>{p.label}</Popup>
          </Marker>
        ))}
        <FitToPoints points={points} />
      </MapContainer>
    </>
  );
}
