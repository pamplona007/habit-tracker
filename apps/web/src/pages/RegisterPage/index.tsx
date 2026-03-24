import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';

export default function RegisterPage() {
  const navigate = useNavigate();
  const { register, isRegistering } = useAuth();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }

    try {
      await register({ name, email, password });
      navigate('/no-household');
    } catch {
      setError('Registration failed. Please try again.');
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="p-4">
        <Link to="/" className="inline-flex items-center gap-2 text-on-surface hover:text-primary transition-colors">
          <span className="material-symbols-outlined">arrow_back</span>
          <span className="text-sm font-medium">Back</span>
        </Link>
      </header>

      {/* Main Content */}
      <main className="flex-1 flex items-center justify-center px-4 py-8">
        <div className="w-full max-w-md">
          {/* Logo and Title */}
          <div className="text-center mb-8">
            <div className="flex items-center justify-center mb-6">
              <img
                src="https://lh3.googleusercontent.com/aida-public/AB6AXuCMBMf7B3j9xcRdOzBL0NngB3UjcZ3HJY3XpKjV57zkkOCwKNrN-K4U6Wry3sV2Adkqale8ICOZ0h2g3r7STk8ooa2XVxBOPwkGuq5F1W7mOnTC7D1rKmovRzxe3aCyi6B3snDw1FWFF2bzDlZT0ncKnRzLmRBDZ2y3nk-KCvypyUnz-ksVITL7Vw1PcgeNzHyZz_M24OwGFOzju_9RzXvz-4Y529MC9SpeONp3Wn4F9cShxcctBpNzMUYiIRhh8un3pF35Nznr2_4"
                alt="Minimalist sunrise"
                className="h-16 w-16 rounded-full"
              />
            </div>
            <h1 className="font-headline text-3xl font-bold text-on-background mb-2">Create Account</h1>
            <p className="text-primary font-semibold text-lg">Habitly</p>
          </div>

          {/* Hero Section */}
          <div className="text-center mb-10">
            <h2 className="font-headline text-2xl font-bold text-on-background mb-3">
              Start your journey toward a better you.
            </h2>
            <p className="text-on-surface-variant">
              Join 200k+ others who are sculpting their daily rituals into a masterpiece of intentional living.
            </p>
            <button
              onClick={() => document.getElementById('register-form')?.scrollIntoView({ behavior: 'smooth' })}
              className="mt-6 px-8 py-3 primary-gradient text-white font-semibold rounded-lg shadow-lg hover:shadow-xl transition-all hover:-translate-y-0.5"
            >
              Get Started
            </button>
          </div>

          {/* Form Section */}
          <div id="register-form" className="bg-surface-container-low rounded-xl p-6 shadow-sm">
            <h3 className="font-headline text-lg font-semibold text-on-background mb-6">Create your sanctuary</h3>
            <p className="text-on-surface-variant text-sm mb-6">Enter your details to begin tracking.</p>

            <form className="space-y-5" onSubmit={handleSubmit}>
              {error && (
                <div className="bg-error-container text-on-error-container px-4 py-3 rounded-lg text-sm">
                  {error}
                </div>
              )}

              {/* Full Name Field */}
              <div>
                <label htmlFor="fullname" className="block text-sm font-medium text-on-surface mb-2">
                  Full Name
                </label>
                <div className="relative">
                  <input
                    type="text"
                    id="fullname"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="John Doe"
                    className="w-full px-4 py-3 pl-11 bg-surface border border-outline rounded-lg text-on-surface placeholder:text-on-surface-variant focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
                    required
                  />
                  <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant">
                    person
                  </span>
                </div>
              </div>

              {/* Email Field */}
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-on-surface mb-2">
                  Email Address
                </label>
                <div className="relative">
                  <input
                    type="email"
                    id="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="john@example.com"
                    className="w-full px-4 py-3 pl-11 bg-surface border border-outline rounded-lg text-on-surface placeholder:text-on-surface-variant focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
                    required
                  />
                  <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant">
                    mail
                  </span>
                </div>
              </div>

              {/* Password Field */}
              <div>
                <label htmlFor="password" className="block text-sm font-medium text-on-surface mb-2">
                  Secure Password
                </label>
                <div className="relative">
                  <input
                    type="password"
                    id="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full px-4 py-3 pl-11 bg-surface border border-outline rounded-lg text-on-surface placeholder:text-on-surface-variant focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
                    required
                    minLength={6}
                  />
                  <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant">
                    lock
                  </span>
                </div>
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={isRegistering}
                className="w-full py-3 primary-gradient text-white font-semibold rounded-lg shadow-md hover:shadow-lg transition-all hover:-translate-y-0.5 mt-6 disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {isRegistering ? 'Creating account...' : 'Create Account'}
              </button>
            </form>

            {/* Sign In Link */}
            <p className="text-center text-sm text-on-surface-variant mt-6">
              Already part of the community?{' '}
              <Link to="/login" className="text-primary font-medium hover:underline">
                Sign in here
              </Link>
            </p>
          </div>

          {/* Footer Links */}
          <div className="flex justify-center gap-6 mt-8">
            <a href="#" className="text-xs text-on-surface-variant hover:text-primary transition-colors">
              Privacy Policy
            </a>
            <a href="#" className="text-xs text-on-surface-variant hover:text-primary transition-colors">
              Terms of Service
            </a>
          </div>
        </div>
      </main>
    </div>
  );
}
