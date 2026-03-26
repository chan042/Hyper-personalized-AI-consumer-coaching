import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.duduk.app',
  appName: 'Duduk',
  webDir: 'out',
  server: {
    androidScheme: 'https',
  },
};

export default config;
