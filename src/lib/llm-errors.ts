export class LLMError extends Error {
  constructor(
    message: string,
    public provider: string,
    public requestType: string,
    public originalError?: Error,
    public retryable: boolean = false
  ) {
    super(message);
    this.name = 'LLMError';
  }
}

export class RateLimitError extends LLMError {
  public retryAfter?: number;
  
  constructor(provider: string, retryAfter?: number) {
    super(`Rate limit exceeded for ${provider}`, provider, 'rate-limit', undefined, true);
    this.name = 'RateLimitError';
    this.retryAfter = retryAfter;
  }
}

export class TimeoutError extends LLMError {
  constructor(provider: string, timeout: number) {
    super(`Request timed out after ${timeout}ms for ${provider}`, provider, 'timeout', undefined, true);
    this.name = 'TimeoutError';
  }
}

export class ParseError extends LLMError {
  constructor(provider: string, response: any) {
    super(`Failed to parse response from ${provider}`, provider, 'parse-error', undefined, false);
    this.name = 'ParseError';
  }
}

export class AuthenticationError extends LLMError {
  constructor(provider: string) {
    super(`Authentication failed for ${provider}`, provider, 'auth-error', undefined, false);
    this.name = 'AuthenticationError';
  }
}

export class QuotaExceededError extends LLMError {
  constructor(provider: string) {
    super(`Quota exceeded for ${provider}`, provider, 'quota-error', undefined, false);
    this.name = 'QuotaExceededError';
  }
}