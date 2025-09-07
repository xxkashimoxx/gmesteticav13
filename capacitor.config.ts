import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'app.lovable.db2fdbae77a14dc5b1fef228448f6c8e',
  appName: 'glow-gatekeeper',
  webDir: 'dist',
  server: {
    url: 'https://db2fdbae-77a1-4dc5-b1fe-f228448f6c8e.lovableproject.com?forceHideBadge=true',
    cleartext: true
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 0
    }
  }
};

export default config;