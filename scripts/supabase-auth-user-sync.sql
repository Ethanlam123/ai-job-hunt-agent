-- =============================================================================
-- Supabase Auth User Sync Script
-- =============================================================================
-- This script fixes the "Tenant or user not found" error by syncing
-- Supabase Auth users (auth.users) with the custom users table.
--
-- Problem: Supabase Auth creates users in auth.users table, but the
-- application queries the public.users table. This script creates
-- automatic sync between the two tables.
--
-- Usage: Apply this script after database setup if you get RLS errors
-- =============================================================================

-- Function to handle user creation from Supabase Auth
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    -- Insert new user into our users table
    INSERT INTO public.users (id, email, created_at, updated_at)
    VALUES (
        NEW.id,
        NEW.email,
        NEW.created_at,
        NEW.created_at
    )
    ON CONFLICT (id) DO UPDATE SET
        email = EXCLUDED.email,
        updated_at = NOW();

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to handle user updates from Supabase Auth
CREATE OR REPLACE FUNCTION public.handle_user_update()
RETURNS TRIGGER AS $$
BEGIN
    -- Update user in our users table
    UPDATE public.users
    SET
        email = NEW.email,
        updated_at = NOW()
    WHERE id = NEW.id;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop existing triggers if they exist
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP TRIGGER IF EXISTS on_auth_user_updated ON auth.users;

-- Create triggers for automatic sync
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

CREATE TRIGGER on_auth_user_updated
    AFTER UPDATE ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_user_update();

-- Manually sync existing users (one-time operation)
INSERT INTO public.users (id, email, created_at, updated_at)
SELECT
    id,
    email,
    created_at,
    created_at
FROM auth.users
ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    updated_at = NOW();

-- =============================================================================
-- Verification
-- =============================================================================

-- Verify the sync worked
SELECT 'Users in auth.users' as source, COUNT(*) as count FROM auth.users
UNION ALL
SELECT 'Users in public.users' as source, COUNT(*) as count FROM public.users;

-- Check if user exists with auth.uid()
SELECT 'User Sync Verification' as test,
       CASE
           WHEN EXISTS(SELECT 1 FROM public.users WHERE id = auth.uid())
           THEN 'SUCCESS: User found in both auth and users tables'
           ELSE 'ERROR: User not found in users table'
       END as status;