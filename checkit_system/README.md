# CheckIT System - Kiosk & Hardware Control

System obsługi stoiska na wydarzenie IT "CheckIT". Aplikacja typu Kiosk/Server obsługująca 3 gry edukacyjne, sterująca fizycznym hardwarem (Patch Panel, Solenoid, LED) i wyświetlająca rankingi.

## Instalacja

### Wymagania
- Raspberry Pi 4 (Raspberry Pi OS Bookworm)
- Python 3.10+
- Node.js 20+

### Szybki Start (Raspberry Pi)
1. Sklonuj repozytorium:
   ```bash
   git clone <repo_url>
   cd checkit_system
   ```
2. Uruchom skrypt instalacyjny:
   ```bash
   chmod +x install.sh
   ./install.sh
   ```
3. Skonfiguruj `config.yaml` (opcjonalnie).

### Uruchomienie (Dev/Production)
1. **Backend**:
   ```bash
   cd backend
   source venv/bin/activate
   uvicorn main:app --host 0.0.0.0 --port 8000 --reload
   ```
2. **Frontend**:
   ```bash
   cd frontend
   npm run dev 
   # Lub build: npm run build && npm run preview
   ```

## Hardware Wiring (Patch Master)

Gra "Patch Master" wymaga pociągnięcia kabli od portów RJ45 (masa/GND) do pinów GPIO.
Jeśli port RJ45 ma być "poprawny", musi zewrzeć GND z odpowiednim pinem GPIO.

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

> **Uwaga:** Wszystkie piny GPIO są skonfigurowane jako `INPUT_PULLUP`. Zwarcie do masy (GND) oznacza "Połączenie aktywne" (Logic LOW).

## Solenoid (Binary Brain)
- **GPIO 26 (BCM)** (Pin 37) steruje przekaźnikiem/MOSFETem cewki.
- Stan wysoki (HIGH) = Otwarcie.
- Czas otwarcia: 5 sekund (safety timeout).

## Konfiguracja (`config.yaml`)
W pliku `config.yaml` możesz zmienić:
- Mapowanie pinów.
- Adres API do synchronizacji logów.
- Progi punktowe i szybkość spadku punktów.

## Zarządzanie Treścią
Pliki contentu znajdują się w folderze `/content`:
- `/content/binary_brain/questions.csv`
- `/content/it_match/questions.csv`
- `/content/*/images/*.jpg`

Edycja CSV możliwa w Excelu/Notatniku. Nie zmieniaj nazw kolumn!
