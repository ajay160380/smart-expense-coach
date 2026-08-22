import os
import sys

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
from a2wsgi import WSGIMiddleware

# Hugging Face ZeroGPU detection
try:
    import spaces
    @spaces.GPU
    def gpu_status():
        return "ZeroGPU Active"
except Exception:
    def gpu_status():
        return "CPU Active"

# Gradio Interface for Hugging Face ZeroGPU compliance
with gr.Blocks(title="Paisa Mitra Status") as demo:
    gr.Markdown("### Paisa Mitra Backend Status")
    status_btn = gr.Button("Check Hardware")
    output = gr.Textbox(label="Status")
    status_btn.click(fn=gpu_status, outputs=output)

# Convert Django WSGI to ASGI
django_asgi_app = WSGIMiddleware(django_wsgi_app)

# Mount Gradio onto Django ASGI app
app = gr.mount_gradio_app(django_asgi_app, demo, path="/_gradio")

if __name__ == "__main__":
    import uvicorn
    print("🚀 Starting Production Server on 0.0.0.0:7860...", flush=True)
    uvicorn.run(app, host="0.0.0.0", port=7860, log_level="info")
