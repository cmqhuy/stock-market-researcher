import { useState, useEffect, useCallback } from 'react';

interface ErrorState {
  title: string;
  message: string;
  details?: string;
  retryAfterSeconds?: number;
}

function parseRateLimitDelay(errorDetails: string): number | undefined {
  // Check for various patterns indicating seconds to wait:
  // e.g., "Please retry in 30.5s", "retry after 60s", "wait 10 seconds", "cooldown: 45s"
  const secRegexes = [
    /retry in ([\d\.]+)\s*(?:s|sec|second|seconds)/i,
    /retry after ([\d\.]+)\s*(?:s|sec|second|seconds)/i,
    /wait ([\d\.]+)\s*(?:s|sec|second|seconds)/i,
    /delay of ([\d\.]+)\s*(?:s|sec|second|seconds)/i,
    /cooldown\s*(?:of|for)?\s*([\d\.]+)\s*(?:s|sec|second|seconds)/i,
  ];

  for (const regex of secRegexes) {
    const match = errorDetails.match(regex);
    if (match && match[1]) {
      const seconds = parseFloat(match[1]);
      if (!isNaN(seconds)) {
        return Math.ceil(seconds);
      }
    }
  }

  // Also check for minutes to wait:
  // e.g., "Please retry in 1 minute", "wait 2m"
  const minRegexes = [
    /retry in ([\d\.]+)\s*(?:m|min|minute|minutes)/i,
    /retry after ([\d\.]+)\s*(?:m|min|minute|minutes)/i,
    /wait ([\d\.]+)\s*(?:m|min|minute|minutes)/i,
  ];

  for (const regex of minRegexes) {
    const match = errorDetails.match(regex);
    if (match && match[1]) {
      const minutes = parseFloat(match[1]);
      if (!isNaN(minutes)) {
        return Math.ceil(minutes * 60);
      }
    }
  }

  return undefined;
}

export function useErrorModal() {
  const [errorMessage, setErrorMessage] = useState<ErrorState | null>(null);

  const triggerError = useCallback((title: string, error: unknown, defaultMessage: string) => {
    let errorDetails = '';
    
    if (error instanceof Error) {
      errorDetails = error.message;
      if ('status' in error) {
        errorDetails += ` [Status: ${(error as any).status}]`;
      }
    } else if (typeof error === 'object' && error !== null) {
      try {
        errorDetails = JSON.stringify(error);
      } catch {
        errorDetails = String(error);
      }
    } else {
      errorDetails = String(error);
    }

    const isRateLimit = errorDetails.includes('429') || 
                        errorDetails.toLowerCase().includes('quota') || 
                        errorDetails.toLowerCase().includes('rate limit') || 
                        errorDetails.toLowerCase().includes('resource_exhausted') ||
                        errorDetails.toLowerCase().includes('exhausted');
    
    let message = defaultMessage;
    let retryAfterSeconds: number | undefined = undefined;
    
    if (isRateLimit) {
      const parsedDelay = parseRateLimitDelay(errorDetails);
      retryAfterSeconds = parsedDelay || 30; // default fallback if we couldn't parse
      
      message = `Gemini API rate limit exceeded (429). The Google AI Studio free tier limits you to 15 Requests Per Minute and a low request-per-project quota limit (usually 5 RPM). Please wait for the cooldown timer to finish before initiating another market analysis or refreshing.`;
    }
    
    setErrorMessage({
      title: isRateLimit ? 'API Rate Limit Exceeded' : title,
      message,
      details: errorDetails,
      retryAfterSeconds
    });
  }, []);

  const closeError = useCallback(() => {
    setErrorMessage(null);
  }, []);

  // Handle rate limit modal countdown timer
  useEffect(() => {
    if (errorMessage && errorMessage.retryAfterSeconds !== undefined && errorMessage.retryAfterSeconds > 0) {
      const timer = setTimeout(() => {
        setErrorMessage(prev => {
          if (!prev || prev.retryAfterSeconds === undefined) return prev;
          return {
            ...prev,
            retryAfterSeconds: Math.max(0, prev.retryAfterSeconds - 1)
          };
        });
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [errorMessage]);

  return {
    errorMessage,
    triggerError,
    closeError
  };
}
