import { useState, useEffect, useCallback } from 'react';

interface ErrorState {
  title: string;
  message: string;
  details?: string;
  retryAfterSeconds?: number;
}

function parseRateLimitDelay(errorDetails: string): number | undefined {
  const match = errorDetails.match(/Please retry in ([\d\.]+)s/i) || errorDetails.match(/retry in ([\d\.]+)s/i);
  if (match && match[1]) {
    const seconds = parseFloat(match[1]);
    return Math.ceil(seconds);
  }
  return undefined;
}

export function useErrorModal() {
  const [errorMessage, setErrorMessage] = useState<ErrorState | null>(null);

  const triggerError = useCallback((title: string, error: unknown, defaultMessage: string) => {
    const errorDetails = error instanceof Error ? error.message : String(error);
    const isRateLimit = errorDetails.includes('429') || errorDetails.toLowerCase().includes('quota') || errorDetails.toLowerCase().includes('rate limit');
    
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
