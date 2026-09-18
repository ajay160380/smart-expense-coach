<div align="center">
  <img src="backend/tracker/static/tracker/images/icon.png" alt="Paisa Mitra Logo" width="120" height="120" style="border-radius: 20px; box-shadow: 0 10px 25px rgba(0,0,0,0.2);">

  <h1> Smart Expense Tracker 💸🤖</h1>
  <p><strong>Your AI-Powered Personal Finance Assistant & WhatsApp Bot</strong></p>

  [![Visit Website](https://img.shields.io/badge/🌐%20Visit%20Website-blue?style=for-the-badge)](https://smart-expense-coach.onrender.com)
  [![License](https://img.shields.io/badge/License-MIT-green?style=for-the-badge)](#-license)
  [![Python](https://img.shields.io/badge/Python-3.11-blue?style=for-the-badge&logo=python&logoColor=white)](https://python.org)
  [![Django](https://img.shields.io/badge/Django-5.0-success?style=for-the-badge&logo=django&logoColor=white)](https://djangoproject.com)
  [![Baileys](https://img.shields.io/badge/Baileys-WhatsApp_Bot-25D366?style=for-the-badge&logo=whatsapp&logoColor=white)](#)

  <br/>

  ![Stars](https://img.shields.io/github/stars/ajay160380/smart-expense-coach?style=social)
  ![Forks](https://img.shields.io/github/forks/ajay160380/smart-expense-coach?style=social)
  ![Last Commit](https://img.shields.io/github/last-commit/ajay160380/smart-expense-coach?color=blue)
  ![Repo Size](https://img.shields.io/github/repo-size/ajay160380/smart-expense-coach?color=orange)
  ![Issues](https://img.shields.io/github/issues/ajay160380/smart-expense-coach?color=red)
</div>

---

## 📑 Table of Contents

<table>
<tr>
<td valign="top" width="50%">

- 🌟 [Overview](#-overview)
- ✨ [Key Features](#-key-features)
- 🏗 [Architecture](#-architecture)
- 🔄 [How It Works](#-how-it-works)
- 🛠 [Tech Stack](#-tech-stack)
- 🚀 [Live Demo](#-live-demo)

</td>
<td valign="top" width="50%">

- ⚙ [Local Setup](#-local-setup-instructions)
- 📱 [Mobile App Setup](#-mobile-app-setup)
- 🗺 [Roadmap](#-roadmap)
- 🤝 [Contributing](#-contributing)
- 📝 [License](#-license)

</td>
</tr>
</table>

---

## 🌟 Overview

**Smart Expense Coach** (also known as **Paisa Mitra**) is a modern, AI-powered expense tracking ecosystem. Unlike traditional apps where you have to manually enter data, Paisa Mitra lets you track your expenses entirely via **WhatsApp** using natural language (e.g., *"Maine aaj ₹150 ka pizza khaya"*).

The system uses **Groq AI (Llama 3.1)** to intelligently parse your message, categorize the expense, and save it straight to your dashboard — no forms, no friction. It also ships with a polished React Native mobile app and a full web dashboard.

---

## ✨ Key Features

| | Feature | Description |
|---|---|---|
| 💬 | **WhatsApp Bot Integration** | Powered by the ultra-lightweight `@whiskeysockets/baileys` library. Talk to the bot normally to log expenses. |
| 🧠 | **Groq AI Processing** | Understands natural Hindi / Hinglish / English via `llama-3.1-70b-versatile`. |
| 📱 | **React Native Mobile App** | A sleek Expo app with dark mode, animations, and a seamless UI. |
| 📊 | **Web Dashboard** | Django-powered interface to visualize spending, check budgets, and export data. |
| 🔔 | **Smart Push Notifications** | Automated morning/night reminders and custom admin pushes to WhatsApp & Mobile. |
| 💾 | **Neon PostgreSQL** | Fast, serverless database for robust cloud storage. |

---

## 🏗 Architecture

```mermaid
flowchart LR
    U[📱 User on WhatsApp] -->|"Natural language message"| B["Baileys WhatsApp Bot<br/>(Node.js + Express)"]
    B -->|Raw text| G["Groq AI<br/>Llama 3.1 70B"]
    G -->|Parsed expense JSON| D["Django REST API"]
    D --> DB[("PostgreSQL<br/>Neon DB")]
    DB --> W["Web Dashboard"]
    DB --> M["React Native<br/>Mobile App"]
    D -->|Confirmation / reminders| U

    style U fill:#25D366,color:#fff,stroke:#128C7E
    style B fill:#128C7E,color:#fff
    style G fill:#F55036,color:#fff
    style D fill:#092E20,color:#fff
    style DB fill:#336791,color:#fff
    style W fill:#0C4B33,color:#fff
    style M fill:#20232A,color:#61DAFB
```

> All services run together on a single Render instance — Django + the Node bot are managed in one container via **Supervisord**.

---

## 🔄 How It Works

```mermaid
sequenceDiagram
    actor U as User
    participant W as WhatsApp Bot
    participant G as Groq AI
    participant D as Django Backend
    participant DB as PostgreSQL

    U->>W: "Maine aaj ₹150 ka pizza khaya"
    W->>G: Send message for parsing
    G-->>W: { amount: 150, category: "Food", item: "Pizza" }
    W->>D: POST /api/expenses/
    D->>DB: Save expense record
    D-->>W: 200 OK
    W-->>U: "✅ ₹150 logged under Food!"
```

---

## 🛠 Tech Stack

<div align="center">

![Django](https://img.shields.io/badge/Django-092E20?style=flat-square&logo=django&logoColor=white)
![DRF](https://img.shields.io/badge/Django_REST_Framework-A30000?style=flat-square&logo=django&logoColor=white)
![Gunicorn](https://img.shields.io/badge/Gunicorn-499848?style=flat-square&logo=gunicorn&logoColor=white)
![PostgreSQL](https://img.shields.io/badge/Neon_PostgreSQL-336791?style=flat-square&logo=postgresql&logoColor=white)
![Groq](https://img.shields.io/badge/Groq_AI-F55036?style=flat-square)
![NodeJS](https://img.shields.io/badge/Node.js-339933?style=flat-square&logo=node.js&logoColor=white)
![Baileys](https://img.shields.io/badge/Baileys-25D366?style=flat-square&logo=whatsapp&logoColor=white)
![React Native](https://img.shields.io/badge/React_Native-20232A?style=flat-square&logo=react&logoColor=61DAFB)
![Expo](https://img.shields.io/badge/Expo-000020?style=flat-square&logo=expo&logoColor=white)
![Render](https://img.shields.io/badge/Render-46E3B7?style=flat-square&logo=render&logoColor=white)

</div>

| Layer | Technology |
|---|---|
| Backend | Django, Django REST Framework, Gunicorn, PostgreSQL |
| AI Engine | Groq API (`llama-3.1-70b-versatile`) |
| WhatsApp Bot | Node.js, Express, `@whiskeysockets/baileys` (runs alongside Django via Supervisord) |
| Mobile App | React Native, Expo, React Navigation, Reanimated |
| Hosting | Render (Free Tier – 512MB RAM optimized) |

---

## 🚀 Live Demo

<div align="center">

### 👉 [**Launch Paisa Mitra**](https://smart-expense-coach.onrender.com) 👈

[![Open Web App](https://img.shields.io/badge/🌐%20Open%20Web%20App-smart--expense--coach.onrender.com-4CAF50?style=for-the-badge)](https://smart-expense-coach.onrender.com)
[![Status](https://img.shields.io/website?url=https%3A%2F%2Fsmart-expense-coach.onrender.com&up_message=live&down_message=waking%20up&style=for-the-badge)](https://smart-expense-coach.onrender.com)

⏳ *Hosted on a free tier — first load may take 30–50 seconds to wake up.*

</div>

---

## ⚙ Local Setup Instructions

### 1. Prerequisites
- Python 3.10+
- Node.js 18+
- PostgreSQL (or Neon DB)

### 2. Environment Variables (`.env`)
Create a `.env` file in the root directory:
```env
DEBUG=True
DATABASE_URL=postgres://user:pass@host/dbname
GROQ_API_KEY=gsk_your_groq_api_key
DJANGO_SECRET_KEY=your_secret_key
MY_WHATSAPP_NUMBER=919876543210@c.us
```

### 3. Run the Project
To run both the Django website and the WhatsApp Bot simultaneously using the provided `start.sh` script:

```bash
# Install Python dependencies
pip install -r requirements.txt

# Install Node dependencies for the bot
cd whatsapp_bot && npm install && cd ..

# Start everything!
chmod +x start.sh
./start.sh
```

---

## 📱 Mobile App Setup

If you want to run the React Native mobile app:
```bash
cd mobile_app
npm install
npx expo start
```
*Note: Make sure to scan the Expo QR code using the Expo Go app on your phone.*

---

## 🗺 Roadmap

- [ ] Voice-note expense logging on WhatsApp
- [ ] Monthly AI-generated spending insights & tips
- [ ] Budget alerts via push notification
- [ ] Multi-currency support
- [ ] Shared/family expense groups

---

## 🤝 Contributing

Contributions, issues, and feature requests are welcome!
Feel free to check the [issues page](https://github.com/ajay160380/smart-expense-coach/issues).

1. Fork the repo
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

---

## 📝 License

This project is open-source and available under the [MIT License](LICENSE).

<div align="center">
  <sub>Built with ❤ by <a href="https://github.com/ajay160380">Ajay</a></sub>
</div>
