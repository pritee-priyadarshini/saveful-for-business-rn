export interface PushToken {
  token: string;
  platform: 'ios' | 'android';
  tokenType: 'apns' | 'fcm' | 'expo';
  tokenMode: 'prod' | 'dev';
  appVersion?: string;
  appBuild?: string;
  appBundle?: string;
}
