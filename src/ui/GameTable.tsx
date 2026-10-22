import React from 'react';
import { Pressable, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import {
  legalCards, sortCards, type Game, type Seat,
} from '../game/engine';
import { palette, PLAYER_NAMES, SUIT_MARK, SUIT_TR } from './theme';
import CardView from './CardView';

type Props = { game: Game; onCard: (cardId: string) => void; onHome: () => void; onLastTrick: () => void };
function SeatMarker({ game, seat, vertical = false }: { game: Game; seat: Seat; vertical?: boolean }) {
  const active = game.turn === seat && ['playing', 'bidding', 'trump'].includes(game.phase);
  return (
    <View style={[styles.seat, vertical && styles.seatVertical, active && styles.activeSeat]}>
      <View style={[styles.avatar, active && styles.activeAvatar]}>
        <Text style={[styles.avatarLetter, active && { color: palette.night }]}>{PLAYER_NAMES[seat].charAt(0)}</Text>
      </View>
      <View style={{ alignItems: vertical ? 'center' : 'flex-start' }}>
        <Text style={styles.seatName}>{PLAYER_NAMES[seat].toLocaleUpperCase('tr-TR')}</Text>
        <Text style={styles.seatDetail}>{game.tricksWon[seat]} löve  ·  {game.scores[seat]} p</Text>
      </View>
    </View>
  );
}
function BackFan({ count }: { count: number }) {
  return (
    <View style={styles.backFan}>
      {count > 0 && [0, 1, 2].slice(0, Math.min(3, count)).map((index) => (
        <CardView key={index} hidden size="small" style={{ marginLeft: index ? -19 : 0, transform: [{ rotate: ((index - 1) * 10) + 'deg' }] }} />
      ))}
      <View style={styles.cardCount}><Text style={styles.cardCountText}>{count}</Text></View>
    </View>
  );
}
function TrickCard({ game, seat }: { game: Game; seat: Seat }) {
  const played = game.currentTrick.find(p => p.seat === seat);
  return played ? <CardView card={played.card} size="played" /> : (
    <View style={styles.emptyCard}><View style={styles.emptyCardDot} /></View>
  );
}
export default function GameTable({ game, onCard, onHome, onLastTrick }: Props) {
  const { width } = useWindowDimensions();
  const legal = new Set(game.turn === 0 && game.phase === 'playing'
    ? legalCards(game, 0).map(c => c.id) : []);
  const cards = sortCards(game.hands[0]);
  const overlap = Math.max(12, 56 - (width - 25 - 56) / Math.max(1, cards.length - 1));
  const isHuman = game.turn === 0 && ['bidding', 'trump', 'playing'].includes(game.phase);
  return (
    <View style={styles.frame}>
      <View style={styles.topRow}>
        <Pressable style={styles.roundIcon} onPress={onHome} accessibilityRole="button" accessibilityLabel="Ana menüye dön">
          <Text style={styles.roundIconText}>‹</Text>
        </Pressable>
        <View style={styles.titleGroup}>
          <Text style={styles.overline}>BATÂK  /  GECE MASASI</Text>
          <Text style={styles.roundTitle}>{game.round}. DAĞITIM <Text style={styles.muted}>/ {game.totalRounds}</Text></Text>
        </View>
        <View style={styles.scorePill}><Text style={styles.scorePillCaption}>SENİN PUANIN</Text><Text style={styles.scorePillValue}>{game.scores[0]}</Text></View>
      </View>
      <View style={styles.north}>
        <SeatMarker game={game} seat={2} vertical />
        <BackFan count={game.hands[2].length} />
      </View>
      <View style={styles.gameBody}>
        <View style={styles.side}>
          <SeatMarker game={game} seat={1} vertical />
          <BackFan count={game.hands[1].length} />
        </View>
        <View style={styles.center}>
          <View style={styles.ringLarge} />
          <View style={styles.ringSmall} />
          <View style={styles.tableTopLabel}><Text style={styles.tableTopLabelText}>♠   ♥   ♦   ♣</Text></View>
          <View style={styles.cardNorth}><TrickCard game={game} seat={2} /></View>
          <View style={styles.cardWest}><TrickCard game={game} seat={1} /></View>
          <View style={styles.cardEast}><TrickCard game={game} seat={3} /></View>
          <View style={styles.cardSouth}><TrickCard game={game} seat={0} /></View>
          {game.currentTrick.length === 0 && (
            <Text style={styles.centerHint}>{game.phase === 'bidding' ? 'İHALE' : game.phase === 'trump' ? 'KOZ SEÇİMİ' : 'YENİ LÖVE'}</Text>
          )}
        </View>
        <View style={styles.side}>
          <SeatMarker game={game} seat={3} vertical />
          <BackFan count={game.hands[3].length} />
        </View>
      </View>
      <View style={styles.detailRow}>
        <View style={styles.detailPill}>
          <Text style={styles.detailCaption}>İHALE</Text>
          <Text style={styles.detailValue}>{game.highestBid || '—'} <Text style={styles.detailSmall}>{game.bidder !== null ? ' / ' + PLAYER_NAMES[game.bidder] : ''}</Text></Text>
        </View>
        <View style={styles.detailPill}>
          <Text style={styles.detailCaption}>KOZ</Text>
          <Text style={styles.detailValue}>{game.trump ? SUIT_MARK[game.trump] + ' ' + SUIT_TR[game.trump] : 'Belirlenmedi'}</Text>
        </View>
        <Pressable style={styles.lastButton} onPress={onLastTrick} disabled={!game.completedTricks.length}>
          <Text style={[styles.lastText, !game.completedTricks.length && { opacity: .4 }]}>SON EL ↗</Text>
        </Pressable>
      </View>
      <View style={styles.handTop}>
        <View>
          <Text style={styles.handLabel}>SENİN KARTLARIN <Text style={styles.handNumber}>· {cards.length}</Text></Text>
          <Text style={styles.handHint}>{isHuman ? (game.phase === 'playing' ? 'Oynamak için karta dokun' : 'Seçimini yap') : PLAYER_NAMES[game.turn] + ' düşünüyor...'}</Text>
        </View>
        <View style={[styles.turnBadge, isHuman && styles.turnBadgeActive]}>
          <View style={[styles.turnDot, isHuman && styles.turnDotActive]} />
          <Text style={[styles.turnText, isHuman && { color: palette.gold }]}>{isHuman ? 'SIRA SENDE' : 'RAKİPTE'}</Text>
        </View>
      </View>
      <View style={[styles.hand, { minHeight: 110 }]}>
        {cards.map((card, index) => (
          <CardView
            key={card.id} card={card}
            disabled={!legal.has(card.id)}
            onPress={() => onCard(card.id)}
            style={{ marginLeft: index === 0 ? 0 : -overlap, zIndex: index + 1 }}
          />
        ))}
      </View>
      <Text style={styles.foot}>ÇEVRİMDIŞI  ·  REKLAMSIZ  ·  SADECE SEN VE MASA</Text>
    </View>
  );
}
const styles = StyleSheet.create({
  frame: { flex: 1, paddingHorizontal: 11, paddingTop: 3, justifyContent: 'space-between' },
  topRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', minHeight: 60 },
  roundIcon: { width: 43, height: 43, borderRadius: 18, backgroundColor: palette.deep, borderColor: palette.border, borderWidth: 1, justifyContent: 'center', alignItems: 'center' },
  roundIconText: { color: palette.ivory, fontSize: 29, marginTop: -4 },
  titleGroup: { paddingHorizontal: 5 },
  overline: { color: palette.goldDim, letterSpacing: 2.4, fontSize: 8, fontWeight: '800' },
  roundTitle: { color: palette.ivory, letterSpacing: 1, fontSize: 16, fontWeight: '900', marginTop: 4 },
  muted: { color: palette.muted, fontWeight: '500' },
  scorePill: { alignItems: 'center', minWidth: 72, backgroundColor: '#17443D', paddingHorizontal: 10, paddingVertical: 8, borderRadius: 13, borderColor: '#38665B', borderWidth: 1 },
  scorePillCaption: { color: palette.mist, fontSize: 7, letterSpacing: .9, fontWeight: '800' },
  scorePillValue: { color: palette.gold, fontSize: 20, fontWeight: '900', marginTop: 1 },
  north: { justifyContent: 'center', alignItems: 'center', gap: 4, minHeight: 112 },
  seat: { flexDirection: 'row', alignItems: 'center', gap: 7, borderWidth: 1, borderColor: 'transparent', borderRadius: 13, padding: 4 },
  seatVertical: { flexDirection: 'column', gap: 2, padding: 4 },
  activeSeat: { backgroundColor: '#28594B', borderColor: palette.goldDim },
  avatar: { height: 28, width: 28, backgroundColor: '#315A50', borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  activeAvatar: { backgroundColor: palette.gold },
  avatarLetter: { color: palette.ivory, fontSize: 12, fontWeight: '900' },
  seatName: { color: palette.ivory, fontSize: 9, fontWeight: '900', letterSpacing: .5 },
  seatDetail: { color: palette.mist, fontSize: 9 },
  backFan: { alignItems: 'center', justifyContent: 'center', minHeight: 53, flexDirection: 'row' },
  cardCount: { backgroundColor: palette.deep, borderColor: palette.goldDim, borderWidth: 1, borderRadius: 9, paddingHorizontal: 5, paddingVertical: 2, marginLeft: -8, marginTop: 30, zIndex: 4 },
  cardCountText: { color: palette.gold, fontSize: 10, fontWeight: '800' },
  gameBody: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', flex: 1, maxHeight: 270, minHeight: 200 },
  side: { width: '21%', alignItems: 'center', justifyContent: 'center', gap: 5 },
  center: { width: '58%', minHeight: 210, height: '100%', alignItems: 'center', justifyContent: 'center' },
  ringLarge: { position: 'absolute', width: '100%', aspectRatio: 1, borderRadius: 190, borderColor: '#37675B', borderWidth: 1.5, opacity: .55 },
  ringSmall: { position: 'absolute', width: '78%', aspectRatio: 1, borderRadius: 190, borderColor: '#37675B', borderWidth: 1, opacity: .5 },
  tableTopLabel: { position: 'absolute', backgroundColor: palette.felt, top: '45%', borderRadius: 20, paddingHorizontal: 9, paddingVertical: 4 },
  tableTopLabelText: { color: '#6B9486', fontSize: 10, letterSpacing: 5 },
  cardNorth: { position: 'absolute', top: 2 },
  cardWest: { position: 'absolute', left: 0, top: '37%' },
  cardEast: { position: 'absolute', right: 0, top: '37%' },
  cardSouth: { position: 'absolute', bottom: 2 },
  emptyCard: { width: 51, height: 77, borderWidth: 1, borderColor: '#517669', borderStyle: 'dashed', borderRadius: 8, opacity: .35, justifyContent: 'center', alignItems: 'center' },
  emptyCardDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#668B7C' },
  centerHint: { color: palette.gold, fontSize: 9, fontWeight: '900', letterSpacing: 1.5, backgroundColor: palette.felt, padding: 4, position: 'absolute' },
  detailRow: { flexDirection: 'row', gap: 8, alignItems: 'center', paddingVertical: 7 },
  detailPill: { flex: 1, backgroundColor: '#0A302B', borderColor: '#2B584D', borderWidth: 1, paddingHorizontal: 10, paddingVertical: 9, borderRadius: 12 },
  detailCaption: { color: palette.muted, fontSize: 8, fontWeight: '900', letterSpacing: 1 },
  detailValue: { color: palette.ivory, fontSize: 15, fontWeight: '800', marginTop: 2 },
  detailSmall: { color: palette.mist, fontSize: 9 },
  lastButton: { paddingHorizontal: 9, paddingVertical: 12 },
  lastText: { color: palette.gold, fontSize: 9, fontWeight: '900', letterSpacing: 1 },
  handTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingTop: 5, paddingBottom: 8 },
  handLabel: { color: palette.ivory, fontSize: 14, fontWeight: '900', letterSpacing: 1 },
  handNumber: { color: palette.gold, fontSize: 12 },
  handHint: { color: palette.mist, fontSize: 10, marginTop: 4 },
  turnBadge: { borderWidth: 1, borderColor: '#42695E', padding: 7, borderRadius: 20, flexDirection: 'row', alignItems: 'center', gap: 5 },
  turnBadgeActive: { borderColor: palette.goldDim, backgroundColor: '#315142' },
  turnDot: { width: 6, height: 6, backgroundColor: '#75938B', borderRadius: 3 },
  turnDotActive: { backgroundColor: palette.gold },
  turnText: { color: palette.mist, fontWeight: '900', letterSpacing: .4, fontSize: 8 },
  hand: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', paddingTop: 17, paddingBottom: 5 },
  foot: { color: '#7DA296', fontSize: 8, textAlign: 'center', letterSpacing: 1.3, paddingBottom: 5, fontWeight: '800' },
});
