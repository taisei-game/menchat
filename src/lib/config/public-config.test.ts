import { describe, expect, it } from "vitest";

import { getMissingPublicConfig, type PublicConfig } from "@/lib/config/public-config";

describe("getMissingPublicConfig", () => {
  it("未設定の公開設定を一覧で返す", () => {
    const emptyConfig: PublicConfig = {
      apiBaseUrl: undefined,
      vapidPublicKey: undefined,
      liffId: undefined,
      firebase: {
        apiKey: undefined,
        authDomain: undefined,
        projectId: undefined,
        storageBucket: undefined,
        messagingSenderId: undefined,
        appId: undefined,
      },
    };
    const missing = getMissingPublicConfig(emptyConfig);

    expect(missing).toContain("NEXT_PUBLIC_LIFF_ID");
    expect(missing).toContain("NEXT_PUBLIC_FIREBASE_API_KEY");
  });
});