
import React, { useState } from 'react';
import { storageService } from '../services/storageService';
import { UserProfile } from '../types';

interface LoginProps {
  onLogin: (user: UserProfile) => void;
}

const Login: React.FC<LoginProps> = ({ onLogin }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(true);
  const [error, setError] = useState('');
  const [mode, setMode] = useState<'login' | 'signup'>('login');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedUsername = username.trim();
    if (!trimmedUsername || !password) return;

    setIsLoading(true);
    setError('');

    try {
      if (mode === 'signup') {
        if (password.length < 6) {
          setError('Roast profile must have at least 6 characters.');
          setIsLoading(false);
          return;
        }
        if (password !== confirmPassword) {
          setError('Roast profiles do not match. Check your pour.');
          setIsLoading(false);
          return;
        }
        const user = await storageService.signup(trimmedUsername, password, rememberMe);
        if (user) {
          onLogin(user);
        } else {
          setError('This handle is already roasting. Try another?');
        }
      } else {
        const user = await storageService.login(trimmedUsername, password, rememberMe);
        if (user) {
          onLogin(user);
        } else {
          setError('Barista couldn\'t find that roast or the credentials were weak.');
        }
      }
    } catch (err) {
      setError('A brewing error occurred. Try again later.');
    } finally {
      setIsLoading(false);
    }
  };

  const recentUsers = storageService.getAllUsers().slice(0, 3);

  return (
    <div className="fixed inset-0 z-[600] bg-[var(--bg-color)] flex flex-col items-center justify-center p-8 overflow-hidden">
      {/* Dynamic Background Elements */}
      <div className="absolute top-[-10%] right-[-10%] w-[50%] h-[50%] bg-[var(--accent-primary)] opacity-5 blur-[150px] rounded-full animate-pulse"></div>
      <div className="absolute bottom-[-10%] left-[-10%] w-[50%] h-[50%] bg-[var(--accent-secondary)] opacity-5 blur-[150px] rounded-full"></div>

      <div className="max-w-md w-full space-y-10 relative z-10 text-center overflow-y-auto max-h-full py-8 no-scrollbar">
        <header className="space-y-4">
          <div className="inline-block glass p-6 rounded-[2.5rem] border-[var(--accent-primary)]/20 shadow-2xl mb-2">
             <div className="text-[var(--accent-primary)] font-display text-8xl leading-none">CR</div>
          </div>
          <h1 className="text-5xl font-display font-black tracking-tighter uppercase leading-none">
            The Coffee <br/><span className="text-[var(--accent-primary)]">Route</span>
          </h1>
          <p className="text-[10px] font-black uppercase tracking-[0.4em] opacity-40">
            Every run deserves a destination.
          </p>
        </header>

        {/* Mode Toggle Tabs */}
        <div className="flex bg-white/5 border border-white/10 p-1.5 rounded-[2rem] max-w-[300px] mx-auto">
          <button 
            onClick={() => { setMode('login'); setError(''); setPassword(''); setConfirmPassword(''); }}
            className={`flex-1 py-3 rounded-[1.5rem] text-[10px] font-black uppercase tracking-widest transition-all ${mode === 'login' ? 'bg-[var(--accent-primary)] text-[var(--bg-color)] shadow-xl' : 'text-white/30 hover:text-white/60'}`}
          >
            Check-In
          </button>
          <button 
            onClick={() => { setMode('signup'); setError(''); setPassword(''); setConfirmPassword(''); }}
            className={`flex-1 py-3 rounded-[1.5rem] text-[10px] font-black uppercase tracking-widest transition-all ${mode === 'signup' ? 'bg-[var(--accent-primary)] text-[var(--bg-color)] shadow-xl' : 'text-white/30 hover:text-white/60'}`}
          >
            New Roast
          </button>
        </div>

        {recentUsers.length > 0 && mode === 'login' && !username && (
          <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-500">
            <span className="text-[9px] font-black uppercase tracking-widest opacity-20">Recent Orders</span>
            <div className="flex justify-center gap-4">
              {recentUsers.map(user => (
                <button 
                  key={user.id}
                  onClick={() => setUsername(user.username)}
                  className="flex flex-col items-center gap-2 group active:scale-95 transition-all"
                >
                  <div className="w-14 h-14 rounded-2xl overflow-hidden ring-1 ring-white/10 group-hover:ring-[var(--accent-primary)]/50 transition-all border border-white/5 shadow-xl">
                    <img src={user.avatar} className="w-full h-full object-cover grayscale-[0.5] group-hover:grayscale-0" alt={user.username} />
                  </div>
                  <span className="text-[9px] font-bold opacity-40 group-hover:opacity-100 transition-opacity uppercase">{user.username}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-4">
            <div className="space-y-2 text-left">
              <label className="text-[10px] font-black uppercase tracking-[0.3em] opacity-30 block ml-4">Runner Handle</label>
              <div className="relative">
                <input 
                  value={username} 
                  onChange={e => {
                    setUsername(e.target.value);
                    setError('');
                  }}
                  autoFocus
                  placeholder={mode === 'signup' ? "CHOOSE A UNIQUE HANDLE" : "ENTER YOUR USERNAME"} 
                  className="w-full glass bg-white/5 border border-white/10 rounded-[2rem] px-8 py-5 text-xl font-bold text-center text-white focus:outline-none focus:ring-4 ring-[var(--accent-primary)]/10 placeholder:text-white/10 uppercase tracking-tight transition-all"
                  required
                />
              </div>
            </div>

            <div className="space-y-2 text-left">
              <label className="text-[10px] font-black uppercase tracking-[0.3em] opacity-30 block ml-4">Barista Profile (Password)</label>
              <div className="relative">
                <input 
                  type="password"
                  value={password} 
                  onChange={e => {
                    setPassword(e.target.value);
                    setError('');
                  }}
                  placeholder="SECRET BREW CODE" 
                  className="w-full glass bg-white/5 border border-white/10 rounded-[2rem] px-8 py-5 text-xl font-bold text-center text-white focus:outline-none focus:ring-4 ring-[var(--accent-primary)]/10 placeholder:text-white/10 uppercase tracking-tight transition-all"
                  required
                />
              </div>
            </div>

            {mode === 'signup' && (
              <div className="space-y-2 text-left animate-in slide-in-from-top-2 duration-300">
                <label className="text-[10px] font-black uppercase tracking-[0.3em] opacity-30 block ml-4">Confirm Brew Code</label>
                <div className="relative">
                  <input 
                    type="password"
                    value={confirmPassword} 
                    onChange={e => {
                      setConfirmPassword(e.target.value);
                      setError('');
                    }}
                    placeholder="REPEAT THE SECRET" 
                    className="w-full glass bg-white/5 border border-white/10 rounded-[2rem] px-8 py-5 text-xl font-bold text-center text-white focus:outline-none focus:ring-4 ring-[var(--accent-primary)]/10 placeholder:text-white/10 uppercase tracking-tight transition-all"
                    required
                  />
                </div>
              </div>
            )}
            
            <div className="flex items-center justify-center gap-3 pt-2">
              <button 
                type="button"
                onClick={() => setRememberMe(!rememberMe)}
                className="flex items-center gap-3 group"
              >
                <div className={`w-6 h-6 rounded-lg border-2 flex items-center justify-center transition-all ${rememberMe ? 'bg-[var(--accent-primary)] border-[var(--accent-primary)] shadow-lg shadow-[var(--accent-primary)]/20' : 'border-white/10 bg-white/5'}`}>
                  {rememberMe && (
                    <svg className="w-4 h-4 text-[var(--bg-color)]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={4} d="M5 13l4 4L19 7" />
                    </svg>
                  )}
                </div>
                <span className="text-[10px] font-black uppercase tracking-widest opacity-40 group-hover:opacity-70 transition-opacity">Stay signed in</span>
              </button>
            </div>
          </div>

          {error && <p className="text-[10px] text-red-400 font-bold uppercase tracking-widest mt-2 ml-4 animate-in fade-in slide-in-from-top-1 text-center">{error}</p>}

          <div className="space-y-4 pt-2">
            <button 
              type="submit"
              disabled={isLoading}
              className="w-full bg-[var(--accent-primary)] text-[var(--bg-color)] font-black py-7 rounded-[2.5rem] shadow-2xl shadow-[var(--accent-primary)]/30 text-xl tracking-[0.2em] uppercase active:scale-[0.98] transition-all relative overflow-hidden group disabled:opacity-50"
            >
              <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300"></div>
              <span className="relative">
                {isLoading ? 'STEEPING...' : (mode === 'signup' ? 'CREATE ACCOUNT' : 'START BREWING')}
              </span>
            </button>
          </div>
        </form>

        <footer className="pt-8">
           <p className="text-[9px] font-bold opacity-10 uppercase tracking-[0.4em]">Built for the early risers and the coffee-obsessed.</p>
        </footer>
      </div>
    </div>
  );
};

export default Login;
