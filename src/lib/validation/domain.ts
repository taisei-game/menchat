import { z } from "zod";

export const postModeSchema = z.enum(["anonymous", "named"]);

export const messageInputSchema = z.object({
  body: z.string().trim().min(1, "メッセージを入力してください").max(2_000, "メッセージは2,000文字以内で入力してください"),
  postMode: postModeSchema,
});

export const threadInputSchema = z.object({
  title: z.string().trim().min(1, "スレッド名を入力してください").max(120, "スレッド名は120文字以内で入力してください"),
});

export const postInputSchema = z.object({
  body: z.string().trim().min(1, "本文を入力してください").max(2_000, "本文は2,000文字以内で入力してください"),
  postMode: postModeSchema,
});

export type MessageInput = z.infer<typeof messageInputSchema>;
export type ThreadInput = z.infer<typeof threadInputSchema>;
export type PostInput = z.infer<typeof postInputSchema>;