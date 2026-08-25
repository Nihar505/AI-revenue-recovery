import { GoogleGenerativeAI } from '@google/generative-ai';

let genAI = null;
let initError = null;

function getClient() {
  if (genAI) return genAI;
  const key = process.env.GEMINI_API_KEY;
  if (!key) {
    initError = 'GEMINI_API_KEY not set in environment.';
    return null;
  }
  try {
    genAI = new GoogleGenerativeAI(key);
    return genAI;
  } catch (err) {
    initError = err.message;
    return null;
  }
}

// Initialise eagerly so any key-format error shows at startup
getClient();

/**
 * Robust LLM service with structured JSON output and deterministic safety fallback.
 * Uses gemini-2.0-flash which supports the AI Studio key format (AQ. prefix).
 */
export async function callLLM({ prompt, systemInstruction, fallbackFn }) {
  const client = getClient();

  if (client) {
    try {
      const model = client.getGenerativeModel({
        model: 'gemini-2.0-flash',
        systemInstruction: systemInstruction || 'You are an expert fintech AI agent for Razorpay RecoverAI. Always return valid JSON.',
        generationConfig: {
          responseMimeType: 'application/json',
          temperature: 0.1,
          maxOutputTokens: 512,
        },
      });

      const result = await model.generateContent(prompt);
      const text = result.response.text().trim();

      // Strip markdown code fences if the model wraps its response
      const cleaned = text.replace(/^```json\s*/i, '').replace(/```\s*$/i, '').trim();
      return JSON.parse(cleaned);
    } catch (err) {
      console.warn(
        `[LLM] Gemini call failed (${err.message?.slice(0, 80)}). Using deterministic fallback.`
      );
      if (fallbackFn) return fallbackFn();
      throw err;
    }
  }

  // No Gemini key — run deterministic rule engine
  console.info(`[LLM] No Gemini client (${initError}). Using deterministic fallback engine.`);
  if (fallbackFn) return fallbackFn();
  throw new Error('No LLM provider and no fallback specified.');
}
