import assert from 'node:assert/strict';
import test from 'node:test';
import { GUIDANCE_HISTORY_CAP, buildGuidanceRequest } from '../src/guidanceRequest.js';
import { guidancePromptFromBody } from '../netlify/functions/guidance.js';

const CHILD_A = {
  id: 'maya-active',
  name: 'MayaActive',
  birthdate: '2020-06-15',
  age: 6,
  gender: 'girl',
  color: 'ONLY_A_COLOR',
  initials: 'MA',
  newSibling: true,
  notes: 'MAYA_NOTES_TOKEN loves trains',
  intake: {
    answers: { emotions: ['sensitive'], focus: ['tantrums'] },
    text: { notes: 'MAYA_INTAKE_TOKEN needs a warning before leaving' },
    leaked: 'NOA_INTAKE_SMUGGLE',
  },
};

const CHILD_B = {
  id: 'noa-private',
  name: 'NoaPrivate',
  birthdate: '2014-03-03',
  age: 12,
  gender: 'boy',
  color: 'ONLY_B_COLOR',
  initials: 'NP',
  notes: 'NOA_NOTES_TOKEN hates broccoli',
  intake: {
    answers: { emotions: ['calm'] },
    text: { notes: 'NOA_INTAKE_TOKEN has a private fear' },
  },
};

function moment(partial) {
  return {
    kidId: 'maya-active',
    feedback: 'better',
    story: 'ordinary moment',
    where: 'inside',
    mood: 'tired',
    when: 'Mon 3:00 PM',
    note: 'MAYA_MOMENT_NOTE',
    response: {
      title: 'A need',
      summary: 'She was tired',
      sections: [{
        kind: 'try',
        items: [{ h: 'MAYA_ADVICE_HEAD', b: 'MAYA_ADVICE_BODY say this long script' }],
      }],
    },
    ...partial,
  };
}

function mixedHistory() {
  const own = [];
  for (let id = 1; id <= GUIDANCE_HISTORY_CAP + 2; id += 1) {
    own.push(moment({
      id,
      story: id <= 2 ? `MAYA_OLD_STORY ${id}` : `recent park moment ${id}`,
    }));
  }
  own.push(moment({
    id: 100,
    story: 'MAYA_RECENT_STORY at the park',
  }));
  return [
    ...own,
    {
      id: 9000,
      kidId: 'noa-private',
      story: 'NOA_STORY_TOKEN threw a cup',
      note: 'NOA_NOTE_TOKEN',
      where: 'public',
      mood: 'angry',
      feedback: 'worse',
      response: { title: 'NOA_TITLE_TOKEN', summary: 'NOA_SUMMARY_TOKEN', sections: [{ kind: 'try', items: [{ h: 'NOA_ADVICE_HEAD', b: 'NOA_ADVICE_BODY' }] }] },
    },
    { id: 8000, story: 'NOA_ORPHAN_STORY with no child id', note: 'NOA_ORPHAN_NOTE' },
  ];
}

function requestForActiveChild() {
  return buildGuidanceRequest({
    story: 'Maya melted down when we left the park',
    ctx: { location: 'public', mood: 'upset', involved: 'sibling', urgency: 'high', extra: 'NOA_CTX_SMUGGLE' },
    kid: CHILD_A,
    siblings: [CHILD_B],
    history: mixedHistory(),
    language: 'en',
  });
}

const B_MARKERS = [
  'NoaPrivate',
  'noa-private',
  '2014-03-03',
  'NOA_NOTES_TOKEN',
  'NOA_INTAKE_TOKEN',
  'NOA_INTAKE_SMUGGLE',
  'NOA_STORY_TOKEN',
  'NOA_NOTE_TOKEN',
  'NOA_TITLE_TOKEN',
  'NOA_SUMMARY_TOKEN',
  'NOA_ADVICE_HEAD',
  'NOA_ADVICE_BODY',
  'NOA_ORPHAN_STORY',
  'NOA_ORPHAN_NOTE',
  'NOA_CTX_SMUGGLE',
  'ONLY_B_COLOR',
];

test('guidance request for the active child carries none of the other child', () => {
  const body = requestForActiveChild();
  const blob = JSON.stringify(body);
  for (const marker of B_MARKERS) {
    assert.equal(blob.includes(marker), false, marker);
  }
  assert.equal('siblings' in body, false);
  assert.equal(body.kid.id, 'maya-active');
  assert.equal(body.kid.name, 'MayaActive');
  assert.equal(body.kid.birthdate, '2020-06-15');
  assert.equal(body.kid.notes, 'MAYA_NOTES_TOKEN loves trains');
  assert.equal(body.kid.intake.text.notes, 'MAYA_INTAKE_TOKEN needs a warning before leaving');
  assert.equal(body.kid.color, undefined);
  assert.equal(body.kid.initials, undefined);
  assert.equal(body.history.length, GUIDANCE_HISTORY_CAP);
  assert.ok(body.history.every((h) => h.kidId === 'maya-active'));
  assert.equal(body.history[0].story.includes('MAYA_RECENT_STORY'), true);
  assert.equal(blob.includes('MAYA_OLD_STORY'), false);
  assert.equal(blob.includes('MAYA_MOMENT_NOTE'), false);
  assert.equal(blob.includes('MAYA_ADVICE_BODY'), false);
  assert.equal(blob.includes('MAYA_ADVICE_HEAD'), true);
  assert.equal(blob.includes('ONLY_A_COLOR'), false);
  assert.deepEqual(Object.keys(body.ctx).sort(), ['involved', 'location', 'mood', 'urgency']);
});

test('guidance prompt assembled from a full family body names only the active child', () => {
  const prompt = guidancePromptFromBody({
    story: 'Maya melted down when we left the park',
    ctx: { location: 'public', mood: 'upset', involved: 'sibling', urgency: 'high' },
    kid: CHILD_A,
    siblings: [CHILD_B],
    history: mixedHistory(),
    language: 'en',
  });
  for (const marker of B_MARKERS) {
    assert.equal(prompt.includes(marker), false, marker);
  }
  assert.match(prompt, /MayaActive/);
  assert.match(prompt, /MAYA_NOTES_TOKEN/);
  assert.match(prompt, /MAYA_INTAKE_TOKEN/);
  assert.match(prompt, /MAYA_RECENT_STORY/);
  assert.match(prompt, /MAYA_ADVICE_HEAD/);
  assert.doesNotMatch(prompt, /MAYA_OLD_STORY/);
  assert.doesNotMatch(prompt, /MAYA_MOMENT_NOTE/);
  assert.doesNotMatch(prompt, /MAYA_ADVICE_BODY/);
  assert.doesNotMatch(prompt, /Siblings:/);
  assert.match(prompt, /A new baby joined the family/);
});
