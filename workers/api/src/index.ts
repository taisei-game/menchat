import { createRemoteJWKSet, importPKCS8, jwtVerify, SignJWT } from "jose";
import { z } from "zod";
import { ApplicationServerKeys, generatePushHTTPRequest } from "webpush-webcrypto";

interface Env {
  CORS_ORIGIN: string;
  FIREBASE_CLIENT_EMAIL: string;
  FIREBASE_PRIVATE_KEY: string;
  FIREBASE_PROJECT_ID: string;
  LINE_CHANNEL_ID: string;
  PUSH_TRIGGER_SECRET: string;
  VAPID_PRIVATE_KEY: string;
  VAPID_SUBJECT: string;
}

const authRequestSchema = z.object({
  idToken: z.string().min(1).max(16_000),
});

const lineVerifyResponseSchema = z.object({
  sub: z.string().min(1),
  name: z.string().min(1).max(80).optional(),
  picture: z.string().url().optional(),
});

const googleTokenResponseSchema = z.object({
  access_token: z.string().min(1),
});

const pushNotificationSchema = z.object({
  title: z.string().min(1).max(80),
  body: z.string().min(1).max(240),
  url: z.string().regex(/^\/(talk|board|shorts)(\/.*)?$/),
});
const notificationDispatchSchema = z.object({
  category: z.enum(["talk", "board", "shorts"]),
  documentId: z.string().min(1).max(200),
  threadId: z.string().min(1).max(200).optional(),
});

const firebaseJwks = createRemoteJWKSet(
  new URL("https://www.googleapis.com/service_accounts/v1/jwk/securetoken@system.gserviceaccount.com"),
);

const FIREBASE_CUSTOM_TOKEN_AUDIENCE =
  "https://identitytoolkit.googleapis.com/google.identity.identitytoolkit.v1.IdentityToolkit";
const GOOGLE_TOKEN_AUDIENCE = "https://oauth2.googleapis.com/token";

function jsonResponse(body: unknown, status: number, origin: string): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "access-control-allow-origin": origin,
      "access-control-allow-headers": "authorization, content-type, x-push-trigger-secret",
      "access-control-allow-methods": "POST, OPTIONS",
      "cache-control": "no-store",
    },
  });
}

function normalizePrivateKey(value: string): string {
  return value.replace(/\\n/g, "\n");
}

async function verifyLineToken(idToken: string, channelId: string) {
  const response = await fetch("https://api.line.me/oauth2/v2.1/verify", {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ id_token: idToken, client_id: channelId }),
  });

  if (!response.ok) {
    throw new Error("LINE token verification failed");
  }

  return lineVerifyResponseSchema.parse(await response.json());
}

async function createGoogleAccessToken(env: Env): Promise<string> {
  const privateKey = await importPKCS8(normalizePrivateKey(env.FIREBASE_PRIVATE_KEY), "RS256");
  const assertion = await new SignJWT({ scope: "https://www.googleapis.com/auth/datastore" })
    .setProtectedHeader({ alg: "RS256", typ: "JWT" })
    .setIssuer(env.FIREBASE_CLIENT_EMAIL)
    .setSubject(env.FIREBASE_CLIENT_EMAIL)
    .setAudience(GOOGLE_TOKEN_AUDIENCE)
    .setIssuedAt()
    .setExpirationTime("1h")
    .sign(privateKey);

  const response = await fetch(GOOGLE_TOKEN_AUDIENCE, {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion,
    }),
  });

  if (!response.ok) {
    throw new Error("Google access token request failed");
  }

  return googleTokenResponseSchema.parse(await response.json()).access_token;
}

async function isAllowedMember(env: Env, lineUserId: string, accessToken: string): Promise<boolean> {
  const memberId = encodeURIComponent(`line:${lineUserId}`);
  const response = await fetch(
    `https://firestore.googleapis.com/v1/projects/${encodeURIComponent(env.FIREBASE_PROJECT_ID)}/databases/(default)/documents/members/${memberId}`,
    { headers: { authorization: `Bearer ${accessToken}` } },
  );

  if (response.status === 404) {
    return false;
  }

  if (!response.ok) {
    throw new Error("Firestore member lookup failed");
  }

  const document = (await response.json()) as {
    fields?: { isActive?: { booleanValue?: boolean } };
  };

  return document.fields?.isActive?.booleanValue === true;
}

async function syncMemberProfile(
  env: Env,
  accessToken: string,
  lineUserId: string,
  profile: { displayName?: string; pictureUrl?: string },
): Promise<void> {
  const fields: Record<string, { stringValue?: string; timestampValue?: string }> = {
    lastLoginAt: { timestampValue: new Date().toISOString() },
  };
  if (profile.displayName) fields.displayName = { stringValue: profile.displayName };
  if (profile.pictureUrl) fields.photoURL = { stringValue: profile.pictureUrl };
  const memberId = encodeURIComponent(`line:${lineUserId}`);
  const updateMask = Object.keys(fields).map((field) => `updateMask.fieldPaths=${encodeURIComponent(field)}`).join("&");
  const response = await fetch(
    `https://firestore.googleapis.com/v1/projects/${encodeURIComponent(env.FIREBASE_PROJECT_ID)}/databases/(default)/documents/members/${memberId}?${updateMask}`,
    {
      method: "PATCH",
      headers: { authorization: `Bearer ${accessToken}`, "content-type": "application/json" },
      body: JSON.stringify({ fields }),
    },
  );
  if (!response.ok) throw new Error("Member profile synchronization failed");
}

async function createFirebaseCustomToken(env: Env, lineUserId: string): Promise<string> {
  const privateKey = await importPKCS8(normalizePrivateKey(env.FIREBASE_PRIVATE_KEY), "RS256");

  return new SignJWT({
    uid: `line:${lineUserId}`,
    claims: { lineUserId, role: "member" },
  })
    .setProtectedHeader({ alg: "RS256", typ: "JWT" })
    .setIssuer(env.FIREBASE_CLIENT_EMAIL)
    .setSubject(env.FIREBASE_CLIENT_EMAIL)
    .setAudience(FIREBASE_CUSTOM_TOKEN_AUDIENCE)
    .setIssuedAt()
    .setExpirationTime("1h")
    .sign(privateKey);
}

async function authenticateFirebase(request: Request, env: Env): Promise<{ uid: string; lineUserId: string }> {
  const header = request.headers.get("authorization");
  const token = header?.startsWith("Bearer ") ? header.slice(7) : null;
  if (!token) throw new Error("Missing Firebase token");

  const { payload } = await jwtVerify(token, firebaseJwks, {
    audience: env.FIREBASE_PROJECT_ID,
    issuer: `https://securetoken.google.com/${env.FIREBASE_PROJECT_ID}`,
  });
  const uid = typeof payload.sub === "string" ? payload.sub : "";
  const lineUserId = typeof payload.lineUserId === "string" ? payload.lineUserId : uid.replace(/^line:/, "");
  if (!uid || !lineUserId || !(await isAllowedMember(env, lineUserId, await createGoogleAccessToken(env)))) {
    throw new Error("Member is not allowed");
  }
  return { uid, lineUserId };
}

async function handleLineAuth(request: Request, env: Env): Promise<Response> {
  let payload: z.infer<typeof authRequestSchema>;
  try {
    payload = authRequestSchema.parse(await request.json());
  } catch {
    return jsonResponse({ message: "認証情報の形式が正しくありません。" }, 400, env.CORS_ORIGIN);
  }

  try {
    const lineProfile = await verifyLineToken(payload.idToken, env.LINE_CHANNEL_ID);
    const googleAccessToken = await createGoogleAccessToken(env);
    if (!(await isAllowedMember(env, lineProfile.sub, googleAccessToken))) {
      return jsonResponse({ message: "利用対象外のアカウントです。" }, 403, env.CORS_ORIGIN);
    }
    try {
      await syncMemberProfile(env, googleAccessToken, lineProfile.sub, { displayName: lineProfile.name, pictureUrl: lineProfile.picture });
    } catch (profileError) {
      console.error("LINE profile synchronization failed", profileError);
    }
    const customToken = await createFirebaseCustomToken(env, lineProfile.sub);
    return jsonResponse({ customToken, displayName: lineProfile.name, pictureUrl: lineProfile.picture }, 200, env.CORS_ORIGIN);
  } catch (error) {
    console.error("LINE authentication failed", error);
    return jsonResponse({ message: "ログイン処理に失敗しました。時間を置いて再試行してください。" }, 502, env.CORS_ORIGIN);
  }
}

type FirestoreDocument = { name: string; fields?: Record<string, FirestoreValue> };
type FirestoreValue = { stringValue?: string; mapValue?: { fields?: Record<string, FirestoreValue> }; integerValue?: string };

function stringField(fields: Record<string, FirestoreValue> | undefined, key: string): string | null {
  const value = fields?.[key]?.stringValue;
  return typeof value === "string" ? value : null;
}

function parsePushSubscription(document: FirestoreDocument) {
  const keys = document.fields?.keys?.mapValue?.fields;
  const endpoint = stringField(document.fields, "endpoint");
  const p256dh = stringField(keys, "p256dh");
  const auth = stringField(keys, "auth");
  const ownerUid = stringField(document.fields, "ownerUid");
  if (!endpoint || !p256dh || !auth || !ownerUid) return null;
  return { documentName: document.name, ownerUid, endpoint, keys: { p256dh, auth } };
}

async function activePushSubscriptions(env: Env, accessToken: string) {
  const subscriptions = await listPushSubscriptions(env, accessToken);
  const results = await Promise.all(subscriptions.map(async (subscription) => {
    const lineUserId = subscription.ownerUid.startsWith("line:") ? subscription.ownerUid.slice(5) : null;
    if (!lineUserId || !(await isAllowedMember(env, lineUserId, accessToken))) return null;
    return subscription;
  }));
  return results.filter((subscription): subscription is NonNullable<(typeof results)[number]> => subscription !== null);
}

async function listPushSubscriptions(env: Env, accessToken: string) {
  const response = await fetch(
    `https://firestore.googleapis.com/v1/projects/${encodeURIComponent(env.FIREBASE_PROJECT_ID)}/databases/(default)/documents/notificationSubscriptions?pageSize=100`,
    { headers: { authorization: `Bearer ${accessToken}` } },
  );
  if (!response.ok) throw new Error("Push subscription lookup failed");
  const body = (await response.json()) as { documents?: FirestoreDocument[] };
  return (body.documents ?? []).map(parsePushSubscription).filter((subscription): subscription is NonNullable<ReturnType<typeof parsePushSubscription>> => subscription !== null);
}

async function deleteFirestoreDocument(env: Env, accessToken: string, name: string): Promise<void> {
  await fetch(`https://firestore.googleapis.com/v1/${name}`, { method: "DELETE", headers: { authorization: `Bearer ${accessToken}` } });
}

function eventDocumentPath(payload: z.infer<typeof notificationDispatchSchema>): string {
  if (payload.category === "talk") return `talkRooms/general/messages/${encodeURIComponent(payload.documentId)}`;
  if (payload.category === "shorts") return `shorts/${encodeURIComponent(payload.documentId)}`;
  if (!payload.threadId) throw new Error("Board notification requires threadId");
  return `boardThreads/${encodeURIComponent(payload.threadId)}/posts/${encodeURIComponent(payload.documentId)}`;
}

async function getFirestoreDocument(env: Env, accessToken: string, path: string): Promise<FirestoreDocument | null> {
  const response = await fetch(
    `https://firestore.googleapis.com/v1/projects/${encodeURIComponent(env.FIREBASE_PROJECT_ID)}/databases/(default)/documents/${path}`,
    { headers: { authorization: `Bearer ${accessToken}` } },
  );
  if (response.status === 404) return null;
  if (!response.ok) throw new Error("Firestore event lookup failed");
  return (await response.json()) as FirestoreDocument;
}

async function sendPushToOtherMembers(env: Env, accessToken: string, senderUid: string, payload: { title: string; body: string; url: string }): Promise<void> {
  const subscriptions = (await activePushSubscriptions(env, accessToken)).filter((subscription) => subscription.ownerUid !== senderUid);
  const applicationServerKeys = await ApplicationServerKeys.fromJSON(JSON.parse(env.VAPID_PRIVATE_KEY) as { publicKey: string; privateKey: string });
  await Promise.all(subscriptions.map(async (subscription) => {
    const pushRequest = await generatePushHTTPRequest({
      applicationServerKeys,
      payload: JSON.stringify(payload),
      target: { endpoint: subscription.endpoint, keys: subscription.keys },
      adminContact: env.VAPID_SUBJECT,
      ttl: 300,
      urgency: "normal",
    });
    const response = await fetch(pushRequest.endpoint, { method: "POST", headers: pushRequest.headers, body: pushRequest.body });
    if (response.status === 404 || response.status === 410) await deleteFirestoreDocument(env, accessToken, subscription.documentName);
  }));
}

async function handleNotificationDispatch(request: Request, env: Env): Promise<Response> {
  const { uid } = await authenticateFirebase(request, env);
  const payload = notificationDispatchSchema.parse(await request.json());
  const accessToken = await createGoogleAccessToken(env);
  const document = await getFirestoreDocument(env, accessToken, eventDocumentPath(payload));
  const ownerField = payload.category === "shorts" ? "ownerUid" : "authorUid";
  if (!document || stringField(document.fields, ownerField) !== uid) {
    return jsonResponse({ message: "通知対象の投稿を確認できません。" }, 403, env.CORS_ORIGIN);
  }
  const dispatchId = `${payload.category}:${payload.threadId ?? "general"}:${payload.documentId}`;
  if (!(await claimNotificationDispatch(env, accessToken, dispatchId, uid))) {
    return jsonResponse({ ok: true, duplicate: true }, 200, env.CORS_ORIGIN);
  }
  const url = payload.category === "talk" ? "/talk" : payload.category === "shorts" ? "/shorts" : `/board/${payload.threadId}`;
  const title = payload.category === "talk" ? "新しいトーク" : payload.category === "shorts" ? "新しいショート" : "掲示板に新しい返信";
  await sendPushToOtherMembers(env, accessToken, uid, { title, body: "menchatに新しい投稿があります。", url });
  return jsonResponse({ ok: true }, 200, env.CORS_ORIGIN);
}

async function claimNotificationDispatch(env: Env, accessToken: string, dispatchId: string, ownerUid: string): Promise<boolean> {
  const response = await fetch(
    `https://firestore.googleapis.com/v1/projects/${encodeURIComponent(env.FIREBASE_PROJECT_ID)}/databases/(default)/documents/notificationDispatches?documentId=${encodeURIComponent(dispatchId)}`,
    {
      method: "POST",
      headers: { authorization: `Bearer ${accessToken}`, "content-type": "application/json" },
      body: JSON.stringify({ fields: { ownerUid: { stringValue: ownerUid }, createdAt: { timestampValue: new Date().toISOString() } } }),
    },
  );
  if (response.status === 409) return false;
  if (!response.ok) throw new Error("Notification dispatch claim failed");
  return true;
}

async function handlePushSend(request: Request, env: Env): Promise<Response> {
  if (request.headers.get("x-push-trigger-secret") !== env.PUSH_TRIGGER_SECRET) {
    return jsonResponse({ message: "通知送信の権限がありません。" }, 403, env.CORS_ORIGIN);
  }
  const payload = pushNotificationSchema.parse(await request.json());
  const accessToken = await createGoogleAccessToken(env);
  const subscriptions = await activePushSubscriptions(env, accessToken);
  const applicationServerKeys = await ApplicationServerKeys.fromJSON(JSON.parse(env.VAPID_PRIVATE_KEY) as { publicKey: string; privateKey: string });
  const results = await Promise.all(subscriptions.map(async (subscription) => {
    const pushRequest = await generatePushHTTPRequest({
      applicationServerKeys,
      payload: JSON.stringify(payload),
      target: { endpoint: subscription.endpoint, keys: subscription.keys },
      adminContact: env.VAPID_SUBJECT,
      ttl: 300,
      urgency: "normal",
    });
    const response = await fetch(pushRequest.endpoint, { method: "POST", headers: pushRequest.headers, body: pushRequest.body });
    if (response.status === 404 || response.status === 410) {
      await deleteFirestoreDocument(env, accessToken, subscription.documentName);
    }
    return response.ok;
  }));
  return jsonResponse({ sent: results.filter(Boolean).length, total: results.length }, 200, env.CORS_ORIGIN);
}

const worker = {
  async fetch(request: Request, env: Env): Promise<Response> {
    const origin = request.headers.get("origin");
    const allowedOrigin = origin === env.CORS_ORIGIN ? origin : env.CORS_ORIGIN;

    if (request.method === "OPTIONS") {
      return jsonResponse({}, 204, allowedOrigin);
    }

    const url = new URL(request.url);

    if (url.pathname === "/health" && request.method === "GET") {
      return jsonResponse({ ok: true }, 200, allowedOrigin);
    }

    if (url.pathname === "/auth/line" && request.method === "POST") {
      return handleLineAuth(request, { ...env, CORS_ORIGIN: allowedOrigin });
    }

    if (url.pathname === "/notifications/send" && request.method === "POST") {
      try {
        return await handlePushSend(request, { ...env, CORS_ORIGIN: allowedOrigin });
      } catch (error) {
        console.error("Push notification send failed", error);
        return jsonResponse({ message: "通知を送信できませんでした。" }, 400, allowedOrigin);
      }
    }

    if (url.pathname === "/notifications/dispatch" && request.method === "POST") {
      try {
        return await handleNotificationDispatch(request, { ...env, CORS_ORIGIN: allowedOrigin });
      } catch (error) {
        console.error("Notification dispatch failed", error);
        return jsonResponse({ message: "通知を送信できませんでした。" }, 400, allowedOrigin);
      }
    }

    return jsonResponse({ message: "指定されたAPIは存在しません。" }, 404, allowedOrigin);
  },
};

export default worker;