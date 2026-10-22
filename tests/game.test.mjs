import test from 'node:test';
import assert from 'node:assert/strict';
import {
  DEFAULT_RULES, SUITS, botObservation, dealCards, isValidSavedGame,
  legalCards, makeDeck, newGame, nextRound, placeBid, playCard,
  scoreRound, selectTrump, winningPlay,
} from '../src/game/engine.ts';
import { chooseBid, chooseCard, chooseTrump } from '../src/game/bot.ts';
import { PLAYBACK, CARD_WIDTH, cardOverlap, handRows, trickDelay } from '../src/ui/playback.ts';

function seeded(seed = 12345) {
  let state = seed >>> 0;
  return (max) => {
    state = (Math.imul(1664525, state) + 1013904223) >>> 0;
    return state % max;
  };
}
function card(suit, rank) { return { suit, rank, id: suit[0] + rank }; }
function forceBid(game) {
  let current = game;
  while (current.phase === 'bidding') current = placeBid(current, current.turn, null);
  assert.equal(current.phase, 'trump');
  return current;
}
function playFullRound(game) {
  let current = game;
  for (let step = 0; step < 52; step++) {
    assert.equal(current.phase, 'playing');
    const view = botObservation(current, current.turn);
    const picked = chooseCard(view, 'hard');
    assert.ok(view.legalCards.some(c => c.id === picked), 'Bot yasa dışı kart seçti');
    current = playCard(current, current.turn, picked);
  }
  return current;
}

test('52 benzersiz kart ve dörder adet 13 kart dağıtılır', () => {
  const hands = dealCards(seeded(88));
  assert.deepEqual(hands.map(hand => hand.length), [13, 13, 13, 13]);
  assert.equal(new Set(hands.flat().map(c => c.id)).size, 52);
  assert.equal(makeDeck().length, 52);
});
test('dağıtım aynı tohumla aynı olur', () => {
  assert.deepEqual(dealCards(seeded(30)), dealCards(seeded(30)));
});
test('herkes pas: ilk konuşan mecburi 4 alır', () => {
  const game = forceBid(newGame(seeded()));
  assert.equal(game.highestBid, 4);
  assert.equal(game.bidder, game.firstBidder);
  assert.equal(game.turn, game.firstBidder);
  assert.equal(game.bids.filter(b => b.forced).length, 1);
});
test('ihalede yükseltme şartı ve 13 ile ihale kapanışı', () => {
  let game = newGame(seeded());
  const bidder = game.turn;
  game = placeBid(game, bidder, 7);
  assert.throws(() => placeBid(game, game.turn, 7), /Geçersiz ihale/);
  assert.throws(() => placeBid(game, game.turn, 5), /Geçersiz ihale/);
  game = placeBid(game, game.turn, 13);
  assert.equal(game.phase, 'trump');
  assert.equal(game.highestBid, 13);
});
test('renge uyma ve zorunlu yükseltme yasal kümeyi kısıtlar', () => {
  const game = newGame(seeded());
  const scenario = {
    ...game, phase: 'playing', trump: 'spades', turn: 0,
    hands: [[card('hearts', 9), card('hearts', 6), card('spades', 14), card('diamonds', 2)], ...game.hands.slice(1)],
    currentTrick: [{ seat: 1, card: card('hearts', 8) }],
  };
  assert.deepEqual(legalCards(scenario, 0).map(c => c.id), ['h9']);
  assert.throws(() => playCard(scenario, 0, 's14'), /Kurallara aykırı kart/);
  const interrupted = { ...scenario, currentTrick: [
    { seat: 1, card: card('hearts', 8) },
    { seat: 2, card: card('spades', 2) },
  ] };
  assert.deepEqual(legalCards(interrupted, 0).map(c => c.id).sort(), ['h6', 'h9']);
});
test('renk yoksa koz mecburi, kozu yükseltebiliyorsa yükseltilir', () => {
  const game = newGame(seeded());
  const scenario = {
    ...game, phase: 'playing', trump: 'spades', turn: 0,
    hands: [[card('spades', 9), card('spades', 4), card('diamonds', 14)], ...game.hands.slice(1)],
    currentTrick: [
      { seat: 1, card: card('hearts', 8) },
      { seat: 2, card: card('spades', 7) },
    ],
  };
  assert.deepEqual(legalCards(scenario, 0).map(c => c.id), ['s9']);
});
test('koz kırılmadan koz açılamaz; yalnız koz varsa açılır', () => {
  const game = newGame(seeded());
  const scenario = {
    ...game, phase: 'playing', trump: 'spades', turn: 0, currentTrick: [],
    hands: [[card('spades', 14), card('hearts', 2)], ...game.hands.slice(1)],
  };
  assert.deepEqual(legalCards(scenario, 0).map(c => c.id), ['h2']);
  scenario.hands[0] = [card('spades', 14), card('spades', 2)];
  assert.equal(legalCards(scenario, 0).length, 2);
});
test('koz en yüksek açılan rengi keser', () => {
  const winner = winningPlay([
    { seat: 1, card: card('hearts', 14) },
    { seat: 0, card: card('spades', 2) },
    { seat: 3, card: card('hearts', 13) },
    { seat: 2, card: card('diamonds', 14) },
  ], 'spades');
  assert.equal(winner.seat, 0);
});
test('kazanılan/batılan ihale ve savunmacı sıfır skoru', () => {
  const game = forceBid(newGame(seeded()));
  const scenario = {
    ...game, trump: 'spades', completedTricks: Array.from({ length: 13 }, () => []),
    bidder: 0, highestBid: 7, tricksWon: [6, 0, 3, 4], scores: [20, 10, 0, 0],
  };
  const result = scoreRound(scenario);
  assert.deepEqual(result.delta, [-70, -70, 30, 40]);
  scenario.tricksWon = [7, 0, 3, 3];
  assert.deepEqual(scoreRound(scenario).delta, [70, -70, 30, 30]);
});
test('bot gözleminde rakiplerin kapalı elleri yok', () => {
  const game = newGame(seeded());
  const seat = game.turn;
  const view = botObservation(game, seat);
  assert.ok(!('hands' in view));
  assert.deepEqual(view.hand, game.hands[seat]);
  assert.equal(view.handSizes.length, 4);
  assert.equal(view.visibleCards.length, 0);
  assert.equal(chooseTrump(view) in Object.fromEntries(SUITS.map(s => [s, true])), true);
  assert.ok(chooseBid(view, 'normal') === null || chooseBid(view, 'normal') >= game.rules.minBid);
});
test('200 gerçek 13-lövelik otomatik dağıtım hatasız biter', () => {
  const random = seeded(20261022);
  let current = newGame(random, 200);
  for (let round = 0; round < 200; round++) {
    current = forceBid(current);
    current = selectTrump(current, current.turn, chooseTrump(botObservation(current, current.turn)));
    current = playFullRound(current);
    assert.equal(current.completedTricks.length, 13);
    assert.equal(current.tricksWon.reduce((a, b) => a + b), 13);
    assert.equal(current.hands.flat().length, 0);
    assert.ok(isValidSavedGame(current));
    const restored = JSON.parse(JSON.stringify(current));
    assert.ok(isValidSavedGame(restored));
    assert.deepEqual(restored.scores, current.scores);
    if (round < 199) current = nextRound(current, random);
  }
  assert.equal(current.phase, 'matchEnd');
  assert.equal(current.results.length, 200);
});

test('el görünümü: büyük eller tam olarak iki satıra bölünür', () => {
  const deck = makeDeck();
  for (let count = 0; count <= 13; count++) {
    const rows = handRows(deck.slice(0, count), 390);
    assert.deepEqual(rows.flat().map(c => c.id), deck.slice(0, count).map(c => c.id));
    if (count >= 8) {
      assert.equal(rows.length, 2);
      assert.ok(rows[0].length - rows[1].length <= 1);
    }
    if (count <= 7 && count > 0) assert.equal(rows.length, 1);
  }
  assert.equal(handRows(deck.slice(0, 7), 330).length, 2);
});
test('kart aralıkları farklı ekran genişliklerinde okunabilir kalır', () => {
  for (const width of [320, 350, 375, 390, 430]) {
    const rows = handRows(makeDeck().slice(0, 13), width);
    for (const row of rows) {
      const overlap = cardOverlap(row.length, width);
      assert.ok(overlap >= 0 && overlap <= CARD_WIDTH - 30);
      assert.ok(row.length * CARD_WIDTH - (row.length - 1) * overlap <= Math.max(220, width - 28) + 1);
    }
  }
});
test('doğal hız: kart gelişi, gösterim, toplama ayrı aşamalardır', () => {
  assert.ok(PLAYBACK.natural.flight < PLAYBACK.natural.botThink);
  assert.ok(trickDelay('natural', 'revealing') > PLAYBACK.natural.flight);
  assert.ok(trickDelay('natural', 'collecting') >= 250);
  assert.ok(trickDelay('natural', 'revealing') > trickDelay('fast', 'revealing'));
  assert.ok(trickDelay('fast', 'revealing') > trickDelay('veryFast', 'revealing'));
});
