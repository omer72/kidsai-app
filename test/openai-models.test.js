import assert from 'node:assert/strict';
import test from 'node:test';
import {
  DEFAULT_GUIDANCE_MAX_COMPLETION_TOKENS,
  DEFAULT_GUIDANCE_MODEL,
  DEFAULT_GUIDANCE_REASONING_EFFORT,
  buildGuidanceCompletionParams,
  buildSystemPrompt,
  completeGuidance,
  getGuidanceModel,
  getGuidanceReasoningEffort,
  modelSupportsReasoningEffort,
  readGuidanceCompletion,
} from '../netlify/functions/guidance.js';
import {
  DEFAULT_TRANSCRIBE_MODEL,
  buildTranscribeParams,
  getTranscribeModel,
  isLegacyWhisperModel,
  normalizeTranscribeLanguage,
} from '../netlify/functions/transcribe.js';

const USER = 'She refused to brush her teeth tonight.';

test('guidance defaults to gpt-6-luna with reasoning_effort none', () => {
  assert.equal(DEFAULT_GUIDANCE_MODEL, 'gpt-6-luna');
  assert.equal(DEFAULT_GUIDANCE_REASONING_EFFORT, 'none');
  assert.equal(getGuidanceModel({}), 'gpt-6-luna');
  assert.equal(getGuidanceReasoningEffort({}), 'none');
  assert.equal(getGuidanceModel({ OPENAI_GUIDANCE_MODEL: '  ' }), 'gpt-6-luna');
  assert.equal(getGuidanceReasoningEffort({ OPENAI_GUIDANCE_REASONING_EFFORT: 'bogus' }), 'none');

  const params = buildGuidanceCompletionParams({
    language: 'en',
    userPrompt: USER,
    env: {},
  });
  assert.equal(params.model, 'gpt-6-luna');
  assert.equal(params.reasoning_effort, 'none');
  assert.equal(params.temperature, 0.7);
  assert.equal(params.max_completion_tokens, DEFAULT_GUIDANCE_MAX_COMPLETION_TOKENS);
  assert.ok(DEFAULT_GUIDANCE_MAX_COMPLETION_TOKENS >= 2000);
  assert.deepEqual(params.response_format, { type: 'json_object' });
  assert.equal(params.messages[0].role, 'system');
  assert.equal(params.messages[1].role, 'user');
  assert.equal(params.messages[1].content, USER);
  assert.equal(params.messages[0].content, buildSystemPrompt('en'));
});

test('guidance env overrides the model and reasoning effort', () => {
  const env = {
    OPENAI_GUIDANCE_MODEL: '  gpt-6-luna  ',
    OPENAI_GUIDANCE_REASONING_EFFORT: 'LOW',
  };
  assert.equal(getGuidanceModel(env), 'gpt-6-luna');
  assert.equal(getGuidanceReasoningEffort(env), 'low');
  const params = buildGuidanceCompletionParams({
    language: 'he',
    userPrompt: USER,
    env,
  });
  assert.equal(params.model, 'gpt-6-luna');
  assert.equal(params.reasoning_effort, 'low');
  // Official GPT-6 guide: omit temperature when effort is not "none".
  assert.equal('temperature' in params, false);
});

test('guidance keeps temperature only when reasoning_effort is none', () => {
  for (const effort of ['low', 'medium', 'high', 'xhigh', 'max']) {
    const params = buildGuidanceCompletionParams({
      language: 'en',
      userPrompt: USER,
      env: { OPENAI_GUIDANCE_REASONING_EFFORT: effort },
    });
    assert.equal(params.reasoning_effort, effort, effort);
    assert.equal('temperature' in params, false, effort);
  }
  const none = buildGuidanceCompletionParams({
    language: 'en',
    userPrompt: USER,
    env: { OPENAI_GUIDANCE_REASONING_EFFORT: 'none' },
  });
  assert.equal(none.temperature, 0.7);
});

test('readGuidanceCompletion returns content and rejects empty or truncated JSON', () => {
  assert.equal(
    readGuidanceCompletion({
      choices: [{ finish_reason: 'stop', message: { content: '  {"title":"ok"}  ' } }],
    }),
    '{"title":"ok"}',
  );
  // A finished JSON object that also reports length is still usable.
  assert.equal(
    readGuidanceCompletion({
      choices: [{ finish_reason: 'length', message: { content: '{"title":"full"}' } }],
    }),
    '{"title":"full"}',
  );

  const empty = () => readGuidanceCompletion({
    choices: [{ finish_reason: 'stop', message: { content: '   ' } }],
  });
  assert.throws(empty, { code: 'empty' });

  const emptyLength = () => readGuidanceCompletion({
    choices: [{ finish_reason: 'length', message: { content: null } }],
  });
  assert.throws(emptyLength, { code: 'truncated', finish_reason: 'length' });

  const cutOff = () => readGuidanceCompletion({
    choices: [{ finish_reason: 'length', message: { content: '{"title":' } }],
  });
  assert.throws(cutOff, { code: 'truncated', finish_reason: 'length' });
});

test('completeGuidance sends the new params to a mocked OpenAI client', async () => {
  const seen = [];
  const client = {
    chat: {
      completions: {
        create: async (params) => {
          seen.push(params);
          return {
            choices: [{
              finish_reason: 'stop',
              message: { content: '{"title":"mocked"}' },
            }],
          };
        },
      },
    },
  };
  const text = await completeGuidance(client, {
    language: 'es',
    userPrompt: USER,
    env: {},
  });
  assert.equal(text, '{"title":"mocked"}');
  assert.equal(seen.length, 1);
  assert.equal(seen[0].model, 'gpt-6-luna');
  assert.equal(seen[0].reasoning_effort, 'none');
  assert.equal(seen[0].temperature, 0.7);
  assert.equal(seen[0].max_completion_tokens, 2500);
  assert.deepEqual(seen[0].response_format, { type: 'json_object' });
});

test('completeGuidance surfaces a truncated empty completion from a mocked client', async () => {
  const client = {
    chat: {
      completions: {
        create: async () => ({
          choices: [{ finish_reason: 'length', message: { content: '' } }],
        }),
      },
    },
  };
  await assert.rejects(
    () => completeGuidance(client, { language: 'en', userPrompt: USER, env: {} }),
    { code: 'truncated' },
  );
});

test('transcribe defaults to gpt-transcribe and uses the languages array', () => {
  assert.equal(DEFAULT_TRANSCRIBE_MODEL, 'gpt-transcribe');
  assert.equal(getTranscribeModel({}), 'gpt-transcribe');
  assert.equal(getTranscribeModel({ OPENAI_TRANSCRIBE_MODEL: '  ' }), 'gpt-transcribe');
  assert.equal(getTranscribeModel({ OPENAI_TRANSCRIBE_MODEL: ' whisper-1 ' }), 'whisper-1');
  assert.equal(normalizeTranscribeLanguage('he'), 'he');
  assert.equal(normalizeTranscribeLanguage('fr'), undefined);
  assert.equal(isLegacyWhisperModel('whisper-1'), true);
  assert.equal(isLegacyWhisperModel('gpt-transcribe'), false);

  const file = { name: 'clip.webm' };
  const params = buildTranscribeParams({ file, language: 'he', env: {} });
  assert.equal(params.model, 'gpt-transcribe');
  assert.equal(params.file, file);
  assert.equal(params.response_format, 'json');
  assert.deepEqual(params.languages, ['he']);
  assert.equal('language' in params, false);

  const noHint = buildTranscribeParams({ file, language: 'fr', env: {} });
  assert.equal('languages' in noHint, false);
  assert.equal('language' in noHint, false);
});

test('transcribe rollback to whisper-1 uses the singular language field', () => {
  const file = { name: 'clip.webm' };
  const params = buildTranscribeParams({
    file,
    language: 'es',
    env: { OPENAI_TRANSCRIBE_MODEL: 'whisper-1' },
  });
  assert.equal(params.model, 'whisper-1');
  assert.equal(params.language, 'es');
  assert.equal('languages' in params, false);
  assert.equal(params.response_format, 'json');
});

test('guidance rollback to gpt-4o-mini omits reasoning_effort and keeps temperature', () => {
  assert.equal(modelSupportsReasoningEffort('gpt-6-luna'), true);
  assert.equal(modelSupportsReasoningEffort('gpt-4o-mini'), false);
  const params = buildGuidanceCompletionParams({
    language: 'en',
    userPrompt: USER,
    env: { OPENAI_GUIDANCE_MODEL: 'gpt-4o-mini' },
  });
  assert.equal(params.model, 'gpt-4o-mini');
  assert.equal('reasoning_effort' in params, false);
  assert.equal(params.temperature, 0.7);
  assert.equal(params.max_completion_tokens, 2500);
  assert.deepEqual(params.response_format, { type: 'json_object' });
});

