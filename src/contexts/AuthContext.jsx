import { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '../lib/supabaseClient';
import { useRosterStore } from '../stores/useRosterStore';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser]       = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Restore existing session on mount
    supabase.auth.getSession().then(({ data: { session } }) => {
      const u = session?.user ?? null;
      setUser(u);
      setLoading(false);
      if (u) hydrateFromSupabase(u);
    });

    // Listen for auth state changes (login, logout, token refresh)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        const u = session?.user ?? null;
        setUser(u);

        if (event === 'SIGNED_IN' && u) {
          hydrateFromSupabase(u);
        }

        if (event === 'SIGNED_OUT') {
          useRosterStore.getState().clearCloudItems();
        }
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  async function hydrateFromSupabase(u) {
    // 1. Fetch all saved items for this user from Supabase
    const { data, error } = await supabase
      .from('saved_items')
      .select('type, name, payload')
      .eq('user_id', u.id);

    if (error) {
      console.error('Hydration error:', error.message);
      return;
    }

    const cloudRosters = data
      .filter((r) => r.type === 'roster')
      .map((r) => ({ name: r.name, ...r.payload }));

    const cloudComparisons = data
      .filter((r) => r.type === 'comparison')
      .map((r) => ({ name: r.name, ...r.payload }));

    const cloudNames = new Set(data.map((r) => `${r.type}:${r.name}`));

    // 2. Load cloud items into store
    useRosterStore.getState().setCloudItems(cloudRosters, cloudComparisons);

    // 3. Auto-upload any local items that aren't already in Supabase
    const { savedRosters: localRosters, savedComparisons: localComparisons } =
      useRosterStore.getState();

    const uploads = [];

    for (const r of localRosters) {
      if (!cloudNames.has(`roster:${r.name}`)) {
        const { players, savedAt } = r;
        uploads.push(
          supabase.from('saved_items').upsert(
            { user_id: u.id, type: 'roster', name: r.name, payload: { players, savedAt }, updated_at: new Date().toISOString() },
            { onConflict: 'user_id,type,name' }
          )
        );
      }
    }

    for (const c of localComparisons) {
      if (!cloudNames.has(`comparison:${c.name}`)) {
        const { left, right, savedAt } = c;
        uploads.push(
          supabase.from('saved_items').upsert(
            { user_id: u.id, type: 'comparison', name: c.name, payload: { left, right, savedAt }, updated_at: new Date().toISOString() },
            { onConflict: 'user_id,type,name' }
          )
        );
      }
    }

    if (uploads.length > 0) {
      await Promise.all(uploads);
      // Re-fetch to get the complete merged list
      const { data: merged } = await supabase
        .from('saved_items')
        .select('type, name, payload')
        .eq('user_id', u.id);

      if (merged) {
        useRosterStore.getState().setCloudItems(
          merged.filter((r) => r.type === 'roster').map((r) => ({ name: r.name, ...r.payload })),
          merged.filter((r) => r.type === 'comparison').map((r) => ({ name: r.name, ...r.payload }))
        );
      }
    }

    // 4. Complete any pending save that triggered the login flow
    await useRosterStore.getState().completePendingSave(u);
  }

  function signInWithGoogle() {
    return supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: window.location.origin },
    });
  }

  function signOut() {
    return supabase.auth.signOut();
  }

  return (
    <AuthContext.Provider value={{ user, loading, signInWithGoogle, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>');
  return ctx;
}
