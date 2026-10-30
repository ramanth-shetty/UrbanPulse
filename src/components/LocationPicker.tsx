'use client';

import React, { useEffect, useState, useRef } from 'react';
import type { GeoLocation } from '@/types/report';

interface LocationPickerProps {
  location: GeoLocation;
  onChange: (loc: GeoLocation) => void;
  address: string;
  onAddressChange: (addr: string) => void;
}

// Default center: Sayyaji Rao Road / Clock Tower, Mysuru
const DEFAULT_MYSURU: GeoLocation = {
  lat: 12.3086,
  lng: 76.6531,
};

export default function LocationPicker({
  location,
  onChange,
  address,
  onAddressChange,
}: LocationPickerProps) {
  const [geoLoading, setGeoLoading] = useState(false);
  const [geoError, setGeoError] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);
  const markerRef = useRef<any>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Initialize Leaflet dynamically on client-side only
  useEffect(() => {
    if (!mounted || !mapContainerRef.current) return;

    let isSubscribed = true;

    async function initMap() {
      const L = (await import('leaflet')).default;
      if (!isSubscribed || !mapContainerRef.current) return;

      if (!mapInstanceRef.current) {
        const map = L.map(mapContainerRef.current, {
          center: [location.lat || DEFAULT_MYSURU.lat, location.lng || DEFAULT_MYSURU.lng],
          zoom: 15,
          zoomControl: false,
        });

        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
          attribution: '&copy; OpenStreetMap contributors',
          maxZoom: 19,
        }).addTo(map);

        L.control.zoom({ position: 'bottomright' }).addTo(map);

        // Custom SVG Pin Icon for high-res crisp display
        const pinIcon = L.divIcon({
          className: 'custom-pin-marker',
          html: `
            <div style="transform: translate(-50%, -100%);">
              <svg width="34" height="42" viewBox="0 0 34 42" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M17 0C7.61116 0 0 7.61116 0 17C0 27.5 17 42 17 42C17 42 34 27.5 34 17C34 7.61116 26.3888 0 17 0Z" fill="#DC2626"/>
                <circle cx="17" cy="17" r="7" fill="white"/>
              </svg>
            </div>
          `,
          iconSize: [34, 42],
          iconAnchor: [17, 42],
        });

        const marker = L.marker([location.lat || DEFAULT_MYSURU.lat, location.lng || DEFAULT_MYSURU.lng], {
          icon: pinIcon,
          draggable: true,
        }).addTo(map);

        marker.on('dragend', () => {
          const latLng = marker.getLatLng();
          onChange({ lat: Number(latLng.lat.toFixed(5)), lng: Number(latLng.lng.toFixed(5)) });
        });

        map.on('click', (e: any) => {
          const latLng = e.latlng;
          marker.setLatLng(latLng);
          onChange({ lat: Number(latLng.lat.toFixed(5)), lng: Number(latLng.lng.toFixed(5)) });
        });

        mapInstanceRef.current = map;
        markerRef.current = marker;
      }
    }

    initMap();

    return () => {
      isSubscribed = false;
    };
  }, [mounted]);

  // Sync marker position when external location changes
  useEffect(() => {
    if (markerRef.current && location.lat && location.lng) {
      markerRef.current.setLatLng([location.lat, location.lng]);
      if (mapInstanceRef.current) {
        mapInstanceRef.current.panTo([location.lat, location.lng]);
      }
    }
  }, [location.lat, location.lng]);

  const handleGetCurrentLocation = () => {
    if (!navigator.geolocation) {
      setGeoError('Geolocation is not supported by your browser.');
      return;
    }

    setGeoLoading(true);
    setGeoError(null);

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const newLoc = {
          lat: Number(pos.coords.latitude.toFixed(5)),
          lng: Number(pos.coords.longitude.toFixed(5)),
        };
        onChange(newLoc);
        setGeoLoading(false);
      },
      (err) => {
        setGeoError(
          err.code === 1
            ? 'Permission denied. Please tap on the map to set location.'
            : 'Could not fetch current GPS. Please tap on map.'
        );
        setGeoLoading(false);
      },
      { enableHighAccuracy: true, timeout: 8000 }
    );
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <label className="text-xs font-semibold text-slate-700 uppercase tracking-wider">
          Location Pin & Address <span className="text-red-500">*</span>
        </label>
        <button
          type="button"
          onClick={handleGetCurrentLocation}
          disabled={geoLoading}
          className="inline-flex items-center gap-1.5 text-xs font-medium text-emerald-700 bg-emerald-50 hover:bg-emerald-100 px-2.5 py-1 rounded-md border border-emerald-200 transition-colors disabled:opacity-50"
        >
          {geoLoading ? (
            <>
              <span className="w-3 h-3 border-2 border-emerald-600 border-t-transparent rounded-full animate-spin" />
              Locating...
            </>
          ) : (
            <>
              <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10" />
                <polygon points="12 8 8 16 16 12 12 8" />
              </svg>
              Use My Location
            </>
          )}
        </button>
      </div>

      {/* Map View */}
      <div className="relative rounded-xl overflow-hidden border border-slate-300 shadow-inner bg-slate-100">
        <div
          ref={mapContainerRef}
          className="w-full h-44 z-0"
          style={{ minHeight: '176px' }}
        />
        {!mounted && (
          <div className="absolute inset-0 flex items-center justify-center bg-slate-100 text-xs text-slate-400">
            Loading OpenStreetMap...
          </div>
        )}
        <div className="absolute bottom-1.5 left-2 z-10 bg-white/90 backdrop-blur px-2 py-0.5 rounded text-[10px] font-mono text-slate-600 shadow-sm border border-slate-200">
          📍 {location.lat.toFixed(4)}, {location.lng.toFixed(4)}
        </div>
      </div>

      <div className="text-[11px] text-slate-500 flex justify-between items-center">
        <span>Tap map or drag pin to adjust coordinates</span>
      </div>

      {geoError && (
        <p className="text-xs text-amber-700 bg-amber-50 p-2 rounded-lg border border-amber-200">
          {geoError}
        </p>
      )}

      {/* Street / Landmark input */}
      <div className="pt-1">
        <input
          type="text"
          value={address}
          onChange={(e) => onAddressChange(e.target.value)}
          placeholder="Street name, landmark or area (e.g. Sayyaji Rao Rd, near Clock Tower)"
          className="w-full text-xs px-3 py-2 rounded-lg border border-slate-300 bg-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
        />
      </div>
    </div>
  );
}

