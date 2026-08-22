import os
import sys

# 1. Django Environment Setup
backend_dir = os.path.join(os.path.dirname(__file__), "backend")
sys.path.insert(0, backend_dir)
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'expense_project.settings')

import django
django.setup()

from django.core.management import call_command
try:
    print("🚀 Running Django migrations...", flush=True)
    call_command('migrate', interactive=False)
except Exception as e:
    print(f"Migration notice: {e}", flush=True)

from expense_project.wsgi import application as django_wsgi_app

import gradio as gr
from fastapi import FastAPI
from a2wsgi import WSGIMiddleware

# 2. Hugging Face ZeroGPU compatibility
try:
    import spaces
    @spaces.GPU(duration=20)
    def probe_zerogpu():
        return "⚡ ZeroGPU Hardware Active & Operational"
except Exception:
    def probe_zerogpu():
        return "CPU Fallback Active"

# 3. Gradio Interface (ZeroGPU Compliant)
with gr.Blocks(title="Paisa Mitra — AI Expense Coach") as demo:
    gr.Markdown("# 💸 Paisa Mitra — AI Expense Coach")
    gr.Markdown("ZeroGPU Backend Server is running smoothly.")
    with gr.Row():
        btn = gr.Button("⚡ Probe ZeroGPU Hardware", variant="primary")
        out = gr.Textbox(label="Status", value="Ready")
    btn.click(fn=probe_zerogpu, outputs=out)

# 4. Create FastAPI Root Application
app = FastAPI(title="Paisa Mitra")

# Mount Gradio onto /_gradio path
app = gr.mount_gradio_app(app, demo, path="/_gradio")

# Mount Django WSGI onto root "/" (handles all Django views, admin, and APIs)
app.mount("/", WSGIMiddleware(django_wsgi_app))

if __name__ == "__main__":
    import uvicorn
    # Hugging Face ZeroGPU proxy uses GRADIO_SERVER_PORT / PORT dynamically
    port = int(os.environ.get("GRADIO_SERVER_PORT", os.environ.get("PORT", 7860)))
    print(f"🚀 Starting Production Server on 0.0.0.0:{port}...", flush=True)
    uvicorn.run(app, host="0.0.0.0", port=port, log_level="info")
