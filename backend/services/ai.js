import Groq from 'groq-sdk';
import crypto from 'node:crypto';
import { env } from '../config/env.js';

const client = new Groq({ apiKey: env.GROQ_API_KEY });

/**
 * Tool schema for guaranteed structured output.
 * Groq llama-3.3-70b-versatile supports OpenAI-compatible function/tool calling.
 */
const DISTRESS_TOOL = {
  type: 'function',
  function: {
    name: 'extract_distress',
    description:
      "Extract structured information from a ship captain's distress message",
    parameters: {
      type: 'object',
      properties: {
        severity: {
          type: 'string',
          enum: ['critical', 'high', 'medium', 'low'],
          description:
            'critical = lives in immediate danger; high = vessel at risk; medium = significant operational impairment; low = informational'
        },
        category: {
          type: 'string',
          enum: ['fire', 'flooding', 'medical', 'mechanical', 'piracy', 'weather', 'collision', 'other']
        },
        summary: { type: 'string', description: 'one-line plain English summary, max 80 chars' },
        casualties: {
          type: 'object',
          properties: {
            injured: { type: 'integer', minimum: 0 },
            deceased: { type: 'integer', minimum: 0 },
            missing: { type: 'integer', minimum: 0 }
          },
          required: ['injured', 'deceased', 'missing']
        },
        damage_estimate_usd: {
          type: ['integer', 'null'],
          description: 'rough USD estimate, null if not stated'
        },
        time_sensitive: { type: 'boolean' },
        requires_immediate_assistance: { type: 'boolean' },
        suggested_actions: {
          type: 'array',
          items: { type: 'string' },
          maxItems: 3
        }
      },
      required: [
        'severity',
        'category',
        'summary',
        'casualties',
        'time_sensitive',
        'requires_immediate_assistance',
        'suggested_actions'
      ]
    }
  }
};

const SYSTEM_PROMPT = `You are an emergency response analyst processing distress calls from cargo ship captains in the Strait of Hormuz. You MUST call the extract_distress function with structured analysis of the captain's message.

Be conservative: if a casualty count isn't stated, use 0. If damage isn't stated in dollars, use null. Match severity carefully:
- critical: lives in immediate danger
- high: vessel at risk
- medium: significant operational impairment
- low: informational

Examples:

Captain: "Engine room flooding, 3 crew unconscious, taking on water fast, maybe 20 minutes"
→ extract_distress({ severity: "critical", category: "flooding", summary: "Engine room flooding, vessel sinking risk", casualties: { injured: 3, deceased: 0, missing: 0 }, damage_estimate_usd: null, time_sensitive: true, requires_immediate_assistance: true, suggested_actions: ["Dispatch nearest vessel", "Alert coast guard", "Prepare evacuation"] })

Captain: "Lost main radar, switching to backup, no immediate danger"
→ extract_distress({ severity: "low", category: "mechanical", summary: "Main radar failure, backup operational", casualties: { injured: 0, deceased: 0, missing: 0 }, damage_estimate_usd: null, time_sensitive: false, requires_immediate_assistance: false, suggested_actions: ["Schedule radar repair at next port"] })

Captain: "Pirate boarding vessel, 2 armed, locked in bridge"
→ extract_distress({ severity: "critical", category: "piracy", summary: "Armed pirates aboard, crew locked in bridge", casualties: { injured: 0, deceased: 0, missing: 0 }, damage_estimate_usd: null, time_sensitive: true, requires_immediate_assistance: true, suggested_actions: ["Notify naval forces", "Maintain bridge lockdown", "Activate ship security alert"] })`;

const cache = new Map(); // sha256(text) -> { data, at }
const CACHE_TTL_MS = 60_000;

function defaultFallback(text) {
  return {
    severity: 'high',
    category: 'other',
    summary: (text || '').slice(0, 80),
    casualties: { injured: 0, deceased: 0, missing: 0 },
    damage_estimate_usd: null,
    time_sensitive: true,
    requires_immediate_assistance: true,
    suggested_actions: ['Investigate distress signal']
  };
}

export async function extractDistress(distressText, { timeoutMs = 10_000 } = {}) {
  const safeText = (distressText || '').trim();
  if (!safeText) {
    return { ok: false, data: defaultFallback(''), raw_message: '' };
  }

  // cache check
  const key = crypto.createHash('sha256').update(safeText).digest('hex');
  const cached = cache.get(key);
  if (cached && Date.now() - cached.at < CACHE_TTL_MS) {
    return { ok: true, data: cached.data, raw_message: safeText, cached: true };
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await client.chat.completions.create(
      {
        model: env.GROQ_MODEL,
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          { role: 'user', content: safeText }
        ],
        tools: [DISTRESS_TOOL],
        tool_choice: { type: 'function', function: { name: 'extract_distress' } },
        max_tokens: 1024,
        temperature: 0
      },
      { signal: controller.signal }
    );

    const toolCall = response.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall || toolCall.function?.name !== 'extract_distress') {
      throw new Error('No tool_call returned by Groq');
    }
    const data = JSON.parse(toolCall.function.arguments);
    cache.set(key, { data, at: Date.now() });
    return { ok: true, data, raw_message: safeText };
  } catch (err) {
    return {
      ok: false,
      data: defaultFallback(safeText),
      raw_message: safeText,
      error: err.message
    };
  } finally {
    clearTimeout(timer);
  }
}
