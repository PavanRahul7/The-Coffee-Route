
import React, { useState, useEffect, useRef } from 'react';
import { Route, LatLng, RunHistory, UnitSystem } from '../types';
import { storageService } from '../services/storageService';
import { geminiService } from '../services/geminiService';
import { offlineService } from '../services/offlineService';
import { formatDistance, formatPace, getPaceUnit } from '../services/unitUtils';

declare var L: any;

interface LiveTrackingProps {
  route: Route;
  unitSystem: UnitSystem;
  onFinish: (run: RunHistory) => void;
  onCancel: () => void;
}

const LiveTracking: React.FC<LiveTrackingProps> = ({ route, unitSystem, onFinish, onCancel }) => {
  const [currentPos, setCurrentPos] = useState<LatLng | null>(null);
  const [actualPath, setActualPath] = useState<LatLng[]>([]);
  const [elapsedTime, setElapsedTime] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [distanceCovered, setDistanceCovered] = useState(0); // in km
  const [isOffRoute, setIsOffRoute] = useState(false);
  const [mapReady, setMapReady] = useState(false);
  const [countdown, setCountdown] = useState<number | null>(3);
  const [shareToast, setShareToast] = useState(false);
  
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstance = useRef<any>(null);
  const markerRef = useRef<any>(null);
  const actualLineRef = useRef<any>(null);
  const watchId = useRef<number | null>(null);
  const timerRef = useRef<number | null>(null);
  const lastCoords = useRef<LatLng | null>(null);

  useEffect(() => {
    if (countdown === null) return;
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(timer);
    } else {
      const timer = setTimeout(() => setCountdown(null), 1000);
      return () => clearTimeout(timer);
    }
  }, [countdown]);

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
        }).setView([route.path[0].lat, route.path[0].lng], 18);

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

        L.polyline(route.path, {
          color: '#3b82f6',
          weight: 12,
          opacity: 0.15,
          lineCap: 'round'
        }).addTo(mapInstance.current);

        actualLineRef.current = L.polyline([], {
          color: 'var(--accent-secondary)',
          weight: 8,
          opacity: 0.9,
          className: 'route-glow'
        }).addTo(mapInstance.current);

        const userIcon = L.divIcon({
          className: 'user-pos-icon',
          html: `<div style="background-color: var(--accent-primary); width: 24px; height: 24px; border-radius: 50%; border: 5px solid white; box-shadow: 0 0 30px var(--accent-primary);"></div>`,
          iconSize: [24, 24],
          iconAnchor: [12, 12]
        });

        markerRef.current = L.marker([route.path[0].lat, route.path[0].lng], { icon: userIcon, zIndexOffset: 2000 }).addTo(mapInstance.current);
        
        window.setTimeout(() => {
          if (mapInstance.current) {
            mapInstance.current.invalidateSize();
            setMapReady(true);
          }
        }, 300);
      }
    };

    initMap();

    if (countdown === null && navigator.geolocation) {
      watchId.current = navigator.geolocation.watchPosition(
        (pos) => {
          if (isPaused) return;
          const newPos = { lat: pos.coords.latitude, lng: pos.coords.longitude };
          setCurrentPos(newPos);
          
          if (lastCoords.current) {
            const dist = L.latLng(lastCoords.current.lat, lastCoords.current.lng).distanceTo(L.latLng(newPos.lat, newPos.lng));
            setDistanceCovered(prev => prev + (dist / 1000));
          }
          lastCoords.current = newPos;

          setActualPath(prev => {
            const next = [...prev, newPos];
            if (actualLineRef.current) actualLineRef.current.setLatLngs(next);
            return next;
          });
          
          if (markerRef.current) markerRef.current.setLatLng([newPos.lat, newPos.lng]);
          if (mapInstance.current) mapInstance.current.panTo([newPos.lat, newPos.lng], { animate: true });

          checkOffRoute(newPos);
        },
        (err) => console.error(err),
        { enableHighAccuracy: true, timeout: 5000, maximumAge: 0 }
      );

      timerRef.current = window.setInterval(() => {
        if (!isPaused) setElapsedTime(prev => prev + 1);
      }, 1000);
    }

    return () => {
      clearTimeout(timeout);
      if (watchId.current) navigator.geolocation.clearWatch(watchId.current);
      if (timerRef.current) clearInterval(timerRef.current);
      if (mapInstance.current) {
        mapInstance.current.remove();
        mapInstance.current = null;
      }
    };
  }, [route, isPaused, countdown]);

  const checkOffRoute = (pos: LatLng) => {
    if (!L || !pos) return;
    const lPos = L.latLng(pos.lat, pos.lng);
    let minDistance = Infinity;
    
    route.path.forEach(p => {
      const dist = lPos.distanceTo(L.latLng(p.lat, p.lng));
      if (dist < minDistance) minDistance = dist;
    });

    const off = minDistance > 50; 
    if (off && !isOffRoute) {
      if (navigator.vibrate) navigator.vibrate([200, 100, 200]);
    }
    setIsOffRoute(off);
  };

  const handleShareLive = async () => {
    const shareUrl = `${window.location.origin}${window.location.pathname}?routeId=${route.id}&live=true`;
    const message = `I'm currently running "${route.name}"! Track my route on The Coffee Route: ${shareUrl}`;
    
    if (navigator.share) {
      try {
        await navigator.share({
          title: `Live Tracking: ${route.name}`,
          text: message,
          url: shareUrl,
        });
      } catch (err) { console.error("Error sharing", err); }
    } else {
      try {
        await navigator.clipboard.writeText(shareUrl);
        setShareToast(true);
        setTimeout(() => setShareToast(false), 3000);
      } catch (err) { console.error("Failed to copy", err); }
    }
  };

  const formatTime = (seconds: number) => {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return hrs > 0 
      ? `${hrs}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
      : `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const getCurrentPaceMinKm = () => {
    if (distanceCovered === 0) return "0:00";
    const mins = elapsedTime / 60;
    const pace = mins / distanceCovered;
    const pMins = Math.floor(pace);
    const pSecs = Math.round((pace - pMins) * 60);
    return `${pMins}:${pSecs.toString().padStart(2, '0')}`;
  };

  const handleStop = async () => {
    const paceMinKm = getCurrentPaceMinKm();
    const run: RunHistory = {
      id: Math.random().toString(36).substr(2, 9),
      routeId: route.id,
      routeName: route.name,
      date: Date.now(),
      duration: elapsedTime,
      distance: parseFloat(distanceCovered.toFixed(2)),
      averagePace: paceMinKm,
      actualPath: actualPath,
    };
    
    const tips = await geminiService.getCoachingTips(run);
    run.coachingTips = tips;
    
    storageService.saveRun(run);
    onFinish(run);
  };

  const progress = Math.min((distanceCovered / route.distance) * 100, 100);
  const distInfo = formatDistance(distanceCovered, unitSystem);
  const paceInfo = formatPace(getCurrentPaceMinKm(), unitSystem);

  return (
    <div className="fixed inset-0 z-[200] bg-slate-950 flex flex-col animate-in fade-in duration-700 overflow-hidden">
      {countdown !== null && (
        <div className="absolute inset-0 z-[3000] bg-slate-950/80 backdrop-blur-2xl flex flex-col items-center justify-center">
           <span className="text-[10px] font-black uppercase tracking-[0.5em] opacity-40 mb-8">Get Ready</span>
           <div className="text-[12rem] font-display font-black leading-none animate-countdown text-[var(--accent-primary)]">
             {countdown === 0 ? 'GO' : countdown}
           </div>
           <div className="mt-12 text-center space-y-2">
              <div className="text-xl font-bold tracking-tight">{route.name}</div>
              <div className="text-[10px] font-black uppercase tracking-widest opacity-30">{formatDistance(route.distance, unitSystem).value} {formatDistance(route.distance, unitSystem).unit} Target</div>
           </div>
        </div>
      )}

      {shareToast && (
        <div className="fixed top-24 left-1/2 -translate-x-1/2 z-[3001] bg-emerald-500 text-white px-8 py-4 rounded-3xl font-bold uppercase tracking-widest text-[10px] shadow-2xl">
          Live Link Copied
        </div>
      )}

      <div className="flex-1 bg-slate-900 relative">
        <div ref={mapRef} className="w-full h-full" />
        <div className="absolute inset-0 bg-gradient-to-b from-[var(--bg-color)]/60 via-transparent to-[var(--bg-color)]/80 pointer-events-none" />

        {/* Floating Share Button */}
        <button 
          onClick={handleShareLive}
          className="absolute top-16 right-8 z-[1006] glass p-5 rounded-3xl text-white shadow-2xl active:scale-90 transition-all border border-white/10 group"
        >
          <svg className="h-6 w-6 group-hover:text-[var(--accent-primary)] transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
          </svg>
          <span className="absolute top-full mt-2 right-0 bg-[var(--card-bg)] px-3 py-1 rounded-lg text-[8px] font-black uppercase tracking-widest opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">Share Live</span>
        </button>

        {isOffRoute && (
          <div className="absolute top-16 left-8 right-8 z-[1005]">
            <div className="bg-red-600 shadow-2xl shadow-red-900/40 text-white p-6 rounded-[2rem] flex items-center justify-between border border-white/20">
              <div className="flex items-center gap-4">
                <div className="animate-pulse bg-white/20 p-2 rounded-xl">
                  <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                </div>
                <div>
                   <div className="text-[10px] font-black uppercase tracking-widest opacity-70">Navigation Error</div>
                   <div className="text-lg font-bold leading-none">Off Path Warning</div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="bg-[var(--glass-bg)] backdrop-blur-3xl border-t border-[var(--border-color)] px-10 pt-12 pb-16 space-y-12 relative z-[1010]">
        <div className="absolute -top-1 left-0 right-0 h-1.5 bg-white/5">
           <div 
            className="h-full bg-[var(--accent-primary)] shadow-[0_0_20px_var(--accent-primary)] transition-all duration-1000"
            style={{ width: `${progress}%` }}
           />
        </div>

        <div className="flex justify-between items-end">
          <div className="space-y-2">
            <span className="text-[10px] font-black uppercase tracking-[0.4em] opacity-40 font-display">{distInfo.unit}S</span>
            <div className="text-8xl font-display font-black text-white tracking-tighter leading-none">
              {distInfo.value}
            </div>
          </div>
          <div className="text-right space-y-2">
            <span className="text-[10px] font-black uppercase tracking-[0.4em] opacity-40 font-display">Timer</span>
            <div className="text-6xl font-display text-[var(--accent-primary)] leading-none">{formatTime(elapsedTime)}</div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-6">
          <div className="bg-white/5 p-8 rounded-[2.5rem] border border-white/5 flex flex-col items-center">
            <span className="text-[10px] uppercase font-black tracking-widest opacity-40 mb-2">Pace ({getPaceUnit(unitSystem)})</span>
            <div className="text-4xl font-display text-[var(--accent-secondary)]">{paceInfo}</div>
          </div>
          <div className="bg-white/5 p-8 rounded-[2.5rem] border border-white/5 flex flex-col items-center">
            <span className="text-[10px] uppercase font-black tracking-widest opacity-40 mb-2">Completion</span>
            <div className="text-4xl font-display text-white">{Math.round(progress)}%</div>
          </div>
        </div>

        <div className="flex gap-6">
          <button 
            onClick={() => setIsPaused(!isPaused)}
            className={`flex-1 py-10 rounded-[2.5rem] font-display font-black text-xl tracking-widest transition-all active:scale-95 border-2 ${
              isPaused 
                ? 'bg-emerald-600 border-emerald-500 text-white shadow-2xl shadow-emerald-500/30' 
                : 'bg-white/5 border-white/10 text-white/50'
            }`}
          >
            {isPaused ? 'RESUME' : 'PAUSE'}
          </button>
          <button 
            onClick={handleStop}
            className="flex-1 bg-red-600 hover:bg-red-500 text-white py-10 rounded-[2.5rem] font-display font-black text-xl tracking-widest shadow-2xl shadow-red-900/30 active:scale-95 border-2 border-red-500"
          >
            FINISH
          </button>
        </div>
      </div>
    </div>
  );
};

export default LiveTracking;
