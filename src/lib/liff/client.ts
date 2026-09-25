import liff from "@line/liff";

import { publicConfig } from "@/lib/config/public-config";

export async function initializeLiff(): Promise<void> {
  if (!publicConfig.liffId) {
    throw new Error("LIFF IDが設定されていません。管理者に確認してください。");
  }

  await liff.init({ liffId: publicConfig.liffId });
}