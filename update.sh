#!/bin/bash
echo "========================================"
echo "  Aktualizacja systemu CheckIT (Docker) "
echo "========================================"

echo ""
echo "1. Pobieranie najnowszego kodu (git pull)..."
git pull

echo ""
echo "2. Przebudowywanie i uruchamianie kontenerów..."
# Zapobiega ostrzeżeniom o brakującym pliku .env w Docker Compose
if [ ! -f ".env" ]; then
    touch .env
fi
docker compose down
docker rm -f checkit-nginx checkit-backend >/dev/null 2>&1 || true
docker compose up -d --build --no-cache

echo ""
echo "========================================"
echo "✅ Aktualizacja zakończona pomyślnie!"
echo "System działa na najnowszej wersji."
echo "========================================"
