import { supabase } from "@/integrations/supabase/client";
import type { Json } from "@/integrations/supabase/types";

interface ErrorContext {
  url: string;
  route: string;
  userId?: string;
  userAgent: string;
  metadata?: Record<string, unknown>;
}

interface ErrorReport {
  errorMessage: string;
  stackTrace?: string;
  componentStack?: string;
  errorType: 'js_error' | 'promise_rejection' | 'react_boundary';
  context: ErrorContext;
}

// ============ Input Sanitization Functions ============

/**
 * Sanitize user-agent string to prevent XSS in exports/logs
 * Removes HTML-sensitive characters
 */
function sanitizeUserAgent(userAgent: string): string {
  return userAgent
    .replace(/[<>"'&]/g, '') // Remove HTML-sensitive chars
    .substring(0, 500);
}

/**
 * Sanitize URL to prevent XSS payloads in stored URLs
 * Returns origin + pathname only (strips query params which may contain XSS)
 */
function sanitizeUrl(url: string): string {
  try {
    const parsed = new URL(url);
    // Only keep safe parts: origin and pathname (no query/hash)
    return `${parsed.origin}${parsed.pathname}`.substring(0, 2000);
  } catch {
    return '<invalid-url>';
  }
}

/**
 * Sanitize route string (already normalized, but ensure no injection)
 */
function sanitizeRoute(route: string): string {
  return route
    .replace(/[<>"'&]/g, '')
    .substring(0, 500);
}

/**
 * Sanitize metadata object - only allow primitive values
 * Prevents nested objects that could contain XSS payloads
 */
function sanitizeMetadata(metadata: unknown): Json {
  if (!metadata || typeof metadata !== 'object') return {};
  
  const safe: Record<string, string | number | boolean | null> = {};
  
  for (const [key, value] of Object.entries(metadata as Record<string, unknown>)) {
    // Only allow safe key names (alphanumeric + underscore)
    const safeKey = key.replace(/[^a-zA-Z0-9_]/g, '').substring(0, 50);
    if (!safeKey) continue;
    
    // Only allow primitive values
    if (typeof value === 'string') {
      safe[safeKey] = value.replace(/[<>"'&]/g, '').substring(0, 500);
    } else if (typeof value === 'number' && isFinite(value)) {
      safe[safeKey] = value;
    } else if (typeof value === 'boolean') {
      safe[safeKey] = value;
    } else if (value === null) {
      safe[safeKey] = null;
    }
    // Skip objects, arrays, functions, undefined, etc.
  }
  
  return safe as Json;
}

/**
 * Sanitize error message - limit length and remove dangerous chars
 */
function sanitizeErrorMessage(message: string): string {
  return message
    .replace(/[<>"'&]/g, '')
    .substring(0, 1000);
}

/**
 * Sanitize stack trace - limit length, keep useful debugging info
 */
function sanitizeStackTrace(stack: string | undefined): string | undefined {
  if (!stack) return undefined;
  return stack
    .replace(/[<>"'&]/g, '')
    .substring(0, 5000);
}

/**
 * Sanitize component stack - limit length
 */
function sanitizeComponentStack(stack: string | undefined): string | undefined {
  if (!stack) return undefined;
  return stack
    .replace(/[<>"'&]/g, '')
    .substring(0, 2000);
}

// Rate limiting
const MAX_ERRORS_PER_MINUTE = 10;
const errorTimestamps: number[] = [];

// Generate a fingerprint for deduplication
function generateFingerprint(errorMessage: string, stackTrace?: string, errorType?: string): string {
  // Normalize the error message (remove variable parts like IDs, URLs)
  const normalizedMessage = errorMessage
    .replace(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi, '<UUID>')
    .replace(/https?:\/\/[^\s]+/g, '<URL>')
    .replace(/\d+/g, '<NUM>');
  
  // Get first 3 lines of stack trace for fingerprinting
  const stackLines = stackTrace?.split('\n').slice(0, 3).join('\n') || '';
  
  const fingerprintSource = `${errorType}:${normalizedMessage}:${stackLines}`;
  
  // Simple hash function
  let hash = 0;
  for (let i = 0; i < fingerprintSource.length; i++) {
    const char = fingerprintSource.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return Math.abs(hash).toString(36);
}

// Check rate limiting
function isRateLimited(): boolean {
  const now = Date.now();
  const oneMinuteAgo = now - 60000;
  
  // Remove old timestamps
  while (errorTimestamps.length > 0 && errorTimestamps[0] < oneMinuteAgo) {
    errorTimestamps.shift();
  }
  
  if (errorTimestamps.length >= MAX_ERRORS_PER_MINUTE) {
    if (import.meta.env.DEV) {
      console.warn('[ErrorReporter] Rate limit reached. Error not reported.');
    }
    return true;
  }
  
  errorTimestamps.push(now);
  return false;
}

// Get current user ID if logged in
async function getCurrentUserId(): Promise<string | undefined> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    return user?.id;
  } catch {
    return undefined;
  }
}

// Get current route from URL
function getCurrentRoute(): string {
  const path = window.location.pathname;
  // Normalize route by replacing UUIDs with :id
  return path.replace(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi, ':id');
}

// Main report function
export async function reportError(report: ErrorReport): Promise<void> {
  // Skip in development mode unless explicitly enabled
  if (import.meta.env.DEV && !import.meta.env.VITE_ENABLE_ERROR_REPORTING) {
    console.error('[ErrorReporter] Error captured (dev mode):', report.errorMessage);
    return;
  }
  
  // Check rate limiting
  if (isRateLimited()) {
    return;
  }
  
  const fingerprint = generateFingerprint(
    report.errorMessage,
    report.stackTrace,
    report.errorType
  );
  
  try {
    // Try to update existing error with same fingerprint (increment count)
    const { data: existing } = await supabase
      .from('error_reports')
      .select('id, occurrence_count')
      .eq('fingerprint', fingerprint)
      .eq('status', 'new')
      .single();
    
    if (existing) {
      // Update occurrence count
      await supabase
        .from('error_reports')
        .update({
          occurrence_count: existing.occurrence_count + 1,
          last_occurred_at: new Date().toISOString(),
        })
        .eq('id', existing.id);
    } else {
      // Insert new error report with sanitized inputs
      await supabase
        .from('error_reports')
        .insert([{
          error_message: sanitizeErrorMessage(report.errorMessage),
          stack_trace: sanitizeStackTrace(report.stackTrace),
          component_stack: sanitizeComponentStack(report.componentStack),
          url: sanitizeUrl(report.context.url),
          route: sanitizeRoute(report.context.route),
          user_id: report.context.userId,
          user_agent: sanitizeUserAgent(report.context.userAgent),
          error_type: report.errorType,
          metadata: sanitizeMetadata(report.context.metadata),
          fingerprint,
        }]);
    }
  } catch (err) {
    // Silently fail - don't cause more errors from error reporting
    if (import.meta.env.DEV) {
      console.error('[ErrorReporter] Failed to report error:', err);
    }
  }
}

// Convenience function to report a JavaScript error
export async function reportJSError(
  error: Error | string,
  metadata?: Record<string, unknown>
): Promise<void> {
  const errorMessage = typeof error === 'string' ? error : error.message;
  const stackTrace = typeof error === 'string' ? undefined : error.stack;
  const userId = await getCurrentUserId();
  
  await reportError({
    errorMessage,
    stackTrace,
    errorType: 'js_error',
    context: {
      url: window.location.href,
      route: getCurrentRoute(),
      userId,
      userAgent: navigator.userAgent,
      metadata,
    },
  });
}

// Convenience function to report a promise rejection
export async function reportPromiseRejection(
  reason: unknown,
  metadata?: Record<string, unknown>
): Promise<void> {
  const errorMessage = reason instanceof Error 
    ? reason.message 
    : String(reason);
  const stackTrace = reason instanceof Error ? reason.stack : undefined;
  const userId = await getCurrentUserId();
  
  await reportError({
    errorMessage,
    stackTrace,
    errorType: 'promise_rejection',
    context: {
      url: window.location.href,
      route: getCurrentRoute(),
      userId,
      userAgent: navigator.userAgent,
      metadata,
    },
  });
}

// Convenience function to report a React boundary error
export async function reportReactError(
  error: Error,
  componentStack: string,
  metadata?: Record<string, unknown>
): Promise<void> {
  const userId = await getCurrentUserId();
  
  await reportError({
    errorMessage: error.message,
    stackTrace: error.stack,
    componentStack,
    errorType: 'react_boundary',
    context: {
      url: window.location.href,
      route: getCurrentRoute(),
      userId,
      userAgent: navigator.userAgent,
      metadata,
    },
  });
}

// Initialize global error handlers
export function initializeErrorReporting(): void {
  // Global JavaScript error handler
  window.onerror = (message, source, lineno, colno, error) => {
    const errorMessage = typeof message === 'string' ? message : 'Unknown error';
    reportJSError(error || errorMessage, { source, lineno, colno });
    return false; // Don't prevent default handling
  };
  
  // Unhandled promise rejection handler
  window.onunhandledrejection = (event) => {
    reportPromiseRejection(event.reason);
  };
  
  if (import.meta.env.DEV) {
    console.log('[ErrorReporter] Initialized global error handlers');
  }
}
