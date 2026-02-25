#!/bin/bash
echo "Zatrzymywanie CheckIT..."

screen -S checkit_backend -X quit 2>/dev/null
screen -S checkit_frontend -X quit 2>/dev/null

echo "Sesje zakończone pomyślnie."
