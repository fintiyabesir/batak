/**
 * Batak: saf, deterministik oyun çekirdeği.
 * Ağ / React / depolama bağımlılığı yoktur.
 * Koltuklar: 0 Güney (insan), 1 Batı, 2 Kuzey, 3 Doğu.
 * Oyun yönü: Güney → Doğu → Kuzey → Batı.
 */
export const SUITS = ['spades', 'hearts', 'diamonds', 'clubs'] as const;
export type Suit = (typeof SUITS)[number];
export type Seat = 0 | 1 | 2 | 3;
export type Phase = 'bidding' | 'trump' | 'playing' | 'roundEnd' | 'matchEnd';
export type Card = { id: string; suit: Suit; rank: number };
export type PlayedCard = { seat: Seat; card: Card };
export type Bid = { seat: Seat; value: number | null; forced?: boolean };
export type Rules = {
  minBid: number;
  forceBid: number;
  mustOvertake: boolean;
  trumpMustBeBroken: boolean;
  scoreMultiplier: number;
};
export type RoundResult = {
  round: number;
  bid: number;
  bidder: Seat;
  trump: Suit;
  tricks: number[];
  delta: number[];
  total: number[];
};
export type Game = {
  schema: 1;
  phase: Phase;
  round: number;
  totalRounds: number;
  dealer: Seat;
  turn: Seat;
  firstBidder: Seat;
  rules: Rules;
  hands: Card[][];
  bids: Bid[];
  passed: boolean[];
  highestBid: number;
  bidder: Seat | null;
  trump: Suit | null;
  trumpBroken: boolean;
  currentTrick: PlayedCard[];
  completedTricks: PlayedCard[][];
  tricksWon: number[];
  scores: number[];
  results: RoundResult[];
};
export type BotObservation = Omit<Game, 'hands'> & {
  seat: Seat;
  hand: Card[];
  legalCards: Card[];
  visibleCards: Card[];
  handSizes: number[];
};
export type RandomIndex = (exclusiveMax: number) => number;

export const DEFAULT_RULES: Rules = {
  minBid: 5,
  forceBid: 4,
  mustOvertake: true,
  trumpMustBeBroken: true,
  scoreMultiplier: 10,
};

export function nextSeat(seat: number): Seat {
  return ((seat + 3) % 4) as Seat;
}
export function makeDeck(): Card[] {
  return SUITS.flatMap(suit =>
    Array.from({ length: 13 }, (_, index) => {
      const rank = index + 2;
      return { id: suit.charAt(0) + rank, suit, rank };
    }),
  );
}
export function dealCards(randomIndex: RandomIndex): Card[][] {
  const deck = makeDeck();
  for (let i = deck.length - 1; i > 0; i--) {
    const j = randomIndex(i + 1);
    if (!Number.isInteger(j) || j < 0 || j > i) throw Error('Geçersiz rastgele indis');
    [deck[i], deck[j]] = [deck[j], deck[i]];
  }
  return [deck.slice(0, 13), deck.slice(13, 26), deck.slice(26, 39), deck.slice(39, 52)];
}
export function sortCards(cards: Card[]): Card[] {
  return [...cards].sort((a, b) => SUITS.indexOf(a.suit) - SUITS.indexOf(b.suit) || b.rank - a.rank);
}
function requireTurn(game: Game, phase: Phase, seat: Seat): void {
  if (game.phase !== phase || game.turn !== seat) throw Error('Bu işlem için oyuncu sırası değil');
}
function freshRound(
  dealer: Seat,
  scores: number[],
  round: number,
  totalRounds: number,
  rules: Rules,
  results: RoundResult[],
  randomIndex: RandomIndex,
): Game {
  const firstBidder = nextSeat(dealer);
  return {
    schema: 1, phase: 'bidding', round, totalRounds, dealer, firstBidder,
    turn: firstBidder, rules: { ...rules }, hands: dealCards(randomIndex),
    bids: [], passed: [false, false, false, false], highestBid: 0,
    bidder: null, trump: null, trumpBroken: false, currentTrick: [],
    completedTricks: [], tricksWon: [0, 0, 0, 0], scores: [...scores],
    results: [...results],
  };
}
export function newGame(randomIndex: RandomIndex, totalRounds = 5, rules = DEFAULT_RULES): Game {
  if (!Number.isInteger(totalRounds) || totalRounds < 1 || totalRounds > 99) throw Error('Geçersiz maç uzunluğu');
  if (rules.minBid < 1 || rules.minBid > 13 || rules.forceBid < 1 || rules.forceBid > 13)
    throw Error('Geçersiz masa kuralları');
  return freshRound(3, [0, 0, 0, 0], 1, totalRounds, rules, [], randomIndex);
}
export function placeBid(game: Game, seat: Seat, amount: number | null): Game {
  requireTurn(game, 'bidding', seat);
  if (game.passed[seat]) throw Error('Pas geçen oyuncu yeniden teklif veremez');
  if (amount !== null &&
    (!Number.isInteger(amount) || amount < game.rules.minBid ||
      amount <= game.highestBid || amount > 13)) throw Error('Geçersiz ihale');
  const passed = [...game.passed];
  if (amount === null) passed[seat] = true;
  const highestBid = amount === null ? game.highestBid : amount;
  const bidder = amount === null ? game.bidder : seat;
  const bids = [...game.bids, { seat, value: amount }];
  const next: Game = { ...game, passed, bids, highestBid, bidder };
  if (highestBid === 0 && passed.every(Boolean)) {
    const forced = game.firstBidder;
    return {
      ...next, phase: 'trump', turn: forced, bidder: forced, highestBid: game.rules.forceBid,
      bids: [...bids, { seat: forced, value: game.rules.forceBid, forced: true }],
    };
  }
  if (amount === 13 || (highestBid > 0 && passed.filter(Boolean).length === 3)) {
    return { ...next, phase: 'trump', turn: bidder! };
  }
  let turn = nextSeat(seat);
  for (let tries = 0; tries < 4 && passed[turn]; tries++) turn = nextSeat(turn);
  return { ...next, turn };
}
export function selectTrump(game: Game, seat: Seat, suit: Suit): Game {
  requireTurn(game, 'trump', seat);
  if (seat !== game.bidder || !SUITS.includes(suit)) throw Error('Koz seçimi geçersiz');
  return { ...game, phase: 'playing', turn: seat, trump: suit };
}
export function legalCards(game: Game, seat: Seat): Card[] {
  if (game.phase !== 'playing' || game.turn !== seat || !game.trump) return [];
  const hand = game.hands[seat];
  const lead = game.currentTrick[0]?.card.suit;
  const trump = game.trump;
  if (!lead) {
    if (!game.rules.trumpMustBeBroken || game.trumpBroken || hand.every(c => c.suit === trump))
      return hand;
    return hand.filter(c => c.suit !== trump);
  }
  const follow = hand.filter(c => c.suit === lead);
  const overtake = (candidates: Card[], winnerRank: number) => {
    if (!game.rules.mustOvertake) return candidates;
    const higher = candidates.filter(c => c.rank > winnerRank);
    return higher.length ? higher : candidates;
  };
  if (follow.length) {
    const trumpOnTable = game.currentTrick.some(p => p.card.suit === trump);
    // Kesilen farklı renkte açılışta renge uyulur; yükselme aranmaz.
    if (trumpOnTable && lead !== trump) return follow;
    const highestLead = Math.max(...game.currentTrick.filter(p => p.card.suit === lead).map(p => p.card.rank));
    return overtake(follow, highestLead);
  }
  const trumps = hand.filter(c => c.suit === trump);
  if (!trumps.length) return hand;
  const tableTrumps = game.currentTrick.filter(p => p.card.suit === trump);
  return tableTrumps.length
    ? overtake(trumps, Math.max(...tableTrumps.map(p => p.card.rank)))
    : trumps;
}
export function winningPlay(trick: PlayedCard[], trump: Suit): PlayedCard {
  if (!trick.length) throw Error('Boş löve');
  const lead = trick[0].card.suit;
  return trick.reduce((winner, current) => {
    const a = winner.card;
    const b = current.card;
    if (b.suit === trump && a.suit !== trump) return current;
    if (b.suit === a.suit && b.rank > a.rank) return current;
    if (a.suit !== trump && b.suit === lead && a.suit !== lead) return current;
    return winner;
  });
}
export function scoreRound(game: Game): RoundResult {
  if (!game.trump || game.bidder === null || game.completedTricks.length !== 13)
    throw Error('Dağıtım tamamlanmadı');
  const bidder = game.bidder;
  const bid = game.highestBid;
  const delta = game.tricksWon.map((won, seat) =>
    (seat === bidder && won < bid) || (seat !== bidder && won === 0)
      ? -bid * game.rules.scoreMultiplier
      : won * game.rules.scoreMultiplier,
  );
  return {
    round: game.round, bid, bidder, trump: game.trump,
    tricks: [...game.tricksWon], delta,
    total: delta.map((points, seat) => points + game.scores[seat]),
  };
}
export function playCard(game: Game, seat: Seat, cardId: string): Game {
  requireTurn(game, 'playing', seat);
  const card = legalCards(game, seat).find(c => c.id === cardId);
  if (!card) throw Error('Kurallara aykırı kart');
  const hands = game.hands.map((hand, player) =>
    player === seat ? hand.filter(c => c.id !== cardId) : [...hand],
  );
  const currentTrick = [...game.currentTrick, { seat, card }];
  const trumpBroken = game.trumpBroken || card.suit === game.trump;
  if (currentTrick.length < 4) {
    return { ...game, hands, currentTrick, trumpBroken, turn: nextSeat(seat) };
  }
  const winner = winningPlay(currentTrick, game.trump!).seat;
  const tricksWon = [...game.tricksWon];
  tricksWon[winner]++;
  const completedTricks = [...game.completedTricks, currentTrick];
  const next: Game = {
    ...game, hands, currentTrick: [], completedTricks, tricksWon, trumpBroken,
    turn: winner,
  };
  if (completedTricks.length < 13) return next;
  const result = scoreRound(next);
  const results = [...game.results, result];
  return {
    ...next, phase: game.round === game.totalRounds ? 'matchEnd' : 'roundEnd',
    scores: result.total, results,
  };
}
export function nextRound(game: Game, randomIndex: RandomIndex): Game {
  if (game.phase !== 'roundEnd') throw Error('Dağıtım halen oynanıyor');
  return freshRound(nextSeat(game.dealer), game.scores, game.round + 1,
    game.totalRounds, game.rules, game.results, randomIndex);
}
/** Rakibin görebildiği bilgi: diğer oyuncuların kartları ASLA dahil edilmez. */
export function botObservation(game: Game, seat: Seat): BotObservation {
  const { hands, ...publicState } = game;
  return {
    ...publicState, seat, hand: [...hands[seat]],
    handSizes: hands.map(hand => hand.length),
    legalCards: game.turn === seat ? legalCards(game, seat) : [],
    visibleCards: [...game.completedTricks.flat(), ...game.currentTrick].map(p => p.card),
    // Açık olay geçmişini kopyalıyoruz; içerden saklı referans geçirilmez.
    bids: [...game.bids], completedTricks: game.completedTricks.map(t => [...t]),
    currentTrick: [...game.currentTrick],
  };
}
export function isValidSavedGame(value: unknown): value is Game {
  if (!value || typeof value !== 'object') return false;
  const g = value as Partial<Game>;
  if (g.schema !== 1 || !['bidding', 'trump', 'playing', 'roundEnd', 'matchEnd'].includes(String(g.phase)))
    return false;
  if (!Array.isArray(g.hands) || g.hands.length !== 4 ||
      !g.hands.every(h => Array.isArray(h)) || !Array.isArray(g.scores) || g.scores.length !== 4)
    return false;
  if (!Array.isArray(g.completedTricks) || !Array.isArray(g.currentTrick) ||
      !Array.isArray(g.tricksWon) || !Array.isArray(g.bids) || !g.rules) return false;
  const remaining = g.hands.flat().map(c => c.id);
  const played = [...g.completedTricks.flat(), ...g.currentTrick].map(p => p.card.id);
  if (remaining.length + played.length !== 52 || new Set([...remaining, ...played]).size !== 52)
    return false;
  return true;
}
