import React from 'react';
import type { PriorityFactors } from '@/types/ai';
import { PRIORITY_CONFIG } from '@/lib/ai/priorityScoring';

interface FactorBreakdownBarsProps {
  factors: PriorityFactors;
  priorityScore: number;
}

export default function FactorBreakdownBars({
  factors,
  priorityScore,
}: FactorBreakdownBarsProps) {
  const { weights } = PRIORITY_CONFIG;

  const FACTOR_ROWS = [
    {
      key: 'safetyRisk',
      label: 'Life & Safety Risk',
      weight: weights.safetyRisk,
      value: factors.safetyRisk,
      color: 'bg-red-500',
      description: 'Life hazard, electrocution risk, open pits, or physical peril',
    },
    {
      key: 'peopleAffected',
      label: 'Citizen Volume (Reports in Cluster)',
      weight: weights.peopleAffected,
      value: factors.peopleAffected,
      color: 'bg-blue-500',
      description: 'Corroborating reports merged into this single incident',
    },
    {
      key: 'sensitiveLocation',
      label: 'Sensitive Facility Proximity',
      weight: weights.sensitiveLocation,
      value: factors.sensitiveLocation,
      color: 'bg-purple-500',
      description: 'Proximity to schools, hospitals, or emergency corridors',
    },
    {
      key: 'imageSeverity',
      label: 'Visual Evidence Severity',
      weight: weights.imageSeverity,
      value: factors.imageSeverity,
      color: 'bg-amber-500',
      description: 'Physical damage visible in attached citizen photographs',
    },
    {
      key: 'age',
      label: 'Unresolved Aging Urgency',
      weight: weights.age,
      value: factors.age,
      color: 'bg-teal-500',
      description: 'Days elapsed since the first report was logged',
    },
    {
      key: 'recurrenceHistory',
      label: 'Infrastructure Recurrence',
      weight: weights.recurrenceHistory,
      value: factors.recurrenceHistory,
      color: 'bg-rose-500',
      description: 'Frequency of past repeated failures at this exact location',
    },
  ];

  return (
    <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200 shadow-xs space-y-3.5">
      <div className="flex items-center justify-between">
        <div>
          <div className="text-xs font-bold text-slate-900 uppercase tracking-wider">
            Deterministic Priority Formula
          </div>
          <div className="text-[11px] text-slate-500">
            Weighted linear sum — computed entirely by code, never invented by LLM
          </div>
        </div>

        <div className="text-right">
          <span className="text-xl sm:text-2xl font-black font-mono text-slate-900">
            {priorityScore}
          </span>
          <span className="text-xs text-slate-400 font-semibold">/100</span>
        </div>
      </div>

      {/* Factor Bars */}
      <div className="space-y-3 pt-1">
        {FACTOR_ROWS.map((row) => {
          const contributionPoints = (row.value * row.weight * 100).toFixed(1);
          const percentFill = Math.min(100, Math.max(0, Math.round(row.value * 100)));

          return (
            <div key={row.key} className="space-y-1">
              <div className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-1.5 font-medium text-slate-700">
                  <span>{row.label}</span>
                  <span className="text-[10px] font-bold text-slate-400 bg-slate-100 px-1.5 py-0.2 rounded border border-slate-200">
                    {(row.weight * 100).toFixed(0)}% wt
                  </span>
                </div>
                <div className="font-mono text-xs font-bold text-slate-800">
                  +{contributionPoints} pts{' '}
                  <span className="text-[10px] text-slate-400 font-normal">({percentFill}%)</span>
                </div>
              </div>

              {/* Progress track */}
              <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden border border-slate-200/60">
                <div
                  className={`h-full ${row.color} rounded-full transition-all duration-500`}
                  style={{ width: `${percentFill}%` }}
                />
              </div>

              <div className="text-[10px] text-slate-400 leading-tight">
                {row.description}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

