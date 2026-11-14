# Votely (starter)
Next.js 14 + Tailwind + Supabase. Windows PowerShell:
```
npm install
copy .env.example .env.local
npm run dev
```
Create a Supabase project, paste `supabase/migrations/0001_core.sql` into the SQL editor, then fill `.env.local`.
Ballot secrecy: participation and ballot choices are separate tables; `ballots` has no voter id. Limit: timing and DB-admin access can still correlate a voter to a ballot, so this is not cryptographic anonymity.
