CREATE TABLE public.access_codes (
  code text PRIMARY KEY,
  environment text NOT NULL DEFAULT 'sandbox',
  paddle_transaction_id text UNIQUE NOT NULL,
  reports integer NOT NULL DEFAULT 10,
  scores_used integer NOT NULL DEFAULT 0,
  rewrites_used integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT ALL ON public.access_codes TO service_role;
ALTER TABLE public.access_codes ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.free_tries (
  device_id text PRIMARY KEY,
  scores_used integer NOT NULL DEFAULT 0,
  rewrites_used integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT ALL ON public.free_tries TO service_role;
ALTER TABLE public.free_tries ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.use_access(p_code text, p_device text, p_kind text)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE n int;
BEGIN
  IF p_code IS NOT NULL THEN
    IF p_kind = 'score' THEN
      UPDATE access_codes SET scores_used = scores_used + 1 WHERE code = p_code AND scores_used < reports;
    ELSE
      UPDATE access_codes SET rewrites_used = rewrites_used + 1 WHERE code = p_code AND rewrites_used < reports;
    END IF;
  ELSE
    INSERT INTO free_tries(device_id) VALUES (p_device) ON CONFLICT DO NOTHING;
    IF p_kind = 'score' THEN
      UPDATE free_tries SET scores_used = scores_used + 1 WHERE device_id = p_device AND scores_used < 1;
    ELSE
      UPDATE free_tries SET rewrites_used = rewrites_used + 1 WHERE device_id = p_device AND rewrites_used < 1;
    END IF;
  END IF;
  GET DIAGNOSTICS n = ROW_COUNT;
  RETURN n > 0;
END $$;
REVOKE ALL ON FUNCTION public.use_access(text, text, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.use_access(text, text, text) TO service_role;
COMMENT ON TABLE public.purchases IS 'DEPRECATED: replaced by access_codes';