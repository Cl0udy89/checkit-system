#!/bin/bash
echo "Uruchamianie CheckIT w tle (narzędzie 'screen')..."

# Sprawdź czy screen jest zainstalowany
if ! command -v screen &> /dev/null
then
    echo "Błąd: 'screen' nie jest zainstalowany. Zainstaluj go komendą: sudo apt-get install screen"
    exit 1
fi

# Zabij poprzednie sesje, jeśli istnieją
screen -S checkit_backend -X quit 2>/dev/null
screen -S checkit_frontend -X quit 2>/dev/null

echo "Uruchamianie Backendu..."
screen -dmS checkit_backend bash -c "cd backend && source venv/bin/activate && uvicorn app.main:app --host 0.0.0.0 --port 8000"

echo "Uruchamianie Frontendu (podgląd dev)..."
screen -dmS checkit_frontend bash -c "cd frontend && npm run dev -- --host 0.0.0.0"

echo ""
echo "===================================================="
echo "✅ System CheckIT działa w tle!"
echo "===================================================="
echo "Aby podglądnąć logi Backendu wpisz:  screen -r checkit_backend"
echo "Aby podglądnąć logi Frontendu wpisz: screen -r checkit_frontend"
echo ""
echo "Aby wyjść z podglądu i ZOSTAWIĆ go w tle: Wciśnij CTRL+A, a potem D"
echo "Aby zamknąć aplikacje: ./stop_background.sh"
echo "===================================================="
