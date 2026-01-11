import { supabase } from "@/integrations/supabase/client";
import type { User, Session } from "@supabase/supabase-js";

export type AppRole = 'analyst' | 'reviewer' | 'admin';

export interface UserProfile {
  id: string;
  user_id: string;
  email: string;
  full_name: string | null;
  created_at: string;
  updated_at: string;
}

export interface UserWithRole {
  user: User;
  profile: UserProfile | null;
  role: AppRole;
}

export async function signUp(email: string, password: string, fullName?: string) {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo: window.location.origin,
      data: {
        full_name: fullName || '',
      },
    },
  });

  if (error) throw error;
  return data;
}

export async function signIn(email: string, password: string) {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) throw error;
  return data;
}

export async function signOut() {
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
}

export async function getCurrentSession(): Promise<Session | null> {
  const { data: { session } } = await supabase.auth.getSession();
  return session;
}

export async function getUserProfile(userId: string): Promise<UserProfile | null> {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('user_id', userId)
    .maybeSingle();

  if (error) throw error;
  return data;
}

export async function getUserRole(userId: string): Promise<AppRole> {
  const { data, error } = await supabase
    .from('user_roles')
    .select('role')
    .eq('user_id', userId)
    .order('role')
    .limit(1)
    .maybeSingle();

  if (error) throw error;
  return (data?.role as AppRole) || 'analyst';
}

export async function getUserWithRole(user: User): Promise<UserWithRole> {
  const [profile, role] = await Promise.all([
    getUserProfile(user.id),
    getUserRole(user.id),
  ]);

  return { user, profile, role };
}

export function hasPermission(userRole: AppRole, requiredRole: AppRole): boolean {
  const roleHierarchy: Record<AppRole, number> = {
    admin: 3,
    reviewer: 2,
    analyst: 1,
  };

  return roleHierarchy[userRole] >= roleHierarchy[requiredRole];
}
