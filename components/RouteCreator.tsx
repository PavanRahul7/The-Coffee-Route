
import React, { useState, useEffect, useRef } from 'react';
import { LatLng, Route, Difficulty } from '../types';
import { geminiService } from '../services/geminiService';

declare var L: any;

interface RouteSegment {
  clickPoint: LatLng;
  pathPoints: LatLng[];
  isWaypoint?: boolean;
}

interface RouteCreatorProps {
  onSave: (route: Route) => void;
  onCancel: () => void;
  initialRoute?: Route;
}

const RouteCreator: React.FC<RouteCreatorProps> = ({ onSave, onCancel, initialRoute }) => {
  const [segments, setSegments] = useState<RouteSegment[]>([]);
  const allPoints = segments.reduce((acc, seg) => [...acc, ...seg.pathPoints], [] as LatLng[]);
  
  const [distance, setDistance] = useState(initialRoute?.distance || 0);
  const [name, setName] = useState(initialRoute?.name || '');
  const [description, setDescription] = useState(initialRoute?.description || '');
  const [difficulty, setDifficulty] = useState<Difficulty>(initialRoute?.difficulty || Difficulty.EASY);
  const [tags, setTags] = useState<string[]>(initialRoute?.tags || []);
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [detectedRegion, setDetectedRegion] = useState<string | null>(null);
  const [isLocating, setIsLocating] = useState(false);
  
  const [isSaving, setIsSaving] = useState(false);
  const [isSnapping, setIsSnapping] = useState(false);
  const [contextMenu, setContextMenu] = useState<{ x: number, y: number, latlng: LatLng } | null>(null);
  
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstance = useRef<any>(null);
  const polylineRef = useRef<any>(null);
  const startMarkerRef = useRef<any>(null);
  const endMarkerRef = useRef<any>(null);
  const waypointMarkersRef = useRef<any[]>([]);

  useEffect(() => {
    let timeout: number;
    const accentColor = getComputedStyle(document.documentElement).getPropertyValue('--accent-primary').trim() || '#d2b48c';
    
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
          fadeAnimation: true,
        }).setView([center.lat, center.lng], 15);

        L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
          maxZoom: 20
        }).addTo(mapInstance.current);

        polylineRef.current = L.polyline([], {
          color: accentColor,
          weight: 6,
          opacity: 0.9,
          className: 'route-glow'
        }).addTo(mapInstance.current);

        mapInstance.current.on('click', () => setContextMenu(null));

        mapInstance.current.on('contextmenu', (e: any) => {
          const point = mapInstance.current.latLngToContainerPoint(e.latlng);
          setContextMenu({ x: point.x, y: point.y, latlng: e.latlng });
        });

        if (initialRoute?.path) {
          const initialSegment: RouteSegment = {
            clickPoint: initialRoute.path[initialRoute.path.length - 1],
            pathPoints: initialRoute.path
          };
          setSegments([initialSegment]);
          polylineRef.current.setLatLngs(initialRoute.path);
          updateMarkers(initialRoute.path, []);
          mapInstance.current.fitBounds(polylineRef.current.getBounds(), { padding: [50, 50] });
          calculateDistance(initialRoute.path);
        } else {
          // Automatic detection on load for new routes
          handleDetectLocation();
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

  const handleDetectLocation = () => {
    if (!navigator.geolocation) return;
    setIsLocating(true);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude, longitude } = pos.coords;
        if (mapInstance.current) {
          mapInstance.current.setView([latitude, longitude], 15, { animate: true });
        }
        // AI detected region name
        const region = await geminiService.reverseGeocode(latitude, longitude);
        setDetectedRegion(region);
        setIsLocating(false);
      },
      (err) => {
        console.error("Location detection failed", err);
        setIsLocating(false);
      },
      { enableHighAccuracy: true }
    );
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

  const fetchRouteSegment = async (start: LatLng, end: LatLng): Promise<LatLng[]> => {
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
    return [end];
  };

  const handleAddPoint = async (latlng: LatLng, isWaypoint: boolean = false) => {
    setContextMenu(null);
    const newClickPoint = { lat: latlng.lat, lng: latlng.lng };
    
    if (segments.length > 0) {
      setIsSnapping(true);
      const lastSegment = segments[segments.length - 1];
      const lastPoint = lastSegment.pathPoints[lastSegment.pathPoints.length - 1];
      const snappedPoints = await fetchRouteSegment(lastPoint, newClickPoint);
      
      const newSegment: RouteSegment = {
        clickPoint: newClickPoint,
        pathPoints: snappedPoints,
        isWaypoint
      };

      setSegments(prev => {
        const next = [...prev, newSegment];
        const flatPoints = next.reduce((acc, seg) => [...acc, ...seg.pathPoints], [] as LatLng[]);
        const waypoints = next.filter(s => s.isWaypoint).map(s => s.clickPoint);
        polylineRef.current.setLatLngs(flatPoints);
        updateMarkers(flatPoints, waypoints);
        calculateDistance(flatPoints);
        return next;
      });
      setIsSnapping(false);
    } else {
      const firstSegment: RouteSegment = {
        clickPoint: newClickPoint,
        pathPoints: [newClickPoint],
        isWaypoint: true
      };
      setSegments([firstSegment]);
      polylineRef.current.setLatLngs([newClickPoint]);
      updateMarkers([newClickPoint], [newClickPoint]);
      calculateDistance([newClickPoint]);
    }
  };

  const updateMarkers = (currentPath: LatLng[], waypoints: LatLng[]) => {
    if (!mapInstance.current || typeof L === 'undefined') return;
    waypointMarkersRef.current.forEach(m => m.remove());
    waypointMarkersRef.current = [];

    const accentSec = getComputedStyle(document.documentElement).getPropertyValue('--accent-secondary').trim() || '#10b981';
    const accentPri = getComputedStyle(document.documentElement).getPropertyValue('--accent-primary').trim() || '#d2b48c';

    const createIcon = (color: string, size: number) => L.divIcon({
      className: 'custom-div-icon',
      html: `<div style="background-color: ${color}; width: ${size}px; height: ${size}px; border-radius: 50%; border: 3px solid white; box-shadow: 0 0 15px ${color}80;"></div>`,
      iconSize: [size, size],
      iconAnchor: [size/2, size/2]
    });

    if (currentPath.length > 0) {
      if (!startMarkerRef.current) {
        startMarkerRef.current = L.marker([currentPath[0].lat, currentPath[0].lng], { icon: createIcon(accentSec, 16), zIndexOffset: 1000 }).addTo(mapInstance.current);
      } else {
        startMarkerRef.current.setLatLng([currentPath[0].lat, currentPath[0].lng]);
      }

      waypoints.forEach((wp, idx) => {
        if (idx === 0) return; 
        if (idx === waypoints.length - 1 && currentPath.length > 1) return;
        const marker = L.marker([wp.lat, wp.lng], { icon: createIcon('#fff', 10) }).addTo(mapInstance.current);
        waypointMarkersRef.current.push(marker);
      });

      if (currentPath.length > 1) {
        if (!endMarkerRef.current) {
          endMarkerRef.current = L.marker([currentPath[currentPath.length - 1].lat, currentPath[currentPath.length - 1].lng], { icon: createIcon(accentPri, 16), zIndexOffset: 1001 }).addTo(mapInstance.current);
        } else {
          endMarkerRef.current.setLatLng([currentPath[currentPath.length - 1].lat, currentPath[currentPath.length - 1].lng]);
        }
      }
    }
  };

  const calculateDistance = (p: LatLng[]) => {
    if (p.length < 2) {
      setDistance(0);
      return;
    }
    let total = 0;
    for (let i = 0; i < p.length - 1; i++) {
      total += L.latLng(p[i].lat, p[i].lng).distanceTo(L.latLng(p[i+1].lat, p[i+1].lng));
    }
    setDistance(total / 1000);
  };

  const handleUndo = () => {
    if (segments.length === 0) return;
    setSegments(prev => {
      const next = prev.slice(0, -1);
      const flatPoints = next.reduce((acc, seg) => [...acc, ...seg.pathPoints], [] as LatLng[]);
      const waypoints = next.filter(s => s.isWaypoint).map(s => s.clickPoint);
      if (polylineRef.current) polylineRef.current.setLatLngs(flatPoints);
      updateMarkers(flatPoints, waypoints);
      calculateDistance(flatPoints);
      return next;
    });
  };

  const handleClear = () => {
    setSegments([]);
    if (polylineRef.current) polylineRef.current.setLatLngs([]);
    if (startMarkerRef.current) {
      startMarkerRef.current.remove();
      startMarkerRef.current = null;
    }
    if (endMarkerRef.current) {
      endMarkerRef.current.remove();
      endMarkerRef.current = null;
    }
    updateMarkers([], []);
    setDistance(0);
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

  return (
    <div className="fixed inset-0 z-[110] bg-[var(--bg-color)] flex flex-col overflow-hidden animate-in fade-in transition-colors duration-500">
      <div className="relative flex-1 bg-slate-900">
        <div ref={mapRef} className="w-full h-full" />
        
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
               <div className="w-2 h-2 rounded-full bg-blue-500"></div> Route Here
            </button>
            <button onClick={() => handleAddPoint(contextMenu.latlng, true)} className="w-full text-left px-6 py-4 text-slate-900 text-sm font-bold hover:bg-slate-50 transition-colors flex items-center gap-4 border-t border-slate-100">
               <div className="w-2 h-2 rounded-full border-2 border-blue-500"></div> Waypoint
            </button>
          </div>
        )}

        {/* HUD Overlay - Top */}
        <div className="absolute top-12 left-8 right-8 z-[1000] flex flex-col gap-4">
          <div className="flex gap-3">
            <button onClick={onCancel} className="glass p-5 rounded-3xl text-[var(--text-main)] shadow-2xl active:scale-90 transition-all shrink-0">
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M15 19l-7-7 7-7" /></svg>
            </button>
            <form onSubmit={handleLocationSearch} className="flex-1 relative group">
              <input 
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Jump to location..."
                className="w-full glass px-14 py-5 rounded-3xl text-[var(--text-main)] font-bold placeholder:text-white/20 focus:outline-none focus:ring-2 ring-[var(--accent-primary)]/30 transition-all"
              />
              <svg className="absolute left-6 top-1/2 -translate-y-1/2 h-5 w-5 opacity-30" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
              {isSearching && <div className="absolute right-6 top-1/2 -translate-y-1/2 animate-spin h-5 w-5 border-2 border-[var(--accent-primary)] border-t-transparent rounded-full"></div>}
            </form>
            <button 
              type="button"
              onClick={handleDetectLocation}
              className={`glass p-5 rounded-3xl shadow-2xl active:scale-90 transition-all shrink-0 ${isLocating ? 'text-[var(--accent-primary)] animate-pulse' : 'text-white/40 hover:text-white'}`}
            >
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </button>
          </div>

          <div className="flex flex-col gap-2">
            <div className="glass px-8 py-4 rounded-[2rem] flex items-center gap-4 animate-in slide-in-from-top-4 duration-500">
              <span className="text-[10px] font-black uppercase tracking-[0.3em] opacity-40">Name</span>
              <input value={name} onChange={e => setName(e.target.value)} placeholder="Route Name..." className="bg-transparent text-lg font-bold text-white focus:outline-none flex-1 placeholder:text-white/10" />
            </div>
            {detectedRegion && (
              <div className="bg-[var(--accent-primary)]/20 self-start px-5 py-2 rounded-full border border-[var(--accent-primary)]/30 animate-in fade-in duration-700">
                <span className="text-[10px] font-black uppercase tracking-widest text-[var(--accent-primary)]">Manning Tracks in {detectedRegion}</span>
              </div>
            )}
          </div>
        </div>

        {/* Sidebar Controls */}
        <div className="absolute top-64 right-8 flex flex-col gap-4 z-[1000]">
           <button onClick={() => handleUndo()} disabled={segments.length === 0} className="glass p-5 rounded-3xl text-white shadow-2xl disabled:opacity-20 active:scale-95 transition-all">
             <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" /></svg>
           </button>
           <button onClick={handleClear} className="glass p-5 rounded-3xl text-red-400 shadow-2xl active:scale-95 transition-all">
             <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
           </button>
        </div>

        {/* Footer Dashboard */}
        <div className="absolute bottom-12 left-8 right-8 z-[1000] glass p-10 rounded-[3.5rem] shadow-2xl">
          <div className="flex flex-col sm:flex-row justify-between items-center gap-6">
            <div className="flex gap-16">
              <div className="space-y-1">
                <span className="text-[10px] font-black uppercase tracking-[0.4em] opacity-30 font-display">Distance</span>
                <div className="text-5xl font-display text-white">{distance.toFixed(2)} <span className="text-sm opacity-20">km</span></div>
              </div>
              <div className="space-y-1">
                <span className="text-[10px] font-black uppercase tracking-[0.4em] opacity-30 font-display">Climb</span>
                <div className="text-5xl font-display text-[var(--accent-secondary)]">+{Math.round(distance * 15)} <span className="text-sm opacity-20">m</span></div>
              </div>
            </div>
            <button 
              disabled={distance === 0 || !name || isSaving}
              onClick={handleSave}
              className="w-full sm:w-auto bg-[var(--accent-primary)] text-[var(--bg-color)] font-black py-6 px-12 rounded-3xl shadow-2xl shadow-[var(--accent-primary)]/40 transition-all flex items-center justify-center gap-4 active:scale-95 font-display text-2xl tracking-widest disabled:opacity-20"
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
