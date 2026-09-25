import { describe, expect, it } from "vitest";

import { messageInputSchema, postInputSchema, threadInputSchema } from "@/lib/validation/domain";

describe("domain input schemas", () => {
  it("メッセージの長さと投稿形式を検証する", () => {
    expect(messageInputSchema.safeParse({ body: "こんにちは", postMode: "anonymous" }).success).toBe(true);
    expect(messageInputSchema.safeParse({ body: "", postMode: "anonymous" }).success).toBe(false);
    expect(messageInputSchema.safeParse({ body: "ok", postMode: "invalid" }).success).toBe(false);
  });

  it("スレッド名と本文の上限を検証する", () => {
    expect(threadInputSchema.safeParse({ title: "今日の話題" }).success).toBe(true);
    expect(postInputSchema.safeParse({ body: "本文", postMode: "named" }).success).toBe(true);
    expect(postInputSchema.safeParse({ body: "x".repeat(2_001), postMode: "named" }).success).toBe(false);
  });

});