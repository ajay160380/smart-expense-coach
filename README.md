---
title: Paisa Mitra
emoji: 💰
colorFrom: green
colorTo: blue
sdk: docker
pinned: false
---
# 💸 PaisaMitra — Smart Expense Coach

![Django](https://img.shields.io/badge/Django-6.0.4-092e20?style=for-the-badge&logo=django)
![Python](https://img.shields.io/badge/Python-3.12-3776ab?style=for-the-badge&logo=python)
![Node.js](https://img.shields.io/badge/Node.js-20-339933?style=for-the-badge&logo=node.js)
![Status](https://img.shields.io/badge/Status-Production-brightgreen?style=for-the-badge)
---
**🚀 Live Demo:** [https://ajay160380-paisa-mitra.hf.space](https://ajay160380-paisa-mitra.hf.space)

A premium AI-powered personal finance tracker with **WhatsApp integration**. Track expenses via WhatsApp messages, get AI-powered spending insights, and manage your finances with a beautiful dark-themed dashboard.

---

## ✨ Features

| Feature | Status | Description |
| :--- | :---: | :--- |
| **WhatsApp Bot** | ✅ | Track expenses by sending messages like "500 petrol" |
| **AI Chat (PaisaMitra)** | ✅ | Groq LLM-powered financial coach with Hinglish support |
| **Voice Expense** | ✅ | Speech-to-expense via browser microphone |
| **Smart Alerts** | ✅ | Budget warnings, spending spikes, category dominance |
| **Daily Tips** | ✅ | Personalized money-saving tips via WhatsApp (8 AM IST) |
| **Savings Goals** | ✅ | Set & track savings targets with progress tracking |
| **Expense Splits** | ✅ | Split bills with friends, auto-calculate settlements |
| **Monthly Comparison** | ✅ | Compare spending with previous month |
| **Gamification** | ✅ | XP, levels, streaks, badges, and quests |
| **Analytics Dashboard** | ✅ | Charts, heatmaps, category breakdowns |
| **CSV/JSON Export** | ✅ | One-click transaction history download |
| **Subscription Engine** | ✅ | Auto-deducts recurring bills on billing dates |

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

## 📌 Author

**Ajay Vishwakarma**
- 🎓 B.Tech CSE (AI) — Babu Banarasi Das University (BBDU)
- 🌐 [Portfolio](https://ajay-portfolio-r176.onrender.com)
- 🐙 [GitHub](https://github.com/ajay160380)

Built with ❤️ using Django & AI.
