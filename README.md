# Senior Productivity App (Elder Companion)

An all-in-one, senior-friendly productivity and companion application built with **React Native / Expo** and **FastAPI / MongoDB**. Designed with high-contrast accessibility, large readable typography, Canadian localization (Celsius, Canadian cities, Canadian news feeds), voice dictation, and an integrated AI companion.

---

## 🌟 Key Features

### 1. 📅 Day, Week & Month Planner
* High-contrast daily schedule, task manager, and reminder dashboard.
* Integrated live weather forecast widget (Open-Meteo API) with Canadian and global city presets.
* Quick-launch cards for Medication Dashboard and Emergency SOS.

### 2. 💊 Medication Reminder & Tracker (`/medications`)
* High-visibility medication schedule with time-chip reminders (morning, afternoon, evening, bedtime).
* Dosage notes, day-of-week recurrence, and custom color-coded pill tags.
* "Take / Taken" daily progress checklist keyed per device/date.

### 3. 🚨 Emergency SOS & Contacts (`/emergency`)
* One-tap direct dial to 911 or top-priority family/caregiver emergency contacts.
* GPS location sharing to send real-time coordinates during an alert.
* Priority-ranked contact directory with relationship tags.

### 4. 🎙️ Voice-to-Text Dictation
* Hands-free voice dictation available across Notepad, Planner, and Search fields.
* Powered by OpenAI Whisper STT for accurate transcriptions.

### 5. 🤖 AI Companion Assistant (`/chat`)
* Friendly, conversational AI assistant powered by **Google Gemini**.
* Multi-session history with automatic session management.

### 6. 📰 Live Canadian News Feed (`/news`)
* Clean, large-font RSS news reader from trusted sources:
  * CBC Top Stories & CBC Health
  * CTV News
  * Global News

### 7. 🧮 Senior-Friendly Large Calculator (`/calculator`)
* Large high-contrast touch targets, clear arithmetic display, and calculation history.

### 8. 🛒 Grocery List & 📝 Vibrant Notepad
* **Grocery List**: Category grouping, quick item entry, and interactive checkbox toggles.
* **Notepad**: Color-coded note cards, search, and full-screen text editor.

### 9. 👓 Accessibility & Senior-Centric Settings
* **Adjustable Font Sizes**: Small (S), Medium (M), Large (L), and Extra Large (XL) scaling across all screens.
* **Themes**: Deep Purple Dark Mode and Warm High-Contrast Light Mode.
* **Optional Account System**: The app is 100% usable without an account (anonymous device storage). Optional secure JWT registration/login allows cross-device synchronization and password recovery via 6-digit email codes.

---

## 🛠️ Architecture & Tech Stack

```
elder-prod-app/
├── backend/                  # FastAPI REST API
│   ├── server.py             # Main backend server (Auth, AI, STT, News, Emergency, Meds)
│   ├── requirements.txt      # Python dependencies
│   ├── .env.example          # Environment variables template
│   └── tests/                # Pytest test suite (Auth, Emergency, Meds)
├── frontend/                 # React Native / Expo App (Expo Router SDK 57)
│   ├── app/                  # File-based routing (tabs, auth, modal screens)
│   │   ├── (tabs)/           # Main tab screens (planner, grocery, notes, news, chat, etc.)
│   │   ├── auth/             # Login, Register, Forgot Password screens
│   │   ├── emergency.tsx     # Emergency SOS dashboard
│   │   └── medications.tsx   # Medication management screen
│   ├── components/           # Reusable UI components (WeatherWidget, DictationButton)
│   ├── context/              # Context providers (AuthContext, ThemeContext, FontSizeContext)
│   ├── utils/                # Utility helpers (deviceId, storage)
│   ├── package.json          # Node dependencies & Expo config
│   └── .env.example          # Frontend environment template
└── memory/
    └── PRD.md                # Product Requirements Document
```

### Technologies Used:
* **Frontend**: React Native, Expo 57, Expo Router, React 19, TypeScript, AsyncStorage, SecureStore.
* **Backend**: Python 3.11+, FastAPI, Uvicorn, Motor (Async MongoDB), Pydantic v2, PyJWT, Bcrypt, HTTPX, Feedparser.
* **Database**: MongoDB.
* **External APIs**: Google Gemini API, OpenAI Whisper API, Open-Meteo Weather API, RSS Feeds.

---

## 🚀 Getting Started

### Prerequisites
* **Node.js** (v18+ or v20+) & **npm**
* **Python** (3.11+)
* **MongoDB** instance running locally (`mongodb://localhost:27017`) or via MongoDB Atlas

---

### Backend Setup

1. **Navigate to the backend directory**:
   ```bash
   cd backend
   ```

2. **Create and activate a virtual environment**:
   ```bash
   python3 -m venv venv
   source venv/bin/activate
   ```

3. **Install dependencies**:
   ```bash
   pip install -r requirements.txt
   ```

4. **Configure environment variables**:
   Create a `.env` file in the `backend/` directory (or copy from `.env.example`):
   ```ini
   MONGO_URL=mongodb://localhost:27017
   DB_NAME=elder_prod_db
   JWT_SECRET=your_super_secret_jwt_key_here
   GEMINI_API_KEY=your_gemini_api_key_here
   OPENAI_API_KEY=your_openai_api_key_here
   EMAIL_FROM_NAME="Senior Productivity App"
   ```

5. **Run the backend server**:
   ```bash
   uvicorn server:app --reload --host 0.0.0.0 --port 3000
   ```
   * Interactive API documentation will be available at: `http://localhost:3000/docs`

---

### Frontend Setup

1. **Navigate to the frontend directory**:
   ```bash
   cd frontend
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Configure environment variables**:
   Create a `.env` file in the `frontend/` directory (or copy from `.env.example`):
   ```ini
   EXPO_PUBLIC_BACKEND_URL=http://localhost:3000
   ```

4. **Start the Expo development server**:
   ```bash
   npm run start
   ```

5. **Preview Options**:
   * **Web Browser**: Run `npm run web` or press `w` in the terminal to view in your desktop browser.
   * **Android Emulator**: Run `npm run android` or press `a` in the terminal.
   * **iOS Simulator (macOS)**: Run `npm run ios` or press `i` in the terminal.

---

## 🧪 Testing

### Backend Unit Tests
Run the backend test suite using `pytest`:
```bash
cd backend
pytest tests/
```

### Frontend TypeScript Verification
Verify TypeScript types without emitting build artifacts:
```bash
cd frontend
npx tsc --noEmit
```

---

## 🔒 Security & Privacy
* **Anonymous First**: Core features operate with anonymous device IDs. No mandatory account creation or tracking.
* **Secure Auth**: Passwords hashed with bcrypt; JWT session tokens with 7-day expiration; 15-minute single-use SHA-256 hashed password reset codes.
* **Local Storage Protection**: Native credentials and tokens stored securely via `expo-secure-store`.

---

## 📄 License
This project is licensed under the MIT License.
