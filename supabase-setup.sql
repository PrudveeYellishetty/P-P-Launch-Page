-- p & p: run once in Supabase > SQL Editor as the project owner.
-- Safe to rerun. Existing workspace content is not removed.
begin;

create schema if not exists pp_private;
revoke all on schema pp_private from public, anon;
grant usage on schema pp_private to authenticated;

create table if not exists public.pp_workspaces (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now()
);
create table if not exists public.pp_members (
  user_id uuid primary key references auth.users(id) on delete cascade,
  workspace_id uuid not null references public.pp_workspaces(id) on delete cascade,
  person text not null check (person in ('Prudvee', 'Priyadarshini')),
  unique(workspace_id, person)
);
create index if not exists pp_members_workspace_idx on public.pp_members(workspace_id);

create table if not exists public.pp_items (
  workspace_id uuid not null references public.pp_workspaces(id) on delete cascade,
  kind text not null check(kind in ('notes','tasks','pins','messages','shortcuts','settings')),
  id text not null check(length(id) between 1 and 100),
  content jsonb not null check(jsonb_typeof(content) = 'object'),
  revision bigint not null default 1,
  deleted boolean not null default false,
  updated_at timestamptz not null default now(),
  primary key(workspace_id,kind,id)
);

-- Pairing secrets are stored only as hashes, outside the exposed public schema.
create table if not exists pp_private.invites (
  token_hash bytea primary key,
  workspace_id uuid not null references public.pp_workspaces(id) on delete cascade,
  person text not null check(person in ('Prudvee','Priyadarshini')),
  expires_at timestamptz not null default now() + interval '24 hours'
);
revoke all on pp_private.invites from public, anon, authenticated;

create or replace function pp_private.is_member(room uuid)
returns boolean language sql stable security definer set search_path = ''
as $$ select exists(select 1 from public.pp_members m where m.workspace_id = room and m.user_id = (select auth.uid())); $$;
revoke all on function pp_private.is_member(uuid) from public, anon;
grant execute on function pp_private.is_member(uuid) to authenticated;

alter table public.pp_workspaces enable row level security;
alter table public.pp_members enable row level security;
alter table public.pp_items enable row level security;
revoke all on public.pp_workspaces, public.pp_members, public.pp_items from public, anon, authenticated;
grant select on public.pp_workspaces, public.pp_members to authenticated;
grant select, insert, update on public.pp_items to authenticated;

drop policy if exists pp_workspace_read on public.pp_workspaces;
create policy pp_workspace_read on public.pp_workspaces for select to authenticated using(pp_private.is_member(id));
drop policy if exists pp_member_read on public.pp_members;
create policy pp_member_read on public.pp_members for select to authenticated using(pp_private.is_member(workspace_id));
drop policy if exists pp_items_read on public.pp_items;
create policy pp_items_read on public.pp_items for select to authenticated using(pp_private.is_member(workspace_id));
drop policy if exists pp_items_insert on public.pp_items;
create policy pp_items_insert on public.pp_items for insert to authenticated with check(pp_private.is_member(workspace_id));
drop policy if exists pp_items_update on public.pp_items;
create policy pp_items_update on public.pp_items for update to authenticated using(pp_private.is_member(workspace_id)) with check(pp_private.is_member(workspace_id));

create or replace function pp_private.stamp_item()
returns trigger language plpgsql set search_path = '' as $$
begin
  new.updated_at := clock_timestamp();
  if TG_OP = 'UPDATE' then new.revision := old.revision + 1; else new.revision := 1; end if;
  return new;
end;
$$;
drop trigger if exists pp_item_stamp on public.pp_items;
create trigger pp_item_stamp before insert or update on public.pp_items for each row execute function pp_private.stamp_item();

-- Retried requests are idempotent, even after another laptop edits the item.
create table if not exists public.pp_operations (
  workspace_id uuid not null references public.pp_workspaces(id) on delete cascade,
  operation uuid not null,
  created_at timestamptz not null default now(),
  primary key(workspace_id,operation)
);
alter table public.pp_operations enable row level security;
revoke all on public.pp_operations from public, anon, authenticated;
grant select, insert on public.pp_operations to authenticated;
drop policy if exists pp_operations_read on public.pp_operations;
create policy pp_operations_read on public.pp_operations for select to authenticated using(pp_private.is_member(workspace_id));
drop policy if exists pp_operations_insert on public.pp_operations;
create policy pp_operations_insert on public.pp_operations for insert to authenticated with check(pp_private.is_member(workspace_id));
create or replace function public.pp_apply_item(room uuid, operation_id uuid, item_kind text, item_id text, item_content jsonb, is_deleted boolean)
returns void language plpgsql security invoker set search_path = '' as $$
begin
  insert into public.pp_operations(workspace_id,operation) values(room,operation_id) on conflict do nothing;
  if not found then return; end if;
  insert into public.pp_items(workspace_id,kind,id,content,deleted) values(room,item_kind,item_id,item_content,is_deleted)
  on conflict(workspace_id,kind,id) do update set content = excluded.content, deleted = excluded.deleted;
end; $$;
revoke all on function public.pp_apply_item(uuid,uuid,text,text,jsonb,boolean) from public, anon;
grant execute on function public.pp_apply_item(uuid,uuid,text,text,jsonb,boolean) to authenticated;

-- Privileged implementations are private. Public API wrappers are invoker-only.
create or replace function pp_private.create_workspace(person_name text)
returns uuid language plpgsql security definer set search_path = '' as $$
declare room uuid; caller uuid := auth.uid();
begin
  if caller is null then raise exception 'Sign in first'; end if;
  perform pg_advisory_xact_lock(hashtextextended(caller::text, 0));
  select workspace_id into room from public.pp_members where user_id = caller;
  if room is not null then return room; end if;
  if person_name not in ('Prudvee','Priyadarshini') or person_name is null then raise exception 'Choose your name'; end if;
  insert into public.pp_workspaces default values returning id into room;
  insert into public.pp_members values(caller,room,person_name);
  return room;
end; $$;

create or replace function pp_private.make_invite()
returns text language plpgsql security definer set search_path = '' as $$
declare member public.pp_members; token text; other_name text;
begin
  select * into member from public.pp_members where user_id = auth.uid();
  if member.user_id is null then raise exception 'Create a workspace first'; end if;
  perform 1 from public.pp_workspaces where id = member.workspace_id for update;
  other_name := case member.person when 'Prudvee' then 'Priyadarshini' else 'Prudvee' end;
  if exists(select 1 from public.pp_members where workspace_id = member.workspace_id and person = other_name) then raise exception 'Both people are already paired'; end if;
  token := replace(gen_random_uuid()::text,'-','') || replace(gen_random_uuid()::text,'-','');
  delete from pp_private.invites where workspace_id = member.workspace_id;
  insert into pp_private.invites(token_hash,workspace_id,person) values(sha256(convert_to(token,'UTF8')),member.workspace_id,other_name);
  return token;
end; $$;

create or replace function pp_private.join_workspace(pairing_code text)
returns uuid language plpgsql security definer set search_path = '' as $$
declare invite pp_private.invites; caller uuid := auth.uid();
begin
  if caller is null then raise exception 'Sign in first'; end if;
  perform pg_advisory_xact_lock(hashtextextended(caller::text, 0));
  if exists(select 1 from public.pp_members where user_id = caller) then raise exception 'This browser is already paired'; end if;
  if pairing_code is null or length(pairing_code) <> 64 then raise exception 'Invalid pairing code'; end if;
  select * into invite from pp_private.invites where token_hash = sha256(convert_to(pairing_code,'UTF8')) and expires_at > now() for update;
  if invite.workspace_id is null then raise exception 'Pairing code expired or already used'; end if;
  insert into public.pp_members values(caller,invite.workspace_id,invite.person);
  delete from pp_private.invites where token_hash = invite.token_hash;
  return invite.workspace_id;
end; $$;

revoke all on function pp_private.create_workspace(text), pp_private.make_invite(), pp_private.join_workspace(text) from public, anon;
grant execute on function pp_private.create_workspace(text), pp_private.make_invite(), pp_private.join_workspace(text) to authenticated;
create or replace function public.pp_create_workspace(person_name text) returns uuid language sql security invoker set search_path = '' as $$ select pp_private.create_workspace(person_name); $$;
create or replace function public.pp_make_invite() returns text language sql security invoker set search_path = '' as $$ select pp_private.make_invite(); $$;
create or replace function public.pp_join_workspace(pairing_code text) returns uuid language sql security invoker set search_path = '' as $$ select pp_private.join_workspace(pairing_code); $$;
revoke all on function public.pp_create_workspace(text), public.pp_make_invite(), public.pp_join_workspace(text) from public, anon;
grant execute on function public.pp_create_workspace(text), public.pp_make_invite(), public.pp_join_workspace(text) to authenticated;

-- Files stay private; object paths start with the workspace UUID.
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values('pp-files','pp-files',false,1000000,array['image/png','image/jpeg','image/webp','image/gif','application/pdf','text/plain'])
on conflict(id) do nothing;
drop policy if exists pp_files_read on storage.objects;
create policy pp_files_read on storage.objects for select to authenticated using(bucket_id = 'pp-files' and exists(select 1 from public.pp_members m where m.user_id = (select auth.uid()) and m.workspace_id::text = (storage.foldername(name))[1]));
drop policy if exists pp_files_insert on storage.objects;
create policy pp_files_insert on storage.objects for insert to authenticated with check(bucket_id = 'pp-files' and exists(select 1 from public.pp_members m where m.user_id = (select auth.uid()) and m.workspace_id::text = (storage.foldername(name))[1]));
drop policy if exists pp_files_delete on storage.objects;
create policy pp_files_delete on storage.objects for delete to authenticated using(bucket_id = 'pp-files' and exists(select 1 from public.pp_members m where m.user_id = (select auth.uid()) and m.workspace_id::text = (storage.foldername(name))[1]));

do $$ begin
  if not exists(select 1 from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'pp_items') then
    alter publication supabase_realtime add table public.pp_items;
  end if;
end $$;
commit;
