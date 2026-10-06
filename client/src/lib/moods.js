// The five-point check-in scale used everywhere a mood is shown.
export const MOODS = [
  { score: 1, emoji: '😞', label: 'Awful', bar: 'bg-warmth' },
  { score: 2, emoji: '😕', label: 'Low', bar: 'bg-warmth/70' },
  { score: 3, emoji: '😐', label: 'Okay', bar: 'bg-honey' },
  { score: 4, emoji: '🙂', label: 'Good', bar: 'bg-primary/70' },
  { score: 5, emoji: '😄', label: 'Great', bar: 'bg-primary' },
];

export const moodFor = (score) => MOODS.find((mood) => mood.score === score);

export const MOOD_TAGS = ['Sleep', 'School', 'Work', 'Family', 'Friends', 'Money', 'Health', 'Relationship'];
