import { Route, RunHistory, UserProfile, Difficulty, RunClub } from '../types';

const KEYS = {
  ROUTES: 'velocity_routes',
  RUNS: 'velocity_runs',
  PROFILE: 'velocity_profile',
  CLUBS: 'velocity_clubs',
};

const INITIAL_PROFILE: UserProfile = {
  id: 'user_1',
  username: 'CaffeineRunner',
  avatar: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=400&h=400&fit=crop',
  bio: 'Running for the roast. Every run deserves a destination.',
  joinedClubIds: ['c1'],
  stats: {
    totalDistance: 0,
    totalRuns: 0,
    avgPace: '0:00'
  }
};

const INITIAL_ROUTES: Route[] = [
  {
    id: 'r1',
    name: 'Espresso Harbor Run',
    description: 'A crisp coastal loop ending at The Roastery for a perfect double shot.',
    creatorId: 'user_1',
    creatorName: 'CaffeineRunner',
    path: [{ lat: 37.7749, lng: -122.4194 }, { lat: 37.7849, lng: -122.4094 }],
    distance: 5.2,
    elevationGain: 12,
    difficulty: Difficulty.EASY,
    tags: ['coffee', 'scenic', 'flat'],
    createdAt: Date.now(),
    rating: 4.8
  },
  {
    id: 'r2',
    name: 'Cortado Hill Climb',
    description: 'Tough elevation gains rewarding you with the best micro-foam in the city.',
    creatorId: 'user_1',
    creatorName: 'CaffeineRunner',
    path: [{ lat: 37.7949, lng: -122.4294 }, { lat: 37.8049, lng: -122.4394 }],
    distance: 8.4,
    elevationGain: 245,
    difficulty: Difficulty.HARD,
    tags: ['trail', 'hills', 'destination'],
    createdAt: Date.now(),
    rating: 4.9
  },
  {
    id: 'r3',
    name: 'Latte Art Parkway',
    description: 'Smooth asphalt through the park, passing three specialty cafes.',
    creatorId: 'user_1',
    creatorName: 'BaristaRun',
    path: [{ lat: 37.7649, lng: -122.4494 }, { lat: 37.7549, lng: -122.4594 }],
    distance: 4.0,
    elevationGain: 35,
    difficulty: Difficulty.MODERATE,
    tags: ['park', 'urban', 'coffee'],
    createdAt: Date.now(),
    rating: 4.6
  }
];

const INITIAL_CLUBS: RunClub[] = [
  {
    id: 'c1',
    name: 'The Espresso Express',
    description: 'High-speed morning sessions followed by immediate caffeine intake.',
    logo: 'https://images.unsplash.com/photo-1511920170033-f8396924c348?w=200&h=200&fit=crop',
    memberCount: 124,
    weeklyRouteId: 'r1',
    meetingTime: 'Tuesdays @ 6:30 AM',
    location: 'Pier 39, Harbor View',
    creatorId: 'system'
  },
  {
    id: 'c2',
    name: 'Brew Crew Runners',
    description: 'Community-focused club exploring hidden neighborhood coffee gems.',
    logo: 'https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?w=200&h=200&fit=crop',
    memberCount: 89,
    weeklyRouteId: 'r3',
    meetingTime: 'Saturdays @ 9:00 AM',
    location: 'Central Park North',
    creatorId: 'system'
  },
  {
    id: 'c3',
    name: 'Steep & Sprint',
    description: 'Hill training experts who believe the best view is from the top of the hill with a cortado.',
    logo: 'https://images.unsplash.com/photo-1447933630913-bb79912e47b4?w=200&h=200&fit=crop',
    memberCount: 56,
    weeklyRouteId: 'r2',
    meetingTime: 'Thursdays @ 6:00 PM',
    location: 'Mountain View Summit',
    creatorId: 'system'
  }
];

export const storageService = {
  getRoutes: (): Route[] => {
    const data = localStorage.getItem(KEYS.ROUTES);
    return data ? JSON.parse(data) : INITIAL_ROUTES;
  },
  saveRoute: (route: Route) => {
    const routes = storageService.getRoutes();
    const updated = [route, ...routes];
    localStorage.setItem(KEYS.ROUTES, JSON.stringify(updated));
  },
  updateRoute: (updatedRoute: Route) => {
    const routes = storageService.getRoutes();
    const updated = routes.map(r => r.id === updatedRoute.id ? updatedRoute : r);
    localStorage.setItem(KEYS.ROUTES, JSON.stringify(updated));
  },
  getRuns: (): RunHistory[] => {
    const data = localStorage.getItem(KEYS.RUNS);
    return data ? JSON.parse(data) : [];
  },
  saveRun: (run: RunHistory) => {
    const runs = storageService.getRuns();
    const updated = [run, ...runs];
    localStorage.setItem(KEYS.RUNS, JSON.stringify(updated));
    
    // Update profile stats
    const profile = storageService.getProfile();
    profile.stats.totalDistance += run.distance;
    profile.stats.totalRuns += 1;
    storageService.saveProfile(profile);
  },
  getProfile: (): UserProfile => {
    const data = localStorage.getItem(KEYS.PROFILE);
    const stored = data ? JSON.parse(data) : INITIAL_PROFILE;
    // Migration for joinedClubIds
    if (!stored.joinedClubIds) stored.joinedClubIds = [];
    if (!stored.theme) stored.theme = 'barista';
    return stored;
  },
  saveProfile: (profile: UserProfile) => {
    localStorage.setItem(KEYS.PROFILE, JSON.stringify(profile));
  },
  getClubs: (): RunClub[] => {
    const data = localStorage.getItem(KEYS.CLUBS);
    return data ? JSON.parse(data) : INITIAL_CLUBS;
  },
  saveClub: (club: RunClub) => {
    const clubs = storageService.getClubs();
    const updated = [club, ...clubs];
    localStorage.setItem(KEYS.CLUBS, JSON.stringify(updated));
  },
  toggleClubMembership: (clubId: string) => {
    const profile = storageService.getProfile();
    const index = profile.joinedClubIds.indexOf(clubId);
    if (index > -1) {
      profile.joinedClubIds.splice(index, 1);
    } else {
      profile.joinedClubIds.push(clubId);
    }
    storageService.saveProfile(profile);
    return profile;
  }
};