import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { RestaurantListingsScreen } from '../screens/restaurant/RestaurantListingsScreen';
import { CreateListingScreen } from '@/screens/restaurant/CreateListingScreen';
import { CreateFarmListingScreen } from '@/screens/restaurant/CreateFarmListingScreen';
import { EditListingScreen } from '@/screens/restaurant/EditListingScreen';
import { ListingConfirmationScreen } from '@/screens/restaurant/ListingConfirmationScreen';
import CollectionHistoryScreen from '@/screens/restaurant/CollectionHistoryScreen';
import{ SurplusScreen } from '@/screens/restaurant/SurplusScreen';
import { palette } from '@/theme/colors';


type RestaurantStackParamList = {
  RestaurantListings: undefined;
  CreateListing: undefined;
  CreateFarmListing: undefined;
  FarmListingConfirmation: { listing: any };
  EditListing: { listingId: number };
  ListingConfirmation: { listing: any };
  CollectionHistory: undefined;
  Surplus: undefined;
};

const Stack = createNativeStackNavigator<RestaurantStackParamList>();

export function RestaurantStack() {
  return (
    <Stack.Navigator
      initialRouteName="RestaurantListings"
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: palette.creme },
      }}
    >
      <Stack.Screen name="RestaurantListings" component={RestaurantListingsScreen} />
      <Stack.Screen name="CreateListing" component={CreateListingScreen} />
      <Stack.Screen name="CreateFarmListing" component={CreateFarmListingScreen} />
      <Stack.Screen name="Surplus" component={SurplusScreen} />
      <Stack.Screen name="EditListing" component={EditListingScreen} />
      <Stack.Screen name="ListingConfirmation" component={ListingConfirmationScreen} />
      <Stack.Screen name="FarmListingConfirmation" component={ListingConfirmationScreen} />
      <Stack.Screen name="CollectionHistory" component={CollectionHistoryScreen} />
    </Stack.Navigator>
  );
}