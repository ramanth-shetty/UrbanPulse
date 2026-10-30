/**
 * Status flow for individual reports.
 * Reports mirror their parent incident's status, but also track
 * citizen verification independently.
 */
export type ReportStatus =
  | 'new'
  | 'under_review'    // flagged for human review (high suspicion score)
  | 'assigned'
  | 'in_progress'
  | 'resolved'
  | 'citizen_verified' // citizen confirmed the fix
  | 'reopened'         // citizen said "not fixed"
  | 'rejected'         // manually dismissed by admin in review queue with reason
  | 'dismissed';

/**
 * Status flow for incidents (aggregated from reports).
 * New -> Under Review -> Assigned -> In Progress -> Resolved -> Citizen-Verified
 */
export type IncidentStatus =
  | 'new'
  | 'under_review'
  | 'assigned'
  | 'in_progress'
  | 'resolved'
  | 'citizen_verified'
  | 'reopened'
  | 'rejected'
  | 'dismissed';

/**
 * One entry in the status timeline.
 * Shown to citizens on their tracking page.
 */
export interface StatusHistoryEntry {
  status: ReportStatus | IncidentStatus;
  timestamp: string;  // ISO 8601
  /** Who or what triggered the change (e.g. "system", "admin", "citizen"). */
  actor: 'system' | 'admin' | 'citizen';
  /** Optional note, e.g. "Citizen reported issue not fixed". */
  note?: string;
}

