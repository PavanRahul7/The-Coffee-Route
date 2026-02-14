import React, { useState } from 'react';
import { RunClub, Route } from '../types';

interface ClubCreatorProps {
  routes: Route[];
  onSave: (club: RunClub) => void;
  onCancel: () => void;
}

const ClubCreator: React.FC<ClubCreatorProps> = ({ routes, onSave, onCancel }) => {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [meetingTime, setMeetingTime] = useState('');
  const [location, setLocation] = useState('');
  const [selectedRouteId, setSelectedRouteId] = useState(routes[0]?.id || '');
  const [logo, setLogo] = useState(`https://images.unsplash.com/photo-1511920170033-f8396924c348?w=200&h=200&fit=crop`);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !meetingTime) return;

    const newClub: RunClub = {
      id: Math.random().toString(36).substr(2, 9),
      name,
      description,
      logo,
      memberCount: 1,
      weeklyRouteId: selectedRouteId,
      meetingTime,
      location,
      creatorId: 'user_1'
    };
    onSave(newClub);
  };

  return (
    <div className="fixed inset-0 z-[120] bg-[var(--bg-color)] flex flex-col p-8 overflow-y-auto animate-in slide-in-from-bottom duration-500">
      <div className="max-w-xl mx-auto w-full space-y-12 pb-20">
        <header className="flex justify-between items-center">
          <div className="space-y-1">
            <h2 className="text-4xl font-display font-bold text-[var(--accent-primary)] uppercase">Found a Club</h2>
            <p className="text-[10px] font-black uppercase tracking-[0.3em] opacity-30">Brew a new community circle</p>
          </div>
          <button onClick={onCancel} className="glass p-4 rounded-3xl text-white opacity-40 hover:opacity-100 transition-opacity">
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </header>

        <form onSubmit={handleSubmit} className="space-y-10">
          <div className="space-y-4">
             <label className="text-[10px] font-black uppercase tracking-[0.3em] opacity-30 block ml-2">Club Brand Name</label>
             <input 
              value={name} 
              onChange={e => setName(e.target.value)}
              placeholder="e.g. Midnight Espresso Crew" 
              className="w-full glass bg-white/5 border border-white/10 rounded-3xl px-8 py-6 text-xl font-bold text-white focus:outline-none focus:ring-2 ring-[var(--accent-primary)]/40 transition-all placeholder:text-white/10"
              required
             />
          </div>

          <div className="space-y-4">
             <label className="text-[10px] font-black uppercase tracking-[0.3em] opacity-30 block ml-2">The Roast (Description)</label>
             <textarea 
              value={description} 
              onChange={e => setDescription(e.target.value)}
              placeholder="What's the vibe of this circle?" 
              rows={3}
              className="w-full glass bg-white/5 border border-white/10 rounded-3xl px-8 py-6 text-lg font-medium text-white focus:outline-none focus:ring-2 ring-[var(--accent-primary)]/40 transition-all placeholder:text-white/10"
             />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="space-y-4">
               <label className="text-[10px] font-black uppercase tracking-[0.3em] opacity-30 block ml-2">Meeting Time</label>
               <input 
                value={meetingTime} 
                onChange={e => setMeetingTime(e.target.value)}
                placeholder="e.g. Saturdays @ 8am" 
                className="w-full glass bg-white/5 border border-white/10 rounded-3xl px-8 py-6 font-bold text-white focus:outline-none"
                required
               />
            </div>
            <div className="space-y-4">
               <label className="text-[10px] font-black uppercase tracking-[0.3em] opacity-30 block ml-2">Base Location</label>
               <input 
                value={location} 
                onChange={e => setLocation(e.target.value)}
                placeholder="e.g. The Main Square" 
                className="w-full glass bg-white/5 border border-white/10 rounded-3xl px-8 py-6 font-bold text-white focus:outline-none"
               />
            </div>
          </div>

          <div className="space-y-4">
             <label className="text-[10px] font-black uppercase tracking-[0.3em] opacity-30 block ml-2">The Weekly Roast (Select Route)</label>
             <select 
              value={selectedRouteId} 
              onChange={e => setSelectedRouteId(e.target.value)}
              className="w-full glass bg-white/5 border border-white/10 rounded-3xl px-8 py-6 font-bold text-white focus:outline-none appearance-none"
             >
               {routes.map(r => (
                 <option key={r.id} value={r.id} className="bg-slate-900 text-white">{r.name} ({r.distance}km)</option>
               ))}
             </select>
          </div>

          <button 
            type="submit"
            className="w-full bg-[var(--accent-primary)] text-[var(--bg-color)] font-black py-8 rounded-[2.5rem] shadow-2xl shadow-[var(--accent-primary)]/30 text-2xl tracking-widest uppercase active:scale-95 transition-all"
          >
            ESTABLISH CLUB
          </button>
        </form>
      </div>
    </div>
  );
};

export default ClubCreator;