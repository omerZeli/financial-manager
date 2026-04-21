create table if not exists investment_deposits (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  investment_channel_id uuid references investment_channels(id) on delete cascade not null,
  deposit_date date not null,
  amount numeric not null,
  depositor_name text not null,
  created_at timestamptz default now() not null
);

alter table investment_deposits enable row level security;

create policy "Users can view their own investment deposits"
  on investment_deposits for select
  using (auth.uid() = user_id);

create policy "Users can insert their own investment deposits"
  on investment_deposits for insert
  with check (auth.uid() = user_id);

create policy "Users can update their own investment deposits"
  on investment_deposits for update
  using (auth.uid() = user_id);

create policy "Users can delete their own investment deposits"
  on investment_deposits for delete
  using (auth.uid() = user_id);
