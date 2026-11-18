export type MPGame =
  | 'tic-tac-toe'
  | 'duo-dash'
  | 'quiz-royale'
  | 'tap-war'
  | 'rock-paper-clash'
  | 'four-in-a-row'
  | 'pong-rivals'
  | 'snake-arena'
  | 'draw-guess'
  | 'mini-battle-arena'
  | 'you-and-me'
  | 'tap-like-crazy'
  | 'wrong-answer-wins'
  | 'dont-press-the-button';

export type Phase = 'lobby' | 'countdown' | 'playing' | 'reveal' | 'results';

export interface Player { id: string; name: string; isHost: boolean }

export interface RoomState {
  game: MPGame;
  phase: Phase;
  hostNow: number;               // host clock when this snapshot was sent
  startsAt: number;              // end of countdown (host clock)
  endsAt: number;                // end of current phase (host clock)
  scores: Record<string, number>; // taps | quiz points | ms resisted
  order: number[];               // quiz: indices into QUESTIONS
  qi: number;                    // quiz: current question index in `order`
  qStartedAt: number;
  answers: Record<string, { choice: number; at: number }>;
  out: Record<string, number>;   // button game: ms at which each player pressed
  gained: Record<string, number>; // quiz: points earned on last question
  board: string[];               // tic-tac-toe / board: '' or player id per cell
  turn: string;
  p: string[];                   // player ids in match
}

export type Action =
  | { type: 'tap'; count: number }
  | { type: 'press' }
  | { type: 'answer'; qi: number; choice: number }
  | { type: 'move'; cell: number };
