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

export interface Review {
  id: string;
  routeId: string;
  userId: string;
  username: string;
  rating: number; // 1-5
  comment: string;
  createdAt: number;
}

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
  rating: number; // average rating
}

export interface RunClub {
  id: string;
  name: string;
  description: string;
  logo: string;
  memberCount: number;
  weeklyRouteId: string;
  meetingTime: string;
  location: string;
  creatorId: string;
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
  reviewId?: string;
}

export interface UserProfile {
  id: string;
  username: string;
  avatar: string;
  bio: string;
  theme?: ThemeType;
  joinedClubIds: string[];
  friendIds: string[];
  isSetup: boolean;
  stats: {
    totalDistance: number;
    totalRuns: number;
    avgPace: string;
  };
}

export type AppTab = 'explore' | 'clubs' | 'friends' | 'create' | 'runs' | 'profile';