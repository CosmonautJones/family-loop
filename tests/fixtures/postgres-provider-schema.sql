-- Minimal provider objects for SQL authority tests on disposable native PostgreSQL.
-- This does not emulate GoTrue, PostgREST, email delivery, or Storage behavior.
create role anon;
create role authenticated;
create role service_role bypassrls;
create schema auth;
create schema storage;
create schema extensions;
create extension pgcrypto with schema extensions;
create table auth.users (
  id uuid primary key,
  email text,
  email_confirmed_at timestamptz,
  last_sign_in_at timestamptz default now(),
  raw_user_meta_data jsonb default '{}'::jsonb
);
create function auth.uid() returns uuid language sql stable as $$
  select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid;
$$;
create function auth.role() returns text language sql stable as $$
  select nullif(current_setting('request.jwt.claim.role', true), '');
$$;
grant usage on schema auth to anon, authenticated, service_role;
create table storage.buckets (id text primary key, name text, public boolean, file_size_limit bigint, allowed_mime_types text[]);
create table storage.objects (id uuid primary key default gen_random_uuid(), bucket_id text, name text, owner_id text, metadata jsonb);
alter table storage.objects enable row level security;
create function storage.foldername(text) returns text[] language sql immutable as $$ select (string_to_array($1, '/'))[1:array_length(string_to_array($1, '/'), 1)-1]; $$;
create function storage.extension(text) returns text language sql immutable as $$ select reverse(split_part(reverse($1), '.', 1)); $$;
create function storage.allow_any_operation(text[]) returns boolean language sql stable as $$ select false; $$;
create publication supabase_realtime;
