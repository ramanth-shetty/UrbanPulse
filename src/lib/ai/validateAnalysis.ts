import { ALL_DEPARTMENTS, Department } from '../../types/department';
import { AIAnalysis } from '../../types/ai';

/**
 * Validates and sanitizes raw JSON parsed from Gemini response.
 * Throws a detailed error if required fields are missing or invalid.
 */
export function validateAnalysis(raw: any, originalText: string): AIAnalysis {
  if (!raw || typeof raw !== 'object') {
    throw new Error('Gemini response is not a valid JSON object');
  }

  // 1. Language validation
  let language: 'en' | 'kn' | 'hi' | 'unknown' = 'unknown';
  if (['en', 'kn', 'hi', 'unknown'].includes(raw.language)) {
    language = raw.language;
  }

  // 2. Translated text
  const translatedText =
    typeof raw.translatedText === 'string' && raw.translatedText.trim()
      ? raw.translatedText.trim()
      : originalText;

  // 3. Category & Summary
  const category =
    typeof raw.category === 'string' && raw.category.trim()
      ? raw.category.trim().toLowerCase()
      : 'general_complaint';

  const summary =
    typeof raw.summary === 'string' && raw.summary.trim()
      ? raw.summary.trim()
      : originalText.slice(0, 100);

  // 4. Image findings
  const imageFindings =
    typeof raw.imageFindings === 'string' && raw.imageFindings.trim()
      ? raw.imageFindings.trim()
      : null;

  // 5. Severity cues
  let severityCues: string[] = [];
  if (Array.isArray(raw.severityCues)) {
    severityCues = raw.severityCues
      .filter((c: any) => typeof c === 'string' && c.trim())
      .map((c: string) => c.trim().toLowerCase());
  }

  // 6. Department validation (must be one of the 6 civic departments)
  let department: Department = 'roads'; // fallback default
  const deptStr = String(raw.department || '').toLowerCase().replace(/[^a-z_]/g, '');

  if (ALL_DEPARTMENTS.includes(deptStr as Department)) {
    department = deptStr as Department;
  } else {
    // Fuzzy match department
    if (deptStr.includes('water') || deptStr.includes('drain')) department = 'water_drainage';
    else if (deptStr.includes('road') || deptStr.includes('pothole')) department = 'roads';
    else if (deptStr.includes('sanitat') || deptStr.includes('garbag') || deptStr.includes('waste')) department = 'sanitation';
    else if (deptStr.includes('elect') || deptStr.includes('power') || deptStr.includes('light')) department = 'electricity';
    else if (deptStr.includes('park') || deptStr.includes('tree')) department = 'parks';
    else if (deptStr.includes('traffic') || deptStr.includes('signal')) department = 'traffic';
  }

  // 7. Confidence (clamped between 0 and 1)
  let confidence = Number(raw.confidence);
  if (isNaN(confidence) || confidence < 0) confidence = 0.5;
  if (confidence > 1) confidence = 1;

  // 8. Text-Image Mismatch
  const textImageMismatch = Boolean(raw.textImageMismatch);

  return {
    language,
    translatedText,
    category,
    summary,
    imageFindings,
    severityCues,
    department,
    confidence: Number(confidence.toFixed(2)),
    textImageMismatch,
  };
}
