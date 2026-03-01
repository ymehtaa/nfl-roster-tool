import { useState, useCallback, useEffect } from 'react';
import Header from './components/Header';
import SourceSelector from './components/SourceSelector';
import RosterBank from './components/RosterBank';
import RosterBuilder from './components/RosterBuilder';
import SavedRosters from './components/SavedRosters';
import CompareView from './components/CompareView';
import { fetchRoster } from './services/dataService';

const MAX_ROSTER = 53;

function loadFromStorage(key) {
  try { return JSON.parse(localStorage.getItem(key)) ?? []; }
  catch { return []; }
}

export default function App() {
  const [activeTab, setActiveTab] = useState('builder');

  // Each entry: { batchId, team, year, players: Player[] }
  const [importedBatches, setImportedBatches] = useState(
    () => loadFromStorage('nfl_roster_tool:imported_batches')
  );

  // Players the user has explicitly added to their built roster (max 53)
  const [builtRoster, setBuiltRoster] = useState(
    () => loadFromStorage('nfl_roster_tool:built_roster')
  );

  // Named roster snapshots: { name, players, savedAt }[]
  const [savedRosters, setSavedRosters] = useState(
    () => loadFromStorage('nfl_roster_tool:saved_rosters')
  );

  // Saved comparisons: { name, left: {label, players}, right: {label, players}, savedAt }[]
  const [savedComparisons, setSavedComparisons] = useState(
    () => loadFromStorage('nfl_roster_tool:saved_comparisons')
  );

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [lastImport, setLastImport] = useState(null);

  // ── Persistence sync ─────────────────────────────────────────────────────
  useEffect(() => {
    localStorage.setItem('nfl_roster_tool:built_roster', JSON.stringify(builtRoster));
  }, [builtRoster]);

  useEffect(() => {
    localStorage.setItem('nfl_roster_tool:imported_batches', JSON.stringify(importedBatches));
  }, [importedBatches]);

  useEffect(() => {
    localStorage.setItem('nfl_roster_tool:saved_rosters', JSON.stringify(savedRosters));
  }, [savedRosters]);

  useEffect(() => {
    localStorage.setItem('nfl_roster_tool:saved_comparisons', JSON.stringify(savedComparisons));
  }, [savedComparisons]);

  // ── Import ──────────────────────────────────────────────────────────────
  const handleImport = useCallback(async (team, year) => {
    setIsLoading(true);
    setError(null);

    try {
      const players = await fetchRoster(team, year);
      const batchId = `${year}-${team}-${Date.now()}`;
      setImportedBatches((prev) => [...prev, { batchId, team, year, players }]);
      setLastImport({ team, year, count: players.length });
    } catch (err) {
      setError(`Import failed: ${err.message}`);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // ── Bank management ─────────────────────────────────────────────────────
  function removeBatch(batchId) {
    setImportedBatches((prev) => prev.filter((b) => b.batchId !== batchId));
  }

  // ── Roster management ───────────────────────────────────────────────────
  function addPlayerToRoster(player) {
    if (builtRoster.length >= MAX_ROSTER) return;
    const builtId = `built-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    setBuiltRoster((prev) => [...prev, { ...player, builtId }]);
  }

  function removePlayerFromRoster(builtId) {
    setBuiltRoster((prev) => prev.filter((p) => p.builtId !== builtId));
  }

  function clearBuiltRoster() {
    setBuiltRoster([]);
  }

  // ── Saved roster management ──────────────────────────────────────────────
  function saveRoster(name) {
    setSavedRosters(prev => [...prev, { name, players: builtRoster, savedAt: Date.now() }]);
  }

  function loadSavedRoster(name) {
    const found = savedRosters.find(r => r.name === name);
    if (found) setBuiltRoster(found.players);
  }

  function deleteSavedRoster(name) {
    setSavedRosters(prev => prev.filter(r => r.name !== name));
  }

  // ── Saved comparison management ──────────────────────────────────────────
  function saveComparison(name, left, right) {
    setSavedComparisons(prev => [...prev, { name, left, right, savedAt: Date.now() }]);
  }

  function deleteComparison(name) {
    setSavedComparisons(prev => prev.filter(c => c.name !== name));
  }

  return (
    <div className="min-h-screen bg-gray-950 text-white flex flex-col">
      <Header activeTab={activeTab} onTabChange={setActiveTab} />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 py-6 flex flex-col gap-4">
        {activeTab === 'builder' && (
          <>
            <SourceSelector onImport={handleImport} isLoading={isLoading} />

            {/* Banners */}
            {error && (
              <div className="bg-red-950 border border-red-700 text-red-300 text-sm rounded-lg px-4 py-3 flex items-start gap-2">
                <span className="mt-0.5">⚠️</span>
                <span>{error}</span>
              </div>
            )}
            {lastImport && !error && (
              <div className="bg-green-950 border border-green-700 text-green-300 text-sm rounded-lg px-4 py-3 flex items-center gap-2">
                <span>✅</span>
                <span>
                  Imported <strong>{lastImport.count}</strong> players from the{' '}
                  <strong>{lastImport.year} {lastImport.team}</strong> roster into the bank.
                </span>
              </div>
            )}

            {/* Two-column workspace */}
            <div className="grid grid-cols-2 gap-4" style={{ minHeight: '0', height: 'calc(100vh - 260px)' }}>
              <RosterBank
                batches={importedBatches}
                onAddPlayer={addPlayerToRoster}
                onRemoveBatch={removeBatch}
                rosterFull={builtRoster.length >= MAX_ROSTER}
              />
              <RosterBuilder
                roster={builtRoster}
                onRemovePlayer={removePlayerFromRoster}
                onEmpty={clearBuiltRoster}
                onSave={saveRoster}
                savedRosterNames={savedRosters.map(r => r.name)}
              />
            </div>

            {/* Saved rosters panel */}
            <SavedRosters
              rosters={savedRosters}
              currentRosterEmpty={builtRoster.length === 0}
              onSave={saveRoster}
              onLoad={loadSavedRoster}
              onDelete={deleteSavedRoster}
            />
          </>
        )}

        {activeTab === 'compare' && (
          <CompareView
            savedRosters={savedRosters}
            savedComparisons={savedComparisons}
            onSaveComparison={saveComparison}
            onDeleteComparison={deleteComparison}
          />
        )}
      </main>
    </div>
  );
}
