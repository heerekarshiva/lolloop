// Swap with your existing JSON question bank if you like (same shape).
export interface Question { q: string; choices: string[]; correct: number; explain: string }

export const QUESTIONS: Question[] = [
  { q: 'How many months have 28 days?', choices: ['1', '2', '12', 'Depends on the year'], correct: 2, explain: 'Every month has at least 28 days. Sneaky.' },
  { q: 'A farmer has 17 sheep. All but 9 run away. How many are left?', choices: ['8', '9', '17', '0'], correct: 1, explain: '"All but 9" means 9 stayed. The other 8 are living their best life.' },
  { q: 'What gets wetter the more it dries?', choices: ['A sponge', 'A towel', 'Rain', 'A fish'], correct: 1, explain: 'The towel does the drying, so the towel gets wet.' },
  { q: 'Which weighs more: a kilo of feathers or a kilo of bricks?', choices: ['Feathers', 'Bricks', 'Neither', 'Depends on the bricks'], correct: 2, explain: 'A kilo is a kilo. The feathers just need a bigger bag.' },
  { q: 'Before Everest was discovered, what was the highest mountain on Earth?', choices: ['K2', 'Kangchenjunga', 'Mount Everest', 'Mauna Kea'], correct: 2, explain: 'Everest was always there. We just hadn\'t been introduced.' },
  { q: 'You overtake the person in 2nd place in a race. What place are you in?', choices: ['1st', '2nd', '3rd', 'Last'], correct: 1, explain: 'You took their spot. 2nd. Not 1st.' },
  { q: 'How many animals of each kind did Moses take on the Ark?', choices: ['2', '7', 'None', '14'], correct: 2, explain: 'It was Noah, not Moses.' },
  { q: 'What can you hold in your right hand but never in your left?', choices: ['A left hand', 'Your right elbow', 'A secret', 'A spoon'], correct: 0, explain: 'Your left hand can\'t hold itself. Try it.' },
];
