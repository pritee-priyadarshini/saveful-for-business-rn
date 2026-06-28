import { CharityMapScreen } from '@/screens/charity/CharityMapScreen';
import CharityPickupScreen from '@/screens/charity/CharityPickupScreen';
import { createNativeStackNavigator } from '@react-navigation/native-stack';


type CharityStackParamList = {
  CharityMap: undefined;
  CharityPickup: undefined;
};

const Stack = createNativeStackNavigator<CharityStackParamList>();

export function CharityStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
        <Stack.Screen name="CharityMap" component={CharityMapScreen} />
        <Stack.Screen name="CharityPickup" component={CharityPickupScreen} />
    </Stack.Navigator>
  );
}