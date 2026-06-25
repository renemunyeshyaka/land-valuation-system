import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, ActivityIndicator } from 'react-native';
import { COLORS, FONTS, SIZES } from '../constants/theme';

const SAMPLE_NOTIFICATIONS = [
  { id: '1', title: 'Welcome to LandVal!', message: 'Start by exploring properties or getting a land estimate.', time: 'Just now', icon: '👋' },
  { id: '2', title: 'Property View Increased', message: 'Your property in Kacyiru has received 15 new views.', time: '2 hours ago', icon: '📈' },
  { id: '3', title: 'New Feature Available', message: 'AI-powered property valuation is now available in your dashboard.', time: '1 day ago', icon: '🤖' },
];

export default function NotificationsScreen() {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setTimeout(() => {
      setNotifications(SAMPLE_NOTIFICATIONS);
      setLoading(false);
    }, 500);
  }, []);

  if (loading) {
    return <View style={styles.center}><ActivityIndicator size="large" color={COLORS.primary} /></View>;
  }

  const renderItem = ({ item }) => (
    <View style={styles.card}>
      <Text style={styles.icon}>{item.icon}</Text>
      <View style={styles.content}>
        <Text style={styles.title}>{item.title}</Text>
        <Text style={styles.message}>{item.message}</Text>
        <Text style={styles.time}>{item.time}</Text>
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      <Text style={styles.pageTitle}>Notifications</Text>
      <FlatList
        data={notifications}
        renderItem={renderItem}
        keyExtractor={item => item.id}
        contentContainerStyle={styles.list}
        ListEmptyComponent={<Text style={styles.empty}>No notifications yet</Text>}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  pageTitle: { fontSize: SIZES.xxl, ...FONTS.bold, color: COLORS.text, padding: 24, paddingTop: 60 },
  list: { paddingHorizontal: 24, paddingBottom: 24 },
  card: {
    flexDirection: 'row', backgroundColor: COLORS.surface, borderRadius: SIZES.radius,
    padding: 16, marginBottom: 12, gap: 12,
  },
  icon: { fontSize: 24 },
  content: { flex: 1 },
  title: { fontSize: SIZES.md, ...FONTS.semibold, color: COLORS.text, marginBottom: 4 },
  message: { fontSize: SIZES.sm, color: COLORS.textSecondary, lineHeight: 20, marginBottom: 4 },
  time: { fontSize: SIZES.xs, color: COLORS.textLight },
  empty: { textAlign: 'center', color: COLORS.textSecondary, marginTop: 60, fontSize: SIZES.md },
});
