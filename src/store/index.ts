export { useAuthStore } from './authStore';
export { useRegistrationStore } from './registrationStore';
export { useListingsStore } from './listingsStore';
export { useDiscoverStore } from './discoverStore';
export { useDashboardStore } from './dashboardStore';
export { useSitesStore } from './sitesStore';
export { useCharityStore } from './charityStore';
export { useNotificationsStore } from './notificationsStore';

export type {
  RestaurantForm,
  CharityForm,
  FarmerForm,
  AuthUser,
  Subscription,
  RoleFlow,
  AppContextValue,
} from './types';

import { useListingsStore } from './listingsStore';
import { useDiscoverStore } from './discoverStore';
import { useDashboardStore } from './dashboardStore';
import { useSitesStore } from './sitesStore';
import { useCharityStore } from './charityStore';
import { useNotificationsStore } from './notificationsStore';
import { clearListingDetailCache } from '../services/foodListing.service';

export function resetAllDataStores(): void {
  clearListingDetailCache();
  useListingsStore.getState().reset();
  useDiscoverStore.getState().reset();
  useDashboardStore.getState().reset();
  useSitesStore.getState().reset();
  useCharityStore.getState().reset();
  useNotificationsStore.getState().reset();
}
