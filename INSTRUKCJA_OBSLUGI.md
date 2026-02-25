# Instrukcja Obsługi i Wdrażania CheckIT

Witamy w systemie weryfikacji i gry CheckIT! Poniżej znajdziesz kompletny przewodnik, jak uruchomić system na serwerze i Raspberry Pi oraz jak obsługiwać moduł sprzętowy (Patch Master).

---

## 🏗️ 1. Wdrażanie Systemu

System składa się z dwóch głównych środowisk: Serwera (Główna Baza Danych i Frontend) oraz Node'a Sprzętowego (Raspberry Pi dla gry Patch Master).

### A. Konfiguracja Serwera Głównego (PC/Linux)

## 1️⃣ Wymagania

Na serwerze musi być zainstalowane:

* Docker
* Docker Compose (v2, czyli `docker compose`)
* Git (opcjonalnie, do aktualizacji kodu)

Sprawdzenie:

```bash
docker --version
docker compose version
```

---

## 2️⃣ Konfiguracja środowiska

W katalogu głównym projektu:

```bash
cp .env.example .env
```

W pliku `.env` ustaw:

```env
VITE_API_BASE=/api
CHECKIT_NODE_ID=checkit-server-01
CHECKIT_PLATFORM_ROLE=server
CHECKIT_ADMIN_USER=admin
CHECKIT_ADMIN_PASS=twoje_silne_haslo
```

Opcjonalnie edytuj `config.yaml`, jeśli chcesz nadpisać domyślne ustawienia gry lub synchronizacji.

---

## 3️⃣ Uruchomienie całego stacku

Z katalogu głównego projektu:

```bash
docker compose up -d --build
```

To uruchomi:

* ✅ Backend (FastAPI)
* ✅ Frontend (zbudowany przez Vite)
* ✅ Nginx jako reverse proxy
* ✅ Wewnętrzną sieć Dockera (bez wystawiania backendu na świat)

---

## 4️⃣ Dostęp do aplikacji

Aplikacja będzie dostępna pod:

```
http://ADRES_SERWERA:8080
```

### Publiczne endpointy:

* `/` → frontend (gry)
* `/health`
* `/content/*`
* `/api/...` (publiczne endpointy graczy)

### Tylko VPN:

* `/admin` (panel administratora – frontend)
* `/api/v1/admin/*`
* `/api/v1/agent/sync`

Backend **nie jest wystawiony bezpośrednio na port 8000**.
Dostęp odbywa się wyłącznie przez nginx.

---

## 5️⃣ Aktualizacja systemu

```bash
git pull
docker compose up -d --build
```

---

## 6️⃣ Sprawdzenie statusu

```bash
docker compose ps
docker compose logs -f
```

Backend nie ma publicznego portu.
Admin UI i agent są chronione przez VPN (na poziomie nginx).

### B. Konfiguracja Raspberry Pi (Patch Master)

Stanowisko Patch Master działa jako **lokalny agent sprzętowy** (FastAPI + Uvicorn), uruchamiany jako usługa systemd. Raspberry Pi powinno mieć system oparty na Debianie (Raspberry Pi OS).

#### 1. Instalacja zależności

```bash
sudo apt update
sudo apt install -y python3 python3-venv python3-dev gcc swig liblgpio-dev
```

#### 2. Środowisko Python

```bash
cd backend
python3 -m venv venv
source venv/bin/activate
pip install --upgrade pip
pip install rpi-lgpio
pip install -r requirements-core.txt
```

Upewnij się, że w katalogu głównym projektu istnieje `config.yaml`.

---

#### 3. Uruchamianie jako usługa (zalecane)

Agent działa jako usługa `checkit-rpi.service` (systemd):

```bash
sudo systemctl daemon-reload
sudo systemctl enable --now checkit-rpi.service
```

Status:

```bash
systemctl status checkit-rpi.service
```

Logi:

```bash
journalctl -u checkit-rpi.service -f
```

Po starcie Raspberry Pi synchronizuje się z serwerem i pokazuje status `ONLINE` w panelu Administratora w zakładce **Hardware**.

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
