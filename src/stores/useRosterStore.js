import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { supabase } from '../lib/supabaseClient';

const MAX_ROSTER = 53;

// ---------------------------------------------------------------------------
// Supabase helpers
// ---------------------------------------------------------------------------

async function upsertItem(userId, type, name, payload) {
  const { error } = await supabase.from('saved_items').upsert(
    { user_id: userId, type, name, payload, updated_at: new Date().toISOString() },
    { onConflict: 'user_id,type,name' }
  );
  if (error) throw error;
}

async function deleteItem(userId, type, name) {
  const { error } = await supabase
    .from('saved_items')
    .delete()
    .eq('user_id', userId)
    .eq('type', type)
    .eq('name', name);
  if (error) throw error;
}

// ---------------------------------------------------------------------------
// Store
// ---------------------------------------------------------------------------

export const useRosterStore = create(
  persist(
    (set, get) => ({
      // ── Active workarea (local only) ──────────────────────────────────────
      activeTab: 'builder',
      importedBatches: [],
      builtRoster: [],
      isLoading: false,
      error: null,
      lastImport: null,

      // ── Saved items (cloud-synced) ────────────────────────────────────────
      savedRosters: [],
      savedComparisons: [],

      // ── Pending save (set when guest tries to save) ───────────────────────
      pendingSave: null,

      // ── Workarea actions ──────────────────────────────────────────────────

      setActiveTab: (activeTab) => set({ activeTab }),
      setLoading: (isLoading) => set({ isLoading }),
      setError: (error) => set({ error }),
      setLastImport: (lastImport) => set({ lastImport }),

      addBatch: (batch) =>
        set((s) => ({ importedBatches: [...s.importedBatches, batch] })),

      removeBatch: (batchId) =>
        set((s) => ({
          importedBatches: s.importedBatches.filter((b) => b.batchId !== batchId),
        })),

      addPlayer: (player) =>
        set((s) => {
          if (s.builtRoster.length >= MAX_ROSTER) return s;
          const builtId = `built-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
          return { builtRoster: [...s.builtRoster, { ...player, builtId }] };
        }),

      removePlayer: (builtId) =>
        set((s) => ({
          builtRoster: s.builtRoster.filter((p) => p.builtId !== builtId),
        })),

      clearRoster: () => set({ builtRoster: [] }),

      // ── Saved roster actions ──────────────────────────────────────────────

      saveRoster: async (name, user) => {
        const { builtRoster, savedRosters } = get();
        const payload = { players: builtRoster, savedAt: Date.now() };

        if (!user) {
          set({ pendingSave: { type: 'roster', name, data: payload } });
          return 'needs_auth';
        }

        // Optimistic local update
        const entry = { name, ...payload };
        set((s) => ({
          savedRosters: s.savedRosters.some((r) => r.name === name)
            ? s.savedRosters.map((r) => (r.name === name ? entry : r))
            : [...s.savedRosters, entry],
        }));

        await upsertItem(user.id, 'roster', name, payload);
      },

      deleteRoster: async (name, user) => {
        set((s) => ({ savedRosters: s.savedRosters.filter((r) => r.name !== name) }));
        if (user) await deleteItem(user.id, 'roster', name);
      },

      loadSavedRoster: (name) => {
        const found = get().savedRosters.find((r) => r.name === name);
        if (found) set({ builtRoster: found.players });
      },

      // ── Saved comparison actions ──────────────────────────────────────────

      saveComparison: async (name, left, right, user) => {
        const payload = { left, right, savedAt: Date.now() };

        if (!user) {
          set({ pendingSave: { type: 'comparison', name, data: payload } });
          return 'needs_auth';
        }

        const entry = { name, ...payload };
        set((s) => ({
          savedComparisons: s.savedComparisons.some((c) => c.name === name)
            ? s.savedComparisons.map((c) => (c.name === name ? entry : c))
            : [...s.savedComparisons, entry],
        }));

        await upsertItem(user.id, 'comparison', name, payload);
      },

      deleteComparison: async (name, user) => {
        set((s) => ({
          savedComparisons: s.savedComparisons.filter((c) => c.name !== name),
        }));
        if (user) await deleteItem(user.id, 'comparison', name);
      },

      // ── Auth-driven sync ──────────────────────────────────────────────────

      setCloudItems: (rosters, comparisons) =>
        set({ savedRosters: rosters, savedComparisons: comparisons }),

      clearCloudItems: () => set({ savedRosters: [], savedComparisons: [] }),

      clearPendingSave: () => set({ pendingSave: null }),

      completePendingSave: async (user) => {
        const { pendingSave } = get();
        if (!pendingSave || !user) return;

        const { type, name, data } = pendingSave;
        set({ pendingSave: null });

        if (type === 'roster') {
          const entry = { name, ...data };
          set((s) => ({
            savedRosters: s.savedRosters.some((r) => r.name === name)
              ? s.savedRosters.map((r) => (r.name === name ? entry : r))
              : [...s.savedRosters, entry],
          }));
          await upsertItem(user.id, 'roster', name, data);
        } else if (type === 'comparison') {
          const entry = { name, ...data };
          set((s) => ({
            savedComparisons: s.savedComparisons.some((c) => c.name === name)
              ? s.savedComparisons.map((c) => (c.name === name ? entry : c))
              : [...s.savedComparisons, entry],
          }));
          await upsertItem(user.id, 'comparison', name, data);
        }
      },
    }),
    {
      name: 'nfl_roster_tool',
      // Only persist the active workarea; savedItems are hydrated from Supabase on login
      partialize: (state) => ({
        activeTab: state.activeTab,
        importedBatches: state.importedBatches,
        builtRoster: state.builtRoster,
        savedRosters: state.savedRosters,
        savedComparisons: state.savedComparisons,
      }),
    }
  )
);
