/**
 * The six civic departments that handle complaints.
 * Department routing is rule-based (labelled "simulated" in UI).
 */
export type Department =
  | 'water_drainage'
  | 'roads'
  | 'sanitation'
  | 'electricity'
  | 'parks'
  | 'traffic';

/** Human-readable labels for UI display. */
export const DEPARTMENT_LABELS: Record<Department, string> = {
  water_drainage: 'Water / Drainage',
  roads: 'Roads',
  sanitation: 'Sanitation',
  electricity: 'Electricity',
  parks: 'Parks',
  traffic: 'Traffic',
};

/** All valid department values, useful for validation. */
export const ALL_DEPARTMENTS: Department[] = Object.keys(DEPARTMENT_LABELS) as Department[];

