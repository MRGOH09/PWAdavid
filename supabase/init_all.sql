-- =============================================================
-- Learner Club PWA (Google) - Full Schema Initialization
-- Combines core schema + scoring system used by the app
-- Usage: Run this file in your Supabase SQL editor (once per project)
-- Requirements: Postgres 15+, Supabase default 'public' schema
-- =============================================================

-- Extensions
create extension if not exists pgcrypto;

-- ========================= Core Tables =========================
create table if not exists users (
  id uuid primary key default gen_random_uuid(),
  telegram_id bigint unique,
  name text,
  branch_code text,
  status text default 'active',
  created_at timestamptz default now()
);

create table if not exists user_profile (
  user_id uuid primary key references users(id) on delete cascade,
  display_name text,
  chat_id bigint,
  language text default 'zh',
  phone_e164 text,
  email text,
  wa_opt_in boolean default false,
  monthly_income numeric(12,2) default 0 check (monthly_income >= 0),
  a_pct numeric(5,2) default 0 check (a_pct >= 0 AND a_pct <= 100),
  b_pct numeric(5,2) default 0,
  travel_budget_annual numeric(12,2) default 0,
  annual_medical_insurance numeric(12,2) default 0 check (annual_medical_insurance >= 0),
  annual_car_insurance numeric(12,2) default 0 check (annual_car_insurance >= 0),
  prev_month_spend numeric(12,2) default 0,
  current_streak int default 0,
  max_streak int default 0,
  last_record date,
  total_records int default 0
);

create table if not exists user_month_budget (
  user_id uuid not null references users(id) on delete cascade,
  yyyymm char(7) not null,
  income numeric(12,2) not null default 0 check (income >= 0),
  a_pct numeric(5,2) not null default 0 check (a_pct >= 0 AND a_pct <= 100),
  b_pct numeric(5,2) not null default 0,
  c_pct numeric generated always as (greatest(0, 100 - a_pct - b_pct)) stored,
  cap_a_amount numeric generated always as (income * a_pct / 100) stored,
  cap_b_amount numeric generated always as (income * b_pct / 100) stored,
  cap_c_amount numeric generated always as (income * (greatest(0, 100 - a_pct - b_pct)) / 100) stored,
  epf_amount numeric generated always as (income * 24 / 100) stored,
  primary key (user_id, yyyymm)
);

create table if not exists records (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id) on delete cascade,
  category_group text not null check (category_group in ('A','B','C')),
  category_code text not null,
  amount numeric(12,2) not null,
  note text,
  ymd date not null,
  created_at timestamptz default now(),
  is_voided boolean default false,
  parent_id uuid
);

create table if not exists daily_summary (
  user_id uuid not null references users(id) on delete cascade,
  ymd date not null,
  sum_a numeric(12,2) default 0,
  sum_b numeric(12,2) default 0,
  sum_c numeric(12,2) default 0,
  total_count int default 0,
  primary key (user_id, ymd)
);

create table if not exists branch_daily (
  branch_code text not null,
  ymd date not null,
  done int default 0,
  total int default 0,
  rate numeric(5,2),
  primary key (branch_code, ymd)
);

create table if not exists leaderboard_daily (
  ymd date primary key,
  top_json jsonb,
  branch_top_json jsonb
);

create table if not exists event_audit (
  id bigserial primary key,
  event_id uuid,
  user_id uuid,
  action text,
  old jsonb,
  new jsonb,
  ts timestamptz default now()
);

create table if not exists branch_leads (
  branch_code text primary key,
  leader_chat_ids bigint[] not null
);

-- Web Push subscriptions
create table if not exists push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id) on delete cascade,
  endpoint text not null,
  p256dh text not null,
  auth text not null,
  user_agent text,
  device_info jsonb,
  last_used timestamptz default now(),
  created_at timestamptz default now(),
  unique(user_id, endpoint)
);

-- ========================= Scoring System =========================
create table if not exists user_daily_scores (
  user_id uuid not null references users(id) on delete cascade,
  ymd date not null,
  base_score int default 0,
  streak_score int default 0,
  bonus_score int default 0,
  total_score int generated always as (base_score + streak_score + bonus_score) stored,
  current_streak int default 0,
  record_type text not null check (record_type in ('record', 'checkin')),
  bonus_details jsonb default '[]',
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  primary key (user_id, ymd)
);

create table if not exists branch_scores_daily (
  branch_code text not null,
  ymd date not null,
  total_members int default 0,
  active_members int default 0,
  total_score int default 0,
  avg_score numeric(8,2) default 0,
  branch_rank int,
  created_at timestamptz default now(),
  primary key (branch_code, ymd)
);

create table if not exists score_milestones (
  streak_days int primary key,
  bonus_score int not null,
  milestone_name text not null,
  description text
);

insert into score_milestones (streak_days, bonus_score, milestone_name, description) values
  (3, 2,  '坚持三天',  '连续打卡3天奖励'),
  (5, 3,  '持续五天',  '连续打卡5天奖励'),
  (10, 5, '稳定十天',  '连续打卡10天奖励'),
  (15, 8, '半月坚持',  '连续打卡15天奖励'),
  (21, 12,'三周习惯',  '连续打卡21天奖励')
on conflict (streak_days) do nothing;

-- ========================= Indexes =========================
create index if not exists idx_records_user_ymd on records(user_id, ymd);
create index if not exists idx_daily_summary_user_ymd on daily_summary(user_id, ymd);
create index if not exists idx_branch_daily_code_ymd on branch_daily(branch_code, ymd);
create index if not exists idx_leaderboard_daily_ymd on leaderboard_daily(ymd);
create index if not exists idx_user_month_budget_user_yyyymm on user_month_budget(user_id, yyyymm);
create index if not exists idx_push_subscriptions_user_id on push_subscriptions(user_id);
create index if not exists idx_user_daily_scores_user_ymd on user_daily_scores(user_id, ymd desc);
create index if not exists idx_user_daily_scores_ymd on user_daily_scores(ymd);
create index if not exists idx_branch_scores_daily_ymd_rank on branch_scores_daily(ymd, branch_rank);
create index if not exists idx_user_daily_scores_streak on user_daily_scores(current_streak desc) where current_streak > 0;

-- ========================= Optional RLS (if desired) =========================
-- Note: Service Role bypasses RLS. Enable only if you plan to use client-side writes with anon key.
-- alter table push_subscriptions enable row level security;
-- create policy "Users manage own push subscriptions" on push_subscriptions
--   for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ========================= Done =========================
-- Verify key tables exist
-- select table_name from information_schema.tables where table_schema = 'public' and table_name in (
--   'users','user_profile','records','daily_summary','user_month_budget','leaderboard_daily','branch_daily',
--   'push_subscriptions','user_daily_scores','branch_scores_daily','score_milestones'
-- );
