# Instrukcja Obsługi i Wdrażania CheckIT

Witamy w systemie weryfikacji i gry CheckIT! Poniżej znajdziesz kompletny przewodnik, jak uruchomić system na serwerze i Raspberry Pi oraz jak obsługiwać moduł sprzętowy (Patch Master).

---

## 🏗️ 1. Wdrażanie Systemu

System składa się z dwóch głównych środowisk: Serwera (Główna Baza Danych i Frontend) oraz Node'a Sprzętowego (Raspberry Pi dla gry Patch Master).

### A. Konfiguracja Serwera Głównego (PC/Linux)

1. **Baza Danych i Backend:**
   - Przejdź do folderu `backend`.
   - Stwórz środowisko wirtualne: `python -m venv venv`
   - Aktywuj środowisko: `source venv/bin/activate` (lub `venv\Scripts\activate` na Windows).
   - Zainstaluj zależności z pliku requirements.txt: `pip install -r requirements.txt`
   - Uruchom backend (domyślnie port 8000):
     ```bash
     uvicorn app.main:app --host 0.0.0.0 --port 8000
     ```

2. **Frontend (Dashboard, Gry i Panel Administratora):**
   - Środowisko deweloperskie wymaga zainstalowanego Node.js.
   - Przejdź do folderu `frontend`.
   - Zainstaluj pakiety: `npm install`
   - Uruchom aplikację na żywo: `npm run dev` (lub `npm run preview` po zrobieniu `npm run build`).
   - Upewnij się, że komputer lub telefon gracza jest w tej samej sieci by uzyskać dostęp.

### B. Konfiguracja Raspberry Pi (Patch Master)

Stanowisko Patch Master wymaga Raspberry Pi z zainstalowanym systemem operacyjnym opartym na Debianie (Raspbian O/S). Posiada zapinane fizyczne porty GPIO do kabli i taśmę LED WS281x.

1. **Przygotowanie Raspberry Pi:**
   - Pobierz kod źródłowy na malinę.
   - Zainstaluj Python i wirtualne środowisko, tak samo jak na serwerze. Dodatkowo potrzebujesz bibliotek z rootem (rpi_ws281x):
     ```bash
     sudo pip install rpi_ws281x RPi.GPIO
     ```

2. **Uruchamianie Skryptu RPi:**
   - Aby Raspberry Pi mogło sterować taśmą LED za pomocą protokołu PWM, **MUSI** być uruchomione z uprawnieniami administratora (`sudo`).
   - Przejdź do foldera `backend` na Raspberry Pi.
   - Uruchom instancję:
     ```bash
     sudo venv/bin/python -m uvicorn app.main:app --host 0.0.0.0 --port 8000
     ```
   - *Raspberry Pi automatycznie połączy się z serwerem i pokaże swój status `ONLINE` w panelu Admina w zakładce Hardware.*

---

## 🎮 2. Jak obsługiwać grę "Patch Master" w trakcie zawodów

Mechanika polega na ścisłym zarządzaniu pojedynczym stanowiskiem (zapobieganie kłótniom o to, kto teraz gra).

### Rejestracja i Kolejka:
1. Gracze logują się na swoich telefonach i widzą "DASHBOARD".
2. Po wejściu w **PATCH MASTER**, klikają **DOŁĄCZ DO KOLEJKI**.
3. Widzą na swoim telefonie "JESTEŚ #1, #2..." w kolejce. Dołączanie do kolejki jest wyłączone dla już grających.

### Przebieg Gry (Widok Administratora):
Administrator systemu powinien mieć otwarty Panel (`/admin`) na tablecie lub komputerze przy stanowisku RPi.
1. Administrator w panelu zjeżdża w dół do sekcji **"Kontrola Stanowiska Patch Master"**.
2. Klika przycisk **[WEZWIJ NASTĘPNEGO]**.
3. Gracz będący pierwszy na liście otrzymuje informację, że **nadeszła jego kolej!** - Zmienia mu się ekran.

### Przebieg Gry (Kolej Gracza):
1. Gracz wezwany podchodzi do stanowiska. Na telefonie klika wielki przycisk **[START GRY]**.
2. Odliczanie zaczyna się od `10 000 pkt (60 sekund)`. Im szybciej połączy kable, tym więcej pkt dostanie.
3. Kable muszą łączyć prawidłowe gniazda. Raspberry Pi skanuje piny i w ułamku sekundy zapala odpowiednią diodę na zielono dla prawidłowego połączenia.
4. Gdy wszystkie 8 złączy świeci na zielono, Hardware System sam przerywa czas, zapisuje wynik i wyświetla status wygranej.

### Kary i Przerywanie Czasu (Porażka / Timeout):
1. Jeśli stoper na telefonie gracza **dobije do zera**, a kable nie są podpięte, system **uznaje to za porażkę**.
2. Telefon informuje gracza o końcu czasu, a **stacja Raspberry Pi mruga na czerwono agresywnie przez 5 sekund**, a następnie staje się stała czerwona.
3. Gracz otrzymuje `0` punktów do puli ogólnej.

### Reset przed następnym graczem:
Zanim Administrator wezwie *"Następnego"*, musi fizycznie wypiąć kable zaplątane przez poprzedniego gracza. 
By nikt nie wszedł w tym momencie do gry, możesz użyć przycisku **[PRZERWA (RESET)]** w panelu Admina. Następnie klikasz "WEZWIJ NASTĘPNEGO" żeby kontynuować z nowym graczem w kolejce.

---
Powodzenia w przeprowadzaniu wydarzenia CheckIT!
