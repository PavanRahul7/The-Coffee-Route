import React, { useState, useEffect } from 'react';
import { UserProfile } from '../types';
import { storageService } from '../services/storageService';

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
    onUpdate(updated);
  };

  const filteredUsers = allUsers.filter(u => 
    u.id !== currentUser.id && 
    (u.username.toLowerCase().includes(searchTerm.toLowerCase()) || 
     u.bio.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const friends = allUsers.filter(u => currentUser.friendIds.includes(u.id));

  return (
    <div className="space-y-12 pb-20 fade-slide-up">
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

      {friends.length > 0 && !searchTerm && (
        <section className="space-y-6">
          <div className="flex justify-between items-end px-1">
            <h2 className="text-xs font-black uppercase tracking-[0.4em] opacity-40 font-coffee">Your Crew</h2>
            <span className="text-[10px] font-bold opacity-30 uppercase tracking-widest">{friends.length} FOLLOWING</span>
          </div>
          <div className="grid grid-cols-1 gap-4">
            {friends.map(friend => (
              <div key={friend.id} className="bg-[var(--card-bg)] rounded-[2.5rem] p-6 border border-[var(--border-color)] flex items-center gap-6 group hover:border-[var(--accent-primary)]/30 transition-all card-shadow">
                <img src={friend.avatar} className="w-16 h-16 rounded-2xl object-cover ring-2 ring-[var(--accent-primary)]/10" alt={friend.username} />
                <div className="flex-1">
                  <h3 className="text-lg font-bold group-hover:text-[var(--accent-primary)] transition-colors">{friend.username}</h3>
                  <p className="text-xs opacity-40 italic">"{friend.bio}"</p>
                  <div className="flex gap-4 mt-2">
                    <span className="text-[9px] font-black uppercase tracking-widest opacity-30">{friend.stats.totalDistance} KM</span>
                    <span className="text-[9px] font-black uppercase tracking-widest opacity-30">{friend.stats.avgPace} PACE</span>
                  </div>
                </div>
                <button 
                  onClick={() => handleToggleFollow(friend.id)}
                  className="bg-red-500/10 text-red-500 text-[10px] font-black uppercase tracking-widest px-4 py-2 rounded-xl hover:bg-red-500 hover:text-white transition-all"
                >
                  Unfollow
                </button>
              </div>
            ))}
          </div>
        </section>
      )}

      <section className="space-y-6">
        <div className="flex justify-between items-end px-1">
          <h2 className="text-xs font-black uppercase tracking-[0.4em] opacity-40 font-coffee">Discovery Roast</h2>
          <span className="text-[10px] font-bold opacity-30 uppercase tracking-widest">Find new partners</span>
        </div>
        <div className="grid grid-cols-1 gap-4">
          {filteredUsers.map(user => {
            const isFollowing = currentUser.friendIds.includes(user.id);
            return (
              <div key={user.id} className="bg-[var(--card-bg)] rounded-[2.5rem] p-6 border border-[var(--border-color)] flex items-center gap-6 card-shadow">
                <img src={user.avatar} className="w-16 h-16 rounded-2xl object-cover" alt={user.username} />
                <div className="flex-1">
                  <h3 className="text-lg font-bold">{user.username}</h3>
                  <p className="text-xs opacity-40">{user.bio}</p>
                </div>
                <button 
                  onClick={() => handleToggleFollow(user.id)}
                  className={`text-[10px] font-black uppercase tracking-widest px-6 py-3 rounded-2xl transition-all ${
                    isFollowing 
                      ? 'bg-slate-800 text-white/40' 
                      : 'bg-[var(--accent-primary)] text-white shadow-lg shadow-[var(--accent-primary)]/20 active:scale-90'
                  }`}
                >
                  {isFollowing ? 'Following' : 'Follow'}
                </button>
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
};

export default FriendsList;