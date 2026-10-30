'use client';

import React, { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import AdminSummaryCounters from '@/components/admin/AdminSummaryCounters';
import DepartmentFilter from '@/components/admin/DepartmentFilter';
import IncidentList from '@/components/admin/IncidentList';
import IncidentDetailModal from '@/components/admin/IncidentDetailModal';
import type { Incident } from '@/types/incident';
import type { IncidentStatus } from '@/types/status';

// Dynamically import Leaflet Map component with SSR disabled
const IncidentMap = dynamic(() => import('@/components/admin/IncidentMap'), {
  ssr: false,
  loading: () => (
    <div className="w-full h-[360px] sm:h-[460px] bg-slate-100 rounded-2xl flex items-center justify-center text-xs text-slate-400 border border-slate-200">
      Loading OpenStreetMap...
    </div>
  ),
});

export default function AdminDashboardPage() {
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters & selection
  const [selectedDepartment, setSelectedDepartment] = useState('all');
  const [selectedIncident, setSelectedIncident] = useState<Incident | null>(null);
  const [viewMode, setViewMode] = useState<'both' | 'map' | 'list'>('both');

  // Summary Counters
  const [counters, setCounters] = useState({
    totalOpen: 0,
    criticalCount: 0,
    reviewQueueCount: 3,
  });

  const fetchIncidents = async (dept: string = selectedDepartment) => {
    setLoading(true);
    setError(null);
    try {
      const url = dept && dept !== 'all' ? `/api/incidents?department=${dept}` : '/api/incidents';
      const res = await fetch(url);
      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to load incidents');
      }

      setIncidents(data.incidents || []);
      if (data.counters) {
        setCounters(data.counters);
      }
    } catch (err) {
      console.error('Error fetching admin incidents:', err);
      setError(err instanceof Error ? err.message : 'Error loading incidents');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchIncidents(selectedDepartment);
  }, [selectedDepartment]);

  const handleStatusUpdated = (incidentId: string, newStatus: IncidentStatus) => {
    setIncidents((prev) =>
      prev.map((inc) => (inc.id === incidentId ? { ...inc, status: newStatus } : inc))
    );
    if (selectedIncident?.id === incidentId) {
      setSelectedIncident((prev) => (prev ? { ...prev, status: newStatus } : null));
    }
  };

  return (
    <div className="space-y-4 max-w-5xl mx-auto pb-10">
      {/* 1. Header & Summary Counters */}
      <AdminSummaryCounters
        totalOpen={counters.totalOpen}
        criticalCount={counters.criticalCount}
        reviewQueueCount={counters.reviewQueueCount}
        totalIncidents={incidents.length}
      />

      {/* 2. Department Filter Row & View Switcher */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1">
        <DepartmentFilter
          selectedDepartment={selectedDepartment}
          onSelect={(dept) => setSelectedDepartment(dept)}
        />

        {/* View Mode Toggle (Mobile / Tablet) */}
        <div className="flex items-center gap-1 bg-slate-200/80 p-1 rounded-xl self-start sm:self-auto text-xs font-semibold">
          <button
            type="button"
            onClick={() => setViewMode('both')}
            className={`px-2.5 py-1 rounded-lg transition-colors hidden md:block ${
              viewMode === 'both' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Split View
          </button>
          <button
            type="button"
            onClick={() => setViewMode('map')}
            className={`px-2.5 py-1 rounded-lg transition-colors ${
              viewMode === 'map' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            🗺️ Map View
          </button>
          <button
            type="button"
            onClick={() => setViewMode('list')}
            className={`px-2.5 py-1 rounded-lg transition-colors ${
              viewMode === 'list' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            📋 Incident List ({incidents.length})
          </button>
        </div>
      </div>

      {error && (
        <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-xl">
          {error}
        </div>
      )}

      {/* 3. Main Dashboard Workspace (Map + List) */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
        {/* Map Column */}
        <div
          className={`${
            viewMode === 'list'
              ? 'hidden'
              : viewMode === 'map'
              ? 'col-span-12'
              : 'col-span-12 md:col-span-7'
          } h-[380px] sm:h-[480px] md:h-[580px]`}
        >
          <IncidentMap
            incidents={incidents}
            selectedIncident={selectedIncident}
            onSelectIncident={(inc) => setSelectedIncident(inc)}
          />
        </div>

        {/* List Column */}
        <div
          className={`${
            viewMode === 'map'
              ? 'hidden'
              : viewMode === 'list'
              ? 'col-span-12'
              : 'col-span-12 md:col-span-5'
          } space-y-2`}
        >
          <div className="flex items-center justify-between text-xs text-slate-500 font-semibold uppercase tracking-wider px-1">
            <span>Prioritized Incidents</span>
            <span className="text-[10px] text-slate-400">Sorted by Severity</span>
          </div>

          {loading ? (
            <div className="space-y-2">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="h-24 bg-slate-200/60 animate-pulse rounded-2xl" />
              ))}
            </div>
          ) : (
            <IncidentList
              incidents={incidents}
              selectedIncident={selectedIncident}
              onSelectIncident={(inc) => setSelectedIncident(inc)}
            />
          )}
        </div>
      </div>

      {/* 4. Incident Detail Modal / Drawer */}
      {selectedIncident && (
        <IncidentDetailModal
          incident={selectedIncident}
          onClose={() => setSelectedIncident(null)}
          onStatusUpdated={handleStatusUpdated}
        />
      )}
    </div>
  );
}

