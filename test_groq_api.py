import os
import requests
import json
from dotenv import load_dotenv
load_dotenv()
api_key = os.getenv("GROQ_API_KEY")
if not api_key:
    load_dotenv("../.env")
    api_key = os.getenv("GROQ_API_KEY")

headers = {
    "Authorization": f"Bearer {api_key}",
    "Content-Type": "application/json"
}
data = {
    "model": "qwen/qwen3.6-27b",
    "messages": [{"role": "user", "content": "Hello, generate a short message."}],
    "max_tokens": 1000
}
res = requests.post("https://api.groq.com/openai/v1/chat/completions", headers=headers, json=data)
print("STATUS:", res.status_code)
print("RESPONSE:", res.text)
