FROM python:3.11-slim
WORKDIR /app
COPY ../../.. /app
RUN pip install --no-cache-dir fastapi uvicorn prometheus-client pyyaml httpx
ENV RELAY_BASE=
ENV DECISION_MODE=warn
ENV GENOME_PATH=/app/glyphs/core.yaml
EXPOSE 9495
CMD ["uvicorn","tools.antigone.server.app:app","--host","0.0.0.0","--port","9495"]
