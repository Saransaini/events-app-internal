import { Tabs } from 'expo-router';
import { Text } from 'react-native';

export default function TabsLayout() {
  return (
    <Tabs screenOptions={{ headerShown: true }}>
      <Tabs.Screen
        name="discover"
        options={{ title: 'Discover', tabBarIcon: ({ color }) => <Text style={{ color }}>🐾</Text> }}
      />
      <Tabs.Screen
        name="matches"
        options={{ title: 'Matches', tabBarIcon: ({ color }) => <Text style={{ color }}>💌</Text> }}
      />
      <Tabs.Screen
        name="profile"
        options={{ title: 'Profile', tabBarIcon: ({ color }) => <Text style={{ color }}>🐶</Text> }}
      />
    </Tabs>
  );
}
