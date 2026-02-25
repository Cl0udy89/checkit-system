# Uruchamianie Systemu CHECK_IT w Tle (Supervisor)

Ten dokument opisuje, w jaki sposób uruchomić podzespoły backendowe oraz frontendowe w tzw. "tle" produkcyjnym na komputerze docelowym (serwerze Raspberry Pi / maszynie głównej), wykorzystując polecane potężne narzędzie `supervisor`. Pozwala ono nie tylko na uniknięcie wyłączenia systemu po zamknięciu okna terminala, ale też dba by serwisy **zawsze wstawały z reebotem systemu i ponawiały próby wpadnięcia po wyrzuceniu błędu (auto-restart)**.

## Szybka instalacja ⚡

W głównym folderze projektu (CheckIT) stworzyliśmy specjalny plik instalacyjny.
Musi być odpalony jako root (Z prawami administratora `sudo`):
1. Dopisz mu uprawnienia skryptu wykonywalnego (tylko raz):
   ```bash
   chmod +x setup_supervisor.sh
   ```
2. Uruchom skrypt instalatora i nadzorcy z `sudo`:
   ```bash
   sudo ./setup_supervisor.sh
   ```

Skrypt automatycznie pobierze z `apt` paczkę Supervisora (jeśli jej nie masz) następnie skopiuje konfigurację (`checkit_supervisor.conf`) z Twojego kodu wprost do systemowego centrum dowodzenia w Linuksie `/etc/supervisor/conf.d/`. Ostatecznie system przeładuje pliki i natychmiast wrzuci Back&Front na dwa nowe procesy-duchy utrzymujące Twoje porty.

Gotowe! Stoisko od teraz jest kuloodporne i wstanie po podłączeniu zasilania do malinki.

---

## 🛠 Zarządzanie (Komendy Supervisorctl)

Zarówno Front (Vue/React z Vite) jak i Backend (Fastapi Uvicorn) działają pod rygorystycznym nadzorem. Oto jak się do nich dotknąć:

**By sprawdzić, czy aplikacje działają bez trudu (Pokaże Ci np. RUNNING (pid 1032) uptime 0:02:11):**
```bash
sudo supervisorctl status
```
**Chcę zrestartować Frontend bo nie wczytało moich zmian:**
```bash
sudo supervisorctl restart checkit_frontend
```
**Chcę wyłączyć Hardware Backend (aby np. sprawdzić manualnie rurę pod terminal):**
```bash
sudo supervisorctl stop checkit_backend
```
**Chcę odpalić ponownie rozłączony Backend:**
```bash
sudo supervisorctl start checkit_backend
```

---

## 🕵️‍♂️ Podgląd na żywo (Live Logs)

Gdy system działa "w cieniu" pod rootem, nie widzimy printów z konsoli (np kto się loguje w pythonie ani czy kabel zapalił log w grze, czy backend rzuca 500 błędów SQLitowych).

Użyj specjalnego wbudowanego streamingu od supervisora by patrzeć na żywo na pliki `.log` wydalane przez nasze appki:

**Chcę czytać konsolę Backendową:**
```bash
sudo supervisorctl tail -f checkit_backend
```

**Chcę czytać konsolę Frontendową (zazwyczaj tu pusto pod Vitem po odpaleniu):**
```bash
sudo supervisorctl tail -f checkit_frontend
```

💡 *Żeby zakończyć podgląd tak zebranych logów wpisujemy standardowe `CTRL+C`. Przerwie to tylko "podgląd ekranu i tekstu". Serwis wciąż bez zawahania zostaje odpalony przez demona maszyny.*
