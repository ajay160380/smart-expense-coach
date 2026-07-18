---
title: Expense Tracker
emoji: 💰
colorFrom: green
colorTo: blue
sdk: docker
pinned: false
---

# 💸 ExpenseTracker — Smart Expense Coach

![Django](https://img.shields.io/badge/Django-6.0.4-092e20?style=for-the-badge&logo=django)
![Python](https://img.shields.io/badge/Python-3.12-3776ab?style=for-the-badge&logo=python)
![Node.js](https://img.shields.io/badge/Node.js-20-339933?style=for-the-badge&logo=node.js)
![Status](https://img.shields.io/badge/Status-Production-brightgreen?style=for-the-badge)
![License](https://img.shields.io/badge/License-All%20Rights%20Reserved-red?style=for-the-badge)

---

## 🌐 Live Website

Visit the live website here:

**🔗 https://ajay160380-paisa-mitra.hf.space**

Or simply click below:

[![Visit Website](https://img.shields.io/badge/🌐%20Visit%20Website-yellow?style=for-the-badge&logo=huggingface)](https://ajay160380-paisa-mitra.hf.space)

---

<p align="center">
A premium AI-powered personal finance tracker with <b>WhatsApp integration</b>.<br/>
Track expenses via WhatsApp messages, get AI-powered spending insights, and manage your finances with a beautiful dark-themed dashboard.
</p>

<p align="center">
  <img src="https://img.shields.io/badge/💬_WhatsApp_Native-25D366?style=flat-square&logoColor=white" />
  <img src="https://img.shields.io/badge/🤖_AI_Powered-Groq_Llama_3.1-orange?style=flat-square" />
  <img src="https://img.shields.io/badge/🎮_Gamified-XP_%7C_Streaks_%7C_Badges-purple?style=flat-square" />
  <img src="https://img.shields.io/badge/🗣️_Hinglish_Support-blue?style=flat-square" />
</p>

---

## ✨ Features

### 💬 WhatsApp & AI Core
| Feature | Description |
| :--- | :--- |
| 🤖 **WhatsApp Bot** | Track expenses by sending messages like *"500 petrol"* |
| 🧠 **AI Chat Coach** | Groq LLM-powered financial coach with Hinglish support |
| 🎙️ **Voice Expense** | Speech-to-expense via browser microphone |
| ☀️ **Daily Tips** | Personalized money-saving tips via WhatsApp (8 AM IST) |

### 📊 Money Management
| Feature | Description |
| :--- | :--- |
| 🚨 **Smart Alerts** | Budget warnings, spending spikes, category dominance |
| 🎯 **Savings Goals** | Set & track savings targets with progress tracking |
| 🤝 **Expense Splits** | Split bills with friends, auto-calculate settlements |
| 📅 **Monthly Comparison** | Compare spending with previous month |
| 🔁 **Subscription Engine** | Auto-deducts recurring bills on billing dates |

### 🎮 Engagement & Insights
| Feature | Description |
| :--- | :--- |
| 🏆 **Gamification** | XP, levels, streaks, badges, and quests |
| 📈 **Analytics Dashboard** | Charts, heatmaps, category breakdowns |
| 📤 **CSV/JSON Export** | One-click transaction history download |

---

## 🏗️ System Architecture

```mermaid
flowchart TD
    A[User on WhatsApp] -->|Sends message: '500 petrol'| B[WhatsApp Bot<br/>whatsapp-web.js + Puppeteer]
    B --> C[Django REST API]
    C --> D[Groq LLM<br/>Llama 3.1 8B Instant]
    D -->|Parsed expense + insight| C
    C --> E[(PostgreSQL<br/>Neon DB)]
    C --> F[Analytics Engine]
    F --> G[Dashboard<br/>Charts • Heatmaps • Trends]
    C --> H[Daily Tips Scheduler<br/>8 AM IST]
    H --> B
    C --> I[Subscription Engine<br/>Auto-deduct recurring bills]
    E --> F
```

**Flow summary:**
1. User sends an expense message on WhatsApp (e.g. "500 petrol").
2. The bot forwards it to the Django backend.
3. Groq LLM parses the message into structured expense data and generates coaching insights.
4. Data is stored in PostgreSQL and reflected instantly on the analytics dashboard.
5. A scheduler sends daily money-saving tips back through WhatsApp every morning.

---

## 📊 Data Flow — Expense Lifecycle

```mermaid
sequenceDiagram
    participant U as User
    participant W as WhatsApp Bot
    participant D as Django Backend
    participant AI as Groq AI
    participant DB as PostgreSQL

    U->>W: "500 petrol"
    W->>D: Forward message
    D->>AI: Parse + categorize expense
    AI-->>D: {amount: 500, category: "fuel"}
    D->>DB: Save transaction
    D->>W: Confirmation + smart tip
    W-->>U: "✅ ₹500 logged under Fuel. You're 20% over budget this week."
```

---

## 🛠️ Tech Stack

- **Backend:** Django 6.0, Django REST Framework
- **AI:** Groq API (Llama 3.1 8B Instant)
- **WhatsApp:** whatsapp-web.js + Puppeteer
- **Database:** PostgreSQL (Neon)
- **Deployment:** Docker + Supervisor on HuggingFace Spaces

---

## 🚀 Local Setup

```bash
# 1. Clone
git clone https://github.com/ajay160380/-smart-expense-coach.git
cd -smart-expense-coach

# 2. Python setup
python3 -m venv env && source env/bin/activate
pip install -r requirements.txt

# 3. Node setup (for WhatsApp bot)
npm install

# 4. Environment variables
cp .env.example .env  # Edit with your keys

# 5. Database
python manage.py migrate

# 6. Run Django
python manage.py runserver

# 7. Run WhatsApp bot (separate terminal)
node bot.js
```

---

## 📄 License

This project is protected under a **proprietary, all-rights-reserved license** — see [LICENSE](LICENSE) for full terms.

> ⚠️ Viewing this repository does **not** grant permission to copy, modify, redistribute, or reuse this code — in whole or in part, with or without changes — in any personal, academic, or commercial project. This repository is shared publicly **for portfolio and evaluation purposes only**.

For collaboration or usage requests, contact the author directly.

---

## 📌 Author

**Ajay Vishwakarma**
- 🎓 B.Tech CSE (AI) — Babu Banarasi Das University (BBDU)
- 🌐 [Portfolio](https://ajay-portfolio-r176.onrender.com)
- 🐙 [GitHub](https://github.com/ajay160380)

Built with ❤️ using Django & AI.
