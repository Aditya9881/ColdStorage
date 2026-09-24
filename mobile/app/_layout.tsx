import { Stack, useRouter, useSegments } from 'expo-router';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import { AuthProvider, useAuth } from '@/contexts/AuthContext';
import { SyncProvider } from '@/contexts/SyncContext';
import { NotificationProvider } from '@/contexts/NotificationContext';
import { ToastProvider } from '@/components/ui';
import {
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
  Inter_800ExtraBold,
  useFonts,
} from '@expo-google-fonts/inter';

// Prevent auto-hide splash screen
SplashScreen.preventAutoHideAsync();

/** Shared header style for all Stack.Screen */
const headerStyle = { backgroundColor: '#2D6A4F' };
const headerTitleStyle = { fontWeight: '700' as const, fontFamily: 'Inter_700Bold' };
const headerOptions = {
  headerBackTitle: 'Back',
  headerStyle,
  headerTintColor: '#FFF',
  headerTitleStyle,
};

function RootLayoutNav() {
  const { isAuthenticated, isLoading, user } = useAuth();
  const segments = useSegments();
  const router = useRouter();
  const [isNavigationReady, setIsNavigationReady] = useState(false);

  useEffect(() => {
    if (isLoading) return;

    const firstSegment = segments[0] || '';
    const inAuthGroup = firstSegment === '(auth)';
    const onDiscover = firstSegment === 'discover';
    const inFarmerGroup = firstSegment === '(tabs)';
    const inOwnerGroup = firstSegment === '(owner)';
    const inBuyerGroup = firstSegment === '(buyer)';

    // Screens that unauthenticated users CAN access
    const isPublicScreen = inAuthGroup || onDiscover;

    if (!isAuthenticated) {
      // Not logged in → send to Discover page (not login)
      // Allow auth screens (login/register) and discover page
      if (!isPublicScreen) {
        router.replace('/discover');
      }
    } else {
      // ── Authenticated — enforce role-based routing ──
      const role = user?.role;

      // Determine which dashboard this role should be on
      const correctGroup =
        role === 'BUYER' ? '(buyer)' :
        role === 'OWNER' || role === 'STAFF' ? '(owner)' :
        '(tabs)'; // FARMER is default

      // Check if user is on the WRONG role's dashboard
      const isOnWrongDashboard =
        (inFarmerGroup && correctGroup !== '(tabs)') ||
        (inOwnerGroup && correctGroup !== '(owner)') ||
        (inBuyerGroup && correctGroup !== '(buyer)');

      // Redirect from auth/discover screens OR if on wrong dashboard
      if (inAuthGroup || onDiscover || isOnWrongDashboard) {
        if (role === 'BUYER') {
          router.replace('/(buyer)');
        } else if (role === 'OWNER' || role === 'STAFF') {
          router.replace('/(owner)');
        } else {
          router.replace('/(tabs)');
        }
      }
    }

    // Mark navigation as ready after first auth check
    if (!isNavigationReady) {
      setIsNavigationReady(true);
    }
  }, [isAuthenticated, isLoading, user, segments]);

  // ── CRITICAL: Don't render ANY routes until auth state is determined ──
  // This prevents flash of buyer/owner/farmer dashboard before login check completes
  if (isLoading || !isNavigationReady) {
    return null;
  }

  return (
    <Stack>
      {/* Auth group */}
      <Stack.Screen name="(auth)" options={{ headerShown: false }} />

      {/* Farmer tabs group */}
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />

      {/* Buyer tabs group */}
      <Stack.Screen name="(buyer)" options={{ headerShown: false }} />

      {/* Owner tabs group */}
      <Stack.Screen name="(owner)" options={{ headerShown: false }} />

      {/* Shared detail screens */}
      <Stack.Screen name="lots/[id]" options={{ title: 'Lot Details', ...headerOptions }} />
      <Stack.Screen name="kyc/reupload" options={{ title: 'KYC Documents', ...headerOptions }} />
      <Stack.Screen name="facility/[id]" options={{ title: 'Facility Details', ...headerOptions }} />
      <Stack.Screen name="listing/create" options={{ title: 'List for Sale', presentation: 'modal', ...headerOptions }} />
      <Stack.Screen name="listing/[id]" options={{ title: 'Listing Details', ...headerOptions }} />
      <Stack.Screen name="place-order/[id]" options={{ title: 'Place Order', presentation: 'modal', ...headerOptions }} />
      <Stack.Screen name="orders/index" options={{ title: 'Orders', ...headerOptions }} />
      <Stack.Screen name="orders/[id]" options={{ title: 'Order Details', ...headerOptions }} />
      <Stack.Screen name="market-prices/index" options={{ headerShown: false }} />
      <Stack.Screen name="notifications" options={{ title: 'Notifications', ...headerOptions }} />
      {/* Invoices */}
      <Stack.Screen name="invoices/index" options={{ title: 'Invoices', ...headerOptions }} />
      <Stack.Screen name="invoices/[id]" options={{ title: 'Invoice Details', ...headerOptions }} />
      {/* Warehouse Receipts */}
      <Stack.Screen name="receipts/index" options={{ title: 'Warehouse Receipts', ...headerOptions }} />
      <Stack.Screen name="receipts/[id]" options={{ title: 'Receipt Details', ...headerOptions }} />
      {/* Reviews */}
      <Stack.Screen name="facility/review" options={{ title: 'Write Review', presentation: 'modal', ...headerOptions }} />
      {/* Escrow */}
      <Stack.Screen name="orders/payment" options={{ title: 'Make Payment', presentation: 'modal', ...headerOptions }} />
      <Stack.Screen name="orders/escrow-status" options={{ title: 'Payment Status', ...headerOptions }} />
      {/* Settings */}
      <Stack.Screen name="settings" options={{ title: 'Settings', ...headerOptions }} />
      {/* Edit Profile */}
      <Stack.Screen name="edit-profile" options={{ headerShown: false }} />
      {/* Bookings */}
      <Stack.Screen name="book-storage" options={{ headerShown: false }} />
      <Stack.Screen name="bookings" options={{ headerShown: false }} />
      <Stack.Screen name="booking/[id]" options={{ headerShown: false }} />
      {/* Owner booking screens */}
      <Stack.Screen name="owner-booking/weigh" options={{ headerShown: false }} />
      <Stack.Screen name="discover" options={{ headerShown: false }} />
      <Stack.Screen name="+not-found" />
    </Stack>
  );
}

export default function RootLayout() {
  const [fontsLoaded] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
    Inter_800ExtraBold,
  });

  useEffect(() => {
    if (fontsLoaded) {
      // Small delay so splash doesn't flash
      setTimeout(() => SplashScreen.hideAsync(), 300);
    }
  }, [fontsLoaded]);

  if (!fontsLoaded) return null;

  return (
    <SafeAreaProvider>
      <SyncProvider>
        <AuthProvider>
          <NotificationProvider>
            <ToastProvider>
              <RootLayoutNav />
              <StatusBar style="light" />
            </ToastProvider>
          </NotificationProvider>
        </AuthProvider>
      </SyncProvider>
    </SafeAreaProvider>
  );
}
