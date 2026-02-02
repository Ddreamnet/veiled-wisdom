// ═══════════════════════════════════════════════════════════════════════════════
// DRAGGABLE PIP COMPONENT
// Floating picture-in-picture container with drag and snap-to-corner behavior
// Supports touch (mobile) and mouse (desktop) interactions
// Tap to trigger onClick, drag to snap to corners
// ═══════════════════════════════════════════════════════════════════════════════

import { useState, useRef, useCallback, useEffect, type ReactNode } from 'react';
import { motion, useAnimation, PanInfo } from 'framer-motion';

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

// Drag threshold - movements below this are considered taps
const DRAG_THRESHOLD = 8; // pixels

// PiP size configuration
const PIP_SIZE = {
  mobile: {
    widthPercent: 0.30, // 30% of container width
    aspectRatio: 16 / 9,
  },
  desktop: {
    width: 220,
    height: 124,
  },
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
 */
function getPiPSize(containerWidth: number, isMobile: boolean): Size {
  if (isMobile) {
    const width = Math.round(containerWidth * PIP_SIZE.mobile.widthPercent);
    const height = Math.round(width / PIP_SIZE.mobile.aspectRatio);
    return { width, height };
  }
  return { width: PIP_SIZE.desktop.width, height: PIP_SIZE.desktop.height };
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
  
  // Track drag start position for tap vs drag detection
  const dragStartPos = useRef<{ x: number; y: number } | null>(null);

  // ═══════════════════════════════════════════════════════════════════════════════
  // RESIZE OBSERVER
  // ═══════════════════════════════════════════════════════════════════════════════
  
  useEffect(() => {
    const updateDimensions = () => {
      // Use window dimensions as container (fixed positioning)
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

  // ═══════════════════════════════════════════════════════════════════════════════
  // POSITION UPDATES
  // ═══════════════════════════════════════════════════════════════════════════════
  
  // Update position when corner, dimensions, or bottomOffset change
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

  // ═══════════════════════════════════════════════════════════════════════════════
  // DRAG HANDLERS
  // ═══════════════════════════════════════════════════════════════════════════════
  
  const handleDragStart = useCallback((event: MouseEvent | TouchEvent | PointerEvent) => {
    setIsDragging(true);
    
    // Record start position for tap detection
    if ('touches' in event && event.touches.length > 0) {
      dragStartPos.current = { x: event.touches[0].clientX, y: event.touches[0].clientY };
    } else if ('clientX' in event) {
      dragStartPos.current = { x: (event as MouseEvent).clientX, y: (event as MouseEvent).clientY };
    }
  }, []);

  const handleDragEnd = useCallback(
    (_event: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
      setIsDragging(false);
      
      // Calculate total movement distance
      const totalMovement = Math.hypot(info.offset.x, info.offset.y);
      
      // If movement is below threshold, treat as a tap
      if (totalMovement < DRAG_THRESHOLD) {
        onClick?.();
        // Stay at current corner position
        const bounds = calculateBounds(containerSize.width, containerSize.height, pipSize, bottomOffset);
        const position = getCornerPosition(currentCorner, bounds);
        controls.start({ x: position.x, y: position.y, transition: SPRING_CONFIG });
        return;
      }
      
      // Drag detected - snap to nearest corner
      const bounds = calculateBounds(containerSize.width, containerSize.height, pipSize, bottomOffset);
      
      // Calculate current center position
      const currentX = info.point.x - pipSize.width / 2;
      const currentY = info.point.y - pipSize.height / 2;
      
      // Find nearest corner
      const nearest = getNearestCorner(currentX, currentY, bounds);
      const targetPosition = getCornerPosition(nearest, bounds);
      
      // Animate to nearest corner
      controls.start({
        x: targetPosition.x,
        y: targetPosition.y,
        transition: SPRING_CONFIG,
      });
      
      // Update state
      if (nearest !== currentCorner) {
        setCurrentCorner(nearest);
        onCornerChange?.(nearest);
      }
    },
    [containerSize, pipSize, controls, currentCorner, onCornerChange, onClick, bottomOffset]
  );

  // ═══════════════════════════════════════════════════════════════════════════════
  // DRAG CONSTRAINTS (with clamping)
  // ═══════════════════════════════════════════════════════════════════════════════
  
  const bounds = calculateBounds(containerSize.width, containerSize.height, pipSize, bottomOffset);
  
  const dragConstraints = {
    top: bounds.top,
    bottom: bounds.bottom,
    left: bounds.left,
    right: bounds.right,
  };

  // ═══════════════════════════════════════════════════════════════════════════════
  // RENDER
  // ═══════════════════════════════════════════════════════════════════════════════
  
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
      className="fixed z-50 touch-none cursor-grab active:cursor-grabbing"
      style={{
        width: pipSize.width,
        height: pipSize.height,
        willChange: 'transform',
      }}
      whileDrag={{
        scale: 1.02,
        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
      }}
      transition={{
        scale: { type: 'spring', stiffness: 500, damping: 25 },
      }}
    >
      {/* Content wrapper with rounded corners and shadow */}
      <div 
        className={`
          w-full h-full overflow-hidden rounded-xl
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
