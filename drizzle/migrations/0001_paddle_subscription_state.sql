-- One row per customer per payments environment: test and live are separate catalogs.
ALTER TABLE public.subscriptions ADD COLUMN environment text NOT NULL DEFAULT 'sandbox';
ALTER TABLE public.subscriptions ADD COLUMN paddle_subscription_id text UNIQUE;
ALTER TABLE public.subscriptions ADD COLUMN paddle_customer_id text;
ALTER TABLE public.subscriptions ADD COLUMN product_id text;
ALTER TABLE public.subscriptions ADD COLUMN price_id text;
ALTER TABLE public.subscriptions ADD COLUMN current_period_start timestamptz;
ALTER TABLE public.subscriptions ADD COLUMN created_at timestamptz NOT NULL DEFAULT now();

COMMENT ON COLUMN public.subscriptions.provider IS 'DEPRECATED: the payments environment is now recorded in the environment column.';
COMMENT ON COLUMN public.subscriptions.provider_customer_id IS 'DEPRECATED: replaced by paddle_customer_id.';
COMMENT ON COLUMN public.subscriptions.provider_subscription_id IS 'DEPRECATED: replaced by paddle_subscription_id.';

ALTER TABLE public.subscriptions DROP CONSTRAINT subscriptions_pkey;
ALTER TABLE public.subscriptions ADD CONSTRAINT subscriptions_pkey PRIMARY KEY (user_id, environment);

-- Paid means: a trial still running, or a paid period still open, in the right environment.
CREATE OR REPLACE FUNCTION public.is_paid(p_user uuid, p_env text DEFAULT 'live')
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
      AND s.environment = p_env
      AND s.status IN ('active', 'trialing', 'past_due', 'canceled')
      AND (
        (s.trial_ends_at IS NOT NULL AND s.trial_ends_at > now())
        OR (s.current_period_end IS NOT NULL AND s.current_period_end > now())
      )
  );
$$;

GRANT EXECUTE ON FUNCTION public.is_paid(uuid, text) TO authenticated, service_role;

-- What this customer may do right now, for one environment, in a single call.
CREATE OR REPLACE FUNCTION public.entitlement(p_env text DEFAULT 'live')
RETURNS json
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT json_build_object(
    'paid', public.is_paid(auth.uid(), p_env),
    'scores', COALESCE((
      SELECT scores FROM public.usage
      WHERE user_id = auth.uid() AND month = to_char(now(), 'YYYY-MM')
    ), 0),
    'rewrites', COALESCE((
      SELECT rewrites FROM public.usage
      WHERE user_id = auth.uid() AND month = to_char(now(), 'YYYY-MM')
    ), 0),
    'trialEndsAt', (
      SELECT s.trial_ends_at FROM public.subscriptions s
      WHERE s.user_id = auth.uid() AND s.environment = p_env
      ORDER BY s.updated_at DESC LIMIT 1
    ),
    'subscription', (
      SELECT json_build_object(
        'status', s.status,
        'plan', s.plan,
        'environment', s.environment,
        'currentPeriodStart', s.current_period_start,
        'currentPeriodEnd', s.current_period_end,
        'trialEndsAt', s.trial_ends_at,
        'cancelAtPeriodEnd', s.cancel_at_period_end
      )
      FROM public.subscriptions s
      WHERE s.user_id = auth.uid() AND s.environment = p_env
      ORDER BY s.updated_at DESC LIMIT 1
    )
  );
$$;

GRANT EXECUTE ON FUNCTION public.entitlement(text) TO authenticated, service_role;

-- Retire the first versions of both helpers so there is only one way to ask.
DROP FUNCTION IF EXISTS public.entitlement();
DROP FUNCTION IF EXISTS public.is_paid(uuid);
