/**
 * DiscoverFeatures — Role-specific feature highlights grid.
 *
 * Shows 4 feature cards with icon, title, and description.
 * Designed for readability: high-contrast, no decorative effects.
 */

import React from 'react';
import {
  View,
  Text,
  StyleSheet,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { DiscoverRole } from './RoleSelectionModal';

interface Feature {
  icon: React.ComponentProps<typeof Ionicons>['name'];
  iconBg: string;
  iconColor: string;
  title: string;
  description: string;
}

const ROLE_FEATURES: Record<DiscoverRole, Feature[]> = {
  OWNER: [
    {
      icon: 'calendar-outline',
      iconBg: '#EEF4FF',
      iconColor: '#3B6FCF',
      title: 'Booking Management',
      description: 'Accept, track, and manage farmer bookings digitally',
    },
    {
      icon: 'thermometer-outline',
      iconBg: '#E8F5EE',
      iconColor: '#14532D',
      title: 'Chamber Monitoring',
      description: 'Real-time temperature and humidity tracking',
    },
    {
      icon: 'receipt-outline',
      iconBg: '#FFF7E8',
      iconColor: '#B8860B',
      title: 'Inventory & Billing',
      description: 'Track stock, generate invoices, manage payments',
    },
    {
      icon: 'star-outline',
      iconBg: '#FFF0F5',
      iconColor: '#C0392B',
      title: 'Get Discovered',
      description: 'Farmers find your facility on the SheetKosh marketplace',
    },
  ],
  FARMER: [
    {
      icon: 'search-outline',
      iconBg: '#E8F5EE',
      iconColor: '#14532D',
      title: 'Find Storage',
      description: 'Browse verified cold storages near you with live capacity',
    },
    {
      icon: 'phone-portrait-outline',
      iconBg: '#EEF4FF',
      iconColor: '#3B6FCF',
      title: 'Book Instantly',
      description: 'Reserve storage space and track your booking status',
    },
    {
      icon: 'trending-up-outline',
      iconBg: '#FFF7E8',
      iconColor: '#B8860B',
      title: 'Mandi Prices',
      description: 'Real-time market rates for your produce',
    },
    {
      icon: 'cube-outline',
      iconBg: '#F3EEFF',
      iconColor: '#6B3FA0',
      title: 'Track Your Lots',
      description: 'Monitor stored crops, charges, and release dates',
    },
  ],
  BUYER: [
    {
      icon: 'storefront-outline',
      iconBg: '#FFF7E8',
      iconColor: '#B8860B',
      title: 'Marketplace',
      description: 'Browse available produce directly from cold storages',
    },
    {
      icon: 'document-text-outline',
      iconBg: '#E8F5EE',
      iconColor: '#14532D',
      title: 'Place Orders',
      description: 'Order produce with transparent pricing and escrow payments',
    },
    {
      icon: 'car-outline',
      iconBg: '#EEF4FF',
      iconColor: '#3B6FCF',
      title: 'Track Dispatch',
      description: 'Real-time order tracking from storage to delivery',
    },
    {
      icon: 'bar-chart-outline',
      iconBg: '#F3EEFF',
      iconColor: '#6B3FA0',
      title: 'Market Intelligence',
      description: 'Price trends and availability across regions',
    },
  ],
};

interface Props {
  role: DiscoverRole;
}

export default function DiscoverFeatures({ role }: Props) {
  const features = ROLE_FEATURES[role];

  return (
    <View style={s.container}>
      <Text style={s.sectionTitle}>What you can do</Text>

      <View style={s.grid}>
        {features.map((feat, i) => (
          <View key={i} style={s.card}>
            <View style={[s.iconWrap, { backgroundColor: feat.iconBg }]}>
              <Ionicons name={feat.icon} size={22} color={feat.iconColor} />
            </View>
            <Text style={s.cardTitle}>{feat.title}</Text>
            <Text style={s.cardDesc}>{feat.description}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  container: {
    paddingHorizontal: 20,
    paddingTop: 28,
    paddingBottom: 8,
  },

  sectionTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#0B2520',
    letterSpacing: -0.3,
    marginBottom: 18,
  },

  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },

  card: {
    width: '47%',
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E8ECE9',
    shadowColor: '#163C2D',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 6,
    elevation: 1,
  },

  iconWrap: {
    width: 44,
    height: 44,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },

  cardTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0B2520',
    letterSpacing: -0.1,
    marginBottom: 4,
  },

  cardDesc: {
    fontSize: 12,
    lineHeight: 17,
    color: '#5F6B66',
    fontWeight: '500',
  },
});
