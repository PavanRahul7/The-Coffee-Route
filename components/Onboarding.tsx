import React, { useState } from 'react';
import { UserProfile } from '../types';
import { storageService } from '../services/storageService';

interface OnboardingProps {
  onComplete: (profile: UserProfile) => void;
}

const Onboarding: React.FC<OnboardingProps> = ({ onComplete }) => {
  const [username, setUsername] = useState('');
  const [bio, setBio] = useState('');
  const [avatar, setAvatar] = useState('https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=400&h=400&fit=crop');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!username) return;

    const profile = storageService.getProfile();
    const updatedProfile: UserProfile = {
      ...profile,
      username,
      bio: bio || 'Running from our problems toward caffeine.',
      avatar,
      isSetup: true
    };
    storageService.saveProfile(updatedProfile);
    onComplete(updatedProfile);
  };

  return (
    <div className="fixed inset-0 z-[500] bg-[var(--bg-color)] flex flex-col items-center justify-center p-8 text-center animate-in fade-in duration-700">
      <div className="max-w-md w-full space-y-12">
        <header className="space-y-4">
          <div className="text-[var(--accent-primary)] font-display text-8xl leading-none animate-pulse">CR</div>
          <h1 className="text-4xl font-display font-black tracking-tight uppercase">Welcome to the Roast</h1>
          <p className="text-sm opacity-60 font-bold uppercase tracking-[0.2em]">Running from our problems toward caffeine</p>
        </header>

        <form onSubmit={handleSubmit} className="space-y-8">
          <div className="space-y-4 flex flex-col items-center">
            <div className="w-32 h-32 rounded-[3rem] overflow-hidden ring-4 ring-[var(--accent-primary)]/20 shadow-2xl rotate-3">
              <img src={avatar} className="w-full h-full object-cover" alt="Profile Preview" />
            </div>
            <input 
              value={avatar} 
              onChange={e => setAvatar(e.target.value)}
              placeholder="Paste Avatar URL..." 
              className="w-full glass bg-white/5 border border-white/10 rounded-2xl px-6 py-4 text-[10px] font-mono text-center focus:outline-none"
            />
          </div>

          <div className="space-y-2">
            <input 
              value={username} 
              onChange={e => setUsername(e.target.value)}
              placeholder="YOUR RUNNER HANDLE" 
              className="w-full glass bg-white/5 border border-white/10 rounded-3xl px-8 py-6 text-2xl font-black text-center text-white focus:outline-none focus:ring-4 ring-[var(--accent-primary)]/20 placeholder:text-white/10 uppercase"
              required
            />
          </div>

          <div className="space-y-2">
            <textarea 
              value={bio} 
              onChange={e => setBio(e.target.value)}
              placeholder="Your runner's bio (optional)" 
              className="w-full glass bg-white/5 border border-white/10 rounded-3xl px-8 py-6 text-center text-white/60 focus:outline-none"
              rows={2}
            />
          </div>

          <button 
            type="submit"
            className="w-full bg-[var(--accent-primary)] text-[var(--bg-color)] font-black py-8 rounded-[2.5rem] shadow-2xl shadow-[var(--accent-primary)]/30 text-2xl tracking-widest uppercase active:scale-95 transition-all"
          >
            START BREWING
          </button>
        </form>
      </div>
    </div>
  );
};

export default Onboarding;