import os
from dotenv import load_dotenv
from groq import Groq

load_dotenv('.env')
client = Groq(api_key=os.getenv('GROQ_API_KEY'))

try:
    chat_completion = client.chat.completions.create(
        messages=[
            {
                "role": "user",
                "content": "Say hello",
            }
        ],
        model="openai/gpt-oss-120b",
    )
    print(chat_completion.choices[0].message.content)
except Exception as e:
    print(f"FAILED: {e}")
