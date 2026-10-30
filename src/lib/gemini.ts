/**
 * Server-only Gemini configuration.
 *
 * API key is read strictly from process.env.GEMINI_API_KEY on the server.
 * Never exposed to client code or committed.
 */

export function getGeminiApiKey(): string {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey.trim() === '') {
    throw new Error('GEMINI_API_KEY is not defined in environment or .env.local');
  }
  return apiKey.trim();
}

/** Models configured for the analysis pipeline */
export const GEMINI_PRIMARY_MODEL = 'gemini-1.5-flash';
export const GEMINI_LIGHTER_MODEL = 'gemini-1.5-flash-8b';

/**
 * Direct REST API caller for Gemini.
 * Compatible with Node.js fetch and avoids SDK bundling quirks.
 */
export async function callGeminiRest(
  model: string,
  prompt: string,
  imageBase64?: { mimeType: string; data: string } | null,
): Promise<string> {
  const apiKey = getGeminiApiKey();
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

  const parts: any[] = [{ text: prompt }];

  if (imageBase64 && imageBase64.data) {
    parts.push({
      inline_data: {
        mime_type: imageBase64.mimeType || 'image/jpeg',
        data: imageBase64.data,
      },
    });
  }

  const payload = {
    contents: [{ parts }],
    generationConfig: {
      temperature: 0.1, // low temperature for deterministic structured JSON
      response_mime_type: 'application/json',
    },
  };

  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const errorBody = await response.text();
    const status = response.status;
    const error: any = new Error(`Gemini API returned HTTP ${status}: ${errorBody}`);
    error.status = status;
    throw error;
  }

  const json = await response.json();
  const candidate = json.candidates?.[0];
  const textContent = candidate?.content?.parts?.[0]?.text;

  if (!textContent) {
    throw new Error('Empty response from Gemini API');
  }

  return textContent;
}

