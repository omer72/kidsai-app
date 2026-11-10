import OpenAI from 'openai';
import { requireEntitlement } from '../lib/entitlement.js';

export const DEFAULT_TRANSCRIBE_MODEL = 'gpt-transcribe';
export const TRANSCRIBE_LANGUAGE_HINTS = Object.freeze(['en', 'he', 'es']);

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, X-RC-User',
};

export function getTranscribeModel(env = process.env) {
  const raw = String(env.OPENAI_TRANSCRIBE_MODEL || '').trim();
  return raw || DEFAULT_TRANSCRIBE_MODEL;
}

export function isLegacyWhisperModel(model) {
  return String(model || '').toLowerCase().startsWith('whisper');
}

export function normalizeTranscribeLanguage(lang) {
  return TRANSCRIBE_LANGUAGE_HINTS.includes(lang) ? lang : undefined;
}

export function buildTranscribeParams({ file, language, env = process.env }) {
  const model = getTranscribeModel(env);
  const lang = normalizeTranscribeLanguage(language);
  const params = {
    file,
    model,
    // gpt-transcribe is documented to return JSON. verbose_json / srt / vtt
    // are not assumed to work; the app only needs the transcript text.
    response_format: 'json',
  };
  if (lang) {
    // Official migration guide: gpt-transcribe uses `languages` and must not
    // also send the legacy singular `language`. whisper-1 still uses `language`.
    if (isLegacyWhisperModel(model)) params.language = lang;
    else params.languages = [lang];
  }
  return params;
}

export default async function handler(req) {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: CORS });
  }
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'method not allowed' }), {
      status: 405, headers: { ...CORS, 'Content-Type': 'application/json' },
    });
  }
  const denied = await requireEntitlement(req, CORS);
  if (denied) return denied;
  const key = process.env.OPENAI_API_KEY;
  if (!key) {
    return new Response(JSON.stringify({ error: 'OPENAI_API_KEY not configured' }), {
      status: 500, headers: { ...CORS, 'Content-Type': 'application/json' },
    });
  }
  try {
    const formData = await req.formData();
    const file = formData.get('file');
    if (!file) {
      return new Response(JSON.stringify({ error: 'no file' }), {
        status: 400, headers: { ...CORS, 'Content-Type': 'application/json' },
      });
    }
    const client = new OpenAI({ apiKey: key });
    // Language hint stops the model mis-detecting accented speech (English with
    // an Israeli accent came back as Hebrew/Arabic). Only trust known values.
    const language = formData.get('language');
    const resp = await client.audio.transcriptions.create(
      buildTranscribeParams({ file, language }),
    );
    return new Response(JSON.stringify({ text: resp.text || '' }), {
      status: 200,
      headers: { ...CORS, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: err?.message || 'server error' }), {
      status: 500, headers: { ...CORS, 'Content-Type': 'application/json' },
    });
  }
}
