import React, { useEffect, useRef, useState } from 'react';
import { Route, Difficulty, Review, UnitSystem } from '../types';
import { AreaChart, Area, ResponsiveContainer, Tooltip } from 'recharts';
import { storageService } from '../services/storageService';
import { offlineService } from '../services/offlineService';
import { formatDistance, formatElevation } from '../services/unitUtils';

declare var L: any;

interface RouteDetailProps {
  route: Route;
  unitSystem: UnitSystem;
  onClose: () => void;
  onStart: (route: Route) => void;
  onEdit: (route: Route) => void;
}

const RouteDetail: React.FC<RouteDetailProps> = ({ route, unitSystem, onClose, onStart, onEdit }) => {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstance = useRef<any>(null);
  const [mapReady, setMapReady] = useState(false);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [isDownloaded, setIsDownloaded] = useState(false);
  const [downloadProgress, setDownloadProgress] = useState<number | null>(null);
  const [shareToast, setShareToast] = useState(false);

  useEffect(() => {
    const allReviews = storageService.getReviews();
    setReviews(allReviews.filter(r => r.routeId === route.id));
    checkOfflineStatus();
  }, [route.id]);

  const checkOfflineStatus = async () => {
    const status = await offlineService.isRouteOffline(route.id);
    setIsDownloaded(status);
  };

  const handleDownload = async () => {
    if (isDownloaded || downloadProgress !== null) return;
    setDownloadProgress(0);
    try {
      await offlineService.downloadRouteResources(route, (p) => setDownloadProgress(p));
      setIsDownloaded(true);
    } catch (e) {
      console.error("Download failed", e);
    } finally {
      setDownloadProgress(null);
    }
  };

  const handleShare = async () => {
    const shareUrl = `${window.location.origin}${window.location.pathname}?routeId=${route.id}`;
    
    if (navigator.share) {
      try {
        await navigator.share({
          title: `Run ${route.name} on The Coffee Route`,
          text: `Check out this ${route.distance}km route! ${route.description}`,
          url: shareUrl,
        });
      } catch (err) {
        console.error("Error sharing", err);
      }
    } else {
      // Fallback: Copy to clipboard
      try {
        await navigator.clipboard.writeText(shareUrl);
        setShareToast(true);
        setTimeout(() => setShareToast(false), 3000);
      } catch (err) {
        console.error("Failed to copy", err);
      }
    }
  };

  useEffect(() => {
    let timeout: number;
    
    const initMap = () => {
      if (typeof L === 'undefined') {
        timeout = window.setTimeout(initMap, 100);
        return;
      }

      if (mapRef.current && !mapInstance.current) {
        mapInstance.current = L.map(mapRef.current, {
          zoomControl: false,
          attributionControl: false,
          dragging: true,
          touchZoom: true,
          scrollWheelZoom: true,
          fadeAnimation: true
        }).setView([route.path[0].lat, route.path[0].lng], 14);

        // Custom Offline Tile Layer
        const OfflineLayer = L.TileLayer.extend({
          createTile: function(coords: any, done: any) {
            const tile = document.createElement('img');
            const key = `${coords.z}/${coords.x}/${coords.y}`;
            
            offlineService.getTile(key).then(blob => {
              if (blob) {
                const url = URL.createObjectURL(blob);
                tile.src = url;
                tile.onload = () => {
                  URL.revokeObjectURL(url);
                  done(null, tile);
                };
              } else {
                tile.src = this.getTileUrl(coords);
                tile.onload = () => done(null, tile);
                tile.onerror = () => done(new Error('Tile load error'), tile);
              }
            });
            return tile;
          }
        });

        new OfflineLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png').addTo(mapInstance.current);

        const poly = L.polyline(route.path, {
          color: '#3b82f6',
          weight: 6,
          opacity: 0.9,
          className: 'route-glow'
        }).addTo(mapInstance.current);

        mapInstance.current.fitBounds(poly.getBounds(), { padding: [40, 40] });

        window.setTimeout(() => {
          if (mapInstance.current) {
            mapInstance.current.invalidateSize();
            setMapReady(true);
          }
        }, 300);
      }
    };

    initMap();

    return () => {
      clearTimeout(timeout);
      if (mapInstance.current) {
        mapInstance.current.remove();
        mapInstance.current = null;
      }
    };
  }, [route]);

  const elevationData = Array.from({ length: 24 }, (_, i) => ({
    dist: (i * route.distance / 23).toFixed(1),
    elev: 10 + Math.random() * route.elevationGain
  }));

  const distInfo = formatDistance(route.distance, unitSystem);
  const elevInfo = formatElevation(route.elevationGain, unitSystem);

  return (
    <div className="fixed inset-0 z-[100] bg-[var(--bg-color)] flex flex-col md:max-w-2xl md:mx-auto animate-in slide-in-from-right duration-500 overflow-hidden">
      {/* Toast for Copy Feedback */}
      {shareToast && (
        <div className="fixed top-24 left-1/2 -translate-x-1/2 z-[200] bg-emerald-500 text-white px-8 py-4 rounded-3xl font-bold uppercase tracking-widest text-[10px] shadow-2xl animate-in fade-in slide-in-from-top-4">
          Route Link Copied to Clipboard
        </div>
      )}

      <div className="relative h-[45vh] shrink-0">
        <div ref={mapRef} className="w-full h-full" />
        <div className="absolute inset-0 bg-gradient-to-t from-[var(--bg-color)] via-transparent to-black/30 pointer-events-none" />
        
        <button 
          onClick={onClose}
          className="absolute top-8 left-8 glass p-4 rounded-2xl text-white z-20 active:scale-90 transition-transform"
        >
          <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M15 19l-7-7 7-7" />
          </svg>
        </button>

        <div className="absolute top-8 right-8 flex gap-3 z-20">
          <button 
            onClick={handleShare}
            className="glass p-4 rounded-2xl text-white transition-all active:scale-95 hover:bg-white/10"
          >
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
            </svg>
          </button>

          <button 
            onClick={handleDownload}
            disabled={isDownloaded || downloadProgress !== null}
            className={`glass p-4 rounded-2xl transition-all active:scale-95 ${isDownloaded ? 'text-emerald-400' : 'text-white'}`}
          >
            {downloadProgress !== null ? (
              <div className="relative w-6 h-6 flex items-center justify-center">
                <svg className="animate-spin h-6 w-6 text-[var(--accent-primary)]" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                <span className="absolute text-[8px] font-black">{downloadProgress}%</span>
              </div>
            ) : isDownloaded ? (
              <svg className="h-6 w-6" fill="currentColor" viewBox="0 0 24 24">
                 <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
              </svg>
            ) : (
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
            )}
          </button>
        </div>

        {!mapReady && (
          <div className="absolute inset-0 flex items-center justify-center bg-[var(--bg-color)]/20 backdrop-blur-sm z-[10]">
             <div className="animate-spin h-10 w-10 border-4 border-[var(--accent-primary)] border-t-transparent rounded-full"></div>
          </div>
        )}
      </div>

      <div className="px-8 pb-32 flex-1 overflow-y-auto space-y-10 -mt-12 relative z-10">
        <div className="space-y-6">
          <div className="flex justify-between items-start">
            <div className="space-y-1">
              <span className="text-[10px] font-extrabold tracking-[0.4em] uppercase opacity-40">Planned Adventure</span>
              <h2 className="text-4xl font-extrabold text-[var(--text-main)] tracking-tight leading-none">{route.name}</h2>
            </div>
            {route.creatorId === 'user_1' && (
              <button 
                onClick={() => onEdit(route)}
                className="bg-[var(--accent-primary)]/10 text-[var(--accent-primary)] text-[10px] font-bold uppercase tracking-widest px-5 py-3 rounded-2xl border border-[var(--accent-primary)]/20 hover:bg-[var(--accent-primary)]/20 transition-all"
              >
                Refine Path
              </button>
            )}
          </div>
          
          <div className="flex items-center gap-4">
             <div className={`px-4 py-2 rounded-xl text-[10px] font-extrabold uppercase tracking-widest border ${
                route.difficulty === Difficulty.HARD ? 'bg-red-500/10 border-red-500/20 text-red-400' : 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
             }`}>
                {route.difficulty} Level
             </div>
             <span className="text-xs font-semibold opacity-40">MAPPED BY {route.creatorName.toUpperCase()}</span>
          </div>

          <p className="text-lg opacity-80 leading-relaxed font-medium">
            {route.description}
          </p>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="bg-[var(--card-bg)] p-8 rounded-[2.5rem] border border-[var(--border-color)] group hover:border-[var(--accent-primary)]/30 transition-all">
            <span className="text-[10px] uppercase font-bold tracking-[0.3em] opacity-40 block mb-2">Distance</span>
            <div className="text-4xl font-display text-[var(--text-main)]">{distInfo.value} <span className="text-sm opacity-30">{distInfo.unit}</span></div>
          </div>
          <div className="bg-[var(--card-bg)] p-8 rounded-[2.5rem] border border-[var(--border-color)] group hover:border-[var(--accent-secondary)]/30 transition-all">
            <span className="text-[10px] uppercase font-bold tracking-[0.3em] opacity-40 block mb-2">Elevation</span>
            <div className="text-4xl font-display text-[var(--accent-secondary)]">+{elevInfo.value} <span className="text-sm opacity-30">{elevInfo.unit}</span></div>
          </div>
        </div>

        <div className="space-y-6">
          <div className="flex justify-between items-end px-1">
            <h3 className="text-xs font-bold uppercase tracking-[0.3em] opacity-40">Path Geometry</h3>
            <span className="text-[10px] font-bold opacity-30">Vertical Profile (Est.)</span>
          </div>
          <div className="h-40 w-full bg-[var(--card-bg)]/30 rounded-[2.5rem] p-6 border border-[var(--border-color)]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={elevationData}>
                <defs>
                  <linearGradient id="colorElev" x1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="var(--accent-secondary)" stopOpacity={0.4}/>
                    <stop offset="95%" stopColor="var(--accent-secondary)" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <Area type="monotone" dataKey="elev" stroke="var(--accent-secondary)" strokeWidth={4} fillOpacity={1} fill="url(#colorElev)" />
                <Tooltip 
                  cursor={{ stroke: 'rgba(255,255,255,0.1)', strokeWidth: 2 }}
                  contentStyle={{ backgroundColor: 'var(--bg-color)', border: '1px solid var(--border-color)', borderRadius: '16px', fontSize: '12px' }}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="space-y-8">
           <div className="flex justify-between items-end px-1">
             <h3 className="text-xs font-bold uppercase tracking-[0.4em] opacity-40 font-coffee">The Daily Grind (Reviews)</h3>
             <span className="text-[10px] font-bold opacity-30">{reviews.length} CUPS POURED</span>
           </div>
           
           {reviews.length === 0 ? (
             <div className="bg-[var(--card-bg)] p-10 rounded-[2.5rem] border border-dashed border-white/10 text-center">
               <p className="text-sm opacity-30 font-bold uppercase tracking-widest">No roasts yet. Be the first to rate this path!</p>
             </div>
           ) : (
             <div className="space-y-6">
               {reviews.map(review => (
                 <div key={review.id} className="bg-[var(--card-bg)] p-8 rounded-[2.5rem] border border-[var(--border-color)] space-y-4">
                   <div className="flex justify-between items-start">
                     <div className="flex items-center gap-3">
                       <div className="w-8 h-8 rounded-full bg-[var(--accent-primary)]/20 flex items-center justify-center text-[10px] font-bold text-[var(--accent-primary)]">
                         {review.username.charAt(0)}
                       </div>
                       <div>
                         <div className="text-sm font-bold">{review.username}</div>
                         <div className="text-[9px] font-black uppercase tracking-widest opacity-30">{new Date(review.createdAt).toLocaleDateString()}</div>
                       </div>
                     </div>
                     <div className="flex gap-1">
                       {Array.from({ length: 5 }).map((_, i) => (
                         <svg key={i} className={`w-3 h-3 ${i < review.rating ? 'text-amber-400' : 'text-white/10'}`} fill="currentColor" viewBox="0 0 20 20">
                           <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                         </svg>
                       ))}
                     </div>
                   </div>
                   <p className="text-sm opacity-70 leading-relaxed font-medium italic">"{review.comment}"</p>
                 </div>
               ))}
             </div>
           )}
        </div>

        <div className="flex flex-wrap gap-3 pb-24">
          {route.tags.map(tag => (
            <span key={tag} className="px-5 py-3 bg-[var(--card-bg)] rounded-2xl text-[10px] font-extrabold uppercase tracking-widest border border-[var(--border-color)]">
              #{tag}
            </span>
          ))}
        </div>
      </div>

      <div className="fixed bottom-0 left-0 right-0 p-8 z-50 md:max-w-2xl md:mx-auto">
        <div className="glass rounded-[2.5rem] p-4 shadow-2xl">
          <button 
            onClick={() => onStart(route)}
            className="w-full bg-[var(--accent-primary)] hover:brightness-110 text-white font-bold py-6 rounded-3xl flex items-center justify-center gap-4 active:scale-[0.98] transition-all group overflow-hidden relative shadow-2xl shadow-[var(--accent-primary)]/40"
          >
            <div className="absolute inset-0 bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity" />
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
            </svg>
            <span className="font-display text-2xl tracking-[0.1em] mt-1">START SESSION</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default RouteDetail;