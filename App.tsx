import React, { useEffect, useMemo, useState } from 'react';
import {
  Alert, Modal, Pressable, ScrollView, StatusBar, StyleSheet,
  Text, View,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getRandomBytes } from 'expo-crypto';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import {
  DEFAULT_RULES, SUITS, botObservation, isValidSavedGame, legalCards,
  newGame, nextRound, placeBid, playCard, selectTrump, winningPlay,
  type Game, type Rules, type Suit,
} from './src/game/engine';
import { chooseBid, chooseCard, chooseTrump } from './src/game/bot';
import CardView from './src/ui/CardView';
import GameTable from './src/ui/GameTable';
import { palette, PLAYER_NAMES, SUIT_MARK, SUIT_TR } from './src/ui/theme';

const GAME_KEY = 'batak.match.v1';
const SETTINGS_KEY = 'batak.settings.v1';
type Difficulty = 'easy' | 'normal' | 'hard';
type Settings = {
  difficulty: Difficulty;
  rounds: number;
  fastBots: boolean;
  rules: Rules;
};
type Page = 'home' | 'game' | 'settings' | 'rules';
const DEFAULT_SETTINGS: Settings = {
  difficulty: 'normal', rounds: 5, fastBots: false,
  rules: { ...DEFAULT_RULES },
};

/** Rejection sampling: modulo bias olmadan kriptografik 0...maxExclusive-1. */
function secureRandomIndex(maxExclusive: number): number {
  if (!Number.isInteger(maxExclusive) || maxExclusive < 1 || maxExclusive > 256)
    throw Error('Rastgele sayı aralığı geçersiz');
  const limit = 256 - (256 % maxExclusive);
  let value = 0;
  do { value = getRandomBytes(1)[0]; } while (value >= limit);
  return value % maxExclusive;
}
function safeSettings(raw: string | null): Settings {
  if (!raw) return DEFAULT_SETTINGS;
  try {
    const object = JSON.parse(raw) as Partial<Settings>;
    if (!['easy', 'normal', 'hard'].includes(String(object.difficulty))) return DEFAULT_SETTINGS;
    if (![1, 3, 5, 9].includes(Number(object.rounds))) return DEFAULT_SETTINGS;
    if (!object.rules) return DEFAULT_SETTINGS;
    return {
      difficulty: object.difficulty as Difficulty,
      rounds: object.rounds!,
      fastBots: !!object.fastBots,
      rules: {
        ...DEFAULT_RULES,
        mustOvertake: !!object.rules.mustOvertake,
        trumpMustBeBroken: !!object.rules.trumpMustBeBroken,
      },
    };
  } catch { return DEFAULT_SETTINGS; }
}
function ActionButton({
  label, onPress, primary = false, outline = false, disabled = false,
}: { label: string; onPress: () => void; primary?: boolean; outline?: boolean; disabled?: boolean }) {
  return (
    <Pressable
      accessibilityRole="button" accessibilityLabel={label}
      disabled={disabled} onPress={onPress}
      style={[styles.button, primary && styles.primaryButton, outline && styles.outlineButton, disabled && { opacity: .4 }]}
    ><Text style={[styles.buttonText, primary && styles.primaryButtonText]}>{label}</Text></Pressable>
  );
}
function SectionTitle({ eyebrow, title, description }: { eyebrow: string; title: string; description?: string }) {
  return (
    <View style={styles.sectionTitle}>
      <Text style={styles.eyebrow}>{eyebrow}</Text>
      <Text style={styles.bigTitle}>{title}</Text>
      {description && <Text style={styles.description}>{description}</Text>}
    </View>
  );
}
function OptionRow({
  label, options, value, onChange,
}: { label: string; options: { label: string; value: string | number }[]; value: string | number; onChange: (value: any) => void }) {
  return (
    <View style={styles.optionBlock}>
      <Text style={styles.optionLabel}>{label}</Text>
      <View style={styles.optionButtons}>
        {options.map(option => (
          <Pressable
            key={String(option.value)} onPress={() => onChange(option.value)}
            accessibilityRole="button"
            accessibilityState={{ selected: option.value === value }}
            style={[styles.optionButton, option.value === value && styles.optionButtonActive]}
          >
            <Text style={[styles.optionText, option.value === value && styles.optionTextActive]}>{option.label}</Text>
          </Pressable>
        ))}
      </View>
    </View>
  );
}
function Sheet({
  title, subtitle, children, visible,
}: { title: string; subtitle?: string; children: React.ReactNode; visible: boolean }) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={() => undefined}>
      <View style={styles.modalShade}>
        <View style={styles.sheet}>
          <Text style={styles.sheetMark}>✦  BATÂK  ✦</Text>
          <Text style={styles.sheetTitle}>{title}</Text>
          {subtitle && <Text style={styles.sheetSubtitle}>{subtitle}</Text>}
          {children}
        </View>
      </View>
    </Modal>
  );
}
function HomeScreen({ game, start, resume, goSettings, goRules }: {
  game: Game | null; start: () => void; resume: () => void;
  goSettings: () => void; goRules: () => void;
}) {
  return (
    <View style={styles.home}>
      <View style={styles.homeTop}>
        <Text style={styles.homeBrand}>♠  BATÂK</Text>
        <Text style={styles.homeTopRight}>OFFLINE CARD CLUB  /  01</Text>
      </View>
      <View style={styles.hero}>
        <View style={styles.heroHalo} />
        <View style={styles.heroHaloInner} />
        <View style={styles.showcase}>
          <CardView card={{ id: 'h14', suit: 'hearts', rank: 14 }} size="showcase" style={styles.showcaseLeft} />
          <CardView hidden size="showcase" style={styles.showcaseMiddle} />
          <CardView card={{ id: 's14', suit: 'spades', rank: 14 }} size="showcase" style={styles.showcaseRight} />
        </View>
        <Text style={styles.heroTiny}>DÖRT OYUNCU. TEK MASA.</Text>
        <Text style={styles.heroTitle}>OYUN SENİN{'\n'}ELİNDE.</Text>
        <Text style={styles.heroDescription}>İhaleni ver. Kozunu seç. Masanın kaderini belirle.</Text>
        <View style={styles.heroUnderline} />
      </View>
      <View style={styles.homeActions}>
        {game && <ActionButton primary label="KALDIĞIN YERDEN DEVAM ET   →" onPress={resume} />}
        <ActionButton primary={!game} outline={!!game} label="YENİ OYUN   ↗" onPress={start} />
        <View style={styles.homeLinks}>
          <Pressable style={styles.homeLink} onPress={goSettings} accessibilityRole="button">
            <Text style={styles.homeLinkText}>⚙  MASA AYARLARI</Text>
          </Pressable>
          <Pressable style={styles.homeLink} onPress={goRules} accessibilityRole="button">
            <Text style={styles.homeLinkText}>ⓘ  NASIL OYNANIR?</Text>
          </Pressable>
        </View>
      </View>
      <Text style={styles.homeFoot}>İNTERNET YOK. ACELE YOK. SADECE OYUN.</Text>
    </View>
  );
}
function SettingsScreen({ settings, save, back }: { settings: Settings; save: (value: Settings) => void; back: () => void }) {
  const changeRule = (key: keyof Rules, value: number | boolean) =>
    save({ ...settings, rules: { ...settings.rules, [key]: value } });
  return (
    <ScrollView contentContainerStyle={styles.pageScroll}>
      <SectionTitle eyebrow="KENDİ MASANI KUR" title="MASA AYARLARI" description="Değişiklikler yeni oyunda geçerlidir." />
      <OptionRow label="RAKİPLERİN SEVİYESİ" options={[
        { label: 'KOLAY', value: 'easy' }, { label: 'NORMAL', value: 'normal' }, { label: 'ZOR', value: 'hard' },
      ]} value={settings.difficulty} onChange={(v: Difficulty) => save({ ...settings, difficulty: v })} />
      <OptionRow label="MAÇ UZUNLUĞU / DAĞITIM" options={[1, 3, 5, 9].map(v => ({ label: String(v), value: v }))}
        value={settings.rounds} onChange={(v: number) => save({ ...settings, rounds: v })} />
      <OptionRow label="ZORUNLU YÜKSELTME" options={[{ label: 'AÇIK', value: 'on' }, { label: 'KAPALI', value: 'off' }]}
        value={settings.rules.mustOvertake ? 'on' : 'off'} onChange={(v: string) => changeRule('mustOvertake', v === 'on')} />
      <OptionRow label="KOZ KIRILMADAN KOZ AÇMA" options={[{ label: 'YASAK', value: 'on' }, { label: 'SERBEST', value: 'off' }]}
        value={settings.rules.trumpMustBeBroken ? 'on' : 'off'} onChange={(v: string) => changeRule('trumpMustBeBroken', v === 'on')} />
      <OptionRow label="BİLGİSAYAR HAMLE HIZI" options={[{ label: 'NORMAL', value: 'normal' }, { label: 'HIZLI', value: 'fast' }]}
        value={settings.fastBots ? 'fast' : 'normal'} onChange={(v: string) => save({ ...settings, fastBots: v === 'fast' })} />
      <View style={styles.settingNote}><Text style={styles.settingNoteText}>Varsayılan: İhale 5–13; herkes pas geçerse ilk ihaleci mecburi 4 alır. Puanlar alınan löve ×10; batan ihaleci ve sıfır çeken savunan −ihale ×10 alır.</Text></View>
      <ActionButton primary label="MASAYA DÖN  →" onPress={back} />
    </ScrollView>
  );
}
function RulesScreen({ back }: { back: () => void }) {
  return (
    <ScrollView contentContainerStyle={styles.pageScroll}>
      <SectionTitle eyebrow="KISA OYUN REHBERİ" title="NASIL OYNANIR?" description="4 kişi, 52 kart, 13 löve. En yüksek puanı topla." />
      {[
        ['01 / İHALE', 'Sırayla 5–13 arası teklif verilir veya pas geçilir. Yeni teklif, önceki en yüksek tekliften büyük olmalıdır. Herkes pas geçerse ilk söz sahibi mecburi 4 alır.'],
        ['02 / KOZ', 'İhaleyi alan dört renkten birini koz ilan eder ve ilk kartı açar. Koz, diğer renkleri kesebilir.'],
        ['03 / RENK TAKİBİ', 'Açılan renkten kartın varsa o renge uymalısın. Zorunlu yükseltme açıksa ve kesilmemişse geçebildiğinde yükselmelisin.'],
        ['04 / KESME', 'Açılan renk yoksa koz varsa koz atılır. Hiç koz yoksa istediğin renk atılır. En yüksek koz, koz yoksa açılan rengin en büyüğü löveyi kazanır.'],
        ['05 / PUAN', 'İhaleci sözünü tutarsa aldığı löve ×10, tutamazsa −ihale ×10. Savunan en az bir löve alırsa löve ×10, hiç alamazsa −ihale ×10.'],
      ].map(([heading, copy]) => (
        <View key={heading} style={styles.rulesCard}>
          <Text style={styles.ruleHeading}>{heading}</Text><Text style={styles.ruleCopy}>{copy}</Text>
        </View>
      ))}
      <ActionButton primary label="ANLADIM  →" onPress={back} />
    </ScrollView>
  );
}
function ResultContent({ game, goNext, goHome, playAgain }: {
  game: Game; goNext: () => void; goHome: () => void; playAgain: () => void;
}) {
  const result = game.results[game.results.length - 1];
  if (!result) return null;
  const sorted = [0, 1, 2, 3].sort((a, b) => game.scores[b] - game.scores[a]);
  const matchDone = game.phase === 'matchEnd';
  return (
    <View>
      <View style={styles.resultInfo}>
        <Text style={styles.resultLabel}>İHALE</Text>
        <Text style={styles.resultValue}>{PLAYER_NAMES[result.bidder]}  ·  {result.bid}  ·  {SUIT_MARK[result.trump]} {SUIT_TR[result.trump]}</Text>
      </View>
      {(matchDone ? sorted : [0, 1, 2, 3]).map((seat, index) => (
        <View key={seat} style={[styles.resultRow, seat === 0 && styles.resultRowSelf]}>
          <Text style={styles.resultName}>{matchDone ? (index + 1) + '. ' : ''}{PLAYER_NAMES[seat]}</Text>
          <Text style={styles.resultTricks}>{result.tricks[seat]} löve</Text>
          <View style={styles.resultScores}>
            <Text style={[styles.resultDelta, result.delta[seat] < 0 && { color: palette.red }]}>
              {result.delta[seat] > 0 ? '+' : ''}{result.delta[seat]}
            </Text>
            <Text style={styles.resultTotal}>{game.scores[seat]} p</Text>
          </View>
        </View>
      ))}
      <View style={{ height: 14 }} />
      <ActionButton primary label={matchDone ? 'YENİ MAÇ  →' : 'SONRAKİ DAĞITIM  →'} onPress={matchDone ? playAgain : goNext} />
      <View style={{ height: 8 }} />
      <ActionButton outline label="ANA MENÜ" onPress={goHome} />
    </View>
  );
}
function AppInner() {
  const [page, setPage] = useState<Page>('home');
  const [game, setGame] = useState<Game | null>(null);
  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS);
  const [hydrated, setHydrated] = useState(false);
  const [lastOpen, setLastOpen] = useState(false);

  useEffect(() => {
    let mounted = true;
    Promise.all([AsyncStorage.getItem(GAME_KEY), AsyncStorage.getItem(SETTINGS_KEY)])
      .then(([saved, options]) => {
        if (!mounted) return;
        if (saved) {
          try {
            const parsed: unknown = JSON.parse(saved);
            if (isValidSavedGame(parsed)) setGame(parsed);
          } catch { /* Eski/bozuk kayıt varsa güvenli yeni başlangıç. */ }
        }
        setSettings(safeSettings(options));
      })
      .catch(() => undefined)
      .finally(() => { if (mounted) setHydrated(true); });
    return () => { mounted = false; };
  }, []);
  useEffect(() => {
    if (hydrated && game) {
      AsyncStorage.setItem(GAME_KEY, JSON.stringify(game)).catch(() => undefined);
    }
  }, [game, hydrated]);
  useEffect(() => {
    if (!hydrated) return;
    AsyncStorage.setItem(SETTINGS_KEY, JSON.stringify(settings)).catch(() => undefined);
  }, [settings, hydrated]);
  useEffect(() => {
    if (page !== 'game' || !game || game.turn === 0 ||
        !['bidding', 'trump', 'playing'].includes(game.phase)) return;
    const timer = setTimeout(() => {
      setGame(current => {
        if (!current || current.turn === 0 || !['bidding', 'trump', 'playing'].includes(current.phase)) return current;
        const seat = current.turn;
        const view = botObservation(current, seat);
        try {
          if (current.phase === 'bidding') return placeBid(current, seat, chooseBid(view, settings.difficulty));
          if (current.phase === 'trump') return selectTrump(current, seat, chooseTrump(view));
          return playCard(current, seat, chooseCard(view, settings.difficulty));
        } catch (error) {
          // Güvenli düşüş: yalnızca kurallar motorunun döndürdüğü yasal eylemler.
          if (current.phase === 'bidding') return placeBid(current, seat, null);
          if (current.phase === 'trump') return selectTrump(current, seat, SUITS[0]);
          const fallback = legalCards(current, seat)[0];
          return fallback ? playCard(current, seat, fallback.id) : current;
        }
      });
    }, settings.fastBots ? 65 : 340);
    return () => clearTimeout(timer);
  }, [game, page, settings.fastBots, settings.difficulty]);

  const begin = () => {
    if (game && game.phase !== 'matchEnd') {
      Alert.alert('Yeni maç', 'Devam eden maçın üzerine yeni bir maç başlatılsın mı?', [
        { text: 'Vazgeç', style: 'cancel' },
        { text: 'Yeni maç', style: 'destructive', onPress: () => { setGame(newGame(secureRandomIndex, settings.rounds, settings.rules)); setPage('game'); } },
      ]);
      return;
    }
    setGame(newGame(secureRandomIndex, settings.rounds, settings.rules));
    setPage('game');
  };
  const action = (fn: (current: Game) => Game) => {
    setGame(current => {
      if (!current) return current;
      try { return fn(current); }
      catch (error) {
        // Kullanıcı geçersiz karta bastığında uygulamayı çökertmeyiz.
        console.warn('Batak işlem engellendi:', error);
        return current;
      }
    });
  };
  const bidOptions = useMemo(() => {
    if (!game || game.phase !== 'bidding') return [];
    const minimum = Math.max(game.rules.minBid, game.highestBid + 1);
    return Array.from({ length: Math.max(0, 14 - minimum) }, (_, i) => minimum + i);
  }, [game?.highestBid, game?.phase, game?.rules.minBid]);
  if (!hydrated) return <View style={styles.loading}><Text style={styles.homeBrand}>♠  BATÂK</Text></View>;
  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="light-content" backgroundColor={palette.night} />
      {page === 'home' && <HomeScreen game={game} start={begin} resume={() => setPage('game')}
        goSettings={() => setPage('settings')} goRules={() => setPage('rules')} />}
      {page === 'settings' && <SettingsScreen settings={settings} save={setSettings} back={() => setPage('home')} />}
      {page === 'rules' && <RulesScreen back={() => setPage('home')} />}
      {page === 'game' && game && (
        <GameTable game={game} onHome={() => setPage('home')} onLastTrick={() => setLastOpen(true)}
          onCard={cardId => action(current => playCard(current, 0, cardId))} />
      )}
      <Sheet visible={page === 'game' && game?.phase === 'bidding' && game.turn === 0}
        title="SÖZ SENDE" subtitle={'İhaleyi alabilmek için en az ' + (bidOptions[0] ?? '—') + ' demelisin.'}>
        <View style={styles.bidGrid}>
          {bidOptions.map(value => (
            <Pressable key={value} onPress={() => action(current => placeBid(current, 0, value))} style={styles.bidNumber}>
              <Text style={styles.bidNumberText}>{value}</Text>
            </Pressable>
          ))}
        </View>
        <ActionButton outline label="PAS GEÇ" onPress={() => action(current => placeBid(current, 0, null))} />
      </Sheet>
      <Sheet visible={page === 'game' && game?.phase === 'trump' && game.turn === 0}
        title="KOZUNU SEÇ" subtitle={'İhale senin: ' + (game?.highestBid ?? '') + ' löve. Hangi renkle oynayacaksın?'}>
        <View style={styles.suitGrid}>
          {SUITS.map(suit => (
            <Pressable key={suit} style={styles.suitButton} onPress={() => action(current => selectTrump(current, 0, suit))}>
              <Text style={[styles.suitIcon, (suit === 'hearts' || suit === 'diamonds') && { color: palette.red }]}>{SUIT_MARK[suit]}</Text>
              <Text style={styles.suitName}>{SUIT_TR[suit]}</Text>
            </Pressable>
          ))}
        </View>
      </Sheet>
      <Sheet visible={page === 'game' && (game?.phase === 'roundEnd' || game?.phase === 'matchEnd')}
        title={game?.phase === 'matchEnd' ? 'MAÇ TAMAMLANDI' : 'DAĞITIM BİTTİ'}
        subtitle={game?.phase === 'matchEnd' ? 'Masada son sözü puanlar söyler.' : '13 löve tamamlandı. İşte sonuçlar.'}>
        {game && ['roundEnd', 'matchEnd'].includes(game.phase) && <ResultContent game={game}
          goNext={() => action(current => nextRound(current, secureRandomIndex))}
          playAgain={() => { setGame(newGame(secureRandomIndex, settings.rounds, settings.rules)); setPage('game'); }}
          goHome={() => setPage('home')} />}
      </Sheet>
      <Modal visible={page === 'game' && lastOpen} transparent animationType="fade" onRequestClose={() => setLastOpen(false)}>
        <View style={styles.modalShade}>
          <View style={styles.sheet}>
            <Text style={styles.sheetMark}>SON LÖVE</Text>
            <Text style={styles.sheetTitle}>MASADA KALAN İZ</Text>
            {game?.completedTricks.length ? (
              <>
                <View style={styles.lastCards}>
                  {game.completedTricks[game.completedTricks.length - 1].map(play => (
                    <View key={play.seat} style={{ alignItems: 'center', gap: 6 }}>
                      <CardView card={play.card} size="played" />
                      <Text style={styles.lastName}>{PLAYER_NAMES[play.seat]}</Text>
                    </View>
                  ))}
                </View>
                <Text style={styles.lastWinner}>
                  KAZANAN: {PLAYER_NAMES[winningPlay(game.completedTricks[game.completedTricks.length - 1], game.trump!).seat]}
                </Text>
              </>
            ) : <Text style={styles.description}>Henüz tamamlanan löve yok.</Text>}
            <ActionButton primary label="MASAYA DÖN" onPress={() => setLastOpen(false)} />
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}
export default function App() {
  return <SafeAreaProvider><AppInner /></SafeAreaProvider>;
}
const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: palette.night },
  loading: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: palette.night },
  home: { flex: 1, justifyContent: 'space-between', paddingHorizontal: 26, paddingTop: 18, paddingBottom: 16 },
  homeTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  homeBrand: { color: palette.gold, fontSize: 22, fontWeight: '900', letterSpacing: 3 },
  homeTopRight: { color: palette.muted, fontSize: 8, fontWeight: '800', letterSpacing: .8 },
  hero: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingBottom: 12, overflow: 'hidden' },
  heroHalo: { position: 'absolute', width: 310, height: 310, backgroundColor: '#0D3330', borderRadius: 155, top: '13%', borderWidth: 1, borderColor: '#234D42' },
  heroHaloInner: { position: 'absolute', width: 230, height: 230, borderRadius: 115, top: '20%', borderWidth: 1.5, borderColor: '#396653' },
  showcase: { width: 240, height: 165, marginBottom: 4, flexDirection: 'row', justifyContent: 'center', alignItems: 'center' },
  showcaseLeft: { transform: [{ rotate: '-19deg' }, { translateX: 17 }, { translateY: 12 }], zIndex: 1 },
  showcaseMiddle: { transform: [{ rotate: '0deg' }, { translateY: -12 }], zIndex: 3, marginHorizontal: -32 },
  showcaseRight: { transform: [{ rotate: '19deg' }, { translateX: -17 }, { translateY: 12 }], zIndex: 2 },
  heroTiny: { color: palette.gold, fontSize: 10, letterSpacing: 3, fontWeight: '900', marginTop: 12 },
  heroTitle: { color: palette.ivory, fontSize: 43, textAlign: 'center', fontWeight: '900', letterSpacing: -1.5, lineHeight: 49, marginTop: 12 },
  heroDescription: { color: palette.mist, textAlign: 'center', fontSize: 12, lineHeight: 20, marginTop: 9, paddingHorizontal: 14 },
  heroUnderline: { width: 54, height: 3, borderRadius: 3, backgroundColor: palette.gold, marginTop: 18 },
  homeActions: { gap: 10 },
  button: { minHeight: 52, borderRadius: 14, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 17, backgroundColor: palette.feltLight, borderWidth: 1, borderColor: '#34675B' },
  primaryButton: { backgroundColor: palette.gold, borderColor: '#F4D59A' },
  outlineButton: { backgroundColor: 'transparent', borderColor: '#527366' },
  buttonText: { color: palette.ivory, fontWeight: '900', fontSize: 12, letterSpacing: 1 },
  primaryButtonText: { color: palette.night },
  homeLinks: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 12 },
  homeLink: { padding: 8 },
  homeLinkText: { color: palette.gold, fontSize: 10, fontWeight: '900', letterSpacing: 1 },
  homeFoot: { color: '#62897D', fontSize: 9, letterSpacing: 1.5, textAlign: 'center', fontWeight: '800', marginTop: 25 },
  pageScroll: { padding: 24, paddingTop: 37, paddingBottom: 60, gap: 14 },
  sectionTitle: { marginBottom: 14 },
  eyebrow: { color: palette.gold, fontSize: 10, fontWeight: '900', letterSpacing: 2 },
  bigTitle: { color: palette.ivory, fontSize: 30, fontWeight: '900', marginTop: 10, letterSpacing: -.5 },
  description: { color: palette.mist, fontSize: 13, lineHeight: 21, marginTop: 11 },
  optionBlock: { backgroundColor: '#0D302C', padding: 14, borderRadius: 15, borderWidth: 1, borderColor: '#244A42', gap: 12 },
  optionLabel: { color: palette.mist, fontSize: 11, fontWeight: '900', letterSpacing: 1 },
  optionButtons: { flexDirection: 'row', gap: 7 },
  optionButton: { flex: 1, minHeight: 39, borderRadius: 9, borderWidth: 1, borderColor: '#37655A', alignItems: 'center', justifyContent: 'center' },
  optionButtonActive: { backgroundColor: palette.gold, borderColor: palette.gold },
  optionText: { color: palette.ivory, fontWeight: '800', fontSize: 11 },
  optionTextActive: { color: palette.night },
  settingNote: { borderLeftWidth: 2, borderLeftColor: palette.gold, padding: 15, backgroundColor: '#0C2C2B' },
  settingNoteText: { color: palette.mist, fontSize: 12, lineHeight: 20 },
  rulesCard: { padding: 16, backgroundColor: '#10322F', borderRadius: 14, borderColor: '#2C5048', borderWidth: 1 },
  ruleHeading: { color: palette.gold, fontSize: 14, letterSpacing: 1, fontWeight: '900' },
  ruleCopy: { color: palette.ivory, fontSize: 12, lineHeight: 21, marginTop: 8 },
  modalShade: { flex: 1, backgroundColor: palette.overlay, padding: 18, justifyContent: 'center' },
  sheet: { backgroundColor: '#12372F', borderRadius: 24, borderWidth: 1, borderColor: palette.goldDim, padding: 20, maxHeight: '88%' },
  sheetMark: { color: palette.gold, fontSize: 10, fontWeight: '900', textAlign: 'center', letterSpacing: 2 },
  sheetTitle: { color: palette.ivory, fontSize: 25, textAlign: 'center', fontWeight: '900', marginTop: 8 },
  sheetSubtitle: { color: palette.mist, fontSize: 12, textAlign: 'center', lineHeight: 18, marginTop: 6, marginBottom: 15 },
  bidGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 8, marginBottom: 16, marginTop: 10 },
  bidNumber: { width: 62, height: 56, justifyContent: 'center', alignItems: 'center', borderRadius: 12, backgroundColor: '#214D43', borderWidth: 1, borderColor: '#668170' },
  bidNumberText: { color: palette.ivory, fontSize: 24, fontWeight: '900' },
  suitGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', gap: 10, marginVertical: 16 },
  suitButton: { width: '47%', paddingVertical: 20, alignItems: 'center', borderRadius: 14, backgroundColor: palette.ivory, borderWidth: 2, borderColor: palette.gold },
  suitIcon: { color: palette.ink, fontSize: 45 },
  suitName: { color: palette.ink, fontSize: 13, fontWeight: '900', marginTop: 4 },
  resultInfo: { alignItems: 'center', marginVertical: 12 },
  resultLabel: { color: palette.muted, fontSize: 10, fontWeight: '900', letterSpacing: 1 },
  resultValue: { color: palette.gold, fontSize: 16, fontWeight: '800', marginTop: 5 },
  resultRow: { flexDirection: 'row', alignItems: 'center', minHeight: 50, borderBottomWidth: 1, borderBottomColor: '#355C50', gap: 10, paddingHorizontal: 9 },
  resultRowSelf: { backgroundColor: '#244D40', borderRadius: 8 },
  resultName: { flex: 1, fontSize: 12, color: palette.ivory, fontWeight: '900' },
  resultTricks: { color: palette.mist, fontSize: 11 },
  resultScores: { minWidth: 78, alignItems: 'flex-end' },
  resultDelta: { color: palette.gold, fontSize: 14, fontWeight: '900' },
  resultTotal: { color: palette.mist, fontSize: 10 },
  lastCards: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 22, gap: 4 },
  lastName: { color: palette.mist, fontSize: 9 },
  lastWinner: { color: palette.gold, fontSize: 13, textAlign: 'center', fontWeight: '900', marginBottom: 19 },
});
