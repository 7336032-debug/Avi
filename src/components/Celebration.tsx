"use client";

// A small celebratory moment for hitting the weekly facials goal — inspired
// by (not copied from) tochnit-hachlama's Celebration.jsx, but built with
// plain CSS animations instead of canvas-confetti so it stays dependency-free.

import { useEffect, useState } from "react";

const CONFETTI_EMOJI = ["🎉", "✨", "🌟", "💛", "🎊", "💪"];

interface ConfettiPiece {
  id: number;
  left: number;
  delay: number;
  duration: number;
  emoji: string;
}

export function GoalCelebration({
  open,
  title,
  message,
  onDismiss,
}: {
  open: boolean;
  title: string;
  message: string;
  onDismiss: () => void;
}) {
  // Random confetti positions are generated as a side effect (not during
  // render) — Math.random() during render is impure and can produce
  // unstable output across re-renders.
  const [pieces, setPieces] = useState<ConfettiPiece[]>([]);

  useEffect(() => {
    if (!open) return;
    // Deferred a microtask so the random generation lives in a callback
    // rather than as a synchronous statement in the effect body.
    Promise.resolve().then(() => {
      setPieces(
        Array.from({ length: 16 }, (_, i) => ({
          id: i,
          left: Math.round(Math.random() * 100),
          delay: Math.round(Math.random() * 400) / 1000,
          duration: 1.4 + Math.random() * 0.8,
          emoji: CONFETTI_EMOJI[i % CONFETTI_EMOJI.length],
        })),
      );
    });
  }, [open]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-6"
      role="dialog"
      aria-modal="true"
      onClick={onDismiss}
    >
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        {pieces.map((p) => (
          <span
            key={p.id}
            className="absolute top-0 text-2xl"
            style={{
              left: `${p.left}%`,
              animation: `confetti-fall ${p.duration}s ease-in ${p.delay}s 1`,
            }}
            aria-hidden
          >
            {p.emoji}
          </span>
        ))}
      </div>
      <div
        className="relative w-full max-w-xs rounded-3xl bg-surface p-6 text-center shadow-xl"
        style={{ animation: "celebration-pop 0.35s ease-out" }}
        onClick={(e) => e.stopPropagation()}
      >
        <p className="text-5xl" aria-hidden>
          🎉
        </p>
        <h2 className="mt-2 font-heading text-xl">{title}</h2>
        <p className="mt-1 text-sm text-text-muted">{message}</p>
        <button
          type="button"
          onClick={onDismiss}
          className="gradient-primary mt-5 h-12 w-full rounded-2xl text-[15px] font-semibold text-accent-foreground shadow-md shadow-accent/25"
        >
          יאללה, קדימה! 💪
        </button>
      </div>
    </div>
  );
}
