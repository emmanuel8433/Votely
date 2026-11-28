-- Ensure participation table has primary key constraint on (election_id, voter_id)
-- to prevent race condition double-voting at the database kernel level.
do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'participation_pkey'
       or (conrelid = 'participation'::regclass and contype = 'p')
  ) then
    alter table participation add primary key (election_id, voter_id);
  end if;
end $$;
