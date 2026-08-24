FROM python:3.12-slim

ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1

# Install essential system dependencies (libcairo for reportlab/charts, tesseract for receipt OCR), plus Supervisor and Node.js
RUN apt-get update && apt-get install -y \
    curl \
    build-essential \
    libpq-dev \
    libcairo2-dev \
    pkg-config \
    tesseract-ocr \
    supervisor \
    && curl -fsSL https://deb.nodesource.com/setup_20.x | bash - \
    && apt-get install -y nodejs \
    && rm -rf /var/lib/apt/lists/*

# Hugging Face standard non-root user (UID 1000)
RUN useradd -m -u 1000 user
USER user
ENV HOME=/home/user \
    PATH=/home/user/.local/bin:$PATH

WORKDIR $HOME/app

# Install Python backend dependencies
COPY --chown=user backend/requirements.txt backend/
RUN cd backend && pip install --no-cache-dir --user -r requirements.txt

# Install Node.js whatsapp_bot dependencies
COPY --chown=user whatsapp_bot/package*.json whatsapp_bot/
RUN cd whatsapp_bot && npm install

# Copy all project files
COPY --chown=user . $HOME/app

# Port
EXPOSE 7860

# Start Supervisor (which runs both Django and WhatsApp Bot 24/7)
CMD ["supervisord", "-c", "supervisord.conf"]

