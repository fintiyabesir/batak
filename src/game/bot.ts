import {
  SUITS, winningPlay,
  type BotObservation, type Card, type Suit,
} from './engine.ts';

/**
 * V1 rakip: yalnızca sansürlenmiş BotObservation kullanır.
 * Bilinmeyen ellerden, oyun çekirdeğinden veya kullanıcı kartlarından bilgi ALMAZ.
 * V2: kısıt tabanlı kart örneklemesi + ISMCTS ile değiştirilecek.
 */
function strength(cards: Card[], trump: Suit): number {
  let total = 0;
  for (const suit of SUITS) {
    const suitCards = cards.filter(c => c.suit === suit);
    const count = suitCards.length;
    const ace = suitCards.some(c => c.rank === 14);
    const king = suitCards.some(c => c.rank === 13);
    const queen = suitCards.some(c => c.rank === 12);
    total += suitCards.reduce((points, card) => {
      if (card.rank === 14) return points + 0.92;
      if (card.rank === 13) return points + (ace ? 0.78 : 0.43);
      if (card.rank === 12) return points + (ace || king ? 0.46 : 0.18);
      if (card.rank === 11) return points + (ace && king ? 0.30 : 0.09);
      return points + 0.014;
    }, 0);
    if (suit === trump) {
      total += Math.max(0, count - 3) * 0.51;
      total += (ace ? 0.30 : 0) + (king ? 0.19 : 0) + (queen ? 0.10 : 0);
      if (count <= 1) total -= 0.4;
    } else {
      total += count === 0 ? 0.24 : count === 1 ? 0.11 : 0;
    }
  }
  return total;
}
export function chooseTrump(observation: BotObservation): Suit {
  return [...SUITS].sort((a, b) => {
    const score = strength(observation.hand, b) - strength(observation.hand, a);
    return score || SUITS.indexOf(a) - SUITS.indexOf(b);
  })[0];
}
export function chooseBid(observation: BotObservation, difficulty: 'easy' | 'normal' | 'hard' = 'normal'): number | null {
  const trump = chooseTrump(observation);
  // Deste kontrolü / açılış temposunun getirdiği yaklaşık ek löveler.
  // Eşikler ileride eşlenik dağıtımlarla kalibre edilecek.
  const expected = strength(observation.hand, trump) + 1.35;
  const safety = difficulty === 'hard' ? 0.50 : difficulty === 'normal' ? 0.75 : 1.05;
  const highestSafe = Math.min(13, Math.floor(expected - safety));
  const minimum = Math.max(observation.rules.minBid, observation.highestBid + 1);
  return highestSafe >= minimum ? minimum : null;
}
function rankPower(card: Card): number {
  return card.rank - 2;
}
function unseenHigher(observation: BotObservation, card: Card): number {
  const known = new Set([...observation.hand, ...observation.visibleCards].map(c => c.id));
  let higher = 0;
  for (let rank = card.rank + 1; rank <= 14; rank++) {
    if (!known.has(card.suit.charAt(0) + rank)) higher++;
  }
  return higher;
}
function knownVoidOpponents(observation: BotObservation, suit: Suit): number {
  const voidSeats = new Set<number>();
  for (const trick of observation.completedTricks) {
    if (!trick.length || trick[0].card.suit !== suit) continue;
    for (const played of trick.slice(1)) {
      if (played.seat !== observation.seat && played.card.suit !== suit) voidSeats.add(played.seat);
    }
  }
  return voidSeats.size;
}
function evaluatePlay(observation: BotObservation, card: Card, difficulty: 'easy' | 'normal' | 'hard'): number {
  const trick = observation.currentTrick;
  const trump = observation.trump!;
  const isBidder = observation.seat === observation.bidder;
  const won = observation.tricksWon[observation.seat];
  const tricksLeft = 13 - observation.completedTricks.length;
  const mustWin = isBidder
    ? won < observation.highestBid && tricksLeft <= observation.highestBid - won + 3
    : won === 0 && tricksLeft <= 6;
  const wantsWin = mustWin || (isBidder && won < observation.highestBid);
  const higher = unseenHigher(observation, card);
  const suitCount = observation.hand.filter(c => c.suit === card.suit).length;
  const isTrump = card.suit === trump;
  const power = rankPower(card);
  const futureValue = (higher === 0 ? 4.7 : higher === 1 ? 2.8 : higher === 2 ? 1.0 : 0) + (isTrump ? 1.8 : 0);
  if (!trick.length) {
    // Zor bot herkesçe görülen geçmişten kesin renk boşluklarını çıkarır.
    const ruffRisk = difficulty === 'hard' && !isTrump
      ? knownVoidOpponents(observation, card.suit) * 3.2 : 0;
    // Gerçek hayatta olduğu gibi, elde kalan tepe kartlar ve renk uzunluğu önemlidir.
    const bidBonus = wantsWin ? 2.0 : 0;
    if (higher === 0 && power >= 9) return 12 + bidBonus + suitCount * 0.08 + (isTrump ? 0.3 : 0) - ruffRisk;
    if (wantsWin) return 1.5 + power * 0.35 - higher * 0.9 + (isTrump ? 0.75 : 0) - ruffRisk;
    return 5.8 - power * 0.34 - futureValue * 0.30 + suitCount * 0.04 - ruffRisk * 0.3;
  }
  const test = [...trick, { seat: observation.seat, card }];
  const winningNow = winningPlay(test, trump).seat === observation.seat;
  const position = trick.length;
  if (winningNow) {
    const urgency = wantsWin ? 16 : won === 0 ? 7 : 4.2;
    // Önce düşükten kazanan kart; son oyuncu olduğumuzda kesinliği artır.
    return urgency + (position === 3 ? 2.0 : 0) - power * 0.17 - higher * 0.52 - (isTrump ? 0.5 : 0);
  }
  // Kazanamayacağımız lövede gelecek için güçlü kartları sakla.
  return 8 - futureValue * 1.55 - power * 0.20 - (isTrump ? 3 : 0);
}
export function chooseCard(observation: BotObservation, difficulty: 'easy' | 'normal' | 'hard' = 'normal'): string {
  if (!observation.legalCards.length) throw Error('Botun oynayacağı yasal kart yok');
  if (observation.legalCards.length === 1) return observation.legalCards[0].id;
  const scored = observation.legalCards.map(card => ({ card, score: evaluatePlay(observation, card, difficulty) }))
    .sort((a, b) => b.score - a.score || a.card.id.localeCompare(b.card.id));
  if (difficulty === 'easy' && scored.length > 2) {
    // Kolay rakip rastgele yasadışı hamle yapmaz; sadece daha zayıf yasal alternatif seçer.
    return scored[Math.random() < 0.33 ? 1 : 0].card.id;
  }
  return scored[0].card.id;
}
