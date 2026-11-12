import os
import multiprocessing

# ══════════════════════════════════════════════════════════════════════════════
# GUNICORN PRODUCTION CONFIGURATION — HIGH CONCURRENCY & ZERO LATENCY
# ══════════════════════════════════════════════════════════════════════════════

bind = f"0.0.0.0:{os.environ.get('PORT', '8000')}"

# Multi-threaded worker setup: 2 workers x 4 threads = 8 concurrent request slots
# This eliminates head-of-line blocking on Render free tier
workers = int(os.environ.get('WEB_CONCURRENCY', '2'))
threads = int(os.environ.get('GUNICORN_THREADS', '4'))
worker_class = "gthread"

# Connection reuse & HTTP keep-alive
keepalive = 65
timeout = 120
graceful_timeout = 30

# Memory management & leak prevention
max_requests = 2000
max_requests_jitter = 200

# Use in-memory tmp dir for heartbeat to avoid disk I/O bottlenecks
if os.path.exists('/dev/shm'):
    worker_tmp_dir = '/dev/shm'

# Logging
accesslog = "-"
errorlog = "-"
loglevel = "info"

