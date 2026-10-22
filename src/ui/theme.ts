export const palette = {
  night: '#061A1A',
  deep: '#082523',
  felt: '#0F3732',
  feltLight: '#16493F',
  border: '#34645A',
  gold: '#E8C781',
  goldDim: '#9F8656',
  ivory: '#FFF9EC',
  mist: '#BCD2C7',
  muted: '#7FA29A',
  red: '#D65557',
  ink: '#18312F',
  overlay: 'rgba(1, 14, 15, 0.86)',
} as const;
export const SUIT_MARK: Record<string, string> = {
  spades: '♠', hearts: '♥', diamonds: '♦', clubs: '♣',
};
export const SUIT_TR: Record<string, string> = {
  spades: 'Maça', hearts: 'Kupa', diamonds: 'Karo', clubs: 'Sinek',
};
export const PLAYER_NAMES = ['SEN', 'DENİZ', 'KUZEY', 'BARAN'] as const;
