FROM python:3.11-slim

WORKDIR /app

COPY requirements.txt .
RUN echo "Bust cache: 2" && pip install --no-cache-dir -r requirements.txt

COPY . .

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
