'use client';

import React, { useState } from 'react';
import dynamic from 'next/dynamic';
import { uploadReportPhoto } from '@/lib/storage';
import ReportSuccess from '@/components/ReportSuccess';
import type { GeoLocation, Report } from '@/types/report';

// Dynamic import with SSR disabled for Leaflet map
const LocationPicker = dynamic(() => import('@/components/LocationPicker'), {
  ssr: false,
  loading: () => (
    <div className="h-44 w-full bg-slate-100 rounded-xl flex items-center justify-center text-xs text-slate-400 border border-slate-200">
      Loading OpenStreetMap...
    </div>
  ),
});

const CATEGORIES = [
  { value: 'auto_detect', label: '✨ Auto-detect with AI (Recommended)' },
  { value: 'water_drainage', label: '💧 Water / Drainage & Sewage' },
  { value: 'road_damage', label: '🚧 Roads, Potholes & Footpaths' },
  { value: 'garbage_dump', label: '🗑️ Garbage, Waste & Sanitation' },
  { value: 'electrical_hazard', label: '⚡ Electricity, Poles & Streetlights' },
  { value: 'park_maintenance', label: '🌳 Parks, Trees & Public Spaces' },
  { value: 'traffic_issue', label: '🚦 Traffic, Signals & Road Signs' },
];

export default function NewReportPage() {
  const [text, setText] = useState('');
  const [category, setCategory] = useState('auto_detect');
  const [location, setLocation] = useState<GeoLocation>({
    lat: 12.3086, // Mysuru Clock Tower / Sayyaji Rao Rd
    lng: 76.6531,
  });
  const [address, setAddress] = useState('');

  // Image upload state
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);

  // Form submission state
  const [submitting, setSubmitting] = useState(false);
  const [uploadStatus, setUploadStatus] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const [submittedReport, setSubmittedReport] = useState<Report | null>(null);

  const handlePhotoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setError('Please select an image file (JPG, PNG, WebP).');
      return;
    }

    if (file.size > 8 * 1024 * 1024) {
      setError('Photo size must be less than 8MB.');
      return;
    }

    setError(null);
    setPhotoFile(file);
    const reader = new FileReader();
    reader.onload = (event) => {
      setPhotoPreview(event.target?.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleRemovePhoto = () => {
    setPhotoFile(null);
    setPhotoPreview(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Basic Validation
    if (!text.trim()) {
      setError('Please describe the problem you observed.');
      return;
    }

    if (text.trim().length < 5) {
      setError('Please provide at least a few words describing the issue.');
      return;
    }

    if (!location.lat || !location.lng) {
      setError('Please pinpoint the location on the map.');
      return;
    }

    setSubmitting(true);
    setUploadStatus('Saving report...');

    try {
      let imageUrl: string | null = null;

      // 1. Photo upload to Firebase Storage if attached
      if (photoFile) {
        setUploadStatus('Uploading photo to storage...');
        try {
          const tempId = `temp_${Date.now()}`;
          imageUrl = await uploadReportPhoto(photoFile, tempId);
        } catch (storageErr) {
          console.warn('Storage upload failed, proceeding with report metadata:', storageErr);
          // If storage fails or is unconfigured in demo, proceed gracefully
        }
      }

      // 2. Submit to Server API Route
      setUploadStatus('Logging complaint into civic queue...');
      const res = await fetch('/api/reports', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: text.trim(),
          category,
          location,
          address: address.trim(),
          imageUrl,
        }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to submit report. Please try again.');
      }

      setSubmittedReport(data.report);
    } catch (err) {
      console.error('Submission error:', err);
      setError(err instanceof Error ? err.message : 'Submission failed. Please check network.');
    } finally {
      setSubmitting(false);
      setUploadStatus('');
    }
  };

  const handleReset = () => {
    setText('');
    setCategory('auto_detect');
    setLocation({ lat: 12.3086, lng: 76.6531 });
    setAddress('');
    setPhotoFile(null);
    setPhotoPreview(null);
    setSubmittedReport(null);
    setError(null);
  };

  if (submittedReport) {
    return <ReportSuccess report={submittedReport} onReset={handleReset} />;
  }

  return (
    <div className="space-y-4">
      {/* Top Banner / Progress Indicator */}
      <div className="bg-gradient-to-r from-emerald-600 to-teal-700 text-white p-4 rounded-2xl shadow-sm">
        <h1 className="text-lg font-bold">Report a Civic Issue</h1>
        <p className="text-xs text-emerald-100 mt-0.5">
          Takes under a minute. Submit in English, Kannada, or Hindi.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="bg-white rounded-2xl p-4 sm:p-5 shadow-sm border border-slate-200 space-y-4">
        {error && (
          <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-xl flex items-start gap-2">
            <span className="font-bold text-sm leading-none">⚠️</span>
            <span>{error}</span>
          </div>
        )}

        {/* 1. Problem Description */}
        <div className="space-y-1.5">
          <div className="flex justify-between items-center">
            <label htmlFor="complaint-text" className="text-xs font-semibold text-slate-700 uppercase tracking-wider">
              Issue Description <span className="text-red-500">*</span>
            </label>
            <span className="text-[10px] text-slate-400 font-medium">English / ಕನ್ನಡ / हिंदी</span>
          </div>
          <textarea
            id="complaint-text"
            rows={3}
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="What is wrong? E.g. Blocked drain overflowing on road, large pothole near hospital gate, live sparking wire..."
            className="w-full text-sm px-3.5 py-2.5 rounded-xl border border-slate-300 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 resize-none transition-shadow"
            maxLength={1000}
            required
          />
          <div className="flex justify-between text-[11px] text-slate-400">
            <span>Be specific about hazards or blockages</span>
            <span>{text.length}/1000</span>
          </div>
        </div>

        {/* 2. Photo Attachment */}
        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-slate-700 uppercase tracking-wider block">
            Photo (Optional, Recommended)
          </label>

          {photoPreview ? (
            <div className="relative rounded-xl overflow-hidden border border-slate-200 bg-slate-900 group">
              <img
                src={photoPreview}
                alt="Complaint preview"
                className="w-full h-36 object-cover object-center"
              />
              <button
                type="button"
                onClick={handleRemovePhoto}
                className="absolute top-2 right-2 bg-slate-900/80 hover:bg-red-600 text-white rounded-full p-1.5 text-xs backdrop-blur transition-colors"
                title="Remove photo"
              >
                ✕ Remove
              </button>
            </div>
          ) : (
            <label className="flex flex-col items-center justify-center w-full h-24 border-2 border-dashed border-slate-300 hover:border-emerald-500 rounded-xl cursor-pointer bg-slate-50/60 hover:bg-emerald-50/30 transition-colors">
              <div className="flex items-center gap-2 text-slate-500">
                <svg className="w-5 h-5 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z"
                  />
                  <circle cx="12" cy="13" r="3" />
                </svg>
                <span className="text-xs font-medium text-slate-700">Take Photo or Choose File</span>
              </div>
              <span className="text-[10px] text-slate-400 mt-0.5">JPG, PNG up to 8MB</span>
              <input
                type="file"
                accept="image/*"
                capture="environment"
                onChange={handlePhotoSelect}
                className="hidden"
              />
            </label>
          )}
        </div>

        {/* 3. Category Dropdown with Auto-detect */}
        <div className="space-y-1.5">
          <label htmlFor="category-select" className="text-xs font-semibold text-slate-700 uppercase tracking-wider block">
            Category
          </label>
          <div className="relative">
            <select
              id="category-select"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full text-xs sm:text-sm px-3.5 py-2.5 rounded-xl border border-slate-300 bg-white text-slate-800 appearance-none focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 cursor-pointer pr-10 font-medium"
            >
              {CATEGORIES.map((c) => (
                <option key={c.value} value={c.value}>
                  {c.label}
                </option>
              ))}
            </select>
            <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 text-slate-400">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
              </svg>
            </div>
          </div>
          {category === 'auto_detect' && (
            <p className="text-[11px] text-emerald-700">
              ⚡ AI will classify category & route to the correct civic department upon submission.
            </p>
          )}
        </div>

        {/* 4. Location Picker (Map Pin, GPS, Manual Address) */}
        <LocationPicker
          location={location}
          onChange={setLocation}
          address={address}
          onAddressChange={setAddress}
        />

        {/* 5. Submit Button */}
        <div className="pt-2">
          <button
            type="submit"
            disabled={submitting}
            className="w-full bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white font-semibold py-3 px-4 rounded-xl shadow-md transition-all disabled:opacity-50 text-sm flex items-center justify-center gap-2"
          >
            {submitting ? (
              <>
                <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                <span>{uploadStatus || 'Submitting...'}</span>
              </>
            ) : (
              <>
                <span>Submit Complaint</span>
                <span className="text-emerald-200">→</span>
              </>
            )}
          </button>
        </div>

        <div className="text-center pt-1">
          <span className="text-[10px] text-slate-400">
            Emergency life hazard? Also call 112 or Mysuru City Police helpline.
          </span>
        </div>
      </form>
    </div>
  );
}

