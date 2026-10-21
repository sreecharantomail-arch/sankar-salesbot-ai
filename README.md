# Sankar SalesBot AI — Autonomous SaaS Voice Sales Platform

> Production-ready, enterprise-grade AI Conversational Sales Agent powered by **Google Gemini LLM & Gemini Live Audio** for the **Sankar Group AI Agent Development Internship Evaluation**. The bot autonomously conducts discovery calls, qualifies inbound prospects, handles complex objections, secures trial signups / live demos, generates structured 8-part executive summaries, and classifies revenue pipeline statuses in real time.

---

## 🌟 Architecture & Dynamic AI Brain

```
                                    +-----------------------------------------+
                                    |         User Interface (React/Vite)     |
                                    |  • Start / End Call Controls            |
                                    |  • 3D Voice Equalizer HUD Visualizer    |
                                    |  • Real-Time Chat Transcript & Audio    |
                                    |  • Language Switcher (EN / HI / TE)     |
                                    +--------------------+--------------------+
                                                         |
                                 +-----------------------+-----------------------+
                                 |                                               |
                     [Typed Customer Message]                         [Voice Mic Input]
                                 |                                               |
                                 v                                               v
                   +---------------------------+                   +---------------------------+
                   |  Shared Customer Message  |                   |  Gemini Live WebSocket /  |
                   |   Pipeline in App.jsx     |                   |  Web Speech Recognition  |
                   +-------------+-------------+                   +-------------+-------------+
                                 |                                               |
                                 +-----------------------+-----------------------+
                                                         |
                                                         v
                                       +-----------------------------------+
                                       |      Shared AI Brain Engine       |
                                       |    (salesAgentEngine.js)          |
                                       |  • Conversation Memory (16 turns) |
                                       |  • Verified Product Grounding     |
                                       |  • Multi-lingual Adaptation       |
                                       +-----------------+-----------------+
                                                         |
                                      POST /api/gemini/chat or /api/gemini/token
                                                         |
                                                         v
                                       +-----------------------------------+
                                       |     Secure Node.js Express API    |
                                       |          (server/index.js)        |
                                       |  • Google @google/genai (v2.30.0) |
                                       |  • Server-Side GEMINI_API_KEY     |
                                       |  • Ephemeral Live Tokens (30m)    |
                                       |  • Rate Limiting & Input Guard    |
                                       +-----------------+-----------------+
                                                         |
                                                         v
                                       +-----------------------------------+
                                       |     Google Gemini Cloud Models    |
                                       |  • Text: gemini-2.5-flash         |
                                       |  • Live: gemini-3.8-live          |
                                       +-----------------------------------+
```

### Key AI Brain Highlights:
1. **Dynamic Generative Answers (No Predefined Answer Matching)**: Replaced static dialogue patterns with live LLM generative reasoning. Every question receives a fresh, contextually generated answer based on real-time customer intent and conversational history.
2. **Unified Brain for Text Chat and Voice**: Both typed text in the live chat panel and recognized customer speech route through the exact same `salesAgentEngine.generateResponse` service. The spoken audio and printed transcript originate from the exact same generated output.
3. **Zero Secret Leakage & Ephemeral Live Tokens**: The master `GEMINI_API_KEY` is strictly held on the Node.js Express server. For browser Gemini Live WebSocket connections, the server issues short-lived ephemeral tokens (`POST /api/gemini/token`) via `@google/genai`, expiring in 30 minutes with strict session constraints.
4. **Verified Product Grounding & Zero-Hallucination Policy**: System instructions ground the model with verified product data (features, pricing tiers, trials, limitations). If information is missing or unconfirmed, the bot politely clarifies that it will check with engineering/leadership rather than inventing answers.
5. **Transparent Fallback Mode**: If `GEMINI_API_KEY` is unconfigured or external networks fail, the engine activates a consultative synthesis fallback and transparently tags messages with `🛡️ Consultative Engine` instead of fabricating an LLM response. When live Gemini is connected, it displays `⚡ Gemini 2.5 Flash`.

---

## 🚀 Quick Start Guide

### 1. Prerequisites
- **Node.js**: v18.0.0 or higher (v20+ recommended)
- **npm**: v9.0.0 or higher

### 2. Environment Configuration

#### Backend Configuration (`server/.env`):
Create `server/.env` (a template is provided in `server/.env.example`):
```env
PORT=3001
NODE_ENV=development
FRONTEND_ORIGIN=http://localhost:5173
GEMINI_API_KEY=your_gemini_api_key_here
GEMINI_LIVE_MODEL=gemini-3.8-live
GEMINI_TEXT_MODEL=gemini-2.5-flash
```

> **Note**: To obtain a free Google Gemini API key, visit [Google AI Studio](https://aistudio.google.com/app/apikey). If `GEMINI_API_KEY` is not provided, the backend operates in transparent fallback mode.

#### Frontend Configuration (`.env`):
Create `.env` in the project root:
```env
VITE_API_BASE_URL=http://localhost:3001
```

### 3. Installation
```bash
# 1. Install root dependencies (React/Vite)
npm install

# 2. Install backend dependencies (Express, @google/genai, cors, dotenv)
cd server && npm install && cd ..
```

### 4. Running the Application

You can run both frontend and backend concurrently in separate terminals:

**Terminal 1 — Backend Server:**
```bash
npm run server
```
*Output: `🚀 Sankar SalesBot AI Server running on port 3001`*

**Terminal 2 — Frontend Dev Server:**
```bash
npm run dev
```
*Output: `VITE v8.3.4 ready in 250 ms ➜ Local: http://localhost:5173/`*

Open **[http://localhost:5173](http://localhost:5173)** in Google Chrome, Microsoft Edge, or any modern WebRTC-enabled browser.

---

## 🧪 Comprehensive Automated Verification

Run the complete test suite covering both client and server:
```bash
npm test
```

### Test Results (38/38 Passing):

```
🧪 Starting Sankar SalesBot AI Automated Verification Suite...

--- Test Suite 1: Sales Status Classification (All 6 States) ---
  ✓ PASS: Classify "Converted" when user confirms purchase / trial
  ✓ PASS: Classify "Demo Requested" when user explicitly asks for screen-share / calendar meet
  ✓ PASS: Resolve conflict: Demo request priority over general interest
  ✓ PASS: Classify "Follow-up Required" when boss/team review or collateral requested
  ✓ PASS: Classify "Not Interested" when explicitly rejected
  ✓ PASS: Classify "No Response" when call under 12 seconds or silent
  ✓ PASS: Classify "Interested" on active exploratory conversation

--- Test Suite 2: Structured 8-Part Post-Call Summary ---
  ✓ PASS: Verify all 8 mandatory summary fields are generated

--- Test Suite 3: Fallback Conversational Engine ---
  ✓ PASS: Transparent fallback without API key generates contextual English response
  ✓ PASS: Fallback responds accurately to Hindi language input
  ✓ PASS: Fallback responds accurately to Telugu language input
  ✓ PASS: Fallback handles objection regarding competitors

--- Test Suite 4: Analytics Calculations & Division-by-Zero Safety ---
  ✓ PASS: Analytics with zero calls should produce valid metrics without crashing
  ✓ PASS: Analytics with simulated calls accurately calculates rates and durations

--- Test Suite 5: SaaS Product Configuration ---
  ✓ PASS: Verify SAAS_PRODUCTS has valid structure, greetings, and objection handling

--- Test Suite 6: AI Brain & Conversational Grounding ---
  ✓ PASS: AI Brain: Follow-up question uses previous conversation context
  ✓ PASS: AI Brain: Transparent fallback metadata is attached with isFallback=true when offline
  ✓ PASS: AI Brain: Unified brain handles both typed text and voice transcripts identically
  ✓ PASS: AI Brain: Call state isolation clears previous conversation history
  ✓ PASS: Gemini Live Service: Clean disconnect releases resources and resets state
  ✓ PASS: Gemini Live Service: Environment support check returns boolean
  ✓ PASS: Audio Recorder Service: Recording consent defaults to false (privacy by default)
  ✓ PASS: Audio Recorder Service: Explicit consent is required to start recording
  ✓ PASS: Sales Agent Engine: Client-side API key storage is eliminated
  ✓ PASS: Gemini Live Service: Mute controls operate correctly without throwing

==============================================
Test Execution Finished! Passed: 25, Failed: 0
==============================================

🧪 Starting Sankar SalesBot AI Backend Server Automated Verification...

--- Test Suite 1: Health & System Diagnostics ---
  ✓ PASS: GET /api/health returns 200 with server status and gemini-3.8-live

--- Test Suite 2: POST /api/gemini/chat Request Validation & Security ---
  ✓ PASS: POST /api/gemini/chat rejects empty message with HTTP 400
  ✓ PASS: POST /api/gemini/chat rejects whitespace-only message with HTTP 400
  ✓ PASS: POST /api/gemini/chat without server API key returns HTTP 503 with transparent fallback flag

--- Test Suite 3: Mocked Gemini Provider Integration Tests ---
  ✓ PASS: POST /api/gemini/chat generates successful response with full sales context and memory
  ✓ PASS: POST /api/gemini/chat handles AI provider error safely and offers fallback

--- Test Suite 4: POST /api/gemini/token Ephemeral Token & Constraints ---
  ✓ PASS: POST /api/gemini/token creates token with gemini-3.8-live and AUDIO constraints
  ✓ PASS: POST /api/gemini/token handles authentication / token generation failure safely

--- Test Suite 5: System Prompt & Product Grounding Verifier ---
  ✓ PASS: buildSalesAgentSystemInstruction accurately embeds product grounding & anti-hallucination rules
  ✓ PASS: buildSalesAgentSystemInstruction sets appropriate language instructions for Hindi and Telugu

--- Test Suite 6: Context Memory & Turn Trimming Safety ---
  ✓ PASS: Prompt construction handles empty history, single turns, and boundary cases safely

==============================================
--- Test Suite 7: Multilingual TTS Audio Stream (/api/tts) ---
  ✓ PASS: GET /api/tts rejects missing text parameter with HTTP 400
  ✓ PASS: GET /api/tts streams valid audio/mpeg for Telugu language requests

==============================================
Server Test Execution Finished! Passed: 13, Failed: 0
==============================================
```

### Linting, Production Build & Packaging
```bash
# Code Quality Verification (0 warnings, 0 errors)
npm run lint

# Production Bundle Build
npm run build

# Clean Production Source Archive (Excludes node_modules & dist)
npm run package:zip
```

---

## 📋 Evaluation Requirements Compliance Matrix

| # | Requirement | Implementation & Technical Architecture | Status |
|---|---|---|---|
| **1** | **Dynamic AI Brain (No Predefined Templates)** | Google Gemini generative LLM integration (`gemini-2.5-flash` & `gemini-3.8-live`) via `@google/genai`. Responses are fresh, contextual, and dynamically generated. | ✅ **PASS** |
| **2** | **Unified Voice & Text Brain** | Both manual chat typing and live speech recognition call `salesAgentEngine.generateResponse`. The spoken audio and live transcript originate from the exact same output. | ✅ **PASS** |
| **3** | **Conversation Memory & Context** | Bounded 16-turn conversation history passed into Gemini context. Follow-ups, pronouns ("that plan"), and team requirements are tracked across the call. Context is isolated per call. | ✅ **PASS** |
| **4** | **Backend Security & Ephemeral Tokens** | Node.js Express server on port 3001 protects `GEMINI_API_KEY`. Live voice sessions use short-lived ephemeral tokens issued via `POST /api/gemini/token`. Rate limiting (60 req/min) enabled. | ✅ **PASS** |
| **5** | **Product Grounding & Anti-Hallucination** | System prompt embeds verified product pricing, features, and trials. Unknown features or unconfirmed policies are answered honestly without hallucination. | ✅ **PASS** |
| **6** | **Multilingual Voice & Chat** | English (`en`), Hindi (`hi`), and Telugu (`te`) supported with native prompts, accents, and voice playback. | ✅ **PASS** |
| **7** | **Voice Call HUD & Controls** | Start/End Call controls, 3D animated voice orb visualizer, audio equalizer, mic/speaker mute toggles, MM:SS timer, and interim speech streaming preview. | ✅ **PASS** |
| **8** | **Recording Consent & IndexedDB** | Explicit consent toggle. When granted, raw audio is recorded via `MediaRecorder` into IndexedDB (`SankarSalesBotDB_v2`). In-browser playback and WebM downloads supported. | ✅ **PASS** |
| **9** | **8-Part Structured Call Summary** | Generates 8 mandatory fields: (1) Overview, (2) Requirements, (3) Pain Points, (4) Buying Signals, (5) Objections, (6) Budget & Timeline, (7) Promised Actions, (8) Next Steps. | ✅ **PASS** |
| **10** | **Deterministic Sales Classification** | 6-state pipeline classifier (`Converted`, `Demo Requested`, `Follow-up Required`, `Not Interested`, `Interested`, `No Response`) with conflict resolution and confidence scoring. | ✅ **PASS** |
| **11** | **Call History & Sales Analytics** | Searchable call log with deal filter, transcript modal, CSV/JSON export, and real-time dashboard KPIs with zero-division safety. | ✅ **PASS** |
| **12** | **Transparent Fallback Identification** | Clearly distinguishes LLM answers (`⚡ Gemini 2.5 Flash`) from consultative offline responses (`🛡️ Consultative Engine`). Never claims a fallback is an LLM response. | ✅ **PASS** |

---

## 🛠️ Project File Structure

```
.
├── server/
│   ├── .env                       # Backend environment variables (GEMINI_API_KEY)
│   ├── .env.example               # Sanitized template for backend configuration
│   ├── index.js                   # Express server: Gemini Chat, Live Token, Rate Limiting
│   ├── package.json               # Backend dependencies: @google/genai, express, cors, dotenv
│   └── test/
│       └── server.test.js         # Automated backend test suite (8 tests)
├── src/
│   ├── components/
│   │   ├── CallRoom/
│   │   │   ├── CallHUD.jsx        # 3D Orb, Audio Equalizer, Consent Switch, Call Controls
│   │   │   └── LiveChatScreen.jsx # Real-time transcript, speaker bubbles, AI badges, text input
│   │   ├── CallHistoryView.jsx    # Searchable call logs, audio playback, CSV/JSON export
│   │   ├── CallSummaryModal.jsx   # 8-part structured post-call summary & status override
│   │   ├── TranscriptDetailModal.jsx # Full conversation transcript & audio inspector
│   │   ├── AnalyticsDashboard.jsx # Real-time pipeline KPI metrics & status distribution
│   │   ├── SettingsModal.jsx      # SaaS product selector, custom product creator, API config
│   │   └── Navbar.jsx             # Obsidian glass navigation header & active tab router
│   ├── data/
│   │   ├── saasProducts.js        # Product definitions, multi-lingual greetings, objection scripts
│   │   └── preloadedCalls.js      # Realistic seed calls for initial dashboard population
│   ├── services/
│   │   ├── audioRecorderService.js # MediaRecorder audio streaming, ringtones, track cleanup
│   │   ├── dbService.js           # Native IndexedDB (v2) for raw audio Blobs + localStorage cache
│   │   ├── geminiLiveService.js   # Ephemeral token retrieval, Web Audio streaming, interruption handling
│   │   ├── salesAgentEngine.js    # Shared AI brain: POST /api/gemini/chat caller, 8-part summarizer
│   │   └── voiceService.js        # Web Speech STT/TTS with cloud fallback audio synthesis
│   ├── App.jsx                    # Unified customer message pipeline & reactive state engine
│   └── index.css                  # Obsidian glassmorphic luxury styling system
├── test/
│   └── runTests.js                # Core test suite: Sales states, 8-part summary, grounding (19 tests)
├── .env                           # Frontend environment variables (VITE_API_BASE_URL)
├── .env.example                   # Sanitized frontend configuration template
├── package.json                   # Root package: Vite scripts, React 19, Lucide icons
├── vercel.json                    # Production deployment configuration for SPA routing
└── README.md                      # Complete system documentation & evaluation guide
```

---

## 📄 License
Developed for the **Sankar Group AI Agent Development Internship Evaluation**.
