import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { RestaurantListingsScreen } from '../screens/restaurant/RestaurantListingsScreen';
import { CreateListingScreen } from '@/screens/restaurant/CreateListingScreen';
import { ListingConfirmationScreen } from '@/screens/restaurant/ListingConfirmationScreen';
import CollectionHistoryScreen from '@/screens/restaurant/CollectionHistoryScreen';


type RestaurantStackParamList = {
  RestaurantListings: undefined;
  CreateListing: undefined;
  ListingConfirmation: undefined;
  CollectionHistory: undefined;
};

const Stack = createNativeStackNavigator<RestaurantStackParamList>();

export function RestaurantStack() {
  return (
    <Stack.Navigator initialRouteName="RestaurantListings" screenOptions={{ headerShown: false }}>
      <Stack.Screen name="RestaurantListings" component={RestaurantListingsScreen} />
      <Stack.Screen name="CreateListing" component={CreateListingScreen} />
      <Stack.Screen name="ListingConfirmation" component={ ListingConfirmationScreen } />
      <Stack.Screen name="CollectionHistory" component={CollectionHistoryScreen} />
    </Stack.Navigator>
  );
}