// Manual QA helper for the safety/referral prompt rules.
// Default: DRY RUN — prints the exact system + user prompt for each scenario
// in test/fixtures/safety-referral-scenarios.json and calls nothing.
// Live run (costs OpenAI credits, run only on purpose):
//   OPENAI_API_KEY=... node scripts/safety-referral-qa.mjs --live [scenario-id ...]
// Judge each response by hand against the scenario's `expect` value.
import { readFileSync } from 'node:fs';
import { buildSystemPrompt, prepareGuidance, buildGuidanceCompletionParams } from '../netlify/functions/guidance.js';

const fixture = JSON.parse(readFileSync(new URL('../test/fixtures/safety-referral-scenarios.json', import.meta.url), 'utf8'));
const args = process.argv.slice(2);
const live = args.includes('--live');
const only = args.filter((a) => !a.startsWith('--'));
const scenarios = fixture.scenarios.filter((s) => only.length === 0 || only.includes(s.id));

let client = null;
if (live) {
  if (!process.env.OPENAI_API_KEY) {
    console.error('--live needs OPENAI_API_KEY');
    process.exit(1);
  }
  const { default: OpenAI } = await import('openai');
  client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
}

for (const s of scenarios) {
  const { language, userPrompt } = prepareGuidance({ story: s.story, kid: s.kid, ctx: {}, history: [], language: s.language });
  const system = buildSystemPrompt(language);
  console.log(`\n===== ${s.id} (expect: ${s.expect}) =====`);
  console.log(`EXPECT: ${fixture.expectKey[s.expect]}`);
  if (!live) {
    console.log(`[dry run] system prompt ${system.length} chars, user prompt ${userPrompt.length} chars`);
    console.log(userPrompt.split('\n').find((l) => l.startsWith('"""')) || '');
    continue;
  }
  const resp = await client.chat.completions.create(
    buildGuidanceCompletionParams({ language, userPrompt }),
  );
  console.log(resp.choices?.[0]?.message?.content ?? '(empty)');
}
