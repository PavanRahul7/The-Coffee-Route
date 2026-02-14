
import React, { useState, useEffect, useRef } from 'react';
import { LatLng, Route, Difficulty, UnitSystem } from '../types';
import { geminiService } from '../services/geminiService';
import { formatDistance, formatElevation } from '../services/unitUtils';
import { AreaChart, Area, ResponsiveContainer } from 'recharts';

declare var L: any;

interface RouteSegment {
  id: string;
  clickPoint: LatLng;
  pathPoints: LatLng[];
  isWaypoint?: boolean;
}

interface RouteCreatorProps {
  unitSystem: UnitSystem;
  onSave: (route: Route) => void;
  onCancel: () => void;
  initialRoute?: Route;
}

const RouteCreator: React.FC<RouteCreatorProps> = ({ unitSystem, onSave, onCancel, initialRoute }) => {
  const [segments, setSegments] = useState<RouteSegment[]>([]);
  const [isSnapEnabled, setIsSnapEnabled] = useState(true);
  const [name, setName] = useState(initialRoute?.name || '');
  const [description, setDescription] = useState(initialRoute?.description || '');
  const [difficulty, setDifficulty] = useState<Difficulty>(initialRoute?.difficulty || Difficulty.EASY);
  const [tags, setTags] = useState<string[]>(initialRoute?.tags || []);
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [detectedRegion, setDetectedRegion] = useState<string | null>(null);
  const [distance, setDistance] = useState(initialRoute?.distance || 0);
  
  const [isSaving, setIsSaving] = useState(false);
  const [isSnapping, setIsSnapping] = useState(false);
  const [contextMenu, setContextMenu] = useState<{ x: number, y: number, latlng: LatLng } | null>(null);
  const [showInstructions, setShowInstructions] = useState(true);
  
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstance = useRef<any>(null);
  const polylineRef = useRef<any>(null);
  const markersRef = useRef<Map<string, any>>(new Map());

  // Derived data
  const allPoints = segments.reduce((acc, seg) => [...acc, ...seg.pathPoints], [] as LatLng[]);
  const liveElevationData = allPoints.map((p, i) => ({
    dist: i,
    elev: 10 + (Math.sin(i / 5) * 5) + (Math.random() * 2) // Mock elevation for live feedback
  }));

  useEffect(() => {
    let timeout: number;
    const accentColor = getComputedStyle(document.documentElement).getPropertyValue('--accent-primary').trim() || '#3b82f6';
    
    const initMap = () => {
      if (typeof L === 'undefined') {
        timeout = window.setTimeout(initMap, 100);
        return;
      }

      if (mapRef.current && !mapInstance.current) {
        const center = initialRoute?.path?.[0] || { lat: 37.7749, lng: -122.4194 };
        
        mapInstance.current = L.map(mapRef.current, {
          zoomControl: false,
          attributionControl: false,
          tap: false // Prevent ghost clicks on mobile
        }).setView([center.lat, center.lng], 15);

        L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png').addTo(mapInstance.current);

        polylineRef.current = L.polyline([], {
          color: accentColor,
          weight: 6,
          opacity: 0.9,
          className: 'route-glow',
          lineJoin: 'round'
        }).addTo(mapInstance.current);

        mapInstance.current.on('click', (e: any) => {
          if (contextMenu) {
            setContextMenu(null);
          } else {
            handleAddPoint(e.latlng);
          }
        });

        mapInstance.current.on('contextmenu', (e: any) => {
          const point = mapInstance.current.latLngToContainerPoint(e.latlng);
          setContextMenu({ x: point.x, y: point.y, latlng: e.latlng });
        });

        if (initialRoute?.path) {
          const seg: RouteSegment = {
            id: 'initial',
            clickPoint: initialRoute.path[initialRoute.path.length - 1],
            pathPoints: initialRoute.path
          };
          setSegments([seg]);
          rebuildMapFromSegments([seg]);
        }

        window.setTimeout(() => {
          if (mapInstance.current) mapInstance.current.invalidateSize();
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
  }, []);

  const fetchRouteSegment = async (start: LatLng, end: LatLng): Promise<LatLng[]> => {
    if (!isSnapEnabled) return [start, end];
    try {
      const url = `https://router.project-osrm.org/route/v1/walking/${start.lng},${start.lat};${end.lng},${end.lat}?overview=full&geometries=geojson`;
      const response = await fetch(url);
      const data = await response.json();
      if (data.code === 'Ok') {
        return data.routes[0].geometry.coordinates.map((coord: any) => ({
          lat: coord[1],
          lng: coord[0]
        }));
      }
    } catch (err) { console.error(err); }
    return [start, end];
  };

  const rebuildMapFromSegments = (currentSegments: RouteSegment[]) => {
    if (!mapInstance.current) return;

    // 1. Update Polyline
    const flatPoints = currentSegments.reduce((acc, seg) => [...acc, ...seg.pathPoints], [] as LatLng[]);
    polylineRef.current.setLatLngs(flatPoints);
    
    // 2. Clear old markers that are no longer in segments
    const currentIds = new Set(currentSegments.map(s => s.id));
    markersRef.current.forEach((marker, id) => {
      if (!currentIds.has(id)) {
        marker.remove();
        markersRef.current.delete(id);
      }
    });

    // 3. Update/Create markers
    currentSegments.forEach((seg, idx) => {
      let marker = markersRef.current.get(seg.id);
      const isStart = idx === 0;
      const isEnd = idx === currentSegments.length - 1;
      
      const accentSec = getComputedStyle(document.documentElement).getPropertyValue('--accent-secondary').trim() || '#10b981';
      const accentPri = getComputedStyle(document.documentElement).getPropertyValue('--accent-primary').trim() || '#3b82f6';
      const color = isStart ? accentSec : (isEnd ? accentPri : '#ffffff');
      const size = (isStart || isEnd) ? 20 : 12;

      const icon = L.divIcon({
        className: 'custom-div-icon',
        html: `<div style="background-color: ${color}; width: ${size}px; height: ${size}px; border-radius: 50%; border: 3px solid white; box-shadow: 0 0 15px ${color}80; ${isEnd ? 'animation: pulse 2s infinite;' : ''}"></div>`,
        iconSize: [size, size],
        iconAnchor: [size/2, size/2]
      });

      if (!marker) {
        marker = L.marker([seg.clickPoint.lat, seg.clickPoint.lng], { 
          icon, 
          draggable: true,
          zIndexOffset: isEnd ? 1000 : 500
        }).addTo(mapInstance.current);

        marker.on('dragend', (e: any) => handleMarkerDrag(seg.id, e.target.getLatLng()));
        markersRef.current.set(seg.id, marker);
      } else {
        marker.setLatLng([seg.clickPoint.lat, seg.clickPoint.lng]);
        marker.setIcon(icon);
      }
    });

    // 4. Distance
    calculateDistance(flatPoints);
  };

  const handleMarkerDrag = async (id: string, newLatLng: LatLng) => {
    setIsSnapping(true);
    const index = segments.findIndex(s => s.id === id);
    if (index === -1) return;

    const updatedSegments = [...segments];
    const target = { ...updatedSegments[index] };
    target.clickPoint = { lat: newLatLng.lat, lng: newLatLng.lng };

    // If it's the start, we just update its path (usually just itself)
    if (index === 0) {
      target.pathPoints = [target.clickPoint];
      updatedSegments[0] = target;
      // Also need to re-snap the segment *following* it
      if (updatedSegments.length > 1) {
        const next = { ...updatedSegments[1] };
        next.pathPoints = await fetchRouteSegment(target.clickPoint, next.clickPoint);
        updatedSegments[1] = next;
      }
    } else {
      // Re-snap from previous point to this new point
      const prev = updatedSegments[index - 1];
      target.pathPoints = await fetchRouteSegment(prev.clickPoint, target.clickPoint);
      updatedSegments[index] = target;

      // If there's a next segment, re-snap from this point to the next point
      if (index < updatedSegments.length - 1) {
        const next = { ...updatedSegments[index + 1] };
        next.pathPoints = await fetchRouteSegment(target.clickPoint, next.clickPoint);
        updatedSegments[index + 1] = next;
      }
    }

    setSegments(updatedSegments);
    rebuildMapFromSegments(updatedSegments);
    setIsSnapping(false);
  };

  const handleAddPoint = async (latlng: LatLng, isWaypoint: boolean = true) => {
    setContextMenu(null);
    setShowInstructions(false);
    setIsSnapping(true);
    
    const newId = Math.random().toString(36).substr(2, 9);
    const newClickPoint = { lat: latlng.lat, lng: latlng.lng };

    if (segments.length > 0) {
      const last = segments[segments.length - 1];
      const snapped = await fetchRouteSegment(last.clickPoint, newClickPoint);
      const newSeg: RouteSegment = { id: newId, clickPoint: newClickPoint, pathPoints: snapped, isWaypoint };
      const next = [...segments, newSeg];
      setSegments(next);
      rebuildMapFromSegments(next);
    } else {
      const firstSeg: RouteSegment = { id: newId, clickPoint: newClickPoint, pathPoints: [newClickPoint], isWaypoint: true };
      const next = [firstSeg];
      setSegments(next);
      rebuildMapFromSegments(next);
    }
    setIsSnapping(false);
  };

  const handleAutoLoop = async () => {
    if (segments.length < 2) return;
    const start = segments[0];
    handleAddPoint(start.clickPoint);
  };

  const calculateDistance = (p: LatLng[]) => {
    if (p.length < 2) { setDistance(0); return; }
    let total = 0;
    for (let i = 0; i < p.length - 1; i++) {
      total += L.latLng(p[i].lat, p[i].lng).distanceTo(L.latLng(p[i+1].lat, p[i+1].lng));
    }
    setDistance(total / 1000);
  };

  const handleLocationSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim() || !mapInstance.current) return;
    setIsSearching(true);
    const coords = await geminiService.geocodeLocation(searchQuery);
    if (coords) {
      mapInstance.current.setView([coords.lat, coords.lng], 15, { animate: true });
      const region = await geminiService.reverseGeocode(coords.lat, coords.lng);
      setDetectedRegion(region);
    }
    setIsSearching(false);
  };

  const handleSave = async () => {
    if (!name || distance === 0) return;
    setIsSaving(true);
    let finalDescription = description;
    if (!finalDescription) {
      finalDescription = await geminiService.generateRouteDescription(name, parseFloat(distance.toFixed(1)), Math.round(distance * 15), tags);
    }
    const newRoute: Route = {
      id: initialRoute?.id || Math.random().toString(36).substr(2, 9),
      name,
      description: finalDescription,
      creatorId: 'user_1',
      creatorName: 'RunnerOne',
      path: allPoints,
      distance: parseFloat(distance.toFixed(2)),
      elevationGain: Math.round(distance * 15),
      difficulty,
      tags,
      createdAt: initialRoute?.createdAt || Date.now(),
      rating: initialRoute?.rating || 4.5
    };
    onSave(newRoute);
    setIsSaving(false);
  };

  const distInfo = formatDistance(distance, unitSystem);
  const elevInfo = formatElevation(distance * 15, unitSystem);

  return (
    <div className="fixed inset-0 z-[110] bg-[var(--bg-color)] flex flex-col overflow-hidden animate-in fade-in transition-colors duration-500">
      <style>{`
        @keyframes pulse {
          0% { transform: scale(1); opacity: 1; box-shadow: 0 0 0 0 rgba(59, 130, 246, 0.7); }
          70% { transform: scale(1.1); opacity: 1; box-shadow: 0 0 0 10px rgba(59, 130, 246, 0); }
          100% { transform: scale(1); opacity: 1; box-shadow: 0 0 0 0 rgba(59, 130, 246, 0); }
        }
      `}</style>

      <div className="relative flex-1 bg-slate-900">
        <div ref={mapRef} className="w-full h-full" />
        
        {/* HUD Overlay Instructions */}
        {showInstructions && (
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-[1001] pointer-events-none text-center space-y-4 animate-in fade-in zoom-in duration-700">
            <div className="glass px-8 py-6 rounded-[2.5rem] border-white/10 shadow-2xl">
              <p className="text-xl font-bold tracking-tight text-white mb-2">Build your path</p>
              <p className="text-[10px] font-black uppercase tracking-widest opacity-40">Tap the map to add points • Drag to adjust</p>
            </div>
          </div>
        )}

        {/* Context Menu */}
        {contextMenu && (
          <div 
            className="absolute z-[2000] bg-white rounded-[1.5rem] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-150 py-2 border border-black/5"
            style={{ 
              left: `${Math.min(contextMenu.x, window.innerWidth - 220)}px`, 
              top: `${Math.min(contextMenu.y, window.innerHeight - 200)}px`,
              minWidth: '220px'
            }}
          >
            <button onClick={() => handleAddPoint(contextMenu.latlng)} className="w-full text-left px-6 py-4 text-slate-900 text-sm font-bold hover:bg-slate-50 transition-colors flex items-center gap-4">
               <div className="w-2 h-2 rounded-full bg-blue-500"></div> Add Point
            </button>
            <button onClick={() => handleAutoLoop()} className="w-full text-left px-6 py-4 text-slate-900 text-sm font-bold hover:bg-slate-50 transition-colors flex items-center gap-4 border-t border-slate-100">
               <div className="w-2 h-2 rounded-full border-2 border-blue-500"></div> Close Loop
            </button>
          </div>
        )}

        {/* Top Controls */}
        <div className="absolute top-12 left-8 right-8 z-[1000] flex flex-col gap-4">
          <div className="flex gap-3">
            <button onClick={onCancel} className="glass p-5 rounded-3xl text-white shadow-2xl active:scale-90 transition-all shrink-0">
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M15 19l-7-7 7-7" /></svg>
            </button>
            <form onSubmit={handleLocationSearch} className="flex-1 relative group">
              <input 
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Jump to city..."
                className="w-full glass px-14 py-5 rounded-3xl text-white font-bold placeholder:text-white/20 focus:outline-none focus:ring-2 ring-[var(--accent-primary)]/30 transition-all"
              />
              <svg className="absolute left-6 top-1/2 -translate-y-1/2 h-5 w-5 opacity-30" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
              {isSearching && <div className="absolute right-6 top-1/2 -translate-y-1/2 animate-spin h-5 w-5 border-2 border-[var(--accent-primary)] border-t-transparent rounded-full"></div>}
            </form>
          </div>

          <div className="flex flex-col gap-2">
            <div className="glass px-8 py-4 rounded-[2rem] flex items-center gap-4 animate-in slide-in-from-top-4 duration-500 shadow-xl">
              <span className="text-[10px] font-black uppercase tracking-[0.3em] opacity-40">Name</span>
              <input value={name} onChange={e => setName(e.target.value)} placeholder="Route Name..." className="bg-transparent text-lg font-bold text-white focus:outline-none flex-1 placeholder:text-white/10" />
            </div>
          </div>
        </div>

        {/* Floating Side Tools */}
        <div className="absolute top-64 right-8 flex flex-col gap-4 z-[1000]">
           <button 
             onClick={() => setIsSnapEnabled(!isSnapEnabled)} 
             className={`glass p-5 rounded-3xl shadow-2xl transition-all ${isSnapEnabled ? 'text-[var(--accent-primary)]' : 'text-white/30'}`}
             title={isSnapEnabled ? "Snap to roads enabled" : "Snap to roads disabled"}
           >
             <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
               <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M13 10V3L4 14h7v7l9-11h-7z" />
             </svg>
           </button>
           <button 
             onClick={() => {
                if (segments.length === 0) return;
                const next = segments.slice(0, -1);
                setSegments(next);
                rebuildMapFromSegments(next);
             }} 
             disabled={segments.length === 0} 
             className="glass p-5 rounded-3xl text-white shadow-2xl disabled:opacity-20 active:scale-95 transition-all"
           >
             <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" /></svg>
           </button>
           <button onClick={handleAutoLoop} disabled={segments.length < 2} className="glass p-5 rounded-3xl text-[var(--accent-secondary)] shadow-2xl disabled:opacity-20 active:scale-95 transition-all">
             <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
           </button>
        </div>

        {/* Footer Stats & Actions */}
        <div className="absolute bottom-12 left-8 right-8 z-[1000] glass p-8 rounded-[3.5rem] shadow-2xl border-white/5">
          <div className="flex flex-col md:flex-row justify-between items-center gap-8">
            <div className="flex-1 w-full md:w-auto flex items-end gap-12">
              <div className="space-y-1">
                <span className="text-[10px] font-black uppercase tracking-[0.4em] opacity-30 font-display">Distance</span>
                <div className="text-5xl font-display text-white">{distInfo.value} <span className="text-sm opacity-20">{distInfo.unit}</span></div>
              </div>
              <div className="hidden sm:block flex-1 h-12 mb-2 bg-white/5 rounded-2xl overflow-hidden border border-white/5">
                <ResponsiveContainer width="100%" height="100%">
                   <AreaChart data={liveElevationData}>
                      <Area type="monotone" dataKey="elev" stroke="var(--accent-secondary)" fill="var(--accent-secondary)" fillOpacity={0.1} strokeWidth={2} />
                   </AreaChart>
                </ResponsiveContainer>
              </div>
              <div className="space-y-1 text-right">
                <span className="text-[10px] font-black uppercase tracking-[0.4em] opacity-30 font-display">Climb</span>
                <div className="text-5xl font-display text-[var(--accent-secondary)]">+{elevInfo.value} <span className="text-sm opacity-20">{elevInfo.unit}</span></div>
              </div>
            </div>
            
            <button 
              disabled={distance === 0 || !name || isSaving}
              onClick={handleSave}
              className="w-full md:w-auto bg-[var(--accent-primary)] text-[var(--bg-color)] font-black py-6 px-12 rounded-[2rem] shadow-2xl shadow-[var(--accent-primary)]/40 transition-all flex items-center justify-center gap-4 active:scale-95 font-display text-2xl tracking-widest disabled:opacity-20"
            >
              {isSaving ? 'UPLOADING...' : 'SAVE TRACK'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RouteCreator;
