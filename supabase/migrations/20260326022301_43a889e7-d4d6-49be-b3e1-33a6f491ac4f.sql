CREATE TABLE public.contact_inquiries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  email text NOT NULL,
  type text NOT NULL DEFAULT 'contact',
  message text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.contact_inquiries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can submit inquiry" ON public.contact_inquiries
  FOR INSERT TO public WITH CHECK (true);

CREATE POLICY "Admins can read inquiries" ON public.contact_inquiries
  FOR SELECT TO authenticated USING (has_role(auth.uid(), 'admin'));

CREATE UNIQUE INDEX IF NOT EXISTS profiles_username_unique ON public.profiles(username) WHERE username IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS user_library_user_model ON public.user_library(user_id, model_id);