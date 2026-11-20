// Server function: returns Paddle's price id for the pack in the server's payments environment.
import { createServerFn } from "@tanstack/react-start";
import { getRequest } from "@tanstack/react-start/server";

import { packPriceId, paymentsEnvFor, type PaddleEnv } from "@/lib/paddle.server";

export const resolvePaddlePrice = createServerFn({ method: "GET" })
  .inputValidator((data: { priceId: string; environment: PaddleEnv }) => data)
  .handler(async () => packPriceId(paymentsEnvFor(getRequest())));
