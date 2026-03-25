-- OTP storage table
CREATE TABLE IF NOT EXISTS public.otp_codes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  phone text NOT NULL,
  otp text NOT NULL,
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '5 minutes'),
  verified boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_otp_codes_phone ON public.otp_codes(phone, expires_at);

ALTER TABLE public.otp_codes ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.store_otp(_phone text, _otp text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  DELETE FROM public.otp_codes WHERE phone = _phone;
  INSERT INTO public.otp_codes (phone, otp, expires_at)
  VALUES (_phone, _otp, now() + interval '5 minutes');
END;
$$;

CREATE OR REPLACE FUNCTION public.verify_otp(_phone text, _otp text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  found_id uuid;
BEGIN
  SELECT id INTO found_id
  FROM public.otp_codes
  WHERE phone = _phone
    AND otp = _otp
    AND expires_at > now()
    AND verified = false
  LIMIT 1;

  IF found_id IS NOT NULL THEN
    UPDATE public.otp_codes SET verified = true WHERE id = found_id;
    RETURN true;
  END IF;

  RETURN false;
END;
$$;

ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS can_create_agent boolean DEFAULT false;