<div align="center">
  <img src="backend/tracker/static/tracker/images/icon.png" alt="Paisa Mitra Logo" width="120" height="120" style="border-radius: 20px; box-shadow: 0 10px 25px rgba(0,0,0,0.2);">
  
  <h1>Smart Expense Coach (Paisa Mitra) 💸🤖</h1>
  <p><strong>Your AI-Powered Personal Finance Assistant & WhatsApp Bot</strong></p>

  [![Visit Website](https://img.shields.io/badge/🌐%20Visit%20Website-blue?style=for-the-badge)](https://smart-expense-coach.onrender.com)
  [![License](https://img.shields.io/badge/License-MIT-green?style=for-the-badge)](#)
  [![Python](https://img.shields.io/badge/Python-3.11-blue?style=for-the-badge&logo=python)](https://python.org)
  [![Django](https://img.shields.io/badge/Django-5.0-success?style=for-the-badge&logo=django)](https://djangoproject.com)
  [![Baileys](https://img.shields.io/badge/Baileys-WhatsApp_Bot-25D366?style=for-the-badge&logo=whatsapp)](#)
</div>

---

## 🌟 Overview

**Smart Expense Coach** (also known as Paisa Mitra) is a modern, AI-powered expense tracking ecosystem. Unlike traditional apps where you have to manually enter data, Paisa Mitra lets you track your expenses entirely via **WhatsApp** using natural language (e.g., *"Maine aaj ₹150 ka pizza khaya"*). 

The system uses **Groq AI (Llama 3.1)** to intelligently parse your message, categorize the expense, and save it to your dashboard. It also features a beautiful React Native mobile app and a comprehensive web dashboard!

---

## ✨ Key Features

- 💬 **WhatsApp Bot Integration:** Powered by the ultra-lightweight `@whiskeysockets/baileys` library. Talk to the bot normally to add expenses!
- 🧠 **Groq AI Processing:** Understands natural Hindi/Hinglish/English via the blazing-fast `llama-3.1-70b-versatile` model.
- 📱 **React Native Mobile App:** A sleek, modern app (Expo) with dark mode, animations, and a seamless UI.
- 📊 **Web Dashboard:** A Django-powered interface to visualize spending, check budgets, and export data.
- 🔔 **Smart Push Notifications:** Automated morning/night reminders and custom admin push notifications directly to WhatsApp and the Mobile App.
- 💾 **Neon PostgreSQL:** Fast, serverless database for robust cloud storage.

---

## 🏗️ Architecture

- **Backend:** Django, Django REST Framework, Gunicorn, PostgreSQL.
- **AI Engine:** Groq API (`llama-3.1-70b-versatile`).
- **WhatsApp Bot:** Node.js, Express, `@whiskeysockets/baileys` (runs alongside Django in a single Docker container via Supervisord).
- **Mobile App:** React Native, Expo, React Navigation, Reanimated.
- **Hosting:** Render (Free Tier - 512MB RAM Optimized).

---

## 🚀 Live Demo

**Web Dashboard:** [https://smart-expense-coach.onrender.com](https://smart-expense-coach.onrender.com)

*(Note: Since this is hosted on a free tier, it may take 30-50 seconds to wake up if inactive).*

---

## 🛠️ Local Setup Instructions

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

## 🤝 Contributing

Contributions, issues, and feature requests are welcome! 
Feel free to check [issues page](#).

## 📝 License

This project is open-source and available under the [MIT License](LICENSE).
