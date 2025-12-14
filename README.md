TriSense – AI‑Powered Accessibility Platform
TriSense is an AI‑powered accessibility application designed to support individuals with visual, hearing, and cognitive disabilities by converting complex digital information into accessible, easy‑to‑use formats.
It integrates Gemini AI, native Android Speech‑to‑Text, and custom accessibility modules into one unified platform.

🚀 Features
🔵 Blind Assistance
Text‑to‑speech reading for documents and on‑screen text

Visual description support using AI

Helps visually impaired users access digital material easily

🟣 Hearing Assistance
Real‑time speech‑to‑text captions

Powered by native Android STT module for fast, offline‑friendly transcription

Ideal for deaf or hard‑of‑hearing users

🟢 Cognitive Assistance
Text simplification and summarization

Routine assistance and reminder generation

Contextual explanations with Gemini AI

Helps users with cognitive load or learning difficulties

💡 Why TriSense?
People with disabilities often cannot access apps, websites, or educational content due to:

Poor accessibility design

Expensive assistive technologies

PDFs and documents that are hard to understand

Lack of real‑time assistive support

TriSense removes these barriers by offering an inclusive, AI‑driven solution that promotes independence, accessibility, and equal digital access for millions.

📱 Tech Stack
React Native + Expo

Gemini AI (Google Generative Language API)

Custom Native Android Module (SpeechRecognizer API)

File‑based routing (Expo Router)

🔧 Installation
Install dependencies

npm install
Start the app

npx expo start
You can run the project on:

Development Build

Android Emulator

iOS Simulator

Expo Go (limited support)

🛠 Rebuilding Native Android Module (Mandatory for STT)
Because TriSense uses a custom native SpeechModule, you must build a development client:

npx expo run:android
Running in Expo Go will NOT work — native modules are not available there.

Ensure android/app/src/main/java/.../SpeechModule.kt exists and is linked properly.

🔐 Environment Setup
Create .env:

GEMINI_API_KEY=your_gemini_api_key_here
📁 Project Structure
app/
  (tabs)/
    index.tsx        # Main TriSense UI + Gemini + STT integration
  speech/
    SpeechModule.kt  # Native Android STT module
🧠 AI Instructions (Context Injected)
TriSense guides AI responses to be:

Simple

Clear

Visual‑friendly

Deaf‑friendly

Actionable

This ensures accessibility across all user categories.

🧪 Reset Project (Optional)
npm run reset-project
Creates a clean project structure while keeping example files.

🌍 Community & Resources
Expo Documentation: https://docs.expo.dev

Expo Discord: https://chat.expo.dev

Gemini API Docs: https://ai.google.dev

🤝 Contributing
Contributions are welcome!
Please open an issue or submit a pull request.

📜 License
MIT License © TriSense Developers
