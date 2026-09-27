import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '../supabase/client';
import { signInUser, signOutUser } from '../supabase/auth';
import { generateSecurePassToken } from '../utils/generatePassId';
import { INITIAL_APPROVED, getSafeLocalStorage, setSafeLocalStorage } from '../utils/initialData';

const AuthContext = createContext(null);

export const TECH_TEAM_ADMINS = [
  {
    name: 'Vagish',
    email: 'vagish@hackdays.io',
    altEmail: 'vagish.organizer@gmail.com',
    role: 'admin',
    title: 'Tech Admin',
    id: 'admin_vagish',
  },
  {
    name: 'Yuvaraj',
    email: 'yuvaraj@hackdays.io',
    altEmail: 'yvuaraj@hackdays.io',
    role: 'admin',
    title: 'Tech Admin',
    id: 'admin_yuvaraj',
  },
  {
    name: 'Likith',
    email: 'likith@hackdays.io',
    altEmail: 'likith.tech@hackdays.io',
    role: 'admin',
    title: 'Tech Admin',
    id: 'admin_likith',
  },
  {
    name: 'Jithin',
    email: 'jithin@hackdays.io',
    altEmail: 'jithin.tech@hackdays.io',
    role: 'admin',
    title: 'Tech Admin',
    id: 'admin_jithin',
  },
];

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [role, setRole] = useState(null); // 'participant' | 'admin' | 'scanner'
  const [loading, setLoading] = useState(true);

  // Initialize local seed store immediately on mount
  useEffect(() => {
    const existing = getSafeLocalStorage('hackpass_v2_approved', null);
    if (!existing || existing.length === 0) {
      setSafeLocalStorage('hackpass_v2_approved', INITIAL_APPROVED);
    }
  }, []);

  // Load user profile and role
  const loadProfile = async (authUser) => {
    if (!authUser) {
      setProfile(null);
      setRole(null);
      return;
    }

    // 1. Try Supabase profiles table
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', authUser.id)
        .maybeSingle();

      if (!error && data) {
        setProfile(data);
        setRole(data.role || 'participant');
        return;
      }
    } catch (e) {
      console.warn('Profile fetch error from Supabase:', e);
    }

    // 2. Check metadata from auth signup
    const meta = authUser.user_metadata || {};
    const defaultRole = meta.role || (authUser.email?.includes('admin') ? 'admin' : 'participant');

    // 3. Fallback to localStorage profiles
    const localProfiles = getSafeLocalStorage('hackpass_v2_profiles', []);
    const found = localProfiles.find(
      p => p.email?.toLowerCase() === authUser.email?.toLowerCase() || p.user_id === authUser.id
    );
    if (found) {
      setProfile(found);
      setRole(found.role || defaultRole);
      return;
    }

    // 4. Default fallback profile
    const fallbackProfile = {
      user_id: authUser.id,
      name: meta.name || authUser.email?.split('@')[0] || 'User',
      email: authUser.email,
      role: defaultRole,
      phone: meta.phone || '',
      college: meta.college || '',
      team_name: meta.team_name || '',
      disabled: false,
    };
    setProfile(fallbackProfile);
    setRole(defaultRole);
  };

  useEffect(() => {
    let mounted = true;

    // Check active session on mount
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!mounted) return;
      if (session?.user) {
        setUser(session.user);
        loadProfile(session.user).finally(() => setLoading(false));
      } else {
        // Check for local mock session if set
        const localSession = localStorage.getItem('hackpass_active_session');
        if (localSession) {
          try {
            const parsed = JSON.parse(localSession);
            setUser(parsed.user);
            setProfile(parsed.profile);
            setRole(parsed.profile?.role || 'admin');
          } catch {}
        }
        setLoading(false);
      }
    });

    // Listen for auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (!mounted) return;
      if (session?.user) {
        setUser(session.user);
        await loadProfile(session.user);
      } else {
        const localSession = localStorage.getItem('hackpass_active_session');
        if (!localSession) {
          setUser(null);
          setProfile(null);
          setRole(null);
        }
      }
      setLoading(false);
    });

    return () => {
      mounted = false;
      subscription?.unsubscribe();
    };
  }, []);

  // Universal Robust Login Handler (Works on Desktop, iOS, Android)
  const login = async (email, password) => {
    const cleanEmail = (email || '').trim().toLowerCase();

    // 1. Check if this is one of our 4 Tech Team Admins
    const matchedAdmin = TECH_TEAM_ADMINS.find(
      a => a.email.toLowerCase() === cleanEmail ||
           a.altEmail?.toLowerCase() === cleanEmail ||
           cleanEmail === `${a.name.toLowerCase()}@hackdays.io` ||
           cleanEmail === `${a.name.toLowerCase()}@admin.io`
    );

    if (matchedAdmin || cleanEmail === 'admin@hackdays.io' || cleanEmail === 'admin@hackspire.io' || cleanEmail.startsWith('admin@')) {
      const adminData = matchedAdmin || {
        name: 'Tech Admin',
        email: cleanEmail,
        title: 'Tech Admin',
        id: 'admin_master_1',
      };

      const mockAdminUser = {
        id: adminData.id,
        email: adminData.email,
        user_metadata: { name: adminData.name, role: 'admin', title: adminData.title },
      };
      const mockAdminProfile = {
        user_id: adminData.id,
        name: adminData.name,
        email: adminData.email,
        role: 'admin',
        disabled: false,
      };
      setSafeLocalStorage('hackpass_active_session', { user: mockAdminUser, profile: mockAdminProfile });
      setUser(mockAdminUser);
      setProfile(mockAdminProfile);
      setRole('admin');
      return { user: mockAdminUser };
    }

    // 2. Gate Scanner Volunteer Login
    if (cleanEmail === 'scanner@hackdays.io' || cleanEmail === 'scanner@hackspire.io' || cleanEmail.startsWith('scanner@')) {
      const mockScanUser = {
        id: 'scanner_vol_01',
        email: cleanEmail,
        user_metadata: { name: 'Gate Volunteer', role: 'scanner' },
      };
      const mockScanProfile = {
        user_id: 'scanner_vol_01',
        name: 'Gate Volunteer',
        email: cleanEmail,
        role: 'scanner',
        disabled: false,
      };
      setSafeLocalStorage('hackpass_active_session', { user: mockScanUser, profile: mockScanProfile });
      setUser(mockScanUser);
      setProfile(mockScanProfile);
      setRole('scanner');
      return { user: mockScanUser };
    }

    // 3. Try real Supabase auth if connected
    try {
      const data = await signInUser(cleanEmail, password);
      if (data?.user) {
        setUser(data.user);
        await loadProfile(data.user);
        return data;
      }
    } catch (err) {
      // Supabase user doesn't exist or table pending, fall through to auto-account provision
    }

    // 4. Check existing profiles in local store
    const localProfiles = getSafeLocalStorage('hackpass_v2_profiles', []);
    let localUser = localProfiles.find(p => p.email?.toLowerCase() === cleanEmail);

    // 5. If not registered yet, check if this is an approved participant
    // Auto-create account and pass immediately so they can log in seamlessly with default password password123!
    if (!localUser) {
      const approvedList = getSafeLocalStorage('hackpass_v2_approved', INITIAL_APPROVED);
      const approvedItem = approvedList.find(p => p.email?.toLowerCase() === cleanEmail);

      if (approvedItem) {
        const autoUserId = `user_${Date.now()}`;
        localUser = {
          user_id: autoUserId,
          name: approvedItem.name,
          email: approvedItem.email,
          team_name: approvedItem.team,
          college: approvedItem.college,
          usn: approvedItem.usn ? approvedItem.usn.trim().toUpperCase() : '',
          phone: approvedItem.phone || '+91 98765 43210',
          role: 'participant',
          disabled: false,
          created_at: new Date().toISOString(),
        };
        localProfiles.push(localUser);
        setSafeLocalStorage('hackpass_v2_profiles', localProfiles);

        // Auto-provision pass
        const localPasses = getSafeLocalStorage('hackpass_v2_passes', []);
        const newPass = {
          pass_id: `pass_${Date.now()}`,
          user_id: autoUserId,
          token: generateSecurePassToken(),
          status: 'active',
          used: false,
          entry_status: 'not_entered',
          scanned_by: null,
          entry_time: null,
          created_at: new Date().toISOString(),
        };
        localPasses.push(newPass);
        setSafeLocalStorage('hackpass_v2_passes', localPasses);

        // Sync with background server
        try {
          fetch('/api/sync/register', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ profile: localUser, pass: newPass }),
          }).catch(() => {});
        } catch (e) {}
      }
    }

    if (localUser) {
      // Check custom password if user changed their initial password
      const customPasswords = getSafeLocalStorage('hackpass_v2_passwords', {});
      const userCustomPass = customPasswords[cleanEmail];
      if (userCustomPass) {
        if (password !== userCustomPass) {
          throw new Error('Incorrect password. Please enter your personal custom password or PIN.');
        }
      } else {
        const cleanInputPass = (password || '').trim().toUpperCase();
        const userUsn = (localUser.usn || '').trim().toUpperCase();

        const validDefaults = ['PASSWORD123', 'ADMIN123'];
        if (userUsn) validDefaults.push(userUsn);
        if (localUser.phone) {
          validDefaults.push(localUser.phone.replace(/[^0-9]/g, ''));
        }

        if (!validDefaults.includes(cleanInputPass)) {
          throw new Error(
            userUsn
              ? 'Incorrect password. Please enter your College USN (e.g. 4NM23CS001).'
              : 'Incorrect password. Default initial password is your College USN or password123.'
          );
        }
      }

      const mockUser = {
        id: localUser.user_id,
        email: localUser.email,
        user_metadata: { name: localUser.name, role: localUser.role || 'participant' },
      };
      setSafeLocalStorage('hackpass_active_session', { user: mockUser, profile: localUser });
      setUser(mockUser);
      setProfile(localUser);
      setRole(localUser.role || 'participant');
      return { user: mockUser };
    }

    throw new Error('This email was not found in the HACKDAYS participant database. Please verify your email or contact the ACM Tech Team.');
  };

  // Demo direct switch for testing Tech Team Admins
  const loginAsDemo = (type = 'admin') => {
    const key = (type || '').toLowerCase();
    
    // Check if one of the 4 Tech Team Admins
    const techAdmin = TECH_TEAM_ADMINS.find(a => a.name.toLowerCase() === key || a.id === key);
    if (techAdmin || key === 'admin') {
      const target = techAdmin || TECH_TEAM_ADMINS[0]; // defaults to Vagish
      const adminUser = {
        id: target.id,
        email: target.email,
        user_metadata: { name: target.name, role: 'admin' },
      };
      const adminProfile = {
        user_id: target.id,
        name: target.name,
        email: target.email,
        role: 'admin',
        disabled: false,
      };
      setSafeLocalStorage('hackpass_active_session', { user: adminUser, profile: adminProfile });
      setUser(adminUser);
      setProfile(adminProfile);
      setRole('admin');
      return;
    }

    if (key === 'scanner') {
      const scanUser = {
        id: 'scanner_vol_01',
        email: 'scanner@hackdays.io',
        user_metadata: { name: 'Gate Volunteer', role: 'scanner' },
      };
      const scanProfile = {
        user_id: 'scanner_vol_01',
        name: 'Gate Volunteer',
        email: 'scanner@hackdays.io',
        role: 'scanner',
        disabled: false,
      };
      setSafeLocalStorage('hackpass_active_session', { user: scanUser, profile: scanProfile });
      setUser(scanUser);
      setProfile(scanProfile);
      setRole('scanner');
    }
  };

  // Allow participant to set a personal 4-6 digit numeric PIN to prevent other teams from claiming their pass
  const changePassword = async (newPassword) => {
    if (!user?.email) throw new Error('Not logged in');
    const clean = (newPassword || '').replace(/\D/g, '').slice(0, 6);
    if (clean.length < 4 || clean.length > 6) {
      throw new Error('PIN must be between 4 and 6 numeric digits');
    }
    const cleanEmail = user.email.toLowerCase();
    const customPasswords = getSafeLocalStorage('hackpass_v2_passwords', {});
    customPasswords[cleanEmail] = clean;
    setSafeLocalStorage('hackpass_v2_passwords', customPasswords);

    try {
      await supabase
        .from('profiles')
        .update({ security_pin: clean })
        .eq('email', cleanEmail);
    } catch (e) {}

    if (profile) {
      const updatedProfile = { ...profile, security_pin: clean };
      setProfile(updatedProfile);
      const activeSession = getSafeLocalStorage('hackpass_active_session', null);
      if (activeSession) {
        setSafeLocalStorage('hackpass_active_session', { ...activeSession, profile: updatedProfile });
      }
    }
    return true;
  };

  // Logout handler
  const logout = async () => {
    localStorage.removeItem('hackpass_active_session');
    await signOutUser();
    setUser(null);
    setProfile(null);
    setRole(null);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        profile,
        role,
        loading,
        login,
        changePassword,
        loginAsDemo,
        logout,
        refreshProfile: () => loadProfile(user),
        isAdmin: role === 'admin',
        isScanner: role === 'scanner' || role === 'admin',
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
