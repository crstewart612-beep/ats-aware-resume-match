// Server-only Paddle helpers. Calls go straight to Paddle's API with your own keys,
// read from environment variables at request time (never stored in code).
import { Environment, EventName, Paddle } from "@paddle/paddle-node-sdk";

export { EventName };

export type PaddleEnv = "sandbox" | "live";

const API_BASE: Record<PaddleEnv, string> = {
  sandbox: "https://sandbox-api.paddle.com",
  live: "https://api.paddle.com",
};

function getEnv(key: string): string {
  const value = process.env[key];
  if (!value) throw new Error(`${key} is not configured`);
  return value;
}

export function getConnectionApiKey(env: PaddleEnv): string {
  return env === "sandbox" ? getEnv("PADDLE_SANDBOX_API_KEY") : getEnv("PADDLE_LIVE_API_KEY");
}

export function getPaddleClient(env: PaddleEnv): Paddle {
  return new Paddle(getConnectionApiKey(env), {
    environment: env === "sandbox" ? Environment.sandbox : Environment.production,
  });
}

/** Direct REST call to Paddle. */
export async function gatewayFetch(env: PaddleEnv, path: string, init?: RequestInit): Promise<Response> {
  return fetch(`${API_BASE[env]}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${getConnectionApiKey(env)}`,
      ...init?.headers,
    },
  });
}

/** Paddle's own price id (pri_...) for the $19 pack, set per environment. */
export function packPriceId(env: PaddleEnv): string {
  return env === "sandbox" ? getEnv("PADDLE_SANDBOX_PRICE_ID") : getEnv("PADDLE_LIVE_PRICE_ID");
}

export function getWebhookSecret(env: PaddleEnv): string {
  return env === "sandbox"
    ? getEnv("PAYMENTS_SANDBOX_WEBHOOK_SECRET")
    : getEnv("PAYMENTS_LIVE_WEBHOOK_SECRET");
}

/** Confirms the request really came from the payments provider before anything is stored. */
export async function verifyWebhook(req: Request, env: PaddleEnv) {
  const signature = req.headers.get("paddle-signature");
  const body = await req.text();
  const secret = getWebhookSecret(env);

  if (!signature || !body) {
    throw new Error("Missing signature or body");
  }

  const paddle = getPaddleClient(env);
  return await paddle.webhooks.unmarshal(body, secret, signature);
}

/**
 * Which payments environment this request belongs to. Decided by the server (never the
 * customer): PAYMENTS_ENVIRONMENT=sandbox forces test mode, localhost is always test mode,
 * everything else is live.
 */
export function paymentsEnvFor(request: Request): PaddleEnv {
  if (process.env["PAYMENTS_ENVIRONMENT"] === "sandbox") return "sandbox";
  const host = new URL(request.url).hostname.toLowerCase();
  if (host === "localhost" || host === "127.0.0.1") return "sandbox";
  return "live";
}
