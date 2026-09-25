export type PublicConfig = {
  apiBaseUrl: string | undefined;
  vapidPublicKey: string | undefined;
  liffId: string | undefined;
  firebase: {
    apiKey: string | undefined;
    authDomain: string | undefined;
    projectId: string | undefined;
    storageBucket: string | undefined;
    messagingSenderId: string | undefined;
    appId: string | undefined;
  };
};

export const publicConfig: PublicConfig = {
  apiBaseUrl: process.env.NEXT_PUBLIC_API_BASE_URL,
  vapidPublicKey: process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY,
  liffId: process.env.NEXT_PUBLIC_LIFF_ID,
  firebase: {
    apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
    authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
    storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
    appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  },
};

export function getMissingPublicConfig(config: PublicConfig = publicConfig): string[] {
  const missing: string[] = [];

  if (!config.apiBaseUrl) {
    missing.push("NEXT_PUBLIC_API_BASE_URL");
  }

  if (!config.liffId) {
    missing.push("NEXT_PUBLIC_LIFF_ID");
  }

  for (const [key, value] of Object.entries(config.firebase)) {
    if (!value) {
      missing.push(`NEXT_PUBLIC_FIREBASE_${key.replace(/[A-Z]/g, (letter) => `_${letter}`).toUpperCase()}`);
    }
  }

  return missing;
}