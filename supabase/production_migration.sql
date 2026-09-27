-- ==============================================================================
-- HackDays QR Pass - Production Cloud Migration (Run this in Supabase SQL Editor)
-- Enables cross-device live sync between Participant Phones and Admin Scanners
-- ==============================================================================

-- 1. DROP CONSTRAINTS THAT RESTRICT USERS TO SUPABASE AUTH (auth.users)
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_user_id_fkey;
ALTER TABLE public.passes DROP CONSTRAINT IF EXISTS passes_scanned_by_fkey;
ALTER TABLE public.passes DROP CONSTRAINT IF EXISTS passes_user_id_fkey;
ALTER TABLE public.entry_logs DROP CONSTRAINT IF EXISTS entry_logs_scanned_by_fkey;
ALTER TABLE public.entry_logs DROP CONSTRAINT IF EXISTS entry_logs_participant_id_fkey;
ALTER TABLE public.entry_logs DROP CONSTRAINT IF EXISTS entry_logs_pass_id_fkey;

-- 2. CONVERT UUID COLUMNS TO TEXT (Allows custom user IDs & pass IDs)
ALTER TABLE public.profiles ALTER COLUMN user_id TYPE TEXT;
ALTER TABLE public.passes ALTER COLUMN pass_id TYPE TEXT;
ALTER TABLE public.passes ALTER COLUMN user_id TYPE TEXT;
ALTER TABLE public.passes ALTER COLUMN scanned_by TYPE TEXT;
ALTER TABLE public.entry_logs ALTER COLUMN entry_id TYPE TEXT;
ALTER TABLE public.entry_logs ALTER COLUMN pass_id TYPE TEXT;
ALTER TABLE public.entry_logs ALTER COLUMN participant_id TYPE TEXT;
ALTER TABLE public.entry_logs ALTER COLUMN scanned_by TYPE TEXT;

-- 3. RE-ADD CASCADING FOREIGN KEY
ALTER TABLE public.passes 
  DROP CONSTRAINT IF EXISTS passes_user_id_fkey,
  ADD CONSTRAINT passes_user_id_fkey 
  FOREIGN KEY (user_id) REFERENCES public.profiles(user_id) ON DELETE CASCADE;

-- 4. OPEN ROW LEVEL SECURITY (RLS) FOR HACKATHON OPERATIONS
ALTER TABLE public.approved_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.passes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.entry_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public all approved_participants" ON public.approved_participants;
CREATE POLICY "Public all approved_participants" ON public.approved_participants FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Public all profiles" ON public.profiles;
CREATE POLICY "Public all profiles" ON public.profiles FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Public all passes" ON public.passes;
CREATE POLICY "Public all passes" ON public.passes FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Public all entry_logs" ON public.entry_logs;
CREATE POLICY "Public all entry_logs" ON public.entry_logs FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

-- 5. ATOMIC SCAN VALIDATION RPC (Postgres Atomic Row Lock)
CREATE OR REPLACE FUNCTION public.scan_qr_pass(p_token TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_pass RECORD;
    v_participant RECORD;
    v_clean_token TEXT;
    v_entry_time TIMESTAMPTZ;
BEGIN
    v_clean_token := TRIM(p_token);
    v_entry_time := TIMEZONE('utc'::text, NOW());

    -- Find pass by token
    SELECT * INTO v_pass FROM public.passes WHERE token = v_clean_token;

    IF NOT FOUND THEN
        RETURN jsonb_build_object(
            'success', FALSE,
            'code', 'INVALID_PASS',
            'message', 'INVALID PASS: Unrecognized token.'
        );
    END IF;

    -- Check if disabled
    IF v_pass.status = 'disabled' THEN
        RETURN jsonb_build_object(
            'success', FALSE,
            'code', 'PASS_DISABLED',
            'message', 'PASS REVOKED: This pass has been disabled by organizers.'
        );
    END IF;

    -- Check if already used
    IF v_pass.used = TRUE OR v_pass.entry_status = 'entered' THEN
        SELECT name, email, team_name, college INTO v_participant
        FROM public.profiles WHERE user_id = v_pass.user_id;

        RETURN jsonb_build_object(
            'success', FALSE,
            'code', 'ALREADY_USED',
            'message', 'ALREADY CLAIMED: Meal voucher has already been redeemed!',
            'entry_time', v_pass.entry_time,
            'participant', jsonb_build_object(
                'name', COALESCE(v_participant.name, 'Participant'),
                'email', v_participant.email,
                'team', v_participant.team_name,
                'college', v_participant.college
            )
        );
    END IF;

    -- Atomically update pass to USED
    UPDATE public.passes
    SET used = TRUE,
        entry_status = 'entered',
        entry_time = v_entry_time
    WHERE token = v_clean_token;

    -- Fetch participant info
    SELECT name, email, team_name, college INTO v_participant
    FROM public.profiles WHERE user_id = v_pass.user_id;

    -- Record immutable log
    INSERT INTO public.entry_logs (entry_id, pass_id, participant_id, scanned_at)
    VALUES (
        'entry_' || extract(epoch from now())::bigint || '_' || substr(md5(random()::text), 1, 6),
        v_pass.pass_id,
        v_pass.user_id,
        v_entry_time
    );

    RETURN jsonb_build_object(
        'success', TRUE,
        'code', 'ENTRY_APPROVED',
        'message', 'ENTRY APPROVED: Lunch voucher verified successfully!',
        'pass_id', v_pass.pass_id,
        'entry_time', v_entry_time,
        'participant', jsonb_build_object(
            'name', COALESCE(v_participant.name, 'Participant'),
            'email', v_participant.email,
            'team', v_participant.team_name,
            'college', v_participant.college
        )
    );
END;
$$;

-- 6. SEED TEST PARTICIPANT PROFILE & PASS (Immediate verification test)
INSERT INTO public.approved_participants (email, name, team, college, usn, phone)
VALUES ('test@hackdays.io', 'Tech Team Test', 'Tech Team', 'NMAMIT', '4NM23CS001', '+91 98765 43210')
ON CONFLICT (email) DO UPDATE SET
  name = EXCLUDED.name,
  team = EXCLUDED.team,
  college = EXCLUDED.college,
  usn = EXCLUDED.usn,
  phone = EXCLUDED.phone;

INSERT INTO public.profiles (user_id, name, email, college, team_name, usn, phone, role, disabled)
VALUES ('user_test_tech_team', 'Tech Team Test', 'test@hackdays.io', 'NMAMIT', 'Tech Team', '4NM23CS001', '+91 98765 43210', 'participant', false)
ON CONFLICT (user_id) DO UPDATE SET
  name = EXCLUDED.name,
  team_name = EXCLUDED.team_name,
  usn = EXCLUDED.usn,
  email = EXCLUDED.email;

INSERT INTO public.passes (pass_id, user_id, token, status, used, entry_status)
VALUES ('pass_test_001', 'user_test_tech_team', 'HACK-TEST-NMAMIT-001', 'active', false, 'not_entered')
ON CONFLICT (user_id) DO UPDATE SET
  token = EXCLUDED.token,
  status = 'active',
  used = false,
  entry_status = 'not_entered';
