create table if not exists investment_channels (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  channel_name text not null,
  financial_company text not null,
  investment_track text not null,
  created_at timestamptz default now() not null
);

alter table investment_channels enable row level security;

create policy "Users can view their own investment channels"
  on investment_channels for select
  using (auth.uid() = user_id);

create policy "Users can insert their own investment channels"
  on investment_channels for insert
  with check (auth.uid() = user_id);

create policy "Users can update their own investment channels"
  on investment_channels for update
  using (auth.uid() = user_id);

create policy "Users can delete their own investment channels"
  on investment_channels for delete
  using (auth.uid() = user_id);
