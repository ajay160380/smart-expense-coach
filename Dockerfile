FROM python:3.12-slim

ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1

# Install essential system dependencies (libcairo for reportlab/charts, tesseract for receipt OCR), plus Supervisor, Node.js and Puppeteer deps
RUN apt-get update && apt-get install -y \
    curl \
    build-essential \
    libpq-dev \
    libcairo2-dev \
    pkg-config \
    tesseract-ocr \
    supervisor \
    libnss3 \
    libnspr4 \
    libatk1.0-0 \
    libatk-bridge2.0-0 \
    libcups2 \
    libdrm2 \
    libxkbcommon0 \
    libxcomposite1 \
    libxdamage1 \
    libxfixes3 \
    libxrandr2 \
    libgbm1 \
    libasound2 \
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

# Copy the rest of the application
COPY --chown=user . .
RUN chmod +x start.sh

# Expose port (Render sets PORT env var)
EXPOSE 7860
EXPOSE 8000
EXPOSE 10000

# Start script decides what to run based on PLATFORM env var
CMD ["./start.sh"]
