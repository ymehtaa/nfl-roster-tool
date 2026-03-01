import Header from './components/layout/Header';
import SourceSelector from './components/roster/SourceSelector';
import RosterBank from './components/roster/RosterBank';
import RosterBuilder from './components/roster/RosterBuilder';
import SavedRosters from './components/roster/SavedRosters';
import CompareView from './components/compare/CompareView';
import LoginModal from './components/layout/LoginModal';
import { fetchRoster } from './services/dataService';
import { useRosterStore } from './stores/useRosterStore';
import { useAuth } from './contexts/AuthContext';

export default function App() {
  const { user } = useAuth();

  const {
    activeTab,
    importedBatches,
    builtRoster,
    savedRosters,
    savedComparisons,
    isLoading,
    error,
    lastImport,
    pendingSave,
    setLoading,
    setError,
    setLastImport,
    addBatch,
    removeBatch,
    addPlayer,
    removePlayer,
    clearRoster,
    saveRoster,
    deleteRoster,
    loadSavedRoster,
    saveComparison,
    deleteComparison,
    clearPendingSave,
    setActiveTab,
  } = useRosterStore();

  const showLoginModal = pendingSave !== null && user === null;

  async function handleImport(team, year) {
    setLoading(true);
    setError(null);
    try {
      const players = await fetchRoster(team, year);
      const batchId = `${year}-${team}-${Date.now()}`;
      addBatch({ batchId, team, year, players });
      setLastImport({ team, year, count: players.length });
    } catch (err) {
      setError(`Import failed: ${err.message}`);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-gray-950 text-white flex flex-col">
      <Header activeTab={activeTab} onTabChange={setActiveTab} user={user} />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 py-6 flex flex-col gap-4">
        {activeTab === 'builder' && (
          <>
            <SourceSelector onImport={handleImport} isLoading={isLoading} />

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

            <div className="grid grid-cols-2 gap-4" style={{ minHeight: '0', height: 'calc(100vh - 260px)' }}>
              <RosterBank
                batches={importedBatches}
                onAddPlayer={addPlayer}
                onRemoveBatch={removeBatch}
                rosterFull={builtRoster.length >= 53}
              />
              <RosterBuilder
                roster={builtRoster}
                onRemovePlayer={removePlayer}
                onEmpty={clearRoster}
                onSave={(name) => saveRoster(name, user)}
                savedRosterNames={savedRosters.map((r) => r.name)}
              />
            </div>

            <SavedRosters
              rosters={savedRosters}
              currentRosterEmpty={builtRoster.length === 0}
              onSave={(name) => saveRoster(name, user)}
              onLoad={loadSavedRoster}
              onDelete={(name) => deleteRoster(name, user)}
            />
          </>
        )}

        {activeTab === 'compare' && (
          <CompareView
            savedRosters={savedRosters}
            savedComparisons={savedComparisons}
            onSaveComparison={(name, left, right) => saveComparison(name, left, right, user)}
            onDeleteComparison={(name) => deleteComparison(name, user)}
          />
        )}
      </main>

      {showLoginModal && <LoginModal onClose={clearPendingSave} />}
    </div>
  );
}
