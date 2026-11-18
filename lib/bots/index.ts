// LOLLOOP Intelligent AI Bot System
// Provides genuine game-rule AI opponents and teammates with 4 difficulty tiers: Easy, Medium, Hard, Expert.

export type BotDifficulty = 'Easy' | 'Medium' | 'Hard' | 'Expert';

// ----------------------------------------------------------------------
// 1. TIC TAC TOE MINIMAX AI
// ----------------------------------------------------------------------
export function getTicTacToeMove(board: (string | null)[], botSymbol: string, humanSymbol: string, difficulty: BotDifficulty): number {
  const available: number[] = [];
  board.forEach((val, idx) => {
    if (!val) available.push(idx);
  });
  if (available.length === 0) return -1;

  // Easy: 50% random move
  if (difficulty === 'Easy' && Math.random() < 0.5) {
    return available[Math.floor(Math.random() * available.length)];
  }
  // Medium: 25% random move
  if (difficulty === 'Medium' && Math.random() < 0.25) {
    return available[Math.floor(Math.random() * available.length)];
  }

  // Check if bot can win immediately
  for (const idx of available) {
    board[idx] = botSymbol;
    if (checkTicTacToeWinner(board) === botSymbol) {
      board[idx] = null;
      return idx;
    }
    board[idx] = null;
  }

  // Check if human can win on next move, block them
  for (const idx of available) {
    board[idx] = humanSymbol;
    if (checkTicTacToeWinner(board) === humanSymbol) {
      board[idx] = null;
      return idx;
    }
    board[idx] = null;
  }

  // Hard / Expert: Full Minimax
  let bestScore = -Infinity;
  let bestMove = available[0];

  for (const idx of available) {
    board[idx] = botSymbol;
    const score = minimaxTicTacToe(board, 0, false, botSymbol, humanSymbol);
    board[idx] = null;
    if (score > bestScore) {
      bestScore = score;
      bestMove = idx;
    }
  }

  return bestMove;
}

function checkTicTacToeWinner(b: (string | null)[]): string | null {
  const lines = [
    [0, 1, 2], [3, 4, 5], [6, 7, 8],
    [0, 3, 6], [1, 4, 7], [2, 5, 8],
    [0, 4, 8], [2, 4, 6],
  ];
  for (const [x, y, z] of lines) {
    if (b[x] && b[x] === b[y] && b[x] === b[z]) return b[x];
  }
  return null;
}

function minimaxTicTacToe(b: (string | null)[], depth: number, isMaximizing: boolean, bot: string, human: string): number {
  const winner = checkTicTacToeWinner(b);
  if (winner === bot) return 10 - depth;
  if (winner === human) return depth - 10;
  if (b.every((x) => x !== null)) return 0;

  if (isMaximizing) {
    let best = -Infinity;
    for (let i = 0; i < 9; i++) {
      if (!b[i]) {
        b[i] = bot;
        best = Math.max(best, minimaxTicTacToe(b, depth + 1, false, bot, human));
        b[i] = null;
      }
    }
    return best;
  } else {
    let best = Infinity;
    for (let i = 0; i < 9; i++) {
      if (!b[i]) {
        b[i] = human;
        best = Math.min(best, minimaxTicTacToe(b, depth + 1, true, bot, human));
        b[i] = null;
      }
    }
    return best;
  }
}

// ----------------------------------------------------------------------
// 2. FOUR IN A ROW TACTICAL LOOKAHEAD AI
// ----------------------------------------------------------------------
export function getFourInARowMove(grid: number[][], botPlayer: number, difficulty: BotDifficulty): number {
  const cols = 7;
  const validCols: number[] = [];
  for (let c = 0; c < cols; c++) {
    if (grid[0][c] === 0) validCols.push(c);
  }
  if (validCols.length === 0) return 3;

  if (difficulty === 'Easy' && Math.random() < 0.45) {
    return validCols[Math.floor(Math.random() * validCols.length)];
  }

  const human = botPlayer === 1 ? 2 : 1;

  // Immediate winning move
  for (const c of validCols) {
    const r = getDropRow(grid, c);
    grid[r][c] = botPlayer;
    if (checkFourInARowWin(grid, r, c, botPlayer)) {
      grid[r][c] = 0;
      return c;
    }
    grid[r][c] = 0;
  }

  // Immediate block move
  for (const c of validCols) {
    const r = getDropRow(grid, c);
    grid[r][c] = human;
    if (checkFourInARowWin(grid, r, c, human)) {
      grid[r][c] = 0;
      return c;
    }
    grid[r][c] = 0;
  }

  // Center column preference heuristic
  const pref = [3, 2, 4, 1, 5, 0, 6];
  for (const c of pref) {
    if (validCols.includes(c)) return c;
  }

  return validCols[0];
}

function getDropRow(grid: number[][], col: number): number {
  for (let r = 5; r >= 0; r--) {
    if (grid[r][col] === 0) return r;
  }
  return -1;
}

function checkFourInARowWin(grid: number[][], r: number, c: number, p: number): boolean {
  const directions = [
    [0, 1], [1, 0], [1, 1], [1, -1]
  ];
  for (const [dr, dc] of directions) {
    let count = 1;
    for (let step = 1; step <= 3; step++) {
      const nr = r + dr * step, nc = c + dc * step;
      if (nr >= 0 && nr < 6 && nc >= 0 && nc < 7 && grid[nr][nc] === p) count++;
      else break;
    }
    for (let step = 1; step <= 3; step++) {
      const nr = r - dr * step, nc = c - dc * step;
      if (nr >= 0 && nr < 6 && nc >= 0 && nc < 7 && grid[nr][nc] === p) count++;
      else break;
    }
    if (count >= 4) return true;
  }
  return false;
}

// ----------------------------------------------------------------------
// 3. PONG PREDICTIVE AI
// ----------------------------------------------------------------------
export function updatePongPaddleAI(
  paddleY: number,
  ballY: number,
  ballVy: number,
  difficulty: BotDifficulty,
  paddleHeight: number = 2.0,
  speed: number = 0.12
): number {
  let targetY = ballY + (ballVy > 0 ? 0.2 : -0.2);
  let errorMargin = 0;
  let moveSpeed = speed;

  switch (difficulty) {
    case 'Easy':
      errorMargin = (Math.random() - 0.5) * 1.5;
      moveSpeed = speed * 0.6;
      break;
    case 'Medium':
      errorMargin = (Math.random() - 0.5) * 0.8;
      moveSpeed = speed * 0.85;
      break;
    case 'Hard':
      errorMargin = (Math.random() - 0.5) * 0.25;
      moveSpeed = speed * 1.05;
      break;
    case 'Expert':
      errorMargin = 0;
      moveSpeed = speed * 1.25;
      break;
  }

  targetY += errorMargin;
  if (paddleY < targetY - 0.2) {
    return paddleY + moveSpeed;
  } else if (paddleY > targetY + 0.2) {
    return paddleY - moveSpeed;
  }
  return paddleY;
}

// ----------------------------------------------------------------------
// 4. ROCK PAPER CLASH PATTERN PREDICTOR AI
// ----------------------------------------------------------------------
export function getRockPaperClashChoice(history: ('rock' | 'paper' | 'scissors')[], difficulty: BotDifficulty): 'rock' | 'paper' | 'scissors' {
  const choices: ('rock' | 'paper' | 'scissors')[] = ['rock', 'paper', 'scissors'];
  if (history.length < 2 || difficulty === 'Easy') {
    return choices[Math.floor(Math.random() * choices.length)];
  }

  // Count player frequency
  const counts = { rock: 0, paper: 0, scissors: 0 };
  history.forEach((h) => counts[h]++);

  // Find most frequent player choice
  let mostFrequent: 'rock' | 'paper' | 'scissors' = 'rock';
  if (counts.paper > counts[mostFrequent]) mostFrequent = 'paper';
  if (counts.scissors > counts[mostFrequent]) mostFrequent = 'scissors';

  // Counter the most frequent
  const counter: Record<'rock' | 'paper' | 'scissors', 'rock' | 'paper' | 'scissors'> = {
    rock: 'paper',
    paper: 'scissors',
    scissors: 'rock',
  };

  if (difficulty === 'Medium') {
    return Math.random() < 0.6 ? counter[mostFrequent] : choices[Math.floor(Math.random() * 3)];
  }
  return counter[mostFrequent];
}

// ----------------------------------------------------------------------
// 5. TAP WAR DYNAMIC RATE BOT
// ----------------------------------------------------------------------
export function getTapWarIntervalMs(difficulty: BotDifficulty): number {
  switch (difficulty) {
    case 'Easy':
      return 350 + Math.random() * 100; // ~2.5 - 3 taps/sec
    case 'Medium':
      return 180 + Math.random() * 60;  // ~5 taps/sec
    case 'Hard':
      return 110 + Math.random() * 40;  // ~8-9 taps/sec
    case 'Expert':
      return 75 + Math.random() * 25;   // ~12-14 taps/sec
  }
}

// ----------------------------------------------------------------------
// 6. TRIVIA & QUIZ ROYALE AI
// ----------------------------------------------------------------------
export function getQuizBotAnswer(correctChoice: number, choicesCount: number, difficulty: BotDifficulty): { choice: number; delayMs: number } {
  let accuracy = 0.4;
  let baseDelay = 3500;

  switch (difficulty) {
    case 'Easy':
      accuracy = 0.45;
      baseDelay = 3200;
      break;
    case 'Medium':
      accuracy = 0.70;
      baseDelay = 2200;
      break;
    case 'Hard':
      accuracy = 0.90;
      baseDelay = 1400;
      break;
    case 'Expert':
      accuracy = 0.98;
      baseDelay = 800;
      break;
  }

  const isCorrect = Math.random() < accuracy;
  let choice = correctChoice;
  if (!isCorrect) {
    const wrong = Array.from({ length: choicesCount }, (_, i) => i).filter((i) => i !== correctChoice);
    choice = wrong[Math.floor(Math.random() * wrong.length)];
  }

  const delayMs = baseDelay + Math.floor(Math.random() * 800);
  return { choice, delayMs };
}

// ----------------------------------------------------------------------
// 7. COOPERATIVE YOU & ME AI BUDDY
// ----------------------------------------------------------------------
export interface CoOpEntity {
  x: number;
  z: number;
  type: 'player' | 'switch' | 'door' | 'hazard' | 'goal';
  active?: boolean;
}

export function updateYouAndMeCoOpAI(
  aiPos: { x: number; z: number },
  playerPos: { x: number; z: number },
  switchPos: { x: number; z: number; isPressed: boolean },
  goalPos: { x: number; z: number },
  doorOpen: boolean,
  dt: number = 0.016
): { x: number; z: number; state: string } {
  let target = goalPos;
  let state = 'following';

  // If door is closed and switch needs pressing, AI goes to switch
  if (!doorOpen && !switchPos.isPressed) {
    target = switchPos;
    state = 'holding_switch';
  } else if (!doorOpen && switchPos.isPressed) {
    // Hold position on switch so player can walk through!
    target = switchPos;
    state = 'holding_switch';
  } else {
    // Door is open, head to exit portal together!
    target = goalPos;
    state = 'heading_to_goal';
  }

  const dx = target.x - aiPos.x;
  const dz = target.z - aiPos.z;
  const dist = Math.sqrt(dx * dx + dz * dz);
  const speed = 3.5 * dt;

  if (dist > 0.15) {
    return {
      x: aiPos.x + (dx / dist) * Math.min(speed, dist),
      z: aiPos.z + (dz / dist) * Math.min(speed, dist),
      state,
    };
  }

  return { x: aiPos.x, z: aiPos.z, state };
}
