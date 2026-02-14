
import React, { useEffect, useRef, useState } from 'react';
// Added Difficulty to imports to fix the error in line 118
import { Route, Difficulty } from '../types';
import { AreaChart, Area, ResponsiveContainer, Tooltip } from 'recharts';

declare var L: any;

interface RouteDetailProps {
  route: Route;
  onClose: () => void;
  onStart: (route: Route) => void;
  onEdit: (route: Route) => void;
}

const RouteDetail: React.FC<RouteDetailProps> = ({ route, onClose, onStart, onEdit }) => {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstance = useRef<any>(null);
  const [mapReady, setMapReady] = useState(false);

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

        L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png').addTo(mapInstance.current);

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

  return (
    <div className="fixed inset-0 z-[100] bg-[var(--bg-color)] flex flex-col md:max-w-2xl md:mx-auto animate-in slide-in-from-right duration-500 overflow-hidden">
      {/* Immersive Header Map */}
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

        {!mapReady && (
          <div className="absolute inset-0 flex items-center justify-center bg-[var(--bg-color)]/20 backdrop-blur-sm z-[10]">
             <div className="animate-spin h-10 w-10 border-4 border-[var(--accent-primary)] border-t-transparent rounded-full"></div>
          </div>
        )}
      </div>

      {/* Info Body */}
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

        {/* Stats Grid */}
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-[var(--card-bg)] p-8 rounded-[2.5rem] border border-[var(--border-color)] group hover:border-[var(--accent-primary)]/30 transition-all">
            <span className="text-[10px] uppercase font-bold tracking-[0.3em] opacity-40 block mb-2">Distance</span>
            <div className="text-4xl font-display text-[var(--text-main)]">{route.distance.toFixed(2)} <span className="text-sm opacity-30">KM</span></div>
          </div>
          <div className="bg-[var(--card-bg)] p-8 rounded-[2.5rem] border border-[var(--border-color)] group hover:border-[var(--accent-secondary)]/30 transition-all">
            <span className="text-[10px] uppercase font-bold tracking-[0.3em] opacity-40 block mb-2">Elevation</span>
            <div className="text-4xl font-display text-[var(--accent-secondary)]">+{route.elevationGain} <span className="text-sm opacity-30">M</span></div>
          </div>
        </div>

        {/* Chart */}
        <div className="space-y-6">
          <div className="flex justify-between items-end px-1">
            <h3 className="text-xs font-bold uppercase tracking-[0.3em] opacity-40">Path Geometry</h3>
            <span className="text-[10px] font-bold opacity-30">Vertical Profile (Est.)</span>
          </div>
          <div className="h-40 w-full bg-[var(--card-bg)]/30 rounded-[2.5rem] p-6 border border-[var(--border-color)]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={elevationData}>
                <defs>
                  <linearGradient id="colorElev" x1="0" y1="0" x2="0" y2="1">
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

        {/* Tags */}
        <div className="flex flex-wrap gap-3 pb-12">
          {route.tags.map(tag => (
            <span key={tag} className="px-5 py-3 bg-[var(--card-bg)] rounded-2xl text-[10px] font-extrabold uppercase tracking-widest border border-[var(--border-color)]">
              #{tag}
            </span>
          ))}
        </div>
      </div>

      {/* Floating Action Bar */}
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
