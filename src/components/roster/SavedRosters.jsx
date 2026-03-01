import { useState } from 'react';

const NAME_RE = /^[a-zA-Z0-9 ]+$/;
const MAX_NAME_LEN = 30;

function formatDate(ts) {
  return new Date(ts).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

export default function SavedRosters({ rosters, currentRosterEmpty, onSave, onLoad, onDelete }) {
  const [name, setName] = useState('');
  const [error, setError] = useState('');

  function handleNameChange(e) {
    setName(e.target.value);
    setError('');
  }

  function validate(value) {
    if (!value) return 'Name is required.';
    if (!NAME_RE.test(value)) return 'Letters, numbers, and spaces only.';
    if (value.length > MAX_NAME_LEN) return `Max ${MAX_NAME_LEN} characters.`;
    if (rosters.some(r => r.name.toLowerCase() === value.toLowerCase())) return 'A roster with that name already exists.';
    return null;
  }

  function handleSave() {
    const validationError = validate(name.trim());
    if (validationError) { setError(validationError); return; }
    onSave(name.trim());
    setName('');
    setError('');
  }

  function handleKeyDown(e) {
    if (e.key === 'Enter') handleSave();
  }

  const saveDisabled = currentRosterEmpty || !name.trim();

  return (
    <div className="bg-gray-800 border border-gray-700 rounded-xl px-4 pt-4 pb-4">
      {/* Header + save form */}
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 mb-4">
        <div>
          <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-widest">
            Your Rosters
          </h2>
          <p className="text-xs text-gray-600 mt-0.5">
            {rosters.length === 0 ? 'No saved rosters yet.' : `${rosters.length} saved roster${rosters.length > 1 ? 's' : ''}`}
          </p>
        </div>

        {/* Save form */}
        <div className="flex flex-col items-end gap-1">
          <div className="flex items-center gap-2">
            <input
              type="text"
              value={name}
              onChange={handleNameChange}
              onKeyDown={handleKeyDown}
              placeholder="Roster name"
              maxLength={MAX_NAME_LEN}
              className="bg-gray-700 border border-gray-600 focus:border-blue-500 focus:outline-none text-white text-sm rounded-lg px-3 py-1.5 w-44 placeholder-gray-500 transition-colors"
            />
            <button
              onClick={handleSave}
              disabled={saveDisabled}
              title={currentRosterEmpty ? 'Add players before saving' : 'Save current roster'}
              className="bg-blue-600 hover:bg-blue-500 disabled:opacity-30 disabled:cursor-not-allowed text-white text-xs font-medium px-3 py-1.5 rounded-lg transition-colors whitespace-nowrap"
            >
              Save
            </button>
          </div>
          {error && (
            <p className="text-xs text-red-400">{error}</p>
          )}
        </div>
      </div>

      {/* Roster cards */}
      {rosters.length === 0 ? (
        <div className="flex items-center justify-center py-6 text-gray-600 text-sm">
          Save a roster above to see it here.
        </div>
      ) : (
        <div className="flex flex-wrap gap-3">
          {rosters.map((roster) => (
            <div
              key={roster.name}
              onClick={() => onLoad(roster.name)}
              className="relative group bg-gray-700/50 hover:bg-gray-600/50 border border-gray-600/50 hover:border-gray-500 rounded-lg px-3 py-2.5 cursor-pointer transition-colors min-w-[140px] max-w-[200px]"
            >
              {/* Delete button */}
              <button
                onClick={(e) => { e.stopPropagation(); onDelete(roster.name); }}
                title={`Delete "${roster.name}"`}
                className="absolute top-1.5 right-1.5 w-4 h-4 flex items-center justify-center text-gray-600 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-all rounded"
              >
                ×
              </button>

              <p className="text-sm font-semibold text-white truncate pr-4">{roster.name}</p>
              <p className="text-xs text-gray-400 mt-0.5">{roster.players.length} player{roster.players.length !== 1 ? 's' : ''}</p>
              <p className="text-xs text-gray-600 mt-0.5">{formatDate(roster.savedAt)}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
