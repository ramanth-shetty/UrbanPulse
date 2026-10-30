import type { Department } from '../../types/department.ts';
import type { AIAnalysis } from '../../types/ai.ts';

/**
 * Deterministic rule-based fallback analysis.
 * Triggered when Gemini is unavailable, rate-limited (429), or fails validation.
 * Sets fallbackMode / fallbackUsed to true so the UI can honestly display "fallback mode".
 */
export function ruleBasedFallbackAnalysis(
  text: string,
  userSelectedCategory?: string,
  hasImage: boolean = false,
): { analysis: AIAnalysis; fallbackUsed: true } {
  const lower = text.toLowerCase();

  // 1. Language detection heuristic based on Unicode scripts
  let language: 'en' | 'kn' | 'hi' | 'unknown' = 'en';
  if (/[\u0C80-\u0CFF]/.test(text)) {
    language = 'kn';
  } else if (/[\u0900-\u097F]/.test(text)) {
    language = 'hi';
  }

  // 2. Keyword-based department & category routing
  let department: Department = 'roads';
  let category = userSelectedCategory && userSelectedCategory !== 'auto_detect'
    ? userSelectedCategory
    : 'road_damage';

  if (
    lower.includes('water') ||
    lower.includes('drain') ||
    lower.includes('pipe') ||
    lower.includes('leak') ||
    lower.includes('flood') ||
    lower.includes('sewage') ||
    lower.includes('ಉಕ್ಕಿ') || // overflowing (kn)
    lower.includes('ನೀರು') || // water (kn)
    lower.includes('नाला') || // drain (hi)
    lower.includes('पानी') // water (hi)
  ) {
    department = 'water_drainage';
    category = 'water_drainage';
  } else if (
    lower.includes('wire') ||
    lower.includes('electric') ||
    lower.includes('spark') ||
    lower.includes('shock') ||
    lower.includes('pole') ||
    lower.includes('light') ||
    lower.includes('transformer') ||
    lower.includes('ದೀಪ') || // light (kn)
    lower.includes('ವಿದ್ಯುತ್') || // electricity (kn)
    lower.includes('तार') || // wire (hi)
    lower.includes('बिजली') // electricity (hi)
  ) {
    department = 'electricity';
    category = 'electrical_hazard';
  } else if (
    lower.includes('garbage') ||
    lower.includes('waste') ||
    lower.includes('trash') ||
    lower.includes('dump') ||
    lower.includes('smell') ||
    lower.includes('stench') ||
    lower.includes('filth') ||
    lower.includes('ಕಸ') || // garbage (kn)
    lower.includes('ದುರ್ವಾಸನೆ') || // bad smell (kn)
    lower.includes('कचरा') || // garbage (hi)
    lower.includes('बदबू') // smell (hi)
  ) {
    department = 'sanitation';
    category = 'garbage_dump';
  } else if (
    lower.includes('tree') ||
    lower.includes('branch') ||
    lower.includes('park') ||
    lower.includes('grass') ||
    lower.includes('ಮರ') || // tree (kn)
    lower.includes('ಪಾರ್ಕ್') || // park (kn)
    lower.includes('पेड़') || // tree (hi)
    lower.includes('पार्क') // park (hi)
  ) {
    department = 'parks';
    category = 'park_maintenance';
  } else if (
    lower.includes('traffic') ||
    lower.includes('signal') ||
    lower.includes('junction') ||
    lower.includes('sign') ||
    lower.includes('ಟ್ರಾಫಿಕ್') ||
    lower.includes('ಸಿಗ್ನಲ್') ||
    lower.includes('ट्रैफिक')
  ) {
    department = 'traffic';
    category = 'traffic_issue';
  } else if (
    lower.includes('pothole') ||
    lower.includes('road') ||
    lower.includes('crack') ||
    lower.includes('tar') ||
    lower.includes('manhole') ||
    lower.includes('ರಸ್ತೆ') ||
    lower.includes('ಗುಂಡಿ') ||
    lower.includes('सड़क') ||
    lower.includes('गड्ढा')
  ) {
    department = 'roads';
    category = 'road_damage';
  }

  // 3. Extract severity cues
  const severityCues: string[] = [];
  const cueKeywords = [
    { word: 'danger', cue: 'hazard reported' },
    { word: 'urgent', cue: 'urgency requested' },
    { word: 'live wire', cue: 'live wire danger' },
    { word: 'spark', cue: 'sparking electrical' },
    { word: 'manhole', cue: 'open manhole' },
    { word: 'fall', cue: 'fall hazard' },
    { word: 'hospital', cue: 'near hospital' },
    { word: 'school', cue: 'near school' },
    { word: 'accident', cue: 'accidents reported' },
    { word: 'overflow', cue: 'overflowing drain' },
    { word: 'blocked', cue: 'passage blocked' },
  ];

  for (const item of cueKeywords) {
    if (lower.includes(item.word)) {
      severityCues.push(item.cue);
    }
  }

  // 4. Generate summary
  const summary = text.length > 80 ? `${text.slice(0, 77)}...` : text;

  const analysis: AIAnalysis = {
    language,
    translatedText: text, // In fallback mode, original text is preserved
    category,
    summary: `[Fallback Analysis] ${summary}`,
    imageFindings: hasImage ? 'Image attached (visual analysis pending in fallback mode)' : null,
    severityCues,
    department,
    confidence: 0.65, // Conservative confidence for heuristic fallback
    textImageMismatch: false,
  };

  return {
    analysis,
    fallbackUsed: true,
  };
}
