# Uruchamianie Systemu CHECK_IT w Tle (Screen)

Ten dokument opisuje, w jaki sposób uruchomić podzespoły backendowe oraz frontendowe w tzw. "tle" na komputerze docelowym (serwerze Raspberry Pi / maszynie głównej), wykorzystując linuksowe narzędzie `screen`. Pozwala to na uniknięcie wyłączenia systemu po zamknięciu okna terminala lub po ewentualnym przerwaniu połączenia SSH.

## Wymagania
Upewnij się, że narzędzie `screen` jest zainstalowane na Twoim systemie, wpisując w terminal:
`sudo apt-get install screen`

---

## 🚀 Uruchamianie (Start)

W głównym folderze projektu (CheckIT) znajduje się plik wykonywalny chroniący Twoją sesję.
1. Aby nadać mu uprawnienia do uruchamiania (Robisz to tylko raz):
   ```bash
   chmod +x start_background.sh
   chmod +x stop_background.sh
   ```
2. Uruchom skrypt startowy:
   ```bash
   ./start_background.sh
   ```

**Co się właśnie wydarzyło?**
Skrypt stworzył dwa całkowicie oddzielne i odseparowane procesy w tle. Jeden dla aplikacji w pythonie (`uvicorn`, port 8000), a drugi dla widoków (`npm run dev`, port 5173). Możesz teraz bezpiecznie zamknąć terminal, a stoisko będzie grać i buczeć.

---

## 🕵️‍♂️ Podgląd na żywo (Logs)

Gdy system działa w tle, czasami potrzebujesz zobaczyć co "wypluwa" konsola (np kto się loguje, czy zapalają się diody kabli, jaki jest błąd).
Do tego służą komendy przywracające tło na wierzch monitora:

**Podgląd Backendu (Hardware, Punkty, Baza Danych):**
```bash
screen -r checkit_backend
```

**Podgląd Frontendu (Ostrzeżenia UI z Vite):**
```bash
screen -r checkit_frontend
```

### 🚨 UWAGA: Jak wyjść z podglądu nie psując niczego?
Jeśli wejdziesz w podgląd przez `screen -r`, **NIGDY NIE KLIKAJ CTRL+C!** To by zabiło całą aplikację!
Zamiast tego używamy specjalnej kombinacji odłączania (*detach*). 

1. Naciśnij i przytrzymaj: **`CTRL + A`**
2. Puść oba klawisze.
3. Nacisnij na klawiaturze samą literkę: **`D`**

Zostaniesz wyrzucony z powrotem do czystej konsoli, a serwer backendu będzie dalej tam gdzieś wewnątrz działał w najlepsze.

---

## 🛑 Całkowite Zatrzymywanie pracy stoiska (Stop)

Klucze rozdane, światła zgaszone, zamykamy serwerownie CHECK IT!
Wejdź do głównego folderu CheckIT i wpisz jedną krótką komendę:
```bash
./stop_background.sh
```

Wszystkie poboczne wirtualne terminale z `checkit_backend` i `frontend` zostaną brutalnie "zabite", przywracając zasoby RAM Twojego Raspberry Pi. 
