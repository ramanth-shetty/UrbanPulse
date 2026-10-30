'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import type { Report } from '@/types/report';
import type { Incident } from '@/types/incident';
import type { Department } from '@/types/department';

const DEPARTMENT_LABELS: Record<string, string> = {
  water_drainage: 'Water & Drainage (MCC)',
  roads: 'Roads & Infrastructure (MCC)',
  sanitation: 'Sanitation & Solid Waste (MCC)',
  electricity: 'Electricity & Streetlights (CESC)',
  parks: 'Parks & Horticulture (MCC)',
  traffic: 'Traffic & Signage (Traffic Police / MCC)',
};

const STEP_ORDER = ['new', 'assigned', 'in_progress', 'resolved', 'citizen_verified'];

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
  const [verificationFeedbackMsg, setVerificationFeedbackMsg] = useState<string | null>(null);
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

      // Update state optimistically
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

      setVerificationFeedbackMsg(
        fixed
          ? 'Thank you! Your verification confirms the municipal fix.'
          : 'Dispute recorded. This incident has been reopened with elevated priority.'
      );
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
      <div className="space-y-4 max-w-xl mx-auto py-8">
        <div className="h-6 w-32 bg-slate-200 animate-pulse rounded-lg" />
        <div className="h-40 bg-slate-200 animate-pulse rounded-3xl" />
        <div className="h-48 bg-slate-200 animate-pulse rounded-3xl" />
      </div>
    );
  }

  if (error || !report) {
    return (
      <div className="bg-white rounded-3xl p-8 border border-slate-200 text-center space-y-4 max-w-md mx-auto my-12">
        <div className="text-3xl">🔍</div>
        <div className="text-base font-bold text-slate-900">Complaint Not Found</div>
        <p className="text-xs text-slate-500">{error || `Could not find report "${id}". Check the ID and try again.`}</p>
        <Link
          href="/"
          className="inline-block px-4 py-2.5 bg-slate-900 text-white rounded-xl text-xs font-semibold shadow-xs"
        >
          ← Return to Home
        </Link>
      </div>
    );
  }

  // Determine current active lifecycle status (incident status takes priority if linked)
  const currentStatus = incident?.status || report.status;
  const isResolved = currentStatus === 'resolved';
  const isCitizenVerified = currentStatus === 'citizen_verified' || incident?.verificationStatus === 'verified';
  const isReopened = currentStatus === 'reopened' || incident?.closureUnreliable;

  return (
    <div className="space-y-5 max-w-xl mx-auto pb-16 text-left">
      {/* 1. Header Navigation */}
      <div className="flex items-center justify-between gap-2">
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-600 hover:text-slate-900 transition-colors"
        >
          <span>←</span>
          <span>Home</span>
        </Link>
        <div className="flex items-center gap-1.5 text-[10px] text-slate-400 font-mono">
          <span>Mysuru Civic Tracker</span>
        </div>
      </div>

      {/* Mocked Notification Toast */}
      {mockedNotification && (
        <div className="bg-emerald-50 border border-emerald-300 p-4 rounded-2xl text-xs text-emerald-900 flex items-start justify-between gap-3 animate-fade-in shadow-xs">
          <div className="flex items-start gap-2.5">
            <span className="text-base leading-none">📱</span>
            <div>
              <div className="font-bold uppercase tracking-wider text-[10px] text-emerald-700">
                Mocked Citizen Notification Dispatched
              </div>
              <div className="font-mono text-emerald-950 mt-0.5 font-medium">{mockedNotification}</div>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setMockedNotification(null)}
            className="text-emerald-700 hover:text-emerald-950 font-bold text-sm leading-none"
          >
            ✕
          </button>
        </div>
      )}

      {/* 2. Top Overview Card */}
      <div className="bg-white rounded-3xl p-5 sm:p-6 border border-slate-200 shadow-xs space-y-4">
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <div>
            <div className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">
              Complaint Tracking ID
            </div>
            <div className="text-xl sm:text-2xl font-black font-mono tracking-tight text-slate-900">
              {report.id}
            </div>
          </div>

          {/* Current Status Pill */}
          <div>
            <span
              className={`text-xs font-black uppercase tracking-wider px-3 py-1.5 rounded-full border shadow-2xs ${
                isCitizenVerified
                  ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                  : isReopened
                  ? 'bg-rose-100 text-rose-800 border-rose-300 animate-pulse'
                  : isResolved
                  ? 'bg-blue-100 text-blue-800 border-blue-300'
                  : currentStatus === 'in_progress'
                  ? 'bg-amber-100 text-amber-800 border-amber-300'
                  : 'bg-slate-100 text-slate-800 border-slate-300'
              }`}
            >
              {currentStatus.replace('_', ' ')}
            </span>
          </div>
        </div>

        {/* ── Incidents, Not Tickets: Cluster Aggregation Card ── */}
        {incident ? (
          <div className="bg-gradient-to-r from-blue-50/80 to-indigo-50/80 p-4 rounded-2xl border border-blue-200 space-y-2">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-1.5 text-xs font-bold text-blue-900">
                <span>⚡ Linked to Incident</span>
                <span className="font-mono bg-blue-100 text-blue-800 px-1.5 py-0.5 rounded text-[11px]">
                  {incident.id}
                </span>
              </div>
              <span className="text-[11px] font-extrabold px-2.5 py-0.5 rounded-full bg-indigo-600 text-white shadow-2xs">
                {othersAffected} other{othersAffected === 1 ? '' : 's'} affected
              </span>
            </div>

            <p className="text-xs text-blue-950 font-medium leading-relaxed">
              &quot;{incident.mergedSummary}&quot;
            </p>

            <div className="text-[10px] text-blue-800/80 flex items-center gap-1 pt-0.5">
              <span>💡</span>
              <span>
                Your complaint was grouped with neighboring reports into a single root-cause municipal dispatch.
              </span>
            </div>
          </div>
        ) : (
          <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200 text-xs text-slate-600">
            <span className="font-semibold text-slate-800">Status:</span> Individual report logged. Duplicate & cluster analysis will link nearby reports automatically.
          </div>
        )}

        {/* Department & Crew Assignment Details */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1 border-t border-slate-100 text-xs">
          <div>
            <div className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">
              Assigned Department
            </div>
            <div className="font-bold text-slate-800 mt-0.5">
              {assignedDepartment ? DEPARTMENT_LABELS[assignedDepartment] || assignedDepartment.replace('_', ' ') : 'Intake Triage'}
            </div>
          </div>

          <div>
            <div className="text-[10px] uppercase font-bold text-slate-400 tracking-wider flex items-center justify-between">
              <span>Municipal Field Crew</span>
              <span className="text-[9px] font-semibold text-amber-700 bg-amber-50 px-1 rounded border border-amber-200">
                Mocked
              </span>
            </div>
            <div className="font-medium text-slate-700 mt-0.5">
              {assignedCrew || 'Awaiting crew assignment'}
            </div>
          </div>
        </div>

        {/* Original Report text */}
        <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200/80 space-y-1">
          <div className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">
            Your Original Submission
          </div>
          <p className="text-xs text-slate-800 font-medium italic">
            &quot;{report.text}&quot;
          </p>
          {report.language !== 'en' && report.translatedText && (
            <div className="text-[11px] text-blue-700 font-medium pt-1">
              Translated ({report.language.toUpperCase()}): &quot;{report.translatedText}&quot;
            </div>
          )}
        </div>
      </div>

      {/* ── 3. Interactive Citizen Verification Section ("Is it actually fixed?") ── */}
      {isResolved && (
        <div className="bg-gradient-to-br from-amber-50 via-white to-orange-50 rounded-3xl p-5 sm:p-6 border-2 border-amber-300 shadow-md space-y-4 animate-in fade-in">
          <div className="flex items-center gap-2 text-amber-900">
            <span className="text-xl">🛠️</span>
            <div>
              <h2 className="text-sm font-black uppercase tracking-wide text-amber-900">
                Action Required: Is it actually fixed?
              </h2>
              <p className="text-xs text-amber-800 mt-0.5">
                The municipal field team marked this issue as resolved. Please verify on-site:
              </p>
            </div>
          </div>

          <div className="space-y-2">
            <input
              type="text"
              placeholder="Optional notes: e.g. 'Pothole filled with asphalt' or 'Water still leaking'..."
              value={feedbackNote}
              onChange={(e) => setFeedbackNote(e.target.value)}
              className="w-full text-xs px-3.5 py-2.5 bg-white rounded-xl border border-amber-200 text-slate-800 placeholder-slate-400 focus:outline-hidden focus:ring-2 focus:ring-amber-500"
            />

            <div className="grid grid-cols-2 gap-3 pt-1">
              {/* YES Button */}
              <button
                type="button"
                disabled={submittingVerification}
                onClick={() => handleVerify(true)}
                className="py-3 px-4 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white font-bold rounded-2xl text-xs transition-transform active:scale-[0.98] shadow-sm disabled:opacity-50 flex items-center justify-center gap-1.5"
              >
                <span>✓</span>
                <span>Yes, It&apos;s Fixed</span>
              </button>

              {/* NO Button */}
              <button
                type="button"
                disabled={submittingVerification}
                onClick={() => handleVerify(false)}
                className="py-3 px-4 bg-rose-600 hover:bg-rose-700 active:bg-rose-800 text-white font-bold rounded-2xl text-xs transition-transform active:scale-[0.98] shadow-sm disabled:opacity-50 flex items-center justify-center gap-1.5"
              >
                <span>✕</span>
                <span>No, Not Fixed</span>
              </button>
            </div>
          </div>

          <div className="text-[11px] text-amber-800/80 leading-tight">
            * Clicking &quot;No&quot; automatically reopens the incident, marks the previous closure as unreliable, and escalates priority for urgent supervisor intervention.
          </div>
        </div>
      )}

      {/* Citizen Verified Banner */}
      {isCitizenVerified && (
        <div className="bg-emerald-50 rounded-3xl p-5 border border-emerald-300 shadow-xs flex items-start gap-3 text-emerald-950">
          <span className="text-2xl leading-none">✅</span>
          <div className="space-y-1">
            <div className="font-extrabold text-xs uppercase tracking-wide text-emerald-800">
              Citizen-Verified Resolution
            </div>
            <p className="text-xs text-emerald-900 leading-relaxed font-medium">
              You confirmed this civic issue has been resolved on-site. Thank you for contributing to Mysuru!
            </p>
          </div>
        </div>
      )}

      {/* Reopened Banner */}
      {isReopened && (
        <div className="bg-rose-50 rounded-3xl p-5 border-2 border-rose-300 shadow-xs space-y-2 text-rose-950">
          <div className="flex items-center gap-2">
            <span className="text-2xl leading-none">⚠️</span>
            <div>
              <div className="font-black text-xs uppercase tracking-wide text-rose-800">
                Disputed & Reopened: Closure Unreliable
              </div>
              <div className="text-[11px] text-rose-700 font-semibold">
                Priority escalated (+20 pts to {incident?.priorityScore || 80}/100)
              </div>
            </div>
          </div>
          <p className="text-xs text-rose-950 leading-relaxed font-medium">
            A citizen verified that this issue was <span className="font-bold underline">not fixed</span>. The previous closure was marked unreliable in municipal records and escalated for urgent supervisor review.
          </p>
        </div>
      )}

      {/* ── 4. Lifecycle Stepper ── */}
      <div className="bg-white rounded-3xl p-5 sm:p-6 border border-slate-200 shadow-xs space-y-4">
        <div className="text-xs font-bold text-slate-800">
          Resolution Lifecycle
        </div>

        <div className="grid grid-cols-4 gap-2 text-center text-[10px]">
          <div className="space-y-1">
            <div className="w-7 h-7 rounded-full bg-emerald-600 text-white font-bold flex items-center justify-center mx-auto shadow-2xs">
              ✓
            </div>
            <div className="font-semibold text-slate-800">Submitted</div>
          </div>

          <div className="space-y-1">
            <div
              className={`w-7 h-7 rounded-full font-bold flex items-center justify-center mx-auto shadow-2xs ${
                currentStatus !== 'new'
                  ? 'bg-emerald-600 text-white'
                  : 'bg-slate-100 text-slate-400 border border-slate-300'
              }`}
            >
              {currentStatus !== 'new' ? '✓' : '2'}
            </div>
            <div className="font-semibold text-slate-800">Assigned</div>
          </div>

          <div className="space-y-1">
            <div
              className={`w-7 h-7 rounded-full font-bold flex items-center justify-center mx-auto shadow-2xs ${
                currentStatus === 'in_progress' || isResolved || isCitizenVerified
                  ? 'bg-emerald-600 text-white'
                  : 'bg-slate-100 text-slate-400 border border-slate-300'
              }`}
            >
              {isResolved || isCitizenVerified ? '✓' : '3'}
            </div>
            <div className="font-semibold text-slate-800">In Progress</div>
          </div>

          <div className="space-y-1">
            <div
              className={`w-7 h-7 rounded-full font-bold flex items-center justify-center mx-auto shadow-2xs ${
                isCitizenVerified
                  ? 'bg-emerald-600 text-white'
                  : isReopened
                  ? 'bg-rose-600 text-white'
                  : isResolved
                  ? 'bg-blue-600 text-white'
                  : 'bg-slate-100 text-slate-400 border border-slate-300'
              }`}
            >
              {isCitizenVerified ? '✓' : isReopened ? '!' : '4'}
            </div>
            <div className="font-semibold text-slate-800">
              {isCitizenVerified ? 'Verified' : isReopened ? 'Reopened' : 'Resolved'}
            </div>
          </div>
        </div>
      </div>

      {/* ── 5. Status History Timeline ── */}
      <div className="bg-white rounded-3xl p-5 sm:p-6 border border-slate-200 shadow-xs space-y-3">
        <div className="text-xs font-bold text-slate-800">
          Status Timeline Events ({report.statusHistory?.length || 0})
        </div>

        <div className="space-y-2">
          {report.statusHistory?.map((entry, idx) => (
            <div
              key={idx}
              className="flex items-start justify-between gap-3 text-xs bg-slate-50 p-3 rounded-2xl border border-slate-200/80"
            >
              <div className="space-y-0.5">
                <div className="flex items-center gap-2">
                  <span className="font-bold uppercase tracking-wider text-[10px] px-2 py-0.5 rounded bg-slate-200 text-slate-800">
                    {entry.status.replace('_', ' ')}
                  </span>
                  <span className="text-[10px] text-slate-500 font-mono">
                    Actor: {entry.actor}
                  </span>
                </div>
                {entry.note && (
                  <p className="text-slate-700 text-xs mt-1 font-medium leading-relaxed">
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

