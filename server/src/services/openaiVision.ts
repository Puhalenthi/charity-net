import OpenAI from 'openai';
import { z } from 'zod';
import {
  AiSafetySchema,
  ITEM_CATEGORIES,
  ITEM_CONDITIONS,
  MAX_AI_KEYWORDS,
  MAX_AI_TAGS,
  TAG_VOCABULARY,
  filterToVocab,
  normalizeTag,
} from '@charity-net/shared';
import type { AiSafety, ItemCategory, ItemCondition, TagVocabulary } from '@charity-net/shared';
import { env } from '../config/env.js';

const ScanResponseSchema = z.object({
  category: z.enum(ITEM_CATEGORIES).nullable(),
  condition: z.enum(ITEM_CONDITIONS).nullable(),
  tags: z.array(z.string()).default([]),
  keywords: z.array(z.string()).default([]),
  safety: AiSafetySchema,
  confidence: z.number().min(0).max(1).default(0.5),
});

export type ScanResult = {
  category?: ItemCategory;
  condition?: ItemCondition;
  tags: TagVocabulary[];
  keywords: string[];
  safety: AiSafety;
  confidence: number;
  raw: unknown;
};

let openaiClient: OpenAI | null = null;
function getClient(): OpenAI {
  if (openaiClient) return openaiClient;
  const apiKey = env().OPENAI_API_KEY;
  if (!apiKey) throw new Error('OPENAI_API_KEY not configured');
  openaiClient = new OpenAI({ apiKey });
  return openaiClient;
}

const SYSTEM_PROMPT = `You are an item-classification assistant for a charitable donations marketplace.
Given one or more images of a single donated item, return a strict JSON object describing it.
Use only values from the provided controlled vocabularies. Be conservative: if unsure, return null.
Flag any image that contains weapons, drugs, sexual content, hazardous chemicals, or personally
identifying documents.`;

function buildUserPrompt(): string {
  return `Return ONLY JSON matching this schema:

{
  "category": one of [${ITEM_CATEGORIES.join(', ')}] or null,
  "condition": one of [${ITEM_CONDITIONS.join(', ')}] or null,
  "tags": up to ${MAX_AI_TAGS} values chosen ONLY from this vocabulary: [${TAG_VOCABULARY.join(', ')}],
  "keywords": up to ${MAX_AI_KEYWORDS} short free-form keywords (1-2 words each),
  "safety": { "nsfw": boolean, "weapon": boolean, "hazardous": boolean, "pii": boolean },
  "confidence": number between 0 and 1
}

Pick the single best category. Tags MUST come from the vocabulary list. If a useful term is not in the
list, place it in keywords instead. Mark safety flags true only when clearly visible.`;
}

export async function scanItemImages(imageUrls: string[]): Promise<ScanResult> {
  if (!env().AI_ENABLED) return fallbackResult();
  const client = getClient();
  const userPrompt = buildUserPrompt();

  const response = await client.chat.completions.create({
    model: env().OPENAI_MODEL,
    response_format: { type: 'json_object' },
    temperature: 0.1,
    messages: [
      { role: 'system', content: SYSTEM_PROMPT },
      {
        role: 'user',
        content: [
          { type: 'text', text: userPrompt },
          ...imageUrls.map((url) => ({ type: 'image_url' as const, image_url: { url } })),
        ],
      },
    ],
  });

  const text = response.choices[0]?.message?.content ?? '{}';
  let parsedJson: unknown;
  try {
    parsedJson = JSON.parse(text);
  } catch {
    parsedJson = {};
  }
  const parsed = ScanResponseSchema.safeParse(parsedJson);
  if (!parsed.success) {
    return { ...fallbackResult(), raw: parsedJson };
  }
  const tags = filterToVocab(parsed.data.tags.map(normalizeTag)).slice(0, MAX_AI_TAGS);
  const keywords = parsed.data.keywords
    .map((k) => k.trim().toLowerCase())
    .filter((k) => k.length > 0 && k.length <= 30)
    .slice(0, MAX_AI_KEYWORDS);

  return {
    category: parsed.data.category ?? undefined,
    condition: parsed.data.condition ?? undefined,
    tags,
    keywords,
    safety: parsed.data.safety,
    confidence: parsed.data.confidence,
    raw: parsedJson,
  };
}

export async function scanWithRetry(imageUrls: string[], maxAttempts = 3): Promise<ScanResult> {
  let lastErr: unknown;
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    try {
      return await scanItemImages(imageUrls);
    } catch (err) {
      lastErr = err;
      const delay = 500 * 2 ** attempt;
      await new Promise((r) => setTimeout(r, delay));
    }
  }
  console.error('[openaiVision] all attempts failed', lastErr);
  return fallbackResult();
}

function fallbackResult(): ScanResult {
  return {
    tags: [],
    keywords: [],
    safety: { nsfw: false, weapon: false, hazardous: false, pii: false },
    confidence: 0,
    raw: null,
  };
}
