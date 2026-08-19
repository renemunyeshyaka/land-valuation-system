import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { COLORS, FONTS, SIZES, SHADOWS } from '../constants/theme';

const quickStats = [
  { icon: '🏘️', value: '12k+', label: 'properties' },
  { icon: '📍', value: '30', label: 'districts' },
  { icon: '🌍', value: '', label: 'diaspora ready' },
];

const features = [
  { icon: '📋', title: 'Gazette Data', desc: 'Official Rwanda Land Authority prices' },
  { icon: '⚡', title: 'Instant Valuation', desc: 'Get prices in under 30 seconds' },
  { icon: '🌐', title: 'Diaspora Ready', desc: 'Connect with global investors' },
];

export default function HomeScreen({ navigation }) {
  return (
    <ScrollView style={styles.container}>
      {/* Hero */}
      <View style={styles.hero}>
        <View style={styles.badge}>
          <Text style={styles.badgeText}>Official Rwanda Gazette 2025</Text>
        </View>
        <Text style={styles.heroTitle}>Accurate land valuation powered by official data</Text>
        <Text style={styles.heroSubtitle}>
          Connect with verified buyers — diaspora & foreign investors. Get instant pricing based on zone coefficients.
        </Text>
        <View style={styles.promoBanner}>
          <Text style={styles.promoText}>🎉 First 20,000 users get FREE access forever — claim your account today!</Text>
        </View>
        <TouchableOpacity style={styles.ctaButton} onPress={() => navigation.navigate('Estimate')}>
          <Text style={styles.ctaText}>Get Started</Text>
        </TouchableOpacity>

        {/* Quick stats */}
        <View style={styles.statsRow}>
          {quickStats.map((s, i) => (
            <View key={i} style={styles.statItem}>
              <Text style={styles.statIcon}>{s.icon}</Text>
              {s.value ? <Text style={styles.statValue}>{s.value}</Text> : null}
              <Text style={styles.statLabel}>{s.label}</Text>
            </View>
          ))}
        </View>
      </View>

      {/* Features */}
      <View style={styles.featuresSection}>
        <Text style={styles.sectionTitle}>Why LandVal?</Text>
        <View style={styles.featuresGrid}>
          {features.map((f, i) => (
            <View key={i} style={styles.featureCard}>
              <Text style={styles.featureIcon}>{f.icon}</Text>
              <Text style={styles.featureTitle}>{f.title}</Text>
              <Text style={styles.featureDesc}>{f.desc}</Text>
            </View>
          ))}
        </View>
      </View>

      {/* Footer certification */}
      <View style={styles.certification}>
        <Text style={styles.certText}>
          Certified by National Cybersecurity Authority (NCSA) Data Protection & Privacy Office (DPO)
        </Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  hero: {
    backgroundColor: COLORS.primary, paddingHorizontal: 24, paddingTop: 48, paddingBottom: 32,
    borderBottomLeftRadius: 24, borderBottomRightRadius: 24,
  },
  badge: {
    backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: 20, paddingHorizontal: 16, paddingVertical: 6,
    alignSelf: 'flex-start', marginBottom: 16,
  },
  badgeText: { color: COLORS.white, fontSize: SIZES.xs, ...FONTS.medium },
  heroTitle: { color: COLORS.white, fontSize: 26, ...FONTS.bold, lineHeight: 34, marginBottom: 12 },
  heroSubtitle: { color: 'rgba(255,255,255,0.85)', fontSize: SIZES.sm, lineHeight: 22, marginBottom: 16 },
  promoBanner: {
    backgroundColor: '#fffbeb', borderRadius: 12, padding: 12, marginBottom: 16,
    borderWidth: 1, borderColor: '#fde68a',
  },
  promoText: { color: '#92400e', fontSize: SIZES.sm, ...FONTS.medium, textAlign: 'center' },
  ctaButton: {
    backgroundColor: COLORS.accent, borderRadius: SIZES.radius, paddingVertical: 16,
    alignItems: 'center', marginBottom: 24,
  },
  ctaText: { color: COLORS.text, fontSize: SIZES.md, ...FONTS.bold },
  statsRow: { flexDirection: 'row', justifyContent: 'space-around' },
  statItem: { alignItems: 'center' },
  statIcon: { fontSize: 20, marginBottom: 4 },
  statValue: { color: COLORS.white, fontSize: SIZES.lg, ...FONTS.bold },
  statLabel: { color: 'rgba(255,255,255,0.7)', fontSize: SIZES.xs },
  featuresSection: { padding: 24 },
  sectionTitle: { fontSize: SIZES.xl, ...FONTS.bold, color: COLORS.text, marginBottom: 16 },
  featuresGrid: { gap: 12 },
  featureCard: {
    backgroundColor: COLORS.surface, borderRadius: SIZES.radius, padding: 20, ...SHADOWS.card,
    flexDirection: 'row', alignItems: 'center', gap: 16,
  },
  featureIcon: { fontSize: 28 },
  featureTitle: { fontSize: SIZES.md, ...FONTS.semibold, color: COLORS.text },
  featureDesc: { fontSize: SIZES.xs, color: COLORS.textSecondary, marginTop: 2 },
  certification: {
    backgroundColor: COLORS.primaryDark, padding: 20, marginHorizontal: 24, marginBottom: 24,
    borderRadius: SIZES.radius, alignItems: 'center',
  },
  certText: { color: COLORS.white, fontSize: SIZES.xs, textAlign: 'center', lineHeight: 18 },
});
