create extension if not exists pgcrypto;
create table profiles(id uuid primary key references auth.users on delete cascade, full_name text, is_super_admin boolean not null default false, created_at timestamptz default now());
create table organizations(id uuid primary key default gen_random_uuid(), name text not null, type text, status text not null default 'active' check(status in('active','suspended','inactive')), created_at timestamptz default now());
create table memberships(org_id uuid references organizations on delete cascade, user_id uuid references profiles on delete cascade, role text not null check(role in('org_admin','voter')), primary key(org_id,user_id));
create table elections(id uuid primary key default gen_random_uuid(), org_id uuid not null references organizations on delete cascade, title text not null, description text, starts_at timestamptz not null, ends_at timestamptz not null, status text not null default 'draft' check(status in('draft','scheduled','active','completed','cancelled')), results_published boolean not null default false, check(ends_at>starts_at));
create table positions(id uuid primary key default gen_random_uuid(), election_id uuid not null references elections on delete cascade, title text not null);
create table candidates(id uuid primary key default gen_random_uuid(), position_id uuid not null references positions on delete cascade, full_name text not null, bio text, photo_path text);
create table eligible_voters(id uuid primary key default gen_random_uuid(), election_id uuid not null references elections on delete cascade, user_id uuid references profiles, email text not null, full_name text, unique(election_id,email));
create table participation(election_id uuid references elections, voter_id uuid references eligible_voters, voted_at timestamptz default now(), primary key(election_id,voter_id));
create table ballots(id uuid primary key default gen_random_uuid(), election_id uuid not null references elections);
create table ballot_selections(ballot_id uuid references ballots on delete cascade, position_id uuid references positions, candidate_id uuid references candidates, primary key(ballot_id,position_id));
create table audit_logs(id bigserial primary key, org_id uuid, actor_id uuid, event text not null, meta jsonb default '{}', created_at timestamptz default now());
create function is_org_admin(o uuid) returns boolean language sql security definer stable as $$ select exists(select 1 from memberships where org_id=o and user_id=auth.uid() and role='org_admin') $$;
alter table organizations enable row level security; alter table memberships enable row level security; alter table elections enable row level security;
alter table positions enable row level security; alter table candidates enable row level security; alter table eligible_voters enable row level security;
alter table participation enable row level security; alter table ballots enable row level security; alter table ballot_selections enable row level security; alter table audit_logs enable row level security;
create policy org_read on organizations for select using(is_org_admin(id));
create policy el_admin on elections for all using(is_org_admin(org_id)) with check(is_org_admin(org_id));
create policy el_voter on elections for select using(exists(select 1 from eligible_voters v where v.election_id=id and v.user_id=auth.uid()));
create policy ev_admin on eligible_voters for all using(is_org_admin((select org_id from elections e where e.id=election_id)));
create policy ev_self on eligible_voters for select using(user_id=auth.uid());
create policy part_admin on participation for select using(is_org_admin((select org_id from elections e where e.id=election_id)));
create policy audit_read on audit_logs for select using(is_org_admin(org_id));
-- No policies on ballots/ballot_selections: only cast_ballot (security definer) writes them; admins cannot read them.
create function cast_ballot(p_election uuid, p_choices jsonb) returns void language plpgsql security definer set search_path=public as $$
declare v eligible_voters; e elections; b uuid; c jsonb; n int;
begin
  select * into e from elections where id=p_election for share;
  if e.id is null or e.status<>'active' or now()<e.starts_at or now()>e.ends_at then raise exception 'Voting is not open'; end if;
  select * into v from eligible_voters where election_id=p_election and user_id=auth.uid();
  if v.id is null then raise exception 'Not eligible'; end if;
  select count(*) into n from positions where election_id=p_election;
  if jsonb_array_length(p_choices)<>n then raise exception 'Select a candidate for every position'; end if;
  insert into participation(election_id,voter_id) values(p_election,v.id);
  insert into ballots(election_id) values(p_election) returning id into b;
  for c in select * from jsonb_array_elements(p_choices) loop
    if not exists(select 1 from candidates cd join positions p on p.id=cd.position_id where cd.id=(c->>'candidate_id')::uuid and p.id=(c->>'position_id')::uuid and p.election_id=p_election) then raise exception 'Invalid selection'; end if;
    insert into ballot_selections values(b,(c->>'position_id')::uuid,(c->>'candidate_id')::uuid);
  end loop;
end $$;
revoke all on function cast_ballot from public; grant execute on function cast_ballot to authenticated;
