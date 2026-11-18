import type { Action, MPGame, RoomState } from '@/types/multiplayer';
import { QUESTIONS } from './questions';

export const TAP_MS = 10_000, BTN_MS = 30_000, Q_MS = 12_000, REVEAL_MS = 4_000, COUNTDOWN_MS = 3_000, ROUNDS = 6;
const TAP_GRACE = 400;
const LINES = [[0,1,2],[3,4,5],[6,7,8],[0,3,6],[1,4,7],[2,5,8],[0,4,8],[2,4,6]];

export const GAMES: Record<MPGame, { name: string; blurb: string }> = {
  'tic-tac-toe': { name: 'Tic Tac Toe Battle 3D', blurb: '3D holographic grid duel. Outsmart your opponent.' },
  'duo-dash': { name: 'Duo Dash 3D', blurb: 'Synchronized obstacle course sprint race.' },
  'quiz-royale': { name: 'Quiz Royale 3D', blurb: 'Trivia gameshow spotlights. Buzz in fastest.' },
  'tap-war': { name: 'Tap War 3D', blurb: 'Tug-of-war button smasher test of speed.' },
  'rock-paper-clash': { name: 'Rock Paper Clash 3D', blurb: '3D avatar showdown. Outpredict your rival.' },
  'four-in-a-row': { name: 'Four in a Row 3D', blurb: 'Connect 4 gravity drop board battle.' },
  'pong-rivals': { name: 'Pong Rivals 3D', blurb: 'High-speed cyber pong duel with spin physics.' },
  'snake-arena': { name: 'Snake Arena 3D', blurb: 'Competitive 3D slither battle in a shrinking dome.' },
  'draw-guess': { name: 'Draw & Guess 3D', blurb: 'Voxel sculpting & AI prompt guessing studio.' },
  'mini-battle-arena': { name: 'Mini Battle Arena 3D', blurb: 'Bumper car sumo brawl. Knock players out of the ring.' },
  'you-and-me': { name: 'You & Me 3D Co-Op', blurb: 'Signature cooperative adventure with Ember & Glacio.' },
  'tap-like-crazy': { name: 'Tap Like Crazy', blurb: '10 seconds. Most taps wins.' },
  'wrong-answer-wins': { name: 'The Wrong Answer Wins', blurb: 'Trick questions. Fast and right scores more.' },
  'dont-press-the-button': { name: "Don't Press the Button", blurb: 'Last one to cave wins.' },
};

const shuffle = <T,>(a: T[]) => { const b = [...a]; for (let i = b.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [b[i], b[j]] = [b[j], b[i]]; } return b; };

export function lobbyState(game: MPGame, now: number): RoomState {
  return { game, phase: 'lobby', hostNow: now, startsAt: 0, endsAt: 0, scores: {}, order: [], qi: 0, qStartedAt: 0, answers: {}, out: {}, gained: {}, board: Array(9).fill(''), turn: '', p: [] };
}

export function startGame(s: RoomState, ids: string[], now: number): RoomState {
  const startsAt = now + COUNTDOWN_MS;
  const dur = s.game === 'tic-tac-toe' ? 3_600_000 : s.game === 'tap-like-crazy' ? TAP_MS : s.game === 'dont-press-the-button' ? BTN_MS : Q_MS;
  return {
    ...lobbyState(s.game, now), phase: 'countdown', startsAt, endsAt: startsAt + dur, qStartedAt: startsAt,
    scores: Object.fromEntries(ids.map((i) => [i, 0])),
    p: ids.slice(0, 2), turn: ids[0] ?? '',
    order: shuffle(QUESTIONS.map((_, i) => i)).slice(0, ROUNDS),
  };
}

// Returns next state, or null if the action is invalid / changes nothing.
export function applyAction(s: RoomState, id: string, a: Action, now: number): RoomState | null {
  if (s.phase !== 'playing') return null;
  if (a.type === 'tap' && s.game === 'tap-like-crazy') {
    if (now > s.endsAt + TAP_GRACE || !Number.isFinite(a.count)) return null;
    const cap = Math.ceil(((now - s.startsAt) / 1000) * 16) + 3; // anti-cheat: ~16 taps/s ceiling
    const count = Math.max(0, Math.min(Math.floor(a.count), cap));
    if (count <= (s.scores[id] ?? 0)) return null;
    return { ...s, scores: { ...s.scores, [id]: count } };
  }
  if (a.type === 'press' && s.game === 'dont-press-the-button') {
    if (s.out[id] !== undefined || now > s.endsAt) return null;
    const t = Math.max(0, now - s.startsAt);
    return { ...s, out: { ...s.out, [id]: t }, scores: { ...s.scores, [id]: t } };
  }
  if (a.type === 'move' && s.game === 'tic-tac-toe') {
    if (s.turn !== id || !Number.isInteger(a.cell) || a.cell < 0 || a.cell > 8 || s.board[a.cell]) return null;
    const board = s.board.map((c, i) => (i === a.cell ? id : c));
    const won = LINES.some((l) => l.every((i) => board[i] === id));
    const full = board.every(Boolean);
    const next = s.p.find((x) => x !== id) ?? id;
    if (won || full) return { ...s, board, phase: 'results', scores: { ...s.scores, [id]: won ? 1 : 0 } };
    return { ...s, board, turn: next };
  }
  if (a.type === 'answer' && s.game === 'wrong-answer-wins') {
    const q = QUESTIONS[s.order[s.qi]];
    if (!q || a.qi !== s.qi || s.answers[id] || now > s.endsAt + 300) return null;
    if (!Number.isInteger(a.choice) || a.choice < 0 || a.choice >= q.choices.length) return null;
    return { ...s, answers: { ...s.answers, [id]: { choice: a.choice, at: now } } };
  }
  return null;
}

function scoreQuestion(s: RoomState, now: number): RoomState {
  const q = QUESTIONS[s.order[s.qi]];
  const scores = { ...s.scores }, gained: Record<string, number> = {};
  for (const [id, a] of Object.entries(s.answers)) {
    if (a.choice !== q.correct) continue;
    gained[id] = 100 + Math.round(50 * Math.max(0, 1 - (a.at - s.qStartedAt) / Q_MS));
    scores[id] = (scores[id] ?? 0) + gained[id];
  }
  return { ...s, scores, gained, phase: 'reveal', endsAt: now + REVEAL_MS, hostNow: now };
}

// Called by the host every 250ms. Returns next state or null.
export function tick(s: RoomState, ids: string[], now: number): RoomState | null {
  switch (s.phase) {
    case 'countdown':
      return now >= s.startsAt ? { ...s, phase: 'playing', hostNow: now } : null;
    case 'playing': {
      if (s.game === 'wrong-answer-wins') {
        const all = ids.length > 0 && ids.every((i) => s.answers[i]);
        return now >= s.endsAt || all ? scoreQuestion(s, now) : null;
      }
      if (s.game === 'dont-press-the-button') {
        const all = ids.length > 0 && ids.every((i) => s.out[i] !== undefined);
        if (now < s.endsAt && !all) return null;
        const scores = { ...s.scores };
        ids.forEach((i) => { if (s.out[i] === undefined) scores[i] = BTN_MS; });
        return { ...s, scores, phase: 'results', hostNow: now };
      }
      return now >= s.endsAt + TAP_GRACE ? { ...s, phase: 'results', hostNow: now } : null;
    }
    case 'reveal':
      if (now < s.endsAt) return null;
      if (s.qi + 1 >= s.order.length) return { ...s, phase: 'results', hostNow: now };
      return { ...s, phase: 'playing', qi: s.qi + 1, qStartedAt: now, endsAt: now + Q_MS, answers: {}, gained: {}, hostNow: now };
    default:
      return null;
  }
}
