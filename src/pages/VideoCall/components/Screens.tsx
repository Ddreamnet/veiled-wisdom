// ═══════════════════════════════════════════════════════════════════════════════
// VIDEO CALL SCREENS
// Loading and error screen components
// ═══════════════════════════════════════════════════════════════════════════════

import { motion } from 'framer-motion';
import { Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { LoadingScreenProps, ErrorScreenProps } from '../types';

// ═══════════════════════════════════════════════════════════════════════════════
// LOADING SCREEN
// Animated spinner with message
// ═══════════════════════════════════════════════════════════════════════════════

export function LoadingScreen({ message }: LoadingScreenProps) {
  return (
    <div className="h-screen bg-gradient-to-br from-background via-purple-950/20 to-background flex items-center justify-center">
      <motion.div 
        initial={{ opacity: 0, scale: 0.9 }} 
        animate={{ opacity: 1, scale: 1 }} 
        className="text-center space-y-4"
      >
        <motion.div 
          animate={{ rotate: 360 }} 
          transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
        >
          <Loader2 className="h-12 w-12 mx-auto text-primary" />
        </motion.div>
        <p className="text-lg text-muted-foreground">{message}</p>
      </motion.div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// ERROR SCREEN
// Simple error display with navigation button
// ═══════════════════════════════════════════════════════════════════════════════

export function ErrorScreen({ onNavigate }: ErrorScreenProps) {
  return (
    <div className="h-screen bg-gradient-to-br from-background via-purple-950/20 to-background flex items-center justify-center">
      <motion.div 
        initial={{ opacity: 0, y: 20 }} 
        animate={{ opacity: 1, y: 0 }} 
        className="text-center space-y-4"
      >
        <p className="text-lg text-destructive">Bağlantı hatası oluştu</p>
        <Button onClick={onNavigate}>Mesajlara Dön</Button>
      </motion.div>
    </div>
  );
}
