const COLORS = {
  QB:  'bg-red-900 text-red-300',
  RB:  'bg-green-900 text-green-300',
  FB:  'bg-green-900 text-green-300',
  HB:  'bg-green-900 text-green-300',
  WR:  'bg-blue-900 text-blue-300',
  TE:  'bg-purple-900 text-purple-300',
  OL:  'bg-yellow-900 text-yellow-300',
  OT:  'bg-yellow-900 text-yellow-300',
  OG:  'bg-yellow-900 text-yellow-300',
  C:   'bg-yellow-900 text-yellow-300',
  T:   'bg-yellow-900 text-yellow-300',
  G:   'bg-yellow-900 text-yellow-300',
  DL:  'bg-orange-900 text-orange-300',
  DE:  'bg-orange-900 text-orange-300',
  DT:  'bg-orange-900 text-orange-300',
  NT:  'bg-orange-900 text-orange-300',
  LB:  'bg-teal-900 text-teal-300',
  MLB: 'bg-teal-900 text-teal-300',
  OLB: 'bg-teal-900 text-teal-300',
  ILB: 'bg-teal-900 text-teal-300',
  CB:  'bg-pink-900 text-pink-300',
  S:   'bg-indigo-900 text-indigo-300',
  FS:  'bg-indigo-900 text-indigo-300',
  SS:  'bg-indigo-900 text-indigo-300',
  DB:  'bg-indigo-900 text-indigo-300',
  K:   'bg-gray-700 text-gray-300',
  P:   'bg-gray-700 text-gray-300',
  LS:  'bg-gray-700 text-gray-300',
  KR:  'bg-gray-700 text-gray-300',
  PR:  'bg-gray-700 text-gray-300',
};

export default function PositionBadge({ position, className = '' }) {
  const color = COLORS[position] ?? 'bg-gray-700 text-gray-300';
  return (
    <span className={`inline-block px-2 py-0.5 rounded text-xs font-bold whitespace-nowrap ${color} ${className}`}>
      {position}
    </span>
  );
}
