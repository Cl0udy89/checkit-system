# CheckIT System - Kiosk & Hardware Control

System obsługi stoiska na wydarzenie IT "CheckIT". Aplikacja typu Kiosk/Server obsługująca 3 gry edukacyjne, sterująca fizycznym hardwarem (Patch Panel, Solenoid, LED) i wyświetlająca rankingi.

## Instalacja i Architektura

System działa w architekturze Klient-Serwer:
1. **Serwer (Proxmox/x86):** Baza danych, API, Leaderboard.
2. **Klient (Raspberry Pi/ARM):** Gry, Hardware (Patch Panel, Solenoid).

### 1. Instalacja SERWERA (Proxmox/Docker/PC)
Serwer uruchamiamy na maszynie, która będzie zbierać wyniki. Nie wymaga GPIO.

```bash
# Uruchom skrypt instalacyjny dla SERWERA
chmod +x install_server.sh
./install_server.sh
```

**Uruchomienie:**
- Backend: `cd backend && source venv/bin/activate && uvicorn main:app --host 0.0.0.0 --port 8000`
- Frontend: `cd frontend && npm run dev` (lub build)

### 2. Instalacja KLIENTA (Raspberry Pi 4)
Klient (Kiosk) łączy się z hardwarem i wysyła wyniki do Serwera.

```bash
# Uruchom skrypt instalacyjny dla KLIENTA (wymaga RPi)
chmod +x install_client.sh
./install_client.sh
```

**Konfiguracja Połączenia:**
1. Sprawdź IP Serwera (np. `192.168.1.100`).
2. Edytuj `config.yaml` na Kliencie:
   ```yaml
   api:
     sync_endpoint: "http://192.168.1.100:8000/api/v1/games/submit" # Dostosuj IP
   ```
3. Uruchomienie jak wyżej (Backend + Frontend).

### Szybki Start (Raspberry Pi)
Poniższa sekcja dotyczy starej wersji (Standalone), zachowana dla kompatybilności wstecznej jeśli używasz 1 urządzenia:
1. Sklonuj repozytorium:
   ```bash
   git clone <repo_url>
   cd checkit_system
   ```
2. Uruchom skrypt instalacyjny:
   ```bash
   chmod +x install_client.sh # Traktuj RPi jako Klienta z lokalną bazą
   ./install_client.sh
   ```
3. Skonfiguruj `config.yaml` (opcjonalnie).

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
