# PRD — Senior Productivity App

## Original Problem Statement
All-in-one productivity app for seniors: Day/week/month planner, Grocery list, Calculator, Notepad, News feed (RSS). Easy on the eyes, nice CSS, interactive buttons. Canadian focus (Celsius, Canadian cities), deep purple dark mode, vibrant note colors, font size settings (S/M/L/XL), Gemini AI chat assistant.

## Tech Stack
- Frontend: Expo (expo-router, tabs), Context API (Theme, FontSize, Auth)
- Backend: FastAPI + MongoDB (Motor)
- Integrations: Gemini 2.5 Flash via emergentintegrations (user's API key), Open-Meteo weather, Emergent-managed email (password reset codes)

## Completed Features
- Tabs: Planner, Grocery, Calculator, Notes, News, Chat, Settings (local device storage for planner/notes/grocery)
- Weather widget (Canadian cities, Celsius, city picker in Settings)
- Deep purple dark mode + warm light theme
- Global font size settings (S/M/L/XL) via FontSizeContext
- Gemini AI chat with session history stored in MongoDB
- **Auth (June 2026):** Optional JWT-based accounts
  - Register / Login / Password reset with large high-contrast senior-friendly screens (app/auth/*)
  - Login is OPTIONAL — app fully usable without an account
  - Password min 6 chars, bcrypt hashing, 7-day JWT (HS256)
  - Password reset: 6-digit code (SHA-256 hashed, 15-min expiry, single-use) emailed via Emergent-managed email
  - Token storage: SecureStore (native) / localStorage (web)
  - Account section in Settings (Sign In / Create Account / Sign Out)
  - Routing restructured: screens in app/(tabs)/, root Stack layout wraps providers

- **Medication Reminder Dashboard (June 2026):**
  - High-contrast dashboard at /medications, entry via purple "Medications" card on top of Planner tab
  - Reminders: name, dosage, time chips (24h stored, 12h shown), days of week, notes, pill color tag
  - Today's Schedule with Take/Taken toggle per dose + progress card; persisted per device per date
  - Data keyed by anonymous device_id (AsyncStorage/localStorage, utils/deviceId.ts) — no login needed
  - API: GET/POST /api/medications, PUT/DELETE /api/medications/{id}, POST /api/medications/{id}/toggle-taken

## Key API Endpoints
- POST /api/auth/register, /api/auth/login, GET /api/auth/me
- POST /api/auth/forgot-password, /api/auth/reset-password
- GET/POST/DELETE /api/chat/sessions, GET /api/chat/sessions/{id}/messages, POST /api/chat/send

## DB Collections
- users {id(uuid), name, email(unique), password_hash, created_at}
- password_resets {id, user_id, code_hash, expires_at(TTL), used_at}
- medications {id(uuid), device_id, name, dosage, times[str], days[int 0=Sun], notes, color, created_at, updated_at}
- medication_taken {id, medication_id, device_id, date "YYYY-MM-DD", time, taken_at}
- chat_sessions, chat_messages

## Testing
- Backend: pytest suite /app/backend/tests/test_auth.py (13/13 pass)
- Frontend E2E: 9/9 auth flows + 7-tab regression pass (iteration_1.json)
- Test creds: /app/memory/test_credentials.md

## Backlog / Ideas
- Sync planner/notes/grocery data to backend per-user account (currently local-only)
- Verify news.tsx fetches live RSS
- Add testIDs to auth screens for test stability
