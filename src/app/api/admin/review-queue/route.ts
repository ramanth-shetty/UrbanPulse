import { NextResponse } from 'next/server';
import { getReviewQueueReports, getAllReports } from '@/lib/firestore/reports';
import { getAllIncidents } from '@/lib/firestore/incidents';
import seedReportsData from '@/data/seedReports.json';
import type { Report } from '@/types/report';
import type { Incident } from '@/types/incident';

export async function GET() {
  try {
    let reviewReports: Report[] = [];
    let incidents: Incident[] = [];

    // Attempt live Firestore read
    try {
      reviewReports = await getReviewQueueReports(60);
      incidents = await getAllIncidents();
    } catch (err) {
      console.warn('Firestore read failed for review queue, loading synthetic seed candidates:', err);
    }

    // Fallback to synthetic reports if DB is empty or uninitialized
    if (!reviewReports || reviewReports.length === 0) {
      const allSeed = seedReportsData as any[];
      reviewReports = allSeed
        .filter((r) => r.fakeScore >= 60 || r.confidence < 0.50)
        .map((r) => ({
          ...r,
          location: { lat: r.lat, lng: r.lng },
          translatedText: r.translatedText || r.text,
          status: 'under_review',
          statusHistory: [
            {
              status: 'under_review',
              timestamp: r.createdAt,
              actor: 'system',
              note: `Flagged for human triage (Suspicion Score: ${r.fakeScore}/100) — Never auto-rejected`,
            },
          ],
        }));
    }

    // If incidents list was empty, fetch from /api/incidents
    if (!incidents || incidents.length === 0) {
      try {
        const incRes = await fetch(`${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/incidents`);
        const incData = await incRes.json();
        if (incData.success) {
          incidents = incData.incidents || [];
        }
      } catch (incErr) {
        // Safe empty array fallback
        incidents = [];
      }
    }

    return NextResponse.json({
      success: true,
      count: reviewReports.length,
      reports: reviewReports,
      incidents: incidents.map((i) => ({
        id: i.id,
        mergedSummary: i.mergedSummary.slice(0, 70),
        leadDepartment: i.leadDepartment,
        priorityScore: i.priorityScore,
        reportCount: i.reportCount,
      })),
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Error fetching review queue' },
      { status: 500 }
    );
  }
}

