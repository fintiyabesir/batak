# Batak — geliştirme sözleşmesi (Codex / diğer ajanlar)

Bu depo **tamamen çevrimdışı**, telefon için React Native / Expo uygulamasıdır. İlk kapsam: bireysel İhaleli Batak, Güney insan + Batı/Kuzey/Doğu bot.

## Sınırlar

- Kural, ihale, dağıtım, geçerli kart ve puan mantığının **tek kaynağı**: `src/game/engine.ts`.
- UI karar motoru değildir; geçerli kartları **daima** `legalCards()` üzerinden al.
- Bot için tek giriş `botObservation(game, seat)`. Bota `Game.hands` veya başka gizli el asla verme. Kodda veri sızdıran kestirmeler kullanma.
- Depoda özgün kart / masa bileşenleri var. Harici lisansı belirsiz kart görselleri veya masa şablonları ekleme.
- Oyun, karıştırma, puanlama ve bot kararı için sunucu bağlantısı, kullanıcı kaydı veya internet gerekliliği koyma.
- Maç başlarken kurallar dondurulur; ayar değişikliği devam eden maçın kurallarını sessizce değiştirme.
- Skorlar, rastgele dağıtım ve botlar için gerekçeli testler gerekir.

## Zorunlu kontroller

- `npm test`: saf oyun motoru, kural örnekleri, 200 tam dağıtım.
- `npm run typecheck`: uygulamanın tip denetimi.
- PR değişikliği hangi kullanıcı akışını düzeltiyorsa o akışa yeni test ekle.
- Fiziksel cihazla test etmeden "telefonlarda doğrulandı" iddiasında bulunma.

## Yapay zekâ yol haritası

Mevcut `src/game/bot.ts` bir **ilk sürüm sezgisel politika**; "en iyi / optimal" olarak sunulmaz.

1. Olay geçmişinden kesin bilgi çıkarımı (renk boşlukları, yükselme kısıtları).
2. Kalan kartların kısıt uyumlu olasılıksal dağıtımı; hiçbir rakibin gerçek gizli eli kullanılmaz.
3. ISMCTS ile belirsiz bilgili arama, her bot için bireysel skor faydası.
4. İhale ve koz için Monte Carlo karşılaştırması.
5. 1/3/5/9 dağıtım bağlamlı maç hedefi, son üç lövede yoğun arama.
6. Adil eşlenik dağıtımlar + koltuk rotasyonu ile skor, başarı, gecikme benchmarkları.
7. Kritik durumlarda güvenli ve tamamen yasal sezgisel fallback.

Algoritma iyileştirmelerini yalnızca "daha çok simülasyon" yerine ölçülebilir skor ve maç kazanma farkıyla değerlendir.
