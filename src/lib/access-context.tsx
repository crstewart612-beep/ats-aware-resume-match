import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";

import { deviceId, forgetCode, saveCode, savedCode } from "@/lib/access-client";
import { checkAccess } from "@/utils/access.functions";

type Status = { reports: number; scoresLeft: number; rewritesLeft: number };
type AccessValue = {
  code: string | null;
  status: Status | null;
  /** "1 of 1 free report left" or "7 of 10 reports left". */
  allowance: string;
  refresh: () => Promise<void>;
  /** Returns false when the code doesn't exist. */
  useCode: (code: string) => Promise<boolean>;
  clearCode: () => void;
};

const Ctx = createContext<AccessValue | null>(null);

export function AccessProvider({ children }: { children: ReactNode }) {
  const [code, setCode] = useState<string | null>(null);
  const [status, setStatus] = useState<Status | null>(null);

  const load = useCallback(async (c: string | null) => {
    const r = await checkAccess({ data: { code: c, device: deviceId() } });
    if (r.kind === "invalid") return false;
    setCode(r.code);
    setStatus({ reports: r.reports, scoresLeft: r.scoresLeft, rewritesLeft: r.rewritesLeft });
    return true;
  }, []);

  const refresh = useCallback(async () => {
    const c = savedCode();
    if (!(await load(c)) && c) {
      forgetCode();
      await load(null);
    }
  }, [load]);

  useEffect(() => {
    // A dropped connection (e.g. leaving the page mid-check) must not crash the app.
    refresh().catch(() => {});
  }, [refresh]);

  const useCode = useCallback(
    async (raw: string) => {
      const ok = await load(raw);
      if (ok) saveCode(raw.trim().toUpperCase().replace(/\s+/g, ""));
      return ok;
    },
    [load],
  );

  const clearCode = useCallback(() => {
    forgetCode();
    void load(null);
  }, [load]);

  const allowance = !status
    ? ""
    : code
      ? `${status.scoresLeft} of ${status.reports} reports left`
      : "Payment needed";

  return <Ctx.Provider value={{ code, status, allowance, refresh, useCode, clearCode }}>{children}</Ctx.Provider>;
}

export function useAccess(): AccessValue {
  const v = useContext(Ctx);
  if (!v) throw new Error("useAccess must be used inside AccessProvider");
  return v;
}
