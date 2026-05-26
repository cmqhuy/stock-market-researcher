# Omega Terminal Developer & AI Reference Guide

Welcome to Omega Terminal. This document is a comprehensive guide to the project's codebase, architecture, design patterns, and coding conventions. It is designed to help both human developers and AI coding agents ramp up and work efficiently on this codebase.

---

## 1. Project Overview & Tech Stack

Omega Terminal is an AI-driven market research dashboard that provides real-time stock quotes, financial news RSS feeds, and simulated/live AI-powered roundtable analysis.

### Core Stack
- **Framework**: React (TypeScript) + Vite
- **Styling**: Vanilla CSS (located in [index.css](file:///d:/OneDrive/Documents/Projects/stock-market-researcher/src/index.css)). **No Tailwind CSS** is used in this project.
- **Icons**: Lucide React (`lucide-react`)
- **Deployment**: Automatic deploys to GitHub Pages via GitHub Actions (triggered by pushing to the `main` branch).
- **APIs**:
  - **Stock Price Data**: Real-time quotes and 7-day historical prices from Yahoo Finance Chart API (`query1.finance.yahoo.com`) via a client-side CORS proxy.
  - **Financial News**: Yahoo Finance RSS headlines feed (`finance.yahoo.com/rss/headline`) via CORS proxy.
  - **AI Analysis**: Google Gemini 2.5 Flash API with Google Search grounding enabled.

### Useful Commands (Windows PowerShell)
- **Start Local Dev Server**: `npm.cmd run dev`
- **Verify Production Build**: `npm.cmd run build` (always run this to check for TypeScript errors before committing)
- **Clean dist Directory**: `npm.cmd run clean`

---

## 2. Codebase Map & File Responsibilities

### Directory Structure

```text
src/
├── types/                     # Shared TypeScript interfaces & types
│   ├── index.ts               # Global export boundaries
│   ├── models.ts              # Core domain models (StockQuote, NewsArticle, etc.)
│   ├── ai.ts                  # AI-specific roundtable & prediction models
│   └── services.ts            # Service interfaces (IStockService, INewsService, IAIService)
├── services/                  # Business logic services (Single Responsibility Principle)
│   ├── stock/
│   │   ├── index.ts           # StockService: queries Yahoo Finance, handles previous close logic
│   │   └── tickerMapper.ts    # Map stock ticker symbols to company names
│   ├── news/
│   │   ├── index.ts           # NewsService: queries RSS feeds via CORS proxy, handles XML parsing
│   │   └── parser.ts          # Helpers for scrubbing HTML descriptions & formatting RSS dates
│   ├── ai/
│   │   ├── index.ts           # AIService: orchestrates Gemini API calls, retries, JSON sanitization
│   │   ├── promptBuilder.ts   # Prompt composition & strict output schema instructions
│   │   └── logger.ts          # GeminiLogger: tracks in-flight/completed requests in localStorage
│   └── mock/
│       └── index.ts           # Seed-based mock generators for Demo mode simulation
├── hooks/                     # Custom hooks orchestrating state & background polling
│   ├── useAppSettings.ts      # Settings state (API Key, Demo vs Live Mode) with localStorage sync
│   ├── useWatchlist.ts        # Watchlist logic, price updates, and 15s background polling
│   ├── useMarketAnalysis.ts   # Global macro overview fetcher & 12-hour memory cache
│   ├── useStockAnalysis.ts    # Per-ticker stock analysis orchestrator & background loader
│   └── useErrorModal.ts       # Centralized rate-limiting / error notification hook
├── components/                # React presentation components
│   ├── Navbar.tsx             # Upper navigation with status badges and request logger panel
│   ├── WatchlistPanel.tsx     # Left sidebar watchlist with drag-and-drop & sparklines
│   ├── SettingsPanel.tsx      # Modal settings panel (Execution mode toggle & API key input)
│   ├── MarketOverview.tsx     # Global market forecast and headline accordion
│   ├── StockAnalysisDetail.tsx# Per-stock roundtable card layout & headline accordion
│   └── LoadingPanel.tsx       # Localized skeletons/loaders for individual widgets
├── App.tsx                    # Main layout shell (coordinates hooks & panels)
└── main.tsx                   # Vite bootstrap entrypoint
```

---

## 3. Core Architectural Patterns

### 1. Separation of Concerns & Clean Boundary Interfaces
- React components do not make network calls or direct API requests. They read state from custom hooks.
- Hooks delegate heavy data fetching and business calculations to stateless services in `src/services/` using the interfaces defined in `src/types/services.ts`.
- Stock and News service calls never contain fallback mock code inside their implementation files. If the network or parsing fails, they throw exceptions. The calling hook catches the errors and falls back gracefully to `mock` representations.

### 2. Multi-Tiered Performance in Demo Mode
- In **Demo Mode** (or Live Mode with a missing API key), the application **skips all requests to the Gemini API** to prevent quota depletion.
- Watchlist quotes and headline RSS feeds are still fetched from Yahoo Finance in Demo Mode to show real prices and real news.
- Projections and roundtable commentaries are simulated locally based on the real RSS headlines, bypassing Google Gemini completely.
- A simulated watchlist is updated at a 15-second background interval with minor price variations to keep the interface looking "alive".

### 3. Concurrent Background Requests & Abort Control
- Each stock ticker in [useStockAnalysis.ts](file:///d:/OneDrive/Documents/Projects/stock-market-researcher/src/hooks/useStockAnalysis.ts) has its own `AbortController`.
- When a user navigates from Stock A to Stock B, the request for Stock A is **not** aborted; it continues loading in the background and populates the cache when complete.
- Stale requests are only cancelled if:
  - A duplicate request for the *same* ticker is initiated.
  - The API key or execution mode is changed in the Settings panel.
  - The component unmounts.
- Background error suppression: If a background request fails (e.g., rate limited) while the user is looking at a different stock, the error dialog is suppressed to avoid breaking the user's flow.

### 4. Session-Cached Analysis (12-Hour TTL)
- To minimize Gemini API costs, analysis outputs are cached in memory (React state) per session.
- Cached items expire after 12 hours (`12 * 60 * 60 * 1000` ms), prompting a fresh fetch (`trigger: expired`).
- Navigating back to an already-loaded ticker triggers **zero** new requests unless a manual refresh is requested or the cache has expired.
- Cache trigger states are explicitly tracked: `expired`, `no-cache`, `mode-changed`, `key-changed`, and `manual-refresh`.

### 5. Vanilla CSS & Styling Conventions
- The project styling is entirely managed in `src/index.css`.
- Variables defined in `:root` control key aesthetics:
  - `--up-color` (#10b981) for bullish stance and positive daily trends.
  - `--down-color` (#ef4444) for bearish stance and negative trends.
  - `--unchanged-color` (#f59e0b) for flat or neutral stances.
  - Glassmorphic panels are built using `.glass-panel`, leveraging CSS variables like `--panel-bg`, `--panel-border`, and `backdrop-filter: blur(12px)`.
- Interactive features use visual indicators (e.g. `.watchlist-drop-indicator` for drag-and-drop insertion lines) with entrance micro-animations to feel premium.

---

## 4. AI Coding Agent Guidelines & Coding Standards

This codebase has specific guidelines that AI coding agents must follow when modifying the code:

1. **Operating System and Shell Command Syntax**:
   - The developer environment is Windows.
   - Do **NOT** use `&&` to chain commands in terminal invocations. Always use `;` (semicolon) as the separator.
   - When calling Node CLI commands, use executable names with extensions where appropriate (e.g., `npm.cmd` instead of `npm`, `npx.cmd` instead of `npx`).
2. **Build and Compilation Checks**:
   - Before completing any task, always compile the project using `npm.cmd run build` to catch TypeScript and Vite bundler compilation errors.
3. **Aesthetic Excellence and Premium UI**:
   - The user interface must feel state-of-the-art and visually outstanding. Use harmonized gradients, translucent panels, and smooth micro-animations.
   - Avoid generic browser color defaults. Use established CSS variables.
   - Do **not** use placeholders for user interfaces or graphics; keep all layouts fully implemented.
4. **Maintenance of Documentation & Logs**:
   - Maintain the `localStorage` logger (`GeminiLogger`) instrumentation correctly.
   - Keep log structures and window console utilities intact (`window.geminiLog`).

---

## 5. Gemini API Integration

Documentation for how this project uses the Google Gemini API, including architecture, request patterns, caching, rate limit handling, and debugging tools.

---

### Overview

Omega Terminal uses **Gemini 2.5 Flash** with **Google Search grounding** to power AI-driven market analysis. Every analysis call fetches live news, sends it to Gemini in a single structured prompt, and receives a consolidated JSON response containing:

- Per-article roundtable analysis (4 AI agents: momentum, value, macro, sentiment)
- A 14-day market/stock prediction (stance, confidence, key drivers, main risks)
- AI-discovered news via Google Search grounding

---

### Architecture

```
useMarketAnalysis / useStockAnalysis   (React hooks)
        │
        ├── newsService.fetchLatestNews()          (real RSS headlines)
        │
        └── AIService.analyzeNewsAndPredict()      (src/services/ai/index.ts)
                │
                ├── GeminiLogger.begin()           (structured request log)
                ├── buildRoundtablePrompt()        (src/services/ai/promptBuilder.ts)
                ├── generateContentWithRetry()     (single attempt, no retries)
                └── GeminiLogger.success/error/aborted()
```

### Key Files

| File | Responsibility |
|---|---|
| `src/services/ai/index.ts` | `AIService` class — sends requests, manages pending list |
| `src/services/ai/promptBuilder.ts` | Builds the roundtable JSON prompt |
| `src/services/ai/logger.ts` | `GeminiLogger` — structured audit log for every request |
| `src/hooks/useMarketAnalysis.ts` | Triggers global market analysis |
| `src/hooks/useStockAnalysis.ts` | Triggers per-ticker stock analysis |

---

### Request Lifecycle

1. **Hook decides to fetch** — based on cache TTL (12 hours), mode change, or manual refresh
2. **Trigger reason is recorded** — `expired`, `no-cache`, `mode-changed`, `key-changed`, `manual-refresh`
3. **`GeminiLogger.begin()`** — logs callsite, type, ticker, trigger, article count, start timestamp
4. **News is fetched** from live RSS (Yahoo Finance / Google News via CORS proxy)
5. **Prompt is built** via `buildRoundtablePrompt()` — articles + ticker context → JSON schema
6. **`generateContentWithRetry()`** — single attempt (no retries on 429)
7. **Response parsed** — JSON extracted, defaults applied defensively
8. **`GeminiLogger.success/error/aborted()`** — duration and status recorded
9. **Result cached** in React state with a timestamp

---

### Caching

Analysis results are cached **in-memory per session** (React state) with a **12-hour TTL**.

| Trigger | Refetch? |
|---|---|
| Navigate to a ticker with cached data | ❌ No — shows cached data immediately |
| Cache older than 12 hours | ✅ Yes — `trigger: expired` |
| Mode changed (Demo ↔ Live) | ✅ Yes — `trigger: mode-changed` |
| API key changed | ✅ Yes — `trigger: key-changed` |
| Manual "Refresh Analysis" click | ✅ Yes — `trigger: manual-refresh` |

> **Note:** Cache is not persisted to `localStorage` — a page reload clears all analysis data and triggers fresh requests.

---

### Rate Limit Handling

- **No automatic retries.** A `429 Too Many Requests` error fails immediately and is logged as `status: error`.
- An error dialog is shown to the user when rate limited.
- To avoid flooding the API:
  - Navigating between already-cached tickers makes **zero** new requests
  - Each ticker has its own `AbortController` — navigating away does not cancel in-flight requests for other tickers (they complete in the background and populate the cache)
  - Duplicate in-flight requests for the same ticker are de-duplicated via `inFlightRef`

---

### Request Logger

Every Gemini request is recorded in `localStorage` under the key `omega_gemini_log`, capped at **500 entries** (ring buffer).

#### Log Entry Fields

| Field | Type | Description |
|---|---|---|
| `id` | `string` | Unique request ID |
| `callsite` | `useMarketAnalysis \| useStockAnalysis \| manual` | Which hook fired the request |
| `type` | `market-overview \| stock-analysis` | Query category |
| `ticker` | `string` | Uppercase ticker symbol or `MARKET` |
| `trigger` | `string` | Why the request was fired (see table above) |
| `articleCount` | `number` | News articles sent in the prompt |
| `startedAt` | `string` | ISO timestamp when the request started |
| `endedAt` | `string \| null` | ISO timestamp when finished (null if pending) |
| `durationMs` | `number \| null` | Wall-clock duration in ms |
| `status` | `pending \| success \| error \| aborted` | Final status |
| `attempts` | `number` | Number of send attempts (≥2 means retries occurred) |
| `error` | `string \| null` | Error message if `status === 'error'` |

#### Viewing the Log

**In the UI:** Click the **"N Session Requests"** badge in the navbar (Live AI Mode only) to see the last 20 requests with trigger, duration, retry count, and errors. Use the **Copy All** button to export to clipboard.

**In the browser console:**

```js
geminiLog()              // pretty-print all entries
geminiLog('AAPL')        // filter by ticker
geminiLog('expired')     // filter by trigger reason
geminiLog('error')       // filter by status
geminiLog('MARKET')      // show market overview requests only
geminiLog.clear()        // wipe localStorage log
geminiLog.all()          // return raw array of all entries
```

---

### Model Configuration

```ts
model: 'gemini-2.5-flash'
tools: [{ googleSearch: {} }]   // Google Search grounding enabled
```

- `responseMimeType: 'application/json'` is **not** set when search grounding is enabled (Gemini requirement — grounded models return plain text with embedded JSON)
- The response is stripped of markdown code fences if present, then parsed as JSON

---

### Prompt Structure

The prompt is built in `src/services/ai/promptBuilder.ts`. It instructs Gemini to act as four AI analyst agents and produce a strict JSON schema:

```json
{
  "newsAnalyses": {
    "<articleId>": {
      "articleId": "string",
      "consensusStance": "up | down | unchanged",
      "consensusConfidence": 0–100,
      "reasoning": "string",
      "agentAnalyses": [ ... ]
    }
  },
  "prediction": {
    "stance": "up | down | unchanged",
    "confidence": 0–100,
    "summary": "string",
    "keyDrivers": ["string", "string", "string"],
    "mainRisks": ["string", "string", "string"]
  },
  "aiDiscoveredNews": [ ... ]
}
```

---

### Live vs Demo Mode

| | Live Mode | Demo Mode |
|---|---|---|
| Gemini API | ✅ Called | ❌ Not called |
| News fetching | ✅ Real RSS | ✅ Real RSS (best-effort) |
| Analysis data | Real AI output | `src/services/mock/index.ts` |
| API key required | ✅ Yes | ❌ No |
| Cache TTL | 12 hours | 12 hours |
