'use client';

import React, { useState } from 'react';
import type { Incident } from '@/types/incident';
import { PRIORITY_CONFIG } from '@/lib/ai/priorityScoring';

interface PriorityComparisonProps {
  currentIncident: Incident;
  allIncidents: Incident[];
}

export default function PriorityComparison({
  currentIncident,
  allIncidents,
}: PriorityComparisonProps) {
  // Candidate incidents to compare against (excluding current)
  const comparisonCandidates = allIncidents.filter((i) => i.id !== currentIncident.id);

  // Default to the first available candidate
  const [targetId, setTargetId] = useState<string>(
    comparisonCandidates[0]?.id || ''
  );

  const targetIncident = comparisonCandidates.find((i) => i.id === targetId);

  if (!targetIncident) {
    return null;
  }

  const { weights } = PRIORITY_CONFIG;

  const scoreDiff = currentIncident.priorityScore - targetIncident.priorityScore;
  const isHigher = scoreDiff > 0;
  const isEqual = scoreDiff === 0;

  // Factor comparisons
  const FACTORS = [
    { key: 'safetyRisk', label: 'Safety Hazard', weight: weights.safetyRisk },
    { key: 'peopleAffected', label: 'Cluster Volume', weight: weights.peopleAffected },
    { key: 'sensitiveLocation', label: 'Sensitive Facility', weight: weights.sensitiveLocation },
    { key: 'imageSeverity', label: 'Visual Evidence', weight: weights.imageSeverity },
    { key: 'age', label: 'Aging Urgency', weight: weights.age },
    { key: 'recurrenceHistory', label: 'Recurrence', weight: weights.recurrenceHistory },
  ] as const;

  // Compute differences
  const factorDeltas = FACTORS.map((f) => {
    const valA = currentIncident.priorityFactors[f.key];
    const valB = targetIncident.priorityFactors[f.key];
    const ptsA = valA * f.weight * 100;
    const ptsB = valB * f.weight * 100;
    const deltaPts = ptsA - ptsB;

    return {
      ...f,
      valA,
      valB,
      ptsA: Number(ptsA.toFixed(1)),
      ptsB: Number(ptsB.toFixed(1)),
      deltaPts: Number(deltaPts.toFixed(1)),
    };
  }).sort((a, b) => Math.abs(b.deltaPts) - Math.abs(a.deltaPts));

  // Generate plain-language reason for the rank gap
  const topAdvantage = factorDeltas.find((f) => (isHigher ? f.deltaPts > 0 : f.deltaPts < 0));
  const secondAdvantage = factorDeltas.filter((f) => (isHigher ? f.deltaPts > 0 : f.deltaPts < 0))[1];

  let explanation = '';
  if (isEqual) {
    explanation = `${currentIncident.id} and ${targetIncident.id} share an identical priority score (${currentIncident.priorityScore}/100) based on balanced factor contributions.`;
  } else if (isHigher) {
    explanation = `${currentIncident.id} ranks ${Math.abs(scoreDiff)} points ABOVE ${targetIncident.id}. `;
    if (topAdvantage) {
      explanation += `The primary driver is higher ${topAdvantage.label.toLowerCase()} (+${Math.abs(topAdvantage.deltaPts)} pts)`;
      if (secondAdvantage) {
        explanation += ` coupled with greater ${secondAdvantage.label.toLowerCase()} (+${Math.abs(secondAdvantage.deltaPts)} pts)`;
      }
      explanation += '.';
    }
  } else {
    explanation = `${currentIncident.id} ranks ${Math.abs(scoreDiff)} points BELOW ${targetIncident.id}. `;
    if (topAdvantage) {
      explanation += `${targetIncident.id} has greater urgency due to higher ${topAdvantage.label.toLowerCase()} (+${Math.abs(topAdvantage.deltaPts)} pts).`;
    }
  }

  return (
    <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200 shadow-xs space-y-4">
      {/* Header & Comparison Selector */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 border-b border-slate-100 pb-3">
        <div>
          <div className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
            <span>⚖️ Priority Comparison Explainer</span>
          </div>
          <div className="text-[11px] text-slate-500">
            "Why does Incident #1 rank above Incident #2?"
          </div>
        </div>

        {/* Dropdown Selector */}
        <div className="flex items-center gap-1.5">
          <span className="text-[11px] text-slate-400 font-medium whitespace-nowrap">
            Compare against:
          </span>
          <select
            value={targetId}
            onChange={(e) => setTargetId(e.target.value)}
            className="text-xs font-semibold px-2.5 py-1.5 rounded-xl border border-slate-300 bg-slate-50 text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500 font-mono"
          >
            {comparisonCandidates.map((cand) => (
              <option key={cand.id} value={cand.id}>
                {cand.id} (P: {cand.priorityScore}) — {cand.leadDepartment}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Outcome Verdict Card */}
      <div
        className={`p-3 rounded-xl border text-xs leading-relaxed font-medium ${
          isHigher
            ? 'bg-emerald-50 text-emerald-950 border-emerald-200'
            : isEqual
            ? 'bg-slate-50 text-slate-800 border-slate-200'
            : 'bg-amber-50 text-amber-950 border-amber-200'
        }`}
      >
        <div className="flex items-center gap-1.5 font-bold uppercase text-[10px] tracking-wider mb-1">
          <span>{isHigher ? '📈 Rank Advantage' : isEqual ? '⚖️ Equal Priority' : '📉 Lower Priority'}</span>
          <span>•</span>
          <span className="font-mono">
            {currentIncident.priorityScore} vs {targetIncident.priorityScore} pts (Δ {scoreDiff > 0 ? `+${scoreDiff}` : scoreDiff})
          </span>
        </div>
        <div>{explanation}</div>
      </div>

      {/* Side-by-Side Factor Comparison Table */}
      <div className="space-y-2">
        <div className="grid grid-cols-12 text-[10px] font-bold text-slate-400 uppercase tracking-wider px-1">
          <div className="col-span-5">Factor (Weight)</div>
          <div className="col-span-3 text-right">{currentIncident.id}</div>
          <div className="col-span-2 text-right">{targetIncident.id}</div>
          <div className="col-span-2 text-right">Delta</div>
        </div>

        <div className="space-y-1.5 divide-y divide-slate-100">
          {factorDeltas.map((f) => {
            const isFavored = f.deltaPts > 0;
            const isUnfavored = f.deltaPts < 0;

            return (
              <div key={f.key} className="grid grid-cols-12 items-center text-xs pt-1.5 px-1">
                <div className="col-span-5 font-medium text-slate-700">
                  <span>{f.label}</span>
                  <span className="text-[10px] text-slate-400 ml-1">({(f.weight * 100).toFixed(0)}%)</span>
                </div>

                <div className="col-span-3 text-right font-mono font-bold text-slate-800">
                  {f.ptsA} pts
                </div>

                <div className="col-span-2 text-right font-mono text-slate-500">
                  {f.ptsB} pts
                </div>

                <div className="col-span-2 text-right font-mono font-extrabold text-[11px]">
                  {isFavored ? (
                    <span className="text-emerald-600">+{f.deltaPts}</span>
                  ) : isUnfavored ? (
                    <span className="text-rose-600">{f.deltaPts}</span>
                  ) : (
                    <span className="text-slate-400">0.0</span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

