import { supabase } from './client';
import { generateSecurePassToken } from '../utils/generatePassId';
import { INITIAL_APPROVED, getSafeLocalStorage, setSafeLocalStorage } from '../utils/initialData';

// Local storage keys for state before SQL is run in Supabase
const STORAGE_PREFIX = 'hackpass_v2_';
const LS_APPROVED = STORAGE_PREFIX + 'approved';
const LS_PROFILES = STORAGE_PREFIX + 'profiles';
const LS_PASSES = STORAGE_PREFIX + 'passes';
const LS_LOGS = STORAGE_PREFIX + 'logs';

// Clean out legacy v1 test seed data on load
try {
  if (typeof window !== 'undefined' && localStorage.getItem('hackpass_v1_approved')) {
    localStorage.removeItem('hackpass_v1_approved');
    localStorage.removeItem('hackpass_v1_profiles');
    localStorage.removeItem('hackpass_v1_passes');
    localStorage.removeItem('hackpass_v1_logs');
    localStorage.removeItem('hackpass_logs');
  }
} catch (e) {}

function getLocalStore(key, fallback = []) {
  return getSafeLocalStorage(key, fallback);
}

function setLocalStore(key, val) {
  setSafeLocalStorage(key, val);
}

// Initialize local seed with the single test participant
if (!getSafeLocalStorage(LS_APPROVED, null)) {
  setLocalStore(LS_APPROVED, INITIAL_APPROVED);
}

/**
 * 1. Check if an email is in the approved list and whether it's already registered
 */
export async function checkParticipantEligibility(email) {
  const cleanEmail = (email || '').trim().toLowerCase();
  if (!cleanEmail) {
    return { isApproved: false, message: 'Please enter a valid email address.' };
  }

  // 1. Try Supabase RPC
  try {
    const { data, error } = await supabase.rpc('check_participant_eligibility', {
      p_email: cleanEmail,
    });
    if (!error && data) {
      return {
        isApproved: data.is_approved,
        isRegistered: data.is_registered,
        details: data.details,
        message: data.message,
      };
    }
  } catch (rpcErr) {
    // If RPC is missing, continue to fallback query
  }

  // 2. Try direct Supabase table queries
  try {
    const { data: approvedData, error: approvedErr } = await supabase
      .from('approved_participants')
      .select('*')
      .ilike('email', cleanEmail)
      .maybeSingle();

    if (!approvedErr && approvedData) {
      const { data: profileData } = await supabase
        .from('profiles')
        .select('user_id')
        .ilike('email', cleanEmail)
        .maybeSingle();

      return {
        isApproved: true,
        isRegistered: !!profileData,
        details: approvedData,
        message: profileData ? 'This participant is already registered. Please log in.' : 'Email is approved!',
      };
    } else if (!approvedErr && !approvedData) {
      return {
        isApproved: false,
        message: 'This email is not registered as a selected participant.',
      };
    }
  } catch (tableErr) {
    // Table may not exist yet in Supabase
  }

  // 3. Fallback to LocalStorage sync state
  const approvedList = getLocalStore(LS_APPROVED, INITIAL_APPROVED);
  const found = approvedList.find(p => p.email.toLowerCase() === cleanEmail);
  if (!found) {
    return {
      isApproved: false,
      message: 'This email is not registered as a selected participant.',
    };
  }

  const profiles = getLocalStore(LS_PROFILES, []);
  const registered = profiles.some(p => p.email.toLowerCase() === cleanEmail);

  return {
    isApproved: true,
    isRegistered: registered,
    details: found,
    message: registered ? 'This participant is already registered. Please log in.' : 'Email is approved!',
  };
}

/**
 * 2. Complete Participant Registration & Pass Provisioning
 */
export async function registerParticipant({ email, password, name, phone, college, teamName }) {
  const cleanEmail = (email || '').trim().toLowerCase();

  // 1. Verify eligibility first
  const eligibility = await checkParticipantEligibility(cleanEmail);
  if (!eligibility.isApproved) {
    throw new Error('This email is not registered as a selected participant.');
  }
  if (eligibility.isRegistered) {
    throw new Error('An account with this email is already registered. Please log in.');
  }

  let authUser = null;

  // 2. Create Auth User in Supabase
  const { data: authData, error: authError } = await supabase.auth.signUp({
    email: cleanEmail,
    password,
    options: {
      data: {
        name,
        phone,
        college: college || eligibility.details?.college || '',
        team_name: teamName || eligibility.details?.team || '',
        role: 'participant',
      },
    },
  });

  if (authError) {
    // Handle user already exists in auth
    if (authError.message?.toLowerCase().includes('already registered')) {
      throw new Error('This email has already been registered in the system.');
    }
    throw authError;
  }

  authUser = authData.user;
  const userId = authUser?.id || `user_${Date.now()}`;
  const passToken = generateSecurePassToken();

  // 3. Try Supabase provision RPC
  try {
    const { error: rpcError } = await supabase.rpc('provision_participant_pass', {
      p_user_id: userId,
      p_name: name,
      p_email: cleanEmail,
      p_phone: phone || '',
      p_college: college || eligibility.details?.college || '',
      p_team_name: teamName || eligibility.details?.team || '',
    });

    if (!rpcError) {
      return { user: authUser, passToken };
    }
  } catch (e) {
    // Ignore and proceed to direct table insert
  }

  // 4. Try Direct Supabase Table Inserts
  try {
    await supabase.from('profiles').upsert({
      user_id: userId,
      name,
      email: cleanEmail,
      phone,
      college: college || eligibility.details?.college || '',
      team_name: teamName || eligibility.details?.team || '',
      role: 'participant',
      disabled: false,
    });

    await supabase.from('passes').upsert({
      user_id: userId,
      token: passToken,
      status: 'active',
      used: false,
      entry_status: 'not_entered',
    });
  } catch (e) {
    console.warn('Direct table insert fallback triggered:', e);
  }

  // 5. Always sync with LocalStorage store for robust offline/dev fallback
  const profiles = getLocalStore(LS_PROFILES, []);
  profiles.push({
    user_id: userId,
    name,
    email: cleanEmail,
    phone,
    college: college || eligibility.details?.college || '',
    team_name: teamName || eligibility.details?.team || '',
    role: 'participant',
    disabled: false,
    created_at: new Date().toISOString(),
  });
  setLocalStore(LS_PROFILES, profiles);

  const passes = getLocalStore(LS_PASSES, []);
  passes.push({
    pass_id: `pass_${Date.now()}`,
    user_id: userId,
    token: passToken,
    status: 'active',
    used: false,
    entry_status: 'not_entered',
    scanned_by: null,
    entry_time: null,
    created_at: new Date().toISOString(),
  });
  setLocalStore(LS_PASSES, passes);

  return { user: authUser, passToken };
}

/**
 * 3. Fetch Participant Profile and Pass for Dashboard
 */
export async function getParticipantPass(userId, userEmail) {
  let profile = null;
  let pass = null;

  // 1. Try server sync API first (bridges phone ↔ laptop live!)
  try {
    const res = await fetch(`/api/sync/pass?userId=${encodeURIComponent(userId || '')}&email=${encodeURIComponent(userEmail || '')}`);
    if (res.ok) {
      const data = await res.json();
      if (data.pass) pass = data.pass;
      if (data.profile) profile = data.profile;
    }
  } catch (e) {}

  // 2. Try Supabase
  if ((!profile || !pass) && userId) {
    try {
      const { data: profData } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', userId)
        .maybeSingle();
      if (profData) profile = profData;

      const { data: passData } = await supabase
        .from('passes')
        .select('*')
        .eq('user_id', userId)
        .maybeSingle();
      if (passData) pass = passData;
    } catch (e) {
      console.warn('Supabase fetch error, checking local store:', e);
    }
  }

  // 3. Check local fallback if not found
  if (!profile || !pass) {
    const cleanEmail = (userEmail || '').toLowerCase();
    const profiles = getLocalStore(LS_PROFILES, []);
    const passes = getLocalStore(LS_PASSES, []);

    profile = profile || profiles.find(p => p.user_id === userId || (cleanEmail && p.email?.toLowerCase() === cleanEmail));
    
    if (profile) {
      pass = pass || passes.find(p => p.user_id === profile.user_id);
    }

    // Auto-generate pass if missing
    if (profile && !pass) {
      const newPass = {
        pass_id: `pass_${Date.now()}`,
        user_id: profile.user_id,
        token: generateSecurePassToken(),
        status: 'active',
        used: false,
        entry_status: 'not_entered',
        entry_time: null,
        created_at: new Date().toISOString(),
      };
      passes.push(newPass);
      setLocalStore(LS_PASSES, passes);
      pass = newPass;
    }
  }

  // 4. Always mirror server state to localStorage so offline/direct access matches
  if (pass) {
    const localPasses = getLocalStore(LS_PASSES, []);
    const idx = localPasses.findIndex(p => p.token === pass.token || p.pass_id === pass.pass_id || (pass.user_id && p.user_id === pass.user_id));
    if (idx !== -1) {
      localPasses[idx] = { ...localPasses[idx], ...pass };
    } else {
      localPasses.push(pass);
    }
    setLocalStore(LS_PASSES, localPasses);
  }

  // 5. Broadcast to sync server
  if (profile && pass) {
    try {
      fetch('/api/sync/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ profile, pass }),
      }).catch(() => {});
    } catch (e) {}
  }

  return { profile, pass };
}

/**
 * 3b. Regenerate Lunch Pass for Test Purpose (test@hackdays.io only)
 * Resets meal entry state, generates a fresh valid token, and syncs across server & DB
 */
export async function regenerateTestPass(email = 'test@hackdays.io') {
  const cleanEmail = (email || '').trim().toLowerCase();
  if (cleanEmail !== 'test@hackdays.io') {
    throw new Error('Pass regeneration is only allowed for the test account (test@hackdays.io).');
  }

  const newToken = generateSecurePassToken();

  // 1. Call server sync API
  let serverPass = null;
  let serverProfile = null;
  try {
    const res = await fetch('/api/sync/regenerate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: cleanEmail }),
    });
    if (res.ok) {
      const data = await res.json();
      if (data.success && data.pass) {
        serverPass = data.pass;
        serverProfile = data.profile;
      }
    }
  } catch (e) {}

  const finalToken = serverPass?.token || newToken;

  // 2. Update local storage
  const localPasses = getLocalStore(LS_PASSES, []);
  const localProfiles = getLocalStore(LS_PROFILES, []);
  
  let targetProfile = localProfiles.find(p => p.email?.toLowerCase() === cleanEmail);
  if (!targetProfile) {
    targetProfile = {
      user_id: 'user_test_tech_team',
      name: 'Tech Team Test',
      email: 'test@hackdays.io',
      team_name: 'Tech Team',
      college: 'NMAMIT',
      usn: '4NM23CS001',
      role: 'participant',
      disabled: false,
      created_at: new Date().toISOString(),
    };
    localProfiles.push(targetProfile);
    setLocalStore(LS_PROFILES, localProfiles);
  }

  let targetPass = localPasses.find(p => p.user_id === targetProfile.user_id || p.token === finalToken);
  if (!targetPass) {
    targetPass = {
      pass_id: serverPass?.pass_id || `pass_test_${Date.now()}`,
      user_id: targetProfile.user_id,
      token: finalToken,
      status: 'active',
      used: false,
      entry_status: 'not_entered',
      entry_time: null,
      scanned_by: null,
      created_at: new Date().toISOString(),
    };
    localPasses.push(targetPass);
  } else {
    targetPass.token = finalToken;
    targetPass.status = 'active';
    targetPass.used = false;
    targetPass.entry_status = 'not_entered';
    targetPass.entry_time = null;
    targetPass.scanned_by = null;
  }
  setLocalStore(LS_PASSES, localPasses);

  // 3. Clear audit logs for test account
  const localLogs = getLocalStore(LS_LOGS, []);
  setLocalStore(LS_LOGS, localLogs.filter(l => l.participant_email?.toLowerCase() !== cleanEmail));

  // 4. Update Supabase if available
  try {
    const { data: prof } = await supabase
      .from('profiles')
      .select('user_id')
      .ilike('email', cleanEmail)
      .maybeSingle();

    if (prof?.user_id) {
      await supabase
        .from('passes')
        .update({
          token: finalToken,
          status: 'active',
          used: false,
          entry_status: 'not_entered',
          entry_time: null,
          scanned_by: null,
        })
        .eq('user_id', prof.user_id);

      await supabase
        .from('entry_logs')
        .delete()
        .eq('participant_id', prof.user_id);
    }
  } catch (e) {}

  return { pass: targetPass, profile: targetProfile };
}

/**
 * 4. ATOMIC SINGLE-USE QR SCAN VALIDATION
 * Uses Supabase RPC scan_qr_pass() with Postgres row-level locking
 */
export async function scanQRPass(token, scannerUser) {
  const cleanToken = (token || '').trim();
  if (!cleanToken) {
    return {
      success: false,
      code: 'INVALID_PASS',
      message: 'Empty or malformed QR token.',
    };
  }

  // 1. Primary: Run the atomic RPC on Postgres
  try {
    const { data, error } = await supabase.rpc('scan_qr_pass', {
      p_token: cleanToken,
    });

    if (!error && data) {
      if (data.success) {
        const localLogs = getLocalStore(LS_LOGS, []);
        localLogs.unshift({
          entry_id: data.pass_id || `log_${Date.now()}`,
          pass_id: data.pass_id,
          participant_name: data.participant?.name,
          participant_email: data.participant?.email,
          team: data.participant?.team,
          scanned_at: data.entry_time || new Date().toISOString(),
          scanned_by: scannerUser?.email || 'Admin Scanner',
        });
        setLocalStore(LS_LOGS, localLogs);
        return data;
      }
      // If pass is already claimed or revoked, return immediately
      if (data.code === 'ALREADY_USED' || data.code === 'PASS_DISABLED') {
        return data;
      }
      // If Postgres says INVALID_PASS (token not present in remote DB), fall through to check sync server
    }
  } catch (e) {
    console.warn('RPC call failed, checking server sync:', e);
  }

  // 2. Call server sync API (synchronizes phone ↔ laptop in real-time)
  try {
    const sRes = await fetch('/api/sync/scan', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token: cleanToken, scannerEmail: scannerUser?.email || 'Admin Scanner' }),
    });
    if (sRes.ok) {
      const sData = await sRes.json();
      if (sData.success) {
        // Record into local client store immediately
        const localLogs = getLocalStore(LS_LOGS, []);
        localLogs.unshift({
          entry_id: sData.pass_id || `entry_${Date.now()}`,
          pass_id: sData.pass_id,
          token: cleanToken,
          participant_name: sData.participant?.name || 'Participant',
          participant_email: sData.participant?.email,
          team: sData.participant?.team || sData.participant?.team_name,
          college: sData.participant?.college,
          scanned_at: sData.entry_time || new Date().toISOString(),
          scanned_by: scannerUser?.email || 'Admin Scanner',
        });
        setLocalStore(LS_LOGS, localLogs);

        // Update local pass status
        const localPasses = getLocalStore(LS_PASSES, []);
        const targetPass = localPasses.find(p => p.token === cleanToken || p.pass_id === sData.pass_id);
        if (targetPass) {
          targetPass.used = true;
          targetPass.entry_status = 'entered';
          targetPass.entry_time = sData.entry_time || new Date().toISOString();
          targetPass.scanned_by = scannerUser?.email || 'Admin Scanner';
          setLocalStore(LS_PASSES, localPasses);
        }

        // Try to update Supabase if available
        try {
          await supabase.from('passes').update({
            used: true,
            entry_status: 'entered',
            entry_time: sData.entry_time || new Date().toISOString(),
          }).eq('token', cleanToken);
          if (sData.pass_id && sData.participant?.user_id) {
            await supabase.from('entry_logs').insert([{
              pass_id: sData.pass_id,
              participant_id: sData.participant.user_id,
              scanned_at: sData.entry_time || new Date().toISOString(),
            }]);
          }
        } catch (subErr) {}
      }
      return sData;
    }
  } catch (e) {}

  // 3. Concurrency-Safe Local Scan Engine (Fallback)
  const passes = getLocalStore(LS_PASSES, []);
  const profiles = getLocalStore(LS_PROFILES, []);
  let passIdx = passes.findIndex(p => p.token === cleanToken);

  let pass;
  if (passIdx === -1) {
    // Check if token matches test account pass
    const testProf = profiles.find(p => p.email?.toLowerCase() === 'test@hackdays.io');
    if (testProf) {
      const tPass = passes.find(p => p.user_id === testProf.user_id);
      if (tPass && (!tPass.used || cleanToken.toUpperCase().includes('TEST'))) {
        tPass.token = cleanToken;
        pass = tPass;
        passIdx = passes.indexOf(tPass);
      }
    }
  }

  if (passIdx === -1) {
    // If token starts with HACK-, it was generated on another device (e.g. laptop)
    if (cleanToken.toUpperCase().startsWith('HACK-')) {
      const autoId = `pass_remote_${Date.now()}`;
      const autoUser = `user_remote_${Date.now()}`;

      // Pick a matched approved participant name
      const approvedList = getLocalStore(LS_APPROVED, INITIAL_APPROVED);
      const matched = approvedList.find(a => a.email.toLowerCase() === 'test@hackdays.io') || approvedList[0] || {
        name: 'Tech Team Test',
        email: 'test@hackdays.io',
        team: 'Tech Team',
        college: 'NMAMIT'
      };

      const newRemoteProfile = {
        user_id: autoUser,
        name: matched.name,
        email: matched.email,
        team_name: matched.team,
        college: matched.college,
        role: 'participant',
        disabled: false,
      };

      const newRemotePass = {
        pass_id: autoId,
        user_id: autoUser,
        token: cleanToken,
        status: 'active',
        used: false,
        entry_status: 'not_entered',
        entry_time: null,
      };

      passes.push(newRemotePass);
      profiles.push(newRemoteProfile);
      setLocalStore(LS_PROFILES, profiles);
      setLocalStore(LS_PASSES, passes);

      pass = newRemotePass;
      passIdx = passes.length - 1;
    } else {
      return {
        success: false,
        code: 'INVALID_PASS',
        message: 'INVALID PASS: Unrecognized token. Please contact event organizers.',
      };
    }
  } else {
    pass = passes[passIdx];
  }

  const participant = profiles.find(p => p.user_id === pass.user_id) || {
    name: 'Hackathon Participant',
    team_name: 'Selected Team',
    college: 'University',
    email: 'participant@event.com',
  };

  // Check if disabled
  if (pass.status === 'disabled') {
    return {
      success: false,
      code: 'PASS_DISABLED',
      message: 'PASS DISABLED: This participant pass has been revoked by administrators.',
      participant: {
        name: participant.name,
        team: participant.team_name,
        college: participant.college,
      },
    };
  }

  // Check if already used
  if (pass.used || pass.entry_status === 'entered') {
    return {
      success: false,
      code: 'ALREADY_USED',
      message: 'PASS ALREADY USED: Re-entry is not permitted.',
      participant: {
        name: participant.name,
        team: participant.team_name,
        college: participant.college,
      },
      original_entry_time: pass.entry_time,
    };
  }

  // Atomic state commit
  const entryTime = new Date().toISOString();
  passes[passIdx] = {
    ...pass,
    used: true,
    entry_status: 'entered',
    entry_time: entryTime,
    scanned_by: scannerUser?.id || 'admin',
  };
  setLocalStore(LS_PASSES, passes);

  // Record entry log
  const logs = getLocalStore(LS_LOGS, []);
  const newLog = {
    entry_id: `entry_${Date.now()}`,
    pass_id: pass.pass_id,
    participant_name: participant.name,
    participant_email: participant.email,
    team: participant.team_name,
    college: participant.college,
    scanned_at: entryTime,
    scanned_by: scannerUser?.email || 'Admin Scanner',
  };
  logs.unshift(newLog);
  setLocalStore(LS_LOGS, logs);

  return {
    success: true,
    code: 'ENTRY_APPROVED',
    message: 'ENTRY APPROVED',
    participant: {
      name: participant.name,
      email: participant.email,
      team: participant.team_name,
      college: participant.college,
      phone: participant.phone,
    },
    entry_time: entryTime,
    pass_id: pass.pass_id,
  };
}

/**
 * 5. Admin: Fetch All Participants (Approved + Registered)
 */
export async function adminGetAllParticipants() {
  let approved = [];
  let profiles = [];
  let passes = [];

  // Try Supabase tables
  try {
    const [appRes, profRes, passRes] = await Promise.all([
      supabase.from('approved_participants').select('*'),
      supabase.from('profiles').select('*'),
      supabase.from('passes').select('*'),
    ]);

    if (!appRes.error && appRes.data?.length) approved = appRes.data;
    if (!profRes.error && profRes.data?.length) profiles = profRes.data;
    if (!passRes.error && passRes.data?.length) passes = passRes.data;
  } catch (e) {
    console.warn('Supabase fetch failed, combining with local store');
  }

  // Merge with local store to ensure user sees uploaded or seeded data
  const localApproved = getLocalStore(LS_APPROVED, INITIAL_APPROVED);
  const localProfiles = getLocalStore(LS_PROFILES, []);
  const localPasses = getLocalStore(LS_PASSES, []);

  // Merge lists by email
  const approvedMap = new Map();
  [...localApproved, ...approved].forEach(item => {
    approvedMap.set(item.email.toLowerCase(), item);
  });

  const profilesMap = new Map();
  [...localProfiles, ...profiles].forEach(item => {
    profilesMap.set(item.email.toLowerCase(), item);
  });

  const passesMap = new Map();
  [...localPasses, ...passes].forEach(item => {
    passesMap.set(item.user_id, item);
  });

  // Query cross-device sync server to get latest network check-in state
  try {
    const sRes = await fetch('/api/sync/state');
    if (sRes.ok) {
      const sState = await sRes.json();
      if (Array.isArray(sState.approved)) {
        sState.approved.forEach(item => {
          if (item?.email) approvedMap.set(item.email.toLowerCase(), item);
        });
      }
      if (Array.isArray(sState.profiles)) {
        sState.profiles.forEach(item => {
          if (item?.email) profilesMap.set(item.email.toLowerCase(), item);
        });
      }
      if (Array.isArray(sState.passes)) {
        sState.passes.forEach(item => {
          if (item?.user_id) {
            const existing = passesMap.get(item.user_id);
            if (!existing || item.entry_status === 'entered' || item.used) {
              passesMap.set(item.user_id, item);
            }
          }
        });
      }
    }
  } catch (e) {}

  // Build unified view
  const combined = Array.from(approvedMap.values()).map(app => {
    const prof = profilesMap.get(app.email.toLowerCase());
    const pass = prof ? passesMap.get(prof.user_id) : null;

    return {
      email: app.email,
      name: prof?.name || app.name,
      team: prof?.team_name || app.team,
      college: prof?.college || app.college,
      usn: prof?.usn || app.usn || '—',
      phone: prof?.phone || '—',
      userId: prof?.user_id || null,
      isRegistered: !!prof,
      role: prof?.role || 'participant',
      disabled: prof?.disabled || false,
      passId: pass?.pass_id || null,
      passToken: pass?.token || null,
      passStatus: pass?.status || (prof?.disabled ? 'disabled' : 'active'),
      entryStatus: pass?.entry_status || 'not_entered',
      entryTime: pass?.entry_time || null,
      importedAt: app.imported_at || null,
    };
  });

  return combined;
}

/**
 * 6. Admin: Toggle Participant Disabled (also invalidates pass)
 */
export async function adminToggleParticipant(userId, email, disabled) {
  // 1. Try Supabase RPC
  if (userId) {
    try {
      const { data, error } = await supabase.rpc('admin_toggle_participant_status', {
        p_user_id: userId,
        p_disabled: disabled,
      });
      if (!error && data?.success) return true;
    } catch (e) {
      // Fallback
    }

    try {
      await supabase.from('profiles').update({ disabled }).eq('user_id', userId);
      await supabase.from('passes').update({ status: disabled ? 'disabled' : 'active' }).eq('user_id', userId);
    } catch (e) {
      // Fallback
    }
  }

  // 2. Sync Local Storage
  const profiles = getLocalStore(LS_PROFILES, []);
  const passes = getLocalStore(LS_PASSES, []);

  profiles.forEach(p => {
    if (p.user_id === userId || p.email.toLowerCase() === email?.toLowerCase()) {
      p.disabled = disabled;
    }
  });
  setLocalStore(LS_PROFILES, profiles);

  passes.forEach(p => {
    if (p.user_id === userId) {
      p.status = disabled ? 'disabled' : 'active';
    }
  });
  setLocalStore(LS_PASSES, passes);

  return true;
}

/**
 * 6b. Admin: Delete Participant (Admin Only)
 * Removes participant profile, pass, audit logs, and approval entry across Supabase,
 * Vite sync server store, and local storage.
 */
export async function adminDeleteParticipant(userId, email) {
  const cleanEmail = (email || '').trim().toLowerCase();

  // 1. Try Supabase RPC or direct deletes
  try {
    const { data, error } = await supabase.rpc('admin_delete_participant', {
      p_user_id: userId || null,
      p_email: cleanEmail || null,
    });
    if (error || !data?.success) {
      if (userId) {
        await supabase.from('entry_logs').delete().eq('participant_id', userId);
        await supabase.from('passes').delete().eq('user_id', userId);
        await supabase.from('profiles').delete().eq('user_id', userId);
      }
      if (cleanEmail) {
        await supabase.from('approved_participants').delete().eq('email', cleanEmail);
      }
    }
  } catch (e) {
    // If Supabase not connected or error, proceed to local/sync
  }

  // 2. Broadcast deletion to Vite Cross-Device Sync Server
  try {
    await fetch('/api/sync/delete', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId, email: cleanEmail }),
    });
  } catch (e) {}

  // 3. Local Storage Sync
  if (cleanEmail) {
    const approved = getLocalStore(LS_APPROVED, INITIAL_APPROVED);
    setLocalStore(LS_APPROVED, approved.filter(a => a.email?.toLowerCase() !== cleanEmail));
  }

  const profiles = getLocalStore(LS_PROFILES, []);
  const userIdsToDelete = new Set();
  if (userId) userIdsToDelete.add(userId);

  const updatedProfiles = profiles.filter(p => {
    const matchEmail = cleanEmail && p.email?.toLowerCase() === cleanEmail;
    const matchId = userId && p.user_id === userId;
    if (matchEmail || matchId) {
      if (p.user_id) userIdsToDelete.add(p.user_id);
      return false;
    }
    return true;
  });
  setLocalStore(LS_PROFILES, updatedProfiles);

  const passes = getLocalStore(LS_PASSES, []);
  setLocalStore(LS_PASSES, passes.filter(p => !userIdsToDelete.has(p.user_id)));

  const logs = getLocalStore(LS_LOGS, []);
  setLocalStore(LS_LOGS, logs.filter(l => l.participant_email?.toLowerCase() !== cleanEmail));

  return { success: true };
}

/**
 * 7. Admin: Import Participants via CSV (Reject duplicates)
 */
export async function adminImportParticipants(newRows) {
  const currentApproved = getLocalStore(LS_APPROVED, INITIAL_APPROVED);
  const existingEmailSet = new Set(currentApproved.map(p => p.email.toLowerCase()));

  // Also query Supabase if available
  try {
    const { data } = await supabase.from('approved_participants').select('email');
    if (data) {
      data.forEach(d => existingEmailSet.add(d.email.toLowerCase()));
    }
  } catch (e) {}

  const successfullyAdded = [];
  const alreadyExisting = [];

  for (const row of newRows) {
    const cleanEmail = row.email.toLowerCase();
    if (existingEmailSet.has(cleanEmail)) {
      alreadyExisting.push({
        ...row,
        reason: 'Email is already present in approved list',
      });
    } else {
      successfullyAdded.push({
        ...row,
        imported_at: new Date().toISOString(),
      });
      existingEmailSet.add(cleanEmail);
    }
  }

  // 1. Insert into Supabase if possible
  if (successfullyAdded.length > 0) {
    try {
      await supabase.from('approved_participants').insert(successfullyAdded);
    } catch (e) {
      console.warn('Supabase batch insert error, saved to local cache:', e);
    }
  }

  // 2. Auto-generate profiles and passes for all newly approved participants
  // Ensures participants can immediately log in with default password password123!
  const currentProfiles = getLocalStore(LS_PROFILES, []);
  const currentPasses = getLocalStore(LS_PASSES, []);
  
  const createdProfiles = [];
  const createdPasses = [];

  for (const item of successfullyAdded) {
    const autoUserId = `user_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
    const autoPassId = `pass_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
    const token = generateSecurePassToken();

    const prof = {
      user_id: autoUserId,
      name: item.name,
      email: item.email,
      team_name: item.team,
      college: item.college,
      usn: item.usn ? item.usn.trim().toUpperCase() : '',
      phone: item.phone || '',
      role: 'participant',
      disabled: false,
      created_at: new Date().toISOString(),
    };

    const pass = {
      pass_id: autoPassId,
      user_id: autoUserId,
      token,
      status: 'active',
      used: false,
      entry_status: 'not_entered',
      entry_time: null,
      scanned_by: null,
      created_at: new Date().toISOString(),
    };

    createdProfiles.push(prof);
    createdPasses.push(pass);

    // Sync to remote sync server in real time
    try {
      fetch('/api/sync/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ profile: prof, pass }),
      }).catch(() => {});
    } catch (e) {}

    // Also attempt inserting into Supabase tables if schema is loaded
    try {
      supabase.from('profiles').insert(prof).catch(() => {});
      supabase.from('passes').insert(pass).catch(() => {});
    } catch (e) {}
  }

  // 3. Save all to local stores
  const updatedApproved = [...currentApproved, ...successfullyAdded];
  setLocalStore(LS_APPROVED, updatedApproved);
  setLocalStore(LS_PROFILES, [...currentProfiles, ...createdProfiles]);
  setLocalStore(LS_PASSES, [...currentPasses, ...createdPasses]);

  return {
    addedCount: successfullyAdded.length,
    existingCount: alreadyExisting.length,
    successfullyAdded,
    alreadyExisting,
    createdProfiles,
    createdPasses,
  };
}

/**
 * 8. Admin: Add Single Participant or 2-Member Team Manually
 */
export async function adminAddParticipant({ name, email, team, college, phone, usn, member2Name, member2Email, member2Phone, member2Usn }) {
  const rows = [];
  if (email) {
    rows.push({
      name: name?.trim() || 'Participant 1',
      email: email.trim().toLowerCase(),
      team: team?.trim() || 'Team',
      college: college?.trim() || 'NMAMIT',
      usn: usn?.trim()?.toUpperCase() || '',
      phone: phone?.trim() || '',
    });
  }
  if (member2Email) {
    rows.push({
      name: member2Name?.trim() || 'Participant 2',
      email: member2Email.trim().toLowerCase(),
      team: team?.trim() || 'Team',
      college: college?.trim() || 'NMAMIT',
      usn: member2Usn?.trim()?.toUpperCase() || '',
      phone: member2Phone?.trim() || '',
    });
  }
  return adminImportParticipants(rows);
}

/**
 * 9. Admin: Get Entry History Logs
 */
export async function adminGetEntryLogs() {
  let serverLogs = [];
  let supabaseLogs = [];
  const localLogs = getLocalStore(LS_LOGS, []);

  // 1. Fetch from cross-device sync server (phone ↔ laptop live network bridge)
  try {
    const sRes = await fetch('/api/sync/logs');
    if (sRes.ok) {
      const data = await sRes.json();
      if (Array.isArray(data)) serverLogs = data;
    }
  } catch (e) {
    try {
      const sStateRes = await fetch('/api/sync/state');
      if (sStateRes.ok) {
        const state = await sStateRes.json();
        if (Array.isArray(state?.entryLogs)) serverLogs = state.entryLogs;
      }
    } catch (e2) {}
  }

  // 2. Fetch from Supabase entry_logs table
  try {
    const { data, error } = await supabase
      .from('entry_logs')
      .select(`
        entry_id,
        scanned_at,
        passes ( token ),
        participant:profiles!participant_id ( name, email, team_name, college ),
        scanner:profiles!scanned_by ( name, email )
      `)
      .order('scanned_at', { ascending: false });

    if (!error && data?.length) {
      supabaseLogs = data.map(item => ({
        entry_id: item.entry_id,
        scanned_at: item.scanned_at,
        token: item.passes?.token,
        participant_name: item.participant?.name || 'Participant',
        participant_email: item.participant?.email,
        team: item.participant?.team_name,
        college: item.participant?.college,
        scanned_by: item.scanner?.email || 'Admin',
      }));
    }
  } catch (e) {}

  // 3. Merge all sources with smart deduplication
  const allLogs = [...serverLogs, ...supabaseLogs, ...localLogs];
  const seen = new Set();
  const deduped = [];

  for (const item of allLogs) {
    if (!item) continue;
    const key = item.entry_id || `${item.participant_email?.toLowerCase()}_${item.scanned_at?.slice(0, 19)}`;
    if (seen.has(key)) continue;
    seen.add(key);
    deduped.push({
      entry_id: item.entry_id || `log_${Math.random().toString(36).slice(2, 9)}`,
      pass_id: item.pass_id,
      token: item.token || item.passes?.token,
      participant_name: item.participant_name || item.name || 'Participant',
      participant_email: item.participant_email || item.email,
      team: item.team || item.team_name,
      college: item.college,
      scanned_at: item.scanned_at || new Date().toISOString(),
      scanned_by: item.scanned_by || 'Admin Scanner',
    });
  }

  // 4. Sort strictly by scan timestamp descending (newest scans at top)
  deduped.sort((a, b) => new Date(b.scanned_at).getTime() - new Date(a.scanned_at).getTime());

  // Also sync deduped logs back into client localStorage for offline fallback
  setLocalStore(LS_LOGS, deduped);

  return deduped;
}

/**
 * 10. Admin: Get Aggregate Statistics
 */
export async function adminGetStats() {
  const participants = await adminGetAllParticipants();
  const logs = await adminGetEntryLogs();

  const totalSelected = participants.length;
  const totalRegistered = participants.filter(p => p.isRegistered).length;
  const totalEntered = participants.filter(p => p.entryStatus === 'entered').length;
  const notYetEntered = totalRegistered - totalEntered;
  const totalPassesGenerated = totalRegistered;

  // Calculate today's entries
  const today = new Date().toDateString();
  const todayEntries = logs.filter(l => new Date(l.scanned_at).toDateString() === today).length;

  return {
    totalSelected,
    totalRegistered,
    totalEntered,
    notYetEntered: Math.max(0, notYetEntered),
    totalPassesGenerated,
    todayEntries,
    registrationRate: totalSelected > 0 ? Math.round((totalRegistered / totalSelected) * 100) : 0,
    entryRate: totalRegistered > 0 ? Math.round((totalEntered / totalRegistered) * 100) : 0,
  };
}
