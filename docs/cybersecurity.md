# CheckIT - Bezpieczeństwo i Architektura (CyberSec)

Wdrożenia zorientowane na cyberbezpieczeństwo (np. konferencje IT i meetupy) wymagają solidnych zabezpieczeń, by uniknąć prób hacking'u fizycznych modułów jak i serwerów głównych.

## 1. Architektura Sieciowa i Tunele VPN (WireGuard)
- Maszyna Raspberry Pi nie zostawia otwartych portów do publicznego wejścia, nawet w sieci lokalnej (LAN). 
- Zestawiono autoryzowany tunel **WireGuard** pomiędzy Raspberry Pi (IP VPN: `10.66.66.2`) a serwerem VPS (IP VPN: `10.66.66.1`).
- Wykorzystując ukrytą pulę adresów IP w tunelu, chronimy endpointy do raportowania statusu sprzętu (Man-in-the-Middle mitigation w zewnętrznych sieciach WiFi).

## 2. Nginx Reverse Proxy i Cloudflare Tunnel
- Aplikacja hostowana natywnie używa **Nginx Reverse Proxy**, wystawiając ruch na domeny:
  - Frontend (Aplikacja): `https://sparklublin.it/`
  - Backend (Rest API): `https://api.sparklublin.it/`
- Zestawiono **Cloudflare Tunnel**, ukrywający prawdziwy adres IP serwera VPS z chroniący przed atakami DDoS, aby aplikacja była bezpiecznie dostępna publicznie przez eventowe WiFi.
- **Blokada Krytycznych Endpointów**: Z poziomu proxy zewnętrzne zapytania do endpointów administracyjnych oraz sprzętowych:
  - `/admin`
  - `/api/v1/agent/sync`
  zostały wycięte (zablokowane). Dostanie się do nich jest możliwe wyłącznie przez sieć wewnętrzną / tunel WireGuard na VPS.

## 2. Mechanika Autoryzacji (JWT z Poziomem Uprawnień)
- API platformy rozróżnia zwykłych użytkowników (graczy trybu Kiosk) oraz administratorów platformy. 
- Tryb gracza nie pozwala na decydowanie o stawkach, parametrach ucieczki punktów, wyciąganiu bazy danych innych uczestników czy ręcznym otwieraniu elektrozamka pomijając sprzętowe i softwareowe weryfikacje. 
- Role są weryfikowane na każdej z krytycznych końcówek z użyciem tokenów odświeżających (Bearer Token na nagłówku `Authorization`). Administracja serwuje tokeny krótko-żyjące, do momentu wylogowania lub rotacji sekretu na REST API.

## 3. Zabezpieczenia Konfiguracji Backendowej
- Aplikacja posiada wbudowany plik `simple_config.py` przechowujący zasady gry (Safe Defaults). Błędy użytkownika wprowadzane nadmiarowo w trakcie tworzenia złych paczek YAML na dysku nie doprowadzą aplikacji do awarii.
- Wykorzystana architektura **nie ufa danym dostarczonym z klienta**. Weryfikacja zwycięstwa w Patch Master na frontendzie służy tylko renderowaniu UI; właściwe walidacje i zaliczenie zwycięstwa wykonywane są względem powiadomień rzędu fizycznych portów, tak iż spreparowane żądanie API typu wyślij nagle `10000 pkt` nie zadziała bez wcześniejszego stanu sygnału `PATCH_PANEL_SOLVED` potwierdzonego na backendzie.
