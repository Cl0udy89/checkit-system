# CheckIT - Bezpieczeństwo i Architektura (CyberSec)

Wdrożenia zorientowane na cyberbezpieczeństwo (np. konferencje IT i meetupy) wymagają solidnych zabezpieczeń, by uniknąć prób hacking'u fizycznych modułów jak i serwerów głównych.

## 1. Architektura Opierająca się o OpenVPN
- Maszyna Raspberry Pi nie zostawia otwartych portów do publicznego wejścia, nawet w sieci lokalnej (LAN). 
- Moduł komunikuje się z serwerem centralnym korzystając z bezpiecznego, certyfikowanego połączenia (tunele OpenVPN). Weryfikacja certyfikatów po stronie serwera pozwala odrzucić jakiekolwiek polecenia z pominięciem uwierzytelnionych żądań.
- OpenVPN na Pi kieruje również ruch z `sync_endpoint` wewnętrzną, prywatną siecią. Zapewnia to odporność na ataki typu Man-in-the-Middle w publicznym WiFi na terenie wydarzenia.

## 2. Mechanika Autoryzacji (JWT z Poziomem Uprawnień)
- API platformy rozróżnia zwykłych użytkowników (graczy trybu Kiosk) oraz administratorów platformy. 
- Tryb gracza nie pozwala na decydowanie o stawkach, parametrach ucieczki punktów, wyciąganiu bazy danych innych uczestników czy ręcznym otwieraniu elektrozamka pomijając sprzętowe i softwareowe weryfikacje. 
- Role są weryfikowane na każdej z krytycznych końcówek z użyciem tokenów odświeżających (Bearer Token na nagłówku `Authorization`). Administracja serwuje tokeny krótko-żyjące, do momentu wylogowania lub rotacji sekretu na REST API.

## 3. Zabezpieczenia Konfiguracji Backendowej
- Aplikacja posiada wbudowany plik `simple_config.py` przechowujący zasady gry (Safe Defaults). Błędy użytkownika wprowadzane nadmiarowo w trakcie tworzenia złych paczek YAML na dysku nie doprowadzą aplikacji do awarii.
- Wykorzystana architektura **nie ufa danym dostarczonym z klienta**. Weryfikacja zwycięstwa w Patch Master na frontendzie służy tylko renderowaniu UI; właściwe walidacje i zaliczenie zwycięstwa wykonywane są względem powiadomień rzędu fizycznych portów, tak iż spreparowane żądanie API typu wyślij nagle `10000 pkt` nie zadziała bez wcześniejszego stanu sygnału `PATCH_PANEL_SOLVED` potwierdzonego na backendzie.
