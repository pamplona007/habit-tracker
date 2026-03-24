import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

export default function NoHouseholdPage() {
  const navigate = useNavigate();
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showJoinModal, setShowJoinModal] = useState(false);
  const [householdName, setHouseholdName] = useState('');
  const [joinCode, setJoinCode] = useState('');

  const handleCreate = () => {
    if (!householdName.trim()) return;
    // TODO: Call API to create household
    console.log('Creating household:', householdName);
    navigate('/dashboard');
  };

  const handleJoin = () => {
    if (!joinCode.trim()) return;
    // TODO: Call API to join household
    console.log('Joining household with code:', joinCode);
    navigate('/dashboard');
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-6">
      <div className="text-center max-w-md">
        {/* Illustration */}
        <div className="mb-8">
          <svg
            width="120"
            height="120"
            viewBox="0 0 120 120"
            fill="none"
            className="mx-auto"
          >
            <circle cx="60" cy="60" r="60" fill="#a0f0f0" />
            <path
              d="M60 30V50M60 70V90M30 60H50M70 60H90"
              stroke="#016a6b"
              strokeWidth="4"
              strokeLinecap="round"
            />
            <circle cx="60" cy="60" r="20" fill="#016a6b" />
            <circle cx="60" cy="60" r="10" fill="#e0fffe" />
          </svg>
        </div>

        {/* Title */}
        <h1 className="font-headline text-3xl font-bold text-on-surface mb-4">
          Your Journey Awaits
        </h1>

        {/* Description */}
        <p className="text-on-surface-variant mb-10 leading-relaxed">
          Habits are better together. Create a new household or join an existing one to start tracking with your family or roommates.
        </p>

        {/* Actions */}
        <div className="space-y-4">
          <button
            onClick={() => setShowCreateModal(true)}
            className="w-full bg-primary text-on-primary py-4 rounded-full font-semibold hover:bg-primary-dim transition-colors"
          >
            Create Household
          </button>
          <button
            onClick={() => setShowJoinModal(true)}
            className="w-full bg-secondary-container text-on-secondary-container py-4 rounded-full font-semibold hover:bg-secondary-fixed-dim transition-colors"
          >
            Join with Code
          </button>
        </div>
      </div>

      {/* Create Modal */}
      {showCreateModal && (
        <div
          className="fixed inset-0 bg-on-surface/40 backdrop-blur-sm flex items-center justify-center p-6 z-50"
          onClick={() => setShowCreateModal(false)}
        >
          <div
            className="bg-surface-container-lowest rounded-2xl p-8 w-full max-w-sm shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="font-headline text-xl font-semibold text-on-surface mb-6">
              Create Household
            </h2>

            <div className="mb-6">
              <label
                htmlFor="householdName"
                className="block text-sm font-medium text-on-surface-variant mb-2"
              >
                Household Name
              </label>
              <input
                type="text"
                id="householdName"
                value={householdName}
                onChange={(e) => setHouseholdName(e.target.value)}
                placeholder="The Smith Family"
                className="w-full px-4 py-3 bg-surface border border-outline rounded-lg text-on-surface placeholder:text-on-surface-variant focus:outline-none focus:ring-2 focus:ring-primary"
                autoFocus
              />
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setShowCreateModal(false)}
                className="flex-1 py-3 bg-surface-container text-on-surface rounded-full font-medium hover:bg-surface-container-high transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleCreate}
                disabled={!householdName.trim()}
                className="flex-1 py-3 bg-primary text-on-primary rounded-full font-semibold hover:bg-primary-dim transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
              >
                Create
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Join Modal */}
      {showJoinModal && (
        <div
          className="fixed inset-0 bg-on-surface/40 backdrop-blur-sm flex items-center justify-center p-6 z-50"
          onClick={() => setShowJoinModal(false)}
        >
          <div
            className="bg-surface-container-lowest rounded-2xl p-8 w-full max-w-sm shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="font-headline text-xl font-semibold text-on-surface mb-6">
              Join Household
            </h2>

            <div className="mb-6">
              <label
                htmlFor="joinCode"
                className="block text-sm font-medium text-on-surface-variant mb-2"
              >
                Invite Code
              </label>
              <input
                type="text"
                id="joinCode"
                value={joinCode}
                onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                placeholder="ABC123"
                className="w-full px-4 py-3 bg-surface border border-outline rounded-lg text-on-surface placeholder:text-on-surface-variant focus:outline-none focus:ring-2 focus:ring-primary text-center text-2xl tracking-widest font-mono"
                autoFocus
                maxLength={6}
              />
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setShowJoinModal(false)}
                className="flex-1 py-3 bg-surface-container text-on-surface rounded-full font-medium hover:bg-surface-container-high transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleJoin}
                disabled={!joinCode.trim()}
                className="flex-1 py-3 bg-primary text-on-primary rounded-full font-semibold hover:bg-primary-dim transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
              >
                Join
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
