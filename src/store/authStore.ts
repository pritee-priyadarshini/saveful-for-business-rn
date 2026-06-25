import { create } from 'zustand';
import * as SecureStore from 'expo-secure-store';
import { AuthUser, RoleFlow } from './types';
import { UserRole } from '../types';
import { authService } from '../services/auth.service';
import { organizationService } from '../services/organization.service';

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

  refreshProfile: async () => {
    const { authUser } = get();
    if (!authUser?.accessToken) return;

    try {
      const profileRes = await authService.profile();
      const nextProfile = profileRes.data as any;

      set({
        authUser: {
          ...nextProfile.user,
          accessToken: authUser.accessToken,
          orgType: nextProfile.organisation?.type,
          orgRole: nextProfile.role?.orgRole,
          siteRole: nextProfile.role?.siteRole,
          profile: nextProfile,
        },
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
