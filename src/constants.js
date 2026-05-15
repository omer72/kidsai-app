export const DEFAULT_KIDS = [
];

export const LOCATIONS = [
  { id: 'inside', label: 'Inside', hint: 'Home' },
  { id: 'outside', label: 'Outside', hint: 'Yard / park' },
  { id: 'public', label: 'Public', hint: 'Store, street' },
  { id: 'car', label: 'In the car', hint: 'Moving' },
];

export const MOODS = [
  { id: 'upset', label: 'Upset', glyph: '◐', tone: 'Crying, tantrum' },
  { id: 'anxious', label: 'Anxious', glyph: '○', tone: 'Clingy, withdrawn' },
  { id: 'angry', label: 'Angry', glyph: '◉', tone: 'Yelling, hitting' },
  { id: 'tired', label: 'Tired', glyph: '◑', tone: 'Overstimulated' },
  { id: 'happy', label: 'Happy', glyph: '●', tone: 'Engaged, playing' },
  { id: 'defiant', label: 'Defiant', glyph: '◎', tone: 'Pushing limits' },
];

export const INVOLVED = [
  { id: 'alone', label: 'Just us' },
  { id: 'sibling', label: 'Sibling' },
  { id: 'coparent', label: 'Co-parent' },
  { id: 'family', label: 'Family' },
  { id: 'stranger', label: 'Stranger' },
];

export const URGENCY = [
  { id: 'low', label: 'Low', desc: 'I have a minute', dot: '#4AAE8C' },
  { id: 'med', label: 'Medium', desc: 'Escalating', dot: '#E5A64B' },
  { id: 'high', label: 'High', desc: 'Right now', dot: '#D94A5C' },
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
