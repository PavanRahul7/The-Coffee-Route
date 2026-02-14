
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
  onToggleFollow: (userId: string) => void;
  isFollowingCreator: boolean;
  currentUserId: string;
  onOpenShare?: () => void;
}

const RouteDetail: React.FC<RouteDetailProps> = ({ 
  route, unitSystem, onClose, onStart, onEdit, onToggleFollow, isFollowingCreator, currentUserId, onOpenShare
}) => {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstance = useRef<any>(null);
  const [mapReady, setMapReady] = useState(false);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [isDownloaded, setIsDownloaded] = useState(false);
  const [downloadProgress, setDownloadProgress] = useState<number | null>(null);

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
          attributionControl: false
        }).setView([route.path[0].lat, route.path[0].lng], 14);

        L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png').addTo(mapInstance.current);

        const poly = L.polyline(route.path, {
          color: '#3b82f6',
          weight: 6,
          opacity: 0.9,
          className: 'route-glow'
        }).addTo(mapInstance.current);

        mapInstance.current.fitBounds(poly.getBounds(), { padding: [40, 40] });
        setMapReady(true);
      }
    };
    initMap();
    return () => {
      clearTimeout(timeout);
      if (mapInstance.current) { mapInstance.current.remove(); mapInstance.current = null; }
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
      <div className="relative h-[40vh] shrink-0">
        <div ref={mapRef} className="w-full h-full" />
        <div className="absolute inset-0 bg-gradient-to-t from-[var(--bg-color)] via-transparent to-black/30 pointer-events-none" />
        
        <button onClick={onClose} className="absolute top-8 left-8 glass p-4 rounded-2xl text-white z-20">
          <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M15 19l-7-7 7-7" /></svg>
        </button>

        <div className="absolute top-8 right-8 flex gap-3 z-20">
          <button onClick={onOpenShare} className="glass p-4 rounded-2xl text-white">
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" /></svg>
          </button>
          <button onClick={handleDownload} className={`glass p-4 rounded-2xl transition-all ${isDownloaded ? 'text-emerald-400' : 'text-white'}`}>
             <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
          </button>
        </div>
      </div>

      <div className="px-8 pb-32 flex-1 overflow-y-auto space-y-10 -mt-12 relative z-10">
        <div className="space-y-6">
          <div className="flex justify-between items-start">
            <div className="space-y-1">
              <span className="text-[10px] font-extrabold tracking-[0.4em] uppercase opacity-40">Destination Path</span>
              <h2 className="text-4xl font-extrabold text-[var(--text-main)] tracking-tight leading-none">{route.name}</h2>
              <div className="flex items-center gap-4 pt-2">
                <span className="text-xs font-semibold opacity-40 uppercase tracking-widest">BY {route.creatorName}</span>
                {route.creatorId !== currentUserId && (
                  <button 
                    onClick={() => onToggleFollow(route.creatorId)}
                    className={`px-4 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest transition-all ${isFollowingCreator ? 'bg-white/5 text-white/40' : 'bg-[var(--accent-primary)] text-[var(--bg-color)]'}`}
                  >
                    {isFollowingCreator ? 'FOLLOWING' : 'FOLLOW'}
                  </button>
                )}
              </div>
            </div>
            {route.creatorId === currentUserId && (
              <button onClick={() => onEdit(route)} className="bg-[var(--accent-primary)]/10 text-[var(--accent-primary)] text-[10px] font-bold uppercase tracking-widest px-5 py-3 rounded-2xl border border-[var(--accent-primary)]/20">EDIT</button>
            )}
          </div>
          <p className="text-lg opacity-80 leading-relaxed font-medium">{route.description}</p>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="bg-[var(--card-bg)] p-8 rounded-[2.5rem] border border-[var(--border-color)]">
            <span className="text-[10px] uppercase font-bold tracking-[0.3em] opacity-40 block mb-2">Distance</span>
            <div className="text-4xl font-display text-[var(--text-main)]">{distInfo.value} <span className="text-sm opacity-30">{distInfo.unit}</span></div>
          </div>
          <div className="bg-[var(--card-bg)] p-8 rounded-[2.5rem] border border-[var(--border-color)]">
            <span className="text-[10px] uppercase font-bold tracking-[0.3em] opacity-40 block mb-2">Elevation</span>
            <div className="text-4xl font-display text-[var(--accent-secondary)]">+{elevInfo.value} <span className="text-sm opacity-30">{elevInfo.unit}</span></div>
          </div>
        </div>

        <div className="space-y-6">
          <h3 className="text-xs font-bold uppercase tracking-[0.3em] opacity-40">Path Geometry</h3>
          <div className="h-40 w-full bg-[var(--card-bg)]/30 rounded-[2.5rem] p-6 border border-[var(--border-color)]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={elevationData}>
                <Area type="monotone" dataKey="elev" stroke="var(--accent-secondary)" strokeWidth={4} fill="var(--accent-secondary)" fillOpacity={0.1} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div className="fixed bottom-0 left-0 right-0 p-8 z-50 md:max-w-2xl md:mx-auto">
        <button onClick={() => onStart(route)} className="w-full bg-[var(--accent-primary)] text-white font-bold py-6 rounded-3xl flex items-center justify-center gap-4 shadow-2xl shadow-[var(--accent-primary)]/40 active:scale-95 transition-all">
          <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" /></svg>
          <span className="font-display text-2xl tracking-[0.1em] mt-1">START SESSION</span>
        </button>
      </div>
    </div>
  );
};

export default RouteDetail;
