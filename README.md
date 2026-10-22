# Batak — Offline

iOS ve Android için **React Native + Expo** ile geliştirilmekte olan çevrimdışı bireysel İhaleli Batak.

## Başlat

Node.js 22.13+ önerilir.

~~~bash
npm install
npx expo install --fix
npm start
~~~

Expo Go ile gerçek cihazda veya iOS/Android emülatöründe açabilirsiniz. İlk kurulumdan sonra oyun için internet, hesap veya sunucu gerekmez.

## İlk sürüm

- 52 kart, 4 oyuncu: 1 insan + 3 telefon içi bot
- 5–13 açık artırma; herkes pas derse mecburi 4
- Koz seçimi, renge uyma, kozla kesme, opsiyonel zorunlu yükseltme ve koz kırma
- 13 löve, varsayılan 10 katsayılı puanlama
- 1/3/5/9 dağıtımlık maçlar
- Her hamle sonrası cihazda otomatik kayıt ve devam
- Kolay / Normal / Zor sezgisel bot politikası (ileri ISMCTS henüz yok)
- Özgün gece yeşili masa ve özel kart ön / arka yüzleri

## Kontrol

~~~bash
npm test
npm run typecheck
~~~

Kurallar motoru `src/game/engine.ts` içinde UI'dan bağımsızdır. Bot yalnız `botObservation()` ile sağlanan sansürlenmiş oyun durumunu görebilir.

## Sonraki aşamalar

- Batak'a özel kısıt tabanlı inanç modeli, ISMCTS, performans benchmarkları
- Ses/haptik, animasyon ve ayrıntılı istatistikler
- Eşli, Koz Maça ve Gömmeli için bağımsız kural profilleri

Bu çalışma ilk oynanabilir prototiptir, mağaza yayınına hazır son sürüm değildir.

Lisans: MIT (`LICENSE`).
