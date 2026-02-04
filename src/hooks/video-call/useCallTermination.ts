import { useEffect, useRef, useCallback } from 'react';
import { supabase, supabaseUrl, supabaseAnonKeyPublic } from '@/lib/supabase';
import { devLog } from '@/lib/debug';

// ═══════════════════════════════════════════════════════════════════════════════
// CALL TERMINATION HOOK
// Handles server-side call termination for all exit scenarios:
// - Manual leave (button click)
// - Solo timeout (30 min alone)
// - Max duration (2 hours)
// - Page close / tab close / crash (best-effort via sendBeacon/pagehide)
// ═══════════════════════════════════════════════════════════════════════════════

type EndReason = 'manual' | 'solo_timeout' | 'max_duration' | 'error' | 'page_close';

interface UseCallTerminationOptions {
  conversationId: string;
  enabled: boolean; // Only active when call is joined
}

export function useCallTermination({ conversationId, enabled }: UseCallTerminationOptions) {
  const hasTerminatedRef = useRef(false);
  const enabledRef = useRef(enabled);

  // Keep ref updated
  useEffect(() => {
    enabledRef.current = enabled;
  }, [enabled]);

  // ═══════════════════════════════════════════════════════════════════════════
  // TERMINATE CALL - Server-side via Edge Function
  // ═══════════════════════════════════════════════════════════════════════════
  const terminateCall = useCallback(async (reason: EndReason) => {
    // Prevent double termination
    if (hasTerminatedRef.current) {
      devLog('CallTermination', 'Already terminated, skipping:', reason);
      return;
    }

    devLog('CallTermination', 'Terminating call:', { conversationId, reason });
    hasTerminatedRef.current = true;

    try {
      const { error } = await supabase.functions.invoke('end-daily-call', {
        body: { conversation_id: conversationId, reason },
      });

      if (error) {
        console.error('[CallTermination] Edge function error:', error);
        // Reset flag on error so retry is possible
        hasTerminatedRef.current = false;
      } else {
        devLog('CallTermination', 'Call terminated successfully:', reason);
      }
    } catch (err) {
      console.error('[CallTermination] Unexpected error:', err);
      hasTerminatedRef.current = false;
    }
  }, [conversationId]);

  // ═══════════════════════════════════════════════════════════════════════════
  // BEST-EFFORT TERMINATION FOR PAGE CLOSE
  // Uses fetch with keepalive for reliability when page is unloading
  // sendBeacon doesn't support auth headers, so we use keepalive fetch
  // ═══════════════════════════════════════════════════════════════════════════
  const terminateOnPageClose = useCallback(async () => {
    if (hasTerminatedRef.current || !enabledRef.current) {
      return;
    }

    devLog('CallTermination', 'Page close detected - attempting best-effort termination');

    // Get current session token
    let token: string | null = null;
    try {
      const { data } = await supabase.auth.getSession();
      token = data.session?.access_token ?? null;
    } catch {
      // Session might be unavailable during unload
    }

    if (!token) {
      console.warn('[CallTermination] Cannot send beacon - no auth token');
      return;
    }

    const url = `${supabaseUrl}/functions/v1/end-daily-call`;
    const payload = JSON.stringify({
      conversation_id: conversationId,
      reason: 'page_close',
    });

    // Use fetch with keepalive (supports headers, unlike sendBeacon)
    try {
      fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
          'apikey': supabaseAnonKeyPublic,
        },
        body: payload,
        keepalive: true,
      }).catch(() => {
        // Ignore - best effort, page is closing
      });
      hasTerminatedRef.current = true;
      devLog('CallTermination', 'Best-effort termination sent via keepalive fetch');
    } catch {
      // Ignore - best effort
    }
  }, [conversationId]);

  // ═══════════════════════════════════════════════════════════════════════════
  // PAGE VISIBILITY / CLOSE EVENT LISTENERS
  // ═══════════════════════════════════════════════════════════════════════════
  useEffect(() => {
    if (!enabled) {
      return;
    }

    // Reset termination flag when enabled
    hasTerminatedRef.current = false;

    const handleVisibilityChange = () => {
      // Only trigger on hidden if it's a potential page close
      // (actual close is handled by pagehide)
      if (document.visibilityState === 'hidden') {
        devLog('CallTermination', 'Page hidden - preparing for potential close');
      }
    };

    const handlePageHide = (event: PageTransitionEvent) => {
      // pagehide fires when page is being unloaded
      // persisted = true means back-forward cache, don't terminate
      if (!event.persisted) {
        terminateOnPageClose();
      }
    };

    const handleBeforeUnload = () => {
      // Last chance - beforeunload
      terminateOnPageClose();
    };

    // Add listeners
    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('pagehide', handlePageHide);
    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('pagehide', handlePageHide);
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [enabled, terminateOnPageClose]);

  // ═══════════════════════════════════════════════════════════════════════════
  // RESET ON CONVERSATION CHANGE
  // ═══════════════════════════════════════════════════════════════════════════
  useEffect(() => {
    return () => {
      hasTerminatedRef.current = false;
    };
  }, [conversationId]);

  return {
    terminateCall,
    terminateOnPageClose,
    hasTerminated: hasTerminatedRef.current,
  };
}
