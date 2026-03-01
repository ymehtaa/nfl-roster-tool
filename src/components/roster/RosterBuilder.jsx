import { useState, useEffect } from 'react';
import PositionBadge from '../ui/PositionBadge';
import { SECTIONS, ALL_GROUPS, getGroupKey } from '../../utils/positionGroups';

const MAX_ROSTER = 53;

function capColor(count) {
  if (count >= MAX_ROSTER) return 'text-red-400';
  if (count >= 45) return 'text-yellow-400';
  return 'text-green-400';
}

function progressBarColor(count) {
  if (count >= MAX_ROSTER) return 'bg-red-500';
  if (count >= 45) return 'bg-yellow-500';
  return 'bg-blue-500';
}

function groupBarColor(filled, slots) {
  if (slots === 0) return null;
  if (filled === 0) return 'bg-gray-600';
  if (filled >= slots) return 'bg-green-500';
  return 'bg-yellow-500';
}

function groupCountColor(filled, slots) {
  if (slots === 0 || filled === 0) return 'text-gray-600';
  if (filled >= slots) return 'text-green-400';
  return 'text-yellow-400';
}

const NAME_RE = /^[a-zA-Z0-9]+$/;

export default function RosterBuilder({ roster, onRemovePlayer, onEmpty, onSave, savedRosterNames = [] }) {
  const [collapsed, setCollapsed] = useState(
    () => new Set(SECTIONS.flatMap(s => s.groups.map(g => g.key)))
  );
  const [showSaveForm, setShowSaveForm] = useState(false);
  const [saveName, setSaveName] = useState('');
  const [saveError, setSaveError] = useState('');

  const groupedSections = SECTIONS.map(section => ({
    ...section,
    groups: section.groups.map(group => ({
      ...group,
      players: roster.filter(p =>
        group.positions ? group.positions.has(p.position) : getGroupKey(p.position) === 'OTH'
      ),
    })),
  }));

  useEffect(() => {
    setCollapsed(prev => {
      const next = new Set(prev);
      for (const section of groupedSections) {
        for (const group of section.groups) {
          if (group.players.length > 0) next.delete(group.key);
        }
      }
      return next;
    });
  }, [roster]);

  const visibleSections = groupedSections.filter(section =>
    section.sectionKey !== 'other' || section.groups.some(g => g.players.length > 0)
  );

  function handleSaveNameChange(e) {
    setSaveName(e.target.value);
    setSaveError('');
  }

  function handleSaveSubmit() {
    const trimmed = saveName.trim();
    if (!trimmed) { setSaveError('Name is required.'); return; }
    if (!NAME_RE.test(trimmed)) { setSaveError('Alphanumeric only (no spaces).'); return; }
    if (trimmed.length > 30) { setSaveError('Max 30 characters.'); return; }
    if (savedRosterNames.some(n => n.toLowerCase() === trimmed.toLowerCase())) {
      setSaveError('Name already exists.'); return;
    }
    onSave(trimmed);
    setSaveName('');
    setSaveError('');
    setShowSaveForm(false);
  }

  function handleSaveKeyDown(e) {
    if (e.key === 'Enter') handleSaveSubmit();
    if (e.key === 'Escape') { setShowSaveForm(false); setSaveName(''); setSaveError(''); }
  }

  function toggleGroup(key) {
    setCollapsed((prev) => {
      const next = new Set(prev);
      next.has(key) ? next.delete(key) : next.add(key);
      return next;
    });
  }

  const count = roster.length;
  const pct = Math.min((count / MAX_ROSTER) * 100, 100);

  return (
    <div className="bg-gray-800 border border-gray-700 rounded-xl flex flex-col overflow-hidden">
      {/* Panel header */}
      <div className="px-4 pt-4 pb-3 border-b border-gray-700 flex-shrink-0">
        <div className="flex items-start justify-between mb-2">
          <div>
            <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-widest">
              Roster Builder
            </h2>
            <p className={`text-lg font-bold mt-0.5 tabular-nums ${capColor(count)}`}>
              {count}
              <span className="text-sm text-gray-500 font-normal"> / {MAX_ROSTER}</span>
            </p>
          </div>

          <div className="flex items-center gap-2 mt-1">
            <button
              onClick={() => { setShowSaveForm(v => !v); setSaveName(''); setSaveError(''); }}
              disabled={roster.length === 0}
              title="Save this roster"
              className="flex items-center gap-1.5 bg-blue-700 hover:bg-blue-600 disabled:opacity-30 disabled:cursor-not-allowed text-white text-xs font-medium px-3 py-1.5 rounded-lg transition-colors"
            >
              Save
            </button>
            <button
              onClick={onEmpty}
              disabled={roster.length === 0}
              className="flex items-center gap-1.5 bg-gray-700 hover:bg-red-800 disabled:opacity-30 disabled:cursor-not-allowed text-gray-300 hover:text-white text-xs font-medium px-3 py-1.5 rounded-lg transition-colors"
            >
              Clear
            </button>
          </div>
        </div>

        {/* Inline save form */}
        {showSaveForm && (
          <div className="mb-2">
            <div className="flex items-center gap-2">
              <input
                autoFocus
                type="text"
                value={saveName}
                onChange={handleSaveNameChange}
                onKeyDown={handleSaveKeyDown}
                placeholder="Roster name (alphanumeric)"
                maxLength={30}
                className="flex-1 bg-gray-700 border border-gray-600 focus:border-blue-500 focus:outline-none text-white text-xs rounded-lg px-3 py-1.5 placeholder-gray-500 transition-colors"
              />
              <button
                onClick={handleSaveSubmit}
                className="bg-blue-600 hover:bg-blue-500 text-white text-xs font-medium px-3 py-1.5 rounded-lg transition-colors whitespace-nowrap"
              >
                Confirm
              </button>
              <button
                onClick={() => { setShowSaveForm(false); setSaveName(''); setSaveError(''); }}
                className="text-gray-500 hover:text-gray-300 text-xs px-2 py-1.5 transition-colors"
              >
                Cancel
              </button>
            </div>
            {saveError && <p className="text-red-400 text-xs mt-1">{saveError}</p>}
          </div>
        )}

        {/* Progress bar */}
        <div className="h-1.5 bg-gray-700 rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-300 ${progressBarColor(count)}`}
            style={{ width: `${pct}%` }}
          />
        </div>

        {count >= MAX_ROSTER && (
          <p className="text-xs text-red-400 mt-1.5">Roster is full.</p>
        )}
      </div>

      {/* Position groups */}
      <div className="flex-1 overflow-y-auto">
        {visibleSections.map((section, sectionIdx) => (
          <div key={section.sectionKey}>
            {/* Section divider */}
            <div className={`px-4 py-1.5 ${sectionIdx > 0 ? 'border-t border-gray-700' : ''}`}>
              <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">
                {section.sectionLabel}
              </span>
            </div>

            {section.groups.map((group) => {
              const isExpanded = !collapsed.has(group.key);
              const filled = group.players.length;
              const { slots } = group;
              const barColor = groupBarColor(filled, slots);
              const barPct = slots > 0 ? Math.min((filled / slots) * 100, 100) : 0;

              return (
                <div key={group.key} className="border-b border-gray-700/50 last:border-0">
                  {/* Group header */}
                  <div
                    className="flex flex-col px-4 py-2 hover:bg-gray-700/40 cursor-pointer select-none"
                    onClick={() => toggleGroup(group.key)}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-gray-500 text-xs w-3">{isExpanded ? '▾' : '▸'}</span>
                        <span className="text-xs font-semibold text-gray-300 uppercase tracking-wider">
                          {group.label}
                        </span>
                      </div>
                      <span className={`text-xs font-medium tabular-nums ${groupCountColor(filled, slots)}`}>
                        {slots > 0
                          ? `${filled} / ${slots}`
                          : filled > 0 ? `${filled}` : ''}
                      </span>
                    </div>

                    {slots > 0 && (
                      <div className="h-0.5 bg-gray-700 rounded-full overflow-hidden mt-1.5 ml-5">
                        <div
                          className={`h-full rounded-full transition-all duration-300 ${barColor}`}
                          style={{ width: `${barPct}%` }}
                        />
                      </div>
                    )}
                  </div>

                  {/* Empty hint */}
                  {isExpanded && filled === 0 && (
                    <p className="text-gray-600 text-xs px-9 py-2">
                      {slots > 0 ? `Empty · ${slots} slots available` : 'Empty'}
                    </p>
                  )}

                  {/* Player rows */}
                  {isExpanded && filled > 0 &&
                    group.players.map((player) => (
                      <div
                        key={player.builtId}
                        className="flex items-center gap-3 pl-9 pr-4 py-2 hover:bg-gray-700/25 border-t border-gray-700/30"
                      >
                        <PositionBadge position={player.position} />

                        <div className="flex-1 min-w-0">
                          <p className="text-sm text-white font-medium truncate leading-tight">
                            {player.name}
                          </p>
                          <p className="text-xs text-gray-500 leading-tight mt-0.5">
                            {player.team} · {player.year}
                          </p>
                        </div>

                        <button
                          onClick={() => onRemovePlayer(player.builtId)}
                          title={`Remove ${player.name}`}
                          className="flex-shrink-0 w-6 h-6 rounded-full bg-gray-700 hover:bg-red-700 text-gray-400 hover:text-white text-sm font-bold flex items-center justify-center transition-colors"
                        >
                          −
                        </button>
                      </div>
                    ))}
                </div>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}
