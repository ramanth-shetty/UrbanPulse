import { NextResponse } from 'next/server';
import { getIncident, updateIncident } from '@/lib/firestore/incidents';
import { getReportsByIncident, getReport } from '@/lib/firestore/reports';
import { getFallbackIncidentsAndReports, updateFallbackIncident } from '@/lib/fallbackData';
import type { Incident } from '@/types/incident';
import type { Report } from '@/types/report';
import type { IncidentStatus, StatusHistoryEntry } from '@/types/status';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    let incident: Incident | null = null;
    let memberReports: Report[] = [];

    try {
      incident = await getIncident(id);
      if (incident) {
        memberReports = await getReportsByIncident(id);
      }
    } catch (err) {
      console.warn(`Firestore lookup failed for incident ${id}, checking fallback data`);
    }

    // Fallback lookup from seed data if not found in live DB
    if (!incident) {
      const { incidents, reportsMap } = getFallbackIncidentsAndReports();
      incident = incidents.find((inc) => inc.id === id) || null;

      if (incident) {
        memberReports = incident.memberReportIds
          .map((rid) => reportsMap.get(rid))
          .filter(Boolean) as Report[];
      }
    }

    if (!incident) {
      return NextResponse.json(
        { success: false, error: 'Incident not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      incident,
      memberReports,
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Error fetching incident details' },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { status, assignedDepartment, assignedCrew, note } = body;

    const validStatuses: IncidentStatus[] = [
      'new',
      'under_review',
      'assigned',
      'in_progress',
      'resolved',
      'citizen_verified',
      'reopened',
    ];

    if (!status || !validStatuses.includes(status)) {
      return NextResponse.json(
        { success: false, error: `Invalid status: ${status}` },
        { status: 400 }
      );
    }

    const now = new Date().toISOString();
    let historyNote = note;
    if (!historyNote) {
      if (assignedCrew) {
        historyNote = `Assigned to ${assignedDepartment || 'field'} crew: "${assignedCrew}" by municipal admin`;
      } else {
        historyNote = `Status transitioned to ${status.replace('_', ' ')} by municipal operator`;
      }
    }

    const historyEntry: StatusHistoryEntry = {
      status,
      timestamp: now,
      actor: 'admin',
      note: historyNote,
    };

    let mockedNotification = `[Mocked Notification] Status update: Incident ${id} transitioned to ${status.replace('_', ' ')}.`;
    if (assignedCrew) {
      mockedNotification = `[Mocked Notification] Crew dispatched: Alert sent to ${assignedCrew} (${assignedDepartment || 'Field Crew'}) for Incident ${id}.`;
    } else if (status === 'resolved') {
      mockedNotification = `[Mocked Notification] Citizen broadcast: Incident ${id} marked resolved. Citizen verification survey dispatched to linked reporters.`;
    }

    let updated = false;
    try {
      const existing = await getIncident(id);
      if (existing) {
        const updateFields: Partial<Incident> = {
          status,
          statusHistory: [...(existing.statusHistory || []), historyEntry],
        };
        if (assignedDepartment) updateFields.assignedDepartment = assignedDepartment;
        if (assignedCrew) updateFields.assignedCrew = assignedCrew;

        await updateIncident(id, updateFields);
        updated = true;
      }
    } catch (err) {
      console.warn('Could not update Firestore incident:', err);
    }

    // Always update fallback cache as well
    const fallbackUpdateFields: Partial<Incident> = {
      status,
    };
    if (assignedDepartment) fallbackUpdateFields.assignedDepartment = assignedDepartment;
    if (assignedCrew) fallbackUpdateFields.assignedCrew = assignedCrew;
    updateFallbackIncident(id, fallbackUpdateFields);

    return NextResponse.json({
      success: true,
      id,
      status,
      assignedDepartment: assignedDepartment || null,
      assignedCrew: assignedCrew || null,
      updatedInDb: updated,
      historyEntry,
      mockedNotification,
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Error updating incident' },
      { status: 500 }
    );
  }
}

