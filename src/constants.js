export const DEFAULT_KIDS = [
];

// `label` is the English source-of-truth used by the backend prompt to GPT.
// `labelKey` / `hintKey` / `descKey` are i18n keys for UI rendering.
export const LOCATIONS = [
  { id: 'inside', label: 'Inside', hint: 'Home', labelKey: 'chips.location.inside', hintKey: 'chips.location.insideHint' },
  { id: 'outside', label: 'Outside', hint: 'Yard / park', labelKey: 'chips.location.outside', hintKey: 'chips.location.outsideHint' },
  { id: 'public', label: 'Public', hint: 'Store, street', labelKey: 'chips.location.public', hintKey: 'chips.location.publicHint' },
  { id: 'car', label: 'In the car', hint: 'Moving', labelKey: 'chips.location.car', hintKey: 'chips.location.carHint' },
];

// `tint` is a semantic mood color used by the History list to give each
// entry a quick-scan accent. Keep these distinct enough to differentiate
// at a glance without being alarming.
export const MOODS = [
  { id: 'upset',   label: 'Upset',   glyph: '😣', tint: '#C97A50', labelKey: 'chips.mood.upset' },
  { id: 'anxious', label: 'Anxious', glyph: '😟', tint: '#A78A52', labelKey: 'chips.mood.anxious' },
  { id: 'angry',   label: 'Angry',   glyph: '😠', tint: '#C25A4A', labelKey: 'chips.mood.angry' },
  { id: 'tired',   label: 'Tired',   glyph: '😴', tint: '#8B91A8', labelKey: 'chips.mood.tired' },
  { id: 'happy',   label: 'Happy',   glyph: '😊', tint: '#5BA888', labelKey: 'chips.mood.happy' },
  { id: 'defiant', label: 'Defiant', glyph: '😤', tint: '#B07246', labelKey: 'chips.mood.defiant' },
];

export const INVOLVED = [
  { id: 'alone', label: 'Just us', labelKey: 'chips.involved.alone' },
  { id: 'sibling', label: 'Sibling', labelKey: 'chips.involved.sibling' },
  { id: 'coparent', label: 'Co-parent', labelKey: 'chips.involved.coparent' },
  { id: 'family', label: 'Family', labelKey: 'chips.involved.family' },
  { id: 'stranger', label: 'Stranger', labelKey: 'chips.involved.stranger' },
];

export const URGENCY = [
  { id: 'low', label: 'Low', desc: 'I have a minute', dot: '#4AAE8C', labelKey: 'chips.urgency.low', descKey: 'chips.urgency.lowDesc' },
  { id: 'med', label: 'Medium', desc: 'Escalating', dot: '#E5A64B', labelKey: 'chips.urgency.medium', descKey: 'chips.urgency.mediumDesc' },
  { id: 'high', label: 'High', desc: 'Right now', dot: '#D94A5C', labelKey: 'chips.urgency.high', descKey: 'chips.urgency.highDesc' },
];

// Fallback response used when no API key is set, or as a placeholder.
export const DEMO_RESPONSE = {
  title: 'A need for control, not defiance',
  summary: 'Two-year-olds often melt down when a good moment has to end. Maya is likely tired and trying to hold on, not trying to disobey.',
  sections: [
    {
      kind: 'what',
      label: 'What happened',
      body: 'Leaving the park triggered a big protest. Your toddler hit the ground and refused to walk. You felt the eyes of other parents and asked her twice, then lifted her.',
    },
    {
      kind: 'why',
      label: 'Why it happened',
      body: 'At 2, fun ending, hunger, and a public setting stack up fast. Her body went into protest before she had words for it.',
    },
    {
      kind: 'try',
      label: 'What to try next time',
      items: [
        { icon: '🎯', h: 'Signal transitions early', b: 'Give two short warnings before leaving, then let her pick the last thing she does.' },
        { icon: '❤️', h: 'Name the feeling first', b: '"You were having so much fun. It’s really hard to stop." Don’t fix, just name it.' },
        { icon: '🤝', h: 'Offer a small choice', b: '"Do you want to walk to the car holding my hand, or hopping?" Control returns, meltdown softens.' },
      ],
    },
    {
      kind: 'tonight',
      label: 'If you want to reconnect tonight',
      body: 'Before bed, tell her: "Today was hard at the park. I love you even when you’re having big feelings." No lecture. Just that.',
    },
  ],
};

// Sample patterns shown in History when there's nothing real to display yet.
export const SAMPLE_PATTERNS = [
];

// "Get to Know Your Child" intake. `label` is the English source-of-truth sent
// to the guidance prompt; UI strings come from i18n at `intake.q.<qid>.title`
// and `intake.q.<qid>.<optionId>`. `max` caps selections, `other: true` reveals
// a short text field. Answers live on the kid as `intake`.
export const INTAKE_QUESTIONS = [
  { id: 'age', required: true, max: 1, options: [
    { id: 'under1', label: 'under 1 year old' },
    ...Array.from({ length: 12 }, (_, n) => ({ id: String(n + 1), label: `${n + 1} years old` })),
    { id: 'older', label: 'older', other: true, numeric: true },
  ]},
  { id: 'focus', required: true, max: 2, options: [
    { id: 'boundaries', label: 'boundaries and cooperation' },
    { id: 'tantrums', label: 'tantrums and anger' },
    { id: 'attention', label: 'attention and learning' },
    { id: 'anxiety', label: 'anxiety or self-confidence' },
    { id: 'friendships', label: 'friendships' },
    { id: 'sleep', label: 'sleep' },
    { id: 'siblings', label: 'sibling relationships' },
    { id: 'other', label: 'something else', other: true },
  ]},
  { id: 'emotions', required: true, max: 1, options: [
    { id: 'calm', label: 'usually calm' },
    { id: 'sensitive', label: 'sensitive' },
    { id: 'hardtocalm', label: 'finds it hard to calm down' },
    { id: 'depends', label: 'depends on the situation' },
  ]},
  { id: 'challenges', required: true, max: 2, options: [
    { id: 'transitions', label: 'transitions and leaving home' },
    { id: 'limits', label: 'requests and setting limits' },
    { id: 'screens', label: 'screen time' },
    { id: 'homework', label: 'homework or responsibilities' },
    { id: 'social', label: 'social situations' },
    { id: 'bedtime', label: 'evenings and bedtime' },
    { id: 'other', label: 'another time', other: true },
  ]},
  { id: 'calms', text: true },
  { id: 'strengths', max: 3, options: [
    { id: 'creative', label: 'creative' },
    { id: 'considerate', label: 'sensitive and considerate' },
    { id: 'curious', label: 'curious' },
    { id: 'social', label: 'social' },
    { id: 'independent', label: 'independent' },
    { id: 'persistent', label: 'persistent' },
    { id: 'funny', label: 'a good sense of humor' },
    { id: 'other', label: 'another strength', other: true },
  ]},
  { id: 'notes', text: true },
];
