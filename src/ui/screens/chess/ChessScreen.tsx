import { useCallback, useEffect, useRef, useState } from 'react';
import { Chess, type Square, type Color, type PieceSymbol } from 'chess.js';
import { AnimatePresence, motion } from 'framer-motion';
import { RotateCcw, Volume2, VolumeX, Bot, Users, Timer } from 'lucide-react';
import { pickAiMove } from '@/core/chessAI';
import { sfx } from '@/core/sfx';
import { disintegrate } from '@/ui/effects/disintegrate';
import styles from './ChessScreen.module.css';

const FILES = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];

const GLYPH: Record<string, string> = {
  wk: '♔', wq: '♕', wr: '♖', wb: '♗', wn: '♘', wp: '♙',
  bk: '♚', bq: '♛', br: '♜', bb: '♝', bn: '♞', bp: '♟',
};

const VALUE: Record<PieceSymbol, number> = { p: 1, n: 3, b: 3, r: 5, q: 9, k: 0 };

type Mode = 'ai' | 'two';
type Outcome = { kind: 'win' | 'lose' | 'draw'; title: string; sub: string } | null;

function squareName(row: number, col: number): Square {
  return `${FILES[col]}${8 - row}` as Square;
}

export default function ChessScreen() {
  const gameRef = useRef(new Chess());
  const game = gameRef.current;

  const [, setTick] = useState(0);
  const refresh = useCallback(() => setTick((t) => t + 1), []);

  const [mode, setMode] = useState<Mode>('ai');
  const [selected, setSelected] = useState<Square | null>(null);
  const [targets, setTargets] = useState<Square[]>([]);
  const [lastMove, setLastMove] = useState<{ from: Square; to: Square } | null>(null);
  const [muted, setMuted] = useState(false);
  const [outcome, setOutcome] = useState<Outcome>(null);
  const aiTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Refs de las piezas por casilla, para desintegrar la capturada.
  const pieceRefs = useRef<Record<string, HTMLElement | null>>({});

  // ── Reloj ──
  const [timeMin, setTimeMin] = useState(5);
  const baseMs = timeMin * 60_000;
  const [whiteMs, setWhiteMs] = useState(baseMs);
  const [blackMs, setBlackMs] = useState(baseMs);
  const [started, setStarted] = useState(false);
  const lastTick = useRef(0);

  const board = game.board();
  const turn = game.turn();
  const inCheck = game.isCheck();
  const checkSquare = inCheck ? findKing(game, turn) : null;

  // Limpia timers al desmontar
  useEffect(() => () => { if (aiTimer.current) clearTimeout(aiTimer.current); }, []);

  // Cuenta regresiva del lado al que le toca mover.
  useEffect(() => {
    if (!started || outcome) return;
    lastTick.current = performance.now();
    const id = setInterval(() => {
      const now = performance.now();
      const delta = now - lastTick.current;
      lastTick.current = now;
      if (turn === 'w') setWhiteMs((ms) => Math.max(0, ms - delta));
      else setBlackMs((ms) => Math.max(0, ms - delta));
    }, 200);
    return () => clearInterval(id);
  }, [started, outcome, turn]);

  // Derrota por tiempo agotado.
  useEffect(() => {
    if (outcome) return;
    if (whiteMs <= 0) timeoutLoss('w');
    else if (blackMs <= 0) timeoutLoss('b');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [whiteMs, blackMs, outcome]);

  function timeoutLoss(side: Color) {
    if (mode === 'ai') {
      if (side === 'w') { sfx.lose(); setOutcome({ kind: 'lose', title: 'Tiempo agotado ⏱️', sub: 'Te quedaste sin tiempo' }); }
      else { sfx.win(); setOutcome({ kind: 'win', title: '¡Ganaste! 🏆', sub: 'La IA se quedó sin tiempo' }); }
    } else {
      sfx.win();
      const winner = side === 'w' ? 'Negras' : 'Blancas';
      setOutcome({ kind: 'win', title: `¡Ganan ${winner}! 🏆`, sub: 'Por tiempo' });
    }
  }

  function evaluateEnd() {
    if (!game.isGameOver()) {
      if (game.isCheck()) sfx.check();
      return false;
    }
    if (game.isCheckmate()) {
      // Quien acaba de mover ganó (turno actual = perdedor).
      const loser = game.turn();
      if (mode === 'ai') {
        if (loser === 'b') { sfx.win(); setOutcome({ kind: 'win', title: '¡Ganaste! 🏆', sub: 'Jaque mate a la IA' }); }
        else { sfx.lose(); setOutcome({ kind: 'lose', title: 'Jaque mate 😵', sub: 'Te ganó la IA' }); }
      } else {
        sfx.win();
        const winner = loser === 'w' ? 'Negras' : 'Blancas';
        setOutcome({ kind: 'win', title: `¡Ganan ${winner}! 🏆`, sub: 'Jaque mate' });
      }
    } else {
      sfx.draw();
      setOutcome({ kind: 'draw', title: 'Tablas 🤝', sub: game.isStalemate() ? 'Rey ahogado' : 'Empate' });
    }
    return true;
  }

  const applyMove = useCallback(async (from: Square, to: Square) => {
    // La pieza capturada (si la hay) ANTES de mover, para desintegrarla.
    const capturedNode = game.get(to) ? pieceRefs.current[to] : null;

    const mv = game.move({ from, to, promotion: 'q' });
    if (!mv) return;

    setSelected(null);
    setTargets([]);
    setLastMove({ from, to });

    if (mv.captured) {
      sfx.capture();
      // El tablero aún no se re-renderiza (solo cambia al llamar refresh),
      // así que el nodo capturado sigue en pantalla para desintegrarlo.
      if (capturedNode) { try { await disintegrate(capturedNode); } catch { /* fade fallback */ } }
    } else if (mv.isKingsideCastle() || mv.isQueensideCastle()) {
      sfx.castle();
    } else {
      sfx.move();
    }

    refresh();
    const ended = evaluateEnd();

    if (!ended && mode === 'ai' && game.turn() === 'b') {
      aiTimer.current = setTimeout(async () => {
        const aimv = pickAiMove(game);
        if (!aimv) return;
        const aiCapturedNode = aimv.captured ? pieceRefs.current[aimv.to as Square] : null;
        const res = game.move(aimv);
        setLastMove({ from: res.from as Square, to: res.to as Square });
        if (res.captured) {
          sfx.capture();
          if (aiCapturedNode) { try { await disintegrate(aiCapturedNode); } catch { /* fade fallback */ } }
        } else if (res.isKingsideCastle() || res.isQueensideCastle()) {
          sfx.castle();
        } else {
          sfx.move();
        }
        refresh();
        evaluateEnd();
      }, 450);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, refresh]);

  function onSquareClick(sq: Square) {
    sfx.unlock();
    if (outcome) return;
    if (mode === 'ai' && turn === 'b') return; // turno de la IA
    if (!started) setStarted(true); // arranca el reloj con la primera interacción

    const piece = game.get(sq);

    if (selected) {
      if (targets.includes(sq)) {
        applyMove(selected, sq);
        return;
      }
      if (piece && piece.color === turn) {
        selectSquare(sq);
        return;
      }
      setSelected(null);
      setTargets([]);
      return;
    }

    if (piece && piece.color === turn) selectSquare(sq);
  }

  function selectSquare(sq: Square) {
    const moves = game.moves({ square: sq, verbose: true });
    setSelected(sq);
    setTargets(moves.map((m) => m.to as Square));
    sfx.select();
  }

  function reset(clockMs = baseMs) {
    if (aiTimer.current) clearTimeout(aiTimer.current);
    game.reset();
    setSelected(null);
    setTargets([]);
    setLastMove(null);
    setOutcome(null);
    setWhiteMs(clockMs);
    setBlackMs(clockMs);
    setStarted(false);
    lastTick.current = 0;
    refresh();
  }

  function changeMode(m: Mode) {
    setMode(m);
    reset();
  }

  function setTime(min: number) {
    setTimeMin(min);
    reset(min * 60_000);
  }

  function toggleMute() {
    const next = !muted;
    setMuted(next);
    sfx.setMuted(next);
    if (!next) sfx.select();
  }

  // Material capturado para la barra de ventaja
  const captured = capturedPieces(game);

  return (
    <div className={styles.screen}>
      <header className={styles.header}>
        <h1 className={styles.title}>Ajedrez</h1>
        <div className={styles.headerActions}>
          <button className={styles.iconBtn} onClick={toggleMute} type="button" aria-label="Silencio">
            {muted ? <VolumeX size={18} strokeWidth={2} /> : <Volume2 size={18} strokeWidth={2} />}
          </button>
          <button className={styles.iconBtn} onClick={() => reset()} type="button" aria-label="Reiniciar">
            <RotateCcw size={18} strokeWidth={2} />
          </button>
        </div>
      </header>

      <div className={styles.body}>
        {/* Modo */}
        <div className={styles.modeRow}>
          <button
            className={`${styles.modeBtn} ${mode === 'ai' ? styles.modeActive : ''}`}
            onClick={() => changeMode('ai')}
            type="button"
          >
            <Bot size={16} strokeWidth={2} /> vs IA
          </button>
          <button
            className={`${styles.modeBtn} ${mode === 'two' ? styles.modeActive : ''}`}
            onClick={() => changeMode('two')}
            type="button"
          >
            <Users size={16} strokeWidth={2} /> 2 jugadores
          </button>
        </div>

        {/* Control de tiempo */}
        <div className={styles.timeRow}>
          <Timer size={15} strokeWidth={2} className={styles.timeIcon} />
          {[3, 5, 10].map((min) => (
            <button
              key={min}
              className={`${styles.timeBtn} ${timeMin === min ? styles.timeActive : ''}`}
              onClick={() => setTime(min)}
              type="button"
            >
              {min} min
            </button>
          ))}
        </div>

        {/* Relojes */}
        <div className={styles.clocks}>
          <div className={`${styles.clock} ${turn === 'b' && started && !outcome ? styles.clockActive : ''} ${blackMs <= 30_000 ? styles.clockLow : ''}`}>
            <span className={styles.clockSide}>Negras</span>
            <span className={styles.clockTime}>{fmtClock(blackMs)}</span>
          </div>
          <div className={`${styles.clock} ${turn === 'w' && started && !outcome ? styles.clockActive : ''} ${whiteMs <= 30_000 ? styles.clockLow : ''}`}>
            <span className={styles.clockSide}>Blancas</span>
            <span className={styles.clockTime}>{fmtClock(whiteMs)}</span>
          </div>
        </div>

        {/* Estado del turno */}
        <div className={`${styles.turnBar} ${inCheck ? styles.turnCheck : ''}`}>
          <span className={`${styles.turnDot} ${turn === 'w' ? styles.dotWhite : styles.dotBlack}`} />
          {outcome
            ? 'Partida terminada'
            : inCheck
              ? `¡Jaque! Mueven ${turn === 'w' ? 'blancas' : 'negras'}`
              : `Mueven ${turn === 'w' ? 'blancas' : 'negras'}`}
        </div>

        {/* Tablero */}
        <div className={styles.boardWrap}>
          <div className={styles.board}>
            {board.map((rowArr, r) =>
              rowArr.map((cell, c) => {
                const sq = squareName(r, c);
                const dark = (r + c) % 2 === 1;
                const isSel = selected === sq;
                const isTarget = targets.includes(sq);
                const isLast = lastMove && (lastMove.from === sq || lastMove.to === sq);
                const isCheck = checkSquare === sq;
                const pieceKey = cell ? `${cell.color}${cell.type}` : null;

                return (
                  <div
                    key={sq}
                    className={[
                      styles.cell,
                      dark ? styles.dark : styles.light,
                      isSel ? styles.selected : '',
                      isLast ? styles.lastMove : '',
                      isCheck ? styles.check : '',
                    ].join(' ')}
                    onClick={() => onSquareClick(sq)}
                    role="button"
                    tabIndex={0}
                  >
                    {isTarget && <span className={cell ? styles.captureRing : styles.dot} />}

                    <AnimatePresence mode="popLayout">
                      {pieceKey && (
                        <motion.span
                          key={pieceKey + sq}
                          ref={(el: HTMLElement | null) => { pieceRefs.current[sq] = el; }}
                          className={styles.piece}
                          initial={{ scale: 0, rotate: -25 }}
                          animate={{ scale: 1, rotate: 0 }}
                          exit={{ scale: 0, opacity: 0 }}
                          transition={{ type: 'spring', stiffness: 600, damping: 22 }}
                          whileTap={{ scale: 1.18 }}
                        >
                          <span className={`${styles.glass} ${cell!.color === 'w' ? styles.glassWhite : styles.glassBlack}`} />
                          <img
                            src={`${import.meta.env.BASE_URL}pieces/${pieceKey}.svg`}
                            alt=""
                            className={styles.pieceImg}
                            draggable={false}
                          />
                        </motion.span>
                      )}
                    </AnimatePresence>

                  </div>
                );
              }),
            )}
          </div>
        </div>

        {/* Capturas / ventaja */}
        <div className={styles.capturedRow}>
          <CapturedStrip glyphsColor="b" list={captured.byWhite} advantage={captured.advantage} side="w" />
          <CapturedStrip glyphsColor="w" list={captured.byBlack} advantage={-captured.advantage} side="b" />
        </div>
      </div>

      {/* Resultado */}
      <AnimatePresence>
        {outcome && (
          <motion.div
            className={styles.overlay}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            {outcome.kind !== 'lose' && <Confetti />}
            <motion.div
              className={styles.resultCard}
              initial={{ scale: 0.7, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              transition={{ type: 'spring', stiffness: 400, damping: 24 }}
            >
              <p className={styles.resultTitle}>{outcome.title}</p>
              <p className={styles.resultSub}>{outcome.sub}</p>
              <button className={styles.playAgain} onClick={() => reset()} type="button">
                Jugar de nuevo
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ── Subcomponentes ──────────────────────────────────────────────────────────

function Confetti() {
  const parts = Array.from({ length: 40 });
  const colors = ['#ff5fa2', '#ffd166', '#5fd0ff', '#9b5fff', '#5fffa6'];
  return (
    <div className={styles.confetti} aria-hidden>
      {parts.map((_, i) => (
        <motion.span
          key={i}
          className={styles.confettiPiece}
          initial={{ y: -40, x: `${Math.random() * 100}%`, rotate: 0, opacity: 1 }}
          animate={{ y: '110vh', rotate: 720, opacity: 0.9 }}
          transition={{ duration: 1.6 + Math.random() * 1.2, delay: Math.random() * 0.5, ease: 'easeIn' }}
          style={{ background: colors[i % colors.length], left: `${Math.random() * 100}%` }}
        />
      ))}
    </div>
  );
}

function CapturedStrip({
  glyphsColor,
  list,
  advantage,
  side,
}: {
  glyphsColor: Color;
  list: PieceSymbol[];
  advantage: number;
  side: Color;
}) {
  return (
    <div className={styles.capStrip}>
      <span className={styles.capLabel}>{side === 'w' ? 'Blancas' : 'Negras'}</span>
      <span className={styles.capGlyphs}>
        {list.map((p, i) => (
          <span key={i}>{GLYPH[`${glyphsColor}${p}`]}</span>
        ))}
      </span>
      {advantage > 0 && <span className={styles.capAdv}>+{advantage}</span>}
    </div>
  );
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function fmtClock(ms: number): string {
  const total = Math.max(0, Math.ceil(ms / 1000));
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}

function findKing(game: Chess, color: Color): Square | null {
  for (const row of game.board()) {
    for (const cell of row) {
      if (cell && cell.type === 'k' && cell.color === color) return cell.square;
    }
  }
  return null;
}

function capturedPieces(game: Chess): { byWhite: PieceSymbol[]; byBlack: PieceSymbol[]; advantage: number } {
  const byWhite: PieceSymbol[] = []; // piezas negras capturadas por blancas
  const byBlack: PieceSymbol[] = [];
  for (const m of game.history({ verbose: true })) {
    if (!m.captured) continue;
    if (m.color === 'w') byWhite.push(m.captured);
    else byBlack.push(m.captured);
  }
  const sum = (arr: PieceSymbol[]) => arr.reduce((s, p) => s + (VALUE[p] ?? 0), 0);
  return { byWhite, byBlack, advantage: sum(byWhite) - sum(byBlack) };
}
