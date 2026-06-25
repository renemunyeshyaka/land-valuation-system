import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { COLORS, FONTS, SIZES } from '../constants/theme';
import { clearToken } from '../services/api';

export default function DashboardScreen({ navigation }) {
  const handleLogout = () => {
    clearToken();
    navigation.reset({ index: 0, routes: [{ name: 'Login' }] });
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Dashboard</Text>
      <Text style={styles.subtitle}>Your property management hub</Text>

      <View style={styles.menuGrid}>
        {[
          { icon: '📋', label: 'My Properties', color: '#0b5e42' },
          { icon: '💰', label: 'Payments', color: '#1f6e4a' },
          { icon: '📊', label: 'Estimates', color: '#f59e0b' },
          { icon: '👤', label: 'Profile', color: '#3b82f6' },
        ].map((item, i) => (
          <TouchableOpacity key={i} style={[styles.menuCard, { borderLeftColor: item.color }]}>
            <Text style={styles.menuIcon}>{item.icon}</Text>
            <Text style={styles.menuLabel}>{item.label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
        <Text style={styles.logoutText}>Sign Out</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background, padding: 24 },
  title: { fontSize: SIZES.xxl, ...FONTS.bold, color: COLORS.text, marginBottom: 4 },
  subtitle: { fontSize: SIZES.sm, color: COLORS.textSecondary, marginBottom: 24 },
  menuGrid: { gap: 12 },
  menuCard: {
    backgroundColor: COLORS.surface, borderRadius: SIZES.radius, padding: 20,
    borderLeftWidth: 4, flexDirection: 'row', alignItems: 'center', gap: 16,
  },
  menuIcon: { fontSize: 24 },
  menuLabel: { fontSize: SIZES.md, ...FONTS.semibold, color: COLORS.text },
  logoutBtn: { marginTop: 40, alignItems: 'center', padding: 16 },
  logoutText: { color: COLORS.error, fontSize: SIZES.md, ...FONTS.medium },
});
