# 后端 Dockerfile（构建上下文为仓库根目录时，backend 在 research-tracker/ 下）
FROM python:3.11-slim

WORKDIR /app

COPY research-tracker/backend/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY research-tracker/backend/ .

EXPOSE 8000
CMD uvicorn main:app --host 0.0.0.0 --port ${PORT:-8000}
