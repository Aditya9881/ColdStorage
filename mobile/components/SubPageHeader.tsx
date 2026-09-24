/**
 * SubPageHeader — Clean white header for list/sub-dashboard screens.
 *
 * Matches the "My Storage" design language:
 * - White background, back arrow in a bordered circle
 * - Title (bold 22px) + optional subtitle (muted)
 * - Optional right-side action icon
 * - Handles safe area automatically
 *
 * Usage:
 *   <SubPageHeader title="Orders" subtitle="Track approvals and sales" />
 *   <SubPageHeader title="Notifications" subtitle="4 unread" rightIcon="notifications-outline" />
 */

import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { hapticLight } from '@/lib/haptics';

interface SubPageHeaderProps {
  title: string;
  subtitle?: string;
  /** Ionicons name for optional right action button */
  rightIcon?: React.ComponentProps<typeof Ionicons>['name'];
  rightIconColor?: string;
  onRightPress?: () => void;
  /** Custom right element (overrides rightIcon) */
  rightElement?: React.ReactNode;
}

export default function SubPageHeader({
  title,
  subtitle,
  rightIcon,
  rightIconColor = '#86908B',
  onRightPress,
  rightElement,
}: SubPageHeaderProps) {
  const insets = useSafeAreaInsets();
  const router = useRouter();

  return (
    <View style={[s.shell, { paddingTop: insets.top + 8 }]}>
      <View style={s.row}>
        <TouchableOpacity
          style={s.backBtn}
          onPress={() => { hapticLight(); router.back(); }}
          activeOpacity={0.84}
        >
          <Ionicons name="arrow-back" size={19} color="#0B2520" />
        </TouchableOpacity>

        <View style={s.titleWrap}>
          <Text style={s.title}>{title}</Text>
          {subtitle ? <Text style={s.subtitle}>{subtitle}</Text> : null}
        </View>

        {rightElement ? (
          rightElement
        ) : rightIcon ? (
          <TouchableOpacity
            style={s.actionBtn}
            onPress={onRightPress}
            activeOpacity={0.84}
          >
            <Ionicons name={rightIcon} size={20} color={rightIconColor} />
          </TouchableOpacity>
        ) : (
          <View style={s.spacer} />
        )}
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  shell: {
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 3,
    elevation: 2,
  },
  row: {
    paddingHorizontal: 16,
    paddingTop: 4,
    paddingBottom: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 13,
    backgroundColor: '#F2F5F0',
    borderWidth: 1,
    borderColor: '#E4E9E1',
    alignItems: 'center',
    justifyContent: 'center',
  },
  titleWrap: {
    flex: 1,
    minHeight: 40,
    justifyContent: 'center',
  },
  title: {
    fontSize: 22,
    lineHeight: 26,
    fontWeight: '800',
    color: '#0B2520',
    letterSpacing: -0.4,
  },
  subtitle: {
    fontSize: 12,
    lineHeight: 16,
    color: '#86908B',
    marginTop: 2,
    fontWeight: '500',
  },
  actionBtn: {
    width: 40,
    height: 40,
    borderRadius: 13,
    backgroundColor: '#F2F5F0',
    borderWidth: 1,
    borderColor: '#E4E9E1',
    alignItems: 'center',
    justifyContent: 'center',
  },
  spacer: {
    width: 40,
    height: 40,
  },
});
