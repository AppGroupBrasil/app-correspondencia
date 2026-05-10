import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.appcorrespondencia.app',
  appName: 'App Correspondência',
  webDir: 'out',
  server: {
    url: 'https://appcorrespondencia.com.br',
    cleartext: false,
  },
};

export default config;
