import { NextResponse } from 'next/server';
import { getReport, updateReport } from '@/lib/firestore/reports';
import { getIncident, updateIncident } from '@/lib/firestore/incidents';
import {
  getFallbackIncidentsAndReports,
  updateFallbackIncident,
  updateFallbackReport,
} from '@/lib/fallbackData';
import type { StatusHistoryEntry } from '@/types/status';
import type { Report } from '@/types/report';
import type { Incident } from '@/types/incident';

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { fixed, note } = body;

    if (typeof fixed !== 'boolean') {
      return NextResponse.json(
        { success: false, error: 'A boolean "fixed" value (true/false) is required.' },
        { status: 400 }
      );
    }

    let report: Report | null = null;
    let incident: Incident | null = null;

    // 1. Fetch report and incident from Firestore
    try {
      report = await getReport(id);
      if (report && report.incidentId) {
        incident = await getIncident(report.incidentId);
      }
    } catch (err) {
      console.warn(`Firestore read failed for verification of ${id}:`, err);
    }

    // Fallback if not found in Firestore
    if (!report) {
      const { incidents, reportsMap } = getFallbackIncidentsAndReports();
      report = reportsMap.get(id) || null;
      if (report) {
        incident = incidents.find((i) => i.id === report?.incidentId || i.memberReportIds.includes(report?.id || '')) || null;
      }
    }

    if (!report) {
      return NextResponse.json(
        { success: false, error: `Report ${id} not found` },
        { status: 404 }
      );
    }

    const now = new Date().toISOString();
    let mockedNotification = '';
    let reportHistoryEntry: StatusHistoryEntry;
    let incidentHistoryEntry: StatusHistoryEntry | null = null;
    let updatedPriority = incident ? incident.priorityScore : report.fakeScore;

    if (fixed) {
      // ── Citizen Verified Fix ─────────────────────────────────────────
      reportHistoryEntry = {
        status: 'citizen_verified',
        timestamp: now,
        actor: 'citizen',
        note: note ? `Citizen verified fix: "${note}"` : 'Citizen inspected on-site and confirmed issue is fully resolved.',
      };

      mockedNotification = `[Mocked Notification] SMS dispatched to citizen (+91-98800-XXXXX): "Thank you! Your verification confirms the municipal fix for report ${id}. Status: Citizen-Verified."`;

      // Update report
      try {
        await updateReport(id, {
          status: 'citizen_verified',
          statusHistory: [...(report.statusHistory || []), reportHistoryEntry],
        });
      } catch (err) {
        console.warn('Firestore report update failed, updating fallback cache');
      }
      updateFallbackReport(id, {
        status: 'citizen_verified',
        statusHistory: [...(report.statusHistory || []), reportHistoryEntry],
      });

      // Update incident if linked
      if (incident) {
        incidentHistoryEntry = {
          status: 'citizen_verified',
          timestamp: now,
          actor: 'citizen',
          note: `Citizen on-site inspection confirmed fix. Incident marked citizen-verified.`,
        };

        try {
          await updateIncident(incident.id, {
            status: 'citizen_verified',
            verificationStatus: 'verified',
            statusHistory: [...(incident.statusHistory || []), incidentHistoryEntry],
          });
        } catch (err) {
          console.warn('Firestore incident update failed, updating fallback cache');
        }
        updateFallbackIncident(incident.id, {
          status: 'citizen_verified',
          verificationStatus: 'verified',
          statusHistory: [...(incident.statusHistory || []), incidentHistoryEntry],
        });
      }
    } else {
      // ── Citizen Disputed Resolution (Reopen) ──────────────────────────
      // Raise priority: +20 points (up to 100), flag closure as unreliable, reopen incident
      const currentScore = incident ? incident.priorityScore : 60;
      updatedPriority = Math.min(100, currentScore + 20);

      reportHistoryEntry = {
        status: 'reopened',
        timestamp: now,
        actor: 'citizen',
        note: note
          ? `Citizen reported NOT fixed: "${note}". Reopened with escalated priority.`
          : 'Citizen inspected on-site and reported issue is NOT resolved. Reopened with escalated priority.',
      };

      const deptName = incident?.assignedDepartment || incident?.leadDepartment || report.department || 'Municipal Division';
      const crewName = incident?.assignedCrew || 'Duty Supervisor';

      mockedNotification = `[Mocked Notification] Supervisor Urgent Alert: Incident ${incident ? incident.id : id} reopened by citizen on-site dispute. Closure marked UNRELIABLE. Priority escalated from ${currentScore} to ${updatedPriority}. Dispatched to ${deptName} (${crewName}).`;

      // Update report
      try {
        await updateReport(id, {
          status: 'reopened',
          statusHistory: [...(report.statusHistory || []), reportHistoryEntry],
        });
      } catch (err) {
        console.warn('Firestore report update failed, updating fallback cache');
      }
      updateFallbackReport(id, {
        status: 'reopened',
        statusHistory: [...(report.statusHistory || []), reportHistoryEntry],
      });

      // Update incident if linked
      if (incident) {
        incidentHistoryEntry = {
          status: 'reopened',
          timestamp: now,
          actor: 'citizen',
          note: note
            ? `Citizen disputed resolution: "${note}". Incident reopened, closure marked UNRELIABLE, priority escalated to ${updatedPriority}/100.`
            : `Citizen reported issue is NOT resolved on-site. Incident reopened, closure marked UNRELIABLE, priority escalated to ${updatedPriority}/100.`,
        };

        const updatedFactors = {
          ...incident.priorityFactors,
          recurrenceHistory: 1.0,
        };

        try {
          await updateIncident(incident.id, {
            status: 'reopened',
            verificationStatus: 'disputed',
            closureUnreliable: true,
            priorityScore: updatedPriority,
            priorityFactors: updatedFactors,
            statusHistory: [...(incident.statusHistory || []), incidentHistoryEntry],
          });
        } catch (err) {
          console.warn('Firestore incident update failed, updating fallback cache');
        }
        updateFallbackIncident(incident.id, {
          status: 'reopened',
          verificationStatus: 'disputed',
          closureUnreliable: true,
          priorityScore: updatedPriority,
          priorityFactors: updatedFactors,
          statusHistory: [...(incident.statusHistory || []), incidentHistoryEntry],
        });
      }
    }

    return NextResponse.json({
      success: true,
      fixed,
      reportStatus: fixed ? 'citizen_verified' : 'reopened',
      incidentStatus: fixed ? 'citizen_verified' : 'reopened',
      closureUnreliable: !fixed,
      priorityScore: updatedPriority,
      historyEntry: reportHistoryEntry,
      incidentHistoryEntry,
      mockedNotification,
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Error processing citizen verification' },
      { status: 500 }
    );
  }
}

