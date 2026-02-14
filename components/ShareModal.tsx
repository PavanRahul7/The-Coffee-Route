
import React, { useRef } from 'react';
import { Route, RunHistory, UnitSystem } from '../types';
import { formatDistance, formatPace } from '../services/unitUtils';

interface ShareModalProps {
  item: Route | RunHistory;
  type: 'route' | 'run';
  unitSystem: UnitSystem;
  onClose: () => void;
}

const ShareModal: React.FC<ShareModalProps> = ({ item, type, unitSystem, onClose }) => {
  const cardRef = useRef<HTMLDivElement>(null);
  const isRoute = type === 'route';
  const routeItem = item as Route;
  const runItem = item as RunHistory;

  const title = isRoute ? routeItem.name : runItem.routeName;
  const dist = isRoute ? routeItem.distance : runItem.distance;
  const distInfo = formatDistance(dist, unitSystem);
  
  const shareUrl = `${window.location.origin}${window.location.pathname}?routeId=${isRoute ? routeItem.id : runItem.routeId}`;
  const shareText = isRoute 
    ? `Check out this ${distInfo.value}${distInfo.unit} route on The Coffee Route! ☕️🏃‍♂️`
    : `Just brewed a ${distInfo.value}${distInfo.unit} run! Average pace: ${formatPace(runItem.averagePace, unitSystem)}. ☕️🏃‍♂️`;

  const platforms = [
    {
      name: 'X / Twitter',
      icon: <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>,
      color: 'bg-black',
      url: `https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}&url=${encodeURIComponent(shareUrl)}`
    },
    {
      name: 'WhatsApp',
      icon: <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L0 24l6.335-1.662c1.72.94 3.659 1.437 5.634 1.437h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>,
      color: 'bg-emerald-500',
      url: `https://api.whatsapp.com/send?text=${encodeURIComponent(shareText + ' ' + shareUrl)}`
    },
    {
      name: 'Facebook',
      icon: <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg>,
      color: 'bg-blue-600',
      url: `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}`
    }
  ];

  const handleNativeShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: title,
          text: shareText,
          url: shareUrl,
        });
      } catch (err) {
        console.error("Error sharing", err);
      }
    }
  };

  return (
    <div className="fixed inset-0 z-[1000] bg-black/90 backdrop-blur-2xl flex items-center justify-center p-6 animate-in fade-in duration-300">
      <div className="w-full max-w-lg space-y-8">
        <div className="flex justify-between items-center">
          <h2 className="text-2xl font-display font-bold uppercase tracking-tight text-white">Share your brew</h2>
          <button onClick={onClose} className="p-2 text-white/40 hover:text-white transition-colors">
            <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>

        {/* Visual Preview Card */}
        <div ref={cardRef} className="relative aspect-[4/5] w-full bg-[var(--card-bg)] rounded-[3rem] border border-[var(--border-color)] overflow-hidden shadow-2xl flex flex-col p-8 group">
          <div className="absolute inset-0 bg-gradient-to-br from-[var(--accent-primary)]/10 to-transparent pointer-events-none" />
          
          <div className="flex justify-between items-start relative z-10 mb-8">
            <div className="glass p-3 rounded-2xl border-[var(--accent-primary)]/20 shadow-xl">
              <img src="https://i.imgur.com/vH0G00M.png" className="w-12 h-12 object-contain" alt="Logo" />
            </div>
            <div className="text-right">
              <div className="text-[10px] font-black uppercase tracking-widest text-[var(--accent-primary)] mb-1">THE COFFEE ROUTE</div>
              <div className="text-xs font-bold opacity-40 uppercase tracking-widest">{new Date().toLocaleDateString()}</div>
            </div>
          </div>

          <div className="flex-1 flex flex-col justify-center relative z-10 space-y-4">
            <h3 className="text-4xl font-display font-bold leading-tight tracking-tight uppercase text-white break-words">{title}</h3>
            <div className="flex items-center gap-4">
               <div className="bg-[var(--accent-primary)]/20 px-4 py-1.5 rounded-full border border-[var(--accent-primary)]/30">
                  <span className="text-[10px] font-black uppercase tracking-widest text-[var(--accent-primary)]">
                    {isRoute ? routeItem.difficulty : 'COMPLETED RUN'}
                  </span>
               </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 relative z-10">
            <div className="bg-white/5 p-6 rounded-[2rem] border border-white/5">
              <div className="text-[9px] font-black uppercase tracking-widest opacity-30 mb-1">Distance</div>
              <div className="text-3xl font-display text-white">{distInfo.value} <span className="text-sm opacity-30">{distInfo.unit}</span></div>
            </div>
            <div className="bg-white/5 p-6 rounded-[2rem] border border-white/5">
              <div className="text-[9px] font-black uppercase tracking-widest opacity-30 mb-1">{isRoute ? 'Elevation' : 'Pace'}</div>
              <div className="text-3xl font-display text-[var(--accent-secondary)]">
                {isRoute ? `+${routeItem.elevationGain}m` : formatPace(runItem.averagePace, unitSystem)}
              </div>
            </div>
          </div>

          <div className="mt-8 pt-8 border-t border-white/5 relative z-10 text-center">
             <p className="text-[9px] font-bold opacity-20 uppercase tracking-[0.4em]">Every run deserves a destination.</p>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-4">
          {platforms.map(p => (
            <a 
              key={p.name}
              href={p.url}
              target="_blank"
              rel="noopener noreferrer"
              className={`flex flex-col items-center gap-3 p-5 rounded-3xl ${p.color} text-white shadow-xl hover:scale-105 active:scale-95 transition-all`}
            >
              {p.icon}
              <span className="text-[9px] font-bold uppercase tracking-widest">{p.name}</span>
            </a>
          ))}
        </div>

        <button 
          onClick={handleNativeShare}
          className="w-full bg-white/10 hover:bg-white/20 text-white py-6 rounded-3xl font-black uppercase tracking-[0.2em] text-sm transition-all flex items-center justify-center gap-4"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" /></svg>
          System Share
        </button>
      </div>
    </div>
  );
};

export default ShareModal;
