/**
 * ColdStorage Mobile — Sync Badge
 *
 * A compact status indicator that shows:
 * - 🟢 Online + synced → hidden (no visual noise)
 * - 🔄 Syncing → animated spinner with "Syncing..."
 * - 🟡 Pending mutations → "3 pending" badge
 * - 🔴 Offline → "Offline" banner
 * - 🕐 Stale data → "Last synced: 2h ago"
 */
import React from 'react';
import { View, Text, StyleSheet, Animated, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSync } from '@/contexts/SyncContext';

function getTimeAgo(isoString: string | null): string {
  if (!isoString) return 'Never';
  const diff = Date.now() - new Date(isoString).getTime();
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return 'Just now';
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

export default function SyncBadge() {
  const { isOnline, isSyncing, pendingCount, lastSyncTime, syncNow } = useSync();

  // Fully online, nothing pending, recently synced → hide
  if (isOnline && pendingCount === 0 && !isSyncing) {
    // Show subtle "last synced" if it's been more than 30 minutes
    if (lastSyncTime) {
      const diff = Date.now() - new Date(lastSyncTime).getTime();
      if (diff < 30 * 60 * 1000) return null; // Fresh — hide completely
    } else {
      return null;
    }
  }

  const getStatusConfig = () => {
    if (!isOnline) {
      return {
        icon: 'cloud-offline-outline' as const,
        text: 'Offline',
        subtext: pendingCount > 0 ? `${pendingCount} changes queued` : 'Changes will sync when online',
        bgColor: '#FEE2E2',
        textColor: '#DC2626',
        iconColor: '#DC2626',
      };
    }
    if (isSyncing) {
      return {
        icon: 'sync-outline' as const,
        text: 'Syncing...',
        subtext: `${pendingCount} remaining`,
        bgColor: '#DBEAFE',
        textColor: '#2563EB',
        iconColor: '#2563EB',
      };
    }
    if (pendingCount > 0) {
      return {
        icon: 'time-outline' as const,
        text: `${pendingCount} pending`,
        subtext: 'Tap to sync now',
        bgColor: '#FEF3C7',
        textColor: '#D97706',
        iconColor: '#D97706',
      };
    }
    return {
      icon: 'checkmark-circle-outline' as const,
      text: `Synced ${getTimeAgo(lastSyncTime)}`,
      subtext: null,
      bgColor: '#F3F4F6',
      textColor: '#6B7280',
      iconColor: '#6B7280',
    };
  };

  const config = getStatusConfig();

  return (
    <TouchableOpacity
      onPress={isOnline && pendingCount > 0 ? syncNow : undefined}
      activeOpacity={isOnline && pendingCount > 0 ? 0.7 : 1}
      style={[styles.container, { backgroundColor: config.bgColor }]}
    >
      <Ionicons name={config.icon} size={16} color={config.iconColor} />
      <View style={styles.textContainer}>
        <Text style={[styles.mainText, { color: config.textColor }]}>{config.text}</Text>
        {config.subtext && (
          <Text style={[styles.subText, { color: config.textColor }]}>{config.subtext}</Text>
        )}
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    marginHorizontal: 16,
    marginBottom: 8,
    gap: 8,
  },
  textContainer: {
    flex: 1,
  },
  mainText: {
    fontSize: 13,
    fontWeight: '600',
  },
  subText: {
    fontSize: 11,
    opacity: 0.8,
    marginTop: 1,
  },
});
