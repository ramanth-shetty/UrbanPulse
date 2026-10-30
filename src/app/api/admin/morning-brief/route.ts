import { NextResponse } from 'next/server';
import { getAllIncidents } from '@/lib/firestore/incidents';
import { getFallbackIncidentsAndReports } from '@/lib/fallbackData';
import { generateMorningBrief, type MorningBrief } from '@/lib/ai/morningBrief';
import { ALL_DEPARTMENTS, type Department } from '@/types/department';
import type { Incident } from '@/types/incident';

// In-memory cache for morning briefs: key is department
const BRIEF_CACHE = new Map<Department, { brief: MorningBrief; timestamp: number }>();
const CACHE_TTL_MS = 30 * 60 * 1000; // 30 minutes cache

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const deptParam = (searchParams.get('department') || 'roads') as Department;
    const forceRefresh = searchParams.get('refresh') === 'true';

    if (!ALL_DEPARTMENTS.includes(deptParam)) {
      return NextResponse.json(
        { success: false, error: `Invalid department: ${deptParam}. Valid: ${ALL_DEPARTMENTS.join(', ')}` },
        { status: 400 }
      );
    }

    const now = Date.now();
    const cachedEntry = BRIEF_CACHE.get(deptParam);

    // Return cached brief if available and not forced refresh
    if (!forceRefresh && cachedEntry && now - cachedEntry.timestamp < CACHE_TTL_MS) {
      return NextResponse.json({
        success: true,
        cached: true,
        cachedAt: new Date(cachedEntry.timestamp).toISOString(),
        brief: cachedEntry.brief,
      });
    }

    // 1. Fetch all incidents (Firestore or fallback seed data)
    let allIncidents: Incident[] = [];
    try {
      allIncidents = await getAllIncidents();
    } catch (err) {
      console.warn('Firestore read failed for morning brief, checking fallback:', err);
    }

    if (!allIncidents || allIncidents.length === 0) {
      allIncidents = getFallbackIncidentsAndReports().incidents;
    }

    // 2. Filter incidents for this department
    const deptIncidents = allIncidents.filter(
      (inc) => inc.leadDepartment === deptParam || inc.supportingDepartments?.includes(deptParam)
    );

    // Prefer unresolved/reopened incidents, but fallback to all if all are resolved
    const activeDeptIncidents = deptIncidents.filter(
      (inc) => inc.status !== 'resolved' && inc.status !== 'citizen_verified'
    );

    const pool = activeDeptIncidents.length > 0 ? activeDeptIncidents : deptIncidents;

    // 3. Sort deterministically by priorityScore descending and pick top 3
    const top3 = pool
      .slice()
      .sort((a, b) => b.priorityScore - a.priorityScore)
      .slice(0, 3);

    // 4. Generate morning brief (Gemini with template fallback)
    const brief = await generateMorningBrief(deptParam, top3);

    // 5. Store in cache
    BRIEF_CACHE.set(deptParam, {
      brief,
      timestamp: now,
    });

    return NextResponse.json({
      success: true,
      cached: false,
      brief,
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Error generating morning brief' },
      { status: 500 }
    );
  }
}

