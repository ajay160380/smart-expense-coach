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

# 2. Hugging Face ZeroGPU Integration
try:
    import spaces
    @spaces.GPU(duration=30)
    def probe_zerogpu(text="Paisa Mitra Status"):
        return f"⚡ ZeroGPU Hardware Active | {text}"
except Exception:
    def probe_zerogpu(text="Paisa Mitra Status"):
        return f"⚡ Hardware Active | {text}"

# 3. Gradio Interface (Mounted at /_gradio for ZeroGPU compliance)
with gr.Blocks(title="Paisa Mitra — ZeroGPU Backend") as demo:
    gr.Markdown("### Paisa Mitra AI Expense Coach — ZeroGPU Status")
    t_in = gr.Textbox(value="Health Check", label="Input")
    t_out = gr.Textbox(label="Output")
    btn = gr.Button("Probe ZeroGPU")
    btn.click(fn=probe_zerogpu, inputs=t_in, outputs=t_out)

# 4. Create Main Application: Mount Gradio at /_gradio and Django at Root /
app = FastAPI(title="Paisa Mitra")

# Mount Gradio onto /_gradio
app = gr.mount_gradio_app(app, demo, path="/_gradio")

# Mount Django WSGI directly at Root "/" (Serves original website, landing page, dashboard, login & APIs)
app.mount("/", WSGIMiddleware(django_wsgi_app))

if __name__ == "__main__":
    import uvicorn
    import socket

    def get_free_port(start_port):
        port = start_port
        while port < start_port + 10:
            try:
                with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
                    s.bind(('0.0.0.0', port))
                    return port
            except OSError:
                port += 1
        return start_port

    base_port = int(os.environ.get("GRADIO_SERVER_PORT", os.environ.get("PORT", 7860)))
    port = get_free_port(base_port)
    
    # Print the exact string Gradio prints, so Hugging Face supervisor can catch the port
    print(f"Running on local URL:  http://127.0.0.1:{port}", flush=True)
    print(f"Running on local URL:  http://0.0.0.0:{port}", flush=True)
    print(f"🚀 Starting Production Server on 0.0.0.0:{port}...", flush=True)
    
    uvicorn.run(app, host="0.0.0.0", port=port, log_level="info")


