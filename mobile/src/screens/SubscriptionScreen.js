import React, { useState, useEffect } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, ScrollView, ActivityIndicator,
} from 'react-native';
import { COLORS, FONTS, SIZES, SHADOWS } from '../constants/theme';
import { userAPI } from '../services/api';

const PLANS = [
  { id: 'free', name: 'Free', price: 0, color: '#6b7280', features: ['3 valuations/month', 'Basic search', 'Save properties'] },
  { id: 'basic', name: 'Basic', price: 15000, color: '#3b82f6', features: ['20 valuations/month', 'Full valuation reports', 'Price alerts', 'Basic support'] },
  { id: 'professional', name: 'Professional', price: 45000, color: '#0b5e42', features: ['Unlimited valuations', 'Advanced analytics', 'Priority support', 'Bulk property listing', 'Diaspora matching'] },
  { id: 'ultimate', name: 'Ultimate', price: 120000, color: '#f59e0b', features: ['Everything in Professional', 'API access', 'Dedicated account manager', 'Custom integrations', 'White-label reports'] },
];

export default function SubscriptionScreen() {
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const res = await userAPI.getProfile();
        if (res.data?.success) setProfile(res.data.data);
      } catch {} finally {
        setLoading(false);
      }
    })();
  }, []);

  const currentTier = profile?.subscription_tier || 'free';

  if (loading) {
    return <View style={styles.center}><ActivityIndicator size="large" color={COLORS.primary} /></View>;
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>Subscription Plans</Text>
      <Text style={styles.subtitle}>Choose the plan that fits your needs</Text>

      {profile && (
        <View style={styles.currentBadge}>
          <Text style={styles.currentLabel}>Current Plan</Text>
          <Text style={styles.currentName}>{currentTier.charAt(0).toUpperCase() + currentTier.slice(1)}</Text>
          <Text style={styles.currentStatus}>{profile.subscription_status}</Text>
        </View>
      )}

      <View style={styles.plansList}>
        {PLANS.map(plan => {
          const isActive = plan.id === currentTier;
          return (
            <View key={plan.id} style={[styles.planCard, isActive && styles.planCardActive, { borderLeftColor: plan.color }]}>
              <View style={styles.planHeader}>
                <Text style={styles.planName}>{plan.name}</Text>
                {isActive && <View style={styles.activeBadge}><Text style={styles.activeBadgeText}>Current</Text></View>}
              </View>
              <Text style={[styles.planPrice, { color: plan.color }]}>
                {plan.price === 0 ? 'Free' : `RWF ${plan.price.toLocaleString()}/mo`}
              </Text>
              {plan.id === 'free' && (
                <View style={styles.promoNote}>
                  <Text style={styles.promoNoteText}>🎉 First 20,000 users — free forever (never expires)</Text>
                </View>
              )}
              <View style={styles.featureList}>
                {plan.features.map((f, i) => (
                  <Text key={i} style={styles.featureItem}>✓ {f}</Text>
                ))}
              </View>
              {!isActive && plan.id !== 'free' && (
                <TouchableOpacity style={[styles.upgradeBtn, { backgroundColor: plan.color }]}>
                  <Text style={styles.upgradeText}>Select Plan</Text>
                </TouchableOpacity>
              )}
            </View>
          );
        })}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  content: { padding: 24, paddingTop: 60, paddingBottom: 40 },
  title: { fontSize: SIZES.xxl, ...FONTS.bold, color: COLORS.text, marginBottom: 4 },
  subtitle: { fontSize: SIZES.sm, color: COLORS.textSecondary, marginBottom: 24 },
  currentBadge: {
    backgroundColor: '#f0fdf4', borderRadius: SIZES.radius, padding: 20,
    borderWidth: 1, borderColor: '#bbf7d0', marginBottom: 24, alignItems: 'center',
  },
  currentLabel: { fontSize: SIZES.xs, color: COLORS.textSecondary, marginBottom: 4 },
  currentName: { fontSize: SIZES.xl, ...FONTS.bold, color: COLORS.primary, marginBottom: 4 },
  currentStatus: { fontSize: SIZES.sm, color: COLORS.textSecondary, textTransform: 'capitalize' },
  plansList: { gap: 16 },
  planCard: {
    backgroundColor: COLORS.surface, borderRadius: SIZES.radius, padding: 20,
    borderLeftWidth: 4, ...SHADOWS.card,
  },
  planCardActive: { backgroundColor: '#f0fdf4' },
  planHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  planName: { fontSize: SIZES.lg, ...FONTS.bold, color: COLORS.text },
  activeBadge: { backgroundColor: COLORS.primary, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 4 },
  activeBadgeText: { color: COLORS.white, fontSize: SIZES.xs, ...FONTS.semibold },
  planPrice: { fontSize: SIZES.xxl, ...FONTS.bold, marginBottom: 16 },
  promoNote: {
    backgroundColor: '#fffbeb', borderRadius: 10, padding: 10, marginBottom: 12,
    borderWidth: 1, borderColor: '#fde68a',
  },
  promoNoteText: { color: '#92400e', fontSize: SIZES.xs, ...FONTS.medium, textAlign: 'center' },
  featureList: { marginBottom: 16, gap: 8 },
  featureItem: { fontSize: SIZES.sm, color: COLORS.textSecondary },
  upgradeBtn: { borderRadius: SIZES.radius, paddingVertical: 14, alignItems: 'center' },
  upgradeText: { color: COLORS.white, fontSize: SIZES.md, ...FONTS.semibold },
});
