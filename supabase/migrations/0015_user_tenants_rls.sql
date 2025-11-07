-- Ensure RLS policies exist for user_tenants so the app can resolve tenant membership
-- DROP existing policies if present to avoid duplicates
DO $$ BEGIN
  EXECUTE 'drop policy if exists user_tenants_select_own on user_tenants';
EXCEPTION WHEN undefined_object THEN NULL; END $$;

-- Allow authenticated users to select their own tenant memberships
create policy user_tenants_select_own on user_tenants
  for select
  to authenticated
  using (user_id = auth.uid());

-- (Optional) You can later add insert/update/delete policies as needed for admin membership management.
