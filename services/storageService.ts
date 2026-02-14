
import { Route, RunHistory, UserProfile, Difficulty, RunClub, Review } from '../types';

const KEYS = {
  ROUTES: 'velocity_routes',
  RUNS: 'velocity_runs',
  PROFILE: 'velocity_profile',
  CLUBS: 'velocity_clubs',
  REVIEWS: 'velocity_reviews',
  USERS: 'velocity_all_users',
  ACTIVE_SESSION: 'velocity_active_session',
  CREDENTIALS: 'velocity_credentials',
  REMEMBER_ME: 'velocity_remember_me',
};

const DEFAULT_AVATAR = 'https://images.unsplash.com/photo-1476480862126-209bfaa8edc8?w=400&h=400&fit=crop';

const MOCK_USERS: UserProfile[] = [
  {
    id: 'u_2',
    username: 'TrailBlazer',
    avatar: 'https://images.unsplash.com/photo-1530541930197-ff16ac917b0e?w=400&h=400&fit=crop',
    bio: 'Pacing for the long haul.',
    joinedClubIds: ['c1'],
    friendIds: [],
    isSetup: true,
    unitSystem: 'imperial',
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
    unitSystem: 'imperial',
    stats: { totalDistance: 89, totalRuns: 15, avgPace: '6:05' }
  }
];

async function hashPassword(password: string): Promise<string> {
  const msgBuffer = new TextEncoder().encode(password);
  const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

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
    if (profile) {
      profile.stats.totalDistance += run.distance;
      profile.stats.totalRuns += 1;
      profile.stats.avgPace = run.averagePace; 
      storageService.saveProfile(profile);
    }
  },
  updateRun: (updatedRun: RunHistory) => {
    const runs = storageService.getRuns();
    const updated = runs.map(r => r.id === updatedRun.id ? updatedRun : r);
    localStorage.setItem(KEYS.RUNS, JSON.stringify(updated));
  },
  
  // SESSION & USER MANAGEMENT
  getActiveSession: (): string | null => {
    // Check localStorage first (persistent session)
    let id = localStorage.getItem(KEYS.ACTIVE_SESSION);
    if (!id) {
      // Check sessionStorage (temporary session)
      id = sessionStorage.getItem(KEYS.ACTIVE_SESSION);
    }
    return id;
  },
  setActiveSession: (userId: string | null, remember: boolean = true) => {
    if (userId) {
      if (remember) {
        localStorage.setItem(KEYS.ACTIVE_SESSION, userId);
        localStorage.setItem(KEYS.REMEMBER_ME, 'true');
      } else {
        sessionStorage.setItem(KEYS.ACTIVE_SESSION, userId);
        localStorage.removeItem(KEYS.REMEMBER_ME);
      }
    } else {
      localStorage.removeItem(KEYS.ACTIVE_SESSION);
      sessionStorage.removeItem(KEYS.ACTIVE_SESSION);
      localStorage.removeItem(KEYS.REMEMBER_ME);
    }
  },
  getAllUsers: (): UserProfile[] => {
    const data = localStorage.getItem(KEYS.USERS);
    const users = data ? JSON.parse(data) : MOCK_USERS;
    return users;
  },
  getProfile: (): UserProfile | null => {
    const activeId = storageService.getActiveSession();
    if (!activeId) return null;
    const users = storageService.getAllUsers();
    return users.find(u => u.id === activeId) || null;
  },
  saveProfile: (profile: UserProfile) => {
    const users = storageService.getAllUsers();
    const existingIndex = users.findIndex(u => u.id === profile.id);
    let updatedUsers;
    if (existingIndex > -1) {
      updatedUsers = [...users];
      updatedUsers[existingIndex] = profile;
    } else {
      updatedUsers = [profile, ...users];
    }
    localStorage.setItem(KEYS.USERS, JSON.stringify(updatedUsers));
  },

  getCredentials: (): Record<string, string> => {
    const data = localStorage.getItem(KEYS.CREDENTIALS);
    return data ? JSON.parse(data) : {};
  },
  saveCredential: (userId: string, hash: string) => {
    const creds = storageService.getCredentials();
    creds[userId] = hash;
    localStorage.setItem(KEYS.CREDENTIALS, JSON.stringify(creds));
  },

  login: async (username: string, password: string, remember: boolean = true): Promise<UserProfile | null> => {
    const users = storageService.getAllUsers();
    const user = users.find(u => u.username.toLowerCase() === username.toLowerCase());
    if (user) {
      const creds = storageService.getCredentials();
      const storedHash = creds[user.id];
      if (!storedHash) {
        storageService.setActiveSession(user.id, remember);
        return user;
      }
      const inputHash = await hashPassword(password);
      if (inputHash === storedHash) {
        storageService.setActiveSession(user.id, remember);
        return user;
      }
    }
    return null;
  },

  signup: async (username: string, password: string, remember: boolean = true): Promise<UserProfile | null> => {
    const users = storageService.getAllUsers();
    const exists = users.find(u => u.username.toLowerCase() === username.toLowerCase());
    if (exists) return null;

    const userId = Math.random().toString(36).substr(2, 9);
    const hashedPassword = await hashPassword(password);

    const newUser: UserProfile = {
      id: userId,
      username,
      avatar: DEFAULT_AVATAR,
      bio: '',
      joinedClubIds: [],
      friendIds: [],
      isSetup: false,
      unitSystem: 'imperial',
      stats: { totalDistance: 0, totalRuns: 0, avgPace: '0:00' }
    };

    storageService.saveProfile(newUser);
    storageService.saveCredential(userId, hashedPassword);
    storageService.setActiveSession(newUser.id, remember);
    return newUser;
  },

  logout: () => {
    storageService.setActiveSession(null);
  },

  toggleFollowUser: (targetUserId: string) => {
    const profile = storageService.getProfile();
    if (!profile) return null;
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
    if (!profile) return null;
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
