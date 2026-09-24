import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'za.co.kudstore.app',
  appName: 'KUD Store',
  webDir: 'dist',
  server: {
    androidScheme: 'https',
  },
};

export default config;
