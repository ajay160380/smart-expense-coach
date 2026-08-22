import os
import sys
import subprocess

if __name__ == "__main__":
    backend_dir = os.path.join(os.path.dirname(__file__), "backend")
    sys.path.insert(0, backend_dir)
    os.chdir(backend_dir)
    
    print("🚀 Running Django migrations...", flush=True)
    subprocess.run([sys.executable, "manage.py", "migrate"], check=False)
    
    print("🚀 Starting Production ASGI Server on 0.0.0.0:7860...", flush=True)
    subprocess.run([
        sys.executable, "-m", "uvicorn", 
        "expense_project.asgi:application", 
        "--host", "0.0.0.0", 
        "--port", "7860",
        "--workers", "2"
    ])
