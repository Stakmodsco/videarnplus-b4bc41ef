create table if not exists public.user_recovery_keys (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  recovery_key_hash text not null,
  used boolean default false,
  created_at timestamp with time zone default now()
);

alter table public.user_recovery_keys enable row level security;

create policy "Users can view their own recovery keys"
on public.user_recovery_keys
for select
using (auth.uid() = user_id);
