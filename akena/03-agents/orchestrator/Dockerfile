# Build from repo root with context: akena/03-agents
#   docker build -f akena/03-agents/orchestrator/Dockerfile -t orchestrator:local akena/03-agents
#
# PYTHONPATH=/app so `shared` resolves like local dev (parent of agent folder).

FROM python:3.12-slim-bookworm

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1 \
    PIP_DISABLE_PIP_VERSION_CHECK=1 \
    PYTHONPATH=/app \
    PORT=8080

WORKDIR /app

RUN useradd --create-home --uid 1000 appuser

COPY shared /app/shared
COPY orchestrator/requirements.txt /tmp/requirements.txt
RUN pip install --no-cache-dir -r /tmp/requirements.txt && rm /tmp/requirements.txt

COPY orchestrator/src /app/src

RUN mkdir -p /app/.memory && chown -R appuser:appuser /app
USER appuser

EXPOSE 8080

HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
    CMD python -c "import os,urllib.request; p=os.environ.get('PORT','8080'); urllib.request.urlopen(f'http://127.0.0.1:{p}/health')"

CMD ["sh", "-c", "exec python -m uvicorn src.main:app --host 0.0.0.0 --port ${PORT:-8080}"]
