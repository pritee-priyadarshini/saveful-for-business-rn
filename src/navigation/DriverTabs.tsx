import { DriverHistoryScreen } from "@/screens/driver/DriverHistoryScreen";
import { palette } from "@/theme/colors";
import { Ionicons } from "@expo/vector-icons";
import { BottomTabNavigationOptions, createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { DriverStack } from "./DriverStack";
import { DriverProfileScreen } from "@/screens/driver/DriverProfileScreen";

const DriverTab = createBottomTabNavigator();

const iconMap: Record<string, keyof typeof Ionicons.glyphMap> = {
    Deliveries: 'bicycle-outline',
    History: 'time-outline',
    Account: 'person-outline',
};

const screenOptions = ({ route }: any): BottomTabNavigationOptions => ({
    headerShown: false,
    tabBarActiveTintColor: palette.primary,
    tabBarInactiveTintColor: palette.textMuted,
    tabBarStyle: {
        height: 76,
        paddingBottom: 12,
        paddingTop: 10,
        backgroundColor: palette.surface,
        borderTopColor: palette.strokecream,
    },
    tabBarLabelStyle: {
        fontFamily: 'Saveful-SemiBold',
        fontSize: 11,
        textTransform: 'uppercase',
    },
    tabBarIcon: ({ color, size }: { color: string; size: number }) => (
        <Ionicons
            color={color}
            name={iconMap[route.name as keyof typeof iconMap]}
            size={size}
        />
    ),
});


export function DriverTabs() {
    return (
        <DriverTab.Navigator screenOptions={screenOptions}>
            <DriverTab.Screen name="Deliveries" component={DriverStack} />
            <DriverTab.Screen name="History" component={DriverHistoryScreen} />
            <DriverTab.Screen name="Account" component={DriverProfileScreen} />
        </DriverTab.Navigator>
    );
}