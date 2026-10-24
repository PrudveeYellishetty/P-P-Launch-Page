-- Run AFTER supabase-setup.sql. Existing items/files are preserved.
-- Then run the private allowlist script supplied separately by the project owner.
begin;
create table if not exists pp_private.google_allowlist (
  email text primary key check(email = lower(email)),
  person text unique not null check(person in ('Prudvee','Priyadarshini'))
);
create table if not exists pp_private.shared_workspace (
  singleton boolean primary key default true check(singleton),
  workspace_id uuid unique not null references public.pp_workspaces(id)
);
revoke all on pp_private.google_allowlist, pp_private.shared_workspace from public, anon, authenticated;

do $$
declare room uuid; room_count integer;
begin
  if exists(select 1 from pp_private.shared_workspace) then return; end if;
  select count(*) into room_count from public.pp_workspaces;
  if room_count > 1 then
    raise exception 'Multiple workspaces exist. Choose which one to preserve before running this migration.';
  elsif room_count = 1 then
    select id into room from public.pp_workspaces;
  else
    insert into public.pp_workspaces default values returning id into room;
  end if;
  insert into pp_private.shared_workspace(workspace_id) values(room);
end $$;

-- Check the server-managed Google identity and private allowlist, not browser metadata.
create or replace function pp_private.google_person()
returns text language sql stable security definer set search_path = '' as $$
  select a.person from auth.identities i
  join auth.users u on u.id = i.user_id
  join pp_private.google_allowlist a on a.email = lower(i.identity_data->>'email')
  where i.user_id = (select auth.uid()) and i.provider = 'google'
    and u.email_confirmed_at is not null
  limit 1;
$$;
revoke all on function pp_private.google_person() from public, anon;
grant execute on function pp_private.google_person() to authenticated;

create or replace function pp_private.is_member(room uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists(select 1 from public.pp_members m
    join pp_private.shared_workspace w on w.workspace_id = m.workspace_id
    where m.workspace_id = room and m.user_id = (select auth.uid())
      and m.person = pp_private.google_person());
$$;

create or replace function pp_private.google_connect()
returns jsonb language plpgsql security definer set search_path = '' as $$
declare chosen_person text; room uuid; caller uuid := auth.uid();
begin
  chosen_person := pp_private.google_person();
  if caller is null or chosen_person is null then
    raise exception 'This Google account is not invited to p & p.';
  end if;
  select workspace_id into room from pp_private.shared_workspace where singleton = true for update;
  if room is null then raise exception 'Shared workspace setup is incomplete.'; end if;
  -- Replace this person's old anonymous membership; content belongs to the workspace.
  delete from public.pp_members where workspace_id = room and person = chosen_person and user_id <> caller;
  insert into public.pp_members(user_id,workspace_id,person) values(caller,room,chosen_person)
  on conflict(user_id) do update set workspace_id = excluded.workspace_id, person = excluded.person;
  return jsonb_build_object('room',room,'person',chosen_person,'userId',caller);
end; $$;
revoke all on function pp_private.google_connect() from public, anon;
grant execute on function pp_private.google_connect() to authenticated;
create or replace function public.pp_google_connect()
returns jsonb language sql security invoker set search_path = '' as $$ select pp_private.google_connect(); $$;
revoke all on function public.pp_google_connect() from public, anon;
grant execute on function public.pp_google_connect() to authenticated;

-- Old clients cannot create workspaces or claim membership using pairing codes.
revoke all on function public.pp_create_workspace(text), public.pp_make_invite(), public.pp_join_workspace(text) from authenticated, anon, public;
revoke all on function pp_private.create_workspace(text), pp_private.make_invite(), pp_private.join_workspace(text) from authenticated, anon, public;

-- Stamp message authors from membership; viewing another task tab cannot impersonate them.
create or replace function pp_private.stamp_item()
returns trigger language plpgsql set search_path = '' as $$
declare author text;
begin
  new.updated_at := clock_timestamp();
  if TG_OP = 'UPDATE' then
    new.revision := old.revision + 1;
    if new.kind = 'messages' and not new.deleted and old.content ? 'owner' then
      new.content := jsonb_set(new.content,'{owner}',old.content->'owner');
    end if;
  else
    new.revision := 1;
    if new.kind = 'messages' and not new.deleted and coalesce(new.content->>'sample','false') <> 'true' then
      select person into author from public.pp_members where user_id = auth.uid() and workspace_id = new.workspace_id;
      if author is null then raise exception 'Message sender is not a workspace member'; end if;
      new.content := jsonb_set(new.content,'{owner}',to_jsonb(author));
    end if;
  end if;
  return new;
end; $$;

-- Feb 1 is the preparation deadline, not a claim about the official exam schedule.
insert into public.pp_items(workspace_id,kind,id,content)
select workspace_id,'settings','shared','{"examDate":"2027-02-01"}'::jsonb from pp_private.shared_workspace
on conflict(workspace_id,kind,id) do update set content = public.pp_items.content || excluded.content, deleted = false;
commit;
