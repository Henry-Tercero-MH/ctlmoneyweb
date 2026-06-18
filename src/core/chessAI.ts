/** chessAI.ts — IA básica: prioriza capturas/jaque mate con algo de azar. */
import type { Chess, Move } from 'chess.js';

const VALUE: Record<string, number> = { p: 1, n: 3, b: 3, r: 5, q: 9, k: 0 };

export function pickAiMove(game: Chess): Move | null {
  const moves = game.moves({ verbose: true }) as Move[];
  if (moves.length === 0) return null;

  let best: Move[] = [];
  let bestScore = -Infinity;

  for (const m of moves) {
    let score = m.captured ? VALUE[m.captured] ?? 0 : 0;
    if (m.san.includes('#')) score += 100; // jaque mate
    else if (m.san.includes('+')) score += 0.5; // jaque
    if (m.isPromotion()) score += 8; // promoción
    score += Math.random() * 0.25; // desempate aleatorio

    if (score > bestScore) {
      bestScore = score;
      best = [m];
    } else if (score === bestScore) {
      best.push(m);
    }
  }

  return best[Math.floor(Math.random() * best.length)] ?? moves[0] ?? null;
}
