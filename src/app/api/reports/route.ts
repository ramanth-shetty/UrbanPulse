import { NextResponse } from 'next/server';
import { createReport, getAllReports } from '@/lib/firestore/reports';
import { analyzeReport } from '@/lib/ai/analyzeReport';
import type { Report } from '@/types/report';
import type { StatusHistoryEntry } from '@/types/status';

/**
 * POST /api/reports
 * Creates a new citizen complaint report.
 * Status is set to 'new'.
 *
 * NOTE: AI pipeline is deliberately not called here yet (Phase 3).
 * A clearly marked hook is positioned below for the analysis trigger.
 */
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { text, category, location, imageUrl, address } = body;

    // ── Validation ───────────────────────────────────────────────────
    if (!text || typeof text !== 'string' || text.trim().length < 5) {
      return NextResponse.json(
        { success: false, error: 'Please provide a clear description (at least 5 characters).' },
        { status: 400 }
      );
    }

    if (
      !location ||
      typeof location.lat !== 'number' ||
      typeof location.lng !== 'number' ||
      isNaN(location.lat) ||
      isNaN(location.lng)
    ) {
      return NextResponse.json(
        { success: false, error: 'A valid location pin on the map is required.' },
        { status: 400 }
      );
    }

    // Generate readable Report ID (e.g. RPT-K8Z1A2)
    const randomSuffix = Math.random().toString(36).substring(2, 6).toUpperCase();
    const id = `RPT-${Date.now().toString(36).slice(-4).toUpperCase()}${randomSuffix}`;

    const now = new Date().toISOString();

    const initialStatus: StatusHistoryEntry = {
      status: 'new',
      timestamp: now,
      actor: 'citizen',
      note: address ? `Submitted by citizen at: ${address}` : 'Submitted by citizen via web portal',
    };

    const newReport: Report = {
      id,
      text: text.trim(),
      category: category || 'auto_detect',
      location: {
        lat: Number(location.lat.toFixed(5)),
        lng: Number(location.lng.toFixed(5)),
      },
      imageUrl: imageUrl || null,

      // AI pipeline fields (null until Phase 3)
      aiResult: null,
      fallbackMode: false,
      language: 'unknown',
      translatedText: text.trim(),
      department: null,
      confidence: 0,

      // Fake/spam signals
      fakeScore: 0,
      fakeSignals: {
        textImageMismatch: false,
        noSceneInImage: false,
        rapidRepeatSubmission: false,
        gibberishText: false,
        outOfServiceArea: false,
        reusedImageHash: false,
      },
      fakeReasons: [],
      imageHash: null,

      // Incident linkage (set during Phase 3 cluster detection)
      incidentId: null,

      status: 'new',
      statusHistory: [initialStatus],

      createdAt: now,
      updatedAt: now,
      synthetic: false,
    };

    // Save to Firestore
    await createReport(newReport);

    // ═════════════════════════════════════════════════════════════════
    // ── AI ANALYSIS HOOK (CONNECTED) ────────────────────────────────
    // ═════════════════════════════════════════════════════════════════
    // Automatically runs the server-side analysis pipeline.
    // Handles Gemini text+image, retries, lighter model, and fallback.
    let analysisResult = null;
    try {
      analysisResult = await analyzeReport(newReport.id);
    } catch (analysisErr) {
      console.warn(`Initial analysis on creation failed for ${newReport.id}:`, analysisErr);
      // Even if AI call fails catastrophically, the report remains saved in 'new' status
    }
    // ═════════════════════════════════════════════════════════════════

    return NextResponse.json({
      success: true,
      report: {
        ...newReport,
        aiResult: analysisResult?.analysis || null,
        fallbackMode: analysisResult?.fallbackUsed || false,
      },
      analyzed: !!analysisResult,
      fallbackUsed: analysisResult?.fallbackUsed || false,
    });
  } catch (error) {
    console.error('Error creating report:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to save complaint report',
      },
      { status: 500 }
    );
  }
}

/**
 * GET /api/reports
 * Fetches recent reports
 */
export async function GET() {
  try {
    const reports = await getAllReports();
    return NextResponse.json({ success: true, count: reports.length, reports });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Error fetching reports' },
      { status: 500 }
    );
  }
}

