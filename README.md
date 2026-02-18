# CheckIT System - Kiosk & Hardware Control

System obsługi stoiska na wydarzenie IT "CheckIT". Aplikacja typu Kiosk/Server obsługująca 3 gry edukacyjne, sterująca fizycznym hardwarem (Patch Panel, Solenoid, LED) i wyświetlająca rankingi.

## Gry

1.  **BINARY BRAIN** (Quiz + Hardware)
    - Odpowiedz na pytania.
    - Jeśli wygrasz, Solenoid otworzy skrzynkę (`GPIO 26`).
2.  **PATCH MASTER** (Hardware)
    - Połącz poprawnie kable na patch panelu.
    - System wykrywa połączenia na żywo.
3.  **IT MATCH** (Tinder-style Quiz)
    - Szybkie decyzje: Przesuń w PRAWO (Bezpieczne/Tak), w LEWO (Zagrożenie/Nie).
    - Zdjęcia i pytania ładowane z pliku CSV.

## Instalacja ("EASY MODE")

System posiada teraz **jeden skrypt startowy**, który automatycznie wykrywa środowisko, instaluje zależności i aktualizuje kod.

### 1. Pobranie i Uruchomienie

Na **KAŻDYM** urządzeniu (Serwer PC lub Raspberry Pi) wykonaj:

```bash
cd ~/checkit-system
git pull
chmod +x start.sh
./start.sh
```

### 2. Wybór Roli

Przy pierwszym uruchomieniu skrypt zapyta o rolę urządzenia:

1.  **SERVER** (PC/Proxmox):
    - Wybierz **1**.
    - Skrypt skonfiguruje bazę danych i API.
2.  **CLIENT** (Raspberry Pi):
    - Wybierz **2**.
    - Skrypt skonfiguruje obsługę hardware'u.

---

## Panel Admina

Dostępny pod adresem strony głównej -> `/admin`.
**Login:** `admin`
**Hasło:** `checkit2024`

**Funkcje:**
- **Sprzęt:** Ręczne sterowanie Solenoidem (Otwórz skrzynkę) i podgląd Patch Panela.
- **Użytkownicy:** Lista zarejestrowanych osób. **Możliwość USUWANIA użytkowników** (reset wyników).
- **Wyniki:** Podgląd tabeli wyników.

---

## Zarządzanie Treścią (Edycja Pytań)

### IT-Match (Tinder)
Plik z pytaniami znajduje się w:
`backend/assets/it_match/questions.csv`

**Format pliku:**
```csv
id,question,image,is_correct
1,"Czy to hasło jest bezpieczne?","obrazek.jpg",1
2,"Czy to phishing?","phishing.jpg",0
```
- `id`: Unikalny numer pytania.
- `question`: Treść pytania.
- `image`: Nazwa pliku zdjęcia. Zdjęcia wrzuć do folderu `backend/assets/it_match/`.
- `is_correct`: `1` = Prawda/Bezpieczne (Swipe w Prawo), `0` = Fałsz/Zagrożenie (Swipe w Lewo).

### Obrazki
Wrzuć pliki `.jpg` lub `.png` do folderu `backend/assets/it_match/`.
Upewnij się, że nazwa w pliku CSV zgadza się z nazwą pliku (wielkość liter ma znaczenie!).

---

## Hardware Wiring (Patch Master)

| Patch Panel Pair | RJ45 Port | RPi GPIO (BCM) | Physical Pin |
|------------------|-----------|----------------|--------------|
| **Pair 1**       | Port 1    | **GPIO 17**    | Pin 11       |
| **Pair 2**       | Port 2    | **GPIO 27**    | Pin 13       |
| **Pair 3**       | Port 4    | **GPIO 22**    | Pin 15       |
| **Pair 4**       | Port 5    | **GPIO 10**    | Pin 19       |
| **Pair 5**       | Port 6    | **GPIO 09**    | Pin 21       |
| **Pair 6**       | Port 7    | **GPIO 11**    | Pin 23       |
| **Pair 7**       | Port 9    | **GPIO 05**    | Pin 29       |
| **Pair 8**       | Port 11   | **GPIO 06**    | Pin 31       |

> **Uwaga:** Wszystkie piny GPIO są skonfigurowane jako `INPUT_PULLUP`. Zwarcie do masy (GND) oznacza "Połączenie aktywne".

## Solenoid (Binary Brain)
- **GPIO 26 (BCM)** (Pin 37) steruje przekaźnikiem.
- Stan wysoki (HIGH) = Otwarcie.
