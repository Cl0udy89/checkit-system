#!/bin/bash
set -e

PROJECT_NAME=$(basename "$(pwd)")
TIMESTAMP=$(date +%Y-%m-%d_%H-%M-%S)
BACKUP_DIR="$HOME/db_backups"

# Szukaj bazy w kolejności: produkcyjna lokalizacja, potem lokalna dev
if [ -f "$HOME/db/checkit.db" ]; then
    DB_FILE="$HOME/db/checkit.db"
elif [ -f "./db_data/checkit.db" ]; then
    DB_FILE="./db_data/checkit.db"
else
    DB_FILE=""
fi

echo "========================================"
echo "  Aktualizacja systemu: $PROJECT_NAME"
echo "========================================"

# 1. Kopia zapasowa bazy danych
echo ""
echo "1. Kopia zapasowa bazy danych..."
mkdir -p "$BACKUP_DIR"
if [ -n "$DB_FILE" ] && [ -f "$DB_FILE" ]; then
    cp "$DB_FILE" "$BACKUP_DIR/${PROJECT_NAME}_$TIMESTAMP.db"
    echo "   Backup zapisany: $BACKUP_DIR/${PROJECT_NAME}_$TIMESTAMP.db"
else
    echo "   Brak pliku bazy danych — pomijam backup."
fi

# 2. Pobranie najnowszego kodu (z zachowaniem lokalnych zmian produkcyjnych)
echo ""
echo "2. Pobieranie najnowszego kodu (git pull)..."
git stash
git pull
git stash pop || echo "   Brak lokalnych zmian do przywrocenia (stash pusty)."

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
if [ -n "$DB_FILE" ] && [ -f "$DB_FILE" ]; then
    echo "Backup: $BACKUP_DIR/${PROJECT_NAME}_$TIMESTAMP.db"
fi
echo "========================================"
