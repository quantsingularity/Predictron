# Build context is the repo root. /app inside this image plays the same
# role as code/ai_services/ does in the source tree — model_training/ and
# inference_api/ keep the same relative nesting, which matters because
# routers/price_direction.py locates the trained model by walking up from
# its own file path (parents[2] == this "ai_services" root).

FROM python:3.12-slim
WORKDIR /app

COPY code/ai_services/inference_api/requirements.txt ./requirements.txt
RUN pip install --no-cache-dir -r requirements.txt

COPY code/ai_services/model_training ./model_training
COPY code/ai_services/inference_api ./inference_api

WORKDIR /app/inference_api
EXPOSE 8000
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
