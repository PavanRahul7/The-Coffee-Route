import React, { useState, useEffect } from 'react';
import { AppTab, Route, RunHistory, UserProfile, Difficulty, ThemeType } from './types';
import { storageService } from './services/storageService';
import BottomNav from './components/BottomNav';
import RouteDetail from './components/RouteDetail';
import LiveTracking from './components/LiveTracking';
import RouteCreator from './components/RouteCreator';

const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<AppTab>('explore');
  const [routes, setRoutes] = useState<Route[]>([]);
  const [runs, setRuns] = useState<RunHistory[]>([]);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [selectedRoute, setSelectedRoute] = useState<Route | null>(null);
  const [trackingRoute, setTrackingRoute] = useState<Route | null>(null);
  const [editingRoute, setEditingRoute] = useState<Route | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [theme, setTheme] = useState<ThemeType>('barista');

  useEffect(() => {
    setRoutes(storageService.getRoutes());
    setRuns(storageService.getRuns());
    const p = storageService.getProfile();
    setProfile(p);
    if (p.theme) {
      setTheme(p.theme);
    }
  }, []);

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
    setTrackingRoute(null);
    setActiveTab('runs');
    setProfile(storageService.getProfile());
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

  const handleThemeChange = (newTheme: ThemeType) => {
    setTheme(newTheme);
    if (profile) {
      const updatedProfile = { ...profile, theme: newTheme };
      setProfile(updatedProfile);
      storageService.saveProfile(updatedProfile);
    }
  };

  const filteredRoutes = routes.filter(r => 
    r.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    r.tags.some(t => t.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const themeOptions: { id: ThemeType; label: string; colors: string[] }[] = [
    { id: 'barista', label: 'Barista', colors: ['#1a0f0a', '#d2b48c', '#fdf5e6'] },
    { id: 'stealth', label: 'Stealth', colors: ['#020617', '#3b82f6', '#10b981'] },
    { id: 'solar', label: 'Solar Flare', colors: ['#ffffff', '#f97316', '#0f172a'] },
    { id: 'neon', label: 'Neon Night', colors: ['#000000', '#d946ef', '#22d3ee'] },
    { id: 'forest', label: 'Forest Trail', colors: ['#050a06', '#a3e635', '#fbbf24'] },
  ];

  return (
    <div className="h-screen w-full flex flex-col overflow-hidden transition-all duration-500">
      {/* Dynamic Header */}
      <header className="px-8 pt-12 pb-8 flex justify-between items-end z-40 bg-gradient-to-b from-[var(--bg-color)] to-transparent shrink-0">
        <div className="space-y-1">
          <span className="text-[10px] font-bold tracking-[0.4em] uppercase opacity-30 ml-0.5">Every run deserves a destination</span>
          <h1 className="text-4xl sm:text-5xl font-display font-bold leading-none tracking-tight text-[var(--accent-primary)]">
            COFFEE ROUTES<span className="text-[var(--text-main)] opacity-10">/</span>
          </h1>
        </div>
        
        {profile && (
          <button 
            onClick={() => setActiveTab('profile')}
            className="flex items-center gap-4 bg-[var(--card-bg)] border border-[var(--border-color)] pl-5 pr-3 py-2.5 rounded-2xl group active:scale-95 transition-all card-shadow"
          >
            <div className="text-right hidden sm:block">
              <div className="text-xs font-bold leading-tight" style={{ color: 'var(--text-main)' }}>{profile.username}</div>
              <div className="text-[9px] uppercase tracking-widest font-black opacity-40">{profile.stats.totalDistance.toFixed(0)} KM BREWED</div>
            </div>
            <img src={profile.avatar} className="w-10 h-10 rounded-xl object-cover ring-2 ring-[var(--accent-primary)] ring-offset-2 ring-offset-[var(--bg-color)] shadow-xl" alt="User" />
          </button>
        )}
      </header>

      {/* Viewport */}
      <main className="flex-1 overflow-y-auto px-8 pb-40">
        {activeTab === 'explore' && (
          <div className="space-y-10 fade-slide-up">
            {/* Search Bar Refined */}
            <div className="relative group">
              <div className="absolute inset-0 bg-[var(--accent-primary)]/5 rounded-3xl blur-xl opacity-0 group-focus-within:opacity-100 transition-opacity" />
              <input 
                type="text"
                placeholder="Find a coffee shop path..."
                className="relative w-full bg-[var(--card-bg)] border border-[var(--border-color)] rounded-3xl py-6 pl-16 pr-6 text-[var(--text-main)] font-semibold text-lg focus:outline-none focus:ring-2 ring-[var(--accent-primary)]/30 transition-all placeholder:text-[var(--text-muted)]/40"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
              />
              <svg className="h-6 w-6 absolute left-6 top-1/2 -translate-y-1/2 opacity-30 group-focus-within:opacity-100 group-focus-within:text-[var(--accent-primary)] transition-all" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>

            {/* Featured Section */}
            {!searchQuery && (
              <section className="space-y-6">
                <div className="flex justify-between items-end px-1">
                  <h2 className="text-xs font-black uppercase tracking-[0.3em] opacity-40 font-coffee">Staff Picks</h2>
                  <span className="text-[10px] font-bold opacity-30">ROASTED RECENTLY</span>
                </div>
                <div className="flex gap-6 overflow-x-auto pb-6 -mx-8 px-8 snap-x">
                   {routes.slice(0, 3).map(route => (
                     <div 
                      key={route.id} 
                      onClick={() => setSelectedRoute(route)}
                      className="min-w-[320px] h-48 rounded-[2.5rem] bg-slate-800 relative overflow-hidden snap-center cursor-pointer group card-shadow"
                     >
                        <img src={`https://picsum.photos/seed/${route.id}/800/450`} className="absolute inset-0 w-full h-full object-cover grayscale-[0.3] group-hover:grayscale-0 group-hover:scale-110 transition-all duration-700" alt="" />
                        <div className="absolute inset-0 bg-gradient-to-t from-[var(--bg-color)] via-transparent to-transparent" />
                        <div className="absolute bottom-6 left-6">
                           <h3 className="text-2xl font-bold leading-none mb-1">{route.name}</h3>
                           <div className="text-[10px] font-black uppercase tracking-widest opacity-60">{route.distance} KM • {route.difficulty}</div>
                        </div>
                     </div>
                   ))}
                </div>
              </section>
            )}

            {/* List */}
            <section className="space-y-8">
              <div className="flex justify-between items-end px-1">
                <h2 className="text-xs font-black uppercase tracking-[0.3em] opacity-40 font-coffee">Daily Brews</h2>
                <div className="flex gap-3">
                   <div className="w-2 h-2 rounded-full bg-[var(--accent-primary)]"></div>
                   <div className="w-2 h-2 rounded-full bg-white/10"></div>
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                {filteredRoutes.map(route => (
                  <div 
                    key={route.id} 
                    onClick={() => setSelectedRoute(route)}
                    className="group relative bg-[var(--card-bg)] rounded-[3rem] border border-[var(--border-color)] overflow-hidden cursor-pointer hover:translate-y-[-6px] transition-all duration-500 card-shadow"
                  >
                    <div className="h-64 relative overflow-hidden">
                      <img 
                        src={`https://picsum.photos/seed/${route.id}/800/600`} 
                        className="w-full h-full object-cover grayscale-[0.4] group-hover:scale-110 group-hover:grayscale-0 transition-all duration-1000" 
                        alt={route.name} 
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-[var(--bg-color)]/95 via-transparent to-transparent opacity-90" />
                      
                      <div className="absolute top-6 left-6 flex flex-wrap gap-2">
                        <span className={`px-4 py-2 rounded-full text-[9px] font-black tracking-widest uppercase backdrop-blur-xl border ${
                          route.difficulty === Difficulty.HARD ? 'bg-red-500/20 border-red-500/30 text-red-400' : 
                          route.difficulty === Difficulty.MODERATE ? 'bg-amber-500/20 border-amber-500/30 text-amber-400' : 'bg-emerald-500/20 border-emerald-500/30 text-emerald-400'
                        }`}>
                          {route.difficulty}
                        </span>
                      </div>

                      <div className="absolute bottom-6 left-8 right-8 flex items-end justify-between">
                        <div className="space-y-1">
                          <h3 className="text-3xl font-bold text-white group-hover:text-[var(--accent-primary)] transition-colors tracking-tight">{route.name}</h3>
                          <div className="flex items-center gap-3 text-[10px] font-black uppercase tracking-widest text-white/40">
                            <span>{route.creatorName}</span>
                            <span className="w-1 h-1 rounded-full bg-white/10"></span>
                            <span>{route.rating} ★</span>
                          </div>
                        </div>
                        <div className="bg-[var(--accent-primary)] px-5 py-2.5 rounded-2xl text-[10px] font-black tracking-widest text-[var(--bg-color)] shadow-2xl shadow-[var(--accent-primary)]/40 uppercase">
                          {route.distance.toFixed(1)} KM
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          </div>
        )}

        {activeTab === 'runs' && (
          <div className="space-y-10 fade-slide-up">
            <div className="flex justify-between items-center">
              <h2 className="text-4xl font-display font-bold text-[var(--text-main)]">PAST BREWS</h2>
              <div className="bg-[var(--accent-primary)]/10 text-[var(--accent-primary)] px-5 py-2 rounded-full border border-[var(--accent-primary)]/20 text-[10px] font-black uppercase tracking-[0.2em]">
                {runs.length} SESSIONS
              </div>
            </div>
            
            <div className="space-y-6">
              {runs.map(run => (
                <div key={run.id} className="group bg-[var(--card-bg)] rounded-[3rem] p-8 border border-[var(--border-color)] hover:border-[var(--accent-primary)]/40 transition-all card-shadow">
                  <div className="flex justify-between items-start mb-8">
                    <div className="space-y-1">
                      <span className="text-[10px] font-black uppercase tracking-[0.3em] text-[var(--accent-primary)]">Roast Summary</span>
                      <h4 className="text-3xl font-bold text-[var(--text-main)] tracking-tight leading-none">{run.routeName}</h4>
                      <div className="text-xs font-medium opacity-40 uppercase tracking-widest pt-1">{new Date(run.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}</div>
                    </div>
                    <div className="text-right">
                      <div className="text-5xl font-display text-[var(--text-main)] leading-none">{run.distance.toFixed(2)}</div>
                      <span className="text-[10px] font-black uppercase tracking-widest opacity-30">KILOMETERS</span>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4 mb-8">
                    <div className="bg-[var(--bg-color)]/60 p-6 rounded-[2rem] border border-white/5 shadow-inner flex flex-col items-center">
                      <span className="text-[9px] uppercase font-black tracking-[0.2em] opacity-30 mb-2">Duration</span>
                      <span className="text-2xl font-display">{Math.floor(run.duration / 60)}:{(run.duration % 60).toString().padStart(2, '0')}</span>
                    </div>
                    <div className="bg-[var(--bg-color)]/60 p-6 rounded-[2rem] border border-white/5 shadow-inner flex flex-col items-center">
                      <span className="text-[9px] uppercase font-black tracking-[0.2em] opacity-30 mb-2">Pace</span>
                      <span className="text-2xl font-display text-[var(--accent-secondary)]">{run.averagePace}</span>
                    </div>
                  </div>

                  {run.coachingTips && (
                    <div className="glass bg-[var(--accent-primary)]/5 border-l-4 border-[var(--accent-primary)] p-6 rounded-r-3xl relative overflow-hidden">
                      <div className="absolute top-0 right-0 p-4 opacity-5">
                         <svg className="w-16 h-16" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-6h2v6zm0-8h-2V7h2v2z"/></svg>
                      </div>
                      <div className="flex items-center gap-3 mb-4">
                         <span className="text-[10px] font-black uppercase tracking-[0.3em] text-[var(--accent-primary)]">Barista Insights</span>
                      </div>
                      <p className="text-sm italic font-medium leading-relaxed opacity-80">{run.coachingTips}</p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'profile' && profile && (
          <div className="space-y-16 fade-slide-up max-w-xl mx-auto pb-12">
            <div className="text-center relative py-12">
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-[var(--accent-primary)] opacity-10 blur-[100px] rounded-full" />
              <div className="relative inline-block">
                <div className="w-48 h-48 rounded-[4rem] p-1.5 border-2 border-[var(--border-color)] overflow-hidden shadow-2xl mx-auto rotate-3">
                   <img src={profile.avatar} className="w-full h-full rounded-[3.8rem] object-cover -rotate-3 hover:rotate-0 transition-transform duration-500" alt="Avatar" />
                </div>
                <button className="absolute -bottom-2 -right-2 bg-[var(--accent-primary)] p-5 rounded-3xl text-[var(--bg-color)] shadow-2xl hover:scale-110 active:scale-90 transition-all card-shadow">
                  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                  </svg>
                </button>
              </div>
              <h2 className="text-5xl font-extrabold mt-10 tracking-tight leading-none">{profile.username}</h2>
              <p className="text-sm mt-4 font-semibold opacity-40 px-12 leading-relaxed">{profile.bio}</p>
            </div>

            <div className="grid grid-cols-3 gap-6">
              <div className="bg-[var(--card-bg)] p-8 rounded-[3rem] text-center border border-[var(--border-color)] card-shadow">
                <div className="text-4xl font-display mb-1 text-[var(--accent-primary)]">{profile.stats.totalDistance.toFixed(0)}</div>
                <div className="text-[9px] font-black uppercase tracking-[0.3em] opacity-30">KM TOTAL</div>
              </div>
              <div className="bg-[var(--card-bg)] p-8 rounded-[3rem] text-center border border-[var(--border-color)] card-shadow">
                <div className="text-4xl font-display mb-1 text-[var(--accent-secondary)]">{profile.stats.totalRuns}</div>
                <div className="text-[9px] font-black uppercase tracking-[0.3em] opacity-30">CUPS RUN</div>
              </div>
              <div className="bg-[var(--card-bg)] p-8 rounded-[3rem] text-center border border-[var(--border-color)] card-shadow">
                <div className="text-4xl font-display mb-1 text-orange-500">4:52</div>
                <div className="text-[9px] font-black uppercase tracking-[0.3em] opacity-30">TOP PACE</div>
              </div>
            </div>

            {/* Customization Grid */}
            <section className="space-y-8">
              <div className="px-1 space-y-1">
                <h3 className="text-xs font-black uppercase tracking-[0.4em] opacity-30">Roast Profile</h3>
                <p className="text-[10px] font-bold opacity-20">Tailor the high-performance interface.</p>
              </div>
              <div className="grid grid-cols-2 gap-6">
                {themeOptions.map(opt => (
                  <button
                    key={opt.id}
                    onClick={() => handleThemeChange(opt.id)}
                    className={`group p-8 rounded-[3rem] border transition-all text-left flex flex-col gap-6 relative overflow-hidden ${theme === opt.id ? 'border-[var(--accent-primary)] ring-4 ring-[var(--accent-primary)]/10 bg-[var(--accent-primary)]/5' : 'bg-[var(--card-bg)] border-[var(--border-color)] hover:border-[var(--accent-primary)]/30'}`}
                  >
                    <div className="flex gap-2">
                      {opt.colors.map((c, i) => (
                        <div key={i} className="w-5 h-5 rounded-full shadow-inner border border-white/10" style={{ backgroundColor: c }}></div>
                      ))}
                    </div>
                    <span className="text-sm font-black uppercase tracking-widest" style={{ color: theme === opt.id ? 'var(--accent-primary)' : 'var(--text-main)' }}>{opt.label}</span>
                    {theme === opt.id && (
                      <div className="absolute top-6 right-6 text-[var(--accent-primary)]">
                        <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                        </svg>
                      </div>
                    )}
                  </button>
                ))}
              </div>
            </section>
          </div>
        )}
      </main>

      {/* Primary Action Button */}
      {activeTab === 'explore' && !editingRoute && (
        <button 
          onClick={() => setActiveTab('create')}
          className="fixed right-10 bottom-36 w-20 h-20 rounded-[2rem] shadow-2xl z-40 btn-active flex items-center justify-center rotate-6 hover:rotate-12 transition-all group overflow-hidden bg-[var(--accent-primary)]"
        >
          <div className="absolute inset-0 bg-white/30 opacity-0 group-hover:opacity-100 transition-opacity" />
          <svg className="h-10 w-10 text-[var(--bg-color)]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={4} d="M12 4v16m8-8H4" />
          </svg>
        </button>
      )}

      {/* Navigation */}
      <BottomNav activeTab={activeTab} onTabChange={setActiveTab} />

      {/* Fullscreen Overlays */}
      {selectedRoute && (
        <RouteDetail 
          route={selectedRoute} 
          onClose={() => setSelectedRoute(null)} 
          onStart={(r) => {
            setSelectedRoute(null);
            setTrackingRoute(r);
          }}
          onEdit={handleEditRoute}
        />
      )}

      {trackingRoute && (
        <LiveTracking 
          route={trackingRoute} 
          onFinish={handleFinishRun}
          onCancel={() => setTrackingRoute(null)}
        />
      )}

      {(activeTab === 'create' || editingRoute) && (
        <RouteCreator 
          onSave={handleSaveRoute}
          onCancel={() => {
            setActiveTab('explore');
            setEditingRoute(null);
          }}
          initialRoute={editingRoute || undefined}
        />
      )}
    </div>
  );
};

export default App;