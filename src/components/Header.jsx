import { useAuth } from '../contexts/AuthContext';

export default function Header({ activeTab, onTabChange }) {
  const { user, signInWithGoogle, signOut } = useAuth();

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

        <div className="flex items-center gap-4">
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

          {user ? (
            <div className="flex items-center gap-2.5 pl-4 border-l border-gray-700">
              {user.user_metadata?.avatar_url && (
                <img
                  src={user.user_metadata.avatar_url}
                  alt={user.user_metadata.full_name}
                  className="w-7 h-7 rounded-full ring-1 ring-gray-600"
                />
              )}
              <span className="text-sm text-gray-300 hidden sm:block">
                {user.user_metadata?.full_name ?? user.email}
              </span>
              <button
                onClick={signOut}
                className="text-xs text-gray-500 hover:text-red-400 transition-colors"
              >
                Sign out
              </button>
            </div>
          ) : (
            <button
              onClick={signInWithGoogle}
              className="pl-4 border-l border-gray-700 text-xs text-gray-400 hover:text-white transition-colors"
            >
              Sign in
            </button>
          )}
        </div>
      </div>
    </header>
  );
}
