FROM python:3.12-slim

ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1

# Install essential system dependencies (libcairo for reportlab/charts, tesseract for receipt OCR)
RUN apt-get update && apt-get install -y \
    curl \
    build-essential \
    libpq-dev \
    libcairo2 \
    pkg-config \
    tesseract-ocr \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Install Python backend dependencies
COPY backend/requirements.txt backend/
RUN cd backend && pip install --no-cache-dir -r requirements.txt

# Copy all project files
COPY . .

# Hugging Face Spaces port
EXPOSE 7860

# Start Django app
CMD ["bash", "-c", "cd backend && python manage.py migrate && exec python manage.py runserver 0.0.0.0:7860 --insecure"]

