#!/bin/bash
echo "Konfiguracja Supervisora dla Raspberry Pi (CHECK_IT)..."

if [ "$EUID" -ne 0 ]; then
  echo "Proszę uruchomić ten skrypt jako root (np. sudo ./setup.sh)"
  exit 1
fi

echo "Aktualizacja repozytoriów i instalacja supervisora..."
apt-get update
apt-get install -y supervisor

echo "Kopiowanie pliku konfiguracyjnego do /etc/supervisor/conf.d/ ..."
cp checkit.conf /etc/supervisor/conf.d/checkit.conf

echo "Przeładowywanie konfiguracji Supervisora..."
supervisorctl reread
supervisorctl update
supervisorctl restart checkit_backend
supervisorctl restart checkit_frontend

echo "✅ Instalacja na Raspberry Pi zakończona sukcesem!"
supervisorctl status
