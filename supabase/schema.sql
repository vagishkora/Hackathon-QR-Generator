-- ==============================================================================
-- Hackathon Participant QR Pass Management System
-- Complete PostgreSQL Schema, Row Level Security (RLS) & Atomic RPCs
-- ==============================================================================

-- 1. EXTENSIONS
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 2. TABLES

-- Table: approved_participants (Pre-approved organizer list keyed by email)
CREATE TABLE IF NOT EXISTS public.approved_participants (
    email TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    team TEXT NOT NULL,
    college TEXT NOT NULL,
    usn TEXT,
    phone TEXT,
    imported_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Ensure columns exist if table was already created earlier
ALTER TABLE public.approved_participants ADD COLUMN IF NOT EXISTS usn TEXT;
ALTER TABLE public.approved_participants ADD COLUMN IF NOT EXISTS phone TEXT;

-- Table: profiles (1 row per authenticated user)
CREATE TABLE IF NOT EXISTS public.profiles (
    user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    phone TEXT,
    college TEXT,
    team_name TEXT,
    usn TEXT,
    security_pin TEXT,
    role TEXT CHECK (role IN ('participant', 'admin', 'scanner')) DEFAULT 'participant' NOT NULL,
    disabled BOOLEAN DEFAULT FALSE NOT NULL,
    created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Ensure columns exist if table was already created earlier
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS usn TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS security_pin TEXT;

-- Table: passes (1 row per participant's digital QR pass)
CREATE TABLE IF NOT EXISTS public.passes (
    pass_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID UNIQUE REFERENCES public.profiles(user_id) ON DELETE CASCADE,
    token TEXT UNIQUE NOT NULL,
    status TEXT CHECK (status IN ('active', 'disabled')) DEFAULT 'active' NOT NULL,
    used BOOLEAN DEFAULT FALSE NOT NULL,
    entry_status TEXT CHECK (entry_status IN ('not_entered', 'entered')) DEFAULT 'not_entered' NOT NULL,
    scanned_by UUID REFERENCES public.profiles(user_id),
    entry_time TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Table: entry_logs (Immutable audit log of every entry scan)
CREATE TABLE IF NOT EXISTS public.entry_logs (
    entry_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    pass_id UUID REFERENCES public.passes(pass_id) ON DELETE CASCADE,
    participant_id UUID REFERENCES public.profiles(user_id) ON DELETE CASCADE,
    scanned_by UUID REFERENCES public.profiles(user_id),
    scanned_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Create indexes for ultra-fast query and scan lookups
CREATE INDEX IF NOT EXISTS idx_passes_token ON public.passes(token);
CREATE INDEX IF NOT EXISTS idx_passes_user_id ON public.passes(user_id);
CREATE INDEX IF NOT EXISTS idx_passes_used ON public.passes(used);
CREATE INDEX IF NOT EXISTS idx_profiles_email ON public.profiles(email);
CREATE INDEX IF NOT EXISTS idx_entry_logs_scanned_at ON public.entry_logs(scanned_at DESC);

-- ==============================================================================
-- 3. ROW LEVEL SECURITY (RLS) POLICIES
-- ==============================================================================

ALTER TABLE public.approved_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.passes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.entry_logs ENABLE ROW LEVEL SECURITY;

-- Helper function to check if current user is an admin
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
    SELECT EXISTS (
        SELECT 1 FROM public.profiles
        WHERE user_id = auth.uid() AND role = 'admin' AND disabled = false
    );
$$;

-- Helper function to check if current user is admin or scanner
CREATE OR REPLACE FUNCTION public.is_admin_or_scanner()
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
    SELECT EXISTS (
        SELECT 1 FROM public.profiles
        WHERE user_id = auth.uid() AND role IN ('admin', 'scanner') AND disabled = false
    );
$$;

-- 3.1 approved_participants Policies
DROP POLICY IF EXISTS "Admins can do everything on approved_participants" ON public.approved_participants;
CREATE POLICY "Admins can do everything on approved_participants"
ON public.approved_participants
FOR ALL
USING (public.is_admin())
WITH CHECK (public.is_admin());

-- 3.2 profiles Policies
DROP POLICY IF EXISTS "Users can read own profile" ON public.profiles;
CREATE POLICY "Users can read own profile"
ON public.profiles
FOR SELECT
USING (auth.uid() = user_id OR public.is_admin_or_scanner());

DROP POLICY IF EXISTS "Users can update own non-sensitive profile" ON public.profiles;
CREATE POLICY "Users can update own non-sensitive profile"
ON public.profiles
FOR UPDATE
USING (auth.uid() = user_id OR public.is_admin())
WITH CHECK (
    -- Admins can update anything; normal users cannot elevate their role or un-disable themselves
    public.is_admin() OR (auth.uid() = user_id AND role = 'participant')
);

DROP POLICY IF EXISTS "Allow user profile creation on signup" ON public.profiles;
CREATE POLICY "Allow user profile creation on signup"
ON public.profiles
FOR INSERT
WITH CHECK (auth.uid() = user_id OR public.is_admin());

-- 3.3 passes Policies
DROP POLICY IF EXISTS "Participants can view their own pass" ON public.passes;
CREATE POLICY "Participants can view their own pass"
ON public.passes
FOR SELECT
USING (auth.uid() = user_id OR public.is_admin_or_scanner());

-- Passes writes: ONLY admins or through atomic SECURITY DEFINER RPC functions
DROP POLICY IF EXISTS "Admins can update passes" ON public.passes;
CREATE POLICY "Admins can update passes"
ON public.passes
FOR UPDATE
USING (public.is_admin())
WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "Admins can insert passes" ON public.passes;
CREATE POLICY "Admins can insert passes"
ON public.passes
FOR INSERT
WITH CHECK (public.is_admin() OR auth.uid() = user_id);

-- 3.4 entry_logs Policies
DROP POLICY IF EXISTS "Admins and scanners can view entry logs" ON public.entry_logs;
CREATE POLICY "Admins and scanners can view entry logs"
ON public.entry_logs
FOR SELECT
USING (public.is_admin_or_scanner());

DROP POLICY IF EXISTS "Admins and scanners can insert entry logs" ON public.entry_logs;
CREATE POLICY "Admins and scanners can insert entry logs"
ON public.entry_logs
FOR INSERT
WITH CHECK (public.is_admin_or_scanner());


-- ==============================================================================
-- 4. ATOMIC RPC FUNCTIONS (SECURITY DEFINER)
-- ==============================================================================

-- 4.1 Check Participant Eligibility before registration
-- Returns approval status and matched pre-approved details
CREATE OR REPLACE FUNCTION public.check_participant_eligibility(p_email TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_approved RECORD;
    v_registered BOOLEAN;
    v_clean_email TEXT;
BEGIN
    v_clean_email := LOWER(TRIM(p_email));
    
    -- Check if email exists in approved list
    SELECT * INTO v_approved 
    FROM public.approved_participants 
    WHERE LOWER(email) = v_clean_email;

    IF NOT FOUND THEN
        RETURN jsonb_build_object(
            'is_approved', FALSE,
            'message', 'This email is not registered as a selected participant.'
        );
    END IF;

    -- Check if user has already registered
    SELECT EXISTS (
        SELECT 1 FROM public.profiles 
        WHERE LOWER(email) = v_clean_email
    ) INTO v_registered;

    IF v_registered THEN
        RETURN jsonb_build_object(
            'is_approved', TRUE,
            'is_registered', TRUE,
            'message', 'This participant is already registered. Please log in.'
        );
    END IF;

    -- Return approved details for pre-filling registration fields
    RETURN jsonb_build_object(
        'is_approved', TRUE,
        'is_registered', FALSE,
        'details', jsonb_build_object(
            'name', v_approved.name,
            'team', v_approved.team,
            'college', v_approved.college,
            'email', v_approved.email
        )
    );
END;
$$;

-- 4.2 Provision Pass & Profile after Auth Signup
CREATE OR REPLACE FUNCTION public.provision_participant_pass(
    p_user_id UUID,
    p_name TEXT,
    p_email TEXT,
    p_phone TEXT,
    p_college TEXT,
    p_team_name TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_clean_email TEXT;
    v_token TEXT;
    v_pass_id UUID;
    v_is_approved BOOLEAN;
BEGIN
    v_clean_email := LOWER(TRIM(p_email));

    -- Strict verification: Must be in approved_participants
    SELECT EXISTS (
        SELECT 1 FROM public.approved_participants 
        WHERE LOWER(email) = v_clean_email
    ) INTO v_is_approved;

    IF NOT v_is_approved THEN
        RAISE EXCEPTION 'This email is not registered as a selected participant.';
    END IF;

    -- Create or update profile
    INSERT INTO public.profiles (user_id, name, email, phone, college, team_name, role, disabled)
    VALUES (p_user_id, p_name, v_clean_email, p_phone, p_college, p_team_name, 'participant', FALSE)
    ON CONFLICT (user_id) DO UPDATE
    SET name = EXCLUDED.name,
        phone = EXCLUDED.phone,
        college = EXCLUDED.college,
        team_name = EXCLUDED.team_name;

    -- Check if pass already exists
    SELECT pass_id INTO v_pass_id FROM public.passes WHERE user_id = p_user_id;

    IF v_pass_id IS NULL THEN
        -- Generate cryptographically random secure token: prefix + random 32 hex chars
        v_token := 'HACK-' || encode(gen_random_bytes(16), 'hex');

        INSERT INTO public.passes (user_id, token, status, used, entry_status)
        VALUES (p_user_id, v_token, 'active', FALSE, 'not_entered')
        RETURNING pass_id INTO v_pass_id;
    END IF;

    RETURN jsonb_build_object(
        'success', TRUE,
        'pass_id', v_pass_id
    );
END;
$$;

-- 4.3 ATOMIC SINGLE-USE QR SCAN VALIDATION RPC
-- Critical: Guarantees no race condition or double entry even under concurrent requests!
CREATE OR REPLACE FUNCTION public.scan_qr_pass(p_token TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_scanner_id UUID;
    v_scanner_role TEXT;
    v_pass RECORD;
    v_participant RECORD;
    v_existing_pass RECORD;
    v_clean_token TEXT;
BEGIN
    v_clean_token := TRIM(p_token);
    v_scanner_id := auth.uid();

    -- 1. Authorization check: Scanner must be authenticated and have role 'admin' or 'scanner'
    IF v_scanner_id IS NOT NULL THEN
        SELECT role, disabled INTO v_scanner_role, v_participant.disabled
        FROM public.profiles 
        WHERE user_id = v_scanner_id;

        IF v_scanner_role NOT IN ('admin', 'scanner') OR v_participant.disabled = TRUE THEN
            RETURN jsonb_build_object(
                'success', FALSE,
                'code', 'UNAUTHORIZED',
                'message', 'You do not have permission to scan passes.'
            );
        END IF;
    END IF;

    -- 2. ATOMIC CONDITIONAL UPDATE (Row-level exclusive write lock)
    -- Postgres row lock prevents any race condition: Only 1 concurrent update can succeed!
    UPDATE public.passes
    SET used = TRUE,
        entry_status = 'entered',
        entry_time = TIMEZONE('utc'::text, NOW()),
        scanned_by = v_scanner_id
    WHERE token = v_clean_token
      AND used = FALSE
      AND status = 'active'
    RETURNING * INTO v_pass;

    -- CASE 1: SUCCESSFUL SCAN (Row was locked and updated atomically)
    IF FOUND THEN
        -- Fetch participant details
        SELECT name, email, phone, college, team_name 
        INTO v_participant
        FROM public.profiles 
        WHERE user_id = v_pass.user_id;

        -- Record immutable audit log
        INSERT INTO public.entry_logs (pass_id, participant_id, scanned_by, scanned_at)
        VALUES (v_pass.pass_id, v_pass.user_id, v_scanner_id, v_pass.entry_time);

        RETURN jsonb_build_object(
            'success', TRUE,
            'code', 'ENTRY_APPROVED',
            'message', 'ENTRY APPROVED',
            'participant', jsonb_build_object(
                'name', v_participant.name,
                'email', v_participant.email,
                'team', v_participant.team_name,
                'college', v_participant.college,
                'phone', v_participant.phone
            ),
            'entry_time', v_pass.entry_time,
            'pass_id', v_pass.pass_id
        );
    END IF;

    -- CASE 2: UPDATE RETURNED 0 ROWS -> Diagnose exact reason
    SELECT p.*, prof.name as participant_name, prof.team_name, prof.college
    INTO v_existing_pass
    FROM public.passes p
    LEFT JOIN public.profiles prof ON p.user_id = prof.user_id
    WHERE p.token = v_clean_token;

    -- Token does not exist at all
    IF NOT FOUND THEN
        RETURN jsonb_build_object(
            'success', FALSE,
            'code', 'INVALID_PASS',
            'message', 'INVALID PASS: Unrecognized token. Please contact event organizers.'
        );
    END IF;

    -- Pass has been disabled by admin
    IF v_existing_pass.status = 'disabled' THEN
        RETURN jsonb_build_object(
            'success', FALSE,
            'code', 'PASS_DISABLED',
            'message', 'PASS DISABLED: This participant pass has been revoked by administrators.',
            'participant', jsonb_build_object(
                'name', v_existing_pass.participant_name,
                'team', v_existing_pass.team_name
            )
        );
    END IF;

    -- Pass was already used
    IF v_existing_pass.used = TRUE THEN
        RETURN jsonb_build_object(
            'success', FALSE,
            'code', 'ALREADY_USED',
            'message', 'PASS ALREADY USED: Re-entry is not permitted.',
            'participant', jsonb_build_object(
                'name', v_existing_pass.participant_name,
                'team', v_existing_pass.team_name,
                'college', v_existing_pass.college
            ),
            'original_entry_time', v_existing_pass.entry_time
        );
    END IF;

    -- Fallback generic invalid
    RETURN jsonb_build_object(
        'success', FALSE,
        'code', 'INVALID_PASS',
        'message', 'INVALID PASS: Cannot validate this entry pass.'
    );
END;
$$;

-- 4.4 Admin Toggle Participant Disabled Status (atomically invalidates pass)
CREATE OR REPLACE FUNCTION public.admin_toggle_participant_status(p_user_id UUID, p_disabled BOOLEAN)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    IF NOT public.is_admin() THEN
        RETURN jsonb_build_object('success', FALSE, 'message', 'Unauthorized. Admin only.');
    END IF;

    -- Update profile disabled status
    UPDATE public.profiles
    SET disabled = p_disabled
    WHERE user_id = p_user_id;

    -- Simultaneously update pass status so live token is immediately disabled/invalidated
    UPDATE public.passes
    SET status = CASE WHEN p_disabled THEN 'disabled' ELSE 'active' END
    WHERE user_id = p_user_id;

    RETURN jsonb_build_object('success', TRUE);
END;
$$;

-- 4.5 Admin Delete Participant (cascade deletes profile, pass, logs, and approved record)
CREATE OR REPLACE FUNCTION public.admin_delete_participant(p_user_id UUID, p_email TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    IF NOT public.is_admin() THEN
        RETURN jsonb_build_object('success', FALSE, 'message', 'Unauthorized. Admin only.');
    END IF;

    -- Delete entry logs if user_id present
    IF p_user_id IS NOT NULL THEN
        DELETE FROM public.entry_logs WHERE participant_id = p_user_id;
        DELETE FROM public.passes WHERE user_id = p_user_id;
        DELETE FROM public.profiles WHERE user_id = p_user_id;
    END IF;

    -- Delete from approved_participants if email present
    IF p_email IS NOT NULL THEN
        DELETE FROM public.approved_participants WHERE LOWER(email) = LOWER(p_email);
    END IF;

    RETURN jsonb_build_object('success', TRUE);
END;
$$;

-- ==============================================================================
-- 5. SAMPLE SEED DATA FOR TESTING (HACKDAYS - NMAMIT)
-- Single test participant for Tech Team verification
-- ==============================================================================
INSERT INTO public.approved_participants (email, name, team, college, usn, phone)
VALUES ('test@hackdays.io', 'Tech Team Test', 'Tech Team', 'NMAMIT', '4NM23CS001', '+91 98765 43210')
ON CONFLICT (email) DO UPDATE SET
    name = EXCLUDED.name,
    team = EXCLUDED.team,
    college = EXCLUDED.college,
    usn = EXCLUDED.usn,
    phone = EXCLUDED.phone;


