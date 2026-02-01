// ═══════════════════════════════════════════════════════════════════════════════
// VIDEO CALL HELPER FUNCTIONS
// Utility functions for formatting, validation, and error handling
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Formats seconds into MM:SS format
 */
export function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

/**
 * Validates that a URL is a valid Daily.co room URL
 * @throws Error if URL is invalid
 */
export function assertValidDailyUrl(urlStr: string): void {
  const url = new URL(urlStr);
  const isHttps = url.protocol === 'https:';
  const isDailyHost = url.hostname === 'daily.co' || url.hostname.endsWith('.daily.co');
  if (!isHttps || !isDailyHost) {
    throw new Error('Oda URL geçersiz. Lütfen daha sonra tekrar deneyin.');
  }
}

/**
 * Checks if an error indicates an expired room
 */
export function isExpRoomError(e: any): boolean {
  return e?.error?.type === 'exp-room' || e?.errorMsg?.includes('no longer available');
}

/**
 * Checks if an error indicates a non-existent room
 */
export function isNoRoomError(e: any): boolean {
  return e?.error?.type === 'no-room' || e?.errorMsg?.includes("does not exist");
}

/**
 * Parses edge function error responses into structured format
 */
export function parseEdgeFunctionError(roomError: any): { 
  errorCode: string; 
  errorDetails: string; 
  status?: number; 
  functionVersion?: string 
} {
  const ctx = roomError?.context;
  const status = ctx?.status;
  let errorCode = 'UNKNOWN';
  let errorDetails = '';
  let functionVersion: string | undefined;

  try {
    const bodyStr = typeof ctx?.body === 'string' ? ctx.body : JSON.stringify(ctx?.body || {});
    const parsed = JSON.parse(bodyStr);
    functionVersion = parsed?.function_version;
    errorCode = parsed?.error?.code || parsed?.code || 'UNKNOWN';
    errorDetails = parsed?.error?.message || parsed?.error || parsed?.details || '';
  } catch {
    errorDetails = roomError?.message || 'Unknown error';
  }

  return { errorCode, errorDetails, status, functionVersion };
}

/**
 * Maps error codes to user-friendly Turkish error messages
 */
export function getErrorMessage(errorCode: string, status?: number): string {
  if (errorCode === 'DAILY_API_KEY_INVALID') {
    return 'Daily API key invalid/for wrong domain. Lütfen yöneticiye başvurun.';
  }
  if (errorCode === 'MISSING_DAILY_API_KEY') {
    return 'Video servisi yapılandırılmamış (DAILY_API_KEY eksik). Lütfen yöneticiye başvurun.';
  }
  if (errorCode === 'DAILY_VERIFY_FAILED') {
    return 'Oda doğrulanamadı (Daily verify failed). Lütfen tekrar deneyin.';
  }
  if (errorCode === 'DAILY_CREATE_FAILED' || errorCode === 'DAILY_FETCH_FAILED') {
    return 'Oda oluşturma başarısız. Lütfen tekrar deneyin.';
  }
  if (errorCode === 'NO_ACTIVE_CALL') {
    return 'Aktif görüşme bulunamadı. Görüşme sona ermiş olabilir.';
  }
  if (status === 401 || errorCode === 'NO_AUTH_HEADER' || errorCode === 'INVALID_JWT') {
    return 'Oturum geçersiz. Lütfen tekrar giriş yapın.';
  }
  if (status === 403 || errorCode === 'NOT_PARTICIPANT') {
    return 'Bu görüşmeye katılma yetkiniz yok.';
  }
  if (status === 404 || errorCode === 'CONVERSATION_NOT_FOUND') {
    return 'Görüşme bulunamadı.';
  }
  return 'Video araması başlatılamadı.';
}
