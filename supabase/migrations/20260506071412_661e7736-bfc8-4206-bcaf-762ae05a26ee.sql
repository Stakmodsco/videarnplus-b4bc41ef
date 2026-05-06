
-- 1. Bonus → main balance as well (locked stays for back-compat)
CREATE OR REPLACE FUNCTION public.handle_new_user()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_ref_code text := public.gen_referral_code();
  v_referrer_id uuid;
  v_input_ref text;
  v_grandparent uuid;
  v_bonus numeric := 20;
begin
  v_input_ref := nullif(upper(coalesce(new.raw_user_meta_data->>'referral_code', '')), '');
  if v_input_ref is not null then
    select id into v_referrer_id from public.profiles where referral_code = v_input_ref limit 1;
  end if;

  insert into public.profiles (id, email, full_name, referral_code, referred_by, balance, locked_balance, total_earnings, signup_bonus_credited)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', ''),
    v_ref_code,
    v_referrer_id,
    v_bonus,
    v_bonus,
    v_bonus,
    true
  );

  insert into public.user_roles (user_id, role) values (new.id, 'user');
  insert into public.transactions (user_id, type, amount, status, notes)
  values (new.id, 'reward', v_bonus, 'completed', 'signup_bonus');

  if v_referrer_id is not null then
    insert into public.referrals (parent_user, child_user, depth) values (v_referrer_id, new.id, 1);
    select referred_by into v_grandparent from public.profiles where id = v_referrer_id;
    if v_grandparent is not null then
      insert into public.referrals (parent_user, child_user, depth) values (v_grandparent, new.id, 2);
    end if;
  end if;
  return new;
end; $function$;

-- 2. Structured logging columns
ALTER TABLE public.signup_attempts
  ADD COLUMN IF NOT EXISTS kind text NOT NULL DEFAULT 'unknown',
  ADD COLUMN IF NOT EXISTS reason text;

CREATE INDEX IF NOT EXISTS idx_signup_attempts_kind_created ON public.signup_attempts(kind, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_captcha_challenges_created ON public.captcha_challenges(created_at DESC);

-- Allow admins to read captcha_challenges already; add a policy for signup_attempts already exists.

-- 3. Seed app_settings
INSERT INTO public.app_settings (key, value)
VALUES ('payment_methods_overrides', '{}'::jsonb)
ON CONFLICT (key) DO NOTHING;

INSERT INTO public.app_settings (key, value)
VALUES ('payment_config_version', '1'::jsonb)
ON CONFLICT (key) DO NOTHING;
