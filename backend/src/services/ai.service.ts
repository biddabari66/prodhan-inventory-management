// @ts-nocheck
import axios from 'axios';

/**
 * Provider-agnostic LLM client (OpenAI-compatible chat completions).
 *
 * Works out-of-the-box with FREE / open-source backends — just set env vars:
 *   • Groq (free, fast, Llama 3.3 70B) — DEFAULT
 *       AI_BASE_URL=https://api.groq.com/openai/v1
 *       AI_MODEL=llama-3.3-70b-versatile
 *       AI_API_KEY=<free key from console.groq.com>
 *   • Ollama (fully local / open-source, no key)
 *       AI_BASE_URL=http://localhost:11434/v1
 *       AI_MODEL=llama3.1
 *       AI_API_KEY=ollama
 *   • Google Gemini (free tier, OpenAI-compatible endpoint)
 *       AI_BASE_URL=https://generativelanguage.googleapis.com/v1beta/openai
 *       AI_MODEL=gemini-2.0-flash
 *       AI_API_KEY=<free key>
 */

const BASE_URL = process.env.AI_BASE_URL || 'https://api.groq.com/openai/v1';
const MODEL = process.env.AI_MODEL || 'llama-3.3-70b-versatile';
const API_KEY = process.env.AI_API_KEY || '';

export function aiConfigured(): boolean {
  return Boolean(API_KEY) || BASE_URL.includes('localhost') || BASE_URL.includes('11434');
}

export async function chat(
  messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }>,
  opts: { temperature?: number; json?: boolean; maxTokens?: number } = {}
): Promise<string> {
  if (!aiConfigured()) {
    return 'AI is not configured yet. Add a free Groq API key (AI_API_KEY) on the server — get one at console.groq.com — or point AI_BASE_URL to a local Ollama instance.';
  }

  const body: any = {
    model: MODEL,
    messages,
    temperature: opts.temperature ?? 0.4,
    max_tokens: opts.maxTokens ?? 1024,
  };
  if (opts.json) body.response_format = { type: 'json_object' };

  try {
    const { data } = await axios.post(`${BASE_URL}/chat/completions`, body, {
      headers: { Authorization: `Bearer ${API_KEY}`, 'Content-Type': 'application/json' },
      timeout: 45000,
    });
    return data?.choices?.[0]?.message?.content?.trim() || '';
  } catch (err: any) {
    const detail = err?.response?.data?.error?.message || err.message;
    throw new Error(`AI request failed: ${detail}`);
  }
}

export { MODEL as AI_MODEL_NAME };
