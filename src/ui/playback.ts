import type { Card, PlayedCard, Seat } from '../game/engine';

export type GameSpeed = 'natural' | 'fast' | 'veryFast';
export type PlaybackStage = 'revealing' | 'collecting';
export type TrickPresentation = {
  cards: PlayedCard[];
  winner: Seat;
  stage: PlaybackStage;
};

export const CARD_WIDTH = 72;
export const CARD_HEIGHT = 112;

/** İki satırla her kartın görünen ve dokunulabilen alanını genişletir. */
export function handRows(cards: Card[], screenWidth: number): Card[][] {
  if (cards.length <= 1) return cards.length ? [[...cards]] : [];
  const shouldSplit = cards.length >= 8 || (screenWidth < 370 && cards.length >= 6);
  if (!shouldSplit) return [[...cards]];
  const firstCount = Math.ceil(cards.length / 2);
  return [cards.slice(0, firstCount), cards.slice(firstCount)];
}
export function cardOverlap(count: number, screenWidth: number): number {
  if (count < 2) return 0;
  const usable = Math.max(220, screenWidth - 28);
  return Math.max(0, Math.min(CARD_WIDTH - 30,
    Math.ceil((count * CARD_WIDTH - usable) / (count - 1))));
}

/** Bütün süreler ms. Oyun mantığının değil, yalnızca sunumun hızını etkiler. */
export const PLAYBACK = {
  natural: { botThink: 580, flight: 310, reveal: 1300, collect: 380 },
  fast: { botThink: 260, flight: 210, reveal: 720, collect: 260 },
  veryFast: { botThink: 80, flight: 130, reveal: 300, collect: 160 },
} as const;

export function trickDelay(speed: GameSpeed, stage: PlaybackStage): number {
  return stage === 'revealing' ? PLAYBACK[speed].reveal : PLAYBACK[speed].collect;
}
