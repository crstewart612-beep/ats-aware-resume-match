import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";

import { useAccess } from "@/lib/access-context";
import { PACK_PRICE_ID } from "@/lib/entitlements";
import { getPaddlePriceId, initializePaddle } from "@/lib/paddle";
import { codeForPayment } from "@/utils/access.functions";

export const PENDING_KEY = "rm_pending_payment";

/** Buy the pack and wait for its access code. `onCode` runs once the code is active on this device. */
export function usePackPurchase(onCode?: (code: string) => void, returnPath = "/") {
  const { useCode } = useAccess();
  const [busy, setBusy] = useState(false);
  const [waiting, setWaiting] = useState(false);

  const waitForCode = useCallback(
    async (transactionId: string) => {
      setWaiting(true);
      for (let i = 0; i < 100; i++) {
        const c = await codeForPayment({ data: { transactionId } }).then((r) => r.code, () => null);
        if (c) {
          localStorage.removeItem(PENDING_KEY);
          await useCode(c).catch(() => false);
          setWaiting(false);
          toast.success(`Thank you! Your access code is ${c}. Save it to use on another device.`, { duration: 12000 });
          onCode?.(c);
          return;
        }
        await new Promise((r) => setTimeout(r, 3000));
      }
      setWaiting(false);
      toast.error("Your payment went through, but the code is slow to arrive. Refresh this page in a minute.");
    },
    [useCode, onCode],
  );

  useEffect(() => {
    const pending = localStorage.getItem(PENDING_KEY);
    if (pending) void waitForCode(pending);
    // Only on first load.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const buy = async () => {
    setBusy(true);
    try {
      await initializePaddle();
      window.Paddle.Update({
        eventCallback: (e: any) => {
          if (e?.name === "checkout.completed" && e.data?.transaction_id) {
            localStorage.setItem(PENDING_KEY, e.data.transaction_id);
            window.Paddle.Checkout.close();
            void waitForCode(e.data.transaction_id);
          }
        },
      });
      const priceId = await getPaddlePriceId(PACK_PRICE_ID);
      window.Paddle.Checkout.open({
        items: [{ priceId, quantity: 1 }],
        settings: {
          displayMode: "overlay",
          successUrl: `${window.location.origin}${returnPath}`,
          variant: "one-page",
        },
      });
    } catch {
      toast.error("Checkout couldn't open. Please try again.");
    } finally {
      setBusy(false);
    }
  };

  return { buy, busy, waiting };
}
