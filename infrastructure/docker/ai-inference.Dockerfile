# Build context is the repo root; model_training/ and inference_api/ keep
# the same relative nesting as in code/ai_services/.

FROM python:3.12-slim
WORKDIR /app

COPY code/ai_services/inference_api/requirements.txt ./requirements.txt
RUN pip install --no-cache-dir -r requirements.txt

COPY code/ai_services/model_training ./model_training
COPY code/ai_services/inference_api ./inference_api

WORKDIR /app/inference_api
EXPOSE 8000
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
