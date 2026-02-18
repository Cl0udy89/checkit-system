# CheckIT System - Kiosk & Hardware Control

System obsługi stoiska na wydarzenie IT "CheckIT". Aplikacja typu Kiosk/Server obsługująca 3 gry edukacyjne, sterująca fizycznym hardwarem (Patch Panel, Solenoid, LED) i wyświetlająca rankingi.

## Instalacja ("EASY MODE")

System posiada teraz **jeden skrypt startowy**, który automatycznie wykrywa środowisko, instaluje zależności i aktualizuje kod.

### 1. Pobranie i Uruchomienie

Na **KAŻDYM** urządzeniu (Serwer PC lub Raspberry Pi) wykonaj:

```bash
cd ~/checkit-system/checkit_system
git pull
chmod +x start.sh
./start.sh
```

### 2. Wybór Roli

Przy pierwszym uruchomieniu skrypt zapyta o rolę urządzenia:

1.  **SERVER** (PC/Proxmox):
    - Wybierz **1**.
    - Skrypt skonfiguruje bazę danych i API.
    - Nie będzie próbował instalować bibliotek GPIO.

2.  **CLIENT** (Raspberry Pi):
    - Wybierz **2**.
    - Skrypt skonfiguruje obsługę hardware'u.
    - Automatycznie zainstaluje biblioteki `RPi.GPIO` (jeśli wykryje RPi).

---

## Architektura Klient-Serwer

1.  **Serwer (API & DB)**:
    - Adres: np. `http://192.168.1.100:8000`
    - Panel Admina: `http://192.168.1.100:8000/docs` lub Frontend `/admin`
    - Login: `admin` / `checkit2024`

2.  **Klient (Kiosk)**:
    - Łączy się z Serwerem, aby wysyłać wyniki.
    - Aby zmienić adres Serwera, edytuj `config.yaml`:
      ```yaml
      api:
        sync_endpoint: "http://<IP_SERWERA>:8000/api/v1/logs"
      ```

---

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

## Konfiguracja Zaawansowana
Plik `config.yaml` jest teraz **opcjonalny**. Jeśli go usuniesz, system wstanie na "Bezpiecznych Domyślnych" ustawieniach.
Możesz go wygenerować ponownie kopiując `config-server.example.yaml` lub `config-client.example.yaml`.

## Zarządzanie Treścią
Pliki contentu znajdują się w folderze `/content`:
- `/content/binary_brain/questions.csv`
- `/content/it_match/questions.csv`
- `/content/*/images/*.jpg`

Edycja CSV możliwa w Excelu/Notatniku. Nie zmieniaj nazw kolumn!
