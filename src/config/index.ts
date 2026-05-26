import Constants from 'expo-constants';

export const GOOGLE_PLACES_API_KEY: string =
    (Constants.expoConfig?.extra?.googlePlacesApiKey as string) ?? '';
