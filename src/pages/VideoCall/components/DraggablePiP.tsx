// ═══════════════════════════════════════════════════════════════════════════════
// DRAGGABLE PIP COMPONENT
// Floating picture-in-picture container with drag and snap-to-corner behavior
// Supports touch (mobile) and mouse (desktop) interactions
// Pointer-based tap/drag detection with long-press guard and post-drag ignore
// ═══════════════════════════════════════════════════════════════════════════════

import { useState, useRef, useCallback, useEffect, type ReactNode } from 'react';
import { motion, useAnimation, PanInfo } from 'framer-motion';
import {
  MOBILE_SELF_VIEW_ASPECT,
  PIP_DRAG_THRESHOLD,
  MAX_TAP_DURATION_MS,
  POST_DRAG_IGNORE_MS,
  PIP_MIN_WIDTH,
  PIP_MAX_WIDTH,
  PIP_WIDTH_PERCENT,
} from '../utils/constants';

// ═══════════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════════

type Corner = 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';

interface DraggablePiPProps {
  children: ReactNode;
  /** Initial corner position */
  initialCorner?: Corner;
  /** Callback when corner changes */
  onCornerChange?: (corner: Corner) => void;
  /** Callback when PiP is tapped (not dragged) */
  onClick?: () => void;
  /** Bottom offset for bounds calculation (control bar height) */
  bottomOffset?: number;
}

interface Bounds {
  top: number;
  bottom: number;
  left: number;
  right: number;
}

interface Size {
  width: number;
  height: number;
}

// ═══════════════════════════════════════════════════════════════════════════════
// CONSTANTS
// ═══════════════════════════════════════════════════════════════════════════════

// Safe area paddings (status bar removed on mobile for WhatsApp-style)
const SAFE_PADDING = {
  top: 16,    // Minimal top padding
  left: 12,
  right: 12,
};

// Default bottom offset (control bar height fallback)
const DEFAULT_BOTTOM_OFFSET = 100;

// Desktop PiP size (unchanged)
const DESKTOP_PIP = {
  width: 220,
  height: 124,
};

// Spring animation configuration for smooth snapping
const SPRING_CONFIG = {
  type: 'spring' as const,
  stiffness: 400,
  damping: 30,
  mass: 1,
};

// ═══════════════════════════════════════════════════════════════════════════════
// UTILITIES
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Calculate PiP size based on container dimensions and device type
 * Mobile: portrait (3:4), clamped between PIP_MIN_WIDTH and PIP_MAX_WIDTH
 * Desktop: fixed 220×124
 */
function getPiPSize(containerWidth: number, isMobile: boolean): Size {
  if (isMobile) {
    const rawWidth = Math.round(containerWidth * PIP_WIDTH_PERCENT);
    const width = Math.max(PIP_MIN_WIDTH, Math.min(PIP_MAX_WIDTH, rawWidth));
    const height = Math.round(width / MOBILE_SELF_VIEW_ASPECT); // 3/4 → height = width * 4/3
    return { width, height };
  }
  return { width: DESKTOP_PIP.width, height: DESKTOP_PIP.height };
}

/**
 * Calculate safe bounds for PiP positioning with clamping
 * Ensures bounds are never negative
 */
function calculateBounds(
  containerWidth: number,
  containerHeight: number,
  pipSize: Size,
  bottomOffset: number
): Bounds {
  const rawBottom = containerHeight - bottomOffset - pipSize.height;
  const rawRight = containerWidth - SAFE_PADDING.right - pipSize.width;
  
  return {
    top: SAFE_PADDING.top,
    // Clamp to ensure non-negative values
    bottom: Math.max(SAFE_PADDING.top + 10, rawBottom),
    left: SAFE_PADDING.left,
    right: Math.max(SAFE_PADDING.left + 10, rawRight),
  };
}

/**
 * Get position coordinates for a specific corner
 */
function getCornerPosition(corner: Corner, bounds: Bounds): { x: number; y: number } {
  switch (corner) {
    case 'top-left':
      return { x: bounds.left, y: bounds.top };
    case 'top-right':
      return { x: bounds.right, y: bounds.top };
    case 'bottom-left':
      return { x: bounds.left, y: bounds.bottom };
    case 'bottom-right':
      return { x: bounds.right, y: bounds.bottom };
  }
}

/**
 * Find the nearest corner based on current position
 */
function getNearestCorner(x: number, y: number, bounds: Bounds): Corner {
  const corners: Record<Corner, { x: number; y: number }> = {
    'top-left': { x: bounds.left, y: bounds.top },
    'top-right': { x: bounds.right, y: bounds.top },
    'bottom-left': { x: bounds.left, y: bounds.bottom },
    'bottom-right': { x: bounds.right, y: bounds.bottom },
  };

  let nearest: Corner = 'bottom-right';
  let minDistance = Infinity;

  for (const [corner, pos] of Object.entries(corners)) {
    const distance = Math.hypot(x - pos.x, y - pos.y);
    if (distance < minDistance) {
      minDistance = distance;
      nearest = corner as Corner;
    }
  }

  return nearest;
}

// ═══════════════════════════════════════════════════════════════════════════════
// COMPONENT
// ═══════════════════════════════════════════════════════════════════════════════

export function DraggablePiP({
  children,
  initialCorner = 'bottom-right',
  onCornerChange,
  onClick,
  bottomOffset = DEFAULT_BOTTOM_OFFSET,
}: DraggablePiPProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const controls = useAnimation();
  
  const [currentCorner, setCurrentCorner] = useState<Corner>(initialCorner);
  const [containerSize, setContainerSize] = useState({ width: 0, height: 0 });
  const [pipSize, setPipSize] = useState<Size>({ width: 120, height: 68 });
  const [isDragging, setIsDragging] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  
  // ═══════════════════════════════════════════════════════════════════════════
  // POINTER-BASED TAP/DRAG TRACKING REFS
  // ═══════════════════════════════════════════════════════════════════════════
  
  /** Active pointer ID — only track one pointer at a time */
  const activePointerIdRef = useRef<number | null>(null);
  /** Start position for distance calculation */
  const startPosRef = useRef<{ x: number; y: number } | null>(null);
  /** Start timestamp for tap duration check */
  const startTimeRef = useRef<number>(0);
  /** Whether the pointer has moved beyond drag threshold */
  const hasDraggedRef = useRef(false);
  /** Whether Framer Motion drag is active */
  const isDraggingRef = useRef(false);
  /** Timestamp of last drag end — for post-drag tap ignore */
  const lastDragEndRef = useRef<number>(0);

  // ═══════════════════════════════════════════════════════════════════════════
  // RESIZE OBSERVER
  // ═══════════════════════════════════════════════════════════════════════════
  
  useEffect(() => {
    const updateDimensions = () => {
      const width = window.innerWidth;
      const height = window.innerHeight;
      const mobile = width < 768;
      
      setContainerSize({ width, height });
      setIsMobile(mobile);
      setPipSize(getPiPSize(width, mobile));
    };

    updateDimensions();
    window.addEventListener('resize', updateDimensions);
    
    return () => window.removeEventListener('resize', updateDimensions);
  }, []);

  // ═══════════════════════════════════════════════════════════════════════════
  // POSITION UPDATES
  // ═══════════════════════════════════════════════════════════════════════════
  
  useEffect(() => {
    if (containerSize.width === 0 || containerSize.height === 0) return;
    
    const bounds = calculateBounds(containerSize.width, containerSize.height, pipSize, bottomOffset);
    const position = getCornerPosition(currentCorner, bounds);
    
    controls.start({
      x: position.x,
      y: position.y,
      transition: SPRING_CONFIG,
    });
  }, [currentCorner, containerSize, pipSize, controls, bottomOffset]);

  // ═══════════════════════════════════════════════════════════════════════════
  // POINTER EVENT HANDLERS (tap vs drag detection)
  // ═══════════════════════════════════════════════════════════════════════════

  const resetPointerState = useCallback(() => {
    activePointerIdRef.current = null;
    startPosRef.current = null;
    hasDraggedRef.current = false;
    startTimeRef.current = 0;
  }, []);

  const handlePointerDown = useCallback((e: React.PointerEvent) => {
    // Only track the first pointer — ignore multi-touch
    if (activePointerIdRef.current !== null) return;
    
    activePointerIdRef.current = e.pointerId;
    startPosRef.current = { x: e.clientX, y: e.clientY };
    startTimeRef.current = Date.now();
    hasDraggedRef.current = false;
  }, []);

  const handlePointerMove = useCallback((e: React.PointerEvent) => {
    // Only process the tracked pointer
    if (e.pointerId !== activePointerIdRef.current) return;
    if (!startPosRef.current || hasDraggedRef.current) return;
    
    const delta = Math.hypot(
      e.clientX - startPosRef.current.x,
      e.clientY - startPosRef.current.y
    );
    
    if (delta > PIP_DRAG_THRESHOLD) {
      hasDraggedRef.current = true;
    }
  }, []);

  const handlePointerUp = useCallback((e: React.PointerEvent) => {
    // Only process the tracked pointer
    if (e.pointerId !== activePointerIdRef.current) return;
    
    const wasDragged = hasDraggedRef.current;
    const duration = Date.now() - startTimeRef.current;
    const timeSinceLastDragEnd = Date.now() - lastDragEndRef.current;
    
    // Reset pointer state
    resetPointerState();
    
    // Tap detection: no drag + short duration + not immediately after a drag end
    if (
      !wasDragged &&
      duration <= MAX_TAP_DURATION_MS &&
      timeSinceLastDragEnd > POST_DRAG_IGNORE_MS
    ) {
      onClick?.();
    }
  }, [onClick, resetPointerState]);

  const handlePointerCancel = useCallback((e: React.PointerEvent) => {
    if (e.pointerId !== activePointerIdRef.current) return;
    resetPointerState();
  }, [resetPointerState]);

  const handleLostPointerCapture = useCallback((e: React.PointerEvent) => {
    if (e.pointerId !== activePointerIdRef.current) return;
    resetPointerState();
  }, [resetPointerState]);

  // ═══════════════════════════════════════════════════════════════════════════
  // FRAMER MOTION DRAG HANDLERS (snap-to-corner only, NO onClick)
  // ═══════════════════════════════════════════════════════════════════════════
  
  const handleDragStart = useCallback(() => {
    setIsDragging(true);
    isDraggingRef.current = true;
  }, []);

  const handleDragEnd = useCallback(
    (_event: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
      setIsDragging(false);
      isDraggingRef.current = false;
      lastDragEndRef.current = Date.now();
      
      // Always snap to nearest corner (no onClick here — handled by pointerUp)
      const bounds = calculateBounds(containerSize.width, containerSize.height, pipSize, bottomOffset);
      
      const totalMovement = Math.hypot(info.offset.x, info.offset.y);
      
      // If barely moved, stay at current corner
      if (totalMovement < PIP_DRAG_THRESHOLD) {
        const position = getCornerPosition(currentCorner, bounds);
        controls.start({ x: position.x, y: position.y, transition: SPRING_CONFIG });
        return;
      }
      
      // Drag detected — snap to nearest corner
      const currentX = info.point.x - pipSize.width / 2;
      const currentY = info.point.y - pipSize.height / 2;
      
      const nearest = getNearestCorner(currentX, currentY, bounds);
      const targetPosition = getCornerPosition(nearest, bounds);
      
      controls.start({
        x: targetPosition.x,
        y: targetPosition.y,
        transition: SPRING_CONFIG,
      });
      
      if (nearest !== currentCorner) {
        setCurrentCorner(nearest);
        onCornerChange?.(nearest);
      }
    },
    [containerSize, pipSize, controls, currentCorner, onCornerChange, bottomOffset]
  );

  // ═══════════════════════════════════════════════════════════════════════════
  // DRAG CONSTRAINTS (with clamping)
  // ═══════════════════════════════════════════════════════════════════════════
  
  const bounds = calculateBounds(containerSize.width, containerSize.height, pipSize, bottomOffset);
  
  const dragConstraints = {
    top: bounds.top,
    bottom: bounds.bottom,
    left: bounds.left,
    right: bounds.right,
  };

  // ═══════════════════════════════════════════════════════════════════════════
  // RENDER
  // ═══════════════════════════════════════════════════════════════════════════
  
  // Don't render until we have dimensions
  if (containerSize.width === 0) {
    return null;
  }

  return (
    <motion.div
      ref={containerRef}
      drag
      dragMomentum={false}
      dragElastic={0.1}
      dragConstraints={dragConstraints}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      animate={controls}
      initial={false}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerCancel}
      onLostPointerCapture={handleLostPointerCapture}
      className="fixed z-50 cursor-grab active:cursor-grabbing"
      style={{
        width: pipSize.width,
        height: pipSize.height,
        willChange: 'transform',
        touchAction: 'none',
      }}
      whileDrag={{
        scale: 1.02,
        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
      }}
      transition={{
        scale: { type: 'spring', stiffness: 500, damping: 25 },
      }}
    >
      {/* Content wrapper — pointer-events:none on children to ensure tap reaches motion.div */}
      <div 
        className={`
          w-full h-full overflow-hidden rounded-xl pointer-events-none
          shadow-2xl border-2 border-white/20
          ring-2 ring-black/10
          ${isDragging ? 'ring-primary/50' : ''}
          transition-shadow duration-200
        `}
      >
        {children}
      </div>
      
      {/* Drag handle indicator (optional visual feedback) */}
      <div 
        className={`
          absolute top-1 left-1/2 -translate-x-1/2
          w-8 h-1 rounded-full bg-white/40
          opacity-0 transition-opacity duration-200
          ${isDragging ? 'opacity-100' : 'group-hover:opacity-100'}
        `}
      />
    </motion.div>
  );
}
