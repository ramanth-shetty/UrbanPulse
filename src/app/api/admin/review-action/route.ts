import { NextResponse } from 'next/server';
import { getReport, updateReport } from '@/lib/firestore/reports';
import { getIncident, updateIncident } from '@/lib/firestore/incidents';
import type { StatusHistoryEntry } from '@/types/status';

/**
 * Handles admin actions on suspicious or low-confidence reports in the Review Queue.
 * Supported actions:
 *  1. 'approve'  -> Clears report from review queue, marks status as 'new'
 *  2. 'merge'    -> Links report to an existing incident
 *  3. 'reject'   -> Dismisses report with a mandatory reason
 *
 * All citizen notifications are labelled as [Mocked Notification].
 */
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { reportId, action, targetIncidentId, rejectReason, adminNote } = body;

    if (!reportId || !action) {
      return NextResponse.json(
        { success: false, error: 'Missing reportId or action' },
        { status: 400 }
      );
    }

    const now = new Date().toISOString();
    let historyEntry: StatusHistoryEntry;
    let mockedNotification = '';
    let updatedReportStatus = 'new';

    if (action === 'approve') {
      updatedReportStatus = 'new';
      historyEntry = {
        status: 'new',
        timestamp: now,
        actor: 'admin',
        note: adminNote || 'Report approved by municipal admin after manual review.',
      };
      mockedNotification = `[Mocked Notification] SMS dispatched to citizen (+91-98800-XXXXX): "Your report ${reportId} has been verified by the municipal review desk and queued for resolution."`;

      // Update Firestore if available
      try {
        const existing = await getReport(reportId);
        if (existing) {
          await updateReport(reportId, {
            status: 'new',
            statusHistory: [...(existing.statusHistory || []), historyEntry],
          });
        }
      } catch (err) {
        console.warn('Firestore update failed for approve:', err);
      }
    } else if (action === 'merge') {
      if (!targetIncidentId) {
        return NextResponse.json(
          { success: false, error: 'targetIncidentId is required for merge action' },
          { status: 400 }
        );
      }

      updatedReportStatus = 'assigned';
      historyEntry = {
        status: 'assigned',
        timestamp: now,
        actor: 'admin',
        note: adminNote || `Merged into ongoing incident ${targetIncidentId} by municipal admin.`,
      };
      mockedNotification = `[Mocked Notification] SMS dispatched to citizen (+91-98800-XXXXX): "Your report ${reportId} has been linked to ongoing municipal incident ${targetIncidentId}. You can track progress under that incident."`;

      // Update Firestore report & incident if available
      try {
        const existingReport = await getReport(reportId);
        if (existingReport) {
          await updateReport(reportId, {
            status: 'assigned',
            incidentId: targetIncidentId,
            statusHistory: [...(existingReport.statusHistory || []), historyEntry],
          });
        }

        const existingIncident = await getIncident(targetIncidentId);
        if (existingIncident) {
          const updatedMembers = Array.from(new Set([...existingIncident.memberReportIds, reportId]));
          const incHistoryEntry: StatusHistoryEntry = {
            status: existingIncident.status,
            timestamp: now,
            actor: 'admin',
            note: `Report ${reportId} manually merged into this incident from review queue.`,
          };
          await updateIncident(targetIncidentId, {
            memberReportIds: updatedMembers,
            reportCount: updatedMembers.length,
            statusHistory: [...(existingIncident.statusHistory || []), incHistoryEntry],
          });
        }
      } catch (err) {
        console.warn('Firestore update failed for merge:', err);
      }
    } else if (action === 'reject') {
      if (!rejectReason) {
        return NextResponse.json(
          { success: false, error: 'A specific reason is required to reject a report' },
          { status: 400 }
        );
      }

      updatedReportStatus = 'rejected';
      historyEntry = {
        status: 'rejected',
        timestamp: now,
        actor: 'admin',
        note: `Dismissed by admin: ${rejectReason}`,
      };
      mockedNotification = `[Mocked Notification] SMS dispatched to citizen (+91-98800-XXXXX): "Your report ${reportId} could not be processed. Reason: ${rejectReason}."`;

      // Update Firestore if available
      try {
        const existing = await getReport(reportId);
        if (existing) {
          await updateReport(reportId, {
            status: 'rejected',
            statusHistory: [...(existing.statusHistory || []), historyEntry],
          });
        }
      } catch (err) {
        console.warn('Firestore update failed for reject:', err);
      }
    } else {
      return NextResponse.json(
        { success: false, error: `Invalid action: ${action}` },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      reportId,
      action,
      updatedReportStatus,
      historyEntry,
      mockedNotification,
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Error processing review action' },
      { status: 500 }
    );
  }
}

