import { useQueryClient } from "@tanstack/react-query";
import { useRouter } from "@tanstack/react-router";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";

import { EMPTY_ENTITLEMENT, toEntitlement, type Entitlement } from "@/lib/entitlements";
import { getPaddleEnvironment } from "@/lib/paddle";
import { supabase } from "@/integrations/supabase/client";

type SessionValue = {
  /** Null means a visitor who hasn't signed in. */
  userId: string | null;
  email: string | null;
  /** False until the app knows whether this visitor is signed in. */
  ready: boolean;
  entitlement: Entitlement;
  refresh: () => Promise<void>;
  signOut: () => Promise<void>;
};

const SessionContext = createContext<SessionValue | null>(null);

/**
 * The one place that watches the sign-in state, so pages never subscribe themselves.
 * Mounted once in the root route.
 */
export function SessionProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const queryClient = useQueryClient();

  const [userId, setUserId] = useState<string | null>(null);
  const [email, setEmail] = useState<string | null>(null);
  const [ready, setReady] = useState(false);
  const [entitlement, setEntitlement] = useState<Entitlement>(EMPTY_ENTITLEMENT);

  const refresh = useCallback(async () => {
    const { data, error } = await supabase.rpc("entitlement", { p_env: getPaddleEnvironment() });
    if (error) {
      setEntitlement(EMPTY_ENTITLEMENT);
      return;
    }
    setEntitlement(toEntitlement(data));
  }, []);

  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
  }, []);

  useEffect(() => {
    let alive = true;

    const boot = async () => {
      const { data } = await supabase.auth.getSession();
      if (!alive) return;
      setUserId(data.session?.user.id ?? null);
      setEmail(data.session?.user.email ?? null);
      setReady(true);
      if (data.session) await refresh();
    };
    void boot();

    const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
      // Ignore TOKEN_REFRESHED and INITIAL_SESSION: they fire hourly and on every mount.
      if (event !== "SIGNED_IN" && event !== "SIGNED_OUT" && event !== "USER_UPDATED") return;
      setUserId(session?.user.id ?? null);
      setEmail(session?.user.email ?? null);
      if (!session) setEntitlement(EMPTY_ENTITLEMENT);
      else void refresh();
      router.invalidate();
      if (event !== "SIGNED_OUT") queryClient.invalidateQueries();
    });

    return () => {
      alive = false;
      sub.subscription.unsubscribe();
    };
  }, [refresh, router, queryClient]);

  return (
    <SessionContext.Provider
      value={{ userId, email, ready, entitlement, refresh, signOut }}
    >
      {children}
    </SessionContext.Provider>
  );
}

/** Read the signed-in customer and what they may do. Must be used under SessionProvider. */
export function useSession(): SessionValue {
  const value = useContext(SessionContext);
  if (!value) throw new Error("useSession must be used inside SessionProvider");
  return value;
}
