CREATE TABLE public.purchases (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  environment text NOT NULL DEFAULT 'sandbox',
  paddle_transaction_id text NOT NULL UNIQUE,
  price_id text NOT NULL,
  reports integer NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.purchases TO authenticated;
GRANT ALL ON public.purchases TO service_role;

ALTER TABLE public.purchases ENABLE ROW LEVEL SECURITY;

CREATE POLICY purchases_self_read
  ON public.purchases FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE INDEX purchases_user_env ON public.purchases (user_id, environment);

COMMENT ON TABLE public.subscriptions IS 'DEPRECATED: the app sells one-time report packs (public.purchases) instead of subscriptions.';

CREATE OR REPLACE FUNCTION public.entitlement(p_env text DEFAULT 'live')
RETURNS json
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT json_build_object(
    'purchased', COALESCE((
      SELECT sum(p.reports) FROM public.purchases p
      WHERE p.user_id = auth.uid() AND p.environment = p_env
    ), 0),
    'scores', COALESCE((SELECT sum(u.scores) FROM public.usage u WHERE u.user_id = auth.uid()), 0),
    'rewrites', COALESCE((SELECT sum(u.rewrites) FROM public.usage u WHERE u.user_id = auth.uid()), 0)
  );
$$;

GRANT EXECUTE ON FUNCTION public.entitlement(text) TO authenticated, service_role;
