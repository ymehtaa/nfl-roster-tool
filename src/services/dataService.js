/**
 * Calls the Python FastAPI backend to fetch a team's roster for a given season.
 *
 * @param {string} team   - Team abbreviation (e.g. 'NE')
 * @param {number} season - Season year (2000-2024)
 * @returns {Promise<Object[]>} Array of Player objects
 */
export async function fetchRoster(team, season) {
  const url = `/api/rosters?season=${season}&team=${encodeURIComponent(team)}`;
  const response = await fetch(url);

  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    const message =
      body?.detail?.message ?? body?.detail ?? `Server error ${response.status}`;
    throw new Error(message);
  }

  const data = await response.json();
  return data.players;
}
