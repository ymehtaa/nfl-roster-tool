export const SECTIONS = [
  {
    sectionKey: 'offense',
    sectionLabel: 'Offense',
    groups: [
      { key: 'QB',  label: 'Quarterbacks',   slots: 3, positions: new Set(['QB']) },
      { key: 'RB',  label: 'Running Backs',  slots: 4, positions: new Set(['RB', 'HB']) },
      { key: 'FB',  label: 'Fullbacks',      slots: 1, positions: new Set(['FB']) },
      { key: 'WR',  label: 'Wide Receivers', slots: 6, positions: new Set(['WR']) },
      { key: 'TE',  label: 'Tight Ends',     slots: 3, positions: new Set(['TE']) },
      { key: 'OL',  label: 'Offensive Line', slots: 9, positions: new Set(['OL', 'OT', 'OG', 'C', 'T', 'G']) },
    ],
  },
  {
    sectionKey: 'defense',
    sectionLabel: 'Defense',
    groups: [
      { key: 'DE',  label: 'Defensive Ends',    slots: 4, positions: new Set(['DE', 'DL']) },
      { key: 'DT',  label: 'Defensive Tackles', slots: 3, positions: new Set(['DT', 'NT']) },
      { key: 'LB',  label: 'Linebackers',       slots: 6, positions: new Set(['LB', 'MLB', 'OLB', 'ILB']) },
      { key: 'CB',  label: 'Cornerbacks',       slots: 5, positions: new Set(['CB', 'DB']) },
      { key: 'SAF', label: 'Safeties',          slots: 4, positions: new Set(['S', 'FS', 'SS']) },
    ],
  },
  {
    sectionKey: 'special',
    sectionLabel: 'Special Teams',
    groups: [
      { key: 'ST',  label: 'Special Teams', slots: 3, positions: new Set(['K', 'P', 'LS', 'KR', 'PR']) },
    ],
  },
  {
    sectionKey: 'other',
    sectionLabel: 'Other',
    groups: [
      { key: 'OTH', label: 'Other', slots: 0, positions: null },
    ],
  },
];

export const ALL_GROUPS = SECTIONS.flatMap(s => s.groups);

export function getGroupKey(position) {
  for (const group of ALL_GROUPS) {
    if (group.positions && group.positions.has(position)) return group.key;
  }
  return 'OTH';
}
