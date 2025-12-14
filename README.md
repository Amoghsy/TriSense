🌐 TriSense – AI‑Powered Accessibility Assistant
TriSense is an AI‑driven accessibility application designed to empower individuals with visual, hearing, and cognitive disabilities by transforming complex digital information into simple, accessible formats.

Through intelligent multimodal support—document reading, real‑time speech captioning, task guidance, and content simplification—TriSense reduces barriers that millions face when accessing education, digital content, and everyday information.

✨ Features
👁️ Blind Assistance
Text‑to‑speech reading for PDFs, documents, and long text

Visual scene description (AI‑powered)

Image understanding for education & navigation

👂 Hearing Assistance
Real‑time Speech‑to‑Text using native Android STT (SpeechRecognizer API)

Live caption bar

Audio alerts converted into visual notifications

🧠 Cognitive Assistance
Simplified explanations for students

Step‑by‑step instructional breakdowns

Task reminders and routine management

Gemini AI–powered summarization & text clarity improvement

🤖 AI Chatbot (Gemini 2.5 Flash)
Clear, concise responses suited for accessibility

Adaptive conversation style for deaf / blind / cognitive‑disabled users

Context‑aware assistance

🚀 Tech Stack
Layer	Technology
Frontend	React Native (Expo)
Speech‑to‑Text	Native Android: SpeechRecognizer, Kotlin module
AI Model	Google Gemini 2.5 Flash
Routing	Expo Router
Platform	Android / iOS (iOS STT coming soon)
📲 Installation & Setup
1️⃣ Clone the Repository
git clone https://github.com/yourusername/TriSense.git
cd TriSense
2️⃣ Install Dependencies
npm install
3️⃣ Add Gemini API Key
Create .env (or use app.json config):

GEMINI_API_KEY=your_key_here
4️⃣ Run the App
npx expo run:android
NOTE: Native STT works only with a Development Build, not Expo Go.

🧩 Project Structure
TriSense/
│── app/
│   ├── index.tsx               # AI Chatbot & Main Screen
│   ├── blind/                  # Blind assistance module
│   ├── hearing/                # Hearing STT module
│   ├── cognitive/              # Cognitive assistant
│
│── android/
│   └── SpeechModule.kt         # Native Android STT
│
│── components/                 # UI components
│── assets/                     # Images, icons
│── README.md
🔧 Native Speech Module (Android)
TriSense uses a custom Kotlin module:

SpeechRecognizer

Partial transcription support

Error handling & status events

Real‑time caption streaming

Integrated using:

NativeModules.SpeechModule.startListening()
NativeModules.SpeechModule.stopListening()
🎯 Purpose & Impact
People with disabilities often cannot access:

Study materials

Online resources

Job‑related content

Everyday information

TriSense solves this by providing:

Low‑cost accessibility

AI‑powered understanding

Real‑time communication support

Inclusive digital access

This promotes autonomy, education access, and independent living.

🗺️ Roadmap
 Offline STT

 Sign‑language avatar (ISL/ASL)

 Cross‑platform iOS STT

 Real‑time audio event detection (baby cry, alarms, vehicles)

 Image‑to‑Braille Mode

🤝 Contributing
Contributions are welcome!
Feel free to fork the repo and make a pull request.

📜 License
MIT License © 2025  Amogh S Y 

🧡 Acknowledgements
Google Gemini API

Expo & React Native

Android SpeechRecognizer API
