/**
 * GeminiLogger — structured audit log for every Gemini API request.
 *
 * Each log entry captures:
 *  - id          : unique request ID
 *  - callsite    : which hook triggered the request  ('useMarketAnalysis' | 'useStockAnalysis' | 'manual')
 *  - type        : query category  ('market-overview' | 'stock-analysis')
 *  - ticker      : uppercase ticker symbol or 'MARKET'
 *  - trigger     : human-readable reason the request was fired (e.g. 'expired', 'mode-changed', 'manual-refresh')
 *  - articleCount: number of news articles sent in the prompt
 *  - startedAt   : ISO timestamp when the request started
 *  - endedAt     : ISO timestamp when the request finished (success / error / abort)
 *  - durationMs  : total wall-clock time in milliseconds (null while pending)
 *  - status      : 'pending' | 'success' | 'error' | 'aborted'
 *  - attempts    : how many send attempts were made (≥2 means retries occurred)
 *  - error       : error message string if status === 'error'
 */

export type GeminiRequestStatus = 'pending' | 'success' | 'error' | 'aborted';

export interface GeminiLogEntry {
  id: string;
  callsite: 'useMarketAnalysis' | 'useStockAnalysis' | 'manual';
  type: 'market-overview' | 'stock-analysis';
  ticker: string;
  trigger: string;
  articleCount: number;
  startedAt: string;       // ISO
  endedAt: string | null;  // ISO, null while pending
  durationMs: number | null;
  status: GeminiRequestStatus;
  attempts: number;
  error: string | null;
}

const STORAGE_KEY = 'omega_gemini_log';
const MAX_ENTRIES = 500;

let _sessionTotal = 0; // count across the current page session

// ─── Internal helpers ───────────────────────────────────────────────────────

function load(): GeminiLogEntry[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function save(entries: GeminiLogEntry[]) {
  try {
    // Ring buffer: keep only the newest MAX_ENTRIES
    const capped = entries.slice(-MAX_ENTRIES);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(capped));
  } catch {
    /* quota exceeded – silently ignore */
  }
}

function uid(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
}

// ─── Change listeners (for React subscriptions) ─────────────────────────────

type LogChangeListener = (entries: GeminiLogEntry[]) => void;
const _listeners = new Set<LogChangeListener>();

function notify() {
  const entries = load();
  _listeners.forEach((l) => l(entries));
}

// ─── Public API ─────────────────────────────────────────────────────────────

export const GeminiLogger = {
  /**
   * Called at the very start of a Gemini request.
   * Returns the unique entry ID so the caller can resolve it later.
   */
  begin(params: {
    callsite: GeminiLogEntry['callsite'];
    type: GeminiLogEntry['type'];
    ticker: string;
    trigger: string;
    articleCount: number;
  }): string {
    _sessionTotal++;
    const id = uid();
    const entry: GeminiLogEntry = {
      id,
      callsite: params.callsite,
      type: params.type,
      ticker: params.ticker.toUpperCase(),
      trigger: params.trigger,
      articleCount: params.articleCount,
      startedAt: new Date().toISOString(),
      endedAt: null,
      durationMs: null,
      status: 'pending',
      attempts: 1,
      error: null,
    };
    const entries = load();
    entries.push(entry);
    save(entries);
    notify();
    console.info(
      `[GeminiLogger] ▶ #${_sessionTotal} ${entry.type.toUpperCase()} | ${entry.ticker} | trigger="${entry.trigger}" | articles=${entry.articleCount} | id=${id}`
    );
    return id;
  },

  /** Increment the attempt counter (called on each 429 retry). */
  retry(id: string) {
    const entries = load();
    const idx = entries.findLastIndex((e) => e.id === id);
    if (idx >= 0) {
      entries[idx].attempts++;
      save(entries);
      notify();
      console.warn(
        `[GeminiLogger] ↻ RETRY attempt ${entries[idx].attempts} | ${entries[idx].ticker} | id=${id}`
      );
    }
  },

  /** Mark the request as successfully completed. */
  success(id: string) {
    const entries = load();
    const idx = entries.findLastIndex((e) => e.id === id);
    if (idx >= 0) {
      const now = new Date();
      entries[idx].status = 'success';
      entries[idx].endedAt = now.toISOString();
      entries[idx].durationMs =
        now.getTime() - new Date(entries[idx].startedAt).getTime();
      save(entries);
      notify();
      console.info(
        `[GeminiLogger] ✓ SUCCESS | ${entries[idx].ticker} | ${entries[idx].durationMs}ms | attempts=${entries[idx].attempts} | id=${id}`
      );
    }
  },

  /** Mark the request as failed with an error message. */
  error(id: string, err: unknown) {
    const entries = load();
    const idx = entries.findLastIndex((e) => e.id === id);
    if (idx >= 0) {
      const now = new Date();
      entries[idx].status = 'error';
      entries[idx].endedAt = now.toISOString();
      entries[idx].durationMs =
        now.getTime() - new Date(entries[idx].startedAt).getTime();
      entries[idx].error =
        err instanceof Error ? err.message : String(err);
      save(entries);
      notify();
      console.error(
        `[GeminiLogger] ✗ ERROR | ${entries[idx].ticker} | ${entries[idx].durationMs}ms | attempts=${entries[idx].attempts} | id=${id}`,
        entries[idx].error
      );
    }
  },

  /** Mark the request as aborted (signal fired before completion). */
  aborted(id: string) {
    const entries = load();
    const idx = entries.findLastIndex((e) => e.id === id);
    if (idx >= 0) {
      const now = new Date();
      entries[idx].status = 'aborted';
      entries[idx].endedAt = now.toISOString();
      entries[idx].durationMs =
        now.getTime() - new Date(entries[idx].startedAt).getTime();
      save(entries);
      notify();
      console.info(
        `[GeminiLogger] ⊘ ABORTED | ${entries[idx].ticker} | id=${id}`
      );
    }
  },

  /** Returns a snapshot of all stored log entries (newest last). */
  getAll(): GeminiLogEntry[] {
    return load();
  },

  /** Clears all stored log entries. */
  clear() {
    localStorage.removeItem(STORAGE_KEY);
    notify();
    console.info('[GeminiLogger] Log cleared.');
  },

  /** Returns the number of requests fired in the current page session. */
  sessionTotal(): number {
    return _sessionTotal;
  },

  /** Subscribe to log changes (React-friendly). Returns an unsubscribe fn. */
  subscribe(listener: LogChangeListener): () => void {
    _listeners.add(listener);
    listener(load());
    return () => _listeners.delete(listener);
  },
};

// ─── window.geminiLog() convenience helper ──────────────────────────────────
// Open the browser DevTools console and type:
//   geminiLog()            → pretty-print all entries
//   geminiLog('AAPL')      → filter by ticker
//   geminiLog('error')     → filter by status
//   geminiLog.clear()      → wipe the log

function printLog(filter?: string) {
  const all = GeminiLogger.getAll();
  const filtered = filter
    ? all.filter(
        (e) =>
          e.ticker.toUpperCase() === filter.toUpperCase() ||
          e.status === filter ||
          e.callsite === filter ||
          e.type === filter ||
          e.trigger.includes(filter)
      )
    : all;

  console.group(
    `%c[Gemini Request Log] ${filtered.length} entries${filter ? ` (filter: "${filter}")` : ''} | session total: ${_sessionTotal}`,
    'color: #818cf8; font-weight: bold;'
  );
  filtered.forEach((e) => {
    const statusIcon =
      e.status === 'success'
        ? '✓'
        : e.status === 'error'
        ? '✗'
        : e.status === 'aborted'
        ? '⊘'
        : '⏳';
    const dur = e.durationMs != null ? `${e.durationMs}ms` : 'pending';
    console.log(
      `%c${statusIcon} ${e.status.toUpperCase()}%c | ${new Date(e.startedAt).toLocaleTimeString()} | ${e.type} | %c${e.ticker}%c | trigger="${e.trigger}" | articles=${e.articleCount} | attempts=${e.attempts} | ${dur}${e.error ? ` | err="${e.error}"` : ''}`,
      e.status === 'success'
        ? 'color:#10b981'
        : e.status === 'error'
        ? 'color:#ef4444'
        : e.status === 'aborted'
        ? 'color:#6b7280'
        : 'color:#f59e0b',
      'color:inherit',
      'color:#818cf8;font-weight:bold',
      'color:inherit'
    );
  });
  console.groupEnd();
  return filtered;
}

(printLog as any).clear = () => GeminiLogger.clear();
(printLog as any).all = () => GeminiLogger.getAll();

if (typeof window !== 'undefined') {
  (window as any).geminiLog = printLog;
}
