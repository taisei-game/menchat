import { z } from "zod";

export const lineAuthResponseSchema = z.object({
  customToken: z.string().min(1),
  displayName: z.string().optional(),
  pictureUrl: z.string().url().optional(),
});

export type LineAuthResponse = z.infer<typeof lineAuthResponseSchema>;

type AuthErrorCode =
  | "unauthorized"
  | "registration-required"
  | "invalid-registration-code"
  | "registration-closed"
  | "configuration"
  | "network"
  | "invalid-response";

export class AuthApiError extends Error {
  constructor(message: string, public readonly code: AuthErrorCode) {
    super(message);
    this.name = "AuthApiError";
  }
}

const errorResponseSchema = z.object({
  code: z.string().optional(),
  message: z.string().optional(),
});

export async function exchangeLineToken(idToken: string, registrationCode?: string): Promise<LineAuthResponse> {
  const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL;

  if (!apiBaseUrl) {
    throw new AuthApiError("認証サーバーの接続先が設定されていません。管理者に確認してください。", "configuration");
  }

  let response: Response;

  try {
    response = await fetch(`${apiBaseUrl.replace(/\/$/, "")}/auth/line`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ idToken, registrationCode: registrationCode?.trim() || undefined }),
    });
  } catch {
    throw new AuthApiError("認証サーバーに接続できません。通信環境を確認してください。", "network");
  }

  if (!response.ok) {
    let body: z.infer<typeof errorResponseSchema> = {};
    try {
      body = errorResponseSchema.parse(await response.json());
    } catch {
      // Use the generic message below when the server response is not JSON.
    }

    if (body.code === "MEMBER_REGISTRATION_REQUIRED") {
      throw new AuthApiError("初回登録パスコードを入力してください。", "registration-required");
    }
    if (body.code === "INVALID_REGISTRATION_CODE") {
      throw new AuthApiError("登録パスコードが正しくありません。", "invalid-registration-code");
    }
    if (body.code === "REGISTRATION_CLOSED") {
      throw new AuthApiError("登録枠が上限に達しています。管理者に確認してください。", "registration-closed");
    }
    if (response.status === 403) {
      throw new AuthApiError("このアカウントはmenchatの利用対象として登録されていません。", "unauthorized");
    }
    throw new AuthApiError(body.message ?? "ログインに失敗しました。時間を置いてもう一度お試しください。", "network");
  }

  try {
    return lineAuthResponseSchema.parse(await response.json());
  } catch {
    throw new AuthApiError("認証サーバーから正しい応答を受け取れませんでした。", "invalid-response");
  }
}
