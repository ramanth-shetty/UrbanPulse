'use client';

import React from 'react';
import { Department, DEPARTMENT_LABELS } from '@/types/department';

interface DepartmentFilterProps {
  selectedDepartment: string;
  onSelect: (dept: string) => void;
}

const DEPARTMENTS: { key: string; label: string; icon: string }[] = [
  { key: 'all', label: 'All Departments', icon: '🌐' },
  { key: 'water_drainage', label: DEPARTMENT_LABELS.water_drainage, icon: '💧' },
  { key: 'roads', label: DEPARTMENT_LABELS.roads, icon: '🚧' },
  { key: 'sanitation', label: DEPARTMENT_LABELS.sanitation, icon: '🗑️' },
  { key: 'electricity', label: DEPARTMENT_LABELS.electricity, icon: '⚡' },
  { key: 'parks', label: DEPARTMENT_LABELS.parks, icon: '🌳' },
  { key: 'traffic', label: DEPARTMENT_LABELS.traffic, icon: '🚦' },
];

export default function DepartmentFilter({
  selectedDepartment,
  onSelect,
}: DepartmentFilterProps) {
  return (
    <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none text-xs">
      {DEPARTMENTS.map(({ key, label, icon }) => {
        const isActive = selectedDepartment === key;
        return (
          <button
            key={key}
            type="button"
            onClick={() => onSelect(key)}
            className={`whitespace-nowrap px-3 py-1.5 rounded-xl font-medium transition-colors flex items-center gap-1.5 shadow-2xs ${
              isActive
                ? 'bg-slate-900 text-white shadow-xs font-semibold'
                : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
            }`}
          >
            <span>{icon}</span>
            <span>{label}</span>
          </button>
        );
      })}
    </div>
  );
}

