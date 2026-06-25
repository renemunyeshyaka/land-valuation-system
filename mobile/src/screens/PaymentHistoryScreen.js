import React, { useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity } from 'react-native';
import { COLORS, FONTS, SIZES, SHADOWS } from '../constants/theme';

const SAMPLE_PAYMENTS = [
  { id: '1', plan: 'Professional', amount: 45000, date: '2026-06-01', status: 'active', method: 'PesaPal' },
  { id: '2', plan: 'Professional', amount: 45000, date: '2026-05-01', status: 'completed', method: 'PayPal' },
  { id: '3', plan: 'Basic', amount: 15000, date: '2026-04-01', status: 'completed', method: 'PesaPal' },
  { id: '4', plan: 'Basic', amount: 15000, date: '2026-03-01', status: 'completed', method: 'Bank Transfer' },
];

const STATUS_COLORS = { active: '#10b981', completed: '#6b7280', failed: '#ef4444', pending: '#f59e0b' };

export default function PaymentHistoryScreen() {
  const [filter, setFilter] = useState('all');

  const filtered = filter === 'all' ? SAMPLE_PAYMENTS : SAMPLE_PAYMENTS.filter(p => p.status === filter);

  const renderItem = ({ item }) => (
    <View style={styles.card}>
      <View style={styles.cardTop}>
        <View>
          <Text style={styles.planName}>{item.plan}</Text>
          <Text style={styles.date}>{item.date} · {item.method}</Text>
        </View>
        <View style={[styles.statusBadge, { backgroundColor: STATUS_COLORS[item.status] + '20' }]}>
          <Text style={[styles.statusText, { color: STATUS_COLORS[item.status] }]}>{item.status}</Text>
        </View>
      </View>
      <Text style={styles.amount}>RWF {item.amount.toLocaleString()}</Text>
    </View>
  );

  return (
    <View style={styles.container}>
      <Text style={styles.pageTitle}>Payment History</Text>

      {/* Filter tabs */}
      <View style={styles.filters}>
        {['all', 'active', 'completed'].map(f => (
          <TouchableOpacity key={f} style={[styles.filterChip, filter === f && styles.filterChipActive]} onPress={() => setFilter(f)}>
            <Text style={[styles.filterText, filter === f && styles.filterTextActive]}>{f.charAt(0).toUpperCase() + f.slice(1)}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <FlatList
        data={filtered}
        renderItem={renderItem}
        keyExtractor={item => item.id}
        contentContainerStyle={styles.list}
        ListEmptyComponent={<Text style={styles.empty}>No payment records found</Text>}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  pageTitle: { fontSize: SIZES.xxl, ...FONTS.bold, color: COLORS.text, padding: 24, paddingTop: 60, paddingBottom: 12 },
  filters: { flexDirection: 'row', gap: 8, paddingHorizontal: 24, marginBottom: 16 },
  filterChip: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, borderWidth: 1, borderColor: COLORS.border, backgroundColor: COLORS.surface },
  filterChipActive: { borderColor: COLORS.primary, backgroundColor: '#f0fdf4' },
  filterText: { fontSize: SIZES.sm, color: COLORS.textSecondary },
  filterTextActive: { color: COLORS.primary, ...FONTS.semibold },
  list: { paddingHorizontal: 24, paddingBottom: 24 },
  card: { backgroundColor: COLORS.surface, borderRadius: SIZES.radius, padding: 16, marginBottom: 12, ...SHADOWS.card },
  cardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 },
  planName: { fontSize: SIZES.md, ...FONTS.semibold, color: COLORS.text },
  date: { fontSize: SIZES.xs, color: COLORS.textLight, marginTop: 2 },
  statusBadge: { borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4 },
  statusText: { fontSize: SIZES.xs, ...FONTS.semibold, textTransform: 'capitalize' },
  amount: { fontSize: SIZES.xl, ...FONTS.bold, color: COLORS.primary },
  empty: { textAlign: 'center', color: COLORS.textSecondary, marginTop: 60, fontSize: SIZES.md },
});
