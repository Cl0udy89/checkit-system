#!/bin/bash
set -e

# Nazwa projektu — z nazwy folderu (bez hardcodu)
PROJECT_NAME=$(basename "$(pwd)")
TIMESTAMP=$(date +%Y-%m-%d_%H-%M-%S)
BACKUP_DIR="./db_backups"
DB_FILE="./db_data/checkit.db"

echo "========================================"
echo "  Aktualizacja systemu: $PROJECT_NAME"
echo "========================================"

# 1. Kopia zapasowa bazy danych
echo ""
echo "1. Kopia zapasowa bazy danych..."
mkdir -p "$BACKUP_DIR"
if [ -f "$DB_FILE" ]; then
    cp "$DB_FILE" "$BACKUP_DIR/${PROJECT_NAME}_$TIMESTAMP.db"
    echo "   Backup zapisany: $BACKUP_DIR/${PROJECT_NAME}_$TIMESTAMP.db"
else
    echo "   Brak pliku bazy danych — pomijam backup."
fi

# 2. Pobranie najnowszego kodu
echo ""
echo "2. Pobieranie najnowszego kodu (git pull)..."
git pull

# 3. Przebudowa kontenerów
echo ""
echo "3. Przebudowywanie i uruchamianie kontenerów..."
if [ ! -f ".env" ]; then
    cp .env.example .env
fi
docker compose down
docker compose build --no-cache
docker compose up -d

echo ""
echo "========================================"
echo "Aktualizacja zakonczona!"
echo "Backup: $BACKUP_DIR/${PROJECT_NAME}_$TIMESTAMP.db"
echo "========================================"
