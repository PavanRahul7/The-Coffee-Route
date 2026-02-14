export interface LatLng {
  lat: number;
  lng: number;
}

export enum Difficulty {
  EASY = 'Easy',
  MODERATE = 'Moderate',
  HARD = 'Hard'
}

export type ThemeType = 'stealth' | 'solar' | 'neon' | 'forest' | 'barista';

export interface Route {
  id: string;
  name: string;
  description: string;
  creatorId: string;
  creatorName: string;
  path: LatLng[];
  distance: number; // in km
  elevationGain: number; // in meters
  difficulty: Difficulty;
  tags: string[];
  createdAt: number;
  rating: number;
}

export interface RunHistory {
  id: string;
  routeId: string;
  routeName: string;
  date: number;
  duration: number; // seconds
  distance: number; // km
  averagePace: string; // min/km
  actualPath: LatLng[];
  coachingTips?: string;
}

export interface UserProfile {
  id: string;
  username: string;
  avatar: string;
  bio: string;
  theme?: ThemeType;
  stats: {
    totalDistance: number;
    totalRuns: number;
    avgPace: string;
  };
}

export type AppTab = 'explore' | 'create' | 'runs' | 'profile';