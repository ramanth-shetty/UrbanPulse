'use client';

import React from 'react';
import { DEPARTMENT_LABELS } from '@/types/department';

interface DepartmentFilterProps {
  selectedDepartment: string;
  onSelect: (dept: string) => void;
}

const DEPARTMENTS: { key: string; label: string }[] = [
  { key: 'all', label: 'All Departments' },
  { key: 'water_drainage', label: DEPARTMENT_LABELS.water_drainage },
  { key: 'roads', label: DEPARTMENT_LABELS.roads },
  { key: 'sanitation', label: DEPARTMENT_LABELS.sanitation },
  { key: 'electricity', label: DEPARTMENT_LABELS.electricity },
  { key: 'parks', label: DEPARTMENT_LABELS.parks },
  { key: 'traffic', label: DEPARTMENT_LABELS.traffic },
];

export default function DepartmentFilter({
  selectedDepartment,
  onSelect,
}: DepartmentFilterProps) {
  return (
    <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs">
      {DEPARTMENTS.map(({ key, label }) => {
        const isActive = selectedDepartment === key;
        return (
          <button
            key={key}
            type="button"
            onClick={() => onSelect(key)}
            className={`whitespace-nowrap px-3 py-1.5 rounded-md text-xs font-medium transition-colors border ${
              isActive
                ? 'bg-slate-900 text-white border-slate-900 font-semibold'
                : 'bg-white text-slate-700 hover:bg-slate-50 border-slate-200'
            }`}
          >
            {label}
          </button>
        );
      })}
    </div>
  );
}
