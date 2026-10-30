import { NextResponse } from 'next/server';
import { getReport } from '@/lib/firestore/reports';
import { getIncident } from '@/lib/firestore/incidents';
import { getFallbackIncidentsAndReports } from '@/lib/fallbackData';
import type { Report } from '@/types/report';
import type { Incident } from '@/types/incident';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    let report: Report | null = null;
    let incident: Incident | null = null;

    // 1. Try Firestore lookup
    try {
      report = await getReport(id);
      if (report && report.incidentId) {
        incident = await getIncident(report.incidentId);
      }
    } catch (err) {
      console.warn(`Firestore lookup failed for report ${id}, checking fallback data:`, err);
    }

    // 2. Fallback to synthetic seed data if not in Firestore
    if (!report) {
      const { incidents, reportsMap } = getFallbackIncidentsAndReports();
      report = reportsMap.get(id) || null;

      if (report) {
        if (report.incidentId) {
          incident = incidents.find((i) => i.id === report?.incidentId) || null;
        } else {
          // Check if any incident has this report in memberReportIds
          incident = incidents.find((i) => i.memberReportIds.includes(report?.id || '')) || null;
          if (incident) {
            report.incidentId = incident.id;
          }
        }
      }
    }

    if (!report) {
      return NextResponse.json(
        { success: false, error: `Report ${id} not found` },
        { status: 404 }
      );
    }

    // If incident is linked, compute others affected and assigned department
    const othersAffected = incident ? Math.max(0, incident.reportCount - 1) : 0;
    const assignedDepartment = incident?.assignedDepartment || incident?.leadDepartment || report.department || null;
    const assignedCrew = incident?.assignedCrew || null;

    return NextResponse.json({
      success: true,
      report,
      incident,
      othersAffected,
      assignedDepartment,
      assignedCrew,
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Error fetching report tracking data' },
      { status: 500 }
    );
  }
}

