import { useState } from 'react';
import { NFL_TEAMS, YEARS, getTeamName } from '../../constants/teams';

export default function SourceSelector({ onImport, isLoading }) {
  const [selectedYear, setSelectedYear] = useState(2007);
  const [selectedTeam, setSelectedTeam] = useState('NE');

  function handleImport() {
    onImport(selectedTeam, selectedYear);
  }

  return (
    <div className="bg-gray-800 border border-gray-700 rounded-xl p-5">
      <h2 className="text-sm font-semibold text-gray-300 uppercase tracking-wider mb-4">
        Source Selector
      </h2>

      <div className="flex flex-wrap gap-3 items-end">
        {/* Year Dropdown */}
        <div className="flex flex-col gap-1.5">
          <label className="text-xs text-gray-400 font-medium">Season Year</label>
          <select
            value={selectedYear}
            onChange={(e) => setSelectedYear(Number(e.target.value))}
            className="bg-gray-700 border border-gray-600 text-white text-sm rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 min-w-[110px]"
          >
            {[...YEARS].reverse().map((y) => (
              <option key={y} value={y}>
                {y}
              </option>
            ))}
          </select>
        </div>

        {/* Team Dropdown */}
        <div className="flex flex-col gap-1.5">
          <label className="text-xs text-gray-400 font-medium">Team</label>
          <select
            value={selectedTeam}
            onChange={(e) => setSelectedTeam(e.target.value)}
            className="bg-gray-700 border border-gray-600 text-white text-sm rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 min-w-[220px]"
          >
            {NFL_TEAMS.map((t) => (
              <option key={t.abbr} value={t.abbr}>
                {getTeamName(t, selectedYear)} ({t.abbr})
              </option>
            ))}
          </select>
        </div>

        {/* Import Button */}
        <button
          onClick={handleImport}
          disabled={isLoading}
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-semibold px-5 py-2 rounded-lg transition-colors"
        >
          {isLoading ? (
            <>
              <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
              </svg>
              Importing…
            </>
          ) : (
            <>
              <span>⬇</span> Import Team
            </>
          )}
        </button>
      </div>

      <p className="text-xs text-gray-500 mt-3">
        Data sourced from{' '}
        <span className="text-gray-400">nflverse / nflverse-data</span> on GitHub.
        Multiple imports stack — duplicates are allowed.
      </p>
    </div>
  );
}
