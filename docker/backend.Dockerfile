FROM python:3.13-slim

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1

WORKDIR /app

# (opcjonalnie) systemowe paczki pod build zależności pythona
RUN apt-get update && apt-get install -y --no-install-recommends \
      build-essential \
    && rm -rf /var/lib/apt/lists/*

# Najpierw requirements dla lepszego cache
COPY backend/requirements-core.txt /app/backend/requirements-core.txt
COPY backend/requirements-server.txt /app/backend/requirements-server.txt

RUN pip install --no-cache-dir \
      -r /app/backend/requirements-core.txt \
      -r /app/backend/requirements-server.txt

# Kod backendu
COPY backend /app/backend

# Content (statyczne obrazki) - backend je serwuje pod /content
COPY content /app/content

# Uwaga: config.yaml będzie montowany z hosta przez docker-compose
# jako /app/config.yaml (read-only), więc tu go nie kopiujemy.

WORKDIR /app/backend

EXPOSE 8000

# Produkcyjne uruchomienie (bez --reload)
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
