import os
from dotenv import load_dotenv
load_dotenv()
api_key = os.getenv("GROQ_API_KEY")
if not api_key:
    load_dotenv("../.env")
    api_key = os.getenv("GROQ_API_KEY")

from groq import Groq
client = Groq(api_key=api_key)

try:
    r = client.chat.completions.create(
        messages=[{"role": "user", "content": "Hello, generate a short message."}],
        model="llama-3.1-8b-instant",
        temperature=0.9,
        max_tokens=1000,
    )
    print("SUCCESS")
    print("CONTENT:", repr(r.choices[0].message.content))
except Exception as e:
    print("EXCEPTION:", repr(e))
