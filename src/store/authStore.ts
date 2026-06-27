import { create } from 'zustand';
import * as SecureStore from 'expo-secure-store';
import { AuthUser, RoleFlow } from './types';
import { UserRole } from '../types';
import { authService } from '../services/auth.service';
import { organizationService } from '../services/organization.service';
import { buildAuthUserFromProfile, resolveUserRole } from '../utils/authSession';

interface AuthState {
  isAuthenticated: boolean;
  isInitialLoading: boolean;
  authUser: AuthUser | null;
  selectedRole: UserRole;
  roleFlow: RoleFlow;
  selectedPlanId: string;
}

interface AuthActions {
  setAuthUser: (user: AuthUser | null) => void;
  setAuthenticated: (auth: boolean) => void;
  setRole: (role: UserRole) => void;
  setRoleFlow: (flow: RoleFlow) => void;
  selectPlan: (planId: string) => void;
  setInitialLoading: (loading: boolean) => void;
  restoreSession: () => Promise<void>;
  refreshProfile: () => Promise<void>;
  updateCoordinates: (
    organizationId: number | string,
    latitude: number,
    longitude: number,
  ) => Promise<void>;
  logout: () => Promise<void>;
}

const INITIAL: AuthState = {
  isAuthenticated: false,
  isInitialLoading: true,
  authUser: null,
  selectedRole: 'restaurant_single',
  roleFlow: 'producer',
  selectedPlanId: 'single_plus',
};

export const useAuthStore = create<AuthState & AuthActions>((set, get) => ({
  ...INITIAL,

  setAuthUser: (user) => set({ authUser: user, isAuthenticated: !!user }),

  setAuthenticated: (auth) => set({ isAuthenticated: auth }),

  setRole: (role) => set({ selectedRole: role }),

  setRoleFlow: (flow) => set({ roleFlow: flow }),

  selectPlan: (planId) => set({ selectedPlanId: planId }),

  setInitialLoading: (loading) => set({ isInitialLoading: loading }),

  restoreSession: async () => {
    try {
      const token = await SecureStore.getItemAsync('accessToken');
      if (token) {
        const profileRes = await authService.profile();
        const authUser = buildAuthUserFromProfile(profileRes.data, token);
        set({
          authUser,
          isAuthenticated: true,
          selectedRole: resolveUserRole(authUser),
        });
      }
    } catch (error) {
      console.log('SESSION RESTORE ERROR', error);
      await SecureStore.deleteItemAsync('accessToken');
    } finally {
      set({ isInitialLoading: false });
    }
  },

  refreshProfile: async () => {
    const { authUser: currentUser } = get();
    if (!currentUser?.accessToken) return;

    try {
      const profileRes = await authService.profile();
      const nextProfile = profileRes.data as any;
      const authUser = buildAuthUserFromProfile(
        nextProfile,
        currentUser.accessToken,
      );

      set({
        authUser,
        selectedRole: resolveUserRole(authUser, get().selectedRole),
      });
    } catch {
      // keep existing profile data
    }
  },

  updateCoordinates: async (organizationId, latitude, longitude) => {
    await organizationService.updateCoordinates(organizationId, {
      latitude,
      longitude,
    });
    await get().refreshProfile();
  },

  logout: async () => {
    await SecureStore.deleteItemAsync('accessToken');
    set({
      isAuthenticated: false,
      authUser: null,
      selectedRole: 'restaurant_single',
      roleFlow: 'producer',
    });
  },
}));
