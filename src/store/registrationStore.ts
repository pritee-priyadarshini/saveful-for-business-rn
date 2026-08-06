import { create } from 'zustand';
import { CharityForm, FarmerForm, RestaurantForm } from './types';
import { DEFAULT_COUNTRY_CODE, DEFAULT_COUNTRY_ISO } from '../data/countryCodes';

const DEFAULT_RESTAURANT_FORM: RestaurantForm = {
  firstName: '',
  lastName: '',
  email: '',
  password: '',
  confirmPassword: '',
  mobile: '',
  mobileCountryCode: DEFAULT_COUNTRY_CODE,
  mobileCountryIso: DEFAULT_COUNTRY_ISO,
  businessName: '',
  businessAddress: '',
  registrationNumber: '',
  venueType: '',
  branding: '',
  logo: '',
  region: '',
  latitude: '',
  longitude: '',
};

const DEFAULT_CHARITY_FORM: CharityForm = {
  firstName: '',
  lastName: '',
  email: '',
  password: '',
  confirmPassword: '',
  mobile: '',
  mobileCountryCode: DEFAULT_COUNTRY_CODE,
  mobileCountryIso: DEFAULT_COUNTRY_ISO,
  charityName: '',
  charityAddress: '',
  registrationNumber: '',
  branding: '',
  logo: '',
  postcodes: '',
  pickupRadius: '50',
  region: '',
  latitude: '',
  longitude: '',
  pickupPostCode: '',
};

const DEFAULT_FARMER_FORM: FarmerForm = {
  firstName: '',
  lastName: '',
  email: '',
  password: '',
  confirmPassword: '',
  mobile: '',
  mobileCountryCode: DEFAULT_COUNTRY_CODE,
  mobileCountryIso: DEFAULT_COUNTRY_ISO,
  businessName: '',
  businessAddress: '',
  venueType: '',
  branding: '',
  logo: '',
  region: '',
  latitude: '',
  longitude: '',
};

interface RegistrationState {
  restaurantForm: RestaurantForm;
  charityForm: CharityForm;
  farmerForm: FarmerForm;
}

interface RegistrationActions {
  updateRestaurantField: (field: keyof RestaurantForm, value: string) => void;
  updateCharityField: (field: keyof CharityForm, value: string) => void;
  updateFarmerField: (field: keyof FarmerForm, value: string) => void;
  resetForms: () => void;
}

const INITIAL: RegistrationState = {
  restaurantForm: DEFAULT_RESTAURANT_FORM,
  charityForm: DEFAULT_CHARITY_FORM,
  farmerForm: DEFAULT_FARMER_FORM,
};

export const useRegistrationStore = create<RegistrationState & RegistrationActions>(
  (set) => ({
    ...INITIAL,

    updateRestaurantField: (field, value) =>
      set((state) => ({
        restaurantForm: { ...state.restaurantForm, [field]: value },
      })),

    updateCharityField: (field, value) =>
      set((state) => ({
        charityForm: { ...state.charityForm, [field]: value },
      })),

    updateFarmerField: (field, value) =>
      set((state) => ({
        farmerForm: { ...state.farmerForm, [field]: value },
      })),

    resetForms: () => set(INITIAL),
  }),
);
