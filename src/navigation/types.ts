export type AuthStackParamList = {
  Welcome: undefined;
  RoleSelection: undefined;
  Auth: undefined;
  EmailVerification: undefined;
  TeamInvite: undefined;
  SignIn: undefined;
  ForgotPassword: { from: 'SignIn' | 'Profile'; };
};

export type RestaurantTabsParamList = {
  Home: undefined;
  Listings: undefined;
  Insights: undefined;
  // Plans: undefined;
  Updates: undefined;
  Account: undefined;
};

export type CharityTabsParamList = {
  Home: undefined;
  Available: undefined;
  Impact: undefined;
  Updates: undefined;
  Account: undefined;
};

export type DriverStackParamList = {
  DriverDeliveries: undefined;
  DriverPickupConfirm: {
    pickup: any;
    onConfirm?: (id: string) => void;
  };
};