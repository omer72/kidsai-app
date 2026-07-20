import OpenAI from 'openai';
import { requireEntitlement } from '../lib/entitlement.js';

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, X-RC-User',
};

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
    // Language hint stops Whisper mis-detecting accented speech (English with
    // an Israeli accent came back as Hebrew/Arabic). Only trust known values.
    const lang = formData.get('language');
    const language = ['en', 'he', 'es'].includes(lang) ? lang : undefined;
    const resp = await client.audio.transcriptions.create({
      file,
      model: 'whisper-1',
      ...(language ? { language } : {}),
    });
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
