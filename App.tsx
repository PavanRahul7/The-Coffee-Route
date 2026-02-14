
import React, { useState, useEffect } from 'react';
import { AppTab, Route, RunHistory, UserProfile, Difficulty, ThemeType, RunClub, Review, UnitSystem } from './types';
import { storageService } from './services/storageService';
import { offlineService } from './services/offlineService';
import { formatDistance, formatElevation, formatPace, getPaceUnit } from './services/unitUtils';
import BottomNav from './components/BottomNav';
import RouteDetail from './components/RouteDetail';
import LiveTracking from './components/LiveTracking';
import RouteCreator from './components/RouteCreator';
import ClubCreator from './components/ClubCreator';
import ReviewModal from './components/ReviewModal';
import Onboarding from './components/Onboarding';
import FriendsList from './components/FriendsList';
import Login from './components/Login';
import ShareModal from './components/ShareModal';

const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<AppTab>('explore');
  const [routes, setRoutes] = useState<Route[]>([]);
  const [clubs, setClubs] = useState<RunClub[]>([]);
  const [runs, setRuns] = useState<RunHistory[]>([]);
  
  const [profile, setProfile] = useState<UserProfile | null>(() => storageService.getProfile());
  
  const [selectedRoute, setSelectedRoute] = useState<Route | null>(null);
  const [trackingRoute, setTrackingRoute] = useState<Route | null>(null);
  const [editingRoute, setEditingRoute] = useState<Route | null>(null);
  const [sharingItem, setSharingItem] = useState<{ item: Route | RunHistory; type: 'route' | 'run' } | null>(null);
  const [isAddingClub, setIsAddingClub] = useState(false);
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [pendingReviewRoute, setPendingReviewRoute] = useState<Route | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  
  const [theme, setTheme] = useState<ThemeType>(profile?.theme || 'barista');
  const [unitSystem, setUnitSystem] = useState<UnitSystem>(profile?.unitSystem || 'imperial');
  
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [offlineRouteIds, setOfflineRouteIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    const handleStatus = () => setIsOnline(navigator.onLine);
    window.addEventListener('online', handleStatus);
    window.addEventListener('offline', handleStatus);
    return () => {
      window.removeEventListener('online', handleStatus);
      window.removeEventListener('offline', handleStatus);
    };
  }, []);

  useEffect(() => {
    if (profile) {
      if (profile.theme) setTheme(profile.theme);
      if (profile.unitSystem) setUnitSystem(profile.unitSystem);
    }
    
    const loadedRoutes = storageService.getRoutes();
    setRoutes(loadedRoutes);
    setClubs(storageService.getClubs());
    setRuns(storageService.getRuns());

    checkOfflineRoutes();
  }, [profile?.id]);

  const checkOfflineRoutes = async () => {
    const offRoutes = await offlineService.getOfflineRoutes();
    setOfflineRouteIds(new Set(offRoutes.map(r => r.id)));
  };

  useEffect(() => {
    const html = document.documentElement;
    const themeClass = theme === 'stealth' ? 'dark' : 
                      (theme === 'solar' ? 'light theme-solar' : 
                      (theme === 'neon' ? 'dark theme-neon' : 
                      (theme === 'forest' ? 'dark theme-forest' : 'dark theme-barista')));
    html.className = themeClass;
  }, [theme]);

  const handleFinishRun = (run: RunHistory) => {
    setRuns([run, ...runs]);
    const route = routes.find(r => r.id === run.routeId);
    setTrackingRoute(null);
    setActiveTab('runs');
    setProfile(storageService.getProfile());
    
    if (route) {
      setTimeout(() => setPendingReviewRoute(route), 1000);
    }
  };

  const handleSaveRoute = (route: Route) => {
    if (editingRoute) {
      storageService.updateRoute(route);
      setRoutes(routes.map(r => r.id === route.id ? route : r));
      setEditingRoute(null);
    } else {
      storageService.saveRoute(route);
      setRoutes([route, ...routes]);
    }
    setActiveTab('explore');
  };

  const handleEditRoute = (route: Route) => {
    setSelectedRoute(null);
    setEditingRoute(route);
  };

  const handleSaveClub = (club: RunClub) => {
    storageService.saveClub(club);
    setClubs([club, ...clubs]);
    const updatedProfile = storageService.toggleClubMembership(club.id);
    if (updatedProfile) setProfile(updatedProfile);
    setIsAddingClub(false);
  };

  const handleReviewSubmitted = (review: Review) => {
    setPendingReviewRoute(null);
    setRuns(storageService.getRuns());
    setRoutes(storageService.getRoutes());
  };

  const handleThemeChange = (newTheme: ThemeType) => {
    setTheme(newTheme);
    if (profile) {
      const updatedProfile = { ...profile, theme: newTheme };
      setProfile(updatedProfile);
      storageService.saveProfile(updatedProfile);
    }
  };

  const handleUnitSystemChange = (newSystem: UnitSystem) => {
    setUnitSystem(newSystem);
    if (profile) {
      const updatedProfile = { ...profile, unitSystem: newSystem };
      setProfile(updatedProfile);
      storageService.saveProfile(updatedProfile);
    }
  };

  const handleLogout = () => {
    storageService.logout();
    setProfile(null);
  };

  const handleToggleFollow = (userId: string) => {
    const updated = storageService.toggleFollowUser(userId);
    if (updated) setProfile(updated);
  };

  const filteredRoutes = routes.filter(r => 
    r.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    r.tags.some(t => t.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const friendsRoutes = filteredRoutes.filter(r => profile?.friendIds.includes(r.creatorId));
  const publicRoutes = filteredRoutes.filter(r => !profile?.friendIds.includes(r.creatorId));

  const themeOptions: { id: ThemeType; label: string; colors: string[] }[] = [
    { id: 'barista', label: 'Barista', colors: ['#1a0f0a', '#d2b48c', '#fdf5e6'] },
    { id: 'stealth', label: 'Stealth', colors: ['#020617', '#3b82f6', '#10b981'] },
    { id: 'solar', label: 'Solar Flare', colors: ['#ffffff', '#f97316', '#0f172a'] },
    { id: 'neon', label: 'Neon Night', colors: ['#000000', '#d946ef', '#22d3ee'] },
    { id: 'forest', label: 'Forest Trail', colors: ['#050a06', '#a3e635', '#fbbf24'] },
  ];

  if (!profile) return <Login onLogin={setProfile} />;
  if (profile && !profile.isSetup) return <Onboarding onComplete={setProfile} />;

  return (
    <div className="h-screen w-full flex flex-col overflow-hidden transition-all duration-500">
      {!isOnline && (
        <div className="bg-amber-600 text-white text-[10px] font-black uppercase tracking-[0.3em] py-2 text-center shrink-0">
          Offline Mode Activated
        </div>
      )}
      
      <header className="px-8 pt-12 pb-8 flex justify-between items-end z-40 bg-gradient-to-b from-[var(--bg-color)] to-transparent shrink-0">
        <div className="flex items-center gap-4">
          <div className="space-y-0.5">
            <span className="text-[9px] font-bold tracking-[0.2em] uppercase opacity-40">The Coffee Route</span>
            <h1 className="text-3xl font-display font-bold leading-none tracking-tight text-[var(--accent-primary)]">
              DASHBOARD
            </h1>
          </div>
        </div>
        
        <button onClick={() => setActiveTab('profile')} className="flex items-center gap-4 bg-[var(--card-bg)] border border-[var(--border-color)] pl-5 pr-3 py-2.5 rounded-2xl group active:scale-95 transition-all card-shadow">
          <div className="text-right hidden sm:block">
            <div className="text-xs font-bold leading-tight" style={{ color: 'var(--text-main)' }}>{profile.username}</div>
            <div className="text-[9px] uppercase tracking-widest font-black opacity-40">
              {formatDistance(profile.stats.totalDistance, unitSystem).value} {formatDistance(profile.stats.totalDistance, unitSystem).unit} BREWED
            </div>
          </div>
          <img src={profile.avatar} className="w-10 h-10 rounded-xl object-cover ring-2 ring-[var(--accent-primary)] ring-offset-2 ring-offset-[var(--bg-color)] shadow-xl" alt="User" />
        </button>
      </header>

      <main className="flex-1 overflow-y-auto px-8 pb-40">
        {activeTab === 'explore' && (
          <div className="space-y-10 fade-slide-up">
            <div className="relative group">
              <input 
                type="text"
                placeholder="Find a coffee shop path..."
                className="w-full glass bg-white/5 border border-[var(--border-color)] rounded-3xl py-6 pl-16 pr-6 text-[var(--text-main)] font-semibold text-lg focus:outline-none placeholder:text-[var(--text-muted)]/40"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
              />
              <svg className="h-6 w-6 absolute left-6 top-1/2 -translate-y-1/2 opacity-30" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>

            {friendsRoutes.length > 0 && (
              <section className="space-y-6">
                <h2 className="text-xs font-black uppercase tracking-[0.3em] opacity-40 font-coffee">Friends' Brews</h2>
                <div className="flex gap-6 overflow-x-auto pb-6 no-scrollbar -mx-2 px-2">
                  {friendsRoutes.map(route => (
                    <div 
                      key={route.id} 
                      onClick={() => setSelectedRoute(route)}
                      className="min-w-[280px] bg-[var(--card-bg)] rounded-[2.5rem] border border-[var(--accent-primary)]/20 overflow-hidden flex flex-col p-2 card-shadow cursor-pointer"
                    >
                      <img src={`https://picsum.photos/seed/${route.id}/400/300`} className="h-32 w-full object-cover rounded-[2rem] grayscale-[0.2]" alt={route.name} />
                      <div className="p-4 space-y-1">
                        <div className="flex justify-between items-start">
                          <h3 className="font-bold text-lg leading-tight truncate mr-2">{route.name}</h3>
                          <span className="text-[10px] font-black text-[var(--accent-primary)]">{formatDistance(route.distance, unitSystem).value} {formatDistance(route.distance, unitSystem).unit}</span>
                        </div>
                        <p className="text-[10px] opacity-40 font-bold uppercase tracking-widest">BY {route.creatorName}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            )}

            <section className="space-y-8">
              <h2 className="text-xs font-black uppercase tracking-[0.3em] opacity-40 font-coffee">Public Discoveries</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                {publicRoutes.map(route => (
                  <div key={route.id} onClick={() => setSelectedRoute(route)} className="group relative bg-[var(--card-bg)] rounded-[3rem] border border-[var(--border-color)] overflow-hidden cursor-pointer hover:translate-y-[-6px] transition-all duration-500 card-shadow">
                    <div className="h-64 relative overflow-hidden">
                      <img src={`https://picsum.photos/seed/${route.id}/800/600`} className="w-full h-full object-cover grayscale-[0.4] group-hover:scale-110 group-hover:grayscale-0 transition-all duration-1000" alt={route.name} />
                      <div className="absolute inset-0 bg-gradient-to-t from-[var(--bg-color)]/95 via-transparent to-transparent opacity-90" />
                      <div className="absolute bottom-6 left-8 right-8 flex items-end justify-between">
                        <div className="space-y-1">
                          <h3 className="text-3xl font-bold text-white group-hover:text-[var(--accent-primary)] transition-colors tracking-tight">{route.name}</h3>
                          <div className="text-[10px] font-black uppercase tracking-widest text-white/40">{route.creatorName} • {route.rating} ★</div>
                        </div>
                        <div className="bg-[var(--accent-primary)] px-5 py-2.5 rounded-2xl text-[10px] font-black tracking-widest text-[var(--bg-color)] shadow-2xl uppercase">
                          {formatDistance(route.distance, unitSystem).value} {formatDistance(route.distance, unitSystem).unit}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          </div>
        )}

        {activeTab === 'friends' && profile && (
          <FriendsList currentUser={profile} onUpdate={setProfile} />
        )}

        {activeTab === 'profile' && profile && (
          <div className="space-y-16 fade-slide-up max-w-xl mx-auto pb-12">
            <div className="text-center relative py-12">
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-[var(--accent-primary)] opacity-10 blur-[100px] rounded-full" />
              <div className="relative inline-block">
                <div className="w-48 h-48 rounded-[4rem] p-1.5 border-2 border-[var(--border-color)] overflow-hidden shadow-2xl mx-auto rotate-3">
                   <img src={profile.avatar} className="w-full h-full rounded-[3.8rem] object-cover" alt="Avatar" />
                </div>
                <button onClick={() => setIsEditingProfile(true)} className="absolute -bottom-2 -right-2 bg-[var(--accent-primary)] p-5 rounded-3xl text-[var(--bg-color)] shadow-2xl hover:scale-110 transition-all">
                  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
                </button>
              </div>
              <h2 className="text-5xl font-extrabold mt-10 tracking-tight leading-none uppercase">{profile.username}</h2>
              <div className="flex justify-center gap-8 mt-6">
                <button onClick={() => setActiveTab('friends')} className="text-center">
                   <div className="text-2xl font-display text-[var(--accent-primary)]">{profile.friendIds.length}</div>
                   <div className="text-[9px] font-black uppercase tracking-widest opacity-30">FOLLOWING</div>
                </button>
                <div className="text-center">
                   <div className="text-2xl font-display text-[var(--accent-secondary)]">{runs.length}</div>
                   <div className="text-[9px] font-black uppercase tracking-widest opacity-30">SESSIONS</div>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-6">
               <div className="bg-[var(--card-bg)] p-8 rounded-[3rem] text-center border border-[var(--border-color)]">
                  <div className="text-3xl font-display text-[var(--accent-primary)]">{formatDistance(profile.stats.totalDistance, unitSystem).value}</div>
                  <div className="text-[9px] font-black uppercase tracking-[0.3em] opacity-30">TOTAL KM</div>
               </div>
               <div className="bg-[var(--card-bg)] p-8 rounded-[3rem] text-center border border-[var(--border-color)]">
                  <div className="text-3xl font-display text-orange-500">{formatPace(profile.stats.avgPace, unitSystem)}</div>
                  <div className="text-[9px] font-black uppercase tracking-[0.3em] opacity-30">AVG PACE</div>
               </div>
            </div>

            <section className="space-y-8">
              <h3 className="text-xs font-black uppercase tracking-[0.4em] opacity-30 text-center">Unit Preference</h3>
              <div className="flex gap-4 p-2 glass rounded-[2.5rem] bg-white/5 border border-white/10">
                <button onClick={() => handleUnitSystemChange('metric')} className={`flex-1 py-6 rounded-[2rem] text-xs font-black tracking-widest uppercase transition-all ${unitSystem === 'metric' ? 'bg-[var(--accent-primary)] text-[var(--bg-color)]' : 'text-white/40'}`}>METRIC</button>
                <button onClick={() => handleUnitSystemChange('imperial')} className={`flex-1 py-6 rounded-[2rem] text-xs font-black tracking-widest uppercase transition-all ${unitSystem === 'imperial' ? 'bg-[var(--accent-primary)] text-[var(--bg-color)]' : 'text-white/40'}`}>IMPERIAL</button>
              </div>
            </section>

            <button onClick={handleLogout} className="w-full py-6 rounded-[2rem] border border-red-500/20 text-red-500 text-xs font-black uppercase tracking-[0.4em] hover:bg-red-500/10">LOGOUT</button>
          </div>
        )}

        {activeTab === 'runs' && (
          <div className="space-y-10 fade-slide-up">
            <h2 className="text-4xl font-display font-bold text-[var(--text-main)]">PAST BREWS</h2>
            <div className="space-y-6">
              {runs.map(run => (
                <div key={run.id} className="bg-[var(--card-bg)] rounded-[3rem] p-8 border border-[var(--border-color)] flex justify-between items-center card-shadow group">
                  <div className="flex-1">
                    <h4 className="text-2xl font-bold">{run.routeName}</h4>
                    <p className="text-xs opacity-40 uppercase tracking-widest">{new Date(run.date).toLocaleDateString()}</p>
                    <button 
                      onClick={() => setSharingItem({ item: run, type: 'run' })}
                      className="mt-4 flex items-center gap-2 text-[9px] font-black uppercase tracking-widest text-[var(--accent-primary)] opacity-0 group-hover:opacity-100 transition-all transform translate-y-2 group-hover:translate-y-0"
                    >
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" /></svg>
                      Share this session
                    </button>
                  </div>
                  <div className="text-right">
                    <div className="text-3xl font-display text-[var(--accent-primary)]">{formatDistance(run.distance, unitSystem).value} {formatDistance(run.distance, unitSystem).unit}</div>
                    <div className="text-[9px] font-black opacity-30 uppercase">{formatPace(run.averagePace, unitSystem)} PACE</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>

      <BottomNav activeTab={activeTab} onTabChange={setActiveTab} />

      {selectedRoute && (
        <RouteDetail 
          route={selectedRoute} 
          unitSystem={unitSystem}
          onClose={() => setSelectedRoute(null)} 
          onStart={(r) => { setSelectedRoute(null); setTrackingRoute(r); }}
          onEdit={handleEditRoute}
          onToggleFollow={handleToggleFollow}
          isFollowingCreator={profile?.friendIds.includes(selectedRoute.creatorId) || false}
          currentUserId={profile?.id || ''}
          onOpenShare={() => setSharingItem({ item: selectedRoute, type: 'route' })}
        />
      )}

      {trackingRoute && (
        <LiveTracking 
          route={trackingRoute} 
          unitSystem={unitSystem}
          onFinish={handleFinishRun} 
          onCancel={() => setTrackingRoute(null)} 
        />
      )}

      {sharingItem && (
        <ShareModal 
          item={sharingItem.item}
          type={sharingItem.type}
          unitSystem={unitSystem}
          onClose={() => setSharingItem(null)}
        />
      )}

      {(activeTab === 'create' || editingRoute) && (
        <RouteCreator 
          unitSystem={unitSystem}
          onSave={handleSaveRoute}
          onCancel={() => { setActiveTab('explore'); setEditingRoute(null); }}
          initialRoute={editingRoute || undefined}
        />
      )}

      {isAddingClub && (
        <ClubCreator 
          routes={routes}
          onSave={handleSaveClub}
          onCancel={() => setIsAddingClub(false)}
        />
      )}

      {isEditingProfile && profile && (
        <Onboarding onComplete={(p) => { setProfile(p); setIsEditingProfile(false); }} />
      )}

      {pendingReviewRoute && profile && (
        <ReviewModal
          route={pendingReviewRoute}
          profile={profile}
          onSubmitted={handleReviewSubmitted}
          onSkip={() => setPendingReviewRoute(null)}
        />
      )}
    </div>
  );
};

export default App;
