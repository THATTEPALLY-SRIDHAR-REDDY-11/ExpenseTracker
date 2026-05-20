import Groq from "groq-sdk";
import fs from 'fs';
import path from 'path';
import { buildLocalInsights } from './insights.js';
import { traceable } from 'langsmith/traceable';

function getClient() {
  if (!process.env.GROQ_API_KEY) {
    throw new Error('Missing API key. Set GROQ_API_KEY in your .env file or Vercel settings.');
  }
  return new Groq({
    apiKey: process.env.GROQ_API_KEY
  });
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

export const extractExpenseFromImage = traceable(async function extractExpenseFromImage(imageBuffer, mimeType) {
  if (!imageBuffer || imageBuffer.length === 0) {
    throw new Error("Invalid image data provided");
  }

  const groq = getClient();
  const base64 = imageBuffer.toString('base64');
  const imageUrl = `data:${mimeType};base64,${base64}`;

  const prompt = `You are a receipt and bill reader. Look at this image and extract expense details.

Return ONLY valid JSON (no markdown outside the JSON) with exactly these keys:
- "shopName": string (merchant or store name; use "Unknown" if unclear)
- "amount": number (total paid, use a single number in the receipt's main currency; no currency symbols)
- "date": string as ISO 8601 date only YYYY-MM-DD (best guess from receipt; if missing use today's date conceptually as unknown — use a reasonable guess)
- "category": exactly one of: Food, Travel, Shopping, Bills, Education, Other
- "summary": one short friendly sentence describing this expense for the user.

Rules for category:
- Food: restaurants, groceries, cafes
- Travel: fuel, flights, hotels, transit tickets
- Shopping: clothes, electronics, general retail
- Bills: utilities, rent-like charges, subscriptions labeled as bills
- Education: courses, books, tuition
- Other: if none fit well

JSON only.`;

  let response;
  try {
    response = await groq.chat.completions.create({
      model: "meta-llama/llama-4-scout-17b-16e-instruct",
      messages: [
        {
          role: "user",
          content: [
            { type: "text", text: prompt },
            { type: "image_url", image_url: { url: imageUrl } }
          ]
        }
      ],
      response_format: { type: "json_object" }
    });
  } catch (err) {
    // Throwing exact err directly to Langsmith for better tracing visibility
    throw err;
  }

  const text = response.choices[0]?.message?.content || "";
  let data;
  try {
    data = parseJsonFromModelText(text);
  } catch {
    try {
      data = JSON.parse(text);
    } catch {
      throw new Error('Invalid JSON response from Groq model: ' + text);
    }
  }

  const allowed = ['Food', 'Travel', 'Shopping', 'Bills', 'Education', 'Other'];
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
});

export const generateSpendingInsights = traceable(async function generateSpendingInsights(expenses) {
  if (!expenses.length) {
    return { insights: buildLocalInsights(expenses), source: 'local' };
  }

  const lines = expenses.map((e) => ({
    shopName: e.shopName,
    amount: e.amount,
    category: e.category,
    date: e.date instanceof Date ? e.date.toISOString().slice(0, 10) : e.date,
  }));

  const prompt = `You are a budget analysis tool. Read the provided JSON list of expenses and generate a short, simple spending summary in 1-2 lines. Example format: "You are spending more on travel." or "Food expenses are highest this month."
CRITICAL RULE: DO NOT critique the JSON data, DO NOT mention incorrect dates or formats, and DO NOT give debugging advice. Just summarize the spending categories concisely.
JSON data:\n${JSON.stringify(lines)}`;

  try {
    const groq = getClient();
    const response = await groq.chat.completions.create({
      model: "meta-llama/llama-4-scout-17b-16e-instruct",
      messages: [
        { role: "user", content: prompt }
      ]
    });
    
    const text = (response.choices[0]?.message?.content || '').trim();
    if (text) {
      return { insights: text, source: 'ai' };
    }
  } catch (err) {
    console.error('Insights AI failed:', err.message?.slice(0, 200));
    throw err;
  }

  return { insights: buildLocalInsights(expenses), source: 'local' };
});

export function safeUnlinkUpload(imagePathFromDb) {
  if (!imagePathFromDb || imagePathFromDb.startsWith('data:')) return;
  const base = path.join(process.cwd(), 'uploads');
  const filename = path.basename(imagePathFromDb);
  const full = path.join(base, filename);
  if (!full.startsWith(base)) return;
  fs.unlink(full, () => {});
}
