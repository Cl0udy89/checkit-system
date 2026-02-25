#!/bin/bash
echo "========================================"
echo "  Aktualizacja systemu CheckIT (Docker) "
echo "========================================"

echo ""
echo "1. Pobieranie najnowszego kodu (git pull)..."
git pull

echo ""
echo "2. Przebudowywanie i uruchamianie kontenerów..."
docker compose up -d --build

echo ""
echo "========================================"
echo "✅ Aktualizacja zakończona pomyślnie!"
echo "System działa na najnowszej wersji."
echo "========================================"
