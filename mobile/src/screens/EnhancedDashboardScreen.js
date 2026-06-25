import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, ActivityIndicator } from 'react-native';
import { COLORS, FONTS, SIZES, SHADOWS } from '../constants/theme';
import { userAPI, propertiesAPI } from '../services/api';

export default function EnhancedDashboardScreen({ navigation }) {
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({ properties: 0, views: 0, interested: 0 });
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const [userRes, propRes] = await Promise.all([
          userAPI.getProfile().catch(() => null),
          propertiesAPI.list({ page: 1, limit: 100 }).catch(() => null),
        ]);
        if (userRes?.data?.success) {
          const u = userRes.data.data;
          setProfile(u);
          setIsAdmin(u.user_type === 'admin');
        }
        if (propRes?.data?.success) {
          const props = propRes.data.data?.data || [];
          setStats({
            properties: props.length,
            views: props.reduce((s, p) => s + (p.views || 0), 0),
            interested: props.reduce((s, p) => s + (p.interested || 0), 0),
          });
        }
      } catch {} finally { setLoading(false); }
    })();
  }, []);

  const menuItems = [
    { icon: '🏘️', label: 'My Properties', screen: 'AddProperty', count: stats.properties, color: '#0b5e42' },
    { icon: '💳', label: 'Payment History', screen: 'PaymentHistory', color: '#3b82f6' },
    { icon: '📊', label: 'Analytics', screen: 'Analytics', color: '#f59e0b' },
    { icon: '👤', label: 'Profile', screen: 'Profile', color: '#8b5cf6' },
    { icon: '⭐', label: 'Subscription', screen: 'Subscription', color: '#10b981' },
    { icon: '🔔', label: 'Notifications', screen: 'Notifications', color: '#ec4899' },
  ];

  if (loading) return <View style={styles.center}><ActivityIndicator size="large" color={COLORS.primary} /></View>;

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <View>
            <Text style={styles.greeting}>Hello, {profile?.first_name || 'User'}!</Text>
            <Text style={styles.subtitle}>Welcome to your dashboard</Text>
          </View>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{profile?.first_name?.charAt(0)}{profile?.last_name?.charAt(0)}</Text>
          </View>
        </View>
      </View>

      {/* Admin button */}
      {isAdmin && (
        <TouchableOpacity style={styles.adminBtn} onPress={() => Alert.alert('Admin', 'Admin dashboard coming in next update')}>
          <Text style={styles.adminBtnText}>🛡️ Admin Dashboard</Text>
        </TouchableOpacity>
      )}

      {/* Stats row */}
      <View style={styles.statsRow}>
        <View style={[styles.statCard, { borderLeftColor: '#0b5e42' }]}>
          <Text style={styles.statValue}>{stats.properties}</Text>
          <Text style={styles.statLabel}>Properties</Text>
        </View>
        <View style={[styles.statCard, { borderLeftColor: '#3b82f6' }]}>
          <Text style={styles.statValue}>{stats.views}</Text>
          <Text style={styles.statLabel}>Total Views</Text>
        </View>
        <View style={[styles.statCard, { borderLeftColor: '#f59e0b' }]}>
          <Text style={styles.statValue}>{stats.interested}</Text>
          <Text style={styles.statLabel}>Interested</Text>
        </View>
      </View>

      {/* Menu grid */}
      <View style={styles.menuGrid}>
        {menuItems.map((item, i) => (
          <TouchableOpacity key={i} style={styles.menuCard} onPress={() => navigation.navigate(item.screen)}>
            <Text style={styles.menuIcon}>{item.icon}</Text>
            <Text style={styles.menuLabel}>{item.label}</Text>
            {item.count !== undefined && <Text style={[styles.menuCount, { color: item.color }]}>{item.count}</Text>}
          </TouchableOpacity>
        ))}
      </View>

      {/* Subscription status */}
      {profile && (
        <View style={styles.subCard}>
          <Text style={styles.subLabel}>Plan: <Text style={styles.subValue}>{profile.subscription_tier}</Text></Text>
          <Text style={styles.subLabel}>Status: <Text style={[styles.subValue, { color: profile.subscription_status === 'active' ? COLORS.success : COLORS.warning }]}>{profile.subscription_status}</Text></Text>
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  content: { paddingBottom: 40 },
  header: { padding: 24, paddingTop: 60, backgroundColor: COLORS.primary, borderBottomLeftRadius: 24, borderBottomRightRadius: 24 },
  headerTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  greeting: { fontSize: SIZES.xxl, ...FONTS.bold, color: COLORS.white },
  subtitle: { fontSize: SIZES.sm, color: 'rgba(255,255,255,0.7)', marginTop: 4 },
  avatar: { width: 48, height: 48, borderRadius: 24, backgroundColor: 'rgba(255,255,255,0.2)', alignItems: 'center', justifyContent: 'center' },
  avatarText: { color: COLORS.white, fontSize: SIZES.lg, ...FONTS.bold },
  adminBtn: { margin: 24, marginBottom: 0, backgroundColor: '#fef3c7', borderRadius: SIZES.radius, padding: 16, borderWidth: 1, borderColor: '#f59e0b' },
  adminBtnText: { color: '#92400e', fontSize: SIZES.md, ...FONTS.semibold, textAlign: 'center' },
  statsRow: { flexDirection: 'row', gap: 12, padding: 24, paddingBottom: 0 },
  statCard: { flex: 1, backgroundColor: COLORS.surface, borderRadius: SIZES.radius, padding: 16, borderLeftWidth: 4, ...SHADOWS.card },
  statValue: { fontSize: SIZES.xl, ...FONTS.bold, color: COLORS.text },
  statLabel: { fontSize: SIZES.xs, color: COLORS.textSecondary, marginTop: 4 },
  menuGrid: { padding: 24, gap: 12 },
  menuCard: {
    backgroundColor: COLORS.surface, borderRadius: SIZES.radius, padding: 20,
    ...SHADOWS.card, flexDirection: 'row', alignItems: 'center', gap: 16,
  },
  menuIcon: { fontSize: 24 },
  menuLabel: { flex: 1, fontSize: SIZES.md, color: COLORS.text, ...FONTS.medium },
  menuCount: { fontSize: SIZES.lg, ...FONTS.bold },
  subCard: { marginHorizontal: 24, backgroundColor: '#f0fdf4', borderRadius: SIZES.radius, padding: 16, borderWidth: 1, borderColor: '#bbf7d0', gap: 4 },
  subLabel: { fontSize: SIZES.sm, color: COLORS.textSecondary },
  subValue: { ...FONTS.semibold, color: COLORS.text, textTransform: 'capitalize' },
});
