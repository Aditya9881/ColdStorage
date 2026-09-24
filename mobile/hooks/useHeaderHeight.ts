/**
 * useHeaderHeight — Returns the correct top padding for screen headers.
 * 
 * Uses `useSafeAreaInsets()` from react-native-safe-area-context to
 * dynamically calculate the correct padding for notches, camera cutouts,
 * and status bars on both iOS and Android.
 *
 * Usage:
 *   const { top } = useHeaderHeight();
 *   <View style={{ paddingTop: top }}>...</View>
 */
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export function useHeaderHeight(extraPadding = 12) {
  const insets = useSafeAreaInsets();
  return {
    /** Total top padding = safe area inset + extra padding */
    top: insets.top + extraPadding,
    /** Raw safe area inset (no extra padding) */
    insetTop: insets.top,
    /** Bottom safe area inset */
    bottom: insets.bottom,
    /** All insets */
    insets,
  };
}
