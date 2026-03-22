-- Create the trigger on auth.users for new signups
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Insert profile for existing user who doesn't have one
INSERT INTO public.profiles (user_id, display_name, avatar_url)
SELECT id, COALESCE(raw_user_meta_data->>'full_name', email), raw_user_meta_data->>'avatar_url'
FROM auth.users
WHERE id NOT IN (SELECT user_id FROM public.profiles)
ON CONFLICT DO NOTHING;

-- Insert roles for existing users who don't have one
INSERT INTO public.user_roles (user_id, role)
SELECT id, 
  CASE WHEN email IN ('geetxteam@gmail.com', 'iscillatechnologies@gmail.com', 'discoversepayment@gmail.com') THEN 'admin'::app_role ELSE 'student'::app_role END
FROM auth.users
WHERE id NOT IN (SELECT user_id FROM public.user_roles)
ON CONFLICT DO NOTHING;