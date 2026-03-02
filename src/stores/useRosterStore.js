import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { supabase } from '../lib/supabaseClient';
import { log } from '../services/logService';
import { track } from '@vercel/analytics';

const MAX_ROSTER = 53;

// ---------------------------------------------------------------------------
// Supabase helpers
// ---------------------------------------------------------------------------

async function upsertItem(userId, type, name, payload) {
  const { error } = await supabase.from('saved_items').upsert(
    { user_id: userId, type, name, payload, updated_at: new Date().toISOString() },
    { onConflict: 'user_id,type,name' }
  );
  if (error) {
    console.error(`[nfl:store] upsert ${type} "${name}" FAILED:`, error.message, error);
    throw error;
  }
}

async function deleteItem(userId, type, name) {
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

      clearRoster: () => {
        log('roster_cleared', { count: get().builtRoster.length });
        track('roster_cleared', { count: get().builtRoster.length });
        set({ builtRoster: [], currentRosterName: null });
      },

      loadSharedRoster: (players) => {
        const loaded = players.slice(0, 53);
        log('roster_share_loaded', { count: loaded.length });
        set({
          builtRoster: loaded.map((p) => ({
            ...p,
            builtId: `built-${Date.now()}-${Math.random().toString(36).slice(2)}`,
          })),
          activeTab: 'builder',
          currentRosterName: null,
        });
      },

      // ── Saved roster actions ──────────────────────────────────────────────

      saveRoster: async (name, user) => {
        const { builtRoster } = get();
        const payload = { players: builtRoster, savedAt: Date.now() };

        if (!user) {
          log('roster_save_deferred', { name, count: builtRoster.length, reason: 'no_auth' });
          set({ pendingSave: { type: 'roster', name, data: payload } });
          return 'needs_auth';
        }

        const entry = { name, ...payload };
        set((s) => ({
          savedRosters: s.savedRosters.some((r) => r.name === name)
            ? s.savedRosters.map((r) => (r.name === name ? entry : r))
            : [...s.savedRosters, entry],
          currentRosterName: name,
        }));

        try {
          await upsertItem(user.id, 'roster', name, payload);
          log('roster_saved', { name, count: builtRoster.length, userId: user.id });
          track('roster_saved', { count: builtRoster.length });
        } catch (err) {
          log('roster_save_sync_failed', { name, error: err.message, userId: user.id });
          console.error(`[nfl:store] saveRoster "${name}" sync failed — saved locally only`, err);
        }
      },

      deleteRoster: async (name, user) => {
        set((s) => ({ savedRosters: s.savedRosters.filter((r) => r.name !== name) }));
        log('roster_deleted', { name, userId: user?.id ?? null });
        track('roster_deleted');
        if (user) {
          try {
            await deleteItem(user.id, 'roster', name);
          } catch (err) {
            log('roster_delete_sync_failed', { name, error: err.message, userId: user.id });
            console.error(`[nfl:store] deleteRoster "${name}" sync failed`, err);
          }
        }
      },

      loadSavedRoster: (name) => {
        const found = get().savedRosters.find((r) => r.name === name);
        if (found) {
          log('roster_loaded', { name, count: found.players.length });
          track('roster_loaded');
          set({ builtRoster: found.players, currentRosterName: name });
        }
      },

      // ── Saved comparison actions ──────────────────────────────────────────

      saveComparison: async (name, left, right, user) => {
        const payload = { left, right, savedAt: Date.now() };

        if (!user) {
          log('comparison_save_deferred', { name, reason: 'no_auth' });
          set({ pendingSave: { type: 'comparison', name, data: payload } });
          return 'needs_auth';
        }

        const entry = { name, ...payload };
        set((s) => ({
          savedComparisons: s.savedComparisons.some((c) => c.name === name)
            ? s.savedComparisons.map((c) => (c.name === name ? entry : c))
            : [...s.savedComparisons, entry],
        }));

        try {
          await upsertItem(user.id, 'comparison', name, payload);
          log('comparison_saved', { name, userId: user.id });
          track('comparison_saved');
        } catch (err) {
          log('comparison_save_sync_failed', { name, error: err.message, userId: user.id });
          console.error(`[nfl:store] saveComparison "${name}" sync failed — saved locally only`, err);
        }
      },

      deleteComparison: async (name, user) => {
        set((s) => ({
          savedComparisons: s.savedComparisons.filter((c) => c.name !== name),
        }));
        log('comparison_deleted', { name, userId: user?.id ?? null });
        track('comparison_deleted');
        if (user) {
          try {
            await deleteItem(user.id, 'comparison', name);
          } catch (err) {
            log('comparison_delete_sync_failed', { name, error: err.message, userId: user.id });
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
            log('roster_saved', { name, count: data.players?.length, userId: user.id, via: 'pending' });
            track('roster_saved', { count: data.players?.length ?? 0 });
          } else if (type === 'comparison') {
            const entry = { name, ...data };
            set((s) => ({
              savedComparisons: s.savedComparisons.some((c) => c.name === name)
                ? s.savedComparisons.map((c) => (c.name === name ? entry : c))
                : [...s.savedComparisons, entry],
            }));
            await upsertItem(user.id, 'comparison', name, data);
            log('comparison_saved', { name, userId: user.id, via: 'pending' });
            track('comparison_saved');
          }
        } catch (err) {
          log('pending_save_failed', { type, name, error: err.message, userId: user.id });
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
