/**
 * ColdStorage — Farmer Tab Bar
 *
 * 4 tabs: Home, Bookings, Mandi Prices, Profile
 * - Floating pill-style nav bar
 * - Fixed Android bottom spacing
 * - Haptic feedback
 */
import React from 'react';
import { Tabs } from 'expo-router';
import { Platform, View, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { Colors, Shadows, FontFamily } from '@/constants/Colors';
import { useColorScheme } from 'react-native';
import { useNotifications } from '@/contexts/NotificationContext';
import { hapticLight } from '@/lib/haptics';

export default function TabLayout() {
  const colorScheme = (useColorScheme() ?? 'light') as 'light' | 'dark';
  const colors = Colors[colorScheme];
  const { unreadCount } = useNotifications();

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.tabIconDefault,
        tabBarStyle: {
          position: 'absolute',
          bottom: Platform.OS === 'ios' ? 24 : 8,
          left: 16,
          right: 16,
          height: Platform.OS === 'ios' ? 64 : 60,
          borderRadius: 22,
          backgroundColor: Platform.OS === 'ios'
            ? 'transparent'
            : (colorScheme === 'dark' ? '#1C2620' : '#FFFFFF'),
          borderTopWidth: 0,
          borderWidth: 1,
          borderColor: colorScheme === 'dark'
            ? 'rgba(255,255,255,0.06)'
            : 'rgba(0,0,0,0.04)',
          paddingBottom: 0,
          paddingTop: 0,
          ...Shadows.floating,
          elevation: 12,
        },
        tabBarBackground: () =>
          Platform.OS === 'ios' ? (
            <BlurView
              intensity={80}
              tint={colorScheme === 'dark' ? 'dark' : 'light'}
              style={[StyleSheet.absoluteFill, { borderRadius: 22, overflow: 'hidden' }]}
            />
          ) : null,
        tabBarLabelStyle: {
          fontSize: 10,
          fontWeight: '600',
          fontFamily: FontFamily.semibold,
          marginTop: -2,
          marginBottom: Platform.OS === 'ios' ? 0 : 8,
        },
        tabBarItemStyle: {
          paddingTop: 8,
          paddingBottom: Platform.OS === 'ios' ? 8 : 2,
        },
        tabBarIconStyle: {
          marginBottom: -2,
        },
        headerStyle: {
          backgroundColor: colors.primary,
          elevation: 0,
          shadowOpacity: 0,
        },
        headerTintColor: '#FFFFFF',
        headerTitleStyle: {
          fontWeight: '700',
          fontSize: 18,
          fontFamily: FontFamily.bold,
        },
      }}
      screenListeners={{
        tabPress: () => hapticLight(),
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
          headerTitle: 'ColdStorage',
          headerShown: false,
          tabBarIcon: ({ color, focused }) => (
            <View style={focused ? tabS.activePill : undefined}>
              <Ionicons name={focused ? 'home' : 'home-outline'} size={22} color={color} />
              {unreadCount > 0 && (
                <View style={tabS.badge}>
                  <View style={tabS.badgeDot} />
                </View>
              )}
            </View>
          ),
        }}
      />

      {/* Hide Inventory/Ledger from tab bar — accessible via Quick Actions */}
      <Tabs.Screen
        name="inventory"
        options={{
          href: null,
        }}
      />

      {/* Hide Marketplace from tab bar — accessible via Quick Actions */}
      <Tabs.Screen
        name="marketplace"
        options={{
          href: null,
        }}
      />

      <Tabs.Screen
        name="bookings"
        options={{
          title: 'Bookings',
          headerShown: false,
          tabBarIcon: ({ color, focused }) => (
            <View style={focused ? tabS.activePill : undefined}>
              <Ionicons name={focused ? 'calendar' : 'calendar-outline'} size={22} color={color} />
            </View>
          ),
        }}
      />

      {/* Hide farmer-discover from tab bar — accessible via See All / Quick Actions */}
      <Tabs.Screen
        name="farmer-discover"
        options={{
          href: null,
        }}
      />

      <Tabs.Screen
        name="mandi-prices"
        options={{
          title: 'Mandi Prices',
          headerShown: false,
          tabBarIcon: ({ color, focused }) => (
            <View style={focused ? tabS.activePill : undefined}>
              <Ionicons name={focused ? 'trending-up' : 'trending-up-outline'} size={22} color={color} />
            </View>
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          headerTitle: 'My Profile',
          headerShown: false,
          tabBarIcon: ({ color, focused }) => (
            <View style={focused ? tabS.activePill : undefined}>
              <Ionicons name={focused ? 'person-circle' : 'person-circle-outline'} size={22} color={color} />
            </View>
          ),
        }}
      />
    </Tabs>
  );
}

const tabS = StyleSheet.create({
  activePill: {
    backgroundColor: 'rgba(27, 94, 74, 0.1)',
    borderRadius: 12,
    padding: 6,
    marginTop: -4,
  },
  badge: {
    position: 'absolute',
    top: -2,
    right: -4,
  },
  badgeDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#DC2626',
    borderWidth: 1.5,
    borderColor: '#FFFFFF',
  },
});
