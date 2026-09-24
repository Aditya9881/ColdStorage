/**
 * SheetKosh — Haptic Feedback Utility
 *
 * Centralized haptic feedback for consistent tactile experience.
 * Wraps expo-haptics with convenient named functions.
 */
import * as Haptics from 'expo-haptics';
import { Platform } from 'react-native';

/** Light tap — for button presses, toggles */
export function hapticLight() {
  if (Platform.OS !== 'web') {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  }
}

/** Medium tap — for selection changes, tab switches */
export function hapticMedium() {
  if (Platform.OS !== 'web') {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
  }
}

/** Heavy tap — for important actions (submit, confirm) */
export function hapticHeavy() {
  if (Platform.OS !== 'web') {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
  }
}

/** Success — for completed actions */
export function hapticSuccess() {
  if (Platform.OS !== 'web') {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  }
}

/** Warning — for alerts, warnings */
export function hapticWarning() {
  if (Platform.OS !== 'web') {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
  }
}

/** Error — for failed actions */
export function hapticError() {
  if (Platform.OS !== 'web') {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
  }
}

/** Selection tick — for picker/slider changes */
export function hapticSelection() {
  if (Platform.OS !== 'web') {
    Haptics.selectionAsync();
  }
}
