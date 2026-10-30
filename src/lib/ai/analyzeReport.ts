import { getReport, updateReport } from '../firestore/reports';
import { callGeminiRest, GEMINI_PRIMARY_MODEL, GEMINI_LIGHTER_MODEL } from '../gemini';
import { validateAnalysis } from './validateAnalysis';
import { ruleBasedFallbackAnalysis } from './fallbackAnalysis';
import { AIAnalysis } from '../../types/ai';
import { Report } from '../../types/report';

export interface AnalyzeResult {
  analysis: AIAnalysis;
  fallbackUsed: boolean;
  cached: boolean;
}

/** Helper to pause execution */
const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/** Fetch image from URL and convert to base64 inline part */
async function fetchImageAsBase64(
  imageUrl: string,
): Promise<{ mimeType: string; data: string } | null> {
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 6000); // 6s timeout

    const res = await fetch(imageUrl, { signal: controller.signal });
    clearTimeout(timer);

    if (!res.ok) return null;

    const mimeType = res.headers.get('content-type') || 'image/jpeg';
    const arrayBuffer = await res.arrayBuffer();
    const base64Data = Buffer.from(arrayBuffer).toString('base64');

    return { mimeType, data: base64Data };
  } catch (err) {
    console.warn(`Could not download image for analysis (${imageUrl}):`, err);
    return null;
  }
}

/**
 * Builds the strict structured prompt for Gemini.
 */
function buildAnalysisPrompt(text: string, category: string, hasImage: boolean): string {
  return `You are the AI civic triage engine for UrbanPulse in Mysuru, India.
Analyze the citizen complaint below. The complaint may be in English, Kannada, or Hindi.

Citizen Report Text:
"${text}"

Citizen Selected Category:
"${category}"

${hasImage ? 'A photo has been attached by the citizen. Analyze both the text and the photo.' : 'No photo is attached.'}

Return ONLY a valid JSON object matching this TypeScript interface without any markdown backticks or commentary:
{
  "language": "en" | "kn" | "hi" | "unknown",
  "translatedText": string (clear English translation, or original text if already English),
  "category": "water_drainage" | "road_damage" | "garbage_dump" | "electrical_hazard" | "park_maintenance" | "traffic_issue",
  "summary": string (1-sentence concise English summary of the issue),
  "imageFindings": string | null (findings visible in the photo, or null if no photo),
  "severityCues": string[] (concrete danger/hazard cues, e.g. ["live wire", "open manhole", "hospital access"]),
  "department": "water_drainage" | "roads" | "sanitation" | "electricity" | "parks" | "traffic",
  "confidence": number (float between 0.0 and 1.0),
  "textImageMismatch": boolean (true if photo does not match text, e.g. food menu submitted for a pothole)
}`;
}

/**
 * Analyzes a report using Gemini with retry, lighter model, and rule-based fallback.
 * Strictly respects cache: if aiResult is already present, returns cached result.
 */
export async function analyzeReport(reportId: string): Promise<AnalyzeResult> {
  // 1. Fetch report from Firestore
  const report = await getReport(reportId);
  if (!report) {
    throw new Error(`Report with ID ${reportId} not found`);
  }

  // 2. Cache Check: never reprocess if already analyzed
  if (report.aiResult) {
    return {
      analysis: report.aiResult,
      fallbackUsed: report.fallbackMode || false,
      cached: true,
    };
  }

  // 3. Prepare Image data if available
  let imageBase64: { mimeType: string; data: string } | null = null;
  if (report.imageUrl) {
    imageBase64 = await fetchImageAsBase64(report.imageUrl);
  }

  const prompt = buildAnalysisPrompt(report.text, report.category, !!imageBase64);

  let rawJsonText: string | null = null;
  let fallbackUsed = false;

  // 4. Multi-stage execution:
  // Step 4a: Primary Model (gemini-1.5-flash)
  try {
    rawJsonText = await callGeminiRest(GEMINI_PRIMARY_MODEL, prompt, imageBase64);
  } catch (err: any) {
    console.warn(`Primary Gemini call failed for ${reportId}:`, err?.message || err);

    // Step 4b: Retry primary model once after short delay (1500ms)
    try {
      await delay(1500);
      rawJsonText = await callGeminiRest(GEMINI_PRIMARY_MODEL, prompt, imageBase64);
    } catch (retryErr: any) {
      console.warn(`Primary Gemini retry failed for ${reportId}:`, retryErr?.message || retryErr);

      // Step 4c: Attempt lighter model (gemini-1.5-flash-8b)
      try {
        await delay(1000);
        rawJsonText = await callGeminiRest(GEMINI_LIGHTER_MODEL, prompt, imageBase64);
      } catch (lighterErr: any) {
        console.warn(`Lighter Gemini model failed for ${reportId}:`, lighterErr?.message || lighterErr);
        // All LLM attempts failed; proceed to rule-based fallback
        fallbackUsed = true;
      }
    }
  }

  let finalAnalysis: AIAnalysis;

  if (rawJsonText && !fallbackUsed) {
    try {
      // Strip markdown code fences if present
      const cleanJson = rawJsonText.replace(/```json\n?|```/g, '').trim();
      const parsed = JSON.parse(cleanJson);
      finalAnalysis = validateAnalysis(parsed, report.text);
    } catch (parseErr) {
      console.warn(`JSON validation failed for ${reportId}, switching to fallback:`, parseErr);
      const fallback = ruleBasedFallbackAnalysis(report.text, report.category, !!report.imageUrl);
      finalAnalysis = fallback.analysis;
      fallbackUsed = true;
    }
  } else {
    // Step 4d: Deterministic rule-based keyword fallback
    const fallback = ruleBasedFallbackAnalysis(report.text, report.category, !!report.imageUrl);
    finalAnalysis = fallback.analysis;
    fallbackUsed = true;
  }

  // 5. Update Firestore with cached result
  await updateReport(report.id, {
    aiResult: finalAnalysis,
    fallbackMode: fallbackUsed,
    language: finalAnalysis.language,
    translatedText: finalAnalysis.translatedText,
    department: finalAnalysis.department,
    confidence: finalAnalysis.confidence,
  });

  return {
    analysis: finalAnalysis,
    fallbackUsed,
    cached: false,
  };
}
