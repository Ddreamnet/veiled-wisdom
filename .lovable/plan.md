

# WhatsApp Tarzı Video Call UI - Uygulama Planı

## Onaylanan Düzeltmeler (3 Kritik Nokta)

### 1. touch-none Düzeltmesi
- **Değişiklik:** `touch-none` sadece DraggablePiP component'ında kalacak
- **CallUI wrapper'da:** `overflow-hidden overscroll-none` kullanılacak, `touch-none` YOK

### 2. handlePiPClick Dependency Düzeltmesi
```typescript
const handlePiPClick = useCallback(() => {
  if (remoteParticipants.length > 0) {
    setIsVideoSwapped(prev => !prev);
  }
}, [remoteParticipants.length]); // Doğru dependency
```

### 3. PiP Bounds Clamping
```typescript
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
    // Negatif değer olmayacak şekilde clamp
    bottom: Math.max(SAFE_PADDING.top + 10, rawBottom),
    left: SAFE_PADDING.left,
    right: Math.max(SAFE_PADDING.left + 10, rawRight),
  };
}
```

---

## Dosya 1: `src/pages/VideoCall/components/DraggablePiP.tsx`

### Değişiklikler:

1. **Props güncelleme** (satır 16-22):
```typescript
interface DraggablePiPProps {
  children: ReactNode;
  initialCorner?: Corner;
  onCornerChange?: (corner: Corner) => void;
  onClick?: () => void;           // YENİ
  bottomOffset?: number;          // YENİ
}
```

2. **SAFE_PADDING güncelleme** (satır 41-46):
```typescript
const SAFE_PADDING = {
  top: 16,    // Status bar kaldırıldı mobilde
  left: 12,
  right: 12,
};
const DEFAULT_BOTTOM_OFFSET = 100;
```

3. **DRAG_THRESHOLD ekleme** (satır ~68):
```typescript
const DRAG_THRESHOLD = 8; // pixels - altında tap, üstünde drag
```

4. **calculateBounds fonksiyonu clamping ile güncelleme** (satır 87-98):
```typescript
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
    bottom: Math.max(SAFE_PADDING.top + 10, rawBottom),
    left: SAFE_PADDING.left,
    right: Math.max(SAFE_PADDING.left + 10, rawRight),
  };
}
```

5. **Component props güncelleme** (satır 145-149):
```typescript
export function DraggablePiP({
  children,
  initialCorner = 'bottom-right',
  onCornerChange,
  onClick,
  bottomOffset = DEFAULT_BOTTOM_OFFSET,
}: DraggablePiPProps) {
```

6. **dragStartPos ref ekleme** (satır ~157):
```typescript
const dragStartPos = useRef<{ x: number; y: number } | null>(null);
```

7. **useEffect dependency'sine bottomOffset ekleme** (satır 186-197):
```typescript
useEffect(() => {
  // ...
}, [currentCorner, containerSize, pipSize, controls, bottomOffset]); // bottomOffset eklendi
```

8. **handleDragStart güncelleme** (satır 203-212):
```typescript
const handleDragStart = useCallback((event: MouseEvent | TouchEvent | PointerEvent) => {
  setIsDragging(true);
  
  if ('touches' in event && event.touches.length > 0) {
    dragStartPos.current = { x: event.touches[0].clientX, y: event.touches[0].clientY };
  } else if ('clientX' in event) {
    dragStartPos.current = { x: event.clientX, y: event.clientY };
  }
}, []);
```

9. **handleDragEnd tap vs drag ayrımı** (satır 207-234):
```typescript
const handleDragEnd = useCallback(
  (_event: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
    setIsDragging(false);
    
    const totalMovement = Math.hypot(info.offset.x, info.offset.y);
    
    // Tap olarak kabul et
    if (totalMovement < DRAG_THRESHOLD) {
      onClick?.();
      const bounds = calculateBounds(containerSize.width, containerSize.height, pipSize, bottomOffset);
      const position = getCornerPosition(currentCorner, bounds);
      controls.start({ x: position.x, y: position.y, transition: SPRING_CONFIG });
      return;
    }
    
    // Drag - snap to corner
    const bounds = calculateBounds(containerSize.width, containerSize.height, pipSize, bottomOffset);
    const currentX = info.point.x - pipSize.width / 2;
    const currentY = info.point.y - pipSize.height / 2;
    const nearest = getNearestCorner(currentX, currentY, bounds);
    const targetPosition = getCornerPosition(nearest, bounds);
    
    controls.start({ x: targetPosition.x, y: targetPosition.y, transition: SPRING_CONFIG });
    
    if (nearest !== currentCorner) {
      setCurrentCorner(nearest);
      onCornerChange?.(nearest);
    }
  },
  [containerSize, pipSize, controls, currentCorner, onCornerChange, onClick, bottomOffset]
);
```

10. **dragConstraints clamping ile** (satır 241-246):
```typescript
const bounds = calculateBounds(containerSize.width, containerSize.height, pipSize, bottomOffset);

const dragConstraints = {
  top: bounds.top,
  bottom: bounds.bottom,
  left: bounds.left,
  right: bounds.right,
};
```

---

## Dosya 2: `src/pages/VideoCall/CallUI.tsx`

### Değişiklikler:

1. **iOS Safari scroll lock useEffect** (satır ~170 civarı ekle):
```typescript
// iOS Safari compatible scroll lock
useEffect(() => {
  const scrollY = window.scrollY;
  const originalStyles = {
    bodyOverflow: document.body.style.overflow,
    bodyPosition: document.body.style.position,
    bodyTop: document.body.style.top,
    bodyWidth: document.body.style.width,
    htmlOverflow: document.documentElement.style.overflow,
  };
  
  document.body.style.overflow = 'hidden';
  document.body.style.position = 'fixed';
  document.body.style.top = `-${scrollY}px`;
  document.body.style.width = '100%';
  document.documentElement.style.overflow = 'hidden';
  
  return () => {
    document.body.style.overflow = originalStyles.bodyOverflow;
    document.body.style.position = originalStyles.bodyPosition;
    document.body.style.top = originalStyles.bodyTop;
    document.body.style.width = originalStyles.bodyWidth;
    document.documentElement.style.overflow = originalStyles.htmlOverflow;
    window.scrollTo(0, scrollY);
  };
}, []);
```

2. **Video swap state ve control bar ölçümü** (satır ~188 civarı ekle):
```typescript
// Video swap state for PiP tap-to-swap
const [isVideoSwapped, setIsVideoSwapped] = useState(false);

// Control bar height measurement for dynamic PiP bounds
const controlBarRef = useRef<HTMLDivElement>(null);
const [controlBarHeight, setControlBarHeight] = useState(80);

useEffect(() => {
  if (!controlBarRef.current || !isMobile) return;
  
  const measureBar = () => {
    const rect = controlBarRef.current?.getBoundingClientRect();
    if (rect) {
      setControlBarHeight(rect.height + 16);
    }
  };
  
  measureBar();
  const ro = new ResizeObserver(measureBar);
  ro.observe(controlBarRef.current);
  
  return () => ro.disconnect();
}, [isMobile]);

// PiP click handler - DOĞRU DEPENDENCY
const handlePiPClick = useCallback(() => {
  if (remoteParticipants.length > 0) {
    setIsVideoSwapped(prev => !prev);
  }
}, [remoteParticipants.length]); // Düzeltilmiş dependency
```

3. **remoteParticipants hesaplama** (render içinde, satır ~500 civarı):
```typescript
const remoteParticipants = participants.filter(p => !p.local);

// Güvenli participant seçimi (swap desteği)
const mainParticipant = isVideoSwapped ? localParticipant : remoteParticipants[0];
const pipParticipant = isVideoSwapped ? remoteParticipants[0] : localParticipant;
```

4. **Ana container - touch-none YOK** (satır 511-514):
```typescript
<motion.div
  initial={{ opacity: 0 }}
  animate={{ opacity: 1 }}
  className="fixed inset-0 z-40 bg-gradient-to-br from-background via-purple-950/20 to-background flex flex-col overflow-hidden overscroll-none"
>
  {/* touch-none YOK - sadece DraggablePiP'te var */}
```

5. **Status bar mobilde gizleme** (satır 517-531):
```typescript
<motion.div
  initial={{ y: -50 }}
  animate={{ y: 0 }}
  className="hidden md:flex px-4 py-2 bg-green-500/10 border-b border-green-500/20 items-center justify-center gap-3"
>
```

6. **Mobil PiP layout** (satır 534-562):
```typescript
{isMobile ? (
  <div className="flex-1 relative">
    {/* Main video - fullscreen background */}
    {mainParticipant ? (
      <div className="absolute inset-0">
        <VideoTile 
          sessionId={mainParticipant.session_id} 
          isLocal={isVideoSwapped}
          displayName={mainParticipant.user_name || (isVideoSwapped ? 'Siz' : 'Katılımcı')}
          variant="fullscreen"
        />
      </div>
    ) : (
      <div className="absolute inset-0 flex items-center justify-center bg-background">
        <span className="text-muted-foreground">Bağlantı bekleniyor...</span>
      </div>
    )}
    
    {/* PiP video */}
    {pipParticipant && (
      <DraggablePiP 
        initialCorner="bottom-right"
        bottomOffset={controlBarHeight}
        onClick={handlePiPClick}
      >
        <VideoTile 
          sessionId={pipParticipant.session_id} 
          isLocal={!isVideoSwapped}
          displayName={pipParticipant.user_name || (!isVideoSwapped ? 'Siz' : 'Katılımcı')}
          variant="pip"
        />
      </DraggablePiP>
    )}
  </div>
) : (
  // Desktop grid layout
)}
```

7. **Control bar şeffaf overlay** (satır 614-643):
```typescript
<motion.div
  ref={controlBarRef}
  initial={{ y: 50 }}
  animate={{ y: 0 }}
  className={cn(
    "z-50 flex items-center justify-center gap-4",
    "fixed bottom-0 left-0 right-0 pb-[calc(env(safe-area-inset-bottom,20px)+8px)] pt-4",
    "md:relative md:bottom-auto md:pb-4 md:bg-background/80 md:backdrop-blur-xl md:border-t md:border-border"
  )}
>
  <ControlButton 
    variant={isMobile ? "ghost" : (isCameraOn ? "secondary" : "destructive")} 
    onClick={toggleCamera}
    withHoverScale
    className={cn(
      "h-14 w-14",
      isMobile && "bg-black/40 hover:bg-black/60 text-white backdrop-blur-sm border-0 shadow-lg"
    )}
  >
    {isCameraOn ? <Video className="h-6 w-6" /> : <VideoOff className="h-6 w-6" />}
  </ControlButton>
  
  {/* Mic ve End Call butonları benzer şekilde */}
</motion.div>
```

---

## Dosya 3: `src/pages/VideoCall/components/VideoTile.tsx`

### Değişiklikler:

1. **Fullscreen variant için object-fit: cover garantisi** (DailyVideo style):
```typescript
<DailyVideo
  sessionId={sessionId}
  type="video"
  fit="cover"
  style={{
    width: '100%',
    height: '100%',
    objectFit: 'cover', // Garantiye al
    transform: isLocal ? 'scaleX(-1)' : 'none', // Mirror for self-view
  }}
/>
```

---

## Test Kriterleri

| Test | Beklenen Sonuç |
|------|----------------|
| CallUI açıldığında navbar | Görünmemeli |
| CallUI'dan çıkıldığında navbar | Geri gelmeli |
| Mobilde CallUI scroll | Scroll olmamalı (iOS Safari dahil) |
| Remote participant yokken | Crash olmamalı, placeholder görünmeli |
| PiP'e tap | Video swap olmalı |
| PiP'i sürükle | Swap olmamalı, köşeye snap |
| PiP kontrol barını kapatıyor mu | Hayır, dinamik sınırlar |
| Bounds negatif olabilir mi | Hayır, clamp edilmiş |
| touch-none CallUI wrapper'da | YOK, sadece PiP'te |

