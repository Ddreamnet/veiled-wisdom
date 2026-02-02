import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'app.lovable.c391e7536d1545ab929ee1c102409f72',
  appName: 'veiled-wisdom',
  webDir: 'dist',
  server: {
    // Development için hot-reload (production'da kaldırılmalı)
    url: 'https://c391e753-6d15-45ab-929e-e1c102409f72.lovableproject.com?forceHideBadge=true',
    cleartext: true
  }
};

export default config;
