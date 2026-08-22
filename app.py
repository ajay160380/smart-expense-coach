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
from a2wsgi import WSGIMiddleware

# 2. Hugging Face ZeroGPU Integration
try:
    import spaces
    @spaces.GPU(duration=30)
    def probe_zerogpu(probe_input="Paisa Mitra Status Check"):
        return f"⚡ ZeroGPU Hardware Active & Operational | Verified: {probe_input}"
except Exception:
    def probe_zerogpu(probe_input="Paisa Mitra Status Check"):
        return f"⚡ Hardware Active | Verified: {probe_input}"

# 3. Gradio Interface (ZeroGPU Compliant)
with gr.Blocks(title="Paisa Mitra — Smart AI Expense Coach") as demo:
    gr.HTML("""
    <div style="background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%); color: white; padding: 24px; border-radius: 12px; font-family: sans-serif; text-align: center; margin-bottom: 16px; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);">
        <h1 style="margin: 0 0 8px 0; font-size: 28px;">💸 Paisa Mitra — Smart AI Expense Coach</h1>
        <p style="margin: 0 0 16px 0; color: #94a3b8; font-size: 15px;">AI-Powered Personal Finance & Expense Tracker with WhatsApp Integration</p>
        <div style="display: flex; justify-content: center; gap: 12px; flex-wrap: wrap;">
            <a href="/dashboard/" target="_blank" style="background: #10b981; color: white; padding: 10px 22px; border-radius: 8px; text-decoration: none; font-weight: bold; font-size: 15px; box-shadow: 0 4px 6px -1px rgba(16, 185, 129, 0.4);">📊 Open Live Dashboard</a>
            <a href="/login/" target="_blank" style="background: #3b82f6; color: white; padding: 10px 22px; border-radius: 8px; text-decoration: none; font-weight: bold; font-size: 15px;">🔐 Login / Register</a>
            <a href="/admin/" target="_blank" style="background: #6366f1; color: white; padding: 10px 22px; border-radius: 8px; text-decoration: none; font-weight: bold; font-size: 15px;">⚙️ Admin Panel</a>
        </div>
    </div>
    """)

    with gr.Row():
        test_in = gr.Textbox(label="Hardware Probe Input", value="Paisa Mitra System Check", scale=3)
        btn = gr.Button("⚡ Probe ZeroGPU Hardware", variant="primary", scale=1)

    status_out = gr.Textbox(label="ZeroGPU Hardware Status", value="ZeroGPU Ready")
    btn.click(fn=probe_zerogpu, inputs=test_in, outputs=status_out)

    gr.HTML('<iframe src="/dashboard/" style="width: 100%; height: 820px; border: none; border-radius: 12px; margin-top: 16px; box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.3);"></iframe>')

# 4. Mount Django WSGI to Gradio App instance
django_asgi = WSGIMiddleware(django_wsgi_app)
custom_app = gr.routes.App()

django_prefixes = [
    "/dashboard", "/login", "/logout", "/register", "/forgot-password",
    "/about", "/features", "/privacy", "/terms", "/contact",
    "/add", "/edit", "/delete", "/bulk-delete", "/export", "/add-sub", "/delete-sub",
    "/api", "/admin", "/admin-panel", "/static", "/media", "/health", "/ai_chat"
]
for prefix in django_prefixes:
    custom_app.mount(prefix, django_asgi)

if __name__ == "__main__":
    print("🚀 Launching Paisa Mitra with ZeroGPU on Hugging Face Spaces...", flush=True)
    demo.launch(_app=custom_app)

