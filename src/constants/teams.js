// All 32 NFL franchises with their current abbreviations used in nflverse data.
// historicalNames lists prior identities: the franchise used that name through
// the given `through` season year (inclusive).
export const NFL_TEAMS = [
  { abbr: 'ARI', name: 'Arizona Cardinals' },
  { abbr: 'ATL', name: 'Atlanta Falcons' },
  { abbr: 'BAL', name: 'Baltimore Ravens' },
  { abbr: 'BUF', name: 'Buffalo Bills' },
  { abbr: 'CAR', name: 'Carolina Panthers' },
  { abbr: 'CHI', name: 'Chicago Bears' },
  { abbr: 'CIN', name: 'Cincinnati Bengals' },
  { abbr: 'CLE', name: 'Cleveland Browns' },
  { abbr: 'DAL', name: 'Dallas Cowboys' },
  { abbr: 'DEN', name: 'Denver Broncos' },
  { abbr: 'DET', name: 'Detroit Lions' },
  { abbr: 'GB',  name: 'Green Bay Packers' },
  { abbr: 'HOU', name: 'Houston Texans' },
  { abbr: 'IND', name: 'Indianapolis Colts' },
  { abbr: 'JAX', name: 'Jacksonville Jaguars' },
  { abbr: 'KC',  name: 'Kansas City Chiefs' },
  { abbr: 'LA',  name: 'Los Angeles Rams',     historicalNames: [{ name: 'St. Louis Rams',      through: 2015 }] },
  { abbr: 'LAC', name: 'Los Angeles Chargers', historicalNames: [{ name: 'San Diego Chargers',  through: 2016 }] },
  { abbr: 'LV',  name: 'Las Vegas Raiders',    historicalNames: [{ name: 'Oakland Raiders',     through: 2019 }] },
  { abbr: 'MIA', name: 'Miami Dolphins' },
  { abbr: 'MIN', name: 'Minnesota Vikings' },
  { abbr: 'NE',  name: 'New England Patriots' },
  { abbr: 'NO',  name: 'New Orleans Saints' },
  { abbr: 'NYG', name: 'New York Giants' },
  { abbr: 'NYJ', name: 'New York Jets' },
  { abbr: 'PHI', name: 'Philadelphia Eagles' },
  { abbr: 'PIT', name: 'Pittsburgh Steelers' },
  { abbr: 'SEA', name: 'Seattle Seahawks' },
  { abbr: 'SF',  name: 'San Francisco 49ers' },
  { abbr: 'TB',  name: 'Tampa Bay Buccaneers' },
  { abbr: 'TEN', name: 'Tennessee Titans' },
  { abbr: 'WAS', name: 'Washington Commanders' },
];

/**
 * Returns the display name for a team in a given season year,
 * accounting for franchise relocations and renames.
 */
export function getTeamName(team, year) {
  if (team.historicalNames) {
    for (const hist of team.historicalNames) {
      if (year <= hist.through) return hist.name;
    }
  }
  return team.name;
}

export const YEARS = Array.from({ length: 26 }, (_, i) => 2000 + i); // 2000-2025
