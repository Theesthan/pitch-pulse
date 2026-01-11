import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { AppRole, getUserWithRole, UserProfile } from '@/lib/auth';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  profile: UserProfile | null;
  role: AppRole;
  loading: boolean;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  session: null,
  profile: null,
  role: 'analyst',
  loading: true,
  isAuthenticated: false,
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [role, setRole] = useState<AppRole>('analyst');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Set up auth state listener FIRST
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, newSession) => {
        setSession(newSession);
        setUser(newSession?.user ?? null);

        if (newSession?.user) {
          // Defer profile/role fetch to avoid blocking
          setTimeout(async () => {
            try {
              const userData = await getUserWithRole(newSession.user);
              setProfile(userData.profile);
              setRole(userData.role);
            } catch (error) {
              console.error('Error fetching user data:', error);
            }
          }, 0);
        } else {
          setProfile(null);
          setRole('analyst');
        }

        setLoading(false);
      }
    );

    // THEN get the initial session
    supabase.auth.getSession().then(async ({ data: { session: initialSession } }) => {
      setSession(initialSession);
      setUser(initialSession?.user ?? null);

      if (initialSession?.user) {
        try {
          const userData = await getUserWithRole(initialSession.user);
          setProfile(userData.profile);
          setRole(userData.role);
        } catch (error) {
          console.error('Error fetching user data:', error);
        }
      }

      setLoading(false);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        profile,
        role,
        loading,
        isAuthenticated: !!user,
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
