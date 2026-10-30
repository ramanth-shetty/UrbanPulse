'use client';

import React, { useEffect, useRef, useState } from 'react';
import type { Incident } from '@/types/incident';

interface IncidentMapProps {
  incidents: Incident[];
  selectedIncident: Incident | null;
  onSelectIncident: (inc: Incident) => void;
}

export default function IncidentMap({
  incidents,
  selectedIncident,
  onSelectIncident,
}: IncidentMapProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);
  const markersLayerRef = useRef<any>(null);
  const hotspotLayerRef = useRef<any>(null);
  const [showHotspots, setShowHotspots] = useState(true);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // 1. Initialize Map on Client
  useEffect(() => {
    if (!mounted || !mapContainerRef.current) return;
    let isSubscribed = true;

    async function init() {
      const L = (await import('leaflet')).default;
      if (!isSubscribed || !mapContainerRef.current) return;

      if (!mapInstanceRef.current) {
        // Centered on Mysuru Sayyaji Rao Road / Clock Tower
        const map = L.map(mapContainerRef.current, {
          center: [12.3086, 76.6531],
          zoom: 13,
          zoomControl: false,
        });

        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
          attribution: '&copy; OpenStreetMap contributors',
          maxZoom: 19,
        }).addTo(map);

        L.control.zoom({ position: 'bottomright' }).addTo(map);

        markersLayerRef.current = L.layerGroup().addTo(map);
        hotspotLayerRef.current = L.layerGroup().addTo(map);

        mapInstanceRef.current = map;
      }
    }

    init();

    return () => {
      isSubscribed = false;
    };
  }, [mounted]);

  // 2. Render Markers and Hotspots when incidents or toggle change
  useEffect(() => {
    if (!mapInstanceRef.current || !markersLayerRef.current || !hotspotLayerRef.current) return;

    let isSubscribed = true;

    async function updatePins() {
      const L = (await import('leaflet')).default;
      if (!isSubscribed) return;

      markersLayerRef.current.clearLayers();
      hotspotLayerRef.current.clearLayers();

      for (const inc of incidents) {
        // Priority color mapping
        let pinColor = '#16A34A'; // Low: Green
        let haloColor = 'rgba(22, 163, 74, 0.2)';
        if (inc.priorityScore >= 80) {
          pinColor = '#DC2626'; // Critical: Red
          haloColor = 'rgba(220, 38, 38, 0.3)';
        } else if (inc.priorityScore >= 60) {
          pinColor = '#EA580C'; // High: Orange
          haloColor = 'rgba(234, 88, 12, 0.25)';
        } else if (inc.priorityScore >= 35) {
          pinColor = '#CA8A04'; // Medium: Gold/Yellow
          haloColor = 'rgba(202, 138, 4, 0.25)';
        }

        const isSelected = selectedIncident?.id === inc.id;
        const size = isSelected ? 38 : inc.reportCount > 1 ? 32 : 26;

        // Custom crisp SVG Pin with report count badge
        const pinHtml = `
          <div style="position: relative; width: ${size}px; height: ${size}px; cursor: pointer;">
            ${
              inc.priorityScore >= 80
                ? `<div style="position: absolute; inset: -4px; border-radius: 9999px; background: ${haloColor}; animation: pulse 1.5s infinite;"></div>`
                : ''
            }
            <div style="position: relative; width: 100%; height: 100%; background: ${pinColor}; border-radius: 9999px 9999px 9999px 0; transform: rotate(-45deg); display: flex; align-items: center; justify-content: center; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.25); border: 2px solid white;">
              <span style="transform: rotate(45deg); color: white; font-size: ${size > 30 ? '11px' : '9px'}; font-weight: 800; font-family: monospace;">
                ${inc.reportCount > 1 ? inc.reportCount : inc.priorityScore}
              </span>
            </div>
          </div>
        `;

        const icon = L.divIcon({
          className: 'priority-pin',
          html: pinHtml,
          iconSize: [size, size],
          iconAnchor: [size / 2, size],
        });

        const marker = L.marker([inc.location.lat, inc.location.lng], { icon });

        marker.on('click', () => {
          onSelectIncident(inc);
        });

        // Popup tooltip
        marker.bindPopup(`
          <div style="font-family: sans-serif; font-size: 12px; line-height: 1.4; max-width: 200px;">
            <div style="font-weight: bold; color: #0f172a; display: flex; justify-content: space-between; align-items: center;">
              <span>${inc.id}</span>
              <span style="font-size: 10px; background: ${pinColor}; color: white; padding: 1px 6px; border-radius: 4px;">P: ${inc.priorityScore}</span>
            </div>
            <div style="color: #475569; font-size: 11px; margin-top: 4px; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden;">
              ${inc.mergedSummary}
            </div>
            <div style="margin-top: 6px; font-size: 10px; color: #0284c7; font-weight: 600;">
              ${inc.reportCount} citizen report${inc.reportCount > 1 ? 's' : ''} merged
            </div>
          </div>
        `);

        markersLayerRef.current.addLayer(marker);

        // Hotspot circle layer for multi-report clusters
        if (showHotspots && inc.reportCount > 1) {
          const radius = Math.min(220, 80 + inc.reportCount * 20); // 80m to 220m
          const circle = L.circle([inc.location.lat, inc.location.lng], {
            radius,
            color: pinColor,
            fillColor: pinColor,
            fillOpacity: 0.18,
            weight: 1.5,
          });
          hotspotLayerRef.current.addLayer(circle);
        }
      }
    }

    updatePins();

    return () => {
      isSubscribed = false;
    };
  }, [incidents, selectedIncident, showHotspots]);

  // 3. Pan to selected incident
  useEffect(() => {
    if (mapInstanceRef.current && selectedIncident) {
      mapInstanceRef.current.panTo([selectedIncident.location.lat, selectedIncident.location.lng], {
        animate: true,
        duration: 0.8,
      });
    }
  }, [selectedIncident]);

  return (
    <div className="relative w-full h-full min-h-[340px] sm:min-h-[460px] rounded-md overflow-hidden border border-slate-300 bg-slate-100">
      <div ref={mapContainerRef} className="w-full h-full" style={{ minHeight: '340px' }} />

      {!mounted && (
        <div className="absolute inset-0 flex items-center justify-center bg-slate-100 text-xs text-slate-400">
          Loading Mysuru Incident Map...
        </div>
      )}

      {/* Floating Controls */}
      <div className="absolute top-3 right-3 z-10 flex flex-col gap-2">
        <button
          type="button"
          onClick={() => setShowHotspots(!showHotspots)}
          className={`px-2.5 py-1.5 rounded-md text-xs font-medium transition-colors border ${
            showHotspots
              ? 'bg-slate-900 text-white border-slate-900 font-semibold'
              : 'bg-white text-slate-800 border-slate-300 hover:bg-slate-50'
          }`}
        >
          {showHotspots ? 'Hotspots Active' : 'Hotspots Hidden'}
        </button>
      </div>

      {/* Legend */}
      <div className="absolute bottom-3 left-3 z-10 bg-white px-3 py-1.5 rounded-md text-[11px] text-slate-700 border border-slate-300 flex items-center gap-3">
        <span className="font-semibold text-slate-900">Priority:</span>
        <span className="flex items-center gap-1">
          <span className="w-2 h-2 rounded-full bg-red-600 inline-block" /> Critical (80+)
        </span>
        <span className="flex items-center gap-1">
          <span className="w-2 h-2 rounded-full bg-orange-500 inline-block" /> High (60+)
        </span>
        <span className="flex items-center gap-1">
          <span className="w-2 h-2 rounded-full bg-yellow-500 inline-block" /> Med (35+)
        </span>
        <span className="flex items-center gap-1">
          <span className="w-2 h-2 rounded-full bg-green-600 inline-block" /> Low
        </span>
      </div>
    </div>
  );
}

