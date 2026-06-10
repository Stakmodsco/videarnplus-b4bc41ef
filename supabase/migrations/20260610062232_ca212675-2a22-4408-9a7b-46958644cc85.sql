-- 1. Recreate the signup trigger that was lost
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function app_private.handle_new_user();

-- 2. Backfill profiles, roles, and signup bonus for existing auth users without a profile
do $$
declare
  u record;
  v_code text;
begin
  for u in
    select au.id, au.email, au.raw_user_meta_data
    from auth.users au
    left join public.profiles p on p.id = au.id
    where p.id is null
  loop
    v_code := app_private.gen_referral_code();
    insert into public.profiles (id, email, full_name, referral_code, balance, locked_balance, total_earnings, signup_bonus_credited)
    values (u.id, u.email, coalesce(u.raw_user_meta_data->>'full_name', ''), v_code, 20, 20, 20, true);
    insert into public.user_roles (user_id, role) values (u.id, 'user')
    on conflict (user_id, role) do nothing;
    insert into public.transactions (user_id, type, amount, status, notes)
    values (u.id, 'reward', 20, 'completed', 'signup_bonus');
  end loop;
end $$;

-- 3. Re-seed app settings
insert into public.app_settings (key, value) values
('level_prices', '{"1": 25, "2": 50, "3": 100}'::jsonb),
('checkin_rewards', '{"0": 0.10, "1": 0.50, "2": 1.20, "3": 3.00}'::jsonb),
('task_rewards', '{"watch": {"0": 0, "1": 0.20, "2": 0.50, "3": 1.00}, "spin": {"0": 0, "1": 0.30, "2": 0.75, "3": 1.50}}'::jsonb),
('daily_task_limits', '{"watch": 10, "spin": 5}'::jsonb),
('daily_earning_caps', '{"0": 0.10, "1": 5, "2": 15, "3": 40}'::jsonb),
('daily_withdrawal_caps', '{"0": 0, "1": 50, "2": 200, "3": 500}'::jsonb),
('min_withdrawal', '50'::jsonb),
('referral_commission', '{"l1": 0.10, "l2": 0.03}'::jsonb),
('payment_instructions', '{"bank": "Bank: Monetra Holdings\nAcct: 0123456789\nRouting: 011000015", "crypto": "USDT (TRC20): TQn9Y2khEsLJW1ChVWFMSMeRDow5KcbLSE", "mobile_money": "MoMo: +1 555 010 2024"}'::jsonb),
('daily_referral_cap', '{"0": 0, "1": 10, "2": 30, "3": 80}'::jsonb),
('admin_invite_code', to_jsonb(upper(substr(md5(random()::text || clock_timestamp()::text), 1, 12)))),
('withdrawal_lock_days', to_jsonb(5)),
('tile_unlock_fees', '{"hookup": 2.50, "vip": 5.00, "creator": 5.00}'::jsonb),
('tier_tile_unlocks', '{"1": ["hookup", "creator"], "2": ["hookup", "vip", "creator"], "3": ["hookup", "vip", "creator"]}'::jsonb),
('signup_bonus_usd', to_jsonb(20)),
('payment_config_version', to_jsonb('1'::text)),
('payment_methods_overrides', '{}'::jsonb)
on conflict (key) do nothing;

-- 4. Re-seed starter task catalog
insert into public.task_catalog (title, description, task_type, reward, min_level, sort_order)
select * from (values
  ('Watch sponsor video #1', 'Watch a 30s sponsor clip and get rewarded.', 'watch', 0.10::numeric, 1, 1),
  ('Spin the daily wheel', 'Take a free spin to win a small bonus.', 'spin', 0.15::numeric, 1, 2),
  ('Watch sponsor video #2', 'Another quick clip — keep the streak going.', 'watch', 0.12::numeric, 1, 3)
) as t(title, description, task_type, reward, min_level, sort_order)
where not exists (select 1 from public.task_catalog);

insert into public.task_catalog (title, description, task_type, reward, min_level, active, sort_order)
select
  'Task #' || gs || ' — ' || (array['Watch promo ad','Complete short survey','Install featured app','Share on social','Read sponsored article','Try a demo','Rate a video','Sign up for newsletter','Visit a partner site','Watch product preview'])[1 + (gs % 10)],
  'Placeholder task slot. Admin will replace this with the live brief.',
  (array['watch','survey','install','share','watch'])[1 + (gs % 5)],
  (0.10 + (gs % 5) * 0.05)::numeric,
  2,
  true,
  100 + gs
from generate_series(1, 30) gs
where (select count(*) from public.task_catalog) <= 3;