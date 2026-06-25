import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { COLORS, FONTS, SIZES, SHADOWS } from '../constants/theme';

const METRICS = [
  { label: 'Total Properties', value: '12', change: '+3 this month', color: '#0b5e42' },
  { label: 'Total Views', value: '847', change: '+12.5% vs last month', color: '#3b82f6' },
  { label: 'Interested', value: '43', change: '+8 this month', color: '#f59e0b' },
  { label: 'Avg. Price', value: 'RWF 98.5M', change: '−2.1% vs last quarter', color: '#8b5cf6' },
];

const TRENDS = [
  { month: 'Feb', views: 180, interested: 8 },
  { month: 'Mar', views: 220, interested: 12 },
  { month: 'Apr', views: 195, interested: 10 },
  { month: 'May', views: 240, interested: 15 },
  { month: 'Jun', views: 210, interested: 13 },
];

const MAX_VIEWS = Math.max(...TRENDS.map(t => t.views), 1);

export default function AnalyticsScreen() {
  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.pageTitle}>Analytics</Text>
      <Text style={styles.subtitle}>Track your property performance</Text>

      {/* Metric cards */}
      <View style={styles.metricsGrid}>
        {METRICS.map((m, i) => (
          <View key={i} style={styles.metricCard}>
            <Text style={styles.metricValue}>{m.value}</Text>
            <Text style={styles.metricLabel}>{m.label}</Text>
            <Text style={[styles.metricChange, { color: m.color }]}>{m.change}</Text>
          </View>
        ))}
      </View>

      {/* Trend chart (simplified bar chart) */}
      <View style={styles.chartCard}>
        <Text style={styles.chartTitle}>Monthly Views</Text>
        <View style={styles.chart}>
          {TRENDS.map((t, i) => (
            <View key={i} style={styles.barContainer}>
              <Text style={styles.barValue}>{t.views}</Text>
              <View style={[styles.bar, { height: (t.views / MAX_VIEWS) * 120 }]}>
                <View style={[styles.barFill, { height: '100%' }]} />
              </View>
              <Text style={styles.barLabel}>{t.month}</Text>
            </View>
          ))}
        </View>
      </View>

      {/* Interested trend */}
      <View style={styles.chartCard}>
        <Text style={styles.chartTitle}>Interested Leads</Text>
        <View style={styles.chart}>
          {TRENDS.map((t, i) => (
            <View key={i} style={styles.barContainer}>
              <Text style={styles.barValue}>{t.interested}</Text>
              <View style={[styles.bar, { height: (t.interested / 15) * 120 }]}>
                <View style={[styles.barFill, { height: '100%', backgroundColor: '#f59e0b' }]} />
              </View>
              <Text style={styles.barLabel}>{t.month}</Text>
            </View>
          ))}
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  content: { padding: 24, paddingTop: 60, paddingBottom: 40 },
  pageTitle: { fontSize: SIZES.xxl, ...FONTS.bold, color: COLORS.text },
  subtitle: { fontSize: SIZES.sm, color: COLORS.textSecondary, marginBottom: 24, marginTop: 4 },
  metricsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginBottom: 24 },
  metricCard: { width: '47%', backgroundColor: COLORS.surface, borderRadius: SIZES.radius, padding: 20, ...SHADOWS.card },
  metricValue: { fontSize: SIZES.xxl, ...FONTS.bold, color: COLORS.text },
  metricLabel: { fontSize: SIZES.xs, color: COLORS.textSecondary, marginTop: 4 },
  metricChange: { fontSize: SIZES.xs, ...FONTS.medium, marginTop: 8 },
  chartCard: { backgroundColor: COLORS.surface, borderRadius: SIZES.radiusLg, padding: 24, ...SHADOWS.card, marginBottom: 20 },
  chartTitle: { fontSize: SIZES.lg, ...FONTS.bold, color: COLORS.text, marginBottom: 24 },
  chart: { flexDirection: 'row', justifyContent: 'space-around', alignItems: 'flex-end', height: 180 },
  barContainer: { alignItems: 'center', flex: 1 },
  barValue: { fontSize: SIZES.xs, color: COLORS.textSecondary, marginBottom: 4 },
  bar: { width: 28, backgroundColor: '#f0fdf4', borderRadius: 6, justifyContent: 'flex-end', overflow: 'hidden' },
  barFill: { width: '100%', backgroundColor: COLORS.primary, borderRadius: 6 },
  barLabel: { fontSize: SIZES.xs, color: COLORS.textSecondary, marginTop: 6 },
});
