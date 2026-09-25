declare module "webpush-webcrypto" {
  export class ApplicationServerKeys {
    static fromJSON(keys: { publicKey: string; privateKey: string }): Promise<ApplicationServerKeys>;
  }

  export function generatePushHTTPRequest(options: {
    applicationServerKeys: ApplicationServerKeys;
    payload: string;
    target: { endpoint: string; keys: { p256dh: string; auth: string } };
    adminContact: string;
    ttl: number;
    urgency?: "very-low" | "low" | "normal" | "high";
  }): Promise<{ endpoint: string; headers: Record<string, string>; body: ArrayBuffer }>; 
}