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

export const MOODS = [
  { id: 'upset', label: 'Upset', glyph: '◐', labelKey: 'chips.mood.upset' },
  { id: 'anxious', label: 'Anxious', glyph: '○', labelKey: 'chips.mood.anxious' },
  { id: 'angry', label: 'Angry', glyph: '◉', labelKey: 'chips.mood.angry' },
  { id: 'tired', label: 'Tired', glyph: '◑', labelKey: 'chips.mood.tired' },
  { id: 'happy', label: 'Happy', glyph: '●', labelKey: 'chips.mood.happy' },
  { id: 'defiant', label: 'Defiant', glyph: '◎', labelKey: 'chips.mood.defiant' },
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
  summary: 'Four-year-olds often melt down at transitions because they feel powerless — not because they want to disobey. Maya is likely tired, overstimulated, and trying to hold on to a good moment.',
  sections: [
    {
      kind: 'what',
      label: 'What happened',
      body: 'Leaving the park triggered a big protest. She hit the ground and refused to walk. You felt the eyes of other parents and asked her twice, then lifted her.',
    },
    {
      kind: 'why',
      label: 'Why it happened',
      body: 'At 4, the prefrontal cortex is still forming. Fun + ending + hunger + public setting is a four-stack of stressors. Her body went into fight mode before her words could catch up.',
    },
    {
      kind: 'try',
      label: 'What to try next time',
      items: [
        { h: 'Signal transitions early', b: 'Give two warnings before leaving — a 10-minute and a 2-minute. Let her pick the last thing she does.' },
        { h: 'Name the feeling first', b: '"You were having so much fun. It’s really hard to stop." Don’t fix, just name it.' },
        { h: 'Offer a small choice', b: '"Do you want to walk to the car holding my hand, or hopping?" Control returns, meltdown softens.' },
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
