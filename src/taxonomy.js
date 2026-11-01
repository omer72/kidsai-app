// Closed enums for the guidance response. Ids stay English.
// `unclassified` is client-only for old history rows and is never sent.

export const SITUATIONS = [
  { id: 'transitions' },
  { id: 'bedtime_sleep' },
  { id: 'screens' },
  { id: 'homework_tasks' },
  { id: 'limits_cooperation' },
  { id: 'tantrum_anger' },
  { id: 'siblings' },
  { id: 'social_friends' },
  { id: 'fears_anxiety' },
  { id: 'eating' },
  { id: 'other' },
  { id: 'unclassified' },
];

export const MOVES = [
  { id: 'acknowledge' },
  { id: 'name_feeling' },
  { id: 'fantasy' },
  { id: 'choice' },
  { id: 'describe' },
  { id: 'give_info' },
  { id: 'one_word' },
  { id: 'own_feeling' },
  { id: 'note' },
  { id: 'amends' },
  { id: 'problem_solving' },
  { id: 'hint' },
  { id: 'overhear' },
  { id: 'co_regulate' },
  { id: 'connect' },
  { id: 'other' },
];

export const SITUATION_IDS = new Set(SITUATIONS.map((s) => s.id));
export const MOVE_IDS = new Set(MOVES.map((m) => m.id));
export const PUBLIC_SITUATION_IDS = new Set(
  SITUATIONS.map((s) => s.id).filter((id) => id !== 'unclassified'),
);

// More specific buckets win a tie when an old entry has no saved situation.
const KEYWORD_ORDER = [
  'fears_anxiety',
  'eating',
  'screens',
  'homework_tasks',
  'siblings',
  'social_friends',
  'bedtime_sleep',
  'transitions',
  'tantrum_anger',
  'limits_cooperation',
];

const SITUATION_KEYWORDS = {
  transitions: ['transition', 'leaving', 'leave the', 'car seat', 'buckle', 'park', 'מעבר', 'יציאה', 'לצאת', 'פארק', 'מושב'],
  bedtime_sleep: ['bedtime', 'sleep', 'asleep', 'nap', 'waking', 'שינה', 'לישון', 'נרדם', 'מיטה', 'השכבה'],
  screens: ['screen', 'ipad', 'iphone', 'tablet', 'youtube', 'מסך', 'טאבלט', 'אייפד'],
  homework_tasks: ['homework', 'chore', 'worksheet', 'שיעורי בית', 'שיעורים', 'מטלה'],
  limits_cooperation: ['brush', 'teeth', 'refused', 'cooperate', 'limit', 'שיניים', 'לא מוכן', 'מסרב', 'גבול'],
  tantrum_anger: ['tantrum', 'meltdown', 'scream', 'kicked', 'angry', 'התפרצ', 'צעק', 'צרח', 'מכה', 'בעט', 'כעס'],
  siblings: ['sibling', 'brother', 'sister', 'אחים', 'אחיות', 'אחות', 'אח'],
  social_friends: ['friend', 'birthday', 'חבר', 'חברה', 'יום הולדת'],
  fears_anxiety: ['scared', 'afraid', 'anxiety', 'fear', 'nightmare', 'פחד', 'חרדה', 'מפחד'],
  eating: ['dinner', 'breakfast', 'lunch', 'eating', 'hungry', 'food', 'אוכל', 'לאכול', 'ארוחה', 'רעב'],
};

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function keywordHits(text, keyword) {
  const re = new RegExp(`(?:^|[^\\p{L}\\p{N}])${escapeRegExp(keyword)}(?=$|[^\\p{L}\\p{N}])`, 'giu');
  return (text.match(re) || []).length;
}

export function classifySituation(entry) {
  const raw = entry?.situation;
  if (PUBLIC_SITUATION_IDS.has(raw)) return raw;
  const text = `${entry?.story || ''} ${entry?.title || ''}`;
  let best = null;
  let bestScore = 0;
  for (const id of KEYWORD_ORDER) {
    let score = 0;
    for (const keyword of SITUATION_KEYWORDS[id] || []) score += keywordHits(text, keyword);
    if (score > bestScore) {
      best = id;
      bestScore = score;
    }
  }
  return best || 'unclassified';
}

export function normalizeGuidance(response) {
  if (!response || typeof response !== 'object') return response;
  const situation = PUBLIC_SITUATION_IDS.has(response.situation) ? response.situation : 'other';
  const sections = Array.isArray(response.sections)
    ? response.sections.map((section) => {
      if (!section || section.kind !== 'try' || !Array.isArray(section.items)) return section;
      return {
        ...section,
        items: section.items.map((item) => ({
          ...(item || {}),
          move: MOVE_IDS.has(item?.move) ? item.move : 'other',
        })),
      };
    })
    : response.sections;
  return { ...response, situation, sections };
}

// JS Date.getDay() is 0..6 from Sunday. Capacitor local notifications use 1..7 from Sunday.
export function capacitorWeekday(jsDay) {
  const day = Number(jsDay);
  if (!Number.isInteger(day) || day < 0 || day > 6) return 6;
  return day + 1;
}
