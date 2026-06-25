import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, Linking } from 'react-native';
import { COLORS, FONTS, SIZES, SHADOWS } from '../constants/theme';
import { clearToken } from '../services/api';

export default function MoreScreen({ navigation }) {
  const menuItems = [
    { icon: '📞', label: 'Contact Us', screen: 'Contact' },
    { icon: '💳', label: 'Subscription', screen: 'Subscription' },
    { icon: '🔔', label: 'Notifications', screen: 'Notifications' },
  ];

  const links = [
    { icon: '📄', label: 'Terms of Service', url: 'https://landval.kcoders.org/terms' },
    { icon: '🔒', label: 'Privacy Policy', url: 'https://landval.kcoders.org/privacy' },
    { icon: '📧', label: 'support@landval.kcoders.org', url: 'mailto:support@landval.kcoders.org' },
  ];

  const handleLogout = () => {
    clearToken();
    navigation.reset({ index: 0, routes: [{ name: 'Login' }] });
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>More</Text>

      {/* Menu items */}
      <View style={styles.menuSection}>
        {menuItems.map((item, i) => (
          <TouchableOpacity key={i} style={styles.menuItem} onPress={() => navigation.navigate(item.screen)}>
            <Text style={styles.menuIcon}>{item.icon}</Text>
            <Text style={styles.menuLabel}>{item.label}</Text>
            <Text style={styles.arrow}>›</Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Links */}
      <Text style={styles.sectionTitle}>Legal & Support</Text>
      <View style={styles.menuSection}>
        {links.map((item, i) => (
          <TouchableOpacity key={i} style={styles.menuItem} onPress={() => Linking.openURL(item.url)}>
            <Text style={styles.menuIcon}>{item.icon}</Text>
            <Text style={styles.menuLabel}>{item.label}</Text>
            <Text style={styles.arrow}>↗</Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Certification */}
      <View style={styles.certBadge}>
        <Text style={styles.certText}>
          Certified by National Cybersecurity Authority (NCSA) Data Protection & Privacy Office (DPO)
        </Text>
      </View>

      {/* Logout */}
      <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
        <Text style={styles.logoutText}>Sign Out</Text>
      </TouchableOpacity>

      <Text style={styles.version}>LandVal v1.0.0</Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  content: { padding: 24, paddingTop: 60, paddingBottom: 40 },
  title: { fontSize: SIZES.xxl, ...FONTS.bold, color: COLORS.text, marginBottom: 24 },
  menuSection: { backgroundColor: COLORS.surface, borderRadius: SIZES.radiusLg, ...SHADOWS.card, marginBottom: 24, overflow: 'hidden' },
  menuItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 16, paddingHorizontal: 20, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  menuIcon: { fontSize: 20, marginRight: 16 },
  menuLabel: { flex: 1, fontSize: SIZES.md, color: COLORS.text },
  arrow: { fontSize: SIZES.xl, color: COLORS.textLight },
  sectionTitle: { fontSize: SIZES.sm, ...FONTS.semibold, color: COLORS.textSecondary, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 12 },
  certBadge: { backgroundColor: COLORS.primaryDark, borderRadius: SIZES.radius, padding: 16, alignItems: 'center', marginBottom: 24 },
  certText: { color: COLORS.white, fontSize: SIZES.xs, textAlign: 'center', lineHeight: 18 },
  logoutBtn: { alignItems: 'center', paddingVertical: 16 },
  logoutText: { color: COLORS.error, fontSize: SIZES.md, ...FONTS.semibold },
  version: { textAlign: 'center', color: COLORS.textLight, fontSize: SIZES.xs, marginTop: 8 },
});
