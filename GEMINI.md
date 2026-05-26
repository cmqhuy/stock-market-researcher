# Gemini API Integration

Documentation for how this project uses the Google Gemini API, including architecture, request patterns, caching, rate limit handling, and debugging tools.

---

## Overview

Omega Terminal uses **Gemini 2.5 Flash** with **Google Search grounding** to power AI-driven market analysis. Every analysis call fetches live news, sends it to Gemini in a single structured prompt, and receives a consolidated JSON response containing:

- Per-article roundtable analysis (4 AI agents: momentum, value, macro, sentiment)
- A 14-day market/stock prediction (stance, confidence, key drivers, main risks)
- AI-discovered news via Google Search grounding

---

## Architecture

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

## Request Lifecycle

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

## Caching

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

## Rate Limit Handling

- **No automatic retries.** A `429 Too Many Requests` error fails immediately and is logged as `status: error`.
- An error dialog is shown to the user when rate limited.
- To avoid flooding the API:
  - Navigating between already-cached tickers makes **zero** new requests
  - Each ticker has its own `AbortController` — navigating away does not cancel in-flight requests for other tickers (they complete in the background and populate the cache)
  - Duplicate in-flight requests for the same ticker are de-duplicated via `inFlightRef`

---

## Request Logger

Every Gemini request is recorded in `localStorage` under the key `omega_gemini_log`, capped at **500 entries** (ring buffer).

### Log Entry Fields

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

### Viewing the Log

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

## Model Configuration

```ts
model: 'gemini-2.5-flash'
tools: [{ googleSearch: {} }]   // Google Search grounding enabled
```

- `responseMimeType: 'application/json'` is **not** set when search grounding is enabled (Gemini requirement — grounded models return plain text with embedded JSON)
- The response is stripped of markdown code fences if present, then parsed as JSON

---

## Prompt Structure

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

## Live vs Demo Mode

| | Live Mode | Demo Mode |
|---|---|---|
| Gemini API | ✅ Called | ❌ Not called |
| News fetching | ✅ Real RSS | ✅ Real RSS (best-effort) |
| Analysis data | Real AI output | `src/services/mock/index.ts` |
| API key required | ✅ Yes | ❌ No |
| Cache TTL | 12 hours | 12 hours |
