import { CharityMapScreen } from '@/screens/charity/CharityMapScreen';
import { ClaimConfirmationScreen } from '@/screens/charity/ClaimConfirmationScreen';
import { createNativeStackNavigator } from '@react-navigation/native-stack';


type CharityStackParamList = {
  CharityMap: undefined;
  ClaimConfirm: undefined;
};

const Stack = createNativeStackNavigator<CharityStackParamList>();

export function CharityStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
        <Stack.Screen name="CharityMap" component={CharityMapScreen} />
        <Stack.Screen name="ClaimConfirm" component={ClaimConfirmationScreen} />
    </Stack.Navigator>
  );
}