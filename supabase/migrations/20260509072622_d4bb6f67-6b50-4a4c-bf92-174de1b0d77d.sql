-- Support tickets for escalations from the support bot
create table public.support_tickets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete set null,
  email text,
  subject text,
  message text not null,
  attachments text[] not null default '{}',
  status text not null default 'open',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.support_tickets enable row level security;

create policy "Anyone can submit a ticket"
  on public.support_tickets for insert
  to anon, authenticated
  with check (true);

create policy "Users view own tickets"
  on public.support_tickets for select
  to authenticated
  using (auth.uid() = user_id);

create policy "Admins view all tickets"
  on public.support_tickets for select
  to authenticated
  using (public.is_admin(auth.uid()));

create policy "Admins update tickets"
  on public.support_tickets for update
  to authenticated
  using (public.is_admin(auth.uid()));

-- Public bucket for support attachments (small files; URLs returned directly)
insert into storage.buckets (id, name, public)
values ('support-attachments', 'support-attachments', true)
on conflict (id) do nothing;

create policy "Anyone can upload support attachments"
  on storage.objects for insert
  to anon, authenticated
  with check (bucket_id = 'support-attachments');

create policy "Anyone can read support attachments"
  on storage.objects for select
  to anon, authenticated
  using (bucket_id = 'support-attachments');
