import { GoogleGenAI } from '@google/genai';
import fs from 'fs';
import path from 'path';
import { buildLocalInsights } from './insights.js';

function getModel() {
  // 2.0-flash has a separate free-tier quota from 2.5-flash
  return process.env.GEMINI_MODEL || 'gemini-2.0-flash';
}

/** Turn Gemini SDK errors into short user-facing messages */
export function formatGeminiError(err) {
  const raw = err?.message || String(err);
  const lower = raw.toLowerCase();

  if (
    lower.includes('resource_exhausted') ||
    lower.includes('429') ||
    lower.includes('quota') ||
    lower.includes('rate limit')
  ) {
    return {
      status: 429,
      message:
        'Gemini API daily limit reached on the free plan. Wait until tomorrow, enable billing in Google AI Studio, or set GEMINI_MODEL=gemini-2.0-flash in your .env and restart the server.',
    };
  }

  if (lower.includes('api key') || lower.includes('401') || lower.includes('403')) {
    return { status: 401, message: 'Invalid or missing Gemini API key. Check GOOGLE_API_KEY in your .env file.' };
  }

  if (lower.includes('not found') && lower.includes('model')) {
    return {
      status: 400,
      message: `Model not available. Try GEMINI_MODEL=gemini-2.0-flash in your .env file.`,
    };
  }

  return { status: 500, message: 'AI request failed. Please try again in a moment.' };
}

function getClient() {
  const apiKey =
    process.env.GOOGLE_API_KEY ||
    process.env.GEMINI_API_KEY ||
    process.env.GOOGLE_GENERATIVE_AI_API_KEY;
  if (!apiKey) {
    throw new Error(
      'Missing API key. Set GOOGLE_API_KEY (or GEMINI_API_KEY) in your .env file.'
    );
  }
  return new GoogleGenAI({ apiKey });
}

function parseJsonFromModelText(text) {
  if (!text || typeof text !== 'string') {
    throw new Error('Empty model response');
  }
  const trimmed = text.trim();
  const block = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const candidate = (block ? block[1] : trimmed).trim();
  return JSON.parse(candidate);
}

/**
 * @param {Buffer} imageBuffer
 * @param {string} mimeType e.g. image/jpeg
 */
export async function extractExpenseFromImage(imageBuffer, mimeType) {
  const ai = getClient();
  const model = getModel();

  const imagePart = {
    inlineData: {
      data: imageBuffer.toString('base64'),
      mimeType,
    },
  };

  const prompt = `You are a receipt and bill reader. Look at this image and extract expense details.

Return ONLY valid JSON (no markdown outside the JSON) with exactly these keys:
- "shopName": string (merchant or store name; use "Unknown" if unclear)
- "amount": number (total paid, use a single number in the receipt's main currency; no currency symbols)
- "date": string as ISO 8601 date only YYYY-MM-DD (best guess from receipt; if missing use today's date conceptually as unknown — use a reasonable guess)
- "category": exactly one of: Food, Travel, Shopping, Education, Bills, Other
- "summary": one short friendly sentence describing this expense for the user (e.g. "Coffee and pastry at a café.")

Rules for category:
- Food: restaurants, groceries, cafes
- Travel: fuel, flights, hotels, transit tickets
- Shopping: clothes, electronics, general retail
- Education: courses, books, tuition
- Bills: utilities, rent-like charges, subscriptions labeled as bills
- Other: if none fit well

JSON only.`;

  let response;
  try {
    response = await ai.models.generateContent({
      model,
      contents: [imagePart, { text: prompt }],
    });
  } catch (err) {
    const { message } = formatGeminiError(err);
    throw new Error(message);
  }

  const text = response.text;
  let data;
  try {
    data = parseJsonFromModelText(text);
  } catch {
    data = JSON.parse(text);
  }

  const allowed = ['Food', 'Travel', 'Shopping', 'Education', 'Bills', 'Other'];
  let category = typeof data.category === 'string' ? data.category.trim() : 'Other';
  if (!allowed.includes(category)) {
    category = 'Other';
  }

  const amount = Number(data.amount);
  if (!Number.isFinite(amount) || amount < 0) {
    throw new Error('Model did not return a valid amount');
  }

  let date = new Date(data.date);
  if (Number.isNaN(date.getTime())) {
    date = new Date();
  }

  return {
    shopName: String(data.shopName || 'Unknown').slice(0, 200),
    amount,
    date,
    category,
    summary: String(data.summary || '').slice(0, 500),
  };
}

/**
 * @param {Array<{ category: string, amount: number, shopName?: string, date?: Date }>} expenses
 */
export async function generateSpendingInsights(expenses) {
  if (!expenses.length) {
    return { insights: buildLocalInsights(expenses), source: 'local' };
  }

  const ai = getClient();
  const model = getModel();

  const lines = expenses.map((e) => ({
    shopName: e.shopName,
    amount: e.amount,
    category: e.category,
    date: e.date instanceof Date ? e.date.toISOString().slice(0, 10) : e.date,
  }));

  const prompt = `You are a friendly budget coach. Given this list of expenses (JSON), write 2 or 3 very short sentences about spending patterns. Mention which category they spend most on if clear, and whether something like travel or shopping seems high relative to the rest. Be conversational. Do not use bullet points. Do not include numbers unless helpful. JSON data:\n${JSON.stringify(lines)}`;

  try {
    const response = await ai.models.generateContent({
      model,
      contents: prompt,
    });
    const text = (response.text || '').trim();
    if (text) {
      return { insights: text, source: 'ai' };
    }
  } catch (err) {
    const { status } = formatGeminiError(err);
    if (status === 429) {
      return {
        insights: buildLocalInsights(expenses),
        source: 'local',
        notice:
          'AI quota reached — showing a basic summary. New uploads may work tomorrow or with gemini-2.0-flash.',
      };
    }
    console.error('Insights AI failed:', err.message?.slice(0, 200));
  }

  return { insights: buildLocalInsights(expenses), source: 'local' };
}

/** Delete legacy disk uploads only (data URLs are stored in MongoDB on Vercel) */
export function safeUnlinkUpload(imagePathFromDb) {
  if (!imagePathFromDb || imagePathFromDb.startsWith('data:')) return;
  const base = path.join(process.cwd(), 'uploads');
  const filename = path.basename(imagePathFromDb);
  const full = path.join(base, filename);
  if (!full.startsWith(base)) return;
  fs.unlink(full, () => {});
}
