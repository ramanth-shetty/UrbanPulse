import { NextResponse } from 'next/server';
import { analyzeReport } from '@/lib/ai/analyzeReport';

/**
 * POST /api/reports/[id]/analyze
 *
 * Analyzes one report using Gemini (text + image).
 * - Returns strict JSON adhering to AIAnalysis.
 * - Validates schema.
 * - Handles retry -> lighter model -> rule-based fallback.
 * - Caches result in Firestore; never reprocesses if already cached.
 * - API key read strictly from .env.local on the server.
 */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;

    if (!id || typeof id !== 'string') {
      return NextResponse.json(
        { success: false, error: 'Report ID is required' },
        { status: 400 },
      );
    }

    const result = await analyzeReport(id);

    return NextResponse.json({
      success: true,
      reportId: id,
      cached: result.cached,
      fallbackUsed: result.fallbackUsed,
      analysis: result.analysis,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown analysis error';
    console.error('Report analysis error:', message);

    return NextResponse.json(
      {
        success: false,
        error: message,
      },
      { status: 500 },
    );
  }
}

