import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';

export default function LoginPage() {
  const navigate = useNavigate();
  const { login, isLoggingIn } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    try {
      await login({ email, password });
      navigate('/dashboard');
    } catch {
      setError('Invalid email or password. Please try again.');
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Glass Card */}
        <div className="bg-white/80 ethereal-blur rounded-xl shadow-lg p-8 border border-outline-variant">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-headline font-bold text-on-surface mb-2">Habit Tracker</h1>
            <p className="text-lg text-on-surface-variant">Your Daily Ritual Architect</p>
          </div>

          <div className="mb-6">
            <h2 className="text-2xl font-headline font-semibold text-on-surface mb-2">Sign In</h2>
            <p className="text-on-surface-variant">Welcome back to your journey of growth.</p>
          </div>

          <form className="space-y-4" onSubmit={handleSubmit}>
            {error && (
              <div className="bg-error-container text-on-error-container px-4 py-3 rounded-lg text-sm">
                {error}
              </div>
            )}

            <div>
              <label className="block text-sm font-label font-medium text-on-surface-variant mb-1">
                Email Address
              </label>
              <div className="relative">
                <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant">
                  mail
                </span>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 rounded-lg border border-outline bg-surface text-on-surface focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                  placeholder="Enter your email"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-label font-medium text-on-surface-variant mb-1">
                Password
              </label>
              <div className="relative">
                <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant">
                  lock
                </span>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-10 pr-12 py-3 rounded-lg border border-outline bg-surface text-on-surface focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                  placeholder="Enter your password"
                  required
                />
                <a href="#" className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-primary hover:underline">
                  Forgot?
                </a>
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoggingIn}
              className="w-full py-3 px-4 bg-primary text-on-primary rounded-lg font-label font-semibold hover:bg-primary-dim transition-colors flex items-center justify-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {isLoggingIn ? 'Signing in...' : 'Sign In'}
              {!isLoggingIn && <span className="material-symbols-outlined">arrow_forward</span>}
            </button>
          </form>

          <div className="mt-6">
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-outline-variant" />
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-2 bg-surface-container-low text-on-surface-variant">or continue with</span>
              </div>
            </div>
          </div>

          <div className="mt-6 grid grid-cols-2 gap-3">
            <button className="flex items-center justify-center gap-2 py-3 px-4 border border-outline rounded-lg hover:bg-surface-container transition-colors">
              <img
                src="https://lh3.googleusercontent.com/aida-public/AB6AXuCAs8zxev_dueSPIWB81_Vz1Kc3U0BzTxHFRCOf7fAigzdhE-86Dngigtztgg51CxNiNS38_r1MUalMrRepHqM-5pypXirZBijXx3QeDzOtYbZQ6e0UY0ydcszdKvMb_ZUEc-epGaWZbKWH1B9Up-oUmk8O1B7vlllpc_kOMU7deUfb_YXWu-sYJD_slvljmQwaOBqonPPZrurp2dFFbVfz3plBkQNesRQXhhtP-JwXIE-TqVJCazW2FkifRk6WeU40tESFotXfos4"
                alt="Google"
                className="w-5 h-5"
              />
              <span className="font-label text-on-surface">Google</span>
            </button>
            <button className="flex items-center justify-center gap-2 py-3 px-4 border border-outline rounded-lg hover:bg-surface-container transition-colors">
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                <path d="M17.05 20.28c-.98.95-2.05.8-3.08.35-1.09-.46-2.09-.48-3.24 0-1.44.62-2.2.44-3.06-.35C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09l.01-.01zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z" />
              </svg>
              <span className="font-label text-on-surface">Apple</span>
            </button>
          </div>

          <p className="mt-6 text-center text-sm text-on-surface-variant">
            Don't have an account?{' '}
            <Link to="/register" className="text-primary hover:underline font-medium">
              Register
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
