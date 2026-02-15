import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { LatLng, Route, Difficulty, UnitSystem } from '../types';
import { geminiService } from '../services/geminiService';
import { formatDistance, formatElevation } from '../services/unitUtils';
import { AreaChart, Area, ResponsiveContainer } from 'recharts';

declare var L: any;

interface RouteSegment {
  id: string;
  clickPoint: LatLng; // The logical end of this segment
  pathPoints: LatLng[]; // The actual geometry (snapped)
  isSnap: boolean;
}

interface RouteCreatorProps {
  unitSystem: UnitSystem;
  onSave: (route: Route) => void;
  onCancel: () => void;
  initialRoute?: Route;
}

const RouteCreator: React.FC<RouteCreatorProps> = ({ unitSystem, onSave, onCancel, initialRoute }) => {
  const [segments, _setSegments] = useState<RouteSegment[]>([]);
  const segmentsRef = useRef<RouteSegment[]>([]);
  const [past, setPast] = useState<RouteSegment[][]>([]);
  const [isSnapEnabled, setIsSnapEnabled] = useState(true);
  const isSnapRef = useRef(isSnapEnabled);
  
  const [isFreehandMode, setIsFreehandMode] = useState(false);
  const isFreehandRef = useRef(isFreehandMode);
  
  const [name, setName] = useState(initialRoute?.name || '');
  const [distance, setDistance] = useState(initialRoute?.distance || 0);
  const [isSaving, setIsSaving] = useState(false);
  const [isRouting, setIsRouting] = useState(false);
  const [cafes, setCafes] = useState<any[]>([]);
  
  const [isTracing, setIsTracing] = useState(false);
  const tracePointsRef = useRef<LatLng[]>([]);

  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstance = useRef<any>(null);
  const polylineGlowRef = useRef<any>(null);
  const polylineCoreRef = useRef<any>(null);
  const traceLineRef = useRef<any>(null);
  const markersRef = useRef<Map<string, any>>(new Map());
  const cafeMarkersRef = useRef<any[]>([]);

  useEffect(() => { isSnapRef.current = isSnapEnabled; }, [isSnapEnabled]);
  useEffect(() => { isFreehandRef.current = isFreehandMode; }, [isFreehandMode]);

  const setSegments = useCallback((val: RouteSegment[] | ((prev: RouteSegment[]) => RouteSegment[])) => {
    const next = typeof val === 'function' ? val(segmentsRef.current) : val;
    segmentsRef.current = next;
    _setSegments(next);
  }, []);

  const pushToHistory = useCallback((newSegments: RouteSegment[]) => {
    setPast(prev => [...prev.slice(-19), segmentsRef.current]);
    setSegments(newSegments);
  }, [setSegments]);

  const allPoints = useMemo(() => segments.reduce((acc, seg) => [...acc, ...seg.pathPoints], [] as LatLng[]), [segments]);
  
  const elevationData = useMemo(() => {
    if (allPoints.length === 0) return [];
    return allPoints.filter((_, i) => i % 10 === 0 || i === allPoints.length - 1).map((p, i) => ({
      dist: i,
      elev: 10 + (Math.sin(i / 5) * 5) 
    }));
  }, [allPoints]);

  const fetchRouteSegment = async (start: LatLng, end: LatLng): Promise<LatLng[]> => {
    if (!isSnapRef.current) return [start, end];
    try {
      const url = `https://router.project-osrm.org/route/v1/foot/${start.lng},${start.lat};${end.lng},${end.lat}?overview=full&geometries=geojson`;
      const response = await fetch(url);
      const data = await response.json();
      if (data.code === 'Ok' && data.routes?.[0]?.geometry?.coordinates) {
        return data.routes[0].geometry.coordinates.map((coord: any) => ({
          lat: coord[1],
          lng: coord[0]
        }));
      }
    } catch (err) { console.error("OSRM Error:", err); }
    return [start, end];
  };

  const matchPointsToRoads = async (points: LatLng[]): Promise<LatLng[]> => {
    if (points.length < 2) return points;
    if (!isSnapRef.current) return points;

    try {
      const sampled = points.filter((_, i) => i % 5 === 0 || i === points.length - 1);
      const coords = sampled.map(p => `${p.lng},${p.lat}`).join(';');
      const url = `https://router.project-osrm.org/match/v1/foot/${coords}?overview=full&geometries=geojson&tidy=true`;
      const response = await fetch(url);
      const data = await response.json();
      
      if (data.code === 'Ok' && data.matchings?.[0]?.geometry?.coordinates) {
        return data.matchings[0].geometry.coordinates.map((coord: any) => ({
          lat: coord[1],
          lng: coord[0]
        }));
      }
    } catch (err) {
      console.error("OSRM Match Error:", err);
    }
    return points;
  };

  const fetchCoffeeShops = async (points: LatLng[]) => {
    if (points.length < 2) return;
    const mid = points[Math.floor(points.length / 2)];
    try {
      const query = `[out:json];node["amenity"="cafe"](around:350,${mid.lat},${mid.lng});out;`;
      const response = await fetch(`https://overpass-api.de/api/interpreter?data=${encodeURIComponent(query)}`);
      
      if (!response.ok) return;

      const contentType = response.headers.get("content-type");
      if (!contentType || !contentType.includes("application/json")) {
        console.warn("Overpass returned non-JSON. Server may be busy.");
        return;
      }

      const data = await response.json();
      if (data.elements) {
        setCafes(prev => {
          const newCafes = [...prev];
          data.elements.forEach((el: any) => {
            if (!newCafes.find(c => c.id === el.id)) newCafes.push(el);
          });
          return newCafes;
        });
      }
    } catch (e) { console.error("Overpass handling error:", e); }
  };

  const handleAddPoint = async (latlng: any) => {
    if (isTracing) return;
    setIsRouting(true);
    
    const newId = Math.random().toString(36).substr(2, 9);
    const newClickPoint = { lat: latlng.lat, lng: latlng.lng };
    const currentSegments = segmentsRef.current;

    let nextSegments: RouteSegment[] = [];
    if (currentSegments.length > 0) {
      const last = currentSegments[currentSegments.length - 1];
      const snapped = await fetchRouteSegment(last.clickPoint, newClickPoint);
      const newSeg: RouteSegment = { 
        id: newId, 
        clickPoint: newClickPoint, 
        pathPoints: snapped, 
        isSnap: isSnapRef.current 
      };
      nextSegments = [...currentSegments, newSeg];
      fetchCoffeeShops(snapped);
    } else {
      const firstSeg: RouteSegment = { 
        id: newId, 
        clickPoint: newClickPoint, 
        pathPoints: [newClickPoint], 
        isSnap: isSnapRef.current 
      };
      nextSegments = [firstSeg];
    }
    pushToHistory(nextSegments);
    setIsRouting(false);
  };

  const handleDeletePoint = async (id: string) => {
    const currentSegments = segmentsRef.current;
    const index = currentSegments.findIndex(s => s.id === id);
    if (index === -1) return;

    setIsRouting(true);
    let nextSegments = [...currentSegments];
    
    if (index === 0) {
      nextSegments.splice(0, 1);
      if (nextSegments.length > 0) {
        nextSegments[0] = { ...nextSegments[0], pathPoints: [nextSegments[0].clickPoint] };
      }
    } else if (index === currentSegments.length - 1) {
      nextSegments.splice(index, 1);
    } else {
      const prevSeg = currentSegments[index - 1];
      const nextSeg = currentSegments[index + 1];
      const bridgedPath = await fetchRouteSegment(prevSeg.clickPoint, nextSeg.clickPoint);
      nextSegments.splice(index, 1);
      nextSegments[index] = { ...nextSeg, pathPoints: bridgedPath };
    }

    pushToHistory(nextSegments);
    setIsRouting(false);
  };

  const handleFinishFreehand = async () => {
    if (tracePointsRef.current.length < 3) {
      setIsTracing(false);
      tracePointsRef.current = [];
      if (traceLineRef.current) traceLineRef.current.setLatLngs([]);
      return;
    }

    setIsRouting(true);
    const endOfStroke = tracePointsRef.current[tracePointsRef.current.length - 1];
    const matchedPath = await matchPointsToRoads(tracePointsRef.current);

    const newId = Math.random().toString(36).substr(2, 9);
    const currentSegments = segmentsRef.current;
    
    let nextSegments: RouteSegment[] = [];
    if (currentSegments.length > 0) {
      const last = currentSegments[currentSegments.length - 1];
      const bridge = await fetchRouteSegment(last.clickPoint, matchedPath[0]);
      const newSeg: RouteSegment = {
        id: newId,
        clickPoint: endOfStroke,
        pathPoints: [...bridge, ...matchedPath],
        isSnap: isSnapRef.current
      };
      nextSegments = [...currentSegments, newSeg];
    } else {
      const firstSeg: RouteSegment = {
        id: newId,
        clickPoint: endOfStroke,
        pathPoints: matchedPath,
        isSnap: isSnapRef.current
      };
      nextSegments = [firstSeg];
    }

    pushToHistory(nextSegments);
    setIsTracing(false);
    tracePointsRef.current = [];
    if (traceLineRef.current) traceLineRef.current.setLatLngs([]);
    setIsRouting(false);
    fetchCoffeeShops(matchedPath);
  };

  const handleUndo = useCallback(() => {
    if (past.length === 0) return;
    const previous = past[past.length - 1];
    setPast(prev => prev.slice(0, -1));
    setSegments(previous);
  }, [past, setSegments]);

  const handleClear = () => {
    pushToHistory([]);
    setCafes([]);
  };

  const rebuildMapVisuals = useCallback(() => {
    if (!mapInstance.current || !polylineCoreRef.current) return;

    const currentSegments = segmentsRef.current;
    const flatPoints = currentSegments.reduce((acc, seg) => [...acc, ...seg.pathPoints], [] as LatLng[]);
    
    polylineGlowRef.current.setLatLngs(flatPoints);
    polylineCoreRef.current.setLatLngs(flatPoints);
    
    const currentIds = new Set(currentSegments.map(s => s.id));
    markersRef.current.forEach((marker, id) => {
      if (!currentIds.has(id)) { marker.remove(); markersRef.current.delete(id); }
    });

    currentSegments.forEach((seg, idx) => {
      let marker = markersRef.current.get(seg.id);
      const isEnd = idx === currentSegments.length - 1;
      const isStart = idx === 0;
      
      const icon = L.divIcon({
        className: 'route-anchor',
        html: `<div style="background: ${isStart ? '#d4943a' : (isEnd ? '#f5e6d0' : 'white')}; width: ${isEnd || isStart ? '24px' : '10px'}; height: ${isEnd || isStart ? '24px' : '10px'}; border-radius: 50%; border: 3px solid #1a1210; box-shadow: 0 4px 15px rgba(0,0,0,0.5); display: flex; align-items: center; justify-content: center; font-weight: 900; font-size: 10px; color: #1a1210;">${isStart ? 'S' : (isEnd ? 'E' : '')}</div>`,
        iconSize: [24, 24],
        iconAnchor: [12, 12]
      });

      if (!marker) {
        marker = L.marker([seg.clickPoint.lat, seg.clickPoint.lng], { icon, draggable: false }).addTo(mapInstance.current);
        marker.on('click', (e: any) => {
          L.DomEvent.stopPropagation(e);
          handleDeletePoint(seg.id);
        });
        markersRef.current.set(seg.id, marker);
      } else {
        marker.setLatLng([seg.clickPoint.lat, seg.clickPoint.lng]);
        marker.setIcon(icon);
      }
    });

    cafeMarkersRef.current.forEach(m => m.remove());
    cafeMarkersRef.current = cafes.map(cafe => {
      const cafeName = cafe.tags.name || 'Coffee Pit Stop';
      const icon = L.divIcon({
        className: 'cafe-marker',
        html: `<div class="glass" style="width: 42px; height: 42px; border-radius: 16px; display: flex; align-items: center; justify-content: center; font-size: 22px; border: 2px solid #d4943a; box-shadow: 0 8px 32px rgba(0,0,0,0.7); transition: transform 0.2s cubic-bezier(0.175, 0.885, 0.32, 1.275);">☕</div>`,
        iconSize: [42, 42],
        iconAnchor: [21, 21]
      });
      const marker = L.marker([cafe.lat, cafe.lon], { icon }).addTo(mapInstance.current);
      
      marker.bindTooltip(`
        <div style="background: #1a1210; color: #f5e6d0; padding: 6px 12px; border-radius: 8px; border: 1px solid #d4943a; font-weight: bold; font-family: sans-serif; box-shadow: 0 4px 12px rgba(0,0,0,0.5);">
          ${cafeName}
        </div>
      `, { direction: 'top', offset: [0, -20], opacity: 1, className: 'custom-cafe-tooltip' });

      marker.bindPopup(`
        <div class="p-3 space-y-2 text-[#f5e6d0]">
          <h4 class="text-xl font-bold border-b border-[#d4943a]/30 pb-1">${cafeName}</h4>
          <p class="text-[10px] opacity-60 uppercase tracking-widest">Fresh Batch Nearby</p>
          <button class="w-full bg-[#d4943a] text-[#1a1210] font-black text-[10px] py-2 rounded-lg mt-2 uppercase tracking-tighter">Add to Route</button>
        </div>
      `);

      return marker;
    });

    if (flatPoints.length < 2) {
      setDistance(0);
    } else {
      let total = 0;
      for (let i = 0; i < flatPoints.length - 1; i++) {
        total += L.latLng(flatPoints[i].lat, flatPoints[i].lng).distanceTo(L.latLng(flatPoints[i+1].lat, flatPoints[i+1].lng));
      }
      setDistance(total / 1000);
    }
  }, [cafes]);

  useEffect(() => { rebuildMapVisuals(); }, [segments, rebuildMapVisuals]);

  useEffect(() => {
    if (mapInstance.current) return;
    mapInstance.current = L.map(mapRef.current, { 
      zoomControl: false, 
      attributionControl: false,
      dragging: !isFreehandRef.current 
    }).setView([37.7749, -122.4194], 14);
    
    L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png').addTo(mapInstance.current);

    polylineGlowRef.current = L.polyline([], { color: '#d4943a', weight: 14, opacity: 0.2, lineCap: 'round' }).addTo(mapInstance.current);
    polylineCoreRef.current = L.polyline([], { color: '#d4943a', weight: 6, opacity: 1, lineCap: 'round', className: 'route-core' }).addTo(mapInstance.current);
    traceLineRef.current = L.polyline([], { color: '#f5e6d0', weight: 3, opacity: 0.6, dashArray: '8, 12' }).addTo(mapInstance.current);

    mapInstance.current.on('mousedown', (e: any) => {
      if (isFreehandRef.current) {
        setIsTracing(true);
        tracePointsRef.current = [e.latlng];
      }
    });

    mapInstance.current.on('mousemove', (e: any) => {
      if (isTracing) {
        const last = tracePointsRef.current[tracePointsRef.current.length - 1];
        if (!last || L.latLng(last).distanceTo(e.latlng) > 8) {
          tracePointsRef.current.push(e.latlng);
          traceLineRef.current.setLatLngs(tracePointsRef.current);
        }
      }
    });

    mapInstance.current.on('mouseup', () => {
      if (isTracing) {
        handleFinishFreehand();
      }
    });

    mapInstance.current.on('click', (e: any) => {
      if (!isFreehandRef.current && !isTracing) {
        handleAddPoint(e.latlng);
      }
    });

    return () => { if (mapInstance.current) mapInstance.current.remove(); };
  }, []);

  useEffect(() => {
    if (mapInstance.current) {
      if (isFreehandMode) {
        mapInstance.current.dragging.disable();
      } else {
        mapInstance.current.dragging.enable();
      }
    }
  }, [isFreehandMode]);

  const handleSave = async () => {
    if (!name || distance === 0) return;
    setIsSaving(true);
    const desc = await geminiService.generateRouteDescription(name, parseFloat(distance.toFixed(1)), Math.round(distance * 12), cafes.map(c => c.tags.name));
    onSave({
      id: initialRoute?.id || Math.random().toString(36).substr(2, 9),
      name, description: desc, creatorId: 'user_1', creatorName: 'RunnerOne',
      path: allPoints, distance: parseFloat(distance.toFixed(2)), elevationGain: Math.round(distance * 12),
      difficulty: Difficulty.MODERATE, tags: ['coffee'], createdAt: Date.now(), rating: 4.5
    });
    setIsSaving(false);
  };

  const timeEst = {
    walk: Math.round(distance * 12),
    jog: Math.round(distance * 9),
    run: Math.round(distance * 7)
  };

  return (
    <div className="fixed inset-0 z-[110] bg-[#1a1210] flex flex-col overflow-hidden animate-in fade-in duration-500">
      <div ref={mapRef} className={`flex-1 ${isFreehandMode ? 'cursor-pencil' : 'cursor-crosshair'}`} style={{ cursor: isFreehandMode ? 'url("data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' width=\'24\' height=\'24\' viewBox=\'0 0 24 24\' fill=\'none\' stroke=\'white\' stroke-width=\'2\' stroke-linecap=\'round\' stroke-linejoin=\'round\'%3E%3Cpath d=\'M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z\'%3E%3C/path%3E%3C/svg%3E") 0 24, crosshair' : 'crosshair' }} />
      
      {isRouting && (
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-[2000] glass px-10 py-5 rounded-[2rem] flex items-center gap-4 animate-pulse">
           <div className="w-5 h-5 border-2 border-[#d4943a] border-t-transparent rounded-full animate-spin" />
           <span className="text-[10px] font-black uppercase tracking-[0.4em] text-[#d4943a]">Roasting Path...</span>
        </div>
      )}

      {/* Top Header Controls */}
      <div className="absolute top-12 left-8 right-8 z-[1000] flex gap-4">
        <button onClick={onCancel} className="glass w-16 h-16 rounded-[1.8rem] flex items-center justify-center text-white active:scale-90 transition-all shadow-2xl">
          <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M15 19l-7-7 7-7" /></svg>
        </button>
        <div className="flex-1 glass px-8 py-4 rounded-[2.2rem] flex items-center gap-4 border-white/5 shadow-2xl">
          <input value={name} onChange={e => setName(e.target.value)} placeholder="ROAST NAME..." className="bg-transparent text-xl font-bold text-white focus:outline-none flex-1 placeholder:text-white/10 uppercase tracking-tighter" />
        </div>
      </div>

      {/* Side Toolbar */}
      <div className="absolute top-32 right-8 flex flex-col gap-4 z-[1000]">
         <button 
           onClick={() => setIsFreehandMode(!isFreehandMode)} 
           title="Freehand Draw Mode" 
           className={`glass w-16 h-16 rounded-[1.8rem] flex items-center justify-center transition-all ${isFreehandMode ? 'text-[#d4943a] ring-2 ring-[#d4943a]/50' : 'text-white/40'}`}
         >
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
            </svg>
         </button>

         <button onClick={() => setIsSnapEnabled(!isSnapEnabled)} title="Toggle Snap-to-Road" className={`glass w-16 h-16 rounded-[1.8rem] flex items-center justify-center transition-all ${isSnapEnabled ? 'text-[#d4943a]' : 'text-white/20'}`}>
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
         </button>
         
         <button onClick={handleUndo} disabled={past.length === 0} title="Undo last action" className="glass w-16 h-16 rounded-[1.8rem] flex items-center justify-center text-white disabled:opacity-10 active:scale-90 transition-all">
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" /></svg>
         </button>
         <button onClick={handleClear} title="Clear all" className="glass w-16 h-16 rounded-[1.8rem] flex items-center justify-center text-red-400 active:scale-90 transition-all">
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M6 18L18 6M6 6l12 12" /></svg>
         </button>
      </div>

      {/* Floating Instructions */}
      {segments.length === 0 && (
        <div className="absolute top-[30%] left-1/2 -translate-x-1/2 z-[1001] pointer-events-none text-center space-y-4">
           <div className="glass px-10 py-12 rounded-[4rem] border-amber-900/20 shadow-3xl">
              <h3 className="text-4xl font-display font-black text-white leading-none uppercase">{isFreehandMode ? 'Draw path' : 'Place pins'}</h3>
              <p className="text-[9px] font-bold uppercase tracking-[0.4em] opacity-40 mt-3">
                {isFreehandMode ? 'Hold and drag to trace your route' : 'Tap map to place anchor points'}
              </p>
           </div>
        </div>
      )}

      {/* Stats Bottom Panel */}
      <div className="absolute bottom-10 left-8 right-8 z-[1000] glass p-8 rounded-[3.5rem] shadow-3xl border-amber-900/10 space-y-6">
        <div className="flex justify-between items-end">
          <div className="space-y-1">
            <span className="text-[9px] font-black uppercase tracking-[0.5em] opacity-30">Total Batch</span>
            <div className="text-6xl font-display text-white tracking-tighter leading-none">
              {formatDistance(distance, unitSystem).value} <span className="text-xl opacity-20">{formatDistance(distance, unitSystem).unit}</span>
            </div>
          </div>
          <div className="flex flex-col items-end gap-1">
            <div className="flex gap-4">
               <div className="text-right">
                  <span className="text-[7px] font-black uppercase tracking-widest opacity-20">Walk</span>
                  <div className="text-xs font-bold text-[#f5e6d0]">{timeEst.walk}m</div>
               </div>
               <div className="text-right border-x border-white/5 px-4">
                  <span className="text-[7px] font-black uppercase tracking-widest opacity-20">Jog</span>
                  <div className="text-xs font-bold text-[#d4943a]">{timeEst.jog}m</div>
               </div>
               <div className="text-right">
                  <span className="text-[7px] font-black uppercase tracking-widest opacity-20">Run</span>
                  <div className="text-xs font-bold text-[#10b981]">{timeEst.run}m</div>
               </div>
            </div>
            <div className="text-right pt-2">
              <span className="text-[9px] font-black uppercase tracking-[0.4em] opacity-30">Climb</span>
              <div className="text-3xl font-display text-[#d4943a] leading-none">
                +{formatElevation(distance * 12, unitSystem).value}<span className="text-sm opacity-20 ml-1">{formatElevation(distance * 12, unitSystem).unit}</span>
              </div>
            </div>
          </div>
        </div>

        <div className="h-12 w-full">
           <ResponsiveContainer width="100%" height="100%">
             <AreaChart data={elevationData}>
               <Area type="monotone" dataKey="elev" stroke="#d4943a" fill="#d4943a" fillOpacity={0.1} strokeWidth={3} />
             </AreaChart>
           </ResponsiveContainer>
        </div>

        <button 
          disabled={distance === 0 || !name || isSaving} 
          onClick={handleSave} 
          className="w-full bg-[#d4943a] text-[#1a1210] font-black py-7 rounded-[2rem] shadow-2xl disabled:opacity-20 uppercase font-display text-2xl tracking-[0.2em] active:scale-[0.98] transition-all shadow-amber-900/40"
        >
          {isSaving ? 'SEALING BAG...' : 'FINALIZE BREW'}
        </button>
      </div>
    </div>
  );
};

export default RouteCreator;