# 🚀 TriSense – AI-Powered Accessibility Assistant

TriSense is an AI-driven accessibility application designed to empower individuals with **visual, hearing, and cognitive disabilities** by converting complex digital information into accessible, easy-to-understand formats.

The platform integrates **three intelligent assistance modules**, powered by **Android Native Speech-to-Text** and **Gemini AI**, delivering real-time accessibility support in education, communication, and daily tasks.

---

## ⭐ Features Overview

### 🔵 Blind Assistance
- Text-to-speech reading for PDFs, images, and documents  
- Image-to-description AI vision  
- Scene and object explanation  

### 🟢 Hearing Assistance
- Real-time speech‑to‑text captions  
- Powered by **Native Android STT** (low latency, offline-capable)  
- Partial + final transcript streaming  

### 🟣 Cognitive Assistance
- Text simplification  
- Summarization  
- Task breakdowns / step-by-step guides  
- Routine & reminder assistance  
- Powered by **Gemini 2.5 Flash API**  

---

## 🎯 Why TriSense?

Millions struggle with:
- Expensive assistive tools  
- Poor accessibility in digital platforms  
- Difficult-to-understand text  
- Lack of real-time audio transcription  

TriSense creates a **unified accessibility tool**, reducing dependency on multiple apps and delivering:
- 🔹 Digital independence  
- 🔹 Better communication  
- 🔹 Enhanced learning  
- 🔹 More confidence in navigating daily life  

---

## 🛠 Tech Stack

| Layer | Technology |
|------|------------|
| Frontend | React Native + Expo |
| AI | Gemini 2.5 Flash |
| Hearing Assistance | Native Android SpeechRecognizer (Kotlin) |
| Build System | Yarn |
| Routing | Expo Router |
| OS Support | Android (iOS coming soon) |

---

## 📦 Installation (Yarn)

### 1️⃣ Install dependencies
```bash
yarn install

2️⃣ Start development server
yarn expo start

3️⃣ Run on Android device or emulator
yarn expo run:android

🔧 Android Native Module (SpeechModule)
TriSense includes a custom Kotlin SpeechRecognizer module for:

Partial live transcription

Final transcription

Error codes

Real-time microphone state

Make sure your AndroidManifest.xml contains:
<uses-permission android:name="android.permission.RECORD_AUDIO" />

🔑 Environment Variables
Create .env in your project root:
GEMINI_API_KEY=your_api_key_here

🤝 Contributing
Contributions are welcome!
Feel free to fork the repo and make a pull request.

📜 License
MIT License © 2025  Amogh S Y 
