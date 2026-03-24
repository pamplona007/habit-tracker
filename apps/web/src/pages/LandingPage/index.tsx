import { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';

export default function LandingPage() {
  const navigate = useNavigate();
  const [timerRunning, setTimerRunning] = useState(false);
  const [timeRemaining, setTimeRemaining] = useState(25 * 60);
  const intervalRef = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, []);

  const toggleTimer = () => {
    if (timerRunning) {
      if (intervalRef.current) clearInterval(intervalRef.current);
      setTimerRunning(false);
    } else {
      intervalRef.current = window.setInterval(() => {
        setTimeRemaining((prev) => {
          if (prev <= 1) {
            clearInterval(intervalRef.current!);
            setTimerRunning(false);
            return 25 * 60;
          }
          return prev - 1;
        });
      }, 1000);
      setTimerRunning(true);
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 p-4 lg:p-6 bg-background/80 ethereal-blur">
        <div className="max-w-6xl mx-auto flex justify-between items-center">
          <a href="#" className="flex items-center gap-2 text-primary font-headline font-bold text-xl">
            <span className="material-symbols-outlined">spa</span>
            Habitual
          </a>
          <div className="hidden md:flex items-center gap-8">
            <a href="#" className="text-on-surface-variant hover:text-primary transition-colors font-medium">Home</a>
            <a href="#" className="text-on-surface-variant hover:text-primary transition-colors font-medium">Product</a>
            <a href="#" className="text-on-surface-variant hover:text-primary transition-colors font-medium">Science</a>
          </div>
          <div className="flex items-center gap-4">
            <Link to="/login" className="text-primary font-semibold hover:underline">Login</Link>
            <button
              onClick={() => navigate('/register')}
              className="bg-primary text-on-primary px-5 py-2.5 rounded-full font-semibold hover:bg-primary-dim transition-colors"
            >
              Join Waitlist
            </button>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="pt-32 pb-16 px-4 text-center max-w-5xl mx-auto">
        <div className="inline-flex items-center justify-center w-16 h-16 bg-primary-container rounded-full mb-6">
          <span className="material-symbols-outlined text-primary" style={{ fontSize: 32 }}>auto_awesome</span>
        </div>
        <h1 className="font-headline text-4xl lg:text-6xl font-bold text-primary mb-4 leading-tight">
          The Ethereal Organizer
        </h1>
        <p className="text-lg lg:text-xl text-on-surface-variant max-w-2xl mx-auto mb-8 leading-relaxed">
          Your Daily Ritual Architect. Cultivate a shared sense of purpose with collaborative household habit tracking.
        </p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <button
            onClick={() => navigate('/register')}
            className="bg-primary text-on-primary px-8 py-3.5 rounded-full font-semibold inline-flex items-center justify-center gap-2 hover:bg-primary-dim transition-colors shadow-lg"
          >
            <span className="material-symbols-outlined">play_arrow</span>
            Start Your Journey
          </button>
          <button
            onClick={() => document.getElementById('benefits')?.scrollIntoView({ behavior: 'smooth' })}
            className="border-2 border-primary text-primary px-8 py-3.5 rounded-full font-semibold hover:bg-primary-container transition-colors"
          >
            Explore Method
          </button>
        </div>

        {/* Feature Card */}
        <div className="bg-gradient-to-br from-surface-container to-surface-container-high rounded-3xl p-8 lg:p-12 mt-12 max-w-xl mx-auto relative overflow-hidden">
          <div
            className="absolute inset-0 opacity-10"
            style={{
              backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23016a6b' fill-opacity='0.4'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`
            }}
          />
          <div className="relative">
            <div className="inline-flex items-center justify-center w-12 h-12 bg-primary-container rounded-xl mb-4">
              <span className="material-symbols-outlined text-primary">wb_twilight</span>
            </div>
            <h2 className="font-headline text-2xl font-bold text-on-surface mb-2">Morning sunlight</h2>
            <span className="inline-block bg-primary text-on-primary px-3 py-1 rounded-full text-sm font-semibold mb-3">07:30</span>
            <p className="text-on-surface-variant">Morning Meditation</p>
            <img
              src="https://lh3.googleusercontent.com/aida-public/AB6AXuC4Je3HrAL9ZJdJKVDn0-Ny-ChOBUn_JEbbedk3te9J16LFJ0giCsMdSOe7IHaX1yL4eZH7eZPA1hB0wace7dJcuAY_x9_Arlf5Y2e3Uvgjvu_eSA77kQO7DknTUgRRApvs2V7WjeFfdAfMNjOrhavPwZLSDNpLRcoxPWaZNNmpros3lJetLl55jsLDwkG8tL3PdBhIhq7Ixp8Ump-C805Y0Bvxr452qLdsolg9dixmuTtQ1Q9OvJKi5gTJaiDoFOVy86d7Yix95c"
              alt="Morning sunlight"
              className="w-full rounded-xl mt-4"
            />
          </div>
        </div>
      </section>

      {/* Benefits Section */}
      <section id="benefits" className="py-16 px-4 max-w-6xl mx-auto">
        <div className="text-center mb-12">
          <h2 className="font-headline text-3xl lg:text-4xl font-bold text-on-surface mb-4">Designed for Collective Growth</h2>
          <p className="text-on-surface-variant max-w-2xl mx-auto">
            We move away from rigid tracking to fluid, atmospheric rituals that bond households together.
          </p>
        </div>
        <p className="text-primary font-semibold text-sm mb-4">01 / 03</p>
        <div className="grid md:grid-cols-3 gap-8">
          {[
            { icon: 'group', title: 'Shared Goals', desc: 'Sync your intentions with your partner or roommates to build mutual accountability without the friction.' },
            { icon: 'insights', title: 'Family Insights', desc: 'Understand the ebb and flow of your collective energy with ethereal data visualizations that feel like art.' },
            { icon: 'vibration', title: 'Harmonious Routines', desc: 'Automated ritual suggestions that align with your house\'s natural rhythms and circadian cycles.' },
          ].map((benefit, i) => (
            <div key={i} className="bg-white rounded-2xl p-8 shadow-sm hover:shadow-md transition-shadow">
              <div className="inline-flex items-center justify-center w-14 h-14 bg-primary-container rounded-xl mb-5">
                <span className="material-symbols-outlined text-primary">{benefit.icon}</span>
              </div>
              <h3 className="font-headline text-xl font-semibold text-on-surface mb-2">{benefit.title}</h3>
              <p className="text-on-surface-variant leading-relaxed">{benefit.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Timer Section */}
      <section className="py-16 px-4 max-w-3xl mx-auto">
        <div className="bg-gradient-to-br from-surface-container to-surface-container-high rounded-3xl p-8 lg:p-12 text-center mb-8">
          <h3 className="font-headline text-2xl font-semibold text-on-surface mb-2">The Focused Timer</h3>
          <p className="text-on-surface-variant mb-8">A halo of serenity for your deep work sessions.</p>
          <div className="font-headline text-7xl font-bold text-primary mb-6">
            {formatTime(timeRemaining)}
          </div>
          <button
            onClick={toggleTimer}
            className="bg-primary text-on-primary px-10 py-4 rounded-full font-semibold text-lg hover:bg-primary-dim transition-colors cursor-pointer"
          >
            {timerRunning ? 'Pause' : 'Start Flow'}
          </button>
        </div>
        <div className="grid sm:grid-cols-2 gap-4">
          {[
            { icon: 'auto_mode', label: 'Smart Suggestions' },
            { icon: 'family_history', label: 'Legacy Logs' },
          ].map((item, i) => (
            <div key={i} className="bg-white rounded-xl p-6 flex items-center gap-4 shadow-sm">
              <div className="w-12 h-12 bg-secondary-container rounded-lg flex items-center justify-center flex-shrink-0">
                <span className="material-symbols-outlined text-secondary">{item.icon}</span>
              </div>
              <span className="font-semibold text-on-surface">{item.label}</span>
            </div>
          ))}
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-surface-container py-8 px-4">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="flex items-center gap-2 text-primary font-headline font-bold">
            <span className="material-symbols-outlined">spa</span>
            Habitual
          </div>
          <p className="text-on-surface-variant text-sm">© 2024 Habitual. Ethereal Organization for Households.</p>
          <div className="flex gap-6">
            <a href="#" className="text-on-surface-variant hover:text-primary text-sm transition-colors">Privacy</a>
            <a href="#" className="text-on-surface-variant hover:text-primary text-sm transition-colors">Terms</a>
            <a href="#" className="text-on-surface-variant hover:text-primary text-sm transition-colors">Community</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
