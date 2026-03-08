// ═══════════════════════════════════════════════════════════════════════════════
// MEDIA PERMISSIONS UTILITY
// Diagnostic checks + permission gate for camera/mic before video calls
// ═══════════════════════════════════════════════════════════════════════════════

import { devLog } from '@/lib/debug';

export type PermissionStatus = 'granted' | 'denied' | 'prompt' | 'unavailable';

export interface MediaDiagnostics {
  isSecureContext: boolean;
  hasMediaDevices: boolean;
  hasGetUserMedia: boolean;
  camera: PermissionStatus;
  mic: PermissionStatus;
  rawError?: string;
}

/**
 * Run full diagnostic on media capabilities.
 * Does NOT request permissions — only checks current state.
 */
export async function diagnoseMedia(): Promise<MediaDiagnostics> {
  const result: MediaDiagnostics = {
    isSecureContext: !!window.isSecureContext,
    hasMediaDevices: !!navigator.mediaDevices,
    hasGetUserMedia: !!navigator.mediaDevices?.getUserMedia,
    camera: 'unavailable',
    mic: 'unavailable',
  };

  if (!result.hasGetUserMedia) {
    devLog('MediaPermissions', 'Diagnostics:', result);
    return result;
  }

  // Check permission state via Permissions API (where supported)
  try {
    const [camPerm, micPerm] = await Promise.allSettled([
      navigator.permissions.query({ name: 'camera' as PermissionName }),
      navigator.permissions.query({ name: 'microphone' as PermissionName }),
    ]);

    if (camPerm.status === 'fulfilled') {
      result.camera = camPerm.value.state as PermissionStatus;
    }
    if (micPerm.status === 'fulfilled') {
      result.mic = micPerm.value.state as PermissionStatus;
    }
  } catch {
    // Permissions API not supported (some iOS versions) — will be resolved by getUserMedia
    result.camera = 'prompt';
    result.mic = 'prompt';
  }

  devLog('MediaPermissions', 'Diagnostics:', result);
  return result;
}

/**
 * Request camera + mic access. Returns diagnostic result.
 * Stops all tracks immediately after grant check.
 */
export async function requestMediaAccess(): Promise<MediaDiagnostics> {
  const diag = await diagnoseMedia();

  if (!diag.hasGetUserMedia) {
    devLog('MediaPermissions', 'getUserMedia not available — skipping request');
    return diag;
  }

  // If both already granted, skip actual getUserMedia call
  if (diag.camera === 'granted' && diag.mic === 'granted') {
    devLog('MediaPermissions', 'Both permissions already granted');
    return diag;
  }

  try {
    devLog('MediaPermissions', 'Requesting getUserMedia...');
    const stream = await navigator.mediaDevices.getUserMedia({
      video: true,
      audio: true,
    });
    // Immediately release tracks
    stream.getTracks().forEach(t => t.stop());

    diag.camera = 'granted';
    diag.mic = 'granted';
    devLog('MediaPermissions', 'getUserMedia success — both granted');
  } catch (err: any) {
    const errName = err?.name || '';
    const errMsg = err?.message || String(err);
    diag.rawError = `${errName}: ${errMsg}`;

    if (errName === 'NotAllowedError' || errName === 'PermissionDeniedError') {
      diag.camera = 'denied';
      diag.mic = 'denied';
      devLog('MediaPermissions', 'Permission denied:', errMsg);
    } else if (errName === 'NotFoundError' || errName === 'DevicesNotFoundError') {
      // No camera/mic hardware
      diag.camera = 'unavailable';
      diag.mic = 'unavailable';
      devLog('MediaPermissions', 'No media devices found:', errMsg);
    } else if (errName === 'NotSupportedError' || errName === 'TypeError') {
      diag.camera = 'unavailable';
      diag.mic = 'unavailable';
      devLog('MediaPermissions', 'WebRTC/getUserMedia not supported:', errMsg);
    } else {
      // Unknown error — log it
      diag.rawError = `${errName}: ${errMsg}`;
      devLog('MediaPermissions', 'Unexpected getUserMedia error:', errMsg);
    }
  }

  devLog('MediaPermissions', 'Final result:', diag);
  return diag;
}

/**
 * Prefetch: silently request media access (best-effort, no UI).
 * Used on hover/focus to warm up permissions before call.
 */
export async function prefetchMedia(): Promise<void> {
  try {
    await requestMediaAccess();
  } catch {
    // Silently ignore
  }
}

/**
 * Check if permissions are in a state that blocks video calls.
 */
export function isMediaBlocked(diag: MediaDiagnostics): boolean {
  return !diag.hasGetUserMedia || 
    (diag.camera === 'denied' && diag.mic === 'denied') ||
    (diag.camera === 'unavailable' && diag.mic === 'unavailable');
}

/**
 * Get user-facing error message based on diagnostics.
 */
export function getMediaErrorMessage(diag: MediaDiagnostics): string {
  if (!diag.isSecureContext) {
    return 'Güvenli bağlantı (HTTPS) gerekli. Lütfen güvenli bir bağlantı üzerinden erişin.';
  }
  if (!diag.hasMediaDevices || !diag.hasGetUserMedia) {
    return 'Bu cihaz veya tarayıcı görüntülü aramayı desteklemiyor. (WebRTC kullanılamıyor)';
  }
  if (diag.camera === 'denied' || diag.mic === 'denied') {
    return 'Kamera ve mikrofon izni reddedildi. Lütfen cihaz ayarlarından izin verin ve tekrar deneyin.';
  }
  if (diag.camera === 'unavailable' && diag.mic === 'unavailable') {
    return 'Kamera veya mikrofon bulunamadı. Lütfen cihazınızı kontrol edin.';
  }
  return 'Medya erişimi sağlanamadı. Lütfen tekrar deneyin.';
}
