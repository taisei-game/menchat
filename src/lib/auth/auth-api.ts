import { z } from "zod";

export const lineAuthResponseSchema = z.object({
  customToken: z.string().min(1),
  displayName: z.string().optional(),
  pictureUrl: z.string().url().optional(),
});

export type LineAuthResponse = z.infer<typeof lineAuthResponseSchema>;

export class AuthApiError extends Error {
  constructor(
    message: string,
    public readonly code: "unauthorized" | "configuration" | "network" | "invalid-response",
  ) {
    super(message);
    this.name = "AuthApiError";
  }
}

export async function exchangeLineToken(idToken: string): Promise<LineAuthResponse> {
  const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL;

  if (!apiBaseUrl) {
    throw new AuthApiError("認証サーバーの接続先が設定されていません。管理者に確認してください。", "configuration");
  }

  let response: Response;

  try {
    response = await fetch(`${apiBaseUrl.replace(/\/$/, "")}/auth/line`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ idToken }),
    });
  } catch {
    throw new AuthApiError("認証サーバーに接続できません。通信環境を確認してください。", "network");
  }

  if (response.status === 403) {
    throw new AuthApiError("このアカウントはmenchatの利用対象として登録されていません。", "unauthorized");
  }

  if (!response.ok) {
    throw new AuthApiError("ログインに失敗しました。時間を置いてもう一度お試しください。", "network");
  }

  try {
    return lineAuthResponseSchema.parse(await response.json());
  } catch {
    throw new AuthApiError("認証サーバーから正しい応答を受け取れませんでした。", "invalid-response");
  }
}