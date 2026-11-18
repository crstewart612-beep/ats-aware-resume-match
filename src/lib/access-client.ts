// Browser side: the access code a customer bought and this browser's id for the free report.
const CODE_KEY = "rm_access_code";
const DEVICE_KEY = "rm_device_id";

export function deviceId(): string {
  let id = localStorage.getItem(DEVICE_KEY);
  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem(DEVICE_KEY, id);
  }
  return id;
}

export const savedCode = () => localStorage.getItem(CODE_KEY);
export const saveCode = (c: string) => localStorage.setItem(CODE_KEY, c);
export const forgetCode = () => localStorage.removeItem(CODE_KEY);

export function accessHeaders(): Record<string, string> {
  const h: Record<string, string> = { "X-Device-Id": deviceId() };
  const c = savedCode();
  if (c) h["X-Access-Code"] = c;
  return h;
}
