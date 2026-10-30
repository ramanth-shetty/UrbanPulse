import { NextResponse } from 'next/server';
import { seedDatabase } from '@/scripts/seed';

/**
 * GET /api/seed
 *
 * Loads synthetic seed data into Firestore.
 * All data is marked synthetic: true.
 *
 * Command: curl http://localhost:3000/api/seed
 * Or open the URL in your browser.
 */
export async function GET() {
  try {
    const result = await seedDatabase();

    return NextResponse.json({
      success: true,
      message: `Seeded ${result.reports} reports and ${result.incidents} incidents (all marked synthetic).`,
      ...result,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('Seed failed:', message);

    return NextResponse.json(
      { success: false, error: message },
      { status: 500 },
    );
  }
}

