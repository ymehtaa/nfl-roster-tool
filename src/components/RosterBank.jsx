import { useState } from 'react';
import PositionBadge from './PositionBadge';

export default function RosterBank({ batches, onAddPlayer, onRemoveBatch, rosterFull }) {
  // Track which batches the user has manually collapsed (all start expanded)
  const [collapsed, setCollapsed] = useState(new Set());
  const [search, setSearch] = useState('');

  function toggleBatch(batchId) {
    setCollapsed((prev) => {
      const next = new Set(prev);
      next.has(batchId) ? next.delete(batchId) : next.add(batchId);
      return next;
    });
  }

  const q = search.trim().toLowerCase();

  const visibleBatches = batches.map((batch) => ({
    ...batch,
    filteredPlayers: q
      ? batch.players.filter(
          (p) =>
            p.name.toLowerCase().includes(q) ||
            p.position.toLowerCase().includes(q)
        )
      : batch.players,
  }));

  const totalPlayers = batches.reduce((n, b) => n + b.players.length, 0);

  return (
    <div className="bg-gray-800 border border-gray-700 rounded-xl flex flex-col overflow-hidden">
      {/* Panel header */}
      <div className="px-4 pt-4 pb-3 border-b border-gray-700 flex-shrink-0">
        <div className="flex items-baseline justify-between mb-3">
          <div>
            <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-widest">
              Import Bank
            </h2>
            <p className="text-xs text-gray-600 mt-0.5">
              {totalPlayers} players · {batches.length} import{batches.length !== 1 ? 's' : ''}
            </p>
          </div>
        </div>

        <input
          type="text"
          placeholder="Filter by name or position…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full bg-gray-700 border border-gray-600 text-white text-sm rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 placeholder-gray-500"
        />
      </div>

      {/* Batch list */}
      <div className="flex-1 overflow-y-auto">
        {batches.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-gray-600">
            <span className="text-4xl mb-3">📥</span>
            <p className="text-sm">No rosters imported yet.</p>
            <p className="text-xs mt-1">Use the selector above to add a team.</p>
          </div>
        ) : (
          visibleBatches.map((batch) => {
            const isExpanded = !collapsed.has(batch.batchId);
            return (
              <div key={batch.batchId} className="border-b border-gray-700/50 last:border-0">
                {/* Batch header row */}
                <div
                  className="flex items-center justify-between px-4 py-2.5 hover:bg-gray-700/40 cursor-pointer select-none"
                  onClick={() => toggleBatch(batch.batchId)}
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="text-gray-500 text-xs w-3 flex-shrink-0">
                      {isExpanded ? '▾' : '▸'}
                    </span>
                    <span className="font-semibold text-white text-sm">
                      {batch.year}&nbsp;{batch.team}
                    </span>
                    <span className="text-xs text-gray-500 flex-shrink-0">
                      {batch.players.length} players
                    </span>
                  </div>

                  {/* Remove batch button — stops event from toggling collapse */}
                  <button
                    onClick={(e) => { e.stopPropagation(); onRemoveBatch(batch.batchId); }}
                    className="text-gray-600 hover:text-red-400 transition-colors text-xs leading-none px-1 flex-shrink-0 ml-2"
                    title="Remove this import"
                  >
                    ✕
                  </button>
                </div>

                {/* Player rows */}
                {isExpanded && (
                  <div>
                    {batch.filteredPlayers.length === 0 && q ? (
                      <p className="text-xs text-gray-600 px-8 py-3">No matches.</p>
                    ) : (() => {
                      const hasDepthData = batch.filteredPlayers.some(p => p.depthRank != null);
                      const starters = hasDepthData ? batch.filteredPlayers.filter(p => p.depthRank === 1) : [];
                      const depth    = hasDepthData ? batch.filteredPlayers.filter(p => p.depthRank !== 1) : batch.filteredPlayers;

                      const PlayerRow = (player) => (
                        <div
                          key={player.id}
                          className="flex items-center gap-3 pl-9 pr-4 py-2 hover:bg-gray-700/25 border-t border-gray-700/30"
                        >
                          <PositionBadge position={player.position} />

                          <div className="flex-1 min-w-0">
                            <p className="text-sm text-white font-medium truncate leading-tight">
                              {player.name}
                            </p>
                            <p className="text-xs text-gray-500 truncate leading-tight mt-0.5">
                              {player.statsSummary}
                            </p>
                          </div>

                          <button
                            onClick={() => onAddPlayer(player)}
                            disabled={rosterFull}
                            title={rosterFull ? 'Roster full (53/53)' : `Add ${player.name}`}
                            className="flex-shrink-0 w-6 h-6 rounded-full bg-blue-700 hover:bg-blue-500 disabled:opacity-30 disabled:cursor-not-allowed text-white text-sm font-bold flex items-center justify-center transition-colors"
                          >
                            +
                          </button>
                        </div>
                      );

                      const SectionDivider = ({ label }) => (
                        <div className="px-3 py-1 border-t border-gray-700/50">
                          <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">
                            {label}
                          </span>
                        </div>
                      );

                      if (hasDepthData) {
                        return (
                          <>
                            {starters.length > 0 && <SectionDivider label="Starters" />}
                            {starters.map(PlayerRow)}
                            {depth.length > 0 && <SectionDivider label="Depth" />}
                            {depth.map(PlayerRow)}
                          </>
                        );
                      }
                      return depth.map(PlayerRow);
                    })()}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
