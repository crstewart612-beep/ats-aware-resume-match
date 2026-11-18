-- Subscription state for each customer.
-- Written only by the payments handler (service_role); customers can read their own row.
CREATE TABLE public.subscriptions (
  user_id uuid PRIMARY KEY,
  status text NOT NULL DEFAULT 'none',
  plan text NOT NULL DEFAULT 'free',
  provider text,
  provider_customer_id text,
  provider_subscription_id text,
  current_period_end timestamptz,
  cancel_at_period_end boolean NOT NULL DEFAULT false,
  trial_ends_at timestamptz,
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.subscriptions TO authenticated;
GRANT ALL ON public.subscriptions TO service_role;

ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY subscriptions_self_read
  ON public.subscriptions FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

-- Monthly usage counters behind the free tier.
CREATE TABLE public.usage (
  user_id uuid NOT NULL,
  month text NOT NULL,
  scores integer NOT NULL DEFAULT 0,
  rewrites integer NOT NULL DEFAULT 0,
  PRIMARY KEY (user_id, month)
);

GRANT SELECT ON public.usage TO authenticated;
GRANT ALL ON public.usage TO service_role;

ALTER TABLE public.usage ENABLE ROW LEVEL SECURITY;

CREATE POLICY usage_self_read
  ON public.usage FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

-- True when the customer holds a paying subscription that has not run out.
CREATE OR REPLACE FUNCTION public.is_paid(p_user uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.subscriptions s
    WHERE s.user_id = p_user
      AND s.status IN ('active', 'trialing')
      AND (s.current_period_end IS NULL OR s.current_period_end > now())
  );
$$;

GRANT EXECUTE ON FUNCTION public.is_paid(uuid) TO authenticated, service_role;

-- Count one use against the current month and return the new total.
-- SECURITY DEFINER so a customer cannot edit their own counters directly.
CREATE OR REPLACE FUNCTION public.record_usage(p_kind text)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user uuid := auth.uid();
  v_month text := to_char(now(), 'YYYY-MM');
  v_count integer;
BEGIN
  IF v_user IS NULL THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;
  IF p_kind NOT IN ('score', 'rewrite') THEN
    RAISE EXCEPTION 'Unknown usage kind';
  END IF;

  INSERT INTO public.usage (user_id, month, scores, rewrites)
  VALUES (
    v_user,
    v_month,
    CASE WHEN p_kind = 'score' THEN 1 ELSE 0 END,
    CASE WHEN p_kind = 'rewrite' THEN 1 ELSE 0 END
  )
  ON CONFLICT (user_id, month) DO UPDATE
  SET
    scores = public.usage.scores + CASE WHEN p_kind = 'score' THEN 1 ELSE 0 END,
    rewrites = public.usage.rewrites + CASE WHEN p_kind = 'rewrite' THEN 1 ELSE 0 END
  RETURNING
    CASE WHEN p_kind = 'score' THEN scores ELSE rewrites END
  INTO v_count;

  RETURN v_count;
END;
$$;

GRANT EXECUTE ON FUNCTION public.record_usage(text) TO authenticated, service_role;

-- What this customer may do right now, in one call, for the app to read.
CREATE OR REPLACE FUNCTION public.entitlement()
RETURNS json
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT json_build_object(
    'paid', public.is_paid(auth.uid()),
    'scores', COALESCE((
      SELECT scores FROM public.usage
      WHERE user_id = auth.uid() AND month = to_char(now(), 'YYYY-MM')
    ), 0),
    'rewrites', COALESCE((
      SELECT rewrites FROM public.usage
      WHERE user_id = auth.uid() AND month = to_char(now(), 'YYYY-MM')
    ), 0),
    'subscription', (
      SELECT json_build_object(
        'status', s.status,
        'plan', s.plan,
        'currentPeriodEnd', s.current_period_end,
        'cancelAtPeriodEnd', s.cancel_at_period_end
      )
      FROM public.subscriptions s
      WHERE s.user_id = auth.uid()
    )
  );
$$;

GRANT EXECUTE ON FUNCTION public.entitlement() TO authenticated, service_role;
