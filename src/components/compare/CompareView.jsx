import { useState, useEffect } from 'react';
import PositionBadge from '../ui/PositionBadge';
import { SECTIONS, getGroupKey } from '../../utils/positionGroups';
import { fetchRoster } from '../../services/dataService';
import { NFL_TEAMS, YEARS } from '../../constants/teams';
import { createComparisonShare } from '../../services/shareService';

const NAME_RE = /^[a-zA-Z0-9 ]+$/;

const YEARS_DESC = [...YEARS].reverse();

function formatDate(ts) {
  return new Date(ts).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function emptySlot() {
  return { roster: null, label: '', isLoading: false, error: null };
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

// ── Roster Column ─────────────────────────────────────────────────────────

function RosterColumn({ slot, label, savedRosters, type, onTypeChange, team, year, onTeamChange, onYearChange, onFetch, onSelectSaved }) {
  const [collapsed, setCollapsed] = useState(() => new Set());

  // Auto-expand all groups when a new roster loads
  useEffect(() => {
    setCollapsed(new Set());
  }, [slot.roster]);

  function toggleGroup(key) {
    setCollapsed(prev => {
      const next = new Set(prev);
      next.has(key) ? next.delete(key) : next.add(key);
      return next;
    });
  }

  const count = slot.roster?.length ?? 0;

  const groupedSections = slot.roster
    ? SECTIONS.map(section => ({
        ...section,
        groups: section.groups.map(group => ({
          ...group,
          players: slot.roster
            .filter(p =>
              group.positions ? group.positions.has(p.position) : getGroupKey(p.position) === 'OTH'
            )
            .sort((a, b) => (a.depthRank ?? Infinity) - (b.depthRank ?? Infinity)),
        })),
      }))
    : [];

  const visibleSections = groupedSections.filter(section =>
    section.groups.some(g => g.players.length > 0)
  );

  return (
    <div className="bg-gray-800 border border-gray-700 rounded-xl flex flex-col overflow-hidden">
      {/* Column header */}
      <div className="px-4 pt-4 pb-3 border-b border-gray-700 flex-shrink-0 space-y-2">
        <div className="flex items-start justify-between">
          <div>
            <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-widest">{label}</h2>
            {slot.isLoading ? (
              <p className="text-sm text-gray-500 mt-0.5">Loading…</p>
            ) : slot.roster ? (
              <p className="text-lg font-bold text-white mt-0.5 truncate max-w-[180px]">{slot.label}</p>
            ) : (
              <p className="text-sm text-gray-600 mt-0.5">No roster selected</p>
            )}
          </div>
          {slot.roster && (
            <span className="text-xs tabular-nums text-gray-500 mt-1">
              {count} <span className="text-gray-700">players</span>
            </span>
          )}
        </div>

        {/* Source type toggle */}
        <div className="flex gap-1 bg-gray-900/50 p-0.5 rounded-lg">
          <button
            className={`flex-1 text-xs font-medium px-3 py-1.5 rounded-md transition-colors ${type === 'saved' ? 'bg-gray-700 text-white shadow-sm' : 'text-gray-500 hover:text-gray-300'}`}
            onClick={() => onTypeChange('saved')}
          >
            Saved Roster
          </button>
          <button
            className={`flex-1 text-xs font-medium px-3 py-1.5 rounded-md transition-colors ${type === 'real' ? 'bg-gray-700 text-white shadow-sm' : 'text-gray-500 hover:text-gray-300'}`}
            onClick={() => onTypeChange('real')}
          >
            Real Team
          </button>
        </div>

        {/* Saved roster picker */}
        {type === 'saved' && (
          <div className="mt-2">
            {savedRosters.length === 0 ? (
              <p className="text-xs text-gray-600 py-0.5">No saved rosters yet — build one first.</p>
            ) : (
              <select
                className="w-full bg-gray-700 border border-gray-600 text-white text-xs rounded-lg px-3 py-1.5 focus:outline-none focus:border-blue-500 transition-colors"
                defaultValue=""
                onChange={e => e.target.value && onSelectSaved(e.target.value)}
              >
                <option value="" disabled>Select a saved roster…</option>
                {savedRosters.map(r => (
                  <option key={r.name} value={r.name}>{r.name} · {r.players.length} players</option>
                ))}
              </select>
            )}
          </div>
        )}

        {/* Real team picker */}
        {type === 'real' && (
          <div className="mt-2 flex gap-1.5 items-center">
            <select
              value={team}
              onChange={e => onTeamChange(e.target.value)}
              className="flex-1 min-w-0 bg-gray-700 border border-gray-600 text-white text-xs rounded-lg px-2 py-1.5 focus:outline-none focus:border-blue-500 transition-colors"
            >
              {NFL_TEAMS.map(t => (
                <option key={t.abbr} value={t.abbr}>{t.abbr} – {t.name}</option>
              ))}
            </select>
            <select
              value={year}
              onChange={e => onYearChange(Number(e.target.value))}
              className="w-[72px] shrink-0 bg-gray-700 border border-gray-600 text-white text-xs rounded-lg px-2 py-1.5 focus:outline-none focus:border-blue-500 transition-colors"
            >
              {YEARS_DESC.map(y => <option key={y} value={y}>{y}</option>)}
            </select>
            <button
              onClick={onFetch}
              disabled={slot.isLoading}
              className="shrink-0 bg-blue-700 hover:bg-blue-600 disabled:opacity-50 text-white text-xs font-medium px-3 py-1.5 rounded-lg transition-colors"
            >
              {slot.isLoading ? '…' : 'Fetch'}
            </button>
          </div>
        )}

        {slot.error && (
          <p className="text-xs text-red-400 leading-snug">{slot.error}</p>
        )}
      </div>

      {/* Roster body */}
      <div className="flex-1 overflow-y-auto">
        {!slot.roster ? (
          <div className="flex flex-col items-center justify-center py-16 text-gray-600 select-none">
            <p className="text-sm">Select a roster above.</p>
          </div>
        ) : (
          visibleSections.map((section, sectionIdx) => {
            const populatedGroups = section.groups.filter(g => g.players.length > 0);
            return (
              <div key={section.sectionKey}>
                {/* Section divider — border-t only between sections, not doubling group's border-b */}
                <div className={`px-4 py-1.5 ${sectionIdx > 0 ? 'border-t border-gray-700' : ''}`}>
                  <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">
                    {section.sectionLabel}
                  </span>
                </div>

                {populatedGroups.map((group, groupIdx) => {
                  const filled = group.players.length;
                  const isExpanded = !collapsed.has(group.key);
                  const { slots } = group;
                  const barColor = groupBarColor(filled, slots);
                  const barPct = slots > 0 ? Math.min((filled / slots) * 100, 100) : 0;
                  const isLast = groupIdx === populatedGroups.length - 1;

                  return (
                    <div key={group.key} className={!isLast ? 'border-b border-gray-700/50' : ''}>
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
                            {slots > 0 ? `${filled} / ${slots}` : `${filled}`}
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

                      {/* Player rows */}
                      {isExpanded && group.players.map((player, idx) => (
                        <div
                          key={player.id ?? player.builtId ?? `${player.name}-${idx}`}
                          className="flex items-start gap-3 pl-9 pr-4 py-2 hover:bg-gray-700/25 border-t border-gray-700/30"
                        >
                          <PositionBadge position={player.position} />
                          <div className="flex-1 min-w-0">
                            <p className="text-sm text-white font-medium truncate leading-tight">
                              {player.name}
                            </p>
                            <p className="text-xs text-gray-500 leading-tight mt-0.5 truncate">
                              {player.team} · {player.year}
                              {player.statsSummary ? <span className="text-gray-600"> · {player.statsSummary}</span> : null}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  );
                })}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

// ── Main CompareView ───────────────────────────────────────────────────────

export default function CompareView({ savedRosters, savedComparisons, onSaveComparison, onDeleteComparison, sharedComparison, onSharedComparisonConsumed, user }) {
  const [left,  setLeft]  = useState(emptySlot);
  const [right, setRight] = useState(emptySlot);

  const [leftType,  setLeftType]  = useState('saved');
  const [rightType, setRightType] = useState('saved');
  const [leftTeam,  setLeftTeam]  = useState('NE');
  const [leftYear,  setLeftYear]  = useState(2007);
  const [rightTeam, setRightTeam] = useState('KC');
  const [rightYear, setRightYear] = useState(2023);

  const [saveName,  setSaveName]  = useState('');
  const [saveError, setSaveError] = useState('');
  const [shareState, setShareState] = useState('idle'); // 'idle'|'loading'|'copied'|'error'

  useEffect(() => {
    if (!sharedComparison) return;
    loadComparison(sharedComparison);
    onSharedComparisonConsumed?.();
  }, [sharedComparison]); // eslint-disable-line react-hooks/exhaustive-deps

  async function fetchSlot(side, team, year) {
    const setter = side === 'left' ? setLeft : setRight;
    setter(prev => ({ ...prev, isLoading: true, error: null }));
    try {
      const players = await fetchRoster(team, year);
      const teamObj = NFL_TEAMS.find(t => t.abbr === team);
      setter({ roster: players, label: `${year} ${teamObj?.name ?? team}`, isLoading: false, error: null });
    } catch (err) {
      setter(prev => ({ ...prev, isLoading: false, error: err.message }));
    }
  }

  function selectSaved(side, name) {
    const found = savedRosters.find(r => r.name === name);
    if (!found) return;
    const setter = side === 'left' ? setLeft : setRight;
    setter({ roster: found.players, label: found.name, isLoading: false, error: null });
  }

  function loadComparison(c) {
    setLeft({ roster: c.left.players, label: c.left.label, isLoading: false, error: null });
    setRight({ roster: c.right.players, label: c.right.label, isLoading: false, error: null });
    setLeftType('saved');
    setRightType('saved');
  }

  function handleSave() {
    const trimmed = saveName.trim();
    if (!trimmed) { setSaveError('Name is required.'); return; }
    if (!NAME_RE.test(trimmed)) { setSaveError('Letters, numbers, and spaces only.'); return; }
    if (trimmed.length > 30) { setSaveError('Max 30 characters.'); return; }
    if (savedComparisons.some(c => c.name.toLowerCase() === trimmed.toLowerCase())) {
      setSaveError('Name already exists.'); return;
    }
    onSaveComparison(trimmed, { label: left.label, players: left.roster }, { label: right.label, players: right.roster });
    setSaveName('');
    setSaveError('');
  }

  async function handleShare() {
    setShareState('loading');
    try {
      const name = `${left.label} vs ${right.label}`;
      const shareId = await createComparisonShare(
        name,
        { label: left.label, players: left.roster },
        { label: right.label, players: right.roster },
        user?.id ?? null,
      );
      const url = `${window.location.origin}?shareComp=${shareId}`;
      await navigator.clipboard.writeText(url);
      setShareState('copied');
      setTimeout(() => setShareState('idle'), 2500);
    } catch {
      setShareState('error');
      setTimeout(() => setShareState('idle'), 2500);
    }
  }

  const bothFilled = left.roster !== null && right.roster !== null;

  return (
    <div className="flex flex-col gap-4">
      {/* Page header bar */}
      <div className="bg-gray-800 border border-gray-700 rounded-xl px-4 py-3.5">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-widest">Compare Rosters</h2>
            <p className="text-xs text-gray-600 mt-0.5">
              {bothFilled
                ? `${left.label}  ·  ${right.label}`
                : 'Select a roster for each column below.'}
            </p>
          </div>

          {bothFilled && (
            <div className="flex flex-col items-end gap-1 shrink-0">
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={saveName}
                  onChange={e => { setSaveName(e.target.value); setSaveError(''); }}
                  onKeyDown={e => e.key === 'Enter' && handleSave()}
                  placeholder="Comparison name"
                  maxLength={30}
                  className="bg-gray-700 border border-gray-600 focus:border-blue-500 focus:outline-none text-white text-xs rounded-lg px-3 py-1.5 w-44 placeholder-gray-500 transition-colors"
                />
                <button
                  onClick={handleSave}
                  disabled={!saveName.trim()}
                  className="bg-blue-700 hover:bg-blue-600 disabled:opacity-30 disabled:cursor-not-allowed text-white text-xs font-medium px-3 py-1.5 rounded-lg transition-colors whitespace-nowrap"
                >
                  Save
                </button>
                <button
                  onClick={handleShare}
                  disabled={shareState === 'loading'}
                  className="flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg bg-gray-700 hover:bg-gray-600 text-gray-200 disabled:opacity-50 transition-colors whitespace-nowrap"
                >
                  {shareState === 'loading' && (
                    <span className="inline-block w-3 h-3 border-2 border-gray-400 border-t-transparent rounded-full animate-spin" />
                  )}
                  {shareState === 'copied'  && '✓ Link copied!'}
                  {shareState === 'error'   && 'Failed — try again'}
                  {shareState === 'idle'    && '⎘ Share'}
                </button>
              </div>
              {saveError && <p className="text-xs text-red-400">{saveError}</p>}
            </div>
          )}
        </div>
      </div>

      {/* Side-by-side columns */}
      <div className="grid grid-cols-2 gap-4" style={{ minHeight: '0', height: 'calc(100vh - 320px)' }}>
        <RosterColumn
          slot={left}
          label="Roster A"
          savedRosters={savedRosters}
          type={leftType}
          onTypeChange={t => { setLeftType(t); setLeft(emptySlot()); }}
          team={leftTeam}
          year={leftYear}
          onTeamChange={setLeftTeam}
          onYearChange={setLeftYear}
          onFetch={() => fetchSlot('left', leftTeam, leftYear)}
          onSelectSaved={name => selectSaved('left', name)}
        />
        <RosterColumn
          slot={right}
          label="Roster B"
          savedRosters={savedRosters}
          type={rightType}
          onTypeChange={t => { setRightType(t); setRight(emptySlot()); }}
          team={rightTeam}
          year={rightYear}
          onTeamChange={setRightTeam}
          onYearChange={setRightYear}
          onFetch={() => fetchSlot('right', rightTeam, rightYear)}
          onSelectSaved={name => selectSaved('right', name)}
        />
      </div>

      {/* My Comparisons */}
      <div className="bg-gray-800 border border-gray-700 rounded-xl px-4 pt-4 pb-4">
        <div className="flex items-start justify-between mb-4">
          <div>
            <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-widest">My Comparisons</h2>
            <p className="text-xs text-gray-600 mt-0.5">
              {savedComparisons.length === 0
                ? 'No saved comparisons yet.'
                : `${savedComparisons.length} saved comparison${savedComparisons.length > 1 ? 's' : ''}`}
            </p>
          </div>
        </div>

        {savedComparisons.length === 0 ? (
          <div className="flex items-center justify-center py-5 text-gray-600 text-sm">
            Save a comparison above to see it here.
          </div>
        ) : (
          <div className="flex flex-wrap gap-3">
            {savedComparisons.map(c => (
              <div
                key={c.name}
                onClick={() => loadComparison(c)}
                className="relative group bg-gray-700/50 hover:bg-gray-600/50 border border-gray-600/50 hover:border-gray-500 rounded-lg px-3 py-2.5 cursor-pointer transition-colors min-w-[200px] max-w-[280px]"
              >
                {/* Delete button */}
                <button
                  onClick={e => { e.stopPropagation(); onDeleteComparison(c.name); }}
                  title={`Delete "${c.name}"`}
                  className="absolute top-1.5 right-1.5 w-4 h-4 flex items-center justify-center text-gray-600 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-all rounded"
                >
                  ×
                </button>

                <p className="text-sm font-semibold text-white truncate pr-4">{c.name}</p>

                <div className="flex items-center gap-1.5 mt-1 text-xs min-w-0">
                  <span className="text-gray-300 truncate">{c.left.label}</span>
                  <span className="text-gray-600 shrink-0 text-[10px] font-bold uppercase">vs</span>
                  <span className="text-gray-300 truncate">{c.right.label}</span>
                </div>

                <p className="text-xs text-gray-600 mt-1">
                  {c.left.players.length}p · {c.right.players.length}p · {formatDate(c.savedAt)}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
