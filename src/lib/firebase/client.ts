import { getApps, initializeApp, type FirebaseApp } from "firebase/app";

import { publicConfig } from "@/lib/config/public-config";

function getFirebaseConfig() {
  const { firebase } = publicConfig;
  const missing = Object.entries(firebase)
    .filter(([, value]) => !value)
    .map(([key]) => key);

  if (missing.length > 0) {
    throw new Error(
      `Firebaseの公開設定が不足しています: ${missing.join(", ")}`,
    );
  }

  return {
    apiKey: firebase.apiKey,
    authDomain: firebase.authDomain,
    projectId: firebase.projectId,
    storageBucket: firebase.storageBucket,
    messagingSenderId: firebase.messagingSenderId,
    appId: firebase.appId,
  };
}

export function getFirebaseApp(): FirebaseApp {
  const existingApp = getApps()[0];

  return existingApp ?? initializeApp(getFirebaseConfig());
}