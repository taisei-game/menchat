"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import Image from "next/image";

import { useAuth } from "@/providers/auth-provider";
import { getNotificationSettings, saveNotificationSettings } from "@/lib/firestore/notifications";
import { disablePushNotifications, enablePushNotifications } from "@/lib/notifications/push";

export function SettingsView() {
  const router = useRouter();
  const { user, signOut } = useAuth();
  const [notificationPermission, setNotificationPermission] = useState<NotificationPermission | "unsupported">(() => {
    if (typeof window === "undefined" || !("Notification" in window)) return "unsupported";
    return Notification.permission;
  });
  const [notificationEnabled, setNotificationEnabled] = useState(false);
  const [notificationError, setNotificationError] = useState<string | null>(null);
  const [isSigningOut, setIsSigningOut] = useState(false);

  useEffect(() => {
    let cancelled = false;
    if (!user) return;
    void getNotificationSettings(user).then((enabled) => {
      if (!cancelled) setNotificationEnabled(enabled);
    }).catch(() => undefined);
    return () => { cancelled = true; };
  }, [user]);

  async function handleNotificationToggle() {
    if (!user) return;
    setNotificationError(null);
    try {
      if (notificationEnabled) {
        await disablePushNotifications(user);
        await saveNotificationSettings(user, false);
        setNotificationEnabled(false);
        return;
      }
      await enablePushNotifications(user);
      await saveNotificationSettings(user, true);
      setNotificationEnabled(true);
      setNotificationPermission(Notification.permission);
    } catch (error) {
      setNotificationError(error instanceof Error ? error.message : "通知設定を変更できませんでした。");
    }
  }

  async function handleSignOut() {
    setIsSigningOut(true);
    try {
      await signOut();
      router.replace("/login");
    } finally {
      setIsSigningOut(false);
    }
  }

  return (
    <div className="space-y-6">
      <header>
        <p className="text-sm font-medium text-[var(--accent)]">自分の環境</p>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight">設定</h1>
      </header>

      <section className="border border-[var(--line)] bg-white p-5">
        <p className="text-xs font-semibold tracking-[0.14em] text-[var(--muted)]">PROFILE</p>
        <div className="mt-4 flex items-center gap-4">
          {user?.photoURL ? <Image src={user.photoURL} alt="プロフィール画像" width={56} height={56} unoptimized className="h-14 w-14 rounded-full object-cover" /> : <div className="flex h-14 w-14 items-center justify-center rounded-full bg-[var(--accent-soft)] text-xl font-semibold text-[var(--accent)]" aria-hidden="true">{(user?.displayName ?? "メ").slice(0, 1)}</div>}
          <div><p className="font-semibold">{user?.displayName ?? "名前未設定"}</p><p className="mt-1 text-sm text-[var(--muted)]">LINEで認証済み</p></div>
        </div>
      </section>

      <section className="border border-[var(--line)] bg-white p-5">
        <p className="text-xs font-semibold tracking-[0.14em] text-[var(--muted)]">NOTIFICATIONS</p>
        <div className="mt-4 flex items-center justify-between gap-4">
          <div><h2 className="font-semibold">この端末の通知</h2><p className="mt-1 text-sm leading-6 text-[var(--muted)]">通知を受け取る端末ごとに設定します。HTTPSとVAPID公開鍵が必要です。</p></div>
          {notificationPermission === "unsupported" || notificationPermission === "denied" ? <span className="shrink-0 text-xs font-medium text-[var(--muted)]">{notificationPermission === "unsupported" ? "非対応" : "ブラウザで拒否されています"}</span> : <button type="button" onClick={handleNotificationToggle} className="shrink-0 bg-[var(--accent)] px-3 py-2 text-xs font-semibold text-white">{notificationEnabled ? "通知をOFF" : "通知をON"}</button>}
        </div>
        {notificationError ? <p role="alert" className="mt-3 text-sm leading-6 text-[#8d3535]">{notificationError}</p> : null}
      </section>

      <button type="button" onClick={handleSignOut} disabled={isSigningOut} className="min-h-12 w-full border border-[#e6caca] bg-white px-5 text-sm font-semibold text-[#8d3535] hover:bg-[#fff8f8] disabled:opacity-50">{isSigningOut ? "ログアウト中です…" : "ログアウト"}</button>
    </div>
  );
}