import { Tabs } from 'expo-router';
import { Home, Search, ShoppingBag, Receipt, User } from 'lucide-react-native';
import { Platform, StyleSheet } from 'react-native';
import { COLORS } from '@/lib/theme';

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: COLORS.gold,
        tabBarInactiveTintColor: COLORS.onSurfaceTertiary,
        tabBarStyle: styles.tabBar,
        tabBarLabelStyle: styles.tabBarLabel,
        tabBarItemStyle: styles.tabBarItem,
        tabBarIconStyle: styles.tabBarIcon,
      }}
    >
      <Tabs.Screen name="home" options={{ title: 'Home', tabBarIcon: ({ size, color }) => <Home size={size} color={color} /> }} />
      <Tabs.Screen name="menu" options={{ title: 'Menu', tabBarIcon: ({ size, color }) => <Search size={size} color={color} /> }} />
      <Tabs.Screen name="cart" options={{ title: 'Cart', tabBarIcon: ({ size, color }) => <ShoppingBag size={size} color={color} /> }} />
      <Tabs.Screen name="orders" options={{ title: 'Orders', tabBarIcon: ({ size, color }) => <Receipt size={size} color={color} /> }} />
      <Tabs.Screen name="profile" options={{ title: 'Profile', tabBarIcon: ({ size, color }) => <User size={size} color={color} /> }} />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  tabBar: { position: 'absolute', backgroundColor: COLORS.glass, borderTopColor: COLORS.border, borderTopWidth: StyleSheet.hairlineWidth, height: 64, paddingHorizontal: 8, paddingBottom: 8, paddingTop: 8 },
  tabBarLabel: { fontFamily: 'PlusJakartaSans-Medium', fontSize: 11, marginTop: 2 },
  tabBarItem: { gap: 2 },
  tabBarIcon: { marginBottom: 0 },
});
