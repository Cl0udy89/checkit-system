# CheckIT - System Naliczania Punktów

## 1. Binary Brain
- **Maksymalna punktacja**: 1000 punktów za każde zdefiniowane pytanie.
- **Kryterium sukcesu**: Poprawne udzielenie odpowiedzi na minimum `80%` pytań (`binary_brain_trigger_threshold: 0.8`).
- **Ucieczka punktów (Time Decay)**:
  - Bazowa punktacja to `Ilość Pytan * 1000`.
  - Od momentu rozpoczęcia gry naliczany jest spadek punktów wynoszący **50 punktów na sekundę** (`decay_rate_per_ms: 0.05`).
  - Ostateczny wynik zależy również od procentu poprawnych odpowiedzi: `Wynik = (Punkty Bazowe - KaraCzasowa) * Skuteczność`.
- **Wygrana**: Skuteczność `>= 80%`. Osiągnięcie łącznego wyniku `>= 5000` punktów uruchamia dodatkowy elektrozamek (`solenoid`).

## 2. Patch Master
- **Maksymalna punktacja**: Startujesz od puli **10,000** punktów (`initial_points: 10000`).
- **Cel**: Jak najszybsze poprawne wpięcie 8 kabli typu Patch Cord z wtykami RJ45.
- **Ucieczka punktów (Time Decay)**:
  - Tak jak we wszystkich minigrach, wynik maleje o **50 punktów** w każdej sekundzie trwania procesu (`0.05` pkt/ms).
  - Prawdziwy mechanizm zatrzymujący czas odbywa się sprzętowo na Raspberry Pi, które odczytuje rezystory na poszczególnych parach w trybie bliskim czasu rzeczywistego (skanowanie co `50` ms).
  
## 3. IT Match
- **Maksymalna punktacja**: 1000 punktów za każdy zestaw problem-rozwiązanie (narzędzie / port / technologia).
- **Zasady**: Na ekranie graczowi zadawane są pytania w formie dopasowywania i odpowiada on True/False albo wybiera wprost odpowiedź.
- **Ucieczka punktów (Time Decay)**:
  - Spadek zgodnie ze standardowym wskaźnikiem (**50 punktów na sekundę**).
  - Wynik to `Pula Punktów * Skuteczność`.
