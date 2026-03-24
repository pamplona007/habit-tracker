import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';

export default function SettingsPage() {
  const navigate = useNavigate();
  const { user, logout } = useAuth();

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="flex items-center justify-between p-4 lg:p-6 lg:pt-8 bg-surface-container-low">
        <Link
          to="/dashboard"
          className="p-2 rounded-full hover:bg-surface-container transition-colors"
        >
          <span className="material-symbols-outlined text-on-surface">arrow_back</span>
        </Link>
        <h1 className="font-headline text-xl font-semibold text-on-surface">Settings</h1>
        <div className="w-10" />
      </header>

      {/* Content */}
      <main className="p-4 lg:p-6 lg:max-w-2xl lg:mx-auto">
        {/* Profile Section */}
        <section className="mb-8">
          <h2 className="text-sm font-medium text-on-surface-variant uppercase tracking-wide mb-4">
            Profile
          </h2>
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-outline-variant">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-full bg-primary-container flex items-center justify-center">
                <span className="text-2xl font-headline font-bold text-primary">
                  {user?.name?.charAt(0).toUpperCase() || 'U'}
                </span>
              </div>
              <div>
                <h3 className="text-lg font-semibold text-on-surface">{user?.name || 'User'}</h3>
                <p className="text-sm text-on-surface-variant">{user?.email || 'user@example.com'}</p>
              </div>
            </div>
          </div>
        </section>

        {/* Household Section */}
        <section className="mb-8">
          <h2 className="text-sm font-medium text-on-surface-variant uppercase tracking-wide mb-4">
            Household
          </h2>
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-outline-variant mb-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-semibold text-on-surface">The Smith Family</p>
                <p className="text-sm text-on-surface-variant">4 members</p>
              </div>
              <button className="text-sm text-primary hover:underline">Manage</button>
            </div>
          </div>

          {/* Members */}
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-outline-variant">
            <h3 className="text-sm font-medium text-on-surface mb-4">Members</h3>
            <div className="space-y-3">
              {[
                { initial: 'J', name: 'John', role: 'Owner' },
                { initial: 'S', name: 'Sarah', role: 'Admin' },
                { initial: 'M', name: 'Mike', role: '' },
              ].map((member, i) => (
                <div key={i} className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full bg-secondary-container flex items-center justify-center">
                    <span className="text-sm font-medium text-on-secondary-container">{member.initial}</span>
                  </div>
                  <span className="flex-1 text-on-surface">
                    {member.name}
                    {member.role && (
                      <span className="text-on-surface-variant text-sm ml-2">({member.role})</span>
                    )}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Preferences Section */}
        <section className="mb-8">
          <h2 className="text-sm font-medium text-on-surface-variant uppercase tracking-wide mb-4">
            Preferences
          </h2>
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-outline-variant">
            <div className="flex items-center justify-between">
              <span className="text-on-surface">Language</span>
              <span className="text-on-surface-variant flex items-center gap-1">
                English
                <span className="material-symbols-outlined text-sm">chevron_right</span>
              </span>
            </div>
          </div>
        </section>

        {/* Logout */}
        <button
          onClick={handleLogout}
          className="w-full bg-error-container text-on-error-container py-4 rounded-2xl font-medium hover:bg-error-dim transition-colors"
        >
          Log out
        </button>
      </main>
    </div>
  );
}
