alter table investment_channels
  add column if not exists current_value numeric default null,
  add column if not exists value_updated_at date default null;
