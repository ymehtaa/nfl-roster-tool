export default function Header({ activeTab, onTabChange }) {
  function tabClass(tab) {
    if (tab === activeTab) return 'px-3 py-1.5 text-sm font-medium text-white bg-blue-600 rounded-md';
    return 'px-3 py-1.5 text-sm text-gray-400 hover:text-white hover:bg-gray-700 rounded-md transition-colors cursor-pointer';
  }

  return (
    <header className="bg-gray-900 border-b border-gray-700 px-6 py-4">
      <div className="max-w-7xl mx-auto flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="text-3xl">🏈</span>
          <div>
            <h1 className="text-xl font-bold text-white tracking-tight leading-none">
              NFL Roster Architect
            </h1>
            <p className="text-xs text-gray-400 mt-0.5">
              Build Frankenstein rosters from any era
            </p>
          </div>
        </div>

        <nav className="flex items-center gap-1">
          <button className={tabClass('builder')} onClick={() => onTabChange('builder')}>
            Roster Builder
          </button>
          <button className={tabClass('compare')} onClick={() => onTabChange('compare')}>
            Compare
          </button>
          <span className="px-3 py-1.5 text-sm text-gray-600 rounded-md cursor-not-allowed opacity-50">
            Stats
          </span>
        </nav>
      </div>
    </header>
  );
}
