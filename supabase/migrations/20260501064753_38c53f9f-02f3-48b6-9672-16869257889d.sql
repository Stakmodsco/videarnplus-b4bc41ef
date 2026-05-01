-- 1. Track signup bonus credit on profiles
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS signup_bonus_credited boolean NOT NULL DEFAULT false;

-- 2. Update handle_new_user to credit a $20 locked bonus on signup
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

  insert into public.profiles (id, email, full_name, referral_code, referred_by, locked_balance, total_earnings, signup_bonus_credited)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', ''),
    v_ref_code,
    v_referrer_id,
    v_bonus,
    v_bonus,
    true
  );

  insert into public.user_roles (user_id, role) values (new.id, 'user');

  -- Log the bonus as a completed transaction so it appears in history
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

-- 3. App setting for the signup bonus amount (display only)
INSERT INTO public.app_settings (key, value)
VALUES ('signup_bonus_usd', to_jsonb(20))
ON CONFLICT (key) DO UPDATE SET value = excluded.value, updated_at = now();

-- 4. Seed 30 placeholder locked tasks (min_level=2 so free users can't access)
INSERT INTO public.task_catalog (title, description, task_type, reward, min_level, active, sort_order)
SELECT
  'Task #' || gs || ' — ' || (ARRAY['Watch promo ad','Complete short survey','Install featured app','Share on social','Read sponsored article','Try a demo','Rate a video','Sign up for newsletter','Visit a partner site','Watch product preview'])[1 + (gs % 10)],
  'Placeholder task slot. Admin will replace this with the live brief.',
  (ARRAY['watch','survey','install','share','watch'])[1 + (gs % 5)],
  (0.10 + (gs % 5) * 0.05)::numeric,
  2,
  true,
  100 + gs
FROM generate_series(1, 30) AS gs
ON CONFLICT DO NOTHING;