#!/bin/bash
echo "Konfiguracja Supervisora dla systemu CHECK_IT..."

# Upewnij się, że używamy sudo jeśli potrzeba
if [ "$EUID" -ne 0 ]; then
  echo "Proszę uruchomić ten skrypt jako root (np. sudo ./setup_supervisor.sh)"
  exit 1
fi

echo "Aktualizacja repozytoriów i instalacja supervisora..."
apt-get update
apt-get install -y supervisor

echo "Kopiowanie pliku konfiguracyjnego do katalogu /etc/supervisor/conf.d/ ..."
# Zakładamy że skrypt odpalamy z głównego folderu z repo
cp checkit_supervisor.conf /etc/supervisor/conf.d/checkit.conf

echo "Przeładowywanie konfiguracji Supervisora..."
supervisorctl reread
supervisorctl update

echo "Restart usług CheckIT..."
supervisorctl restart checkit_backend
supervisorctl restart checkit_frontend

echo "================================================="
echo "✅ Instalacja zakończona sukcesem!"
echo "Status usług:"
supervisorctl status
echo "================================================="
echo "Przydatne komendy do zarządzania:"
echo "sudo supervisorctl status             - sprawdzenie co działa"
echo "sudo supervisorctl stop checkit_backend  - zatrzymanie backendu"
echo "sudo supervisorctl start checkit_frontend - uruchomienie frontardu"
echo "sudo supervisorctl tail -f checkit_backend - logi na żywo"
echo "================================================="
