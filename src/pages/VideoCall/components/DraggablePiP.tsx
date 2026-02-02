// ═══════════════════════════════════════════════════════════════════════════════
// DRAGGABLE PIP COMPONENT
// Floating picture-in-picture container with drag and snap-to-corner behavior
// Supports touch (mobile) and mouse (desktop) interactions
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

// Safe area paddings (UI elements + device safe areas)
const SAFE_PADDING = {
  top: 56,     // Status bar height (~44px) + margin
  bottom: 140, // Control bar (56px) + navbar (68px) + safe area + margin
  left: 12,
  right: 12,
};

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
 * Calculate safe bounds for PiP positioning
 */
function calculateBounds(
  containerWidth: number,
  containerHeight: number,
  pipSize: Size
): Bounds {
  return {
    top: SAFE_PADDING.top,
    bottom: containerHeight - SAFE_PADDING.bottom - pipSize.height,
    left: SAFE_PADDING.left,
    right: containerWidth - SAFE_PADDING.right - pipSize.width,
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
}: DraggablePiPProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const controls = useAnimation();
  
  const [currentCorner, setCurrentCorner] = useState<Corner>(initialCorner);
  const [containerSize, setContainerSize] = useState({ width: 0, height: 0 });
  const [pipSize, setPipSize] = useState<Size>({ width: 120, height: 68 });
  const [isDragging, setIsDragging] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

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
  
  // Update position when corner or dimensions change
  useEffect(() => {
    if (containerSize.width === 0 || containerSize.height === 0) return;
    
    const bounds = calculateBounds(containerSize.width, containerSize.height, pipSize);
    const position = getCornerPosition(currentCorner, bounds);
    
    controls.start({
      x: position.x,
      y: position.y,
      transition: SPRING_CONFIG,
    });
  }, [currentCorner, containerSize, pipSize, controls]);

  // ═══════════════════════════════════════════════════════════════════════════════
  // DRAG HANDLERS
  // ═══════════════════════════════════════════════════════════════════════════════
  
  const handleDragStart = useCallback(() => {
    setIsDragging(true);
  }, []);

  const handleDragEnd = useCallback(
    (_event: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
      setIsDragging(false);
      
      const bounds = calculateBounds(containerSize.width, containerSize.height, pipSize);
      
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
    [containerSize, pipSize, controls, currentCorner, onCornerChange]
  );

  // ═══════════════════════════════════════════════════════════════════════════════
  // DRAG CONSTRAINTS
  // ═══════════════════════════════════════════════════════════════════════════════
  
  const dragConstraints = {
    top: SAFE_PADDING.top,
    bottom: containerSize.height - SAFE_PADDING.bottom - pipSize.height,
    left: SAFE_PADDING.left,
    right: containerSize.width - SAFE_PADDING.right - pipSize.width,
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
