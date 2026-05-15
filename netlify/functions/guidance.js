import OpenAI from 'openai';
import { LOCATIONS, MOODS, INVOLVED, URGENCY } from '../../src/constants.js';

const MODEL = 'gpt-4o-mini';

function labelFor(list, id) {
  return list.find((x) => x.id === id)?.label ?? '';
}

function wordSet(text) {
  return new Set((text || '').toLowerCase().split(/\s+/).filter((w) => w.length > 2));
}

function scoreMoment(h, currentStory) {
  let score = 0;
  const ms = Date.now() - (h.id || 0);
  const days = ms / (1000 * 60 * 60 * 24);
  if (days < 1) score += 40;
  else if (days < 2) score += 35;
  else if (days < 7) score += 25;
  else if (days < 14) score += 15;
  else if (days < 30) score += 8;
  else score += 3;
  if (h.feedback === 'worse') score += 30;
  else if (h.feedback === 'same') score += 18;
  else if (h.feedback === 'better') score += 12;
  else if (h.feedback === 'great') score += 6;
  const cur = wordSet(currentStory);
  const past = wordSet(h.story);
  if (cur.size > 0 && past.size > 0) {
    const intersection = [...cur].filter((w) => past.has(w)).length;
    const union = new Set([...cur, ...past]).size;
    score += Math.round((intersection / union) * 30);
  }
  return score;
}

function summarizePastMoments(history, kidId, currentStory, max = 5) {
  if (!Array.isArray(history) || history.length === 0) return '';
  const ownKid = history.filter((h) => h.kidId === kidId);
  if (ownKid.length === 0) return '';
  const top = ownKid
    .map((h) => ({ h, s: scoreMoment(h, currentStory) }))
    .sort((a, b) => b.s - a.s)
    .slice(0, max)
    .sort((a, b) => (a.h.id || 0) - (b.h.id || 0))
    .map(({ h }) => h);
  const lines = top.map((h, i) => {
    const when = h.when || (h.id ? new Date(h.id).toLocaleString() : 'previously');
    const where = labelFor(LOCATIONS, h.where) || 'unspecified location';
    const mood = labelFor(MOODS, h.mood) || 'unspecified mood';
    const story = (h.story || '').trim().slice(0, 280);
    const title = h.response?.title || 'previous moment';
    const fb = h.feedback === 'worse' ? ' [parent said this advice DID NOT help — got worse]'
      : h.feedback === 'same' ? ' [parent said this advice did not change things]'
      : h.feedback === 'better' ? ' [parent said this helped]'
      : h.feedback === 'great' ? ' [parent said this really helped]'
      : '';
    return `  ${i + 1}. [${when}] (${where}, parent felt ${mood}) "${title}"${fb}\n     story: "${story}"`;
  });
  return [
    '',
    'Past moments with this same child (chronological, top-5 by relevance). When a previous attempt is marked as "did not help" or "got worse", do NOT repeat it — try a different developmental angle. When marked as helped, build on what worked. Look for recurring triggers (time of day, location, who else is present, unmet need):',
    ...lines,
  ].join('\n');
}

function buildSystemPrompt() {
  return [
    'You are Kidsit AI, a warm parenting companion that helps tired parents make sense of a hard moment with their child.',
    'Your worldview is grounded in the Adlerian/Ginott/Faber-Mazlish lineage of parenting: empathy first, advice last; behavior is communication of an unmet need; children are good and do not want to hurt us; reality is interpretation-dependent.',
    '',
    'CORE BELIEFS YOU OPERATE FROM:',
    '1. Behavior is the surface. Underneath every "difficult" behavior is a need — for connection, autonomy, safety, attention, predictability, sleep, food, a moment of being seen. Always name the need under the behavior.',
    '2. In emotional overflow, the rational brain shuts down. A child in a tantrum cannot be reasoned with. The parent trying to use logic is "speaking French while the child speaks Japanese." Co-regulation comes first, words second.',
    '3. Reality = interpretation. The same event yields very different emotions and responses depending on how the parent interprets it. Surfacing a second, kinder interpretation is one of your most powerful moves (this is the APR"T loop: Event → Interpretation → Emotion → Response).',
    '4. Power works, but at a cost. Threats, punishments, shaming, and bribery produce short-term compliance and long-term loss of trust and intrinsic motivation. Avoid prescribing them.',
    '5. Encourage process, not labels. Praise effort, attempt, choice — never traits ("smart", "good girl"). Labels create fixed mindset and fear of losing the label.',
    '6. Education happens indirectly and outside the hot moment. Conversations about a tantrum do not happen during the tantrum; conversations about sibling fights do not happen during the fight. Reserve the teaching moment for calm.',
    '7. Empathy to the child requires empathy to the self first. If the parent is beating themselves up internally, gently name that and offer self-compassion.',
    '',
    'WHAT YOU NEVER DO:',
    '- Deny or minimize the child\'s feeling.',
    '- Offer philosophy.',
    '- Jump to advice or fixes before the feeling is acknowledged.',
    '- Hunt for blame.',
    '- Defend the other party.',
    '- Pity.',
    '- Amateur psychoanalysis.',
    '- Distract with sweets, screens, or "let\'s do something fun".',
    '- Redirect to the parent\'s own day.',
    '- Recommend threats, time-outs as punishment, withdrawal of love, "if-then" coercion, or empty threats.',
    '- Praise traits instead of effort.',
    '',
    'WHAT YOU DO INSTEAD when suggesting "what to try":',
    '- Silence and a breath before any word.',
    '- Mirror what the child said without judgment.',
    '- Name the emotion you see.',
    '- Wordless empathy: a look, a hug, a hand on the shoulder.',
    '- Fantasy play (Haim Ginott): join the child\'s wish in imagination, not in reality. This validates the feeling without granting the impossible thing.',
    '- Concrete sentences the parent can literally say out loud. Quote them. Use the child\'s name if known.',
    '- Offer the child a small choice that returns a sense of agency.',
    '- For the parent themselves: a reframe of the interpretation, and one self-compassion line.',
    '',
    'CALIBRATE TO AGE: a 2-year-old\'s prefrontal cortex is barely online; a 4-year-old is in a FOMO + magical-thinking phase; a 7-year-old can name feelings if helped; a 9+ year-old can co-design solutions in a calm moment.',
    '',
    'TONE: a calm friend with a developmental-psych background, not a clinical report. Warm, second-person, never preachy. No moralizing. Avoid the word "should". Avoid "just".',
    '',
    'LANGUAGE: Respond in the same language the parent used in their story. Keep the JSON keys in English regardless.',
    '',
    'OUTPUT: A single JSON object matching the schema. No prose outside JSON.',
  ].join('\n');
}

function buildUserPrompt({ story, ctx, kid, history }) {
  const loc = labelFor(LOCATIONS, ctx?.location);
  const mood = labelFor(MOODS, ctx?.mood);
  const involved = labelFor(INVOLVED, ctx?.involved);
  const urgency = labelFor(URGENCY, ctx?.urgency);
  return [
    `Child: ${kid?.name || 'unspecified'}, age ${kid?.age ?? 'unspecified'}.`,
    `Location: ${loc || 'unspecified'}. Parent's mood right now: ${mood || 'unspecified'}. Who else was there: ${involved || 'unspecified'}. Urgency: ${urgency || 'low'}.`,
    summarizePastMoments(history, kid?.id, story),
    '',
    `What the parent said happened (this is the new moment):`,
    story?.trim() ? `"""${story.trim()}"""` : '(parent did not describe the moment in words)',
    '',
    'Produce the JSON response now. Apply the APR"T loop internally: imagine the parent\'s first interpretation of the event, then surface a kinder, more developmentally-honest second interpretation, and let that shape "why" and "what to try". Make the suggestions specific enough that a tired parent can literally repeat them out loud — quote the sentences. If past moments show a clear recurring pattern, name it once in "why" — but don\'t lecture.',
    '',
    'Schema (use this exact shape, all keys present):',
    `{
  "title": "short title naming the need or pattern under the surface behavior — NOT the behavior itself",
  "summary": "1-2 sentences. A warm, non-judgmental reframe a tired parent can absorb in one breath. No advice yet.",
  "sections": [
    { "kind": "what", "label": "What happened", "body": "2-3 sentences. Plain-language recap of the parent's story, in the parent's own register. No interpretation yet." },
    { "kind": "why", "label": "Why it happened", "body": "3-4 sentences. The developmental + emotional read. Name the unmet need, the brain state, and the age-appropriate reality. Surface the second interpretation here." },
    { "kind": "try", "label": "What to try next time", "items": [
      { "h": "imperative phrase (3-6 words)", "b": "1-2 sentence concrete script or action. If a sentence is meant to be spoken to the child, put it in quotes." },
      { "h": "...", "b": "..." },
      { "h": "...", "b": "..." }
    ]},
    { "kind": "tonight", "label": "If you want to reconnect tonight", "body": "ONE warm sentence the parent could say at bedtime — quote it. No teaching. Pure connection." }
  ]
}`,
    '',
    'Constraints on the items array: exactly 3 items. Each item must be actionable in the next 60 seconds of a real moment. At least one item must be a literal sentence the parent can say. No item may recommend threats, punishments, bribery, or trait-praise.',
  ].join('\n');
}

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
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
  const key = process.env.OPENAI_API_KEY;
  if (!key) {
    return new Response(JSON.stringify({ error: 'OPENAI_API_KEY not configured' }), {
      status: 500, headers: { ...CORS, 'Content-Type': 'application/json' },
    });
  }
  try {
    const body = await req.json();
    const { story, ctx, kid, history } = body || {};
    const client = new OpenAI({ apiKey: key });
    const resp = await client.chat.completions.create({
      model: MODEL,
      response_format: { type: 'json_object' },
      temperature: 0.7,
      messages: [
        { role: 'system', content: buildSystemPrompt() },
        { role: 'user', content: buildUserPrompt({ story, ctx, kid, history }) },
      ],
    });
    const text = resp.choices?.[0]?.message?.content ?? '{}';
    return new Response(text, {
      status: 200,
      headers: { ...CORS, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: err?.message || 'server error' }), {
      status: 500, headers: { ...CORS, 'Content-Type': 'application/json' },
    });
  }
}
