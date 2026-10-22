import React from 'react';
import {
  Pressable, StyleSheet, Text, View, type StyleProp, type ViewStyle,
} from 'react-native';
import type { Card } from '../game/engine';
import { palette, SUIT_MARK, SUIT_TR } from './theme';

type Props = {
  card?: Card;
  hidden?: boolean;
  size?: 'hand' | 'played' | 'small' | 'showcase';
  selected?: boolean;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
  onPress?: () => void;
};
const SIZES = {
  hand: [56, 91], played: [56, 83], small: [35, 51], showcase: [84, 128],
} as const;
function value(rank: number): string {
  if (rank === 14) return 'A';
  if (rank === 13) return 'K';
  if (rank === 12) return 'Q';
  if (rank === 11) return 'J';
  return String(rank);
}
/** Özgün geometrik kart arkalığı ve kart ön yüzü; harici görsel yok. */
export default function CardView({
  card, hidden, size = 'hand', selected, disabled, style, onPress,
}: Props) {
  const [width, height] = SIZES[size];
  const small = size === 'small';
  const red = card?.suit === 'hearts' || card?.suit === 'diamonds';
  const ink = red ? '#BD4948' : '#18352F';
  const back = hidden || !card;
  const contents = (
    <View style={[
      styles.shell, { width, height, borderRadius: small ? 5 : 9 },
      back ? styles.back : styles.face,
      selected && { borderColor: palette.gold, borderWidth: 2.5, transform: [{ translateY: -12 }] },
      disabled && { opacity: 0.42 },
    ]}>
      {back ? (
        <View style={[styles.backInner, { borderRadius: small ? 2 : 5 }]}>
          <View style={[styles.diamond, { width: width * .49, height: width * .49 }]} />
          {!small && <View style={[styles.diamond, styles.smallDiamond, { width: width * .26, height: width * .26 }]} />}
          <Text style={[styles.backGlyph, { fontSize: small ? 12 : size === 'showcase' ? 25 : 17 }]}>B</Text>
          <View style={styles.backBottom} />
        </View>
      ) : (
        <>
          <View style={styles.topPip}>
            <Text allowFontScaling={false} style={[styles.rank, { color: ink, fontSize: small ? 13 : size === 'showcase' ? 24 : 18 }]}>{value(card!.rank)}</Text>
            <Text allowFontScaling={false} style={[styles.smallSuit, { color: ink, fontSize: small ? 12 : 16 }]}>{SUIT_MARK[card!.suit]}</Text>
          </View>
          <View style={[styles.centerStamp, { borderColor: red ? '#F1D6CD' : '#D9E6DE' }]}>
            <Text allowFontScaling={false} style={{ color: ink, fontSize: small ? 19 : size === 'showcase' ? 54 : 33, lineHeight: small ? 24 : size === 'showcase' ? 66 : 42 }}>{SUIT_MARK[card!.suit]}</Text>
          </View>
          {!small && <Text allowFontScaling={false} style={[styles.bottomPip, { color: ink }]}>{value(card!.rank)}{SUIT_MARK[card!.suit]}</Text>}
        </>
      )}
    </View>
  );
  return (
    <Pressable
      onPress={onPress}
      disabled={!onPress || disabled}
      accessibilityRole={onPress ? 'button' : 'image'}
      accessibilityLabel={back ? 'Kapalı kart' : SUIT_TR[card!.suit] + ' ' + value(card!.rank) + (disabled ? ', oynanamaz' : ', oynanabilir')}
      accessibilityState={onPress ? { disabled: !!disabled, selected: !!selected } : undefined}
      style={style}
    >{contents}</Pressable>
  );
}
const styles = StyleSheet.create({
  shell: {
    overflow: 'hidden', borderWidth: 1, borderColor: '#ECE4D0',
    shadowColor: '#000', shadowOpacity: .3, shadowRadius: 5,
    shadowOffset: { width: 0, height: 3 }, elevation: 4,
  },
  face: { backgroundColor: '#FFF9EF', justifyContent: 'center', alignItems: 'center' },
  back: { backgroundColor: '#103A38', padding: 4 },
  backInner: {
    flex: 1, borderWidth: 1.1, borderColor: '#C1A572',
    backgroundColor: '#184B44', alignItems: 'center', justifyContent: 'center',
    overflow: 'hidden',
  },
  diamond: {
    position: 'absolute', borderWidth: 1.6, borderColor: '#D4B878',
    transform: [{ rotate: '45deg' }], backgroundColor: 'rgba(236,204,145,0.05)',
  },
  smallDiamond: { borderWidth: 1, borderColor: '#D9C48B' },
  backGlyph: { color: '#E3CA8D', fontWeight: '900', letterSpacing: -2 },
  backBottom: {
    position: 'absolute', bottom: 3, left: 5, right: 5, height: 1,
    backgroundColor: '#C7A66D', opacity: .65,
  },
  topPip: { position: 'absolute', top: 3, left: 4, alignItems: 'center' },
  rank: { fontWeight: '900', lineHeight: 23, letterSpacing: -1 },
  smallSuit: { marginTop: -4, lineHeight: 18 },
  centerStamp: {
    height: '59%', width: '71%', borderWidth: 1, borderRadius: 40,
    alignItems: 'center', justifyContent: 'center', marginLeft: 7,
  },
  bottomPip: {
    position: 'absolute', bottom: 2, right: 4, fontSize: 10,
    fontWeight: '800', transform: [{ rotate: '180deg' }],
  },
});
