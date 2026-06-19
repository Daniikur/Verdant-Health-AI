# 🌿 Verdant Health AI

An AI-powered healthcare platform built with **React**, **FastAPI**, **MongoDB**, and **Google Gemini AI**. Verdant Health AI helps patients manage appointments, medical records, chat with an AI health assistant, perform symptom analysis, and find doctors—all through a modern, responsive web application.

---

## 🚀 Features

### 👤 Authentication
- User Registration & Login
- JWT Authentication
- Secure Password Hashing (bcrypt)
- Role-Based Access
  - Patient
  - Doctor
  - Admin

### 🤖 AI Features
- AI Health Chat Assistant (Google Gemini)
- AI Symptom Checker
- AI Medical Report Summarization
- AI Doctor Recommendation

### 🩺 Patient Features
- Dashboard
- Book Appointments
- View Appointment History
- Upload Medical Records
- View Medical History
- Chat with AI Assistant

### 👨‍⚕️ Doctor Features
- Doctor Dashboard
- View Patient Appointments
- Manage Schedule
- Access Patient Records

### 🛠 Admin Features
- User Management
- Doctor Management
- Appointment Monitoring
- System Dashboard

---

# 🛠 Tech Stack

## Frontend

- React.js
- React Router
- Tailwind CSS
- Axios
- Lucide Icons
- Sonner Toast

## Backend

- FastAPI
- Python 3.10+
- MongoDB
- Motor (Async MongoDB)
- JWT Authentication
- bcrypt
- Google Gemini API

## Database

- MongoDB Atlas

---

# 📂 Project Structure

```
Verdant_healthai/
│
├── backend/
│   ├── server.py
│   ├── requirements.txt
│   ├── .env
│   └── ...
│
├── frontend/
│   ├── src/
│   ├── public/
│   ├── package.json
│   └── ...
│
└── README.md
```

---

# ⚙ Installation

## Clone the repository

```bash
git clone https://github.com/Daniikur/Verdant_healthai.git
cd Verdant_healthai
```

---

# Backend Setup

## Install Python packages

```bash
cd backend

pip install -r requirements.txt
```

Create a `.env` file:

```env
MONGO_URL=your_mongodb_connection_string

DB_NAME=healthcare_platform

JWT_SECRET=your_secret_key

JWT_ALGORITHM=HS256

JWT_EXPIRY_HOURS=168

GEMINI_API_KEY=your_gemini_api_key
```

Run the backend

```bash
uvicorn server:app --reload
```

Backend runs on

```
http://127.0.0.1:8000
```

Swagger API

```
http://127.0.0.1:8000/docs
```

---

# Frontend Setup

```bash
cd frontend

npm install
```

Create `.env`

```env
REACT_APP_BACKEND_URL=http://127.0.0.1:8000
```

Run

```bash
npm start
```

Frontend runs on

```
http://localhost:3000
```

---

# AI Integration

This project uses **Google Gemini AI** for:

- AI Chat Assistant
- Symptom Analysis
- Medical Report Summarization
- Doctor Recommendation

Get your API key:

https://aistudio.google.com/app/apikey

---

# Authentication

JWT Authentication

```
POST /api/auth/register

POST /api/auth/login

GET /api/auth/me
```

---

# API Documentation

Swagger UI

```
http://127.0.0.1:8000/docs
```

---

# Screenshots

<img width="1896" height="996" alt="image" src="https://github.com/user-attachments/assets/80f94d4b-7b27-48f2-8cb7-795c2f4d3f0c" />
<img width="1881" height="887" alt="image" src="https://github.com/user-attachments/assets/003e6f91-88c9-4ea8-be32-25caa3d18f0f" />
<img width="1882" height="982" alt="image" src="https://github.com/user-attachments/assets/56c14b7b-ea5f-4e7e-8d6a-d2f22f942293" />
<img width="1883" height="804" alt="image" src="https://github.com/user-attachments/assets/6940e6eb-07d5-41e5-b152-48498099c1b9" />


---

# Future Improvements

- Email Notifications
- Video Consultation
- Payment Integration
- OCR Medical Report Reading
- Voice AI Assistant
- Mobile Application
- Multi-language Support

---

# Security

- JWT Authentication
- Password Hashing with bcrypt
- Protected API Routes
- MongoDB Atlas
- CORS Configuration

---

# Contributors

**Kurmanzhan Daniiarbek Kyzy**

Computer Science Student

GitHub

https://github.com/Daniikur

---

# License

This project is developed for educational and portfolio purposes.

---

# ⭐ Support

If you found this project useful, please consider giving it a ⭐ on GitHub!
