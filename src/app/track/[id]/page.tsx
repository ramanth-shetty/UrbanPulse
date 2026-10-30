'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import type { Report } from '@/types/report';
import type { Incident } from '@/types/incident';

const DEPARTMENT_LABELS: Record<string, string> = {
  water_drainage: 'Water & Drainage (MCC)',
  roads: 'Roads & Infrastructure (MCC)',
  sanitation: 'Sanitation & Solid Waste (MCC)',
  electricity: 'Electricity & Streetlights (CESC)',
  parks: 'Parks & Horticulture (MCC)',
  traffic: 'Traffic & Signage (Traffic Police / MCC)',
};

export default function CitizenTrackingPage() {
  const params = useParams();
  const id = params?.id as string;

  const [report, setReport] = useState<Report | null>(null);
  const [incident, setIncident] = useState<Incident | null>(null);
  const [othersAffected, setOthersAffected] = useState<number>(0);
  const [assignedDepartment, setAssignedDepartment] = useState<string | null>(null);
  const [assignedCrew, setAssignedCrew] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Verification state
  const [submittingVerification, setSubmittingVerification] = useState(false);
  const [feedbackNote, setFeedbackNote] = useState('');
  const [mockedNotification, setMockedNotification] = useState<string | null>(null);

  const fetchTrackingData = async () => {
    if (!id) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/reports/${id}`);
      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Report not found');
      }

      setReport(data.report);
      setIncident(data.incident);
      setOthersAffected(data.othersAffected || 0);
      setAssignedDepartment(data.assignedDepartment || null);
      setAssignedCrew(data.assignedCrew || null);
    } catch (err) {
      console.error('Error fetching report tracking info:', err);
      setError(err instanceof Error ? err.message : 'Error loading report tracking info');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTrackingData();
  }, [id]);

  const handleVerify = async (fixed: boolean) => {
    if (!report) return;
    setSubmittingVerification(true);
    setMockedNotification(null);
    try {
      const res = await fetch(`/api/reports/${report.id}/verify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fixed,
          note: feedbackNote.trim() || undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        alert(data.error || 'Failed to submit verification response');
        return;
      }

      const newStatus = fixed ? 'citizen_verified' : 'reopened';
      const historyItem = data.historyEntry;

      setReport((prev) =>
        prev
          ? {
              ...prev,
              status: newStatus,
              statusHistory: [...(prev.statusHistory || []), historyItem],
            }
          : null
      );

      if (incident) {
        setIncident((prev) =>
          prev
            ? {
                ...prev,
                status: newStatus,
                verificationStatus: fixed ? 'verified' : 'disputed',
                closureUnreliable: !fixed,
                priorityScore: data.priorityScore || prev.priorityScore,
                statusHistory: [...(prev.statusHistory || []), data.incidentHistoryEntry || historyItem],
              }
            : null
        );
      }

      if (data.mockedNotification) {
        setMockedNotification(data.mockedNotification);
      }
      setFeedbackNote('');
    } catch (err) {
      console.error('Verification submission failed:', err);
      alert('Network error submitting verification');
    } finally {
      setSubmittingVerification(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-3 max-w-xl mx-auto py-8 text-left">
        <div className="h-4 w-28 bg-slate-200 animate-pulse rounded" />
        <div className="h-32 bg-slate-100 animate-pulse rounded-md" />
        <div className="h-40 bg-slate-100 animate-pulse rounded-md" />
      </div>
    );
  }

  if (error || !report) {
    return (
      <div className="bg-white rounded-md p-6 border border-slate-200 text-center space-y-3 max-w-md mx-auto my-12">
        <div className="text-sm font-bold text-slate-900">Complaint Not Found</div>
        <p className="text-xs text-slate-500">{error || `Could not find report "${id}". Verify the tracking ID.`}</p>
        <Link
          href="/"
          className="inline-block px-3 py-1.5 bg-slate-900 text-white rounded-md text-xs font-semibold"
        >
          Return to Home
        </Link>
      </div>
    );
  }

  const currentStatus = incident?.status || report.status;
  const isResolved = currentStatus === 'resolved';
  const isCitizenVerified = currentStatus === 'citizen_verified' || incident?.verificationStatus === 'verified';
  const isReopened = currentStatus === 'reopened' || incident?.closureUnreliable;

  return (
    <div className="space-y-4 max-w-xl mx-auto pb-16 text-left">
      {/* 1. Header Navigation */}
      <div className="flex items-center justify-between gap-2 border-b border-slate-200 pb-2">
        <Link
          href="/"
          className="text-xs font-semibold text-slate-600 hover:text-slate-900 transition-colors"
        >
          &larr; Return Home
        </Link>
        <span className="text-[10px] text-slate-500 font-mono uppercase tracking-wider">
          Incident Tracking Dossier
        </span>
      </div>

      {/* Mocked Notification Toast */}
      {mockedNotification && (
        <div className="bg-slate-900 border border-slate-800 p-3 rounded-md text-xs text-white flex items-start justify-between gap-3">
          <div className="space-y-0.5">
            <div className="font-mono uppercase tracking-wider text-[10px] text-slate-400">
              Notification Dispatched (Simulated)
            </div>
            <div className="font-mono text-slate-200 text-xs">{mockedNotification}</div>
          </div>
          <button
            type="button"
            onClick={() => setMockedNotification(null)}
            className="text-slate-400 hover:text-white font-bold text-xs"
          >
            Close
          </button>
        </div>
      )}

      {/* 2. Top Overview Card */}
      <div className="bg-white rounded-md p-5 border border-slate-200 space-y-3">
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <div>
            <div className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">
              Tracking ID
            </div>
            <div className="text-xl font-bold font-mono tracking-tight text-slate-900">
              {report.id}
            </div>
          </div>

          <div>
            <span
              className={`text-xs font-mono font-bold uppercase tracking-wider px-2.5 py-1 rounded border ${
                isCitizenVerified
                  ? 'bg-slate-100 text-slate-900 border-slate-300'
                  : isReopened
                  ? 'bg-red-50 text-red-800 border-red-300'
                  : isResolved
                  ? 'bg-blue-50 text-blue-800 border-blue-200'
                  : 'bg-slate-100 text-slate-700 border-slate-200'
              }`}
            >
              {currentStatus.replace('_', ' ')}
            </span>
          </div>
        </div>

        {/* Cluster Aggregation Card */}
        {incident ? (
          <div className="bg-slate-50 p-3.5 rounded-md border border-slate-200 space-y-1.5">
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs font-bold text-slate-800">
                Linked Incident: <span className="font-mono text-slate-900">{incident.id}</span>
              </span>
              <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-slate-200 text-slate-800">
                {othersAffected} other{othersAffected === 1 ? '' : 's'} affected
              </span>
            </div>

            <p className="text-xs text-slate-700 leading-relaxed">
              &quot;{incident.mergedSummary}&quot;
            </p>
            <div className="text-[10px] text-slate-500">
              Clustered with nearby complaints into a single municipal work order.
            </div>
          </div>
        ) : (
          <div className="bg-slate-50 p-3 rounded-md border border-slate-200 text-xs text-slate-600">
            Individual report logged. Nearby reports will be clustered automatically.
          </div>
        )}

        {/* Department & Crew Assignment Details */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-slate-100 text-xs">
          <div>
            <div className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">
              Assigned Department
            </div>
            <div className="font-semibold text-slate-800 mt-0.5">
              {assignedDepartment ? DEPARTMENT_LABELS[assignedDepartment] || assignedDepartment.replace('_', ' ') : 'Intake Triage'}
            </div>
          </div>

          <div>
            <div className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">
              Field Crew (Simulated)
            </div>
            <div className="text-slate-700 mt-0.5">
              {assignedCrew || 'Awaiting dispatch'}
            </div>
          </div>
        </div>

        {/* Original Report text */}
        <div className="bg-slate-50 p-3 rounded-md border border-slate-200 space-y-1">
          <div className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">
            Original Submission
          </div>
          <p className="text-xs text-slate-800 italic">
            &quot;{report.text}&quot;
          </p>
          {report.language !== 'en' && report.translatedText && (
            <div className="text-[11px] text-slate-600 pt-0.5">
              Translation ({report.language.toUpperCase()}): &quot;{report.translatedText}&quot;
            </div>
          )}
        </div>
      </div>

      {/* 3. Interactive Citizen Verification Section */}
      {isResolved && (
        <div className="bg-white rounded-md p-4 sm:p-5 border-2 border-slate-900 space-y-3">
          <div>
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-900">
              Verification Required: Is it actually fixed?
            </h2>
            <p className="text-xs text-slate-600 mt-0.5">
              The municipal field crew marked this issue as resolved. Please verify on-site:
            </p>
          </div>

          <div className="space-y-2">
            <input
              type="text"
              placeholder="Optional comment on field condition..."
              value={feedbackNote}
              onChange={(e) => setFeedbackNote(e.target.value)}
              className="w-full text-xs px-3 py-2 rounded-md border border-slate-300 text-slate-800 placeholder-slate-400 focus:outline-hidden focus:border-slate-800"
            />

            <div className="grid grid-cols-2 gap-2 pt-1">
              <button
                type="button"
                disabled={submittingVerification}
                onClick={() => handleVerify(true)}
                className="py-2.5 px-3 bg-slate-900 hover:bg-slate-800 text-white font-semibold rounded-md text-xs transition-colors disabled:opacity-50"
              >
                Yes, It Is Fixed
              </button>

              <button
                type="button"
                disabled={submittingVerification}
                onClick={() => handleVerify(false)}
                className="py-2.5 px-3 bg-white hover:bg-slate-100 text-red-700 font-semibold rounded-md text-xs border border-red-300 transition-colors disabled:opacity-50"
              >
                No, Not Fixed (Reopen)
              </button>
            </div>
          </div>

          <div className="text-[10px] text-slate-500">
            Selecting &quot;No&quot; flags the closure as unreliable, reopens the incident, and escalates priority for supervisor review.
          </div>
        </div>
      )}

      {/* Citizen Verified Banner */}
      {isCitizenVerified && (
        <div className="bg-slate-50 rounded-md p-4 border border-slate-300 text-slate-900 space-y-0.5">
          <div className="font-bold text-xs uppercase tracking-wide text-slate-900">
            Citizen-Verified Resolution
          </div>
          <p className="text-xs text-slate-600 leading-normal">
            Resolution confirmed on-site by reporting citizen.
          </p>
        </div>
      )}

      {/* Reopened Banner */}
      {isReopened && (
        <div className="bg-red-50 rounded-md p-4 border border-red-300 space-y-1 text-red-900">
          <div className="font-bold text-xs uppercase tracking-wide text-red-800">
            Disputed & Reopened: Closure Unreliable
          </div>
          <p className="text-xs text-red-800 leading-normal">
            A citizen verified this issue was incomplete on-site. Previous closure marked unreliable; priority escalated to {incident?.priorityScore || 80}/100.
          </p>
        </div>
      )}

      {/* 4. Lifecycle Stepper */}
      <div className="bg-white rounded-md p-4 border border-slate-200 space-y-3">
        <div className="text-xs font-bold uppercase tracking-wider text-slate-500">
          Resolution Lifecycle
        </div>

        <div className="grid grid-cols-4 gap-2 text-center text-[10px]">
          <div className="p-2 rounded bg-slate-900 text-white font-semibold">
            1. Submitted
          </div>
          <div className={`p-2 rounded font-semibold ${currentStatus !== 'new' ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-400'}`}>
            2. Assigned
          </div>
          <div className={`p-2 rounded font-semibold ${currentStatus === 'in_progress' || isResolved || isCitizenVerified ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-400'}`}>
            3. In Progress
          </div>
          <div className={`p-2 rounded font-semibold ${isCitizenVerified || isResolved ? 'bg-slate-900 text-white' : isReopened ? 'bg-red-700 text-white' : 'bg-slate-100 text-slate-400'}`}>
            4. {isCitizenVerified ? 'Verified' : isReopened ? 'Reopened' : 'Resolved'}
          </div>
        </div>
      </div>

      {/* 5. Status History Timeline */}
      <div className="bg-white rounded-md p-4 border border-slate-200 space-y-2.5">
        <div className="text-xs font-bold uppercase tracking-wider text-slate-500">
          Audit Timeline ({report.statusHistory?.length || 0} Events)
        </div>

        <div className="space-y-1.5">
          {report.statusHistory?.map((entry, idx) => (
            <div
              key={idx}
              className="flex items-start justify-between gap-3 text-xs bg-slate-50 p-2.5 rounded-md border border-slate-200"
            >
              <div className="space-y-0.5">
                <div className="flex items-center gap-2">
                  <span className="font-mono font-bold uppercase tracking-wider text-[10px] px-1.5 py-0.2 rounded bg-slate-200 text-slate-800">
                    {entry.status.replace('_', ' ')}
                  </span>
                  <span className="text-[10px] text-slate-400 font-mono">
                    Actor: {entry.actor}
                  </span>
                </div>
                {entry.note && (
                  <p className="text-slate-700 text-xs font-medium">
                    {entry.note}
                  </p>
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
    </div>
  );
}
