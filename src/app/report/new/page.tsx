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
    <div className="h-44 w-full bg-slate-100 rounded-md flex items-center justify-center text-xs text-slate-400 border border-slate-200">
      Loading OpenStreetMap...
    </div>
  ),
});

const CATEGORIES = [
  { value: 'auto_detect', label: 'Auto-detect Category (Recommended)' },
  { value: 'water_drainage', label: 'Water / Drainage & Sewage' },
  { value: 'road_damage', label: 'Roads, Potholes & Footpaths' },
  { value: 'garbage_dump', label: 'Garbage, Waste & Sanitation' },
  { value: 'electrical_hazard', label: 'Electricity, Poles & Streetlights' },
  { value: 'park_maintenance', label: 'Parks, Trees & Public Spaces' },
  { value: 'traffic_issue', label: 'Traffic, Signals & Road Signs' },
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

      // 1. Upload photo to Firebase Storage if selected
      if (photoFile) {
        setUploadStatus('Uploading photo...');
        try {
          imageUrl = await uploadReportPhoto(photoFile);
        } catch (uploadErr) {
          console.warn('Photo upload failed or storage offline, proceeding without photo URL:', uploadErr);
        }
      }

      // 2. Submit report to server route
      setUploadStatus('Registering civic report...');
      const response = await fetch('/api/reports', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: text.trim(),
          category,
          location,
          address: address.trim() || undefined,
          imageUrl,
        }),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Failed to save complaint');
      }

      setSubmittedReport(data.report);
    } catch (err: any) {
      console.error('Submission error:', err);
      setError(err.message || 'Error submitting complaint. Please try again.');
    } finally {
      setSubmitting(false);
      setUploadStatus('');
    }
  };

  const handleReset = () => {
    setText('');
    setCategory('auto_detect');
    setPhotoFile(null);
    setPhotoPreview(null);
    setSubmittedReport(null);
    setError(null);
  };

  if (submittedReport) {
    return <ReportSuccess report={submittedReport} onReset={handleReset} />;
  }

  return (
    <div className="space-y-4 max-w-2xl mx-auto text-left">
      {/* Top Banner */}
      <div className="bg-slate-900 text-white p-4 rounded-md border border-slate-800">
        <h1 className="text-base font-bold">Report a Civic Incident</h1>
        <p className="text-xs text-slate-400 mt-0.5">
          Submit in English, Kannada, or Hindi. Complaints are analyzed and routed to municipal field units.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="bg-white rounded-md p-4 sm:p-5 border border-slate-200 space-y-4">
        {error && (
          <div className="p-3 bg-red-50 border border-red-200 text-red-800 text-xs rounded-md">
            {error}
          </div>
        )}

        {/* 1. Problem Description */}
        <div className="space-y-1">
          <div className="flex justify-between items-center">
            <label htmlFor="complaint-text" className="text-xs font-bold text-slate-700 uppercase tracking-wider">
              Issue Description <span className="text-red-500">*</span>
            </label>
            <span className="text-[10px] text-slate-400 font-mono">English / ಕನ್ನಡ / हिंदी</span>
          </div>
          <textarea
            id="complaint-text"
            rows={3}
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Describe the issue (e.g. Blocked drain overflowing onto road, deep pothole near hospital gate, sparking wire)..."
            className="w-full text-xs sm:text-sm px-3 py-2 rounded-md border border-slate-300 placeholder-slate-400 focus:outline-hidden focus:border-slate-800 resize-none"
            maxLength={1000}
            required
          />
          <div className="flex justify-between text-[11px] text-slate-400">
            <span>Specify physical hazard or obstruction</span>
            <span>{text.length}/1000</span>
          </div>
        </div>

        {/* 2. Photo Attachment */}
        <div className="space-y-1">
          <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block">
            Photo Attachment (Optional)
          </label>

          {photoPreview ? (
            <div className="relative rounded-md overflow-hidden border border-slate-200 bg-slate-900">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={photoPreview}
                alt="Complaint preview"
                className="w-full h-36 object-cover object-center"
              />
              <button
                type="button"
                onClick={handleRemovePhoto}
                className="absolute top-2 right-2 bg-slate-900/90 text-white rounded px-2 py-1 text-xs transition-colors hover:bg-red-600"
              >
                Remove
              </button>
            </div>
          ) : (
            <label className="flex flex-col items-center justify-center w-full h-20 border border-dashed border-slate-300 hover:border-slate-500 rounded-md cursor-pointer bg-slate-50/50 hover:bg-slate-50 transition-colors">
              <span className="text-xs font-medium text-slate-700">Attach Photo (JPG, PNG up to 8MB)</span>
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
        <div className="space-y-1">
          <label htmlFor="category-select" className="text-xs font-bold text-slate-700 uppercase tracking-wider block">
            Category
          </label>
          <div className="relative">
            <select
              id="category-select"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full text-xs sm:text-sm px-3 py-2 rounded-md border border-slate-300 bg-white text-slate-800 appearance-none focus:outline-hidden focus:border-slate-800 cursor-pointer pr-10 font-medium"
            >
              {CATEGORIES.map((c) => (
                <option key={c.value} value={c.value}>
                  {c.label}
                </option>
              ))}
            </select>
          </div>
          {category === 'auto_detect' && (
            <p className="text-[11px] text-slate-500">
              Department routing and category are determined automatically from description content.
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
            className="w-full bg-slate-900 hover:bg-slate-800 text-white font-semibold py-2.5 px-4 rounded-md transition-colors disabled:opacity-50 text-xs sm:text-sm"
          >
            {submitting ? uploadStatus || 'Submitting...' : 'Submit Incident Report'}
          </button>
        </div>

        <div className="text-center pt-1">
          <span className="text-[10px] text-slate-400">
            For critical life safety emergencies, contact 112 directly.
          </span>
        </div>
      </form>
    </div>
  );
}
