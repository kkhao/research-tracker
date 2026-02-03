# 后端 Dockerfile（部署于仓库根目录时使用）
FROM python:3.11-slim

WORKDIR /app

COPY research-tracker/backend/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY research-tracker/backend/ .

EXPOSE 8000
CMD uvicorn main:app --host 0.0.0.0 --port ${PORT:-8000}
