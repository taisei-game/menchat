import { deleteDoc, doc, getDoc, serverTimestamp, setDoc } from "firebase/firestore";
import type { User } from "firebase/auth";

import { getFirestoreDb } from "@/lib/firebase/firestore";

export type StoredPushSubscription = {
  endpoint: string;
  expirationTime: number | null;
  keys: { p256dh: string; auth: string };
};

async function subscriptionId(endpoint: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(endpoint));
  return Array.from(new Uint8Array(digest), (value) => value.toString(16).padStart(2, "0")).join("");
}

export async function savePushSubscription(user: User, subscription: StoredPushSubscription): Promise<void> {
  const id = await subscriptionId(subscription.endpoint);
  await setDoc(doc(getFirestoreDb(), "notificationSubscriptions", id), {
    ownerUid: user.uid,
    ...subscription,
    updatedAt: serverTimestamp(),
  });
}

export async function removePushSubscription(subscription: PushSubscription): Promise<void> {
  const id = await subscriptionId(subscription.endpoint);
  await deleteDoc(doc(getFirestoreDb(), "notificationSubscriptions", id));
}

export async function saveNotificationSettings(user: User, enabled: boolean): Promise<void> {
  await setDoc(doc(getFirestoreDb(), "notificationSettings", user.uid), {
    ownerUid: user.uid,
    enabled,
    updatedAt: serverTimestamp(),
  }, { merge: true });
}

export async function getNotificationSettings(user: User): Promise<boolean> {
  const snapshot = await getDoc(doc(getFirestoreDb(), "notificationSettings", user.uid));
  return snapshot.exists() && snapshot.data().enabled === true;
}