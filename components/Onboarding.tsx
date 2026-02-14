
import React, { useState } from 'react';
import { UserProfile } from '../types';
import { storageService } from '../services/storageService';

interface OnboardingProps {
  onComplete: (profile: UserProfile) => void;
}

const DEFAULT_AVATAR = 'https://images.unsplash.com/photo-1476480862126-209bfaa8edc8?w=400&h=400&fit=crop';

const Onboarding: React.FC<OnboardingProps> = ({ onComplete }) => {
  const currentProfile = storageService.getProfile();
  
  const [username, setUsername] = useState(currentProfile.isSetup ? currentProfile.username : '');
  const [bio, setBio] = useState(currentProfile.isSetup ? currentProfile.bio : '');
  const [avatar] = useState(currentProfile.avatar && !currentProfile.avatar.includes('freepik') ? currentProfile.avatar : DEFAULT_AVATAR);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!username) return;

    const updatedProfile: UserProfile = {
      ...currentProfile,
      username,
      bio: bio || 'Focused on the next mile and the next brew.',
      avatar,
      isSetup: true
    };
    storageService.saveProfile(updatedProfile);
    onComplete(updatedProfile);
  };

  return (
    <div className="fixed inset-0 z-[500] bg-[var(--bg-color)] flex flex-col items-center justify-center p-8 text-center animate-in fade-in duration-700 overflow-y-auto">
      <div className="max-w-md w-full space-y-12 my-auto">
        <header className="space-y-4">
          <div className="text-[var(--accent-primary)] font-display text-7xl leading-none">CR</div>
          <h1 className="text-4xl font-display font-bold tracking-tight uppercase">
            {currentProfile.isSetup ? 'Refine Profile' : 'Runner Setup'}
          </h1>
          <p className="text-xs opacity-40 font-bold uppercase tracking-[0.3em]">
            Establish your identity on the route
          </p>
        </header>

        <form onSubmit={handleSubmit} className="space-y-10">
          <div className="flex flex-col items-center">
            <div className="relative">
              <div className="absolute inset-0 bg-[var(--accent-primary)] opacity-10 blur-3xl rounded-full scale-125"></div>
              <div className="relative w-48 h-48 rounded-[3rem] overflow-hidden ring-1 ring-white/10 shadow-2xl bg-[var(--card-bg)] border border-[var(--border-color)]">
                <img src={avatar} className="w-full h-full object-cover" alt="Profile" />
              </div>
            </div>
          </div>

          <div className="space-y-6">
            <div className="space-y-2 text-left">
              <label className="text-[10px] font-black uppercase tracking-[0.3em] opacity-30 block ml-4">Runner Handle</label>
              <input 
                value={username} 
                onChange={e => setUsername(e.target.value)}
                placeholder="USERNAME" 
                className="w-full glass bg-white/5 border border-white/10 rounded-2xl px-8 py-5 text-xl font-bold text-center text-white focus:outline-none focus:ring-2 ring-[var(--accent-primary)]/30 placeholder:text-white/5 uppercase"
                required
              />
            </div>

            <div className="space-y-2 text-left">
               <label className="text-[10px] font-black uppercase tracking-[0.3em] opacity-30 block ml-4">Bio</label>
              <textarea 
                value={bio} 
                onChange={e => setBio(e.target.value)}
                placeholder="A short sentence about your running style..." 
                className="w-full glass bg-white/5 border border-white/10 rounded-2xl px-8 py-5 text-center text-sm font-medium text-white/60 focus:outline-none focus:ring-2 ring-[var(--accent-primary)]/30"
                rows={2}
              />
            </div>
          </div>

          <button 
            type="submit"
            className="w-full bg-[var(--accent-primary)] text-[var(--bg-color)] font-black py-6 rounded-2xl shadow-2xl shadow-[var(--accent-primary)]/20 text-lg tracking-[0.2em] uppercase active:scale-95 transition-all"
          >
            {currentProfile.isSetup ? 'SAVE CHANGES' : 'COMPLETE SETUP'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default Onboarding;
