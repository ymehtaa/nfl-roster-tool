import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { supabase } from '../lib/supabaseClient';

const MAX_ROSTER = 53;

// ---------------------------------------------------------------------------
// Supabase helpers
// ---------------------------------------------------------------------------

async function upsertItem(userId, type, name, payload) {
  console.log(`[nfl:store] upsert ${type} "${name}" for user ${userId}`);
  const { error } = await supabase.from('saved_items').upsert(
    { user_id: userId, type, name, payload, updated_at: new Date().toISOString() },
    { onConflict: 'user_id,type,name' }
  );
  if (error) {
    console.error(`[nfl:store] upsert ${type} "${name}" FAILED:`, error.message, error);
    throw error;
  }
  console.log(`[nfl:store] upsert ${type} "${name}" OK`);
}

async function deleteItem(userId, type, name) {
  console.log(`[nfl:store] delete ${type} "${name}" for user ${userId}`);
  const { error } = await supabase
    .from('saved_items')
    .delete()
    .eq('user_id', userId)
    .eq('type', type)
    .eq('name', name);
  if (error) {
    console.error(`[nfl:store] delete ${type} "${name}" FAILED:`, error.message, error);
    throw error;
  }
  console.log(`[nfl:store] delete ${type} "${name}" OK`);
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
      currentRosterName: null,

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

      clearRoster: () => set({ builtRoster: [], currentRosterName: null }),

      loadSharedRoster: (players) =>
        set({
          builtRoster: players
            .slice(0, 53)
            .map((p) => ({ ...p, builtId: `built-${Date.now()}-${Math.random().toString(36).slice(2)}` })),
          activeTab: 'builder',
          currentRosterName: null,
        }),

      // ── Saved roster actions ──────────────────────────────────────────────

      saveRoster: async (name, user) => {
        const { builtRoster } = get();
        const payload = { players: builtRoster, savedAt: Date.now() };

        if (!user) {
          console.log(`[nfl:store] saveRoster "${name}" — no user, queuing pendingSave`);
          set({ pendingSave: { type: 'roster', name, data: payload } });
          return 'needs_auth';
        }

        console.log(`[nfl:store] saveRoster "${name}" — user ${user.id}`);
        const entry = { name, ...payload };
        set((s) => ({
          savedRosters: s.savedRosters.some((r) => r.name === name)
            ? s.savedRosters.map((r) => (r.name === name ? entry : r))
            : [...s.savedRosters, entry],
          currentRosterName: name,
        }));

        try {
          await upsertItem(user.id, 'roster', name, payload);
        } catch (err) {
          console.error(`[nfl:store] saveRoster "${name}" sync failed — saved locally only`, err);
        }
      },

      deleteRoster: async (name, user) => {
        set((s) => ({ savedRosters: s.savedRosters.filter((r) => r.name !== name) }));
        if (user) {
          try {
            await deleteItem(user.id, 'roster', name);
          } catch (err) {
            console.error(`[nfl:store] deleteRoster "${name}" sync failed`, err);
          }
        }
      },

      loadSavedRoster: (name) => {
        const found = get().savedRosters.find((r) => r.name === name);
        if (found) set({ builtRoster: found.players, currentRosterName: name });
      },

      // ── Saved comparison actions ──────────────────────────────────────────

      saveComparison: async (name, left, right, user) => {
        const payload = { left, right, savedAt: Date.now() };

        if (!user) {
          console.log(`[nfl:store] saveComparison "${name}" — no user, queuing pendingSave`);
          set({ pendingSave: { type: 'comparison', name, data: payload } });
          return 'needs_auth';
        }

        console.log(`[nfl:store] saveComparison "${name}" — user ${user.id}`);
        const entry = { name, ...payload };
        set((s) => ({
          savedComparisons: s.savedComparisons.some((c) => c.name === name)
            ? s.savedComparisons.map((c) => (c.name === name ? entry : c))
            : [...s.savedComparisons, entry],
        }));

        try {
          await upsertItem(user.id, 'comparison', name, payload);
        } catch (err) {
          console.error(`[nfl:store] saveComparison "${name}" sync failed — saved locally only`, err);
        }
      },

      deleteComparison: async (name, user) => {
        set((s) => ({
          savedComparisons: s.savedComparisons.filter((c) => c.name !== name),
        }));
        if (user) {
          try {
            await deleteItem(user.id, 'comparison', name);
          } catch (err) {
            console.error(`[nfl:store] deleteComparison "${name}" sync failed`, err);
          }
        }
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
        console.log(`[nfl:store] completePendingSave — ${type} "${name}" for user ${user.id}`);
        set({ pendingSave: null });

        try {
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
        } catch (err) {
          console.error(`[nfl:store] completePendingSave failed for ${type} "${name}"`, err);
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
        currentRosterName: state.currentRosterName,
      }),
    }
  )
);
