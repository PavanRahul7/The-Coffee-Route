
import { Route, RunHistory, UserProfile, Difficulty, RunClub, Review } from '../types';

const KEYS = {
  ROUTES: 'velocity_routes',
  RUNS: 'velocity_runs',
  PROFILE: 'velocity_profile',
  CLUBS: 'velocity_clubs',
  REVIEWS: 'velocity_reviews',
  USERS: 'velocity_all_users',
};

const INITIAL_PROFILE: UserProfile = {
  id: 'user_1',
  username: 'New Roaster',
  avatar: 'https://images.unsplash.com/photo-1476480862126-209bfaa8edc8?w=400&h=400&fit=crop',
  bio: 'Just starting my journey. Every run deserves a destination.',
  joinedClubIds: [],
  friendIds: ['u_2', 'u_3'],
  isSetup: false,
  unitSystem: 'metric',
  stats: {
    totalDistance: 0,
    totalRuns: 0,
    avgPace: '0:00'
  }
};

const DISCOVERY_USERS: UserProfile[] = [
  {
    id: 'u_2',
    username: 'TrailBlazer',
    avatar: 'https://images.unsplash.com/photo-1530541930197-ff16ac917b0e?w=400&h=400&fit=crop',
    bio: 'Pacing for the long haul.',
    joinedClubIds: ['c1'],
    friendIds: [],
    isSetup: true,
    unitSystem: 'metric',
    stats: { totalDistance: 142, totalRuns: 28, avgPace: '5:12' }
  },
  {
    id: 'u_3',
    username: 'CityStrider',
    avatar: 'https://images.unsplash.com/photo-1532444458054-015fddf2b2ca?w=400&h=400&fit=crop',
    bio: 'Vertical gains and early mornings.',
    joinedClubIds: ['c1'],
    friendIds: [],
    isSetup: true,
    unitSystem: 'metric',
    stats: { totalDistance: 89, totalRuns: 15, avgPace: '6:05' }
  },
  {
    id: 'u_4',
    username: 'TempoRunner',
    avatar: 'https://images.unsplash.com/photo-1452626038306-9aae5e071dd3?w=400&h=400&fit=crop',
    bio: 'Consistency is my only goal.',
    joinedClubIds: [],
    friendIds: [],
    isSetup: true,
    unitSystem: 'metric',
    stats: { totalDistance: 210, totalRuns: 42, avgPace: '5:45' }
  }
];

export const storageService = {
  getRoutes: (): Route[] => {
    const data = localStorage.getItem(KEYS.ROUTES);
    return data ? JSON.parse(data) : [];
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
    
    const profile = storageService.getProfile();
    profile.stats.totalDistance += run.distance;
    profile.stats.totalRuns += 1;
    // Simple average update for demo
    profile.stats.avgPace = run.averagePace; 
    storageService.saveProfile(profile);
  },
  updateRun: (updatedRun: RunHistory) => {
    const runs = storageService.getRuns();
    const updated = runs.map(r => r.id === updatedRun.id ? updatedRun : r);
    localStorage.setItem(KEYS.RUNS, JSON.stringify(updated));
  },
  getProfile: (): UserProfile => {
    const data = localStorage.getItem(KEYS.PROFILE);
    const stored = data ? JSON.parse(data) : INITIAL_PROFILE;
    if (!stored.joinedClubIds) stored.joinedClubIds = [];
    if (!stored.friendIds) stored.friendIds = INITIAL_PROFILE.friendIds;
    if (!stored.theme) stored.theme = 'barista';
    if (!stored.unitSystem) stored.unitSystem = 'metric';
    if (stored.isSetup === undefined) stored.isSetup = false;
    return stored;
  },
  saveProfile: (profile: UserProfile) => {
    localStorage.setItem(KEYS.PROFILE, JSON.stringify(profile));
  },
  getAllUsers: (): UserProfile[] => {
    const data = localStorage.getItem(KEYS.USERS);
    return data ? JSON.parse(data) : DISCOVERY_USERS;
  },
  toggleFollowUser: (targetUserId: string) => {
    const profile = storageService.getProfile();
    const index = profile.friendIds.indexOf(targetUserId);
    if (index > -1) {
      profile.friendIds.splice(index, 1);
    } else {
      profile.friendIds.push(targetUserId);
    }
    storageService.saveProfile(profile);
    return profile;
  },
  getClubs: (): RunClub[] => {
    const data = localStorage.getItem(KEYS.CLUBS);
    return data ? JSON.parse(data) : [];
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
  },
  getReviews: (): Review[] => {
    const data = localStorage.getItem(KEYS.REVIEWS);
    return data ? JSON.parse(data) : [];
  },
  saveReview: (review: Review) => {
    const reviews = storageService.getReviews();
    const updated = [review, ...reviews];
    localStorage.setItem(KEYS.REVIEWS, JSON.stringify(updated));

    const runs = storageService.getRuns();
    const targetRun = runs.find(r => r.routeId === review.routeId && !r.reviewId);
    if (targetRun) {
      targetRun.reviewId = review.id;
      storageService.updateRun(targetRun);
    }

    const routes = storageService.getRoutes();
    const targetRoute = routes.find(r => r.id === review.routeId);
    if (targetRoute) {
      const routeReviews = updated.filter(r => r.routeId === review.routeId);
      const avgRating = routeReviews.reduce((acc, r) => acc + r.rating, 0) / routeReviews.length;
      targetRoute.rating = parseFloat(avgRating.toFixed(1));
      targetRoute.rating = isNaN(targetRoute.rating) ? 0 : targetRoute.rating;
      storageService.updateRoute(targetRoute);
    }
  }
};
