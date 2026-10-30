'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import FactorBreakdownBars from '@/components/admin/FactorBreakdownBars';
import PriorityComparison from '@/components/admin/PriorityComparison';
import LinkedReportCard from '@/components/admin/LinkedReportCard';
import { MOCKED_CREWS } from '@/lib/mockedCrews';
import type { Incident } from '@/types/incident';
import type { Report } from '@/types/report';
import type { IncidentStatus, StatusHistoryEntry } from '@/types/status';
import type { Department } from '@/types/department';

const STATUS_OPTIONS: { value: IncidentStatus; label: string; color: string }[] = [
  { value: 'new', label: 'New', color: 'bg-slate-100 text-slate-800 border-slate-300' },
  { value: 'under_review', label: 'Under Review', color: 'bg-amber-100 text-amber-800 border-amber-300' },
  { value: 'assigned', label: 'Assigned', color: 'bg-indigo-100 text-indigo-800 border-indigo-300' },
  { value: 'in_progress', label: 'In Progress', color: 'bg-blue-100 text-blue-800 border-blue-300' },
  { value: 'resolved', label: 'Resolved', color: 'bg-emerald-100 text-emerald-800 border-emerald-300' },
  { value: 'reopened', label: 'Reopened (Disputed)', color: 'bg-rose-100 text-rose-800 border-rose-300' },
  { value: 'citizen_verified', label: 'Citizen Verified', color: 'bg-teal-100 text-teal-800 border-teal-300' },
];

const DEPARTMENTS: { id: Department; label: string }[] = [
  { id: 'water_drainage', label: 'Water & Drainage' },
  { id: 'roads', label: 'Roads & Pavement' },
  { id: 'sanitation', label: 'Sanitation' },
  { id: 'electricity', label: 'Electricity / CESC' },
  { id: 'parks', label: 'Parks & Trees' },
  { id: 'traffic', label: 'Traffic & Signage' },
];

export default function IncidentDetailPage() {
  const params = useParams();
  const id = params?.id as string;

  const [incident, setIncident] = useState<Incident | null>(null);
  const [memberReports, setMemberReports] = useState<Report[]>([]);
  const [allIncidents, setAllIncidents] = useState<Incident[]>([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Assignment controls
  const [selectedDept, setSelectedDept] = useState<Department>('roads');
  const [selectedCrew, setSelectedCrew] = useState<string>('');
  const [customNote, setCustomNote] = useState('');
  const [mockedNotification, setMockedNotification] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;

    async function loadData() {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(`/api/incidents/${id}`);
        const data = await res.json();

        if (!res.ok || !data.success) {
          throw new Error(data.error || 'Failed to load incident');
        }

        const inc: Incident = data.incident;
        setIncident(inc);
        setMemberReports(data.memberReports || []);

        const initialDept = inc.assignedDepartment || inc.leadDepartment || 'roads';
        setSelectedDept(initialDept);
        const crewList = MOCKED_CREWS[initialDept] || [];
        setSelectedCrew(inc.assignedCrew || crewList[0] || '');

        // Fetch all incidents for ranking comparison
        const allRes = await fetch('/api/incidents');
        const allData = await allRes.json();
        if (allData.success) {
          setAllIncidents(allData.incidents || []);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Error loading details');
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, [id]);

  // When selected department changes, pick its first mocked crew
  const handleDeptChange = (dept: Department) => {
    setSelectedDept(dept);
    const crews = MOCKED_CREWS[dept] || [];
    setSelectedCrew(crews[0] || '');
  };

  const handleUpdateStatusAndCrew = async (
    targetStatus: IncidentStatus,
    targetDept?: Department,
    targetCrew?: string,
    overrideNote?: string
  ) => {
    if (!incident) return;
    setUpdating(true);
    setMockedNotification(null);

    const deptToAssign = targetDept || selectedDept;
    const crewToAssign = targetCrew !== undefined ? targetCrew : selectedCrew;

    try {
      const res = await fetch(`/api/incidents/${incident.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: targetStatus,
          assignedDepartment: deptToAssign,
          assignedCrew: crewToAssign,
          note: overrideNote || customNote || undefined,
        }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        const newHistoryEntry: StatusHistoryEntry = data.historyEntry || {
          status: targetStatus,
          timestamp: new Date().toISOString(),
          actor: 'admin',
          note: customNote || `Updated status to ${targetStatus}`,
        };

        setIncident((prev) =>
          prev
            ? {
                ...prev,
                status: targetStatus,
                assignedDepartment: deptToAssign,
                assignedCrew: crewToAssign,
                statusHistory: [...(prev.statusHistory || []), newHistoryEntry],
              }
            : null
        );

        if (data.mockedNotification) {
          setMockedNotification(data.mockedNotification);
        }
        setCustomNote('');
      } else {
        alert(data.error || 'Failed to update incident');
      }
    } catch (err) {
      console.error('Status update failed:', err);
      alert('Network error updating status');
    } finally {
      setUpdating(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-4 max-w-4xl mx-auto py-6">
        <div className="h-8 w-48 bg-slate-200 animate-pulse rounded-md" />
        <div className="h-32 bg-slate-200 animate-pulse rounded-md" />
        <div className="h-64 bg-slate-200 animate-pulse rounded-md" />
      </div>
    );
  }

  if (error || !incident) {
    return (
      <div className="bg-white rounded-md p-8 border border-slate-200 text-center space-y-4 max-w-md mx-auto my-12">
        <div className="text-sm font-mono text-slate-400 uppercase tracking-widest">[Alert]</div>
        <div className="text-base font-bold text-slate-800">Incident Not Found</div>
        <p className="text-xs text-slate-500">{error || 'Could not locate the requested incident.'}</p>
        <Link
          href="/admin"
          className="inline-block px-4 py-2 bg-slate-900 text-white rounded-md text-xs font-semibold"
        >
          ← Return to Operations Map
        </Link>
      </div>
    );
  }

  const currentCrews = MOCKED_CREWS[selectedDept] || [];

  return (
    <div className="space-y-5 max-w-4xl mx-auto pb-16 text-left">
      {/* 1. Back Navigation & Honesty Header */}
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-3">
          <Link
            href="/admin"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-600 hover:text-slate-900 transition-colors"
          >
            <span>←</span>
            <span>Back to Operations Map</span>
          </Link>
          <span className="text-slate-300">|</span>
          <Link
            href="/admin/review"
            className="inline-flex items-center gap-1 text-xs font-semibold text-slate-700 hover:text-slate-900"
          >
            <span>Review Queue</span>
          </Link>
        </div>

        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-sm text-[10px] font-semibold bg-amber-50 text-amber-900 border border-amber-300 font-mono">
          Synthetic Data & Simulated Routing
        </span>
      </div>

      {/* Mocked Notification Toast Banner */}
      {mockedNotification && (
        <div className="bg-slate-900 border border-slate-800 p-4 rounded-md text-xs text-white flex items-start justify-between gap-3 animate-fade-in shadow-xs">
          <div className="flex items-start gap-2.5">
            <div>
              <div className="font-bold uppercase tracking-wider text-[10px] text-slate-400">
                Mocked Notification Triggered
              </div>
              <div className="font-mono text-slate-200 mt-0.5">{mockedNotification}</div>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setMockedNotification(null)}
            className="text-slate-400 hover:text-white font-bold text-sm leading-none"
          >
            ×
          </button>
        </div>
      )}

      {/* 2. Hero Overview Card */}
      <div className="bg-white rounded-md p-5 sm:p-6 border border-slate-200 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-black font-mono tracking-tight text-slate-900">
                {incident.id}
              </h1>
              {incident.synthetic && (
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-sm bg-amber-50 text-amber-800 border border-amber-200">
                  Synthetic
                </span>
              )}
            </div>
            <div className="text-xs text-slate-400 mt-0.5 font-mono">
              Centroid: {incident.location.lat.toFixed(4)}, {incident.location.lng.toFixed(4)}
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span
              className={`text-xs font-mono font-extrabold px-3 py-1 rounded-sm border ${
                incident.priorityScore >= 80
                  ? 'bg-rose-50 text-rose-800 border-rose-300'
                  : incident.priorityScore >= 60
                  ? 'bg-amber-50 text-amber-800 border-amber-300'
                  : 'bg-slate-100 text-slate-800 border-slate-300'
              }`}
            >
              Priority: {incident.priorityScore}/100
            </span>

            <span className="text-xs font-bold uppercase tracking-wider text-slate-700 bg-slate-100 px-3 py-1 rounded-sm border border-slate-200">
              {incident.status.replace('_', ' ')}
            </span>
          </div>
        </div>

        {/* Closure Disputed / Unreliable Alert */}
        {(incident.closureUnreliable || incident.status === 'reopened') && (
          <div className="bg-rose-50 border border-rose-300 p-4 rounded-md space-y-1.5 text-rose-950 shadow-xs">
            <div className="font-bold uppercase tracking-wider text-xs text-rose-800 flex items-center justify-between flex-wrap gap-2">
              <span>Citizen Disputed Resolution: Closure Unreliable</span>
              <span className="bg-rose-200 text-rose-900 text-[10px] font-mono font-bold px-2 py-0.5 rounded-sm">
                Priority Auto-Escalated
              </span>
            </div>
            <p className="text-xs text-rose-950 font-medium leading-relaxed">
              A reporting citizen verified this issue on-site and submitted feedback that it was <span className="font-bold underline">NOT fixed</span>. The previous municipal closure has been flagged unreliable in city records, and the incident has been reopened for emergency supervisor review.
            </p>
          </div>
        )}

        {incident.verificationStatus === 'verified' && (
          <div className="bg-slate-50 border border-slate-300 p-4 rounded-md space-y-0.5 text-slate-900">
            <div className="font-bold uppercase tracking-wider text-xs text-slate-900">
              Citizen-Verified Resolution
            </div>
            <p className="text-xs text-slate-700 font-medium leading-relaxed">
              Reporting citizen conducted on-site verification and confirmed the municipal fix.
            </p>
          </div>
        )}

        {/* ── Admin Workflow Section: Statuses & Crew Assignment ── */}
        <div className="bg-slate-50 p-4 rounded-md border border-slate-200 space-y-4">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div>
              <div className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                Admin Dispatch & Status Workflow
              </div>
              <div className="text-[11px] text-slate-500">
                Lifecycle: New → Under review → Assigned → In progress → Resolved
              </div>
            </div>

            {/* Quick Status Pill Selector */}
            <div className="flex items-center gap-1.5 flex-wrap">
              {STATUS_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  disabled={updating}
                  onClick={() => handleUpdateStatusAndCrew(opt.value)}
                  className={`text-xs font-semibold px-2.5 py-1 rounded-sm border transition-all ${
                    incident.status === opt.value
                      ? `${opt.color} ring-1 ring-slate-900 font-bold`
                      : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* Department & Mocked Crew Assignment Controls */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-slate-200">
            <div>
              <label className="block text-[10px] uppercase font-bold text-slate-500 tracking-wider mb-1">
                Assign Department
              </label>
              <select
                value={selectedDept}
                onChange={(e) => handleDeptChange(e.target.value as Department)}
                className="w-full text-xs font-medium px-3 py-2 bg-white rounded-md border border-slate-300 text-slate-800 focus:outline-hidden focus:ring-1 focus:ring-slate-900"
              >
                {DEPARTMENTS.map((dept) => (
                  <option key={dept.id} value={dept.id}>
                    {dept.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">
                  Mocked Municipal Field Crew
                </label>
                <span className="text-[9px] font-semibold text-amber-800 bg-amber-50 px-1.5 py-0.2 rounded-sm border border-amber-200">
                  Mocked
                </span>
              </div>
              <select
                value={selectedCrew}
                onChange={(e) => setSelectedCrew(e.target.value)}
                className="w-full text-xs font-medium px-3 py-2 bg-white rounded-md border border-slate-300 text-slate-800 focus:outline-hidden focus:ring-1 focus:ring-slate-900"
              >
                {currentCrews.map((crew) => (
                  <option key={crew} value={crew}>
                    {crew}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Optional Action Note & Dispatch Button */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 pt-1">
            <input
              type="text"
              placeholder="Optional admin note / dispatch instruction..."
              value={customNote}
              onChange={(e) => setCustomNote(e.target.value)}
              className="grow text-xs px-3 py-2 bg-white rounded-md border border-slate-300 text-slate-800 placeholder-slate-400 focus:outline-hidden focus:ring-1 focus:ring-slate-900"
            />
            <button
              type="button"
              disabled={updating}
              onClick={() => handleUpdateStatusAndCrew('assigned', selectedDept, selectedCrew)}
              className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-md text-xs font-semibold transition-colors disabled:opacity-50 shrink-0 shadow-xs"
            >
              {updating ? 'Updating...' : 'Assign Crew & Mark Assigned'}
            </button>
          </div>

          {/* Currently Assigned Badge */}
          {incident.assignedCrew && (
            <div className="flex items-center gap-2 text-xs bg-slate-100 border border-slate-300 text-slate-900 p-2.5 rounded-md">
              <div className="grow font-mono">
                <span className="font-bold">Active Crew Assignment:</span> {incident.assignedCrew}
                <span className="text-[10px] ml-1.5 text-slate-600 font-semibold uppercase">
                  ({incident.assignedDepartment || incident.leadDepartment})
                </span>
              </div>
              <span className="text-[9px] font-bold uppercase tracking-wider text-slate-700 bg-slate-200 px-2 py-0.5 rounded-sm">
                Mocked
              </span>
            </div>
          )}
        </div>

        {/* Merged Incident Summary */}
        <div className="space-y-1">
          <div className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">
            Merged Incident Description
          </div>
          <p className="text-sm font-medium text-slate-800 bg-slate-50 p-3.5 rounded-md border border-slate-200 leading-relaxed">
            {incident.mergedSummary}
          </p>
        </div>

        {/* Root Cause Deduction */}
        {incident.rootCauseGuess && (
          <div className="bg-slate-50 p-4 rounded-md border border-slate-300 space-y-1">
            <div className="flex items-center gap-1.5 text-[10px] uppercase font-bold text-slate-900 tracking-wider">
              <span>Root Cause Deduction</span>
              <span className="text-[9px] font-normal text-slate-500 font-mono">(Simulated Civic Reasoning)</span>
            </div>
            <p className="text-xs text-slate-800 font-medium leading-relaxed">
              {incident.rootCauseGuess}
            </p>
          </div>
        )}

        {/* Department Routing Info */}
        <div className="bg-slate-50 p-3.5 rounded-md border border-slate-200 space-y-2">
          <div className="flex justify-between items-center">
            <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">
              Department Routing
            </span>
            <span className="text-[10px] font-semibold text-slate-400 font-mono">
              Simulated Municipal Routing
            </span>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <span className="px-3 py-1 rounded-md bg-slate-900 text-white font-bold text-xs uppercase tracking-wide">
              Lead: {incident.leadDepartment.replace('_', ' ')}
            </span>
            {incident.supportingDepartments?.map((dept) => (
              <span
                key={dept}
                className="px-3 py-1 rounded-md bg-white border border-slate-300 text-slate-700 font-semibold text-xs uppercase tracking-wide"
              >
                Supporting: {dept.replace('_', ' ')}
              </span>
            ))}
          </div>
        </div>

        {/* Status History Timeline */}
        {incident.statusHistory && incident.statusHistory.length > 0 && (
          <div className="space-y-2 pt-2 border-t border-slate-100">
            <div className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">
              Status History Timeline ({incident.statusHistory.length} events)
            </div>
            <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
              {incident.statusHistory.map((entry, idx) => (
                <div
                  key={idx}
                  className="flex items-start justify-between gap-3 text-xs bg-slate-50 p-2.5 rounded-md border border-slate-200"
                >
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-2">
                      <span className="font-bold uppercase tracking-wider text-[10px] px-2 py-0.5 rounded-sm bg-slate-200 text-slate-800">
                        {entry.status.replace('_', ' ')}
                      </span>
                      <span className="text-[10px] text-slate-500 font-mono">
                        Actor: {entry.actor}
                      </span>
                    </div>
                    {entry.note && (
                      <p className="text-slate-700 text-xs mt-0.5 font-medium">{entry.note}</p>
                    )}
                  </div>
                  <div className="text-[10px] text-slate-400 font-mono shrink-0">
                    {new Date(entry.timestamp).toLocaleString('en-IN', {
                      month: 'short',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* 3. Deterministic Priority Breakdown */}
      <FactorBreakdownBars
        factors={incident.priorityFactors}
        priorityScore={incident.priorityScore}
      />

      {/* 4. Priority Comparison: "Why this ranks above [other incident]" */}
      {allIncidents.length > 1 && (
        <PriorityComparison
          currentIncident={incident}
          allIncidents={allIncidents}
        />
      )}

      {/* 5. Linked Citizen Reports */}
      <div className="space-y-3">
        <div className="flex items-center justify-between px-1">
          <div>
            <h2 className="text-base font-bold text-slate-900">
              Linked Citizen Reports ({memberReports.length})
            </h2>
            <div className="text-xs text-slate-500">
              Corroborating reports merged into this single root-cause issue
            </div>
          </div>
        </div>

        <div className="space-y-3">
          {memberReports.map((report) => (
            <LinkedReportCard key={report.id} report={report} />
          ))}
        </div>
      </div>
    </div>
  );
}
