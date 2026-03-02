import { useState, useEffect } from 'react';
import Header from './components/layout/Header';
import SourceSelector from './components/roster/SourceSelector';
import RosterBank from './components/roster/RosterBank';
import RosterBuilder from './components/roster/RosterBuilder';
import SavedRosters from './components/roster/SavedRosters';
import CompareView from './components/compare/CompareView';
import LoginModal from './components/layout/LoginModal';
import { fetchRoster } from './services/dataService';
import { fetchShare, fetchComparisonShare } from './services/shareService';
import { log } from './services/logService';
import { useRosterStore } from './stores/useRosterStore';
import { useAuth } from './contexts/AuthContext';

export default function App() {
  const { user } = useAuth();
  const [shareNotice, setShareNotice] = useState(null);
  const [sharedComparison, setSharedComparison] = useState(null);

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
    loadSharedRoster,
    saveComparison,
    deleteComparison,
    clearPendingSave,
    setActiveTab,
  } = useRosterStore();

  const showLoginModal = pendingSave !== null && user === null;

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const shareId = params.get('share');
    const shareCompId = params.get('shareComp');
    if (!shareId && !shareCompId) return;

    window.history.replaceState({}, '', window.location.pathname);

    if (shareId) {
      fetchShare(shareId)
        .then(({ name, players }) => {
          loadSharedRoster(players);
          setShareNotice({ type: 'success', msg: `Loaded shared roster: "${name}"` });
          log('roster_share_opened', { shareId, name, count: players?.length });
        })
        .catch(() => {
          setShareNotice({ type: 'error', msg: 'Share link is invalid or no longer exists.' });
          log('roster_share_open_failed', { shareId });
        });
    } else if (shareCompId) {
      fetchComparisonShare(shareCompId)
        .then(({ name, left, right }) => {
          setActiveTab('compare');
          setSharedComparison({ left, right });
          setShareNotice({ type: 'success', msg: `Loaded shared comparison: "${name}"` });
          log('comparison_share_opened', { shareId: shareCompId, name });
        })
        .catch(() => {
          setShareNotice({ type: 'error', msg: 'Share link is invalid or no longer exists.' });
          log('comparison_share_open_failed', { shareId: shareCompId });
        });
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!shareNotice) return;
    const t = setTimeout(() => setShareNotice(null), 5000);
    return () => clearTimeout(t);
  }, [shareNotice]);

  async function handleImport(team, year) {
    setLoading(true);
    setError(null);
    try {
      const players = await fetchRoster(team, year);
      const batchId = `${year}-${team}-${Date.now()}`;
      addBatch({ batchId, team, year, players });
      setLastImport({ team, year, count: players.length });
      log('roster_imported', { team, year, count: players.length });
    } catch (err) {
      setError(`Import failed: ${err.message}`);
      log('roster_import_failed', { team, year, error: err.message });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-gray-950 text-white flex flex-col">
      <Header activeTab={activeTab} onTabChange={setActiveTab} user={user} />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 py-6 flex flex-col gap-4">
        {shareNotice && (
          <div className={`text-sm rounded-lg px-4 py-3 flex items-center gap-2 border ${
            shareNotice.type === 'success'
              ? 'bg-green-950 border-green-700 text-green-300'
              : 'bg-red-950 border-red-700 text-red-300'
          }`}>
            <span>{shareNotice.type === 'success' ? '✅' : '⚠️'}</span>
            <span>{shareNotice.msg}</span>
          </div>
        )}

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
            sharedComparison={sharedComparison}
            onSharedComparisonConsumed={() => setSharedComparison(null)}
            user={user}
          />
        )}
      </main>

      {showLoginModal && <LoginModal onClose={clearPendingSave} />}
    </div>
  );
}
