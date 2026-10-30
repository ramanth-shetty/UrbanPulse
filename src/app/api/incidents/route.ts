import { NextResponse } from 'next/server';
import { getAllIncidents } from '@/lib/firestore/incidents';
import { getReviewQueueReports } from '@/lib/firestore/reports';
import { getFallbackIncidentsAndReports } from '@/lib/fallbackData';
import type { Incident } from '@/types/incident';

function getFallbackIncidents(): Incident[] {
  return getFallbackIncidentsAndReports().incidents;
}

/**
 * GET /api/incidents
 * Returns incidents list and summary metrics.
 * Supports query params: ?department=water_drainage
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const departmentFilter = searchParams.get('department');

    let incidents: Incident[] = [];
    let reviewQueueCount = 3; // Default synthetic review queue count

    try {
      incidents = await getAllIncidents();
      const reviewReports = await getReviewQueueReports(60);
      reviewQueueCount = reviewReports.length;
    } catch (dbErr) {
      console.warn('Firestore fetch failed, serving pre-computed synthetic incidents:', dbErr);
      incidents = getFallbackIncidents();
    }

    if (!incidents || incidents.length === 0) {
      incidents = getFallbackIncidents();
    }

    // Compute summary metrics across all incidents before department filtering
    const totalOpen = incidents.filter((i) => i.status !== 'resolved' && i.status !== 'citizen_verified').length;
    const criticalCount = incidents.filter((i) => i.priorityScore >= 80).length;

    // Apply department filter if requested
    if (departmentFilter && departmentFilter !== 'all') {
      incidents = incidents.filter(
        (i) => i.leadDepartment === departmentFilter || i.supportingDepartments.includes(departmentFilter as any)
      );
    }

    return NextResponse.json({
      success: true,
      count: incidents.length,
      counters: {
        totalOpen,
        criticalCount,
        reviewQueueCount,
      },
      incidents,
    });
  } catch (error) {
    console.error('Error fetching incidents:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Error fetching incidents' },
      { status: 500 }
    );
  }
}

