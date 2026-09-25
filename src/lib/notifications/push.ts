import type { User } from "firebase/auth";

import { removePushSubscription, savePushSubscription, type StoredPushSubscription } from "@/lib/firestore/notifications";

function getVapidPublicKey(): string {
  const key = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  if (!key) throw new Error("プッシュ通知の公開鍵が設定されていません。管理者に確認してください。");
  return key;
}

function decodeBase64Url(value: string): Uint8Array {
  const padded = `${value}${"=".repeat((4 - (value.length % 4)) % 4)}`.replace(/-/g, "+").replace(/_/g, "/");
  return Uint8Array.from(atob(padded), (character) => character.charCodeAt(0));
}

function decodeBase64UrlBuffer(value: string): ArrayBuffer {
  return decodeBase64Url(value).buffer as ArrayBuffer;
}

function toStoredSubscription(subscription: PushSubscription): StoredPushSubscription {
  const json = subscription.toJSON();
  if (!json.endpoint || !json.keys?.p256dh || !json.keys.auth) {
    throw new Error("この端末からプッシュ通知の購読情報を取得できませんでした。");
  }
  return { endpoint: json.endpoint, expirationTime: json.expirationTime ?? null, keys: { p256dh: json.keys.p256dh, auth: json.keys.auth } };
}

export function canUsePushNotifications(): boolean {
  return typeof window !== "undefined" && "Notification" in window && "serviceWorker" in navigator && "PushManager" in window;
}

export async function enablePushNotifications(user: User): Promise<void> {
  if (!canUsePushNotifications()) throw new Error("この端末またはブラウザではプッシュ通知を利用できません。");
  const permission = await Notification.requestPermission();
  if (permission !== "granted") throw new Error("通知が許可されませんでした。ブラウザの通知設定を確認してください。");
  const registration = await navigator.serviceWorker.ready;
  const subscription = await registration.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: decodeBase64UrlBuffer(getVapidPublicKey()) });
  await savePushSubscription(user, toStoredSubscription(subscription));
}

export async function disablePushNotifications(user: User): Promise<void> {
  if (!canUsePushNotifications()) return;
  const registration = await navigator.serviceWorker.ready;
  const subscription = await registration.pushManager.getSubscription();
  if (!subscription) return;
  await removePushSubscription(subscription);
  await subscription.unsubscribe();
  void user;
}

export async function dispatchNotification(
  user: User,
  event: { category: "talk" | "board" | "shorts"; documentId: string; threadId?: string },
): Promise<void> {
  const baseUrl = process.env.NEXT_PUBLIC_API_BASE_URL;
  if (!baseUrl) return;
  await fetch(`${baseUrl.replace(/\/$/, "")}/notifications/dispatch`, {
    method: "POST",
    headers: { authorization: `Bearer ${await user.getIdToken()}`, "content-type": "application/json" },
    body: JSON.stringify(event),
  });
}