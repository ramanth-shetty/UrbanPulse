'use client';

import React, { useState } from 'react';
import type { Report } from '@/types/report';

interface ReportSuccessProps {
  report: Report;
  onReset: () => void;
}

export default function ReportSuccess({ report, onReset }: ReportSuccessProps) {
  const [copied, setCopied] = useState(false);

  const handleCopyId = () => {
    navigator.clipboard.writeText(report.id);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  return (
    <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200 text-center space-y-5 animate-in fade-in duration-300">
      <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto shadow-sm">
        <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
        </svg>
      </div>

      <div className="space-y-1">
        <h2 className="text-xl font-bold text-slate-900">Complaint Submitted!</h2>
        <p className="text-xs text-slate-500 max-w-xs mx-auto">
          Your report has been logged with the Mysuru civic intake queue and assigned status{' '}
          <span className="font-semibold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200 uppercase">
            {report.status}
          </span>
          .
        </p>
      </div>

      {/* Ticket ID Box */}
      <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-2">
        <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
          Your Report Tracking ID
        </div>
        <div className="flex items-center justify-center gap-2">
          <span className="text-2xl font-mono font-bold tracking-wider text-slate-800">
            {report.id}
          </span>
          <button
            type="button"
            onClick={handleCopyId}
            className="p-1.5 rounded-lg bg-white border border-slate-300 hover:bg-slate-100 text-slate-600 transition-colors"
            title="Copy Report ID"
          >
            {copied ? (
              <span className="text-xs font-semibold text-emerald-600 px-1">Copied!</span>
            ) : (
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M8 7v8a2 2 0 002 2h6M8 7V5a2 2 0 012-2h4.586a1 1 0 01.707.293l4.414 4.414a1 1 0 01.293.707V15a2 2 0 01-2 2h-2M8 7H6a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2v-2"
                />
              </svg>
            )}
          </button>
        </div>
        <div className="text-[11px] text-slate-400">Save this ID to track updates and confirm resolution</div>
      </div>

      {/* Summary preview */}
      <div className="text-left text-xs bg-slate-50 p-3.5 rounded-lg border border-slate-100 space-y-2 text-slate-600">
        <div className="flex justify-between items-center">
          <span className="text-slate-400">Category:</span>
          <span className="font-medium text-slate-700 capitalize">
            {report.category.replace('_', ' ')}
          </span>
        </div>

        {report.aiResult && (
          <div className="pt-2 border-t border-slate-200/60 space-y-1.5">
            <div className="flex justify-between items-center">
              <span className="text-[11px] font-semibold text-slate-700 uppercase tracking-wider">
                AI Triage Analysis
              </span>
              {report.fallbackMode ? (
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 border border-amber-200">
                  ⚠️ Fallback Mode
                </span>
              ) : (
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200">
                  ✨ Gemini Analyzed ({(report.aiResult.confidence * 100).toFixed(0)}%)
                </span>
              )}
            </div>

            <div className="text-xs text-slate-800 font-medium">
              {report.aiResult.summary}
            </div>

            {report.aiResult.language !== 'en' && report.aiResult.language !== 'unknown' && (
              <div className="text-[11px] text-slate-500 italic">
                Translated from {report.aiResult.language.toUpperCase()}: "{report.aiResult.translatedText}"
              </div>
            )}

            <div className="flex flex-wrap gap-1.5 pt-1">
              <span className="px-2 py-0.5 bg-blue-50 text-blue-700 rounded text-[10px] font-medium border border-blue-200">
                Routed: {report.aiResult.department.replace('_', ' ').toUpperCase()}
              </span>
              {report.aiResult.severityCues.map((cue, i) => (
                <span key={i} className="px-1.5 py-0.5 bg-red-50 text-red-700 rounded text-[10px] font-medium border border-red-200">
                  🚨 {cue}
                </span>
              ))}
            </div>
          </div>
        )}

        <div className="flex justify-between pt-1 border-t border-slate-200/60">
          <span className="text-slate-400">Location:</span>
          <span className="font-mono text-slate-700">
            {report.location.lat.toFixed(4)}, {report.location.lng.toFixed(4)}
          </span>
        </div>
      </div>

      <div className="pt-2 space-y-2">
        <a
          href={`/track/${report.id}`}
          className="w-full inline-flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white font-medium py-2.5 px-4 rounded-xl shadow-sm transition-colors text-sm"
        >
          Track Issue Progress →
        </a>

        <button
          type="button"
          onClick={onReset}
          className="w-full py-2 px-4 text-xs font-semibold text-slate-600 hover:text-slate-900 transition-colors"
        >
          + Submit Another Report
        </button>
      </div>
    </div>
  );
}

