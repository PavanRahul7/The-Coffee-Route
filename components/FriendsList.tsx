
import React, { useState, useEffect } from 'react';
import { UserProfile } from '../types';
import { storageService } from '../services/storageService';
import { formatDistance, formatPace, getPaceUnit } from '../services/unitUtils';

interface FriendsListProps {
  currentUser: UserProfile;
  onUpdate: (profile: UserProfile) => void;
}

const FriendsList: React.FC<FriendsListProps> = ({ currentUser, onUpdate }) => {
  const [allUsers, setAllUsers] = useState<UserProfile[]>([]);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    setAllUsers(storageService.getAllUsers());
  }, []);

  const handleToggleFollow = (id: string) => {
    const updated = storageService.toggleFollowUser(id);
    if (updated) {
      onUpdate(updated);
      setAllUsers(storageService.getAllUsers());
    }
  };

  const filteredUsers = allUsers.filter(u => 
    u.id !== currentUser.id && 
    (u.username.toLowerCase().includes(searchTerm.toLowerCase()) || 
     u.bio.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const friends = allUsers.filter(u => currentUser.friendIds.includes(u.id));
  const discovery = filteredUsers.filter(u => !currentUser.friendIds.includes(u.id));
  const unitSystem = currentUser.unitSystem || 'metric';

  return (
    <div className="space-y-12 pb-20 fade-slide-up">
      <header className="space-y-2">
        <h2 className="text-4xl font-display font-bold">THE CREW</h2>
        <p className="text-xs opacity-40 font-bold uppercase tracking-[0.3em]">Build your social roast circle</p>
      </header>

      <div className="relative group">
        <input 
          type="text"
          placeholder="Search for fellow roasters..."
          className="w-full glass bg-white/5 border border-white/10 rounded-3xl py-6 pl-14 pr-6 text-white font-bold placeholder:text-white/20 focus:outline-none focus:ring-2 ring-[var(--accent-primary)]/30 transition-all"
          value={searchTerm}
          onChange={e => setSearchTerm(e.target.value)}
        />
        <svg className="h-6 w-6 absolute left-6 top-1/2 -translate-y-1/2 opacity-30" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
      </div>

      {friends.length > 0 && (
        <section className="space-y-6">
          <div className="flex justify-between items-end px-1">
            <h2 className="text-[10px] font-black uppercase tracking-[0.4em] opacity-40 font-coffee">Following ({friends.length})</h2>
          </div>
          <div className="grid grid-cols-1 gap-4">
            {friends.map(friend => (
              <div key={friend.id} className="bg-[var(--card-bg)] rounded-[2.5rem] p-6 border border-[var(--border-color)] flex items-center gap-6 card-shadow">
                <img src={friend.avatar} className="w-16 h-16 rounded-2xl object-cover ring-2 ring-[var(--accent-primary)]/20" alt={friend.username} />
                <div className="flex-1">
                  <h3 className="text-lg font-bold">{friend.username}</h3>
                  <div className="flex gap-3 text-[9px] font-black uppercase tracking-widest opacity-30 mt-1">
                    <span>{formatDistance(friend.stats.totalDistance, unitSystem).value} {formatDistance(friend.stats.totalDistance, unitSystem).unit}</span>
                    <span>•</span>
                    <span>{formatPace(friend.stats.avgPace, unitSystem)} PACE</span>
                  </div>
                </div>
                <button 
                  onClick={() => handleToggleFollow(friend.id)}
                  className="bg-red-500/10 text-red-500 text-[10px] font-black uppercase tracking-widest px-6 py-3 rounded-2xl hover:bg-red-500 hover:text-white transition-all"
                >
                  Unfollow
                </button>
              </div>
            ))}
          </div>
        </section>
      )}

      {discovery.length > 0 && (
        <section className="space-y-6">
          <div className="flex justify-between items-end px-1">
            <h2 className="text-[10px] font-black uppercase tracking-[0.4em] opacity-40 font-coffee">Discover New Baristas</h2>
          </div>
          <div className="grid grid-cols-1 gap-4">
            {discovery.map(user => (
              <div key={user.id} className="bg-[var(--card-bg)] rounded-[2.5rem] p-6 border border-[var(--border-color)] flex items-center gap-6 card-shadow">
                <img src={user.avatar} className="w-16 h-16 rounded-2xl object-cover grayscale-[0.5]" alt={user.username} />
                <div className="flex-1">
                  <h3 className="text-lg font-bold">{user.username}</h3>
                  <p className="text-xs opacity-40 italic mt-0.5 line-clamp-1">"{user.bio}"</p>
                </div>
                <button 
                  onClick={() => handleToggleFollow(user.id)}
                  className="bg-[var(--accent-primary)] text-[var(--bg-color)] text-[10px] font-black uppercase tracking-widest px-8 py-3 rounded-2xl shadow-lg shadow-[var(--accent-primary)]/20 active:scale-90 transition-all"
                >
                  Follow
                </button>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
};

export default FriendsList;
