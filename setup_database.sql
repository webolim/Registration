-- COPY EVERYTHING BELOW THIS LINE AND PASTE INTO SUPABASE SQL EDITOR --

-- 1. Create the registrations table
create table if not exists registrations (
  id uuid default gen_random_uuid() primary key,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null,
  mobile text not null unique,
  data jsonb not null
);

-- 2. Enable Row Level Security (RLS)
alter table registrations enable row level security;

-- 3. Create a policy to allow anyone to read/write (since this is a public form)
-- Note: In a stricter app, you would use authentication policies.
create policy "Allow public access" 
on registrations for all 
using (true) 
with check (true);